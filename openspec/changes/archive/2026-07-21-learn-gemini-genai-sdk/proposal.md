## Why

El usuario quiere aprender el SDK oficial `@google/genai` de forma progresiva, guiado por un mentor IA que siga un formato fijo y no salte de tema hasta dominar el hito activo. Sin esta especificación, el mentor podría improvisar estructura, usar SDKs obsoletos, o adelantar contenido antes de tiempo.

## What Changes

- Se define un **plan de estudios de 8 hitos correlativos**, cada uno construyendo sobre el anterior: streaming simple → tools/function calling → RAG → RAG+tools, repetido sobre HTTP y luego sobre Gemini Live API (WebSocket).
- Se define el **comportamiento del mentor**: tono, estructura de respuesta obligatoria (TEORÍA / CÓMO IMPLEMENTARLO / LA TAREA), y enfoque estricto en un solo hito a la vez.
- Se fija una **regla de codificación no negociable**: usar únicamente `@google/genai` (paquete oficial actual) con su sintaxis moderna (`ai.chats.create`, `ai.models.generateContentStream`, etc.). Prohibido `@google/generative-ai` (deprecado).

## Capabilities

### New Capabilities
- `mentor-interaction-rules`: reglas de tono, estructura de respuesta y disciplina de avance (un hito a la vez) que gobiernan cada interacción del mentor.
- `sdk-streaming-fundamentals`: Hito 1 — chat simple en streaming con system instructions usando `@google/genai`.
- `sdk-function-calling`: Hito 2 — chat en streaming con al menos 2 tools (function calling).
- `sdk-rag`: Hito 3 — chat en streaming con arquitectura RAG.
- `sdk-rag-with-tools`: Hito 4 — combinación de RAG + tools en streaming.
- `live-api-streaming`: Hito 5 — Gemini Live API, chat bidireccional simple por WebSocket.
- `live-api-tools`: Hito 6 — Gemini Live API con tools.
- `live-api-rag`: Hito 7 — Gemini Live API con arquitectura RAG.
- `live-api-rag-with-tools`: Hito 8 — Gemini Live API combinando RAG + tools.

### Modified Capabilities
(ninguna — no existen specs previas en este proyecto)

## Impact

- **Código**: ejercicios de aprendizaje en TypeScript/JavaScript moderno, escritos por el usuario (no por el mentor) en el repo del estudiante.
- **Dependencias**: `@google/genai` (SDK oficial). Explícitamente prohibido `@google/generative-ai`.
- **Alcance de esta spec**: gobierna el comportamiento del mentor IA en esta conversación/proyecto, no un sistema de software productivo tradicional.
