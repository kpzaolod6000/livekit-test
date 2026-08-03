## Purpose

Function calling (Tools) en chat de streaming con `@google/genai`: declaración de tools, ejecución real y retorno del resultado al modelo (Hito 2 del plan de estudios).

## Requirements

### Requirement: Al menos dos tools declaradas
El ejercicio del Hito 2 SHALL declarar al menos 2 herramientas (function declarations) disponibles para el modelo durante una sesión de chat en streaming.

#### Scenario: Modelo decide invocar una tool
- **WHEN** el modelo determina que necesita datos o acción externa para responder
- **THEN** el modelo emite una function call que la aplicación detecta y ejecuta contra la implementación real de esa tool

### Requirement: Resultado de tool retorna al modelo
La aplicación SHALL enviar el resultado de la ejecución de la tool de vuelta al modelo dentro de la misma sesión, para que el modelo continúe generando la respuesta final.

#### Scenario: Tool ejecutada y resultado devuelto
- **WHEN** la aplicación ejecuta la function call y obtiene un resultado
- **THEN** el resultado se envía de vuelta al modelo como parte de la conversación, y el modelo continúa el streaming de su respuesta final usando ese resultado

### Requirement: Streaming se preserva con tool calling
El flujo de tool calling SHALL mantener el uso de streaming tanto antes como después de la interrupción por function call.

#### Scenario: Respuesta final tras resolver tool call
- **WHEN** el resultado de la tool ya fue devuelto al modelo
- **THEN** el modelo continúa transmitiendo su respuesta final en streaming, no como respuesta completa de un solo bloque
