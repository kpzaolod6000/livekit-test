## Why

El usuario ya completó el plan de mentoría de 8 hitos con el SDK de Gemini (`@google/genai`, ver `openspec/changes/archive/2026-07-21-learn-gemini-genai-sdk/`). Ahora quiere repetir el mismo recorrido pedagógico progresivo, pero con el SDK oficial de **OpenAI**, para comparar arquitecturas y consolidar los mismos conceptos (streaming, tools, RAG, tiempo real) en un segundo proveedor.

## What Changes

- Se define el mismo **plan de estudios de 8 hitos correlativos**, mapeado a la arquitectura de OpenAI: streaming simple → tools/function calling → RAG → RAG+tools, repetido sobre la Chat Completions API y luego sobre la **Realtime API** (WebSocket, equivalente a Gemini Live).
- Se reutiliza el **comportamiento del mentor** ya definido (`mentor-interaction-rules`, capability existente y compartida entre ambos SDKs — no se duplica): estructura TEORÍA/CÓMO IMPLEMENTARLO/LA TAREA, un hito a la vez, avance solo tras revisión.
- Se fija una **regla de codificación** específica de este SDK: usar el paquete oficial `openai` (npm) con la **Chat Completions API** (`client.chat.completions.create` con `stream: true`) como estándar para todos los ejercicios — elegida sobre Responses API porque el usuario trabaja sobre un proyecto antiguo ya construido con Chat Completions.

## Capabilities

### New Capabilities
- `openai-streaming-fundamentals`: Hito 1 — chat simple en streaming con instrucciones del sistema usando la Chat Completions API.
- `openai-function-calling`: Hito 2 — chat en streaming con al menos 2 tools (function calling).
- `openai-rag`: Hito 3 — chat en streaming con arquitectura RAG.
- `openai-rag-with-tools`: Hito 4 — combinación de RAG + tools en streaming.
- `openai-realtime-streaming`: Hito 5 — OpenAI Realtime API, chat bidireccional simple por WebSocket (equivalente a Gemini Live).
- `openai-realtime-tools`: Hito 6 — Realtime API con tools.
- `openai-realtime-rag`: Hito 7 — Realtime API con arquitectura RAG.
- `openai-realtime-rag-with-tools`: Hito 8 — Realtime API combinando RAG + tools.

### Modified Capabilities
(ninguna — `mentor-interaction-rules` ya existe en `openspec/specs/` del change anterior y se reutiliza sin cambios; no requiere delta spec porque su comportamiento no cambia de proveedor)

## Impact

- **Código**: ejercicios de aprendizaje en TypeScript/JavaScript moderno, escritos por el usuario (no por el mentor), en el mismo repo.
- **Dependencias**: `openai` (SDK oficial de npm). Se usa exclusivamente la Chat Completions API para todo el curso (Hitos 1-4); Realtime API para Hitos 5-8.
- **Alcance de esta spec**: gobierna el contenido técnico de los 8 hitos para OpenAI; el comportamiento del mentor (tono, estructura, disciplina de avance) sigue regido por la capability `mentor-interaction-rules` ya existente, sin duplicarla.
