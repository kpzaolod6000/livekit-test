# Hito 8 — Pipeline + RAG + Tools combinados

> Plan `learn-livekit-sdk`, **Fase B (Agents Pipeline)** — cierra la fase. Mismo worker de Hito 5/6/7, ahora RAG+tools juntos en un solo turno.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-rag-with-tools/spec.md`
> Implementado bajo frase de escape ("necesito que lo implementes tu") — mentor escribió 8.2/8.3, falta checkpoint en vivo (8.4 review).

## TEORÍA

> No hay concepto nuevo de LiveKit acá — es composición de lo ya visto en Hito 6 (tools) e Hito 7 (RAG).
> El punto del hito es verificar que ambos mecanismos conviven en el MISMO turno sin pisarse.

### Por qué no hay conflicto entre el hook de RAG y las tools
`onUserTurnCompleted` (Hito 7) y `tools` (Hito 6) actúan en momentos distintos del ciclo del turno:
1. Humano habla → STT transcribe → `onUserTurnCompleted` corre PRIMERO, inyecta contexto del corpus al `chatCtx` como mensaje `system`.
2. Recién ahí el LLM piensa, con el `chatCtx` ya enriquecido. Si decide que necesita una tool (ej. la pregunta pide hora o info en tiempo real), el LLM la invoca — mecanismo de function-calling estándar, sin relación con el hook.
3. El LLM redacta la respuesta final combinando: contexto inyectado + resultado de la tool (si la usó) + su propio conocimiento.

CONCEPTO: **RAG es "pre-turno" (edita qué ve el LLM antes de pensar); tools son "durante-turno" (el LLM decide invocarlas mientras genera)**. No comparten código ni se pisan — por eso combinarlos es solo unir las dos piezas en el mismo `Agent`/`AgentOptions`, sin lógica nueva.
FUENTE: mismo hook (`onUserTurnCompleted`, docs.livekit.io/agents/build/external-data/) y mismo mecanismo de tools (docs.livekit.io/agents/build/tools/) ya verificados en Hito 6/7 — no cambia nada al combinarlos.

### Qué SÍ hay que decidir: cuándo usa RAG vs cuándo usa tool
No es automático que el LLM "sepa" cuál capacidad corresponde a cada pregunta — se guía por:
- El contexto del corpus SIEMPRE se inyecta (no es opcional, corre en cada turno) — el LLM lo tiene disponible, lo use o no.
- Las tools se invocan solo si el LLM decide que las necesita, según su `description` (mismo criterio que Hito 6: "úsala cuando...").
- Las `instructions` del agente son las que orientan cuál conviene: en `hito8/agent.ts` dicen explícitamente "respondé usando el contexto del corpus cuando aplique; si la pregunta es sobre info actual/tiempo real, usá las tools" — es prompt engineering, no una API nueva.

## CÓMO IMPLEMENTADO

`livekit/hito8/agent.ts` — unión literal de Hito 6 + Hito 7:
1. Todo el bloque RAG de Hito 7 sin cambios: `embed`/`buildIndex`/`INDEX`/`cosine`/`retrieve`/`RagAgent` (con el `console.log('[RAG] ...')`).
2. Todo el bloque tools de Hito 6 sin cambios: `tavilyClient`, `webSearch`, `getTime`.
3. Único punto de unión: `new RagAgent({ instructions, tools: { webSearch, getTime } })` — `RagAgent` (subclase que ya trae el hook RAG) ahora también recibe `tools` en su constructor, porque hereda el `AgentOptions` completo de `voice.Agent` sin overridearlo.
4. `AgentSession` (STT/LLM/TTS) igual que siempre; línea de swap a `google.LLM` comentada, lista para 8.3.

Typecheck OK (mismo chequeo que Hitos 6/7: `tsc --ignoreConfig --noEmit --target ES2022 --module ES2022 --moduleResolution Bundler --strict`).

## LA TAREA (tasks 8.2–8.3) + CHECKPOINTS

- **8.2** Turno único que combina RAG y tools. ✅ Checkpoint: hacé una pregunta hablada que necesite AMBOS a la vez
  (ej. "según el corpus qué es RAG, y de paso decime qué hora es") → el agente responde citando el corpus Y
  ejecutando `getTime`/`webSearch` en la misma respuesta de audio; verificá en logs `[RAG] query=...` Y que
  la tool corrió (log de Tavily o el resultado de `getTime` en la transcripción).
- **8.3** Misma combinación con ambos providers de LLM (swap de la línea `llm` a `google.LLM`, igual que Hitos 5/6/7).

Criterio de cierre (spec `livekit-rag-with-tools`): 1. turno único combina contexto recuperado + tool invocada en
una sola respuesta · 2. combinación funciona igual cambiando solo el provider del LLM.

## RECORDATORIO DE ROL (mentor)
Bajo frase de escape entregué 8.2/8.3 directo (código completo). **Vos hacés el checkpoint en vivo** (correr los
3 procesos, la pregunta combinada por voz, y la corrida con Gemini). Reviso y cierro en 8.4.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor (teoría) | 8.1 | ✅ (esta doc) |
| turno único RAG+tools | 8.2 | ✅ implementado (mentor, frase de escape) — `livekit/hito8/agent.ts`; checkpoint browser confirmado por usuario (pregunta combinada resuelta en 1 respuesta) |
| dual-provider (solo cambia LLM) | 8.3 | ✅ confirmado por usuario con `google.LLM` en vivo |
| review final vs `livekit-rag-with-tools` | 8.4 | ✅ cerrado — 2/2 requisitos OK |

**Fase B (Agents Pipeline) completa.** Hito 7 y 8 cerrados. Arranca Fase C (Realtime, H9) — el núcleo real de tu migración desde Gemini Live nativo.
