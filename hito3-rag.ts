import 'dotenv/config'
import { GoogleGenAI } from '@google/genai';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Chunk = {
    text: string;
    embedding: number[]
};
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const chat = ai.chats.create({
    model: 'gemini-3.1-flash-lite',
    config: {
        systemInstruction: 'eres un ai que responde directa y concisa, sin rodeos',
    },
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let totalChars = 0;



async function loop(chunks: Chunk[]) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') {
        rl.close();
        return;
    }

    const contexto = await recuperarContexto(input, chunks);
    const promptAumentado = `Contexto relevante:\n${contexto}\n\nPregunta del usuario: ${input}`;
    const stream = await chat.sendMessageStream({ message: promptAumentado });

    for await (const chunk of stream) {
        if (chunk.text) {
            process.stdout.write(chunk.text);
            totalChars += chunk.text.length;
        }
    }
    console.log();
    await loop(chunks);
}
async function main() {
    const chunks = await indexarCorpus('./corpus');
    console.log("chunks procesados:", chunks.length);
    await loop(chunks);
    console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
}
main();