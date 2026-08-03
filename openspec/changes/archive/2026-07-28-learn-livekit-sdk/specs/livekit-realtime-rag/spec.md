## ADDED Requirements

### Requirement: Contexto RAG inyectado en sesión Realtime
El ejercicio del Hito 11 SHALL inyectar contexto recuperado de un corpus dentro de una sesión Realtime activa (ej. como parte de las instrucciones iniciales o de un mensaje de contexto enviado a la sesión), sin requerir un modelo de LLM separado para generar la respuesta hablada.

#### Scenario: Pregunta hablada relacionada al corpus, dentro de sesión Realtime
- **WHEN** el usuario habla una pregunta relacionada al corpus mientras la sesión Realtime está activa
- **THEN** la respuesta hablada del modelo incorpora el contexto recuperado, generada por el propio modelo realtime

### Requirement: RAG en Realtime funciona con ambos providers
El ejercicio del Hito 11 SHALL confirmar que la inyección de contexto RAG funciona en sesión Realtime contra ambos providers (OpenAI y Gemini Live).

#### Scenario: Mismo contexto inyectado, distinto provider Realtime
- **WHEN** se inyecta el mismo contexto recuperado en una sesión Realtime con OpenAI y luego con Gemini
- **THEN** ambas sesiones incorporan ese contexto en su respuesta hablada
