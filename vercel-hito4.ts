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

async function indexCorpus(folder: string): Promise<Chunk[]> {
  const files = readdirSync(folder).filter(f => f.endsWith('.txt'));
  const texts: string[] = [];
  for (const file of files) {
    const content = readFileSync(join(folder, file), 'utf-8');
    texts.push(...content.split('\n\n').filter(p => p.trim().length > 0));
  }
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
  return texts.map((text, i) => ({ text, embedding: embeddings[i] }));
}

async function restoreContext(question: string, chunks: Chunk[], k = 3): Promise<string> {
  const { embedding } = await embed({ model: embeddingModel, value: question });
  return chunks
    .map(c => ({ ...c, score: cosineSimilarity(embedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(c => c.text)
    .join('\n\n---\n\n');
}

const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo, o cualquier cosa que tu conocimiento entrenado podría tener desactualizado.',
  inputSchema: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => await tavilyClient.search(query),
});

const providerArg = process.argv[2] ?? 'openai';
const model = providerArg === 'gemini' ? google('gemini-3.1-flash-lite') : openai('gpt-4o-mini');
console.log(`[Provider activo: ${providerArg}]`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages: ModelMessage[] = [];

async function main() {
  const chunks = await indexCorpus('./corpus');
  console.log('chunks procesados:', chunks.length);
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    const context = await restoreContext(input, chunks);
    console.log("---- * ------");
    
    console.log(context);
    
    console.log("---- * ------");
    messages.push({ role: 'user', content: `Contexto relevante:\n${context}\n\nPregunta: ${input}` });

    const { textStream } = streamText({
      model,
      system: 'Eres un asistente directo y conciso. usa el conocimiento que te estoy agregando para responder la pregunta. Si no tienes la respuesta, di que no la tienes.',
      messages,
      tools: { webSearch },
      stopWhen: stepCountIs(5),
    });

    let response = '';
    for await (const chunk of textStream) {
      process.stdout.write(chunk);
      totalChars += chunk.length;
      response += chunk;
    }
    console.log();
    messages.push({ role: 'assistant', content: response });
  }
  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}
main();
