## 0. Setup previo

- [x] 0.1 Confirmar API key de Gemini disponible (`GEMINI_API_KEY` en `.env`)
- [x] 0.2 `npm init -y` + `npm install @google/genai` en el proyecto del estudiante
- [x] 0.3 Confirmar setup de TypeScript/tsx o build moderno para correr los ejercicios

## 1. Hito 1 — Chat streaming + system instructions

- [x] 1.1 Mentor entrega TEORÍA + CÓMO IMPLEMENTARLO + LA TAREA para Hito 1
- [x] 1.2 Usuario implementa loop interactivo con `ai.chats.create` + `sendMessageStream`
- [x] 1.3 Usuario aplica `systemInstruction` con persona propia
- [x] 1.4 Usuario acumula texto completo y cuenta caracteres totales de la sesión
- [x] 1.5 Mentor revisa entrega contra `sdk-streaming-fundamentals` y confirma cierre de hito

## 2. Hito 2 — Streaming + Tools (function calling)

- [x] 2.1 Mentor entrega contenido de Hito 2 (solo tras cerrar Hito 1)
- [x] 2.2 Usuario declara al menos 2 tools (function declarations)
- [x] 2.3 Usuario implementa ejecución de function call y retorno de resultado al modelo
- [x] 2.4 Mentor revisa entrega contra `sdk-function-calling` y confirma cierre de hito

## 3. Hito 3 — Streaming + RAG

- [x] 3.1 Mentor y usuario eligen fuente/estrategia de recuperación (corpus + método de embeddings) — decidido: documentos .txt propios del usuario + `ai.models.embedContent` de Gemini
- [x] 3.2 Mentor entrega contenido de Hito 3 (solo tras cerrar Hito 2)
- [x] 3.3 Usuario implementa recuperación de contexto previa al mensaje al modelo
- [x] 3.4 Mentor revisa entrega contra `sdk-rag` y confirma cierre de hito

## 4. Hito 4 — Streaming + RAG + Tools combinados

- [x] 4.1 Mentor entrega contenido de Hito 4 (solo tras cerrar Hito 3)
- [x] 4.2 Usuario implementa turno único que combina recuperación RAG y function calling
- [x] 4.3 Mentor revisa entrega contra `sdk-rag-with-tools` y confirma cierre de hito

## 5. Hito 5 — Gemini Live API: streaming bidireccional simple

- [x] 5.1 Mentor entrega contenido de Hito 5 (solo tras cerrar Hito 4)
- [x] 5.2 Usuario implementa sesión WebSocket bidireccional con Live API
- [x] 5.3 Usuario implementa intercambio de múltiples turnos sin reconectar
- [x] 5.4 Mentor revisa entrega contra `live-api-streaming` y confirma cierre de hito

## 6. Hito 6 — Gemini Live API + Tools

- [x] 6.1 Mentor entrega contenido de Hito 6 (solo tras cerrar Hito 5)
- [x] 6.2 Usuario implementa tools disponibles dentro de sesión Live
- [x] 6.3 Mentor revisa entrega contra `live-api-tools` y confirma cierre de hito

## 7. Hito 7 — Gemini Live API + RAG

- [x] 7.1 Mentor entrega contenido de Hito 7 (solo tras cerrar Hito 6)
- [x] 7.2 Usuario implementa inyección de contexto RAG dentro de sesión Live
- [x] 7.3 Mentor revisa entrega contra `live-api-rag` y confirma cierre de hito

## 8. Hito 8 — Gemini Live API + RAG + Tools combinados

- [x] 8.1 Mentor entrega contenido de Hito 8 (solo tras cerrar Hito 7)
- [x] 8.2 Usuario implementa turno único con RAG y tools dentro de sesión Live
- [x] 8.3 Mentor revisa entrega contra `live-api-rag-with-tools` y confirma cierre de hito
- [x] 8.4 Plan de estudios completo — retro final con usuario
