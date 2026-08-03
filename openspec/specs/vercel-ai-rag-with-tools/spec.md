## Purpose

Combinación de RAG y tools en un mismo turno de `streamText` con el Vercel AI SDK: el modelo usa contexto recuperado y puede invocar tools declaradas con `tool()`, funcionando igual en ambos providers seleccionados por argumento de terminal (Hito 4).

## Requirements

### Requirement: RAG y tools combinados en un mismo turno
El ejercicio del Hito 4 SHALL permitir que, dentro de un mismo turno de `streamText`, el modelo use contexto recuperado vía RAG y además pueda invocar tools declaradas con `tool()`, según lo requiera la pregunta del usuario.

#### Scenario: Pregunta que requiere contexto y acción externa
- **WHEN** la pregunta del usuario requiere tanto datos del corpus indexado como una acción o dato externo vía tool
- **THEN** el sistema recupera e inyecta el contexto relevante y permite al modelo invocar la tool necesaria, todo dentro del mismo turno, sin requerir que el usuario reinicie la conversación

### Requirement: Combinación funciona igual en ambos providers, seleccionado por argumento de terminal
El ejercicio del Hito 4 SHALL ejecutar el mismo código de RAG+tools contra `openai(...)` y `google(...)`, seleccionando el provider vía argumento de línea de comandos, sin edición manual del código entre corridas.

#### Scenario: Mismo turno combinado, ambos providers vía argumento
- **WHEN** se ejecuta la misma pregunta combinada (RAG + tool) con el argumento `openai` y luego con el argumento `gemini`
- **THEN** ambas ejecuciones resuelven correctamente el contexto RAG y la invocación de la tool, usando el mismo código de la aplicación, sin cambios entre corridas
