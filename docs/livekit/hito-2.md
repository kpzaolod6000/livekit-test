# Hito 2 — Data: text streams + byte streams + RPC (base de la sección texto, SIN IA)

> Plan `learn-livekit-sdk`, Fase A (Transport). Sin agente ni LLM: datos entre participantes.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-transport-data/spec.md`
> Migración: el **text stream** es el transporte que después va a llevar tu `sendClientContent`
> (texto → sesión). En este hito es participante↔participante; la IA que consume ese texto
> recién entra en Hito 9.

## TEORÍA

Además de tracks de audio/video, los participantes de una sala intercambian **datos**. Tres formas:

### Text streams
Enviar/recibir texto, ruteado por **topic** (una etiqueta string, ej. `"chat"`). El emisor manda
a un topic; quien registró un handler para ese topic lo recibe. Es la base de la sección de
texto de tu chat.
FUENTE: https://docs.livekit.io/home/client/data/text-streams/

### Byte streams
Datos binarios (archivos, blobs). Mismo modelo de topic, pero bytes en vez de string.
FUENTE: https://docs.livekit.io/home/client/data/byte-streams/

### RPC (Remote Procedure Call)
Llamada request/response entre participantes: uno registra un método, otro lo invoca y recibe
un valor de retorno. Útil para acciones puntuales (no streaming).
FUENTE: https://docs.livekit.io/home/client/data/rpc/

## API VERIFICADA (en vivo, 2026-07)

### Text streams
```typescript
// enviar (async):
const info = await room.localParticipant.sendText('hola', { topic: 'chat' });

// recibir: registrar handler por topic
room.registerTextStreamHandler('chat', async (reader, participantInfo) => {
  const text = await reader.readAll();               // todo de una
  // o incremental: for await (const chunk of reader) { ... }
  console.log(participantInfo.identity, 'dijo:', text);
});
```

### RPC
```typescript
// registrar un método (lado que responde):
room.localParticipant.registerRpcMethod('ping', async (data) => {
  // data.callerIdentity, data.payload
  return 'pong';                                     // string, ≤ 15 KiB
});

// invocar (lado que llama):
const res = await room.localParticipant.performRpc({
  destinationIdentity: 'pedro',
  method: 'ping',
  payload: 'hola',
});                                                  // timeout default 10s
```
⚠️ Confirmá en tu versión si registro es `room.registerRpcMethod` o
`room.localParticipant.registerRpcMethod` (las docs muestran ambas variantes).

### Byte streams (VERIFICADO — NO existe `sendBytes`)
Enviar usa un **writer** (`streamBytes` devuelve `ByteStreamWriter`); recibir es por handler:
```typescript
// enviar:
const writer = await room.localParticipant.streamBytes({ topic: 'file' });
await writer.write(new TextEncoder().encode('archivo-de-prueba'));
await writer.close();

// recibir:
room.registerByteStreamHandler('file', async (reader, info) => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of reader) chunks.push(chunk);
  // concatenar chunks y TextDecoder().decode(...) para reconstruir
});
```
Nota: para archivos reales existe `localParticipant.sendFile(file)`.

## CÓMO IMPLEMENTARLO

Reusás el cliente del Hito 1 (misma sala, 2 pestañas con identities distintas). Agregás:
1. **Texto:** un `<input>` + botón "enviar" → `sendText(valor, { topic: 'chat' })`. Un
   `registerTextStreamHandler('chat', ...)` que pinta los mensajes entrantes en pantalla.
2. **Bytes:** enviar un payload binario chico (ej. `new TextEncoder().encode('archivo')` o un
   `Uint8Array`) por `sendBytes`, recibirlo y reconstruirlo (comparar que llegó íntegro).
3. **RPC:** registrar `ping` en una pestaña, invocarlo desde la otra con `performRpc`, ver `pong`.

## LA TAREA (tasks 2.2–2.4) + CHECKPOINTS

- **2.2** Texto entre participantes. ✅ Checkpoint: escribís en pestaña kelvin → aparece en pestaña pedro.
- **2.3** Byte stream. ✅ Checkpoint: enviás bytes → el receptor reconstruye el mismo contenido.
- **2.4** Una llamada RPC request/response. ✅ Checkpoint: invocás `ping` desde una pestaña → recibís `pong`.

Criterio de cierre (spec `livekit-transport-data`): texto ruteado por topic recibido por otro
participante · byte stream íntegro · RPC con valor de retorno. Todo SIN IA.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor | 2.1 | ✅ entregado |
| texto | 2.2 | ✅ checkpoint confirmado |
| byte stream | 2.3 | ✅ checkpoint confirmado (`streamBytes` writer) |
| RPC | 2.4 | ✅ checkpoint confirmado |
| review final | 2.5 | ✅ HITO 2 CERRADO — 3/3 requisitos del spec OK |
