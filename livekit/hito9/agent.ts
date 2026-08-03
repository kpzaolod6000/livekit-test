import 'dotenv/config';
import { cli, defineAgent, voice, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // Sin RAG ni tools acá (eso es Hito 11/10 sobre Realtime) — solo el modelo único.
    const agent = new voice.Agent({
      instructions: 'Asistente breve en español. Respondé en voz y por texto según cómo te escriban.',
    });

    const session = new voice.AgentSession({
      // Un solo llm Realtime — NO hay stt/tts separados (a diferencia de Hitos 5-8).
      llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
      // llm: new google.realtime.RealtimeModel({          // ← SWAP para 9.3 (Gemini)
      //   apiKey: process.env.GEMINI_API_KEY,              // fallback interno lee GOOGLE_API_KEY, no GEMINI_API_KEY
      //   modalities: [Modality.AUDIO],                     // enum, no strings (distinto de OpenAI)
      // }),
    });

    await session.start({ agent, room: ctx.room });

    // 9.4 — entrada de texto: equivalente Node de sendClientContent().
    // Mismo topic 'chat' que el cliente de Hito 1/2 ya usa para enviar texto.
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
