import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';

// --- RAG (igual que Hito 7) ---

const oai = new OpenAI();

async function embed(input: string | string[]) {
  const res = await oai.embeddings.create({ model: 'text-embedding-3-small', input });
  return res.data.map((d) => d.embedding);   // number[][]
}
type Chunk = { text: string; vec: number[] };

async function buildIndex(): Promise<Chunk[]> {
  const raw = readFileSync('corpus/RAG.txt', 'utf-8');
  const texts = raw.split(/\n\s*\n/).map((t) => t.trim()).filter((t) => t.length > 40);  // por párrafo
  const vecs = await embed(texts);
  return texts.map((text, i) => ({ text, vec: vecs[i] }));
}

const indexPromise: Promise<Chunk[]> = buildIndex();  // arranca ya, sin bloquear la carga del módulo (sin top-level await)

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

class RagAgent extends voice.Agent {
  async onUserTurnCompleted(chatCtx: llm.ChatContext, newMessage: llm.ChatMessage) {
    const q = newMessage.textContent;
    if (!q) return;
    const hits = await retrieve(q, 3);
    console.log(`[RAG] query="${q}" → ${hits.length} chunks:`, hits.map((h) => h.slice(0, 60)));
    const context = hits.join('\n---\n');
    chatCtx.addMessage({
      role: 'system',
      content: `Contexto recuperado del corpus (usalo si responde la pregunta):\n${context}`,
    });
  }
}

// --- Tools (igual que Hito 6) ---

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // RagAgent + tools en el mismo turno: el hook onUserTurnCompleted inyecta contexto
    // del corpus ANTES de que el LLM piense; las tools quedan disponibles para que el
    // LLM las invoque si la pregunta requiere info que el corpus no tiene (ej. clima, hora).
    const agent = new RagAgent({
      instructions: 'Asistente breve en español. Respondé usando el contexto recuperado del corpus cuando aplique; si la pregunta es sobre info actual/tiempo real o la hora, usá las tools.',
      tools: {
        webSearch: webSearch,
        getTime: getTime,
      },
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({ model: 'whisper-1', language: 'es' }),  // lee OPENAI_API_KEY
      // llm: new openai.LLM({ model: 'gpt-4o-mini' }),                // ← LÍNEA A SWAPEAR (8.3)
      llm: new google.LLM({ model: 'gemini-3.1-flash-lite', apiKey: process.env.GEMINI_API_KEY }),
      tts: new openai.TTS({ model: 'tts-1', voice: 'alloy' }),
      // vad omitido ⇒ silero embebido
    });

    await session.start({ agent, room: ctx.room });
  },
});

cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'secret',
}));
