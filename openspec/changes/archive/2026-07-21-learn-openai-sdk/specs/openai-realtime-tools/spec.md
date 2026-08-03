## ADDED Requirements

### Requirement: Tools disponibles dentro de sesión Realtime
El ejercicio del Hito 6 SHALL declarar tools (`function`) disponibles para el modelo dentro de una sesión activa de la OpenAI Realtime API.

#### Scenario: Modelo invoca tool durante sesión Realtime
- **WHEN** el modelo determina que necesita una acción o dato externo durante la sesión Realtime
- **THEN** la sesión recibe el evento de function call, la aplicación lo ejecuta, y el resultado se envía de vuelta al modelo dentro de la misma conexión WebSocket

### Requirement: Continuidad de streaming tras tool call en Realtime
La sesión Realtime SHALL continuar transmitiendo la respuesta del modelo en streaming después de resolver una function call, sin cerrar ni reabrir la conexión.

#### Scenario: Respuesta final tras tool resuelta en vivo
- **WHEN** el resultado de la tool ya fue devuelto al modelo dentro de la sesión Realtime
- **THEN** el modelo continúa la respuesta en streaming sobre la misma conexión WebSocket
