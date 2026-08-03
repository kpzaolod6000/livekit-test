import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
const oai = new OpenAI();

// Tools de Hito 10, sin cambios.
const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo (precios, clima, noticias), o cualquier cosa que tu conocimiento entrenado podría tener desactualizado.',
  parameters: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => {
    const res = await tavilyClient.search(query, { includeAnswer: true, maxResults: 3 });
    return {
      answer: res.answer,
      sources: res.results?.map((r) => ({ title: r.title, url: r.url, content: r.content })),
    };
  },
});

const getTime = tool({
  description: 'Devuelve la hora actual del servidor. Usar cuando el usuario pregunte la hora.',
  execute: async () => `Son las ${new Date().toLocaleTimeString('es-PE')}.`,
});

// RAG de Hito 7, reusado sin cambios — buildIndex/embed/cosine/retrieve.
async function embed(input: string | string[]) {
  const res = await oai.embeddings.create({ model: 'text-embedding-3-small', input });
  return res.data.map((d) => d.embedding);
}
type Chunk = { text: string; vec: number[] };

async function buildIndex(): Promise<Chunk[]> {
  const raw = readFileSync('corpus/RAG.txt', 'utf-8');
  const texts = raw.split(/\n\s*\n/).map((t) => t.trim()).filter((t) => t.length > 40);
  const vecs = await embed(texts);
  return texts.map((text, i) => ({ text, vec: vecs[i] }));
}

const indexPromise: Promise<Chunk[]> = buildIndex();  // sin top-level await, mismo fix de Hito 7/8

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function retrieve(query: string, k = 3): Promise<string[]> {
  const index = await indexPromise;
  const [qv] = await embed(query);
  return index
    .map((c) => ({ text: c.text, score: cosine(qv, c.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((c) => c.text);
}

// Corpus completo embebido en las instrucciones — único canal determinístico para VOZ
// (onUserTurnCompleted no se dispara con RealtimeModel; ver docs/livekit/hito-11.md).
const corpusText = readFileSync('corpus/RAG.txt', 'utf-8');

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const agent = new voice.Agent({
      instructions: `Asistente de voz breve, en español. Máx 2 frases por respuesta. Respondé usando este contexto del corpus cuando la pregunta lo requiera:\n${corpusText}`,
      tools: { webSearch, getTime },
    });

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
      // llm: new google.realtime.RealtimeModel({          // ← SWAP para 11.3 (Gemini)
      //   apiKey: process.env.GEMINI_API_KEY,
      //   modalities: [Modality.AUDIO],
      // }),
    });

    await session.start({ agent, room: ctx.room });

    // Canal de texto — retrieval real por consulta, determinístico (controlamos el momento de generateReply).
    ctx.room.registerTextStreamHandler('chat', async (reader, info) => {
      const text = await reader.readAll();
      const hits = await retrieve(text, 3);
      console.log(`[RAG] query="${text}" → ${hits.length} chunks:`, hits.map((h) => h.slice(0, 60)));
      const context = hits.join('\n---\n');
      console.log(`[TEXT IN] de ${info.identity}: "${text}"`);
      session.generateReply({
        userInput: `${text}\n\n(Contexto recuperado del corpus, usalo si aplica:\n${context})`,
      });
    });
  },
});

cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'secret',
}));
