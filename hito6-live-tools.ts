 import 'dotenv/config';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import * as readline from 'node:readline/promises';
import { tavily, TavilyClient } from '@tavily/core';

const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function runTool(name: string, args: any) {

  if (name === 'searchInternet') {
    return await tavilyClient.search(args.query);
  }
  throw new Error(`Tool desconocida: ${name}`);
}

const searchInternetDeclaration = {
  name: 'searchInternet',
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que la pregunta trate sobre eventos recientes, datos que cambian con el tiempo (precios,clima, noticias), o cualquier cosa que tu conocimiento entrenado podría tener desactualizado',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Consulta de búsqueda' },
    },
    required: ['query'],
  },
};


async function main() {
  let resolveTurn: (() => void) | null = null;

  const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        systemInstruction: 'Eres un asistente directo y conciso.',
        tools: [{ functionDeclarations: [searchInternetDeclaration] }],
      },
      callbacks: {
        onopen: () => console.log('[Sesión Live conectada]'),
        onmessage: async (message) => {
            const texto = message.serverContent?.outputTranscription?.text;
            if (texto) process.stdout.write(texto);

            if (message.toolCall) {
              for (const call of message.toolCall?.functionCalls) {
                const result = await runTool(call.name, call.args); // tu dispatcher de Hito 2

                session.sendToolResponse({
                  functionResponses: [{ id: call.id, name: call.name, response: { result } }],
                });
              }
            }
              
            if (message.serverContent?.turnComplete) {
              console.log();
              resolveTurn?.();
            }
        },
        onerror: (e) => console.error('Error:', e.message),
        onclose: (e) => console.log('[Sesión cerrada]', e?.reason ?? ''),
      },
  });

  while (true) {
      const input = await rl.question('Tú: ');
      if (input.toLowerCase() === 'salir') break;

      session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: input }] }] });
      await new Promise<void>((resolve) => { resolveTurn = resolve; }); // esperas a que onmessage avise turnComplete
  }

  session.close();
  rl.close();
}

main();