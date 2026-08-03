# Hito 1 — Chat streaming + instrucciones del sistema (multi-provider)

## TEORÍA

La idea central de Vercel AI SDK: `streamText` funciona igual sin importar el provider — lo único que cambia es el objeto que le pasas a `model`. Esa es la abstracción: mismo código, distinto "motor" atrás.

```
┌─────────────────────────────────────┐
│         streamText({ model, ... })   │
└──────────────┬────────────────────┬─┘
               │                    │
        model: openai(...)   model: google(...)
               │                    │
               ▼                    ▼
         GPT responde         Gemini responde
   (mismo código app, cero cambios más allá de esa línea)
```

`system`: mismo concepto que `systemInstruction` (Gemini) / mensaje `role:'system'` (OpenAI) — instrucción fija antes de cualquier turno.

**Streaming**: `streamText` devuelve un objeto con `.textStream`, que se itera con `for await` — chunks de texto, igual patrón que en los SDKs nativos.

Docs:
- Streaming: https://ai-sdk.dev/docs/foundations/streaming
- Provider OpenAI: https://ai-sdk.dev/providers/ai-sdk-providers/openai
- Provider Google: https://ai-sdk.dev/providers/ai-sdk-providers/google

## CÓMO IMPLEMENTARLO

```typescript
import 'dotenv/config';
import { streamText, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Provider viene por parámetro de terminal, no por edición de código:
// npx tsx vercel-hito1.ts openai   ó   npx tsx vercel-hito1.ts gemini
const providerArg = process.argv[2] ?? 'openai';
const model = providerArg === 'gemini' ? google('gemini-2.5-flash') : openai('gpt-4o-mini');
console.log(`[Provider activo: ${providerArg}]`);

const messages: ModelMessage[] = [
  { role: 'system', content: 'Eres un asistente directo y conciso.' },
];

async function main() {
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    messages.push({ role: 'user', content: input });

    const { textStream } = streamText({ model, messages });

    let respuesta = '';
    for await (const chunk of textStream) {
      process.stdout.write(chunk);
      totalChars += chunk.length;
      respuesta += chunk;
    }
    console.log();

    messages.push({ role: 'assistant', content: respuesta }); // igual que en Chat Completions: historial manual
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();
```

Nota: `streamText` no gestiona historial por ti (como Gemini) — sigue siendo tu responsabilidad reenviar `messages` completo (como en Chat Completions). El SDK unifica la LLAMADA, no el manejo de estado.

## LA TAREA

1. Crea `vercel-hito1.ts` con este patrón.
2. Cambia el `system` por tu persona propia.
3. Corre `npx tsx vercel-hito1.ts openai`, prueba una conversación de 2-3 turnos con contexto dependiente (nombre, dato que se recuerde).
4. Corre `npx tsx vercel-hito1.ts gemini` (mismo archivo, sin editar nada), misma prueba.
5. Compara: ¿ambos mantienen el contexto igual de bien? ¿alguna diferencia notable en la respuesta?
