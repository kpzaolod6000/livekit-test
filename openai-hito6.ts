import 'dotenv/config';
import WebSocket from 'ws';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const model = 'gpt-realtime-mini';
const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});

function runTool(name: string, args: any) {
  if (name === 'getWeather') return { city: args.city, temp: 24, condition: 'soleado' };
  if (name === 'getTime') return { time: new Date().toLocaleTimeString() };
  throw new Error(`Tool desconocida: ${name}`);
}

let resolveTurn: (() => void) | null = null;
let totalChars = 0;
let pendingResponses = 0

ws.on('open', () => {
  console.log('[Sesión Realtime conectada]');
  ws.send(JSON.stringify({
    type: 'session.update',
    session: { 
      type: 'realtime', 
      output_modalities: ['text'],
      instructions: 'Eres un asistente directo y conciso.' ,
      tools: [
      { 
        type: 'function', 
        name: 'getWeather', 
        description: 'Obtiene el clima actual de una ciudad',
        parameters: { 
          type: 'object', 
          properties: { 
            city: { type: 'string' } 
          }, 
          required: ['city'] 
        } 
      },
      { 
        type: 'function', 
        name: 'getTime', 
        description: 'Obtiene la hora actual del sistema',
        parameters: { 
          type: 'object', 
          properties: {} 
        } 
      },
      ]
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
    pendingResponses--;
    if (pendingResponses === 0) {
      resolveTurn?.();
    }
  }

  if (msg.type === 'error') {
     console.error('Error:', msg.error?.message);
    resolveTurn?.();
  }
  
  if (msg.type === 'response.function_call_arguments.done') {
    const args = JSON.parse(msg.arguments);
    const result = runTool(msg.name, args);

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: msg.call_id, output: JSON.stringify(result) },
    }));
    pendingResponses++;
    ws.send(JSON.stringify({ type: 'response.create' })); // pide que continúe con el resultado
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
    pendingResponses++;
    ws.send(JSON.stringify({ type: 'response.create' }));

    await new Promise<void>((resolve) => { resolveTurn = resolve; }); // espera a que termine el turno (response.done)
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  ws.close();
  rl.close();
}

main();