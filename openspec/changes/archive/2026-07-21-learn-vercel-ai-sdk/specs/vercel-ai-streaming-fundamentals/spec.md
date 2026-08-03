## ADDED Requirements

### Requirement: Chat en streaming con instrucciones del sistema vía `streamText`
El ejercicio del Hito 1 SHALL usar `streamText` del paquete `ai` con `system` definido antes de cualquier mensaje del usuario, y SHALL consumir la respuesta mediante streaming (`textStream` o equivalente).

#### Scenario: Envío de mensaje
- **WHEN** el usuario envía un mensaje vía `streamText`
- **THEN** la respuesta se recibe como stream de texto iterado de forma asíncrona, no como bloque completo al final

#### Scenario: System aplica a la generación
- **WHEN** se llama `streamText` con `system` definido
- **THEN** la respuesta generada respeta esa instrucción

### Requirement: Mismo código ejecutado contra ambos providers, seleccionado por argumento de terminal
El ejercicio del Hito 1 SHALL leer el provider a usar desde un argumento de línea de comandos (`process.argv`, ej. `npx tsx archivo.ts openai` o `... gemini`), sin requerir edición manual del código para cambiar entre `openai(...)` y `google(...)`.

#### Scenario: Mismo prompt, ambos providers vía argumento de terminal
- **WHEN** se ejecuta el mismo archivo con el argumento `openai` y luego con el argumento `gemini`, sin editar el código entre corridas
- **THEN** ambas ejecuciones usan la misma función `streamText` y el mismo código de la aplicación, seleccionando el modelo correspondiente según el argumento recibido

### Requirement: Continuidad conversacional entre turnos
El ejercicio del Hito 1 SHALL mantener y reenviar el historial de mensajes entre turnos para un loop interactivo, sin que el usuario deba reenviar contexto manualmente.

#### Scenario: Segundo mensaje en la misma conversación
- **WHEN** el usuario envía un segundo mensaje
- **THEN** la aplicación incluye los turnos previos (usuario y asistente) en la llamada a `streamText`, para que el modelo tenga el contexto de la conversación
