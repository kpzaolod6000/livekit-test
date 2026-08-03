import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Tool 1 — búsqueda web en tiempo real (Tavily)
const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo (precios, clima, noticias), o cualquier cosa que tu conocimiento entrenado podría tener desactualizado.',
  parameters: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => {
    // includeAnswer+maxResults ⇒ payload chico al LLM (no el objeto Tavily entero)
    const res = await tavilyClient.search(query, { includeAnswer: true, maxResults: 3 });
    return {
      answer: res.answer,
      sources: res.results?.map((r) => ({ title: r.title, url: r.url, content: r.content })),
    };
  },
});

// Tool 2 — hora del servidor (sin API externa; garantiza ≥2 tools para el hito)
const getTime = tool({
  description: 'Devuelve la hora actual del servidor. Usar cuando el usuario pregunte la hora.',
  execute: async () => `Son las ${new Date().toLocaleTimeString('es-PE')}.`,
});


export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const agent = new voice.Agent({
      instructions: 'Sos asistente de voz breve, en español. Máx 2 frases por respuesta.',
      tools: {
        webSearch: webSearch,
        getTime: getTime,
      },
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({ model: 'whisper-1', language: 'es' }),  // lee OPENAI_API_KEY
      llm: new openai.LLM({ model: 'gpt-4o-mini' }),                // ← LÍNEA A SWAPEAR (5.3)
      // llm: new google.LLM({ model: 'gemini-2.5-flash', apiKey: process.env.GEMINI_API_KEY }),
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