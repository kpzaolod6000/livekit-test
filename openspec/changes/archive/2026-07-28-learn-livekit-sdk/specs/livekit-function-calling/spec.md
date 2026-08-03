## ADDED Requirements

### Requirement: Tools declaradas en el agente de voz
El ejercicio del Hito 6 SHALL declarar al menos 2 tools ejecutables por el `AgentSession` del pipeline STT-LLM-TTS, siguiendo el mecanismo de function calling del framework `@livekit/agents`.

#### Scenario: Usuario pide una acción que requiere una tool
- **WHEN** el usuario habla pidiendo información o una acción cubierta por una de las tools declaradas
- **THEN** el LLM invoca la tool correspondiente, su resultado se incorpora a la respuesta, y esta se sintetiza como audio (TTS) hacia el usuario

### Requirement: Mismo set de tools funciona con ambos providers de LLM
El ejercicio del Hito 6 SHALL usar el mismo set de tools contra el LLM de OpenAI y el de Gemini, sin cambios en la declaración de las tools.

#### Scenario: Tool invocada con ambos providers de LLM
- **WHEN** se prueba la misma tool con el pipeline configurado en OpenAI y luego en Gemini como LLM
- **THEN** ambos providers invocan la tool declarada y producen una respuesta de audio que incorpora su resultado
