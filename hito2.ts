import 'dotenv/config'
import { GoogleGenAI, Type } from '@google/genai';
import * as readline from 'node:readline/promises';


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function ejecutarToolReal(name: string, args: any) {
  // if (name === 'getWeatherCurrent'){
  //   const res = await fetch(
  //       'https://api.open-meteo.com/v1/forecast?latitude=-12.05&longitude=-77.04&current_weather=true'
  //   );
  //   const data = await res.json();
  //   return { temp: data.current_weather.temperature };
  // }
  if (name === 'getWeather') {
    return { city: args.city, temp: 24, condition: 'soleado' };
  }
  if (name === 'getTime') {
    return { time: new Date().toLocaleTimeString() };
  }
  throw new Error(`Tool desconocida: ${name}`);
}

const getWeatherDeclaration = {
  name: 'getWeather',
  description: 'Obtiene el clima actual de una ciudad',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING, description: 'Nombre de la ciudad' },
    },
    required: ['city'],
  },
};

const getTimeDeclaration = {
  name: 'getTime',
  description: 'Obtiene la hora actual del sistema',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const chat = ai.chats.create({
  // model: 'gemini-2.5-flash',
  model: 'gemini-3.1-flash-lite',
  config: {
    systemInstruction:'eres un ai que responde directa y concisa, sin rodeos',
    tools: [{ functionDeclarations: [getWeatherDeclaration, getTimeDeclaration] }],
  },
})

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
let totalChars = 0;
async function loop() {
  const input = await rl.question('Tú: ');
  if (input.toLowerCase() === 'salir') {
    rl.close();
    return;
  }
  const stream = await chat.sendMessageStream({ message: input });

  const pendingCalls = []; // <-- nuevo: acumulador

  for await (const chunk of stream) {
    if (chunk.text) {
      totalChars += chunk.text.length;
      process.stdout.write(chunk.text);
    }
    if (chunk.functionCalls) {
      pendingCalls.push(...chunk.functionCalls); // <-- solo guardas, no llamas nada aún
    }
  }
  
  // AHORA sí, fuera del for await de arriba, procesas cada call:
  for (const call of pendingCalls) {
    if (!call.name) continue;
    const result = await ejecutarToolReal(call.name, call.args);

    const followUp = await chat.sendMessageStream({
      message: [{ functionResponse: { name: call.name, response: { result } } }],
    });

    for await (const c2 of followUp) {
      if (c2.text) {
        process.stdout.write(c2.text);
        totalChars += c2.text.length; // aprovecha y suma esto también
      }
    }
  }
  
  console.log();
  await loop();
}
async function main() {
    await loop();
    console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
}
main();