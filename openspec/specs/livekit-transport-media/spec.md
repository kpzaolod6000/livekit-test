# livekit-transport-media Specification

## Purpose
TBD - created by archiving change learn-livekit-sdk. Update Purpose after archive.
## Requirements
### Requirement: Publicación y suscripción de track de video
El ejercicio del Hito 3 SHALL publicar un track de video (cámara) de un participante y suscribirlo/renderizarlo en otro participante, dentro de la app **Next.js** usando `@livekit/components-react` (ej. `useTracks`, `<VideoTrack>` / `<ParticipantTile>`).

#### Scenario: Render de video de otro participante
- **WHEN** un participante publica su track de cámara
- **THEN** los participantes suscritos renderizan el video entrante en la UI

### Requirement: Compartir pantalla (screenshare) como track separado
El ejercicio del Hito 3 SHALL implementar screenshare como un track de video adicional distinguible del track de cámara, demostrando que un participante puede publicar múltiples tracks de video simultáneos.

#### Scenario: Participante comparte pantalla y cámara a la vez
- **WHEN** un participante activa screenshare mientras publica cámara
- **THEN** los suscriptores reciben ambos tracks y pueden distinguir cuál es cámara y cuál es pantalla compartida

### Requirement: Adaptación de calidad manejada por la plataforma
El ejercicio del Hito 3 SHALL constatar (observando, no implementando) que LiveKit adapta automáticamente la calidad de los tracks a las condiciones de red, sin que la aplicación gestione el bitrate manualmente.

#### Scenario: Degradación de red
- **WHEN** las condiciones de red del suscriptor empeoran
- **THEN** LiveKit ajusta la calidad del track entrante automáticamente, sin intervención de código de la aplicación

