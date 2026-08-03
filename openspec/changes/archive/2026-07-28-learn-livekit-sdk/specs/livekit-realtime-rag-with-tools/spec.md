## ADDED Requirements

### Requirement: RAG y tools combinados dentro de sesión Realtime
El ejercicio del Hito 12 SHALL soportar, dentro de una única sesión Realtime, un turno hablado que combine contexto RAG inyectado e invocación de tools, sin cerrar ni reiniciar la conexión entre ambas capacidades.

#### Scenario: Pregunta hablada que requiere contexto y una tool, en vivo
- **WHEN** el usuario habla una pregunta que necesita tanto contexto recuperado del corpus como el resultado de una tool, durante la sesión Realtime
- **THEN** el agente resuelve ambos dentro de la misma sesión y responde en voz incorporando contexto y resultado de la tool

### Requirement: Combinación funciona con ambos providers Realtime
El ejercicio del Hito 12 SHALL confirmar que la combinación de RAG y tools en sesión Realtime funciona contra ambos providers (OpenAI y Gemini Live).

#### Scenario: Mismo turno combinado, distinto provider Realtime
- **WHEN** se ejecuta el turno combinado con la sesión Realtime configurada en OpenAI y luego en Gemini
- **THEN** ambos providers resuelven la combinación de contexto recuperado y tool invocada en la respuesta hablada final
