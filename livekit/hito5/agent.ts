import 'dotenv/config';
import { cli, defineAgent, voice, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';

 export default defineAgent({
    entry: async (ctx: JobContext) => {
      await ctx.connect();

      const agent = new voice.Agent({
        instructions: 'Sos asistente de voz breve, en español. Máx 2 frases por respuesta.',
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