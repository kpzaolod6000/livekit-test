 import 'dotenv/config';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
    name: 'getWeather',
    description: 'Obtiene el clima actual de una ciudad',
    parameters: {
        type: 'object',
        properties: { city: { type: 'string', description: 'Nombre de la ciudad' } },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTime',
      description: 'Obtiene la hora actual del sistema',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function ejecutarTool(name: string, args: any) {
  if (name === 'getWeather') return { city: args.city, temp: 24, condition: 'soleado' };
  if (name === 'getTime') return { time: new Date().toLocaleTimeString() };
  throw new Error(`Tool desconocida: ${name}`);
}

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: 'system', content: 'Eres un asistente directo y conciso.' }, // tu persona aquí
];

async function main() {
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    messages.push({ role: 'user', content: input });

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini', // modelo disponible
      messages,
      tools,
      stream: true,
    });

    let response = '';
    const toolCallsAcumulados: any[] = []; // aquí reconstruyes los chunks fragmentados

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        process.stdout.write(delta.content);
        totalChars += delta.content.length;
        response += delta.content;
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallsAcumulados[tc.index]) {
            toolCallsAcumulados[tc.index] = { id: tc.id, function: { name: '', arguments: '' } };
          }
          if (tc.function?.name) toolCallsAcumulados[tc.index].function.name += tc.function.name;
          if (tc.function?.arguments) toolCallsAcumulados[tc.index].function.arguments += tc.function.arguments;
        }
      }
    }
    // Si hubo tool calls, resuélvelas y pide la respuesta final
    if (toolCallsAcumulados.length > 0) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCallsAcumulados.map(tc => ({ id: tc.id, type: 'function', function: tc.function })),
      });

      for (const tc of toolCallsAcumulados) {
        const args = JSON.parse(tc.function.arguments);
        const result = ejecutarTool(tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      const followUp = await client.chat.completions.create({ model: 'gpt-4o-mini', messages, stream: true });
      for await (const chunk of followUp) {
        const texto = chunk.choices[0]?.delta?.content ?? '';
        if (texto) { 
          process.stdout.write(texto);
          totalChars += texto.length;
          response += texto; 
        }
      }
    }
    console.log();
    messages.push({ role: 'assistant', content: response }); // <-- clave: sin esto, el modelo "olvida" cada turno
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();