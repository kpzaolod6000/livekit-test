 import 'dotenv/config';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: 'system', content: 'Eres un asistente directo y conciso.' }, // tu persona aquí
];

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

async function main() {
  let totalChars = 0;
  const chunks = await indexCorpus('./corpus');

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    const contexto = await restoreContext(input, chunks);
    const promptAumentado = `Contexto relevante:\n${contexto}\n\nPregunta del usuario: ${input}`;
    messages.push({ role: 'user', content: promptAumentado });

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini', // modelo disponible
      messages,
      stream: true,
    });

    let respuesta = '';
    for await (const chunk of stream) {
      const texto = chunk.choices[0]?.delta?.content ?? '';
      if (texto) {
        process.stdout.write(texto);
        totalChars += texto.length;
        respuesta += texto;
      }
    }
    console.log();

    messages.push({ role: 'assistant', content: respuesta }); // <-- clave: sin esto, el modelo "olvida" cada turno
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();