# Hito 2 — Streaming + Tools (function calling), ambos providers

## TEORÍA

Declaras la tool con `description`, `inputSchema` (Zod) y `execute`. Si le das `execute`, el SDK hace TODO el ciclo por ti: detecta que el modelo quiere usarla, corre tu función, reenvía el resultado, continúa generando — sin que reconstruyas nada a mano (a diferencia de Chat Completions nativo, donde reconstruías `tool_calls` fragmentados chunk por chunk).

```
streamText({ model, tools: { getWeather, getTime } })
        │
        ▼
Modelo decide usar getWeather
        │
        ▼
SDK ejecuta tu `execute` automáticamente
        │
        ▼
SDK reenvía resultado al modelo, sin que tú hagas nada
        │
        ▼
Respuesta final en streaming
```

Docs: https://ai-sdk.dev/docs/foundations/tools

## CÓMO IMPLEMENTARLO

```typescript
import 'dotenv/config';
import { streamText, tool, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const providerArg = process.argv[2] ?? 'openai';
const model = providerArg === 'gemini' ? google('gemini-2.5-flash') : openai('gpt-4o-mini');
console.log(`[Provider activo: ${providerArg}]`);

const getWeather = tool({
  description: 'Obtiene el clima actual de una ciudad',
  inputSchema: z.object({ city: z.string().describe('Nombre de la ciudad') }),
  execute: async ({ city }) => ({ city, temp: 24, condition: 'soleado' }),
});

const getTime = tool({
  description: 'Obtiene la hora actual del sistema',
  inputSchema: z.object({}),
  execute: async () => ({ time: new Date().toLocaleTimeString() }),
});

const messages: ModelMessage[] = [];

async function main() {
  let totalChars = 0;

  while (true) {
    const input = await rl.question('Tú: ');
    if (input.toLowerCase() === 'salir') break;

    messages.push({ role: 'user', content: input });

    const { textStream } = streamText({
      model,
      system: 'Eres un asistente directo y conciso.',
      messages,
      tools: { getWeather, getTime },
    });

    let respuesta = '';
    for await (const chunk of textStream) {
      process.stdout.write(chunk);
      totalChars += chunk.length;
      respuesta += chunk;
    }
    console.log();

    messages.push({ role: 'assistant', content: respuesta });
  }

  console.log(`\nTotal caracteres generados en la sesión: ${totalChars}`);
  rl.close();
}

main();
```

Nota clave: NO hay bloque de "reconstruir tool_calls fragmentados" ni "reenviar function_call_output" manual — el SDK se encarga con solo poner `execute`. Ahí está la simplificación real de este SDK sobre los nativos.

## LA TAREA

1. Crea `vercel-hito2.ts` reusando el patrón de Hito 1 (provider por argumento de terminal, loop, contador).
2. Agrega las 2 tools de arriba (o las tuyas).
3. Corre `npx tsx vercel-hito2.ts openai`, pregunta algo que dispare cada tool.
4. Corre `npx tsx vercel-hito2.ts gemini` (mismo código), misma prueba.
5. Compara: ¿ambos deciden usar la tool en casos similares, o hay diferencias de criterio entre providers?
