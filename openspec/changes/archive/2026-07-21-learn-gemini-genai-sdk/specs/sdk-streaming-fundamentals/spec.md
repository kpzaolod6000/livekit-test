## ADDED Requirements

### Requirement: Chat en streaming con system instruction
El ejercicio del Hito 1 SHALL crear una sesión de chat vía `ai.chats.create` del SDK `@google/genai`, con `systemInstruction` definido en `config` antes de enviar cualquier mensaje, y SHALL consumir la respuesta mediante streaming (`sendMessageStream`).

#### Scenario: Envío de mensaje al chat
- **WHEN** el usuario envía un mensaje usando `chat.sendMessageStream`
- **THEN** la respuesta se recibe en fragmentos (chunks) iterados de forma asíncrona, no como un bloque único al final

#### Scenario: System instruction aplica a todo el chat
- **WHEN** se crea el chat con `ai.chats.create` y `config.systemInstruction` definido
- **THEN** todos los turnos subsecuentes de esa sesión respetan la instrucción sin necesidad de repetirla en cada mensaje

### Requirement: Historial conversacional persistente
La sesión de chat del Hito 1 SHALL mantener historial de turnos previos internamente, permitiendo un loop interactivo de múltiples mensajes sin que el usuario deba reenviar contexto manualmente.

#### Scenario: Segundo mensaje en la misma sesión
- **WHEN** el usuario envía un segundo mensaje en la misma sesión de chat
- **THEN** el modelo responde teniendo en cuenta el mensaje y respuesta anteriores sin que la app los reenvíe explícitamente
