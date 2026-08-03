## 0. Setup previo

- [x] 0.1 Confirmar API keys de OpenAI y Gemini disponibles en `.env` (ya deberían existir de los changes anteriores)
- [x] 0.2 `npm install ai @ai-sdk/openai @ai-sdk/google zod`
- [x] 0.3 Confirmar cuota/créditos disponibles en ambas cuentas (ya usadas recientemente en los changes anteriores, sin problemas)

## 1. Hito 1 — Chat streaming + instrucciones del sistema (ambos providers)

- [x] 1.1 Mentor entrega TEORÍA + CÓMO IMPLEMENTARLO + LA TAREA para Hito 1
- [x] 1.2 Usuario implementa loop interactivo con `streamText` + `system`
- [x] 1.3 Usuario ejecuta el mismo código contra `openai(...)` y `google(...)`, comparando resultado
- [x] 1.4 Usuario implementa continuidad conversacional entre turnos
- [x] 1.5 Mentor revisa entrega contra `vercel-ai-streaming-fundamentals` y confirma cierre de hito

## 2. Hito 2 — Streaming + Tools (function calling)

- [x] 2.1 Mentor entrega contenido de Hito 2 (solo tras cerrar Hito 1)
- [x] 2.2 Usuario declara al menos 2 tools con `tool()` + `execute`
- [x] 2.3 Usuario confirma que el mismo set de tools funciona con ambos providers
- [x] 2.4 Mentor revisa entrega contra `vercel-ai-function-calling` y confirma cierre de hito

## 3. Hito 3 — Streaming + RAG

- [x] 3.1 Mentor y usuario deciden corpus (reusar el de changes anteriores o uno nuevo) + confirman un único provider de embeddings para consistencia
- [x] 3.2 Mentor entrega contenido de Hito 3 (solo tras cerrar Hito 2)
- [x] 3.3 Usuario implementa indexación (`embedMany`) y recuperación (`cosineSimilarity` nativo)
- [x] 3.4 Usuario confirma RAG funciona igual cambiando solo el provider del modelo de chat
- [x] 3.5 Mentor revisa entrega contra `vercel-ai-rag` y confirma cierre de hito

## 4. Hito 4 — Streaming + RAG + Tools combinados

- [x] 4.1 Mentor entrega contenido de Hito 4 (solo tras cerrar Hito 3)
- [x] 4.2 Usuario implementa turno único que combina RAG y tools
- [x] 4.3 Usuario confirma combinación funciona con ambos providers
- [x] 4.4 Mentor revisa entrega contra `vercel-ai-rag-with-tools` y confirma cierre de hito

## 5. Hito 5 — Realtime: sesión bidireccional simple (React + servidor de tokens)

- [x] 5.1 Mentor y usuario deciden framework de frontend (Vite+React, Next.js, u otro liviano)
- [x] 5.2 Mentor verifica con conexión de prueba real que `experimental_useRealtime` + `getToken` funcionan con ambos providers antes de entregar contenido
- [x] 5.3 Mentor entrega contenido de Hito 5 (solo tras cerrar Hito 4)
- [x] 5.4 Usuario implementa endpoint de servidor con `experimental_realtime.getToken()`
- [x] 5.5 Usuario implementa componente React con `experimental_useRealtime`
- [x] 5.6 Usuario confirma mismo componente funciona con `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`
- [x] 5.7 Mentor revisa entrega contra `vercel-ai-realtime-streaming` y confirma cierre de hito
- [x] 5.8 Usuario agrega `outputModalities: ['audio']` a la sesión (single-value — `['text','audio']` combinado da 400 en OpenAI), otorga permiso de mic, confirma audio real + texto simultáneo (texto vía transcripción)
- [x] 5.9 Usuario confirma audio+texto funciona con ambos providers (`openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`)

## 6. Hito 6 — Realtime + Tools

- [x] 6.1 Mentor entrega contenido de Hito 6 (solo tras cerrar Hito 5)
- [x] 6.2 Usuario implementa tools con `experimental_getRealtimeToolDefinitions` + `onToolCall`
- [x] 6.3 Mentor revisa entrega contra `vercel-ai-realtime-tools` y confirma cierre de hito
- [x] 6.4 Usuario confirma que las tools siguen funcionando con `outputModalities: ['audio']` activo (no solo texto, texto vía transcripción)

## 7. Hito 7 — Realtime + RAG

- [x] 7.1 Mentor entrega contenido de Hito 7 (solo tras cerrar Hito 6)
- [x] 7.2 Usuario implementa inyección de contexto RAG dentro de sesión Realtime (con audio+texto activo)
- [x] 7.3 Mentor revisa entrega contra `vercel-ai-realtime-rag` y confirma cierre de hito

## 8. Hito 8 — Realtime + RAG + Tools combinados

- [x] 8.1 Mentor entrega contenido de Hito 8 (solo tras cerrar Hito 7)
- [x] 8.2 Usuario implementa turno único con RAG y tools dentro de sesión Realtime (con audio+texto activo)
- [x] 8.3 Mentor revisa entrega contra `vercel-ai-realtime-rag-with-tools` y confirma cierre de hito

## 9. Hito 9 — Transcripción (speech-to-text, OpenAI-only)

- [x] 9.1 Mentor entrega contenido de Hito 9 (solo tras cerrar Hito 8) — aclara la limitación OpenAI-only (Google no soportado en este SDK)
- [x] 9.2 Usuario implementa transcripción de un audio pregrabado con `transcribe()` (`whisper-1` o `gpt-4o-transcribe`)
- [x] 9.3 Mentor revisa entrega contra `vercel-ai-transcription` y confirma cierre de hito
- [x] 9.4 Plan de estudios Vercel AI SDK completo — retro final comparando los 3 SDKs (Gemini nativo, OpenAI nativo, Vercel AI SDK), incluyendo audio real y transcripción
