# Hito 6 — Pipeline + Tools (function calling)

> Plan `learn-livekit-sdk`, **Fase B (Agents Pipeline)** — mismo worker del Hito 5, ahora con tools.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-function-calling/spec.md`
> No aparecen procesos nuevos: seguís con los **3 procesos** de Hito 5 (app Next.js + `livekit-server` + agent worker).
> Lo único que cambia: el `voice.Agent` ahora expone **tools** que el LLM puede invocar.

## TEORÍA

### Qué es una tool (function calling) en un agente de voz
Una **tool** es una función tuya que el LLM puede decidir llamar a mitad del turno. El flujo es:
humano habla → STT → el LLM ve el texto **y la lista de tools** → si le falta un dato o hace falta
una acción, en vez de responder texto el modelo emite una **tool call** (nombre + argumentos JSON) →
la `AgentSession` ejecuta tu función → el **resultado vuelve al LLM** → el LLM redacta la respuesta
final → TTS la sintetiza como voz. El humano nunca "ve" la llamada; solo escucha la respuesta ya
enriquecida con el resultado.
FUENTE: https://docs.livekit.io/agents/build/tools/ (Tool definition & use).

### Dónde viven las tools: en el `Agent`, no en la `AgentSession`
Igual que las `instructions`, las tools se declaran en el objeto `voice.Agent` vía la opción `tools`.
La `AgentSession` (STT/LLM/TTS + turnos) no cambia. Esto es coherente con Hito 5: **la personalidad
y las capacidades del agente viven en `Agent`; el runtime vive en `AgentSession`**.
FUENTE: tipos instalados `node_modules/@livekit/agents/dist/voice/agent.d.ts` (`AgentOptions.tools`).

### Por qué el MISMO set de tools sirve para OpenAI y Gemini (el punto del hito)
Vos declarás la tool **una sola vez** con el helper `tool()` del framework (`@livekit/agents`). El
framework la guarda en un formato neutral (nombre + descripción + schema de parámetros + `execute`).
Cuando corre el turno, **el plugin del LLM traduce** esa definición al formato de function-calling
propio del provider (OpenAI `tools`/`function` · Gemini `functionDeclarations`). Por eso el
requisito 6.3 —"mismo set de tools con ambos providers, sin cambios en la declaración"— se cumple
**por diseño**: cambiás solo la línea del `llm` (como en Hito 5.3) y las tools no se tocan.
FUENTE: https://docs.livekit.io/agents/build/tools/ · tipos `dist/llm/tool_context.d.ts` (formato neutral `FunctionTool`).

## API VERIFICADA (tipos instalados, @livekit/agents@1.5.3 + zod@4.4.3)

⚠️ Fuente primaria = los `.d.ts` instalados (tu versión exacta). Links docs.livekit.io = apoyo conceptual.

### El helper `tool({ ... })`
Exportado desde `@livekit/agents` (raíz, `export *`) y también bajo el namespace `llm` (`llm.tool`).
Firma verificada (`dist/llm/tool_context.d.ts:309`):
```typescript
tool({
  name: string,          // nombre que el modelo llama (único, no vacío)
  description: string,   // en lenguaje natural: le dice al modelo CUÁNDO usarla
  parameters?: Schema,   // Zod object schema  ó  JSON Schema 7; omitir si no lleva args
  execute: (args, opts) => Promise<Result>,  // args ya parseados; Result vuelve al modelo
  // flags?, onDuplicate? — opcionales
})
```
- `parameters` acepta **schema Zod** (args tipados por inferencia) **o JSON Schema 7 crudo**
  (`ToolInputSchema` = `{ _output } | { '~standard' } | JSONSchema7`, línea 14). **zod@4.4.3 está
  instalado** top-level ⇒ usá Zod, que soporta el estándar `~standard`.
- `execute(args, opts)`: `args` es el objeto parseado (vacío si omitís `parameters`); `opts` trae
  `ctx` (`RunContext`), `toolCallId`, `abortSignal`. **Lo que retornás se le manda de vuelta al LLM.**
- Sin `name` (sintaxis anónima), el nombre lo pone la **clave del objeto** en el `ToolDefinitionMap`.

### Cómo se pasan al agente (`AgentOptions.tools`)
Verificado `dist/voice/agent.d.ts:53` → `tools?: ToolContextLike`. Acepta dos formas
(`ToolContextInit`, línea 260):
1. **Array** de tools con `name` propio: `tools: [tool({ name:'...', ... }), tool({ name:'...', ... })]`
2. **Objeto map** (`ToolDefinitionMap`) keyed por nombre, con tools anónimas:
   `tools: { getWeather: tool({ description, parameters, execute }), ... }`
Cualquiera de las dos vale; el hito pide **≥2 tools**.

### Esqueleto (estructura, NO copiar entero — es tuyo implementarlo)
```typescript
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { z } from 'zod';

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const agent = new voice.Agent({
      instructions: 'Asistente de voz breve en español. Usá las tools cuando apliquen.',
      tools: {
        // tool 1: con parámetros (Zod)
        getWeather: tool({
          description: 'Da el clima actual de una ciudad.',
          parameters: z.object({ city: z.string().describe('nombre de la ciudad') }),
          execute: async ({ city }) => {
            // ...tu lógica (mock o fetch real). Lo retornado vuelve al LLM:
            return `En ${city} hay 22°C y despejado.`;
          },
        }),
        // tool 2: sin parámetros
        getTime: tool({
          description: 'Da la hora actual del servidor.',
          execute: async () => `Son las ${'<hora>'} (hora del servidor).`,
        }),
      },
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({ model: 'whisper-1', language: 'es' }),
      llm: new openai.LLM({ model: 'gpt-4o-mini' }),   // 🔀 6.3: única línea que cambia a google.LLM
      tts: new openai.TTS({ model: 'tts-1', voice: 'alloy' }),
    });

    await session.start({ agent, room: ctx.room });
  },
});

cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880', apiKey: 'devkey', apiSecret: 'secret',
}));
```
Notas verificadas:
- `tool` se importa de `@livekit/agents` (raíz). `z` de `zod` (v4 instalado).
- Las tools van en `voice.Agent`, NO en `AgentSession` (igual que `instructions`).
- El pipeline STT/LLM/TTS es idéntico a Hito 5; el diff del hito son las tools.
- ⚠️ `Date.now()`/hora: usá tu runtime normal en el worker; el ejemplo dejó `'<hora>'` de placeholder.

## CÓMO IMPLEMENTARLO

1. **Base**: copiá tu `livekit/hito5/agent.ts` a `livekit/hito6/agent.ts` (o rama nueva). El pipeline
   ya funciona; solo agregás `tools`.
2. **Declará ≥2 tools** con `tool()`. Al menos una con `parameters` (Zod) y su `execute` que retorne
   algo que el LLM pueda leer. Que las descripciones sean claras: el modelo decide por la `description`.
3. **Corré los 3 procesos** (igual que Hito 5):
   ```bash
   # Terminal 1: livekit-server --dev
   # Terminal 2: cd livekit/nextjs-frontend && npm run dev
   # Terminal 3: tsx livekit/hito6/agent.ts dev
   ```
   Recordá el dev-loop de Hito 5: `pkill -f agent.ts` antes de reiniciar (huérfanos worker+inference).
4. **Probá que el LLM invoca la tool**: hablá pidiendo algo que dispare una tool ("¿qué clima hace en
   Lima?"). En los logs del worker deberías ver la **tool call** (nombre + args), tu `execute`
   ejecutándose, y la respuesta de voz incorporando el resultado.
5. **Dual-provider (6.3)**: cambiá SOLO la línea del `llm` a `google.LLM({ model:'gemini-2.5-flash',
   apiKey: process.env.GEMINI_API_KEY })`, reiniciá, repetí la misma pregunta. **Las tools no se
   tocan** — mismo objeto `tools`. Confirmá que Gemini también las invoca.

## LA TAREA (tasks 6.2–6.3) + CHECKPOINTS

- **6.2** Declarar **≥2 tools** ejecutables por el `AgentSession`. ✅ Checkpoint: pedís por voz algo
  cubierto por una tool → el LLM la invoca, su resultado entra en la respuesta, y la escuchás por TTS.
- **6.3** El **mismo set de tools** funciona con OpenAI y con Gemini como LLM, **sin cambios en la
  declaración**. ✅ Checkpoint: repetís la prueba con ambos providers; el único diff es la línea `llm`.

Criterio de cierre (spec `livekit-function-calling`, 2 requisitos):
1. ≥2 tools declaradas vía function calling de `@livekit/agents`; el LLM las invoca y el resultado
   se sintetiza como audio · 2. mismo set de tools con ambos providers, sin tocar la declaración.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 6.2 y 6.3.** Reviso y cierro en 6.4.
Antes de tu checkpoint te entrego el `hito6-doccode.md` (línea por línea QUÉ / POR DETRÁS / CONCEPTO)
del código que escribas. Frase de escape sigue disponible si necesitás que implemente yo.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor | 6.1 | ✅ entregado |
| ≥2 tools en el AgentSession | 6.2 | ✅ `webSearch` (Tavily) + `getTime` · checkpoint browser OK |
| mismo set de tools, ambos providers | 6.3 | ✅ swap 1 línea a `google.LLM`, tools intactas |
| review final vs `livekit-function-calling` | 6.4 | ✅ cerrado — 2/2 requisitos |

## Aprendido (bug de review)
`tool({ inputSchema: ... })` NO funciona en `@livekit/agents` — el key es **`parameters`**. `inputSchema`
es de Vercel AI SDK. Como `tsx` no typechea, el key sobrante se ignora en silencio → `parameters`
queda `undefined` → la tool se registra sin schema → el LLM nunca manda los args (`query = undefined`).
Fix de 1 palabra. Lección: con `tsx` (sin typecheck) los keys mal escritos no avisan; verificar contra
los `.d.ts` instalados.

## doccode
Explicación línea por línea en `docs/livekit/hito6-doccode.md`.
