# Hito 4 — Server-side: room management + webhooks (transport puro, SIN IA)

> Plan `learn-livekit-sdk`, Fase A (Transport) — ÚLTIMO hito de la fase. Sin IA.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-transport-server/spec.md`
> Todo del lado servidor (Node), no browser. Reusa `livekit-server-sdk` (el del token-server).

## TEORÍA

### Room management server-side
Hasta ahora las salas se creaban solas al entrar el primer cliente. Desde el servidor podés
administrarlas explícitamente: crear, listar, ver participantes, expulsar. Es el control de
plataforma que en producción usás para moderar / limpiar / auditar.
FUENTE: https://docs.livekit.io/home/server/managing-rooms/

### Webhooks
El `livekit-server` te avisa de eventos (sala arranca/termina, participante entra/sale)
haciendo POST a un endpoint tuyo. Tu backend reacciona (log, DB, disparar lógica). El POST va
firmado — hay que **verificar** la autenticidad antes de confiar en el evento.
FUENTE: https://docs.livekit.io/home/server/webhooks/

## API VERIFICADA (tipos instalados, livekit-server-sdk)

### RoomServiceClient — OJO host HTTP, no WS
```typescript
import { RoomServiceClient } from 'livekit-server-sdk';

const svc = new RoomServiceClient('http://localhost:7880', 'devkey', 'secret');
await svc.createRoom({ name: 'sala1' });
const rooms = await svc.listRooms();                 // Room[]
const parts = await svc.listParticipants('sala1');   // ParticipantInfo[]
await svc.removeParticipant('sala1', 'pedro');
```
Nota: el cliente usa `http://` (API REST del server), distinto del `ws://` que usa el browser.

### WebhookReceiver
```typescript
import { WebhookReceiver } from 'livekit-server-sdk';

const receiver = new WebhookReceiver('devkey', 'secret');
// en tu endpoint HTTP: body = texto RAW del request, authHeader = header 'Authorization'
const event = await receiver.receive(rawBody, authHeader);  // async, valida la firma
// event.event: 'room_started' | 'participant_joined' | 'participant_left' | 'room_finished' | ...
```
⚠️ `receive()` necesita el **body crudo** (string sin parsear) + el header `Authorization`.
Si parseás el JSON antes, la verificación de firma falla.

## CONFIG DEL SERVER PARA WEBHOOKS ⚠️

El `livekit-server --dev` pelado **no envía webhooks** — hay que decirle a dónde. Corré el
server con un `config.yaml` que incluya el bloque webhook (y las keys dev):
```yaml
port: 7880
keys:
  devkey: secret
webhook:
  api_key: devkey
  urls:
    - http://localhost:3002/webhook
```
```bash
livekit-server --config config.yaml
```
Confirmá en tu versión cómo combinar esto con `--dev` (puede requerir solo `--config`, no ambos).
FUENTE: https://docs.livekit.io/home/self-hosting/deployment/ (config) + webhooks (arriba)

## CÓMO IMPLEMENTARLO

1. **Room mgmt** (`livekit/hito4/room-admin.ts`): script Node con `RoomServiceClient` que liste
   salas + participantes, y exponga expulsar (o correlo con args).
2. **Webhook endpoint** (nuevo server HTTP, ej. `:3002`): recibe POST, lee body RAW +
   `Authorization`, `receiver.receive(...)`, loguea `event.event` + participante.
3. Correr `livekit-server --config config.yaml` apuntando a ese endpoint, y disparar eventos
   entrando/saliendo con el cliente del Hito 1.

## LA TAREA (tasks 4.2–4.3) + CHECKPOINTS

- **4.2** Room mgmt con server SDK. ✅ Checkpoint: con un cliente conectado, tu script imprime
  la sala y sus participantes; `removeParticipant` desconecta a alguien (se ve en el browser).
- **4.3** Webhook verificado. ✅ Checkpoint: entrás/salís con el cliente → tu endpoint loguea
  `participant_joined` / `participant_left` verificados.

Criterio de cierre (spec `livekit-transport-server`): listar/controlar participantes desde el
server · recibir webhook verificado · todo contra el server self-hosted. Sin IA.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor | 4.1 | ✅ entregado |
| room management | 4.2 | ✅ implementado (`livekit/hito4/room-admin.ts`, escape phrase) · typecheck OK, falta checkpoint browser |
| webhooks | 4.3 | ✅ implementado (`livekit/hito4/webhook-server.ts` + `config.yaml`, escape phrase) · typecheck OK, falta checkpoint |
| review final | 4.4 | ⏳ pendiente (mentor) — tras checkpoints |
