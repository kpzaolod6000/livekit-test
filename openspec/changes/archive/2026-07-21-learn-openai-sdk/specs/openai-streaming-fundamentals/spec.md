## ADDED Requirements

### Requirement: Chat en streaming con instrucciones del sistema
El ejercicio del Hito 1 SHALL usar la Chat Completions API del SDK oficial `openai` (`client.chat.completions.create` con `stream: true`), con un mensaje de rol `system` definido como primer elemento del array `messages` antes de cualquier mensaje del usuario, y SHALL consumir la respuesta mediante streaming.

#### Scenario: Envío de mensaje
- **WHEN** el usuario envía un mensaje vía Chat Completions en modo streaming
- **THEN** la respuesta se recibe como una secuencia de chunks (deltas de texto) iterados de forma asíncrona, no como un bloque único al final

#### Scenario: Mensaje de sistema aplica a la conversación
- **WHEN** el array `messages` incluye un mensaje inicial con `role: 'system'`
- **THEN** la respuesta generada respeta esa instrucción en todos los turnos de la conversación

### Requirement: Historial conversacional gestionado manualmente
El ejercicio del Hito 1 SHALL mantener y reenviar el array `messages` completo (incluyendo turnos previos de usuario y asistente) en cada llamada, ya que Chat Completions API es sin estado (stateless) y no gestiona historial en el servidor.

#### Scenario: Segundo mensaje en la misma conversación
- **WHEN** el usuario envía un segundo mensaje
- **THEN** la aplicación agrega el nuevo mensaje al array `messages` acumulado (incluyendo la respuesta anterior del asistente) y reenvía el array completo, para que el modelo tenga el contexto de la conversación
