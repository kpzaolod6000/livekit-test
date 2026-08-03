## Purpose

Combinación de RAG y Tools dentro de una misma sesión de Gemini Live API (Hito 8, cierre del plan de estudios).

## Requirements

### Requirement: RAG y tools combinados dentro de sesión Live
El ejercicio del Hito 8 SHALL permitir que, dentro de una misma sesión de Gemini Live API, el modelo use contexto recuperado vía RAG y además pueda invocar tools declaradas, según lo requiera el turno de conversación.

#### Scenario: Turno que requiere contexto y tool en vivo
- **WHEN** la pregunta del usuario dentro de la sesión Live requiere tanto contexto del corpus indexado como una acción externa vía tool
- **THEN** el sistema inyecta el contexto recuperado y permite la invocación de la tool necesaria, todo dentro del mismo turno, sin cerrar la conexión WebSocket

### Requirement: Streaming bidireccional se preserva en el escenario combinado
La combinación de RAG y tools dentro de la sesión Live SHALL preservar el comportamiento de streaming bidireccional de la Live API en todo momento.

#### Scenario: Respuesta final tras resolver contexto y tool
- **WHEN** tanto el contexto RAG como el resultado de la tool ya fueron incorporados al turno
- **THEN** el modelo transmite su respuesta final en streaming sobre la misma conexión WebSocket, sin reconexión
