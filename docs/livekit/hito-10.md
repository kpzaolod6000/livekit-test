# Hito 10 — Realtime + Tools (function calling en sesión Realtime)

> Plan `learn-livekit-sdk`, **Fase C (Agents Realtime)**.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-realtime-tools/spec.md`
> Base: `livekit/hito9/agent.ts` (AgentSession Realtime sin tools). Reusás las tools de Hito 6.

## TEORÍA

### Las tools viven en `voice.Agent`, no en el `llm` — por eso el mecanismo es el mismo en pipeline y en Realtime
En Hito 6 declaraste `webSearch`/`getTime` con `tool()` de `@livekit/agents` y las pasaste en
`new voice.Agent({ tools: { webSearch, getTime } })`. Ese `Agent` (con sus tools) es el mismo objeto que le pasás a
`session.start({ agent, room })` sin importar si `AgentSession.llm` es un `LLM` de pipeline o un `RealtimeModel`.
Verificado en tipos instalados `node_modules/@livekit/agents/dist/llm/realtime.d.ts`: `RealtimeSession` expone
`get tools(): ToolContext` y `updateTools(tools: ToolContext)` — la MISMA clase `ToolContext` que usa el LLM de
pipeline. El framework arma ese `ToolContext` a partir de `agent.tools` y se lo pasa al `RealtimeSession` al arrancar.
FUENTE: https://docs.livekit.io/agents/build/tools/ (declaración de tools, genérica — no distingue pipeline/realtime
porque el mecanismo es el mismo) + tipos instalados `node_modules/@livekit/agents/dist/llm/realtime.d.ts`
(`RealtimeCapabilities`, `RealtimeSession.tools`/`updateTools`).

### Qué hace el framework cuando el modelo Realtime decide llamar una tool
`RealtimeCapabilities` (mismo archivo) declara flags que verifiqué leyendo el código de ambos plugins instalados:
- `autoToolReplyGeneration: true` en ambos providers (`realtime_model.js` de openai, `realtime_api.js` de google) —
  el framework ejecuta tu `execute()`, arma la respuesta de vuelta al modelo y dispara la continuación
  automáticamente. No escribís código de "esperar el resultado y reinyectarlo": eso ya lo hace `AgentSession`.
- `manualFunctionCalls: false` en Google (no verificado si OpenAI difiere en este flag específico, pero no aplica
  a este hito): no hace falta gestionar function calls "a mano", el flujo automático alcanza.
- Esto responde el requisito del spec ("la tool se invoca, su resultado se resuelve dentro de la misma sesión, y
  la conversación continúa en voz sin cerrar la conexión") — es comportamiento *dado* por el framework, no algo
  que implementás vos aparte de declarar las tools en el `Agent`.

### Asimetría real entre providers (verificado en código instalado — no es simétrico 1:1, como ya vieron en Hito 9)
- **OpenAI** (`realtime_model.js`): `midSessionToolsUpdate` no está fijo en `false` para este plugin (revisar
  `capabilities` en el constructor si te interesa el detalle) y expone `updateTools()`/`createToolsUpdateEvent()`
  operativos — soporta cambiar el set de tools mientras la sesión sigue corriendo.
- **Google** (`realtime_api.js` constructor): `midSessionToolsUpdate: false` explícito — las tools que declarás en
  el `Agent` al momento de `session.start()` quedan fijas para esa sesión; si querés otro set, hay que reiniciar
  sesión. Para este hito no importa (declarás las tools una sola vez, al arrancar), pero es la razón por la que
  "mismo `Agent` con tools, swap de `llm`" sigue siendo válido sin tocar nada del `Agent`.
- **Google además tiene un knob que OpenAI no tiene:** `toolBehavior` (`Behavior.BLOCKING` por default según el
  tipo instalado `realtime_api.d.ts:194`, alternativa `Behavior.NON_BLOCKING`) y `toolResponseScheduling` —
  controla si el modelo espera el resultado de la tool antes de seguir hablando o continúa la conversación en
  paralelo. No hace falta configurarlo para cerrar este hito (default `BLOCKING` funciona), pero explica por qué
  a veces notás una pausa distinta entre providers mientras la tool corre.

CONCEPTO CLAVE: igual que en Fase B, "mismo componente, cambia el `llm`" sigue siendo el patrón — acá el
componente que no cambia es el `Agent` con sus `tools`, y lo que cambia es el `RealtimeModel` dentro del
`AgentSession`.

## CÓMO IMPLEMENTARLO

1. **Carpeta** `livekit/hito10/agent.ts`. Partí de `livekit/hito9/agent.ts` (estructura `entry`/`ctx.connect()`/
   `cli.runApp`, `AgentSession` con `llm: RealtimeModel`, sin `stt`/`tts`).
2. **Reusá las tools de Hito 6** (`webSearch` con Tavily + `getTime`, o las que ya tengas): mismo `tool()` de
   `@livekit/agents`, mismo `parameters` con Zod.
3. **Pasalas al `Agent`, no al `llm`:**
   ```typescript
   const agent = new voice.Agent({
     instructions: 'Asistente de voz breve, en español.',
     tools: { webSearch, getTime },   // idéntico a Hito 6
   });

   const session = new voice.AgentSession({
     llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
     // llm: new google.realtime.RealtimeModel({ apiKey: process.env.GEMINI_API_KEY, modalities: [Modality.AUDIO] }),
   });

   await session.start({ agent, room: ctx.room });
   ```
4. **No hace falta lógica nueva de function-calling** — la resolución automática (ejecutar, reinyectar, continuar
   en voz) la da el framework (ver TEORÍA). Tu trabajo es declarar las tools y verificar que se invocan.
5. **Dual-provider (10.3):** swap del `llm` completo (mismo patrón asimétrico que Hito 9 — `modalities` string vs
   enum), dejando ambas construcciones comentadas.

## LA TAREA (tasks 10.2–10.3) + CHECKPOINTS

- **10.2** Exponer ≥1 tool (reusar las de Hito 6) al `AgentSession` Realtime. ✅ Checkpoint: preguntale al agente
  algo que dispare `webSearch` o `getTime` por voz — responde con el resultado de la tool, sin cortar la sesión.
- **10.3** Confirmar la(s) misma(s) tool(s) con ambos providers Realtime. ✅ Checkpoint: swap del `llm` a
  `google.realtime.RealtimeModel`, misma pregunta dispara la tool y la conversación de voz sigue (atento a cuota
  free-tier de Gemini si iterás rápido).

Criterio de cierre (spec `livekit-realtime-tools`): 1. tool se invoca y su resultado se resuelve dentro de la
misma sesión de voz, sin cerrar la conexión · 2. mismo set de tools funciona con ambos providers Realtime.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 10.2 y 10.3.** Reviso y cierro en 10.4.
Frase de escape disponible si hay presión de tiempo genuina.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor (teoría + asimetría providers) | 10.1 | ✅ (esta doc) |
| tools en AgentSession Realtime | 10.2 | ✅ confirmado por usuario (voz dispara tool, sesión no corta) |
| dual-provider Realtime con tools | 10.3 | ✅ confirmado por usuario (swap a Gemini Realtime, tool sigue funcionando) |
| review final vs `livekit-realtime-tools` | 10.4 | ✅ cerrado — 2/2 requisitos OK |

Ver línea por línea en `docs/livekit/hito10-doccode.md`. **Hito 10 cerrado.** Arranca Hito 11 (Realtime + RAG).
