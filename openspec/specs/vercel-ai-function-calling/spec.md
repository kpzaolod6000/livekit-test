## Purpose

Function calling con el Vercel AI SDK: declaración de tools con el helper `tool()` y ejecución automática vía `streamText`/`generateText`, preservando streaming y funcionando igual en ambos providers seleccionados por argumento de terminal (Hito 2).

## Requirements

### Requirement: Al menos dos tools con ejecución automática
El ejercicio del Hito 2 SHALL declarar al menos 2 tools usando el helper `tool()` con función `execute`, pasadas a `streamText`/`generateText` vía el parámetro `tools`.

#### Scenario: Modelo invoca una tool
- **WHEN** el modelo determina que necesita datos o acción externa para responder
- **THEN** el SDK ejecuta automáticamente la función `execute` de la tool correspondiente y reenvía el resultado al modelo, sin que la aplicación reconstruya manualmente argumentos fragmentados de un stream

#### Scenario: Streaming se preserva con tool calling
- **WHEN** el resultado de la tool ya fue procesado por el SDK
- **THEN** la respuesta final del modelo se sigue transmitiendo en streaming

### Requirement: Mismo set de tools funciona en ambos providers, seleccionado por argumento de terminal
El ejercicio del Hito 2 SHALL ejecutar el mismo código y las mismas declaraciones de `tool()` contra `openai(...)` y `google(...)`, seleccionando el provider vía argumento de línea de comandos, sin edición manual del código entre corridas.

#### Scenario: Tool invocada con ambos providers vía argumento de terminal
- **WHEN** se ejecuta la misma pregunta que dispara una tool, primero con el argumento `openai` y luego con el argumento `gemini`
- **THEN** ambos providers invocan la misma tool declarada y el resultado se resuelve mediante el mismo mecanismo del SDK, sin cambios de código entre corridas
