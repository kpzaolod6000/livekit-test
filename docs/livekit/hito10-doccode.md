# Hito 10 — doccode (línea por línea): `livekit/hito10/agent.ts`

> QUÉ hace / QUÉ pasa por detrás / CONCEPTO — implementado por mentor bajo frase de escape ("necesito que lo implementes tu").
> Verificado contra `@livekit/agents@1.5.3`, `@livekit/agents-plugin-{openai,google}@1.5.3`, `tsc` limpio (mismo `import.meta` esperado que Hitos 5-9) y `tsx livekit/hito10/agent.ts --help` carga sin error. Falta checkpoint en vivo.

## Imports (líneas 1–7)

```typescript
import 'dotenv/config';
import { cli, defineAgent, voice, tool, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';
import { z } from 'zod';
import { tavily, TavilyClient } from '@tavily/core';
```
- **`tool`, `z`, `tavily`/`TavilyClient`** — QUÉ: los mismos imports que Hito 6, sin cambios. POR DETRÁS: `tool()` construye un objeto `FunctionTool` (`ToolContext`-compatible) sin importar qué `llm` lo va a usar después — la declaración de una tool no sabe ni le importa si el modelo que la va a invocar es de pipeline o Realtime. CONCEPTO: esa independencia es justo lo que permite copiar-pegar las tools de Hito 6 sin tocarles una línea.
- Resto de imports (`voice`, providers, `Modality`) — igual que Hito 9.

## Las tools — idénticas a Hito 6 (líneas 9–25)

```typescript
const tavilyClient: TavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const webSearch = tool({
  description: '...',
  parameters: z.object({ query: z.string().describe('Consulta de búsqueda') }),
  execute: async ({ query }) => { /* ... */ },
});

const getTime = tool({
  description: 'Devuelve la hora actual del servidor. Usar cuando el usuario pregunte la hora.',
  execute: async () => `Son las ${new Date().toLocaleTimeString('es-PE')}.`,
});
```
- QUÉ: cero diferencias con Hito 6 — mismo `description`, mismo `parameters` con Zod, mismo `execute`. POR DETRÁS: no hay ningún branch de código que distinga "esta tool es para Realtime" — el `tool()` de `@livekit/agents` genera la misma forma interna (`FunctionTool`) sin importar el consumidor. CONCEPTO: esto es la prueba directa de la TEORÍA del hito — las tools no conocen ni les importa el tipo de `llm`.

## El Agent — tools van acá, no en el `llm` (líneas 30–33)

```typescript
const agent = new voice.Agent({
  instructions: 'Asistente de voz breve, en español. Máx 2 frases por respuesta.',
  tools: { webSearch, getTime },
});
```
- QUÉ: mismo `voice.Agent` de siempre, con `tools` como mapa nombre→`FunctionTool` (igual forma que Hito 6/8). POR DETRÁS: verificado en tipos instalados `@livekit/agents/dist/llm/realtime.d.ts` — el `RealtimeSession` abstracto expone `get tools(): ToolContext` y `updateTools(tools: ToolContext)`. Cuando llamás `session.start({ agent, room })` más abajo, el framework arma un `ToolContext` a partir de `agent.tools` y se lo entrega al `RealtimeSession` del plugin activo (OpenAI o Google) — es la MISMA clase `ToolContext` que usa el `llm` de pipeline en Hito 6. CONCEPTO: **el `Agent` es el dueño de las tools; el `llm` (pipeline o Realtime) solo las consume vía esa interfaz común** — por eso "cambiar de Realtime a pipeline" o "cambiar de provider Realtime" nunca toca esta parte del código.

## `AgentSession` — mismo `llm` Realtime de Hito 9, sin cambios (líneas 35–41)

```typescript
const session = new voice.AgentSession({
  llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
  // llm: new google.realtime.RealtimeModel({
  //   apiKey: process.env.GEMINI_API_KEY,
  //   modalities: [Modality.AUDIO],
  // }),
});
```
- QUÉ: literalmente el mismo bloque que `livekit/hito9/agent.ts`. POR DETRÁS: no hace falta tocar la construcción del `RealtimeModel` para que las tools funcionen — verificado en `dist/realtime/realtime_model.js` (OpenAI) y `dist/realtime/realtime_api.js` (Google): ambos plugins leen las tools desde el `ToolContext` que les llega vía `session.start()`, no desde opciones del constructor del `RealtimeModel`. CONCEPTO: separación limpia — options del `RealtimeModel` configuran EL MODELO (modalidad, voz, etc.), `agent.tools` configura QUÉ PUEDE HACER, y son ortogonales.
- **Asimetría real (no bloquea este hito, pero explica un límite):** `realtime_api.js` (Google) fija `midSessionToolsUpdate: false` en el constructor — las tools quedan congeladas para toda la sesión desde que arranca. `realtime_model.js` (OpenAI) sí implementa `updateTools()`/`createToolsUpdateEvent()` operativos, o sea puede cambiar tools mid-sesión. Como acá las tools se declaran una sola vez al arrancar (no las cambiamos en caliente), esta diferencia no afecta el checkpoint — pero si en algún hito futuro quisieras tools dinámicas, con Google necesitarías reiniciar sesión.
- **Otra asimetría de Google sin equivalente en OpenAI:** `toolBehavior` (`Behavior.BLOCKING` por default, según `realtime_api.d.ts:194`) y `toolResponseScheduling` — controlan si el modelo espera el resultado de la tool antes de seguir hablando (`BLOCKING`) o sigue conversando mientras la tool corre (`NON_BLOCKING`). No se configura acá (default alcanza), documentado solo como CONCEPTO para si notás timing distinto entre providers.

## Resolución de la tool — sin código nuevo, la da el framework

No hay una línea explícita de "esperar function_call → ejecutar → reinyectar" en este archivo — a diferencia de, por ejemplo, tener que armar vos el loop de tool-calling con la API nativa de OpenAI/Gemini (`tool_calls` en la respuesta → vos ejecutás → reenviás resultado). QUÉ pasa acá: verificado en `RealtimeCapabilities` (`dist/llm/realtime.d.ts`) — ambos plugins declaran `autoToolReplyGeneration: true` en su constructor (`realtime_model.js` línea del `super({...})` para OpenAI, `realtime_api.js` línea equivalente para Google). POR DETRÁS: cuando el modelo emite un function call, el `AgentSession` (no vos) ejecuta el `execute()` de la tool, arma la respuesta de vuelta al modelo, y dispara la continuación automáticamente — todo dentro de la misma conexión WebSocket/streaming de la sesión Realtime. CONCEPTO: esto es justo el requisito del spec `livekit-realtime-tools` ("la tool se invoca, su resultado se resuelve dentro de la misma sesión, y la conversación continúa en voz sin cerrar la conexión") — es comportamiento dado por el framework, no algo que se implementa a mano en este hito.

## Texto entrante (heredado de Hito 9, no es parte de 10.2/10.3)
El `registerTextStreamHandler('chat', ...)` al final es el mismo de Hito 9 — se dejó porque no molesta y permite seguir probando por texto, pero no es requisito de este hito. Ver `hito9-doccode.md` para el detalle línea por línea de ese bloque.

## El ciclo completo con tools en Realtime
1. Hablás → audio llega al `RealtimeModel` vía `AgentSession` (igual que Hito 9).
2. El modelo decide que necesita `webSearch`/`getTime` → emite un function call dentro del stream de la sesión.
3. El framework (`autoToolReplyGeneration`) ejecuta el `execute()` correspondiente, arma la respuesta y se la reinyecta al modelo — sin que vos escribas ese loop.
4. El modelo retoma y responde en audio incorporando el resultado — la conexión nunca se cierra ni se reabre.
5. Repetir con `google.realtime.RealtimeModel` (10.3): mismas tools, mismo `Agent`, solo cambia el `llm` — la única diferencia real es que en Google las tools quedaron fijas desde `session.start()` (no se pueden actualizar mid-sesión), lo cual no afecta este checkpoint porque no las cambiamos en caliente.
