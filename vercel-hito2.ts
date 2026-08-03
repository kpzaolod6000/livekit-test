 import 'dotenv/config';
import { streamText, type ModelMessage, tool, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import * as readline from 'node:readline/promises';
import { tavily, TavilyClient } from '@tavily/core';
import { z } from 'zod';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo (precios, clima, noticias), o cualquier cosa que tu conocimiento entrenado podría tener desactualizado.',
  inputSchema: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => await tavilyClient.search(query),
});

const getTime = tool({
  description: 'Obtiene la hora actual del sistema',
  inputSchema: z.object({}),
  execute: async () => ({ time: new Date().toLocaleTimeString() }),
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const providerArg = process.argv[2] ?? 'openai';

const model = providerArg === 'gemini' ? google('gemini-3.1-flash-lite') : openai('gpt-4o-mini');
console.log(`[Provider activo: ${providerArg}]`);

const messages: ModelMessage[] = [];

async function main() {
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    messages.push({ role: 'user', content: input });

    const { textStream } = streamText({
      model,
      system: 'Eres un asistente directo y conciso.', // <-- se movió acá
      messages,
      tools: {webSearch, getTime},
      stopWhen: stepCountIs(3),
      onStepFinish: (step) => console.log('[DEBUG steps]', step.toolCalls, step.toolResults)
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