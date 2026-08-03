import 'dotenv/config'
import { GoogleGenAI } from '@google/genai';
import * as readline from 'node:readline/promises';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chat = ai.chats.create({
    model: 'gemini-3.1-flash-lite',
    config: {
        systemInstruction: 'eres un ai que responde directa y concisa, sin rodeos',
    },
});

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

    for await (const chunk of stream) {
        if (chunk.text) {
            process.stdout.write(chunk.text);
            totalChars += chunk.text.length;
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