 import 'dotenv/config';
  import { GoogleGenAI, Modality } from '@google/genai';
  import * as readline from 'node:readline/promises';

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  async function main() {
    let resolveTurn: (() => void) | null = null;

    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        systemInstruction: 'Eres un asistente directo y conciso.',
      },
      callbacks: {
        onopen: () => console.log('[Sesión Live conectada]'),
        onmessage: (message) => {
          const texto = message.serverContent?.outputTranscription?.text;
          if (texto) process.stdout.write(texto);

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