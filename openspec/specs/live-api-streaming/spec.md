## Purpose

Chat simple en streaming bidireccional (WebSocket) usando la Gemini Live API vía `@google/genai` (Hito 5 del plan de estudios).

## Requirements

### Requirement: Sesión bidireccional vía WebSocket
El ejercicio del Hito 5 SHALL establecer una sesión de streaming bidireccional con la Gemini Live API sobre WebSocket, usando el SDK `@google/genai`.

#### Scenario: Apertura de sesión Live
- **WHEN** el cliente inicia una sesión con la Live API
- **THEN** queda establecida una conexión WebSocket bidireccional lista para enviar y recibir contenido en streaming, sin necesidad de HTTP request/response por turno

### Requirement: Intercambio de turnos sin reabrir conexión
La sesión Live SHALL permitir múltiples turnos de conversación dentro de la misma conexión WebSocket, sin cerrarla entre mensajes.

#### Scenario: Segundo turno en la misma sesión Live
- **WHEN** el usuario envía un nuevo mensaje mientras la sesión Live sigue abierta
- **THEN** el modelo responde en streaming usando la misma conexión, sin que la app deba reconectar
