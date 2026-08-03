## 0. Setup previo

- [x] 0.1 Confirmar API key de OpenAI disponible (`OPENAI_API_KEY` en `.env`)
- [x] 0.2 `npm install openai` en el proyecto del estudiante
- [x] 0.3 Confirmar que `.env` sigue en `.gitignore` (misma key nueva, mismo riesgo)

## 1. Hito 1 — Chat streaming + instrucciones del sistema (Chat Completions API)

- [x] 1.1 Mentor entrega TEORÍA + CÓMO IMPLEMENTARLO + LA TAREA para Hito 1
- [x] 1.2 Usuario implementa loop interactivo con `client.chat.completions.create` + `stream: true` + mensaje `role: 'system'`
- [x] 1.3 Usuario implementa continuidad conversacional acumulando el array `messages` manualmente (sin estado en servidor)
- [x] 1.4 Mentor revisa entrega contra `openai-streaming-fundamentals` y confirma cierre de hito

## 2. Hito 2 — Streaming + Tools (function calling)

- [x] 2.1 Mentor entrega contenido de Hito 2 (solo tras cerrar Hito 1)
- [x] 2.2 Usuario declara al menos 2 tools (`type: 'function'`)
- [x] 2.3 Usuario implementa ejecución de function call y retorno vía mensaje `role: 'tool'`
- [x] 2.4 Mentor revisa entrega contra `openai-function-calling` y confirma cierre de hito

## 3. Hito 3 — Streaming + RAG

- [x] 3.1 Mentor y usuario deciden corpus (reusar el de Gemini o uno nuevo) + confirman uso de `client.embeddings.create` — decidido: reusar carpeta `corpus/` de Gemini
- [x] 3.2 Mentor entrega contenido de Hito 3 (solo tras cerrar Hito 2)
- [x] 3.3 Usuario implementa recuperación de contexto previa al mensaje al modelo
- [x] 3.4 Mentor revisa entrega contra `openai-rag` y confirma cierre de hito

## 4. Hito 4 — Streaming + RAG + Tools combinados

- [x] 4.1 Mentor entrega contenido de Hito 4 (solo tras cerrar Hito 3)
- [x] 4.2 Usuario implementa turno único que combina recuperación RAG y function calling
- [x] 4.3 Mentor revisa entrega contra `openai-rag-with-tools` y confirma cierre de hito

## 5. Hito 5 — Realtime API: streaming bidireccional simple

- [x] 5.1 Mentor verifica modalidades soportadas por el modelo Realtime elegido (texto vs audio-only) antes de entregar contenido — confirmado: `gpt-realtime-mini` soporta `output_modalities: ['text']` directo
- [x] 5.2 Mentor entrega contenido de Hito 5 (solo tras cerrar Hito 4)
- [x] 5.3 Usuario implementa sesión WebSocket bidireccional con Realtime API
- [x] 5.4 Usuario implementa intercambio de múltiples turnos sin reconectar
- [x] 5.5 Mentor revisa entrega contra `openai-realtime-streaming` y confirma cierre de hito

## 6. Hito 6 — Realtime API + Tools

- [x] 6.1 Mentor entrega contenido de Hito 6 (solo tras cerrar Hito 5)
- [x] 6.2 Usuario implementa tools disponibles dentro de sesión Realtime
- [x] 6.3 Mentor revisa entrega contra `openai-realtime-tools` y confirma cierre de hito

## 7. Hito 7 — Realtime API + RAG

- [x] 7.1 Mentor entrega contenido de Hito 7 (solo tras cerrar Hito 6)
- [x] 7.2 Usuario implementa inyección de contexto RAG dentro de sesión Realtime
- [x] 7.3 Mentor revisa entrega contra `openai-realtime-rag` y confirma cierre de hito

## 8. Hito 8 — Realtime API + RAG + Tools combinados

- [x] 8.1 Mentor entrega contenido de Hito 8 (solo tras cerrar Hito 7)
- [x] 8.2 Usuario implementa turno único con RAG y tools dentro de sesión Realtime
- [x] 8.3 Mentor revisa entrega contra `openai-realtime-rag-with-tools` y confirma cierre de hito
- [x] 8.4 Plan de estudios OpenAI completo — retro final comparando con la experiencia de Gemini
