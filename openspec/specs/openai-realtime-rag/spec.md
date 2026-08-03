## Purpose

Arquitectura RAG dentro de una sesión activa de la OpenAI Realtime API (Hito 7 del plan de estudios OpenAI).

## Requirements

### Requirement: Contexto RAG inyectado en sesión Realtime
El ejercicio del Hito 7 SHALL recuperar contexto relevante de un corpus indexado e inyectarlo en el turno de conversación dentro de una sesión activa de la OpenAI Realtime API, antes de que el modelo genere su respuesta.

#### Scenario: Pregunta sobre corpus dentro de sesión Realtime
- **WHEN** el usuario pregunta algo relacionado al corpus indexado mientras la sesión Realtime está abierta
- **THEN** el sistema recupera el contexto relevante y lo inyecta en el turno antes de que el modelo comience a transmitir su respuesta en streaming

### Requirement: Streaming bidireccional se mantiene con RAG
La inyección de contexto RAG SHALL ocurrir sin cerrar ni bloquear la conexión WebSocket de la sesión Realtime.

#### Scenario: Recuperación de contexto no interrumpe la sesión
- **WHEN** el sistema recupera contexto antes de responder
- **THEN** la conexión WebSocket de la sesión Realtime permanece abierta durante y después de la recuperación
