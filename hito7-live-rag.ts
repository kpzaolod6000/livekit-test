
import 'dotenv/config';
import { GoogleGenAI, Modality } from '@google/genai';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as readline from 'node:readline/promises';

interface Chunk {
  text: string;
  embedding: number[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function indexarCorpus(carpeta: string): Promise<Chunk[]> {
  const archivos = readdirSync(carpeta).filter(f => f.endsWith('.txt'));
  const chunks: Chunk[] = [];

  for (const archivo of archivos) {
      const contenido = readFileSync(join(carpeta, archivo), 'utf-8');
      const partes = contenido.split('\n\n').filter(p => p.trim().length > 0); // chunking simple por párrafo

      for (const texto of partes) {
        const res = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: texto,
        });
        if (!res.embeddings?.[0]?.values) {
            throw new Error('No se pudo obtener el embedding para el texto: ' + texto);
        }
        chunks.push({ text: texto, embedding: res.embeddings[0].values });
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

async function recuperarContexto(pregunta: string, chunks: Chunk[], k = 3): Promise<string> {
  const resPregunta = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: pregunta,
  });
  if (!resPregunta.embeddings?.[0]?.values) {
      throw new Error('No se pudo obtener el embedding para la pregunta: ' + pregunta);
  }
  const embeddingPregunta = resPregunta.embeddings[0].values;

  const ranked = chunks
    .map(c => ({ ...c, score: cosineSimilarity(embeddingPregunta, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return ranked.map(c => c.text).join('\n\n---\n\n');
}

async function main() {
  const chunks = await indexarCorpus('./corpus');
  console.log(`[INFO] Corpus indexado: ${chunks.length} chunks`);

  let resolveTurn: (() => void) | null = null;

  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      systemInstruction: 'Eres un asistente directo y conciso.',
    },
    callbacks: {
      onopen: () => console.log('[Sesión Live conectada]'),
      onmessage: (message) => {
        const texto = message.serverContent?.outputTranscription?.text;
        if (texto) process.stdout.write(texto);

        if (message.serverContent?.turnComplete) {
          console.log();
          resolveTurn?.();
        }
      },
      onerror: (e) => console.error('Error:', e.message),
      onclose: (e) => console.log('[Sesión cerrada]', e?.reason ?? ''),
    },
  });

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;
    const contexto = await recuperarContexto(input, chunks); // <-- el paso nuevo
    const promptAumentado = `Contexto relevante:\n${contexto}\n\nPregunta del usuario: ${input}`;

    session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: promptAumentado }] }] });
    await new Promise<void>((resolve) => { resolveTurn = resolve; })
  }

  session.close();
  rl.close();
}

main();