 import 'dotenv/config';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

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
      stream: true,
    });

    let respuesta = '';
    for await (const chunk of stream) {
      const texto = chunk.choices[0]?.delta?.content ?? '';
      if (texto) {
        process.stdout.write(texto);
        totalChars += texto.length;
        respuesta += texto;
      }
    }
    console.log();

    messages.push({ role: 'assistant', content: respuesta }); // <-- clave: sin esto, el modelo "olvida" cada turno
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();