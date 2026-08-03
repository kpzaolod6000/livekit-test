# Hito 3 — Media avanzado: video track + screenshare (transport puro, SIN IA)

> Plan `learn-livekit-sdk`, Fase A (Transport). Sin IA.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-transport-media/spec.md`
> Nota: tu app objetivo (chat texto+audio) no necesita video, pero elegiste "transport
> completo" — este hito cubre la plataforma entera. Es corto y reusa todo lo del Hito 1.

## TEORÍA

### Video track
Igual que el mic (Hito 1) publicás un track, pero de cámara. El SFU lo reenvía; los demás se
suscriben y lo renderizan en un `<video>`. Un participante puede publicar **varios tracks de
video a la vez** (cámara + pantalla).
FUENTE: https://docs.livekit.io/home/client/tracks/publish/

### Screenshare
Es otro track de video, pero con **source distinto** (`screen_share` en vez de `camera`). Así el
receptor puede distinguir "esto es su cámara" de "esto es su pantalla" mirando
`publication.source`.
FUENTE: https://docs.livekit.io/home/client/tracks/

### Adaptación de calidad
LiveKit ajusta bitrate/resolución de los tracks según la red del suscriptor, automáticamente.
No lo programás — solo lo observás. Es una razón central de usar un SFU y no P2P.
FUENTE: https://docs.livekit.io/home/client/tracks/

## API VERIFICADA (tipos instalados, livekit-client)

```typescript
import { Track } from 'livekit-client';

// publicar:
await room.localParticipant.setCameraEnabled(true);       // track source=camera
await room.localParticipant.setScreenShareEnabled(true);  // track source=screen_share

// recibir/distinguir (en el handler TrackSubscribed, 2do arg = publication):
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Video) {
    const el = track.attach();  // <video>
    const esPantalla = publication.source === Track.Source.ScreenShare;
    // ... poner label "cámara" vs "pantalla" según esPantalla
  }
});
```

Track.Source enum (verificado): `Camera` ("camera"), `Microphone`, `ScreenShare`
("screen_share"), `ScreenShareAudio`, `Unknown`.

⚠️ En `main.ts` actual, el handler `TrackSubscribed` **filtra a solo audio**
(`if (track.kind !== Track.Kind.Audio) return`). Para este hito hay que ampliarlo a video.

## CÓMO IMPLEMENTARLO

Reusás el cliente de Hito 1/2. Cambios:
1. Un contenedor `<div>` para videos (separado del de audio).
2. Ampliar el handler `TrackSubscribed`: si `track.kind === Video`, `attach()` a un `<video>`,
   y etiquetarlo cámara/pantalla según `publication.source`.
3. Botón "cámara" → `setCameraEnabled(true)` (pide permiso de cámara).
4. Botón "compartir pantalla" → `setScreenShareEnabled(true)` (el navegador abre el selector).

## LA TAREA (tasks 3.2–3.4) + CHECKPOINTS

- **3.2** Publicar y renderizar cámara. ✅ Checkpoint: pestaña 2 ve el video de pestaña 1.
- **3.3** Screenshare como track adicional distinguible. ✅ Checkpoint: con cámara + pantalla
  activas a la vez, el receptor muestra 2 videos etiquetados distinto.
- **3.4** Observar adaptación de calidad. ✅ Checkpoint: (opcional) throttlear la red en DevTools
  y ver que el video se degrada solo, sin tocar código.

Criterio de cierre (spec `livekit-transport-media`): video cámara renderizado · screenshare
distinguible de cámara · adaptación de calidad constatada. Todo sin IA.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor | 3.1 | ✅ entregado |
| video cámara | 3.2 | ✅ checkpoint confirmado |
| screenshare | 3.3 | ✅ checkpoint confirmado (distinguido por source) |
| adaptación calidad | 3.4 | ✅ confirmado |
| review final | 3.5 | ✅ HITO 3 CERRADO — 3/3 requisitos del spec OK |
