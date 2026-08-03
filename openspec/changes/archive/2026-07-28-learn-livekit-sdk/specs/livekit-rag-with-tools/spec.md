## ADDED Requirements

### Requirement: RAG y tools combinados en un mismo turno de voz
El ejercicio del Hito 8 SHALL soportar un turno hablado que combine recuperación de contexto (RAG) e invocación de tools dentro del mismo `AgentSession`, sin requerir turnos separados para cada capacidad.

#### Scenario: Pregunta hablada que requiere contexto y una tool
- **WHEN** el usuario habla una pregunta que necesita tanto contexto recuperado del corpus como el resultado de una tool
- **THEN** el agente recupera el contexto relevante, invoca la tool necesaria, y genera una única respuesta de audio que incorpora ambos

### Requirement: Combinación funciona con ambos providers de LLM
El ejercicio del Hito 8 SHALL confirmar que la combinación de RAG y tools funciona ejecutando el mismo pipeline contra el LLM de OpenAI y el de Gemini.

#### Scenario: Mismo turno combinado, distinto provider de LLM
- **WHEN** se ejecuta el turno combinado con el pipeline configurado en OpenAI y luego en Gemini como LLM
- **THEN** ambos providers resuelven la combinación de contexto recuperado y tool invocada en la respuesta de audio final
