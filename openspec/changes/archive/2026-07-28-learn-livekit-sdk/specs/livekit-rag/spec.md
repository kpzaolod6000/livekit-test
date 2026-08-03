## ADDED Requirements

### Requirement: Recuperación de contexto inyectada en el agente de voz
El ejercicio del Hito 7 SHALL indexar un corpus (reusando el de planes anteriores o uno nuevo acordado con el usuario) y recuperar los fragmentos más relevantes para la pregunta hablada del usuario, inyectando ese contexto en las instrucciones o el turno del LLM del `AgentSession` antes de generar la respuesta de audio.

#### Scenario: Pregunta hablada relacionada al corpus indexado
- **WHEN** el usuario habla una pregunta relacionada al contenido del corpus
- **THEN** el sistema recupera los fragmentos más relevantes y los incluye como contexto antes de que el LLM genere la respuesta, que luego se sintetiza como audio

### Requirement: RAG funciona igual cambiando el provider de LLM
El ejercicio del Hito 7 SHALL generar la respuesta final usando el mismo contexto recuperado, ejecutando el mismo pipeline contra el LLM de OpenAI y el de Gemini.

#### Scenario: Mismo contexto, distinto provider de LLM
- **WHEN** se genera la respuesta de audio con el pipeline configurado en OpenAI y luego en Gemini como LLM, usando el mismo contexto recuperado
- **THEN** ambas respuestas se apoyan en el mismo contexto, difiriendo solo en el provider del LLM usado para generar el texto antes de la síntesis TTS
