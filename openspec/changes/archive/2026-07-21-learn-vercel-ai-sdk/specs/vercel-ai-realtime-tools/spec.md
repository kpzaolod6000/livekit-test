## ADDED Requirements

### Requirement: Tools disponibles dentro de sesión Realtime
El ejercicio del Hito 6 SHALL exponer tools dentro de una sesión Realtime activa usando `experimental_getRealtimeToolDefinitions()` para convertir las tools del SDK al formato Realtime, manejando invocaciones vía el callback `onToolCall` y, cuando el procesamiento sea asíncrono, `addToolOutput()`.

#### Scenario: Modelo invoca tool durante sesión Realtime
- **WHEN** el modelo determina que necesita una acción o dato externo durante la sesión Realtime
- **THEN** el callback `onToolCall` recibe la invocación, la aplicación la ejecuta, y el resultado se resuelve dentro de la misma sesión (directamente o vía `addToolOutput()` si es asíncrono)

### Requirement: Continuidad de la sesión tras tool call
La sesión Realtime SHALL continuar la conversación después de resolver una tool call, sin cerrar ni reabrir la conexión.

#### Scenario: Respuesta final tras tool resuelta en vivo
- **WHEN** el resultado de la tool ya fue devuelto dentro de la sesión Realtime
- **THEN** la sesión continúa respondiendo sobre la misma conexión, sin reconexión

### Requirement: Mismo set de tools funciona con ambos providers Realtime
El ejercicio del Hito 6 SHALL usar las mismas tools contra `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`.

#### Scenario: Tool invocada con ambos providers Realtime
- **WHEN** se prueba la misma tool con ambos providers Realtime
- **THEN** ambos resuelven la invocación mediante el mismo mecanismo (`onToolCall`/`addToolOutput`)

### Requirement: Tools funcionan con salida de texto y audio simultáneos
La sesión Realtime del Hito 6 SHALL mantener `outputModalities: ['audio']` (heredado del Hito 5, ver corrección en `vercel-ai-realtime-streaming`) mientras las tools están activas, sin que la tool call interrumpa o degrade la salida de audio ni la transcripción de texto simultánea.

#### Scenario: Tool call con audio activo
- **WHEN** el modelo invoca una tool mientras la sesión responde en texto y audio
- **THEN** la tool se resuelve normalmente y la respuesta final sigue incluyendo audio real, no solo texto
