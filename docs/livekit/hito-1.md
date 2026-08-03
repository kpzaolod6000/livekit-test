# Hito 1 — Rooms + Participants + audio track (transport puro, SIN IA)

> Plan `learn-livekit-sdk`, Fase A (Transport). Modo self-hosted (`livekit-server --dev`).
> Meta: dos participantes entran a la misma sala y se escuchan. Sin agente ni LLM.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-transport-rooms/spec.md`

## TEORÍA

### Room (sala)
Contenedor lógico donde los participantes intercambian media y datos. Se crea sola cuando
entra el primer participante. En la app Gemini Live nativa (la que se migra) no existe este
concepto: era una conexión directa navegador↔Gemini. Acá todo pasa por una *sala* en el SFU.
FUENTE: https://docs.livekit.io/home/client/connect/

### Token de acceso (JWT)
El cliente NO tiene el `secret`. Pide un JWT firmado a un token server propio. El JWT lleva
un *grant* (`VideoGrant`): a qué sala puede entrar y qué puede hacer (publicar/suscribir).
El `livekit-server --dev` valida la firma con `devkey`/`secret`.
FUENTE: https://docs.livekit.io/home/server/generating-tokens/

### Publish / Subscribe
Cada participante *publica* tracks (su mic) y se *suscribe* a los de otros. El SFU enruta —
no es peer-to-peer directo, todo pasa por el server.
FUENTE: https://docs.livekit.io/home/client/tracks/

### Eventos
El objeto `Room` emite eventos (`RoomEvent.*`): participante entra/sale, track suscrito,
reconexión. Se reacciona a ellos, no se hace polling.
FUENTE: https://docs.livekit.io/home/client/connect/

## API VERIFICADA (en vivo, 2026-07)

### Token server — `livekit-server-sdk` (Node)
```typescript
import { AccessToken } from 'livekit-server-sdk';

const at = new AccessToken('devkey', 'secret', { identity });
at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
const token = await at.toJwt();   // ⚠️ async
```
FUENTE: https://docs.livekit.io/home/server/generating-tokens/

### Cliente — `livekit-client` (navegador)
```typescript
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();
await room.connect('ws://127.0.0.1:7880', token);
await room.localParticipant.setMicrophoneEnabled(true);      // Paso C
room.on(RoomEvent.TrackSubscribed, (track) => {              // Paso C
  document.body.appendChild(track.attach());
});
room.on(RoomEvent.ParticipantConnected, (p) => { /* ... */ });   // Paso D
room.on(RoomEvent.ParticipantDisconnected, (p) => { /* ... */ });
```
FUENTE: https://docs.livekit.io/home/client/connect/ · https://docs.livekit.io/home/client/tracks/

## ARQUITECTURA DEL HITO (2 procesos + SFU)

```
  Cliente Vite (:5173)  ──GET token──▶  token-server (:3001)   [firma con secret]
        │                                       
        └──── connect(token) WebRTC ────▶  livekit-server --dev (:7880, SFU)
```
Nota: el agent worker (proceso 3 del Hito 0) todavía NO aparece — este hito es transport puro.

⚠️ **Gotcha CORS:** el cliente (`:5173`) le pega al token server (`:3001`), distinto origen.
El token server DEBE mandar `Access-Control-Allow-Origin: *` (y responder el preflight
`OPTIONS`) o el navegador bloquea la respuesta.

## ARCHIVOS

```
livekit/hito1/
├── token-server.ts        # Node, corre con `npx tsx`, http nativo + AccessToken + CORS
└── client/                # Vite vanilla-ts
    └── src/main.ts         # fetch token → new Room() → connect → (Paso C/D pendientes)
```

## CÓMO CORRER (3 procesos)

```bash
# Terminal 1 (infra):
livekit-server --dev
# Terminal 2 (token server):
npx tsx livekit/hito1/token-server.ts
# Terminal 3 (cliente):
cd livekit/hito1/client && npm run dev      # abre http://localhost:5173
```
Para probar pub/sub: abrir una 2da pestaña con otra identidad → `http://localhost:5173/?identity=pedro`.

## LA TAREA (tasks 1.2–1.5) + CHECKPOINTS

- **1.2** Token server emite JWT. ✅ Checkpoint: `curl ".../token?room=sala1&identity=juan"`
  devuelve `{token}`; el payload (jwt.io) muestra el `video` grant.
- **1.3** Cliente pide token y entra. ✅ Checkpoint: página dice "conectado"; `livekit-server`
  loguea el participante.
- **1.4** Mic pub/sub. ✅ Checkpoint: 2 pestañas (identities distintas) se escuchan.
- **1.5** Eventos entra/sale actualizan la UI. ✅ Checkpoint: abrir/cerrar 2da pestaña mueve la lista.

Criterio de cierre (spec): token server separado (cliente sin `secret`) · 2 participantes se
escuchan sin IA · eventos manejados.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| A — token server | 1.2 | ✅ implementado (frase de escape) + verificado (JWT, grant, 400, CORS) |
| B — cliente conecta | 1.3 | ✅ implementado (frase de escape) + checkpoint browser confirmado por usuario |
| C — mic pub/sub | 1.4 | ✅ implementado (frase de escape) + checkpoint C confirmado (2 pestañas se escuchan) |
| D — eventos | 1.5 | ✅ checkpoint D confirmado (lista se actualiza sola) |
| review final | 1.6 | ✅ HITO 1 CERRADO — 3/3 requisitos del spec OK |
