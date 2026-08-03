import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Tools de Hito 6, sin cambios — se declaran igual sin importar si el llm es pipeline o Realtime.
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

    // Mismo Agent que en pipeline: instructions + tools. Lo que cambia es el llm del AgentSession (abajo).
    const agent = new voice.Agent({
      instructions: 'Asistente de voz breve, en español. Máx 2 frases por respuesta.',
      tools: { webSearch, getTime },
    });

    const session = new voice.AgentSession({
      // llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
      llm: new google.realtime.RealtimeModel({          // ← SWAP para 10.3 (Gemini)
        apiKey: process.env.GEMINI_API_KEY,              // fallback interno lee GOOGLE_API_KEY, no GEMINI_API_KEY
        modalities: [Modality.AUDIO],                     // enum, no strings (distinto de OpenAI)
      }),
    });

    await session.start({ agent, room: ctx.room });

    // Entrada de texto (igual que Hito 9) — no forma parte de este hito pero no molesta dejarlo.
    ctx.room.registerTextStreamHandler('chat', async (reader, info) => {
      const text = await reader.readAll();
      console.log(`[TEXT IN] de ${info.identity}: "${text}"`);
      session.generateReply({ userInput: text });
    });
  },
});

cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'secret',
}));
