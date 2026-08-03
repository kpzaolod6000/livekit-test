## ADDED Requirements

### Requirement: Administración de salas desde el servidor con el server SDK
El ejercicio del Hito 4 SHALL usar `livekit-server-sdk` (Node) para administrar salas server-side: crear una sala, listar salas y participantes, y expulsar/desconectar a un participante, sin pasar por el frontend cliente.

#### Scenario: Listado y control de participantes desde el servidor
- **WHEN** el proceso servidor consulta las salas activas y sus participantes vía el server SDK
- **THEN** obtiene el estado actual de la sala y puede desconectar a un participante específico mediante una llamada del server SDK

### Requirement: Recepción de webhooks de eventos de sala
El ejercicio del Hito 4 SHALL configurar un endpoint que reciba webhooks de `livekit-server` (ej. `room_started`, `participant_joined`, `participant_left`, `room_finished`) y verifique su autenticidad, demostrando cómo el backend reacciona a eventos de la plataforma.

#### Scenario: Backend reacciona a un evento de participante
- **WHEN** un participante entra o sale de una sala en el `livekit-server`
- **THEN** el endpoint de webhook recibe el evento verificado y ejecuta la lógica de backend correspondiente (ej. log o actualización de estado)

### Requirement: Verificación contra el servidor self-hosted
El ejercicio del Hito 4 SHALL ejecutarse contra el `livekit-server --dev` self-hosted (credenciales `devkey`/`secret`), sin dependencia de LiveKit Cloud.

#### Scenario: Operaciones de servidor contra instancia local
- **WHEN** el proceso servidor realiza operaciones de administración o recibe webhooks
- **THEN** todas apuntan a la instancia local `livekit-server --dev`, no a un servicio cloud externo
