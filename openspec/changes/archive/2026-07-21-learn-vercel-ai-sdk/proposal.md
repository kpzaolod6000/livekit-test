## Why

El usuario completó los planes de mentoría de 8 hitos con los SDKs nativos de Gemini (`@google/genai`) y OpenAI (`openai`) — ver `openspec/changes/archive/`. Ahora quiere aprender **Vercel AI SDK**, la capa de abstracción que unifica múltiples providers bajo una misma interfaz, usando específicamente Gemini y OpenAI como los dos providers a comparar lado a lado.

## What Changes

- Se define un **plan de estudios de 9 hitos correlativos**, mapeado a Vercel AI SDK: streaming simple → tools/function calling → RAG → RAG+tools (`ai` core, Hitos 1-4), luego los mismos 4 conceptos sobre **Realtime** (Hitos 5-8) — la capa experimental de WebSocket bidireccional del SDK, ahora con **audio real simultáneo con texto** (no solo texto) — y finalmente un Hito 9 de **transcripción** (speech-to-text).
- Cada hito SHALL ejecutarse con **ambos providers usando el mismo código**, cambiando únicamente la referencia del modelo (`openai(...)` vs `google(...)`) — esto es explícitamente el punto pedagógico central: demostrar la abstracción multi-provider del SDK.
- Se reutiliza el **comportamiento del mentor** ya definido (`mentor-interaction-rules`, capability existente, sin cambios).
- Se fija una **regla de codificación**: paquetes oficiales `ai` (core), `@ai-sdk/openai`, `@ai-sdk/google`. Hitos 5-8 usan la API `experimental_*` de Realtime (`experimental_useRealtime`, `experimental_realtime.getToken`), lo cual introduce una **arquitectura distinta**: un frontend React/navegador + endpoint de servidor para tokens efímeros — a diferencia de los planes anteriores, que fueron 100% Node CLI.

## Capabilities

### New Capabilities
- `vercel-ai-streaming-fundamentals`: Hito 1 — chat simple en streaming con `streamText`, instrucciones del sistema, mismo código corrido contra Gemini y OpenAI.
- `vercel-ai-function-calling`: Hito 2 — tools con `tool()` + `execute` (ejecución automática del SDK), al menos 2 tools, ambos providers.
- `vercel-ai-rag`: Hito 3 — RAG con `embed`/`embedMany` + `cosineSimilarity` (helper nativo del SDK), ambos providers.
- `vercel-ai-rag-with-tools`: Hito 4 — combinación de RAG + tools, ambos providers.
- `vercel-ai-realtime-streaming`: Hito 5 — sesión Realtime simple (WebSocket vía `experimental_useRealtime`), comparando `openai('gpt-realtime')` vs `google('gemini-3.1-flash-live-preview')`.
- `vercel-ai-realtime-tools`: Hito 6 — Realtime con tools (`experimental_getRealtimeToolDefinitions`, `onToolCall`, `addToolOutput`).
- `vercel-ai-realtime-rag`: Hito 7 — Realtime con contexto RAG inyectado.
- `vercel-ai-realtime-rag-with-tools`: Hito 8 — Realtime combinando RAG + tools.
- `vercel-ai-transcription`: Hito 9 — speech-to-text con `transcribe()`, **OpenAI-only** (Google no soportado en este SDK) — única excepción al patrón de comparación dual-provider del plan.

### Modified Capabilities
- `mentor-interaction-rules`: se agrega una excepción explícita — el mentor SHALL implementar código directamente cuando el usuario invoque la frase literal "necesito que lo implementes tu", como válvula de escape para casos de apuro genuino, sin que esto cambie el comportamiento por defecto del resto de la sesión.

## Impact

- **Código**: Hitos 1-4 y 9 siguen siendo Node CLI (TypeScript). Hitos 5-8 requieren un mini frontend (React, ej. Next.js o Vite+React) más un endpoint de servidor — cambio de arquitectura respecto a los planes previos, necesario porque la API Realtime del SDK es experimental y orientada a navegador (captura de mic real, parlante real, hook de React).
- **Dependencias**: `ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `zod` (schemas de tools). Para Hitos 5-8: framework de frontend (a decidir en design.md) + `@ai-sdk/react` si aplica.
- **Alcance**: gobierna el contenido técnico de los 9 hitos de este SDK; el comportamiento del mentor sigue regido por `mentor-interaction-rules` ya existente. Hito 9 es OpenAI-only por limitación real del SDK (documentado en design.md).
