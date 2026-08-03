import 'dotenv/config';
import WebSocket from 'ws';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const model = 'gpt-realtime-mini';
const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});

let resolveTurn: (() => void) | null = null;
let totalChars = 0;


type Chunk = { text: string; embedding: number[] };

async function indexCorpus(folder: string): Promise<Chunk[]> {
  const files = readdirSync(folder).filter(f => f.endsWith('.txt'));
  const chunks: Chunk[] = [];

  for (const file of files) {
    const contenido = readFileSync(join(folder, file), 'utf-8');
    const parts = contenido.split('\n\n').filter(p => p.trim().length > 0);

    for (const text of parts) {
      const res = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      chunks.push({ text: text, embedding: res.data[0].embedding });
    }
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

async function restoreContext(question: string, chunks: Chunk[], k = 3): Promise<string> {
  const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: question });
  const embeddingQuestion = res.data[0].embedding;

  const ranked = chunks
    .map(c => ({ ...c, score: cosineSimilarity(embeddingQuestion, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return ranked.map(c => c.text).join('\n\n---\n\n');
}


ws.on('open', () => {
  console.log('[Sesión Realtime conectada]');
  ws.send(JSON.stringify({
    type: 'session.update',
    session: { 
      type: 'realtime', 
      output_modalities: ['text'],
      instructions: 'Eres un asistente directo y conciso.' 
    },
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'response.output_text.delta') {
    process.stdout.write(msg.delta);
    totalChars += msg.delta.length;
  }

  if (msg.type === 'response.done') {
    console.log();
    resolveTurn?.();
  }

  if (msg.type === 'error') {
     console.error('Error:', msg.error?.message);
    resolveTurn?.();
  }
});

ws.on('close', () => console.log('[Sesión cerrada]'));

async function main() {
  await new Promise<void>((resolve) => ws.once('open', resolve)); // espera a que abra antes de preguntar
  const chunks = await indexCorpus('./corpus'); // una vez, antes de conectar
  console.log(`Corpus indexado: ${chunks.length} chunks`);

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    const contexto = await restoreContext(input, chunks); 
    const promptAumentado = `Contexto relevante:\n${contexto}\n\nPregunta del usuario: ${input}`;

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: promptAumentado }] },
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));

    await new Promise<void>((resolve) => { resolveTurn = resolve; }); // espera a que termine el turno (response.done)
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  ws.close();
  rl.close();
}

main();