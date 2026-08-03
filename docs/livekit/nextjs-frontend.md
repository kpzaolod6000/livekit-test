# Frontend Next.js — migración desde vanilla-ts (Hitos 1-3)

> Plan `learn-livekit-sdk`. A partir de este punto el frontend del plan es **Next.js**.
> El cliente vanilla-ts previo (`livekit/hito1/`) se conserva como referencia, NO se borró.
> Carpeta nueva: `livekit/nextjs-frontend/`.

## Por qué el cambio
El usuario decidió (mid-plan) migrar el frontend a Next.js. Decisiones tomadas en explore:
- **Token server → route handler de Next.js** (`app/api/token/route.ts`). Colapsa la arquitectura
  de 3 procesos (token-server + cliente Vite + worker) a **2 procesos** (app Next.js + worker) +
  `livekit-server`. El `secret` sigue server-side (solo corre en el route handler).
- **Cliente → `@livekit/components-react`** (hooks + componentes) en vez de `livekit-client` crudo.

Specs actualizados a Next.js: `livekit-transport-rooms`, `-data`, `-media`, `livekit-chat-ui`,
`livekit-streaming-fundamentals`, más `proposal.md` y `design.md` (arquitectura 3→2 procesos).

## Stack verificado
- `next@16.2.11` (App Router, Turbopack), `react`, TypeScript
- `@livekit/components-react@2.9.23` + `@livekit/components-styles`
- `livekit-server-sdk@2.17` (en el route handler)
- ⚠️ Next 16 tiene breaking changes — hay un `AGENTS.md` en la carpeta que obliga a leer
  `node_modules/next/dist/docs/` antes de codear. Route handlers = `export async function GET(req)`
  con `NextRequest`/`NextResponse`; `'use client'` para componentes con hooks/estado.

## Estructura
```
livekit/nextjs-frontend/
├── .env.local              LIVEKIT_API_KEY/SECRET (server) + NEXT_PUBLIC_LIVEKIT_URL (client)
├── app/
│   ├── api/token/route.ts  Hito 1 — token server como route handler (secret server-side)
│   └── page.tsx            'use client' — pide token, <LiveKitRoom> + <RoomAudioRenderer>
└── components/
    └── RoomUI.tsx          Hitos 1-3 dentro del RoomContext (hooks components-react)
```

## Mapeo vanilla-ts → components-react

| Concepto | vanilla-ts (`livekit/hito1`) | Next.js (`components-react`) |
|---|---|---|
| Entrar a sala | `new Room(); room.connect()` | `<LiveKitRoom serverUrl token connect>` |
| Publicar mic | `setMicrophoneEnabled(true)` | prop `audio` en `<LiveKitRoom>` |
| Oír remotos | `on(TrackSubscribed)`+`attach()` | `<RoomAudioRenderer/>` (automático) |
| Lista participantes | `on(ParticipantConnected/…)` | `useParticipants()` |
| Texto (2.2) | `sendText`/`registerTextStreamHandler` | igual, `room` vía `useRoomContext()` |
| Bytes (2.3) | `streamBytes`/`registerByteStreamHandler` | igual |
| RPC (2.4) | `registerRpcMethod`/`performRpc` | igual, `localParticipant` vía `useLocalParticipant()` |
| Cámara/pantalla (3.2/3.3) | `setCameraEnabled`/`setScreenShareEnabled` | `<TrackToggle source=…>` |
| Render video | `on(TrackSubscribed)` filtrando video | `useTracks([Camera, ScreenShare])` + `<VideoTrack>` |

Nota: los handlers de data (text/byte) se registran en un `useEffect` con **cleanup**
(`unregister*`) — necesario para no romper con el doble-montaje de React StrictMode en dev.

## Cómo correr (2 procesos, Hitos 1-3 no necesitan agent worker)
```bash
# Terminal 1:
livekit-server --dev
# Terminal 2:
cd livekit/nextjs-frontend && npm run dev     # http://localhost:3000
```
Checkpoints (2 pestañas):
- Pestaña 1: `http://localhost:3000/?identity=kelvin`
- Pestaña 2: `http://localhost:3000/?identity=pedro`
- **Hito 1:** ambas se ven en "Participantes"; se escuchan (mic on por defecto, usá auriculares).
- **Hito 2:** enviar texto/bytes/RPC entre pestañas.
- **Hito 3:** toggles Cámara/Pantalla → la otra pestaña renderiza el video etiquetado.

## Estado
- Build de producción (`npm run build`): ✅ TypeScript + compilación OK.
- Checkpoints en navegador: ✅ confirmados por usuario (Hitos 1-3 andan en Next.js).
- Nota: hay 2 `package-lock.json` (root + nextjs-frontend); Next avisa pero no bloquea.
