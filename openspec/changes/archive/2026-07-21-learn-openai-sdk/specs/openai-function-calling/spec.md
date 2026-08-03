## ADDED Requirements

### Requirement: Al menos dos tools declaradas
El ejercicio del Hito 2 SHALL declarar al menos 2 herramientas (`tools` de tipo `function`) disponibles para el modelo durante una llamada en streaming a Chat Completions API.

#### Scenario: Modelo decide invocar una tool
- **WHEN** el modelo determina que necesita datos o acción externa para responder
- **THEN** el stream acumula un `tool_call` (nombre + argumentos) en los deltas de la respuesta, que la aplicación reconstruye y ejecuta contra la implementación real de esa tool

### Requirement: Resultado de tool retorna al modelo
La aplicación SHALL agregar el resultado de la ejecución de la tool al array `messages` como un mensaje con `role: 'tool'` y el `tool_call_id` correspondiente, y SHALL reenviar el array completo al modelo para que continúe generando la respuesta final.

#### Scenario: Tool ejecutada y resultado devuelto
- **WHEN** la aplicación ejecuta la function call y obtiene un resultado
- **THEN** el resultado se agrega como mensaje `role: 'tool'` referenciando el mismo `tool_call_id`, y una nueva llamada a `chat.completions.create` (con el historial actualizado) genera la respuesta final en streaming

### Requirement: Streaming se preserva con tool calling
El flujo de tool calling SHALL mantener el uso de streaming tanto en la llamada que solicita la tool como en la llamada de seguimiento que produce la respuesta final.

#### Scenario: Respuesta final tras resolver tool call
- **WHEN** el resultado de la tool ya fue agregado al historial de mensajes
- **THEN** la siguiente llamada al modelo transmite su respuesta final en streaming, no como respuesta completa de un solo bloque
