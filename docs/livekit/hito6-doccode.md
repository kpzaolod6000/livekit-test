# Hito 6 — doccode (línea por línea): `livekit/hito6/agent.ts`

> Explicación **QUÉ hace / QUÉ pasa por detrás / CONCEPTO** de cada línea del worker con tools.
> Solo se explica lo NUEVO vs Hito 5 en detalle; lo heredado (pipeline, CLI) se resume — ver `hito5-doccode.md`.
> API verificada contra tipos instalados `@livekit/agents@1.5.3`, `@tavily/core@0.7.6`, `zod@4.4.3`.

## Imports (líneas 1–6)

```typescript
import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';
```
- **`import 'dotenv/config'`** — QUÉ: carga `.env` a `process.env` al arrancar. POR DETRÁS: side-effect import; ejecuta el código del módulo, no importa símbolo. CONCEPTO: las keys (`OPENAI_API_KEY`, `TAVILY_API_KEY`, `GEMINI_API_KEY`) quedan disponibles antes de instanciar clients.
- **`tool`** (nuevo vs Hito 5) — QUÉ: helper que crea una function-tool. POR DETRÁS: envuelve tu `{description, parameters, execute}` en un `FunctionTool` neutral con un símbolo interno (`TOOL_SYMBOL`) que el framework reconoce. CONCEPTO: la tool queda en formato agnóstico; cada plugin de LLM la traduce a SU formato de function-calling.
- **`z` de `zod`** (nuevo) — QUÉ: constructor de schemas. POR DETRÁS: un schema Zod expone la interfaz `~standard`, que `tool()` acepta (`ToolInputSchema`) y convierte a JSON Schema para el modelo. CONCEPTO: describís los args UNA vez y sirve para validar en runtime + informar al LLM.
- **`tavily, TavilyClient`** (nuevo) — QUÉ: factory + tipo del cliente de búsqueda web. POR DETRÁS: `tavily({apiKey})` devuelve un objeto con métodos (`search`, `extract`, ...) que hacen HTTP a la API de Tavily. CONCEPTO: es una dependencia externa que tu tool encapsula; el LLM no la conoce, solo ve la tool.

## Cliente Tavily (línea 8)

```typescript
const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
```
- QUÉ: crea el cliente una sola vez a nivel módulo. POR DETRÁS: se instancia al cargar el archivo (fuera de `entry`), así se reusa entre jobs; no abre conexión aún — cada `search()` hace su propio fetch. CONCEPTO: singleton de módulo — barato y compartido, no per-request.

## Tool 1 — `webSearch` (líneas 10–22)

```typescript
const webSearch = tool({
  description: 'Busca información actual, reciente o en tiempo real en internet. Úsala SIEMPRE que...',
  parameters: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => {
    const res = await tavilyClient.search(query, { includeAnswer: true, maxResults: 3 });
    return {
      answer: res.answer,
      sources: res.results?.map((r) => ({ title: r.title, url: r.url, content: r.content })),
    };
  },
});
```
- **`description`** — QUÉ: le dice al modelo CUÁNDO usar la tool. POR DETRÁS: este texto viaja al LLM en cada turno como parte de la lista de tools; el modelo decide invocar SOLO leyendo esto. CONCEPTO: prompt engineering de tool — descripción vaga = el modelo no la usa o la usa mal.
- **`parameters: z.object({ query: ... })`** — QUÉ: declara 1 arg string obligatorio. POR DETRÁS: `tool()` toma el schema Zod → lo serializa a JSON Schema → el plugin lo mete en el formato de function-calling del provider (OpenAI `function.parameters` / Gemini `functionDeclarations[].parameters`). CONCEPTO: ⚠️ el key es **`parameters`**, NO `inputSchema` (ese es Vercel AI SDK). Con el key mal, el schema se ignora silencioso y `query` llega `undefined`.
- **`.describe('Consulta de búsqueda')`** — QUÉ: doc del campo. POR DETRÁS: pasa al JSON Schema como `description` del parámetro; ayuda al modelo a llenar bien el arg. CONCEPTO: metadata por-campo, no solo por-tool.
- **`execute: async ({ query }) => {...}`** — QUÉ: tu handler; recibe args ya parseados. POR DETRÁS: la `AgentSession` lo llama cuando el LLM emite una tool call; `query` ya viene validado contra el Zod. Lo que retornás se serializa y vuelve al LLM como resultado de la tool. CONCEPTO: es el puente entre "el modelo decidió" y "tu código actúa".
- **`await tavilyClient.search(query, { includeAnswer: true, maxResults: 3 })`** — QUÉ: HTTP a Tavily. POR DETRÁS: `includeAnswer` pide a Tavily un resumen ya redactado (`res.answer`); `maxResults:3` limita a 3 fuentes. CONCEPTO: reducir el payload ANTES de devolverlo al LLM = menos tokens, menos latencia, menos ruido. Verificado en `TavilySearchOptions` (tipos instalados).
- **`return { answer, sources: res.results?.map(...) }`** — QUÉ: recorta la respuesta a lo útil. POR DETRÁS: en vez del objeto Tavily entero (`images`, `score`, `requestId`, `usage`...), mandás solo answer + {title,url,content}. El `?.` evita crash si `results` viniera undefined. CONCEPTO: shaping del tool-result — el LLM solo necesita el contenido, no la metadata de la API.

## Tool 2 — `getTime` (líneas 24–28)

```typescript
const getTime = tool({
  description: 'Devuelve la hora actual del servidor. Usar cuando el usuario pregunte la hora.',
  execute: async () => `Son las ${new Date().toLocaleTimeString('es-PE')}.`,
});
```
- QUÉ: tool sin argumentos que devuelve la hora. POR DETRÁS: al **omitir `parameters`**, `tool()` infiere args tipo `Record<string, never>` (objeto vacío) — el modelo la invoca sin mandar nada. `new Date()` corre en el proceso del worker (hora del server, no del browser). CONCEPTO: no toda tool necesita args; sirve para cumplir el requisito de ≥2 tools y demostrar el caso "sin parámetros".

## Wiring en el agente (líneas 31–41)

```typescript
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const agent = new voice.Agent({
      instructions: 'Sos asistente de voz breve, en español. Máx 2 frases por respuesta.',
      tools: { webSearch: webSearch, getTime: getTime },
    });
```
- **`defineAgent({ entry })` / `await ctx.connect()`** — heredado Hito 5: define el worker; `connect()` une el worker a la sala como un participante más. Ver `hito5-doccode.md`.
- **`tools: { webSearch, getTime }`** (nuevo) — QUÉ: registra ambas tools en el agente. POR DETRÁS: es un `ToolDefinitionMap` (objeto keyed por nombre); la **clave** (`webSearch`) es el nombre que el modelo llama, no la variable. Verificado: `AgentOptions.tools` acepta array u objeto map (`dist/voice/agent.d.ts:53`). CONCEPTO: las tools viven en `voice.Agent` (capacidades del agente), NO en `AgentSession` (runtime) — igual criterio que `instructions`.

## Pipeline + CLI (líneas 43–60)

Idéntico a Hito 5 — sin cambios:
- **`AgentSession({ stt, llm, tts })`** — orquesta STT→LLM→TTS + turnos + VAD silero auto (vad omitido). La línea 45 (`openai.LLM`) es la que swapeás a `google.LLM` (línea 46) para el dual-provider 6.3. **Las tools NO se tocan en el swap** → ese es el punto del hito.
- **`session.start({ agent, room: ctx.room })`** — arranca el bucle escucha→piensa→habla, ahora con tools disponibles.
- **`cli.runApp(new ServerOptions({...}))`** — registra el worker contra el server self-hosted (`ws://localhost:7880`, devkey/secret).

## El ciclo completo de una tool call (qué pasa al preguntar "¿noticias de X?")
1. Humano habla → STT (whisper) → texto.
2. LLM ve el texto + las 2 tools (nombre+description+schema).
3. LLM decide: emite tool call `webSearch({ query: "noticias de X" })` en vez de responder texto.
4. `AgentSession` ejecuta tu `execute` → Tavily HTTP → `{answer, sources}`.
5. El resultado vuelve al LLM → redacta respuesta final en lenguaje natural.
6. TTS sintetiza esa respuesta → audio a la sala → el humano la escucha.
El humano nunca "ve" los pasos 3–5; solo oye el 6.

## Dual-provider (6.3) — por qué no se tocan las tools
`tool()` guarda todo en formato neutral. Al cambiar SOLO `llm: openai.LLM` → `google.LLM`, el plugin de Gemini traduce las MISMAS definiciones a `functionDeclarations`. Mismo objeto `tools`, cero cambios. Verificado conceptualmente en la arquitectura de `@livekit/agents` (tools agnósticas del provider).
