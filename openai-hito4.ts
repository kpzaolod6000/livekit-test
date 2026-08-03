 import 'dotenv/config';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tavily, TavilyClient } from '@tavily/core';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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


const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
    name: 'searchInternet',
    description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo (precios,clima, noticias), o cualquier cosa que tu conocimiento entrenado podría tener desactualizado',
    parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Consulta de búsqueda' } },
        required: ['query'],
      },
    },
  }
];


async function runTool(name: string, args: any) {
  if (name === 'searchInternet') {
		return await tavilyClient.search(args.query);
  }
  throw new Error(`Tool desconocida: ${name}`);
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
      tools,
      stream: true,
    });

    let response = '';
    const toolCallsAcumulados: any[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) { process.stdout.write(delta.content); totalChars += delta.content.length; response += delta.content; }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallsAcumulados[tc.index]) toolCallsAcumulados[tc.index] = { id: tc.id, function: { name: '', arguments: '' } };
          if (tc.function?.name) toolCallsAcumulados[tc.index].function.name += tc.function.name;
          if (tc.function?.arguments) toolCallsAcumulados[tc.index].function.arguments += tc.function.arguments;
        }
      }
    }

    if (toolCallsAcumulados.length > 0) {
      messages.push({ role: 'assistant', content: null, tool_calls: toolCallsAcumulados.map(tc => ({ id: tc.id, type: 'function', function: tc.function })) });
      for (const tc of toolCallsAcumulados) {
        const result = await runTool(tc.function.name, JSON.parse(tc.function.arguments));
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      const followUp = await client.chat.completions.create({ 
        model: 'gpt-4o-mini', 
        messages, 
        stream: true 
      });

      for await (const chunk of followUp) {
        const texto = chunk.choices[0]?.delta?.content ?? '';
        if (texto) { process.stdout.write(texto); totalChars += texto.length; response += texto; }
      }
    }
    console.log();
    messages.push({ role: 'assistant', content: response }); // <-- clave: sin esto, el modelo "olvida" cada turno
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();