import 'dotenv/config';
import { cli, defineAgent, voice, ServerOptions, type JobContext, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

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
  
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    
    const agent = new RagAgent({
      instructions: 'Asistente breve en español. Respondé usando el contexto recuperado cuando aplique.',
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