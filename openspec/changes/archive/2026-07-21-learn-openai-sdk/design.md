## Context

Segunda vuelta del mismo plan de mentoría, esta vez con el SDK oficial de OpenAI (`openai` npm package). El usuario ya completó el recorrido equivalente con Gemini (`openspec/changes/archive/2026-07-21-learn-gemini-genai-sdk/`) — este change reutiliza esa experiencia como base comparativa, no repite la definición de comportamiento del mentor (capability `mentor-interaction-rules`, ya existente en `openspec/specs/`, se aplica sin cambios).

## Goals / Non-Goals

**Goals:**
- Mapear 1:1 los 8 hitos ya validados con Gemini a la arquitectura de OpenAI: Chat Completions API para Hitos 1-4, Realtime API (WebSocket) para Hitos 5-8.
- Usar Chat Completions API como estándar de este curso — el usuario trabaja sobre un proyecto antiguo ya construido con esta API, así que el aprendizaje debe ser directamente aplicable a ese contexto.
- Permitir comparación directa de arquitecturas entre proveedores (mismo corpus, mismo tipo de tools si aplica).

**Non-Goals:**
- No se redefine el comportamiento del mentor — ya está capturado en `mentor-interaction-rules` y aplica igual aquí.
- No se elige aquí implementación de audio/voz de la Realtime API — el foco es texto, igual que se hizo con Gemini Live (transcripción de texto, no reproducción de audio).
- No se define infraestructura de producción — sigue siendo aprendizaje local.

## Decisions

**1. Chat Completions API sobre Responses API.**
A diferencia del caso Gemini (donde `@google/generative-ai` estaba genuinamente deprecado), aquí ambas APIs de OpenAI siguen soportadas — la elección no es "cuál es más nueva" sino "cuál es útil para el usuario". Se elige Chat Completions porque el usuario ya tiene un proyecto antiguo construido sobre ella; aprender Responses API no transferiría directamente a ese contexto. Implica manejar el historial de conversación manualmente (array `messages`, sin estado de conversación gestionado por el servidor como `previous_response_id`).

**2. Realtime API como equivalente de Gemini Live.**
Mismo concepto (WebSocket bidireccional), arquitectura de eventos análoga. Se mantiene el mismo mapeo de hitos 5-8 que ya se usó con Gemini, para maximizar la comparación directa entre proveedores.

**3. No se duplica `mentor-interaction-rules`.**
El comportamiento del mentor (estructura de respuesta, un hito a la vez, avance condicionado a revisión) no depende del SDK — es la misma capability reusada del change anterior. Solo se crean capabilities nuevas para el contenido técnico específico de OpenAI.

**4. Corpus RAG: reusar el mismo corpus de texto que en Gemini, si el usuario quiere comparar resultados de retrieval entre proveedores; si no, definir uno nuevo al llegar al Hito 3 — decisión pendiente, igual que se hizo con Gemini (tarea 3.1 equivalente).**

## Risks / Trade-offs

- **[Riesgo] Documentación y ejemplos más recientes de OpenAI suelen mostrar Responses API primero; el usuario puede confundirse si busca ejemplos online.** → Mitigación: mentor debe ser explícito en cada hito sobre que el curso usa Chat Completions deliberadamente, y señalar cuando un ejemplo encontrado online use la API nueva (Responses) para que el usuario no la copie por error.
- **[Riesgo] Realtime API de OpenAI, como toda API de tiempo real, puede tener particularidades de modalidad (audio vs texto) similares a las encontradas con Gemini Live (`gemini-3.1-flash-live-preview` resultó ser audio-only).** → Mitigación: verificar con una llamada de prueba real qué modalidades soporta el modelo Realtime elegido antes de entregar el contenido teórico del Hito 5, igual que se hizo con Gemini.
- **[Trade-off] Tool calling en Realtime API puede tener un formato de evento distinto al de Responses API (nombres de campos, IDs).** → Aceptado: se verifica y ajusta en el momento de implementar cada hito, como ya se hizo con Gemini (`call.id` en Live vs solo `name` en streaming HTTP).

## Open Questions

- ¿Reusar el mismo corpus `.txt` de Gemini para RAG, o preparar uno nuevo?
- ¿El usuario ya tiene una API key de OpenAI activa, o se resuelve como paso previo al Hito 1?
