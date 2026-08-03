import 'dotenv/config';
import WebSocket from 'ws';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const model = 'gpt-realtime-mini';
const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});

let resolveTurn: (() => void) | null = null;
let totalChars = 0;

ws.on('open', () => {
  console.log('[Sesión Realtime conectada]');
  ws.send(JSON.stringify({
    type: 'session.update',
    session: { 
      type: 'realtime', 
      output_modalities: ['text'],
      instructions: 'Eres un asistente directo y conciso.' 
    },
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'response.output_text.delta') {
    process.stdout.write(msg.delta);
    totalChars += msg.delta.length;
  }

  if (msg.type === 'response.done') {
    console.log();
    resolveTurn?.();
  }

  if (msg.type === 'error') {
     console.error('Error:', msg.error?.message);
    resolveTurn?.();
  }
});

ws.on('close', () => console.log('[Sesión cerrada]'));

async function main() {
  await new Promise<void>((resolve) => ws.once('open', resolve)); // espera a que abra antes de preguntar

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: input }] },
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));

    await new Promise<void>((resolve) => { resolveTurn = resolve; }); // espera a que termine el turno (response.done)
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  ws.close();
  rl.close();
}

main();