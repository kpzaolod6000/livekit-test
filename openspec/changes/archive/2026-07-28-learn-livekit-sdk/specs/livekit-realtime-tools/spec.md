## ADDED Requirements

### Requirement: Tools disponibles dentro de la sesión Realtime
El ejercicio del Hito 10 SHALL exponer tools al `AgentSession` Realtime, manejando su invocación mediante el mecanismo de function calling del framework `@livekit/agents` para modelos realtime.

#### Scenario: Modelo invoca tool durante sesión Realtime
- **WHEN** el modelo determina que necesita una acción o dato externo durante la conversación de voz en vivo
- **THEN** la tool se invoca, su resultado se resuelve dentro de la misma sesión, y la conversación continúa en voz sin cerrar la conexión

### Requirement: Mismo set de tools funciona con ambos providers Realtime
El ejercicio del Hito 10 SHALL usar las mismas tools contra ambos providers Realtime (OpenAI y Gemini Live).

#### Scenario: Tool invocada con ambos providers Realtime
- **WHEN** se prueba la misma tool con el agente Realtime configurado en OpenAI y luego en Gemini
- **THEN** ambos providers invocan la tool declarada y continúan la conversación de voz incorporando su resultado
