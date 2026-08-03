 import 'dotenv/config';
import { streamText, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import * as readline from 'node:readline/promises';

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