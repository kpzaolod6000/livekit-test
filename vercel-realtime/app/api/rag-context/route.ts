import { embed, embedMany, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');

type Chunk = { text: string; embedding: number[] };

// Índice cacheado a nivel módulo: se calcula una sola vez y se reusa entre requests.
let indexPromise: Promise<Chunk[]> | null = null;

function indexCorpus(): Promise<Chunk[]> {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const folder = join(process.cwd(), 'corpus');
    const files = readdirSync(folder).filter((f) => f.endsWith('.txt'));
    const texts: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(folder, file), 'utf-8');
      texts.push(...content.split('\n\n').filter((p) => p.trim().length > 0));
    }
    const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
    return texts.map((text, i) => ({ text, embedding: embeddings[i] }));
  })();
  return indexPromise;
}

export async function POST(req: NextRequest) {
  const { query, k = 3 } = await req.json();
  const chunks = await indexCorpus();

  const { embedding } = await embed({ model: embeddingModel, value: query });
  const context = chunks
    .map((c) => ({ text: c.text, score: cosineSimilarity(embedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((c) => c.text)
    .join('\n\n---\n\n');

  return Response.json({ context });
}
