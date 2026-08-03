## Purpose

Combinación de RAG y tools dentro de una misma sesión Realtime con el Vercel AI SDK: contexto recuperado más tools expuestas vía `experimental_getRealtimeToolDefinitions`, funcionando igual con ambos providers Realtime y manteniendo salida de texto y audio simultáneos (Hito 8).

## Requirements

### Requirement: RAG y tools combinados dentro de sesión Realtime
El ejercicio del Hito 8 SHALL permitir que, dentro de una misma sesión Realtime, el modelo use contexto recuperado vía RAG y además pueda invocar tools expuestas vía `experimental_getRealtimeToolDefinitions`, según lo requiera el turno de conversación.

#### Scenario: Turno que requiere contexto y tool en vivo
- **WHEN** la pregunta del usuario dentro de la sesión Realtime requiere tanto contexto del corpus indexado como una acción externa vía tool
- **THEN** el sistema pone a disposición el contexto recuperado y permite la invocación de la tool necesaria, todo dentro del mismo turno, sin cerrar la sesión

### Requirement: Comportamiento se preserva en el escenario combinado con ambos providers
La combinación de RAG y tools dentro de la sesión Realtime SHALL funcionar igual contra `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`.

#### Scenario: Turno combinado con ambos providers Realtime
- **WHEN** se prueba el mismo turno combinado (RAG + tool) con ambos providers Realtime
- **THEN** ambos resuelven correctamente el contexto y la tool, usando el mismo componente de la aplicación

### Requirement: RAG + tools combinados funcionan con salida de texto y audio simultáneos
La sesión Realtime del Hito 8 SHALL mantener `outputModalities: ['audio']` (heredado del Hito 5, ver corrección en `vercel-ai-realtime-streaming`) durante el turno combinado de RAG + tools, conservando texto simultáneo vía transcripción.

#### Scenario: Turno combinado con audio activo
- **WHEN** el turno combinado (RAG + tool) se resuelve mientras la sesión responde en texto y audio
- **THEN** la respuesta final incluye audio real Y texto, reflejando tanto el contexto RAG como el resultado de la tool
