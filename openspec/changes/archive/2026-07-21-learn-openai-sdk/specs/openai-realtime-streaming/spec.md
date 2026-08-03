## ADDED Requirements

### Requirement: Sesión bidireccional vía WebSocket (Realtime API)
El ejercicio del Hito 5 SHALL establecer una sesión de streaming bidireccional con la OpenAI Realtime API sobre WebSocket, usando el SDK oficial `openai`.

#### Scenario: Apertura de sesión Realtime
- **WHEN** el cliente inicia una sesión con la Realtime API
- **THEN** queda establecida una conexión WebSocket bidireccional lista para enviar y recibir contenido en streaming, sin necesidad de HTTP request/response por turno

### Requirement: Intercambio de turnos sin reabrir conexión
La sesión Realtime SHALL permitir múltiples turnos de conversación dentro de la misma conexión WebSocket, sin cerrarla entre mensajes.

#### Scenario: Segundo turno en la misma sesión Realtime
- **WHEN** el usuario envía un nuevo mensaje mientras la sesión Realtime sigue abierta
- **THEN** el modelo responde en streaming usando la misma conexión, sin que la app deba reconectar
