# Hito 3 — Streaming + RAG (embed/embedMany + cosineSimilarity nativo)

## TEORÍA

`ai` (core) trae `embed`/`embedMany` para generar embeddings y `cosineSimilarity` como helper nativo — no hay que escribir la fórmula de coseno a mano (como en `hito3-rag.ts`, el plan Gemini nativo).

Este hito usa **embeddings SOLO con Gemini** (`google.textEmbeddingModel('gemini-embedding-001')`), fijo, sin importar qué provider elijas para el chat — el swap `openai`/`gemini` por argumento de terminal solo cambia el modelo de **generación de texto**, no el de embeddings. Razón: mezclar embeddings de distintos providers rompe la comparación (dimensiones distintas, espacios vectoriales no comparables).

```
corpus/*.txt
     │
     ▼ split por párrafo
embedMany({ model: google.textEmbeddingModel(...), values: [...] })
     │
     ▼
chunks: { text, embedding }[]   (una sola vez, al arrancar)

pregunta del usuario
     │
     ▼ embed({ model: ..., value: pregunta })
cosineSimilarity(embeddingPregunta, chunk.embedding)  para cada chunk
     │
     ▼ top-k por score
contexto recuperado → inyectado en el mensaje → streamText({ model: openai(...) | google(...) })
```

Docs: https://ai-sdk.dev/docs/ai-sdk-core/embeddings

## CÓMO IMPLEMENTARLO

```typescript
import 'dotenv/config';
import { streamText, embed, embedMany, cosineSimilarity, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001'); // fijo, ambos providers de chat lo comparten

type Chunk = { text: string; embedding: number[] };

async function indexarCorpus(carpeta: string): Promise<Chunk[]> {
  const archivos = readdirSync(carpeta).filter(f => f.endsWith('.txt'));
  const textos: string[] = [];
  for (const archivo of archivos) {
    const contenido = readFileSync(join(carpeta, archivo), 'utf-8');
    textos.push(...contenido.split('\n\n').filter(p => p.trim().length > 0));
  }

  const { embeddings } = await embedMany({ model: embeddingModel, values: textos });
  return textos.map((text, i) => ({ text, embedding: embeddings[i] }));
}

async function recuperarContexto(pregunta: string, chunks: Chunk[], k = 3): Promise<string> {
  const { embedding } = await embed({ model: embeddingModel, value: pregunta });

  return chunks
    .map(c => ({ ...c, score: cosineSimilarity(embedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(c => c.text)
    .join('\n\n---\n\n');
}

const providerArg = process.argv[2] ?? 'openai';
const model = providerArg === 'gemini' ? google('gemini-3.1-flash-lite') : openai('gpt-4o-mini');
console.log(`[Provider activo: ${providerArg}]`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages: ModelMessage[] = [];

async function main() {
  const chunks = await indexarCorpus('./corpus');
  console.log('chunks procesados:', chunks.length);
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    const contexto = await recuperarContexto(input, chunks);
    messages.push({ role: 'user', content: `Contexto relevante:\n${contexto}\n\nPregunta: ${input}` });

    const { textStream } = streamText({ model, system: 'Eres un asistente directo y conciso.', messages });

    let respuesta = '';
    for await (const chunk of textStream) {
      process.stdout.write(chunk);
      totalChars += chunk.length;
      respuesta += chunk;
    }
    console.log();
    messages.push({ role: 'assistant', content: respuesta });
  }
  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}
main();
```

Nota: indexar el corpus (`embedMany`) se hace **una sola vez** al arrancar, no en cada turno — solo `embed` de la pregunta corre por turno.

## LA TAREA

1. Creá `vercel-hito3.ts`, reusando `corpus/RAG.txt` + `corpus/embedings.txt` (ya decidido: reusar corpus existente).
2. Implementá `indexarCorpus` con `embedMany` y `recuperarContexto` con `embed` + `cosineSimilarity` nativo, embeddings SIEMPRE con `google.textEmbeddingModel('gemini-embedding-001')`.
3. Corré `npx tsx vercel-hito3.ts openai`, preguntá algo del corpus.
4. Corré `npx tsx vercel-hito3.ts gemini` (mismo código), misma pregunta.
5. Confirmá: mismo contexto recuperado en ambas corridas, solo cambia el modelo que genera el texto final.
