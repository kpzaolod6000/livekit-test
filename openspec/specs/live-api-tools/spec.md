## Purpose

Function calling (Tools) dentro de una sesión activa de Gemini Live API (Hito 6 del plan de estudios).

## Requirements

### Requirement: Tools disponibles dentro de sesión Live
El ejercicio del Hito 6 SHALL declarar tools (function declarations) disponibles para el modelo dentro de una sesión activa de Gemini Live API.

#### Scenario: Modelo invoca tool durante sesión Live
- **WHEN** el modelo determina que necesita una acción o dato externo durante la sesión Live
- **THEN** la sesión recibe la function call, la aplicación la ejecuta, y el resultado se envía de vuelta al modelo dentro de la misma conexión WebSocket

### Requirement: Continuidad de streaming tras tool call en Live
La sesión Live SHALL continuar transmitiendo la respuesta del modelo en streaming después de resolver una function call, sin cerrar ni reabrir la conexión.

#### Scenario: Respuesta final tras tool resuelta en vivo
- **WHEN** el resultado de la tool ya fue devuelto al modelo dentro de la sesión Live
- **THEN** el modelo continúa la respuesta en streaming sobre la misma conexión WebSocket
