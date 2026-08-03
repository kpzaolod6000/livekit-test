# Hito 4 — Streaming + RAG + Tools combinados

## TEORÍA

Combina lo de hito 2 (tools) y hito 3 (RAG) en un solo `streamText`: el contexto RAG se recupera e inyecta en el mensaje ANTES de llamar a `streamText` (igual que hito 3), y las tools se pasan igual que hito 2 — el modelo decide en el mismo turno si necesita el contexto inyectado, la tool, o ambos. No hay nada nuevo en la mecánica del SDK, es la unión de los dos patrones ya vistos.

Puntos que ya conocés y siguen aplicando:
- `stopWhen: stepCountIs(n)` sigue siendo necesario — si el modelo llama una tool, necesita un step extra para generar el texto final (mismo bug que en hito 2 si lo omitís).
- Embeddings SIEMPRE con `google.textEmbeddingModel('gemini-embedding-001')` (igual que hito 3), independiente del provider de chat.

```
pregunta del usuario
     │
     ├─► recuperarContexto (embed + cosineSimilarity)   ← hito 3
     │
     ▼
messages.push({ role: 'user', content: `Contexto:\n${contexto}\n\nPregunta: ${input}` })
     │
     ▼
streamText({ model, tools: { webSearch, getTime }, stopWhen: stepCountIs(5), messages })  ← hito 2
     │
     ▼
modelo decide: ¿usa el contexto inyectado? ¿llama una tool? ¿ambos? ¿ninguno?
```

## CÓMO IMPLEMENTARLO

Partí de `vercel-hito3.ts` (indexación + recuperarContexto) y agregale las tools de `vercel-hito2.ts` (`webSearch`, `getTime`) + `stopWhen`:

```typescript
import 'dotenv/config';
import { streamText, embed, embedMany, cosineSimilarity, tool, stepCountIs, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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

const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => await tavilyClient.search(query),
});

const getTime = tool({
  description: 'Obtiene la hora actual del sistema',
  inputSchema: z.object({}),
  execute: async () => ({ time: new Date().toLocaleTimeString() }),
});

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

    const { textStream } = streamText({
      model,
      system: 'Eres un asistente directo y conciso.',
      messages,
      tools: { webSearch, getTime },
      stopWhen: stepCountIs(5),
    });

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

## LA TAREA

1. Creá `vercel-hito4.ts` combinando `vercel-hito3.ts` + `vercel-hito2.ts` (código de arriba como referencia).
2. Corré `npx tsx vercel-hito4.ts openai`, preguntá algo que dispare SOLO RAG (del corpus), algo que dispare SOLO tool (clima/hora), y algo que combine ambos en una sola pregunta (ej: "según el corpus qué es RAG, y busca en internet una noticia reciente sobre IA").
3. Repetí con `npx tsx vercel-hito4.ts gemini`, mismas preguntas.
4. Confirmá: mismo código, ambos providers resuelven contexto RAG + tool correctamente en el mismo turno.
