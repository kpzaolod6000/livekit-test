# livekit-transport-rooms Specification

## Purpose
TBD - created by archiving change learn-livekit-sdk. Update Purpose after archive.
## Requirements
### Requirement: Conexión a una sala vía token JWT emitido por un route handler de Next.js
El ejercicio del Hito 1 SHALL implementar una app **Next.js (App Router)** que (a) emita el JWT de acceso a la sala desde un **route handler** (`app/api/token/route.ts`) usando `livekit-server-sdk` server-side, y (b) conecte a la sala vía WebRTC usando `@livekit/components-react` (ej. `<LiveKitRoom>`), contra el `livekit-server --dev` self-hosted, sin ningún componente de IA todavía. El `secret` SHALL permanecer server-side, nunca en el bundle del cliente.

#### Scenario: Cliente obtiene token y entra a la sala
- **WHEN** la app Next.js necesita unir a un usuario a una sala
- **THEN** el componente pide el JWT al route handler `/api/token` (que lo firma server-side) y luego conecta a la sala con ese token vía `@livekit/components-react`, apareciendo como participante conectado en el servidor

### Requirement: Publicación y suscripción de track de audio del micrófono
El ejercicio del Hito 1 SHALL publicar el track de audio del micrófono del participante y suscribirse a los tracks de otros participantes de la sala, demostrando el modelo publish/subscribe de LiveKit sin capa de IA.

#### Scenario: Dos participantes se escuchan
- **WHEN** dos participantes conectados a la misma sala publican su micrófono
- **THEN** cada uno se suscribe y reproduce el track de audio del otro, sin agente ni modelo de lenguaje en el medio

### Requirement: Manejo de eventos de participantes y estado de conexión
El ejercicio del Hito 1 SHALL manejar los eventos básicos de ciclo de vida de la sala — participante que entra, participante que sale, cambios de estado de conexión — usando el modelo de eventos del cliente LiveKit.

#### Scenario: Reacción a participante que entra o sale
- **WHEN** un participante se conecta o desconecta de la sala
- **THEN** el frontend recibe el evento correspondiente y actualiza su estado local de participantes de la sala

