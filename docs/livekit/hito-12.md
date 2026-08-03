# Hito 12 — Realtime + RAG + Tools combinados (cierre de Fase C)

> Plan `learn-livekit-sdk`, **Fase C (Agents Realtime)** — cierra la fase.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-realtime-rag-with-tools/spec.md`
> Base: `livekit/hito11/agent.ts` (ya combina RAG + tools estructuralmente). El foco acá es el CHECKPOINT, no código nuevo.

## TEORÍA

> Sin concepto nuevo de LiveKit — igual que Hito 8 (su equivalente en Fase B), este hito es **verificar** que
> RAG y tools conviven en el mismo turno, no construir un mecanismo nuevo.

### Por qué `livekit/hito11/agent.ts` YA satisface la combinación, sin tocar una línea
A diferencia de Fase B (donde RAG vía `onUserTurnCompleted` y tools vía function-calling son dos mecanismos que
corren en momentos distintos del ciclo pero AMBOS dinámicos por turno), en Realtime la asimetría es distinta:
- **RAG (canal voz, Hito 11):** contexto **estático** — ya vive en `instructions` desde que el `Agent` se
  construye, una sola vez. No compite por ningún punto de enganche por turno porque no hay un punto de enganche:
  simplemente está ahí, siempre, como parte del system prompt.
- **Tools (Hito 10):** invocación **dinámica** — el modelo decide en cada turno si necesita `webSearch`/`getTime`,
  vía el mecanismo de function-calling verificado en Hito 10 (`autoToolReplyGeneration`, resuelto automáticamente
  por el framework).

Como uno es estático (siempre presente) y el otro dinámico (se dispara solo cuando el modelo lo decide), no hay
ORDEN que resolver ni condición de carrera entre ambos — el modelo simplemente tiene ambas cosas disponibles en
todo momento: el contexto del corpus como parte de lo que ya "sabe", y las tools como acciones que puede tomar.
Por eso `livekit/hito11/agent.ts` ya es, literalmente, el código de este hito.
FUENTE: mismo mecanismo de tools (docs.livekit.io/agents/build/tools/, verificado en Hito 10) + mismo mecanismo
de instrucciones estáticas (verificado en Hito 11) — no cambia nada al combinarlos, igual que Hito 8 en Fase B.

### El canal de texto también combina ambos sin cambios
El handler de texto de Hito 11 ya hace retrieval real por-consulta ANTES de `generateReply` — y como las tools
están declaradas en el mismo `Agent`, el modelo puede invocarlas igual sobre esa respuesta generada por texto.
No hace falta ninguna lógica adicional para que el canal de texto también combine RAG + tools.

## CÓMO IMPLEMENTARLO

**No hay código nuevo.** Copiá `livekit/hito11/agent.ts` a `livekit/hito12/agent.ts` sin modificarlo (o corré
directamente Hito 11 para este checkpoint, si preferís no duplicar carpeta — la spec de este hito no pide un
archivo distinto, pide **verificar** el comportamiento combinado). Si copiás, el único motivo es mantener la
misma convención de carpeta por hito que vienen usando.

## LA TAREA (tasks 12.2–12.3) + CHECKPOINTS

- **12.2** Turno único combinando RAG y tools, por voz. ✅ Checkpoint: pregunta hablada que necesite AMBOS a la
  vez (ej. "según el corpus qué es RAG, y de paso decime qué hora es") → la respuesta hablada incorpora el
  contexto del corpus (desde `instructions`) Y el resultado de una tool (`getTime`/`webSearch`), sin que la
  sesión se corte ni se reinicie entre ambas.
- **12.3** Misma combinación con ambos providers Realtime. ✅ Checkpoint: swap del `llm` a Gemini (mismo
  patrón de Hitos 9-11), repetís la pregunta combinada, mismo resultado.

Criterio de cierre (spec `livekit-realtime-rag-with-tools`): 1. turno único combina contexto recuperado +
tool invocada en una sola respuesta hablada, sin cerrar/reiniciar conexión · 2. combinación funciona igual con
ambos providers Realtime. **Cierra Fase C.**

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos hacés el checkpoint (12.2/12.3)** — no hay código nuevo que
implementar, así que no aplica frase de escape para "escribir código": lo que falta es correr el checkpoint en
vivo. Reviso y cierro en 12.4.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor (teoría — por qué no hace falta código nuevo) | 12.1 | ✅ (esta doc) |
| turno único RAG+tools por voz | 12.2 | ✅ confirmado por usuario |
| dual-provider Realtime combinado | 12.3 | ✅ confirmado por usuario (swap a Gemini) |
| review final vs `livekit-realtime-rag-with-tools` | 12.4 | ✅ cerrado — 2/2 requisitos OK |

**Fase C (Agents Realtime) completa.** Arranca Fase D — Hito 13 (chat UI, app objetivo).
