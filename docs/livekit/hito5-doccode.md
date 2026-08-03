# Hito 5 — Explicación línea por línea de `livekit/hito5/agent.ts`

> Plan `learn-livekit-sdk`, Fase B. Doc pedagógico para usuario nuevo.
> Acompaña a `docs/livekit/hito-5.md` (TEORÍA + CÓMO + TAREA).
> Objetivo: entender QUÉ hace cada línea, QUÉ pasa por detrás, y los CONCEPTOS técnicos.

---

## Bloque imports

```typescript
import 'dotenv/config';
```
**Qué:** ejecuta dotenv al importar (no exporta nada, solo corre efecto secundario). Lee `.env` de
la raíz, mete cada `KEY=valor` en `process.env`.
**Por detrás:** `process.env` = objeto global de Node con variables de entorno del SO. dotenv lo
rellena en memoria, solo para este proceso. Por eso va **primera línea** — si va después de crear
`openai.STT`, la key todavía no está cargada y explota.
**Concepto:** secreto (API key) nunca hardcodeado en código. Vive fuera, en `.env` (que va en `.gitignore`).

```typescript
import { cli, defineAgent, voice, ServerOptions, type JobContext } from '@livekit/agents';
```
- `cli` — namespace con `runApp()`, arranca el worker + parsea subcomandos (`dev`/`start`).
- `defineAgent` — helper que envuelve tu lógica en la forma que el framework espera (`{entry, prewarm}`).
  No hace magia, solo da tipos + valida forma.
- `voice` — namespace con `Agent` y `AgentSession` (el runtime de voz).
- `ServerOptions` — clase config del worker (a qué server conectar, con qué keys).
- `type JobContext` — solo tipo TS (`type` = se borra al compilar, cero runtime). Es el "sobre" con
  todo lo del trabajo actual: la sala, la conexión, metadata.

```typescript
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
```
**Qué:** `* as X` = importa todo el namespace. `openai.STT`, `openai.LLM`, `openai.TTS`, `google.LLM`.
**Por detrás:** cada plugin = adaptador. Traduce la interfaz genérica de LiveKit (`STT`/`LLM`/`TTS`
abstractas) a la API HTTP concreta del provider. LiveKit no sabe de OpenAI; el plugin sí.

---

## defineAgent + entry

```typescript
export default defineAgent({
  entry: async (ctx: JobContext) => {
```
**Qué:** `export default` — el worker importa este archivo dinámicamente y busca el default export.
Por eso `ServerOptions({ agent: import.meta.filename })` apunta a ESTE mismo archivo.
**`entry`:** función que el framework llama **una vez por cada job** (cada vez que un humano entra a
una sala y te asignan). `ctx` = ese sobre del job.
**`async`:** adentro usás `await` (operaciones de red tardan). async = la función devuelve Promise,
no bloquea el hilo mientras espera.
**Por detrás — job dispatch:** el worker se registra en el server y queda esperando. Server detecta
sala nueva/participante → manda "job" al worker → worker levanta un **subproceso** aislado y corre
`entry` ahí. Aislado = si un job crashea, no tumba los otros.

```typescript
    await ctx.connect();
```
**Qué:** el worker se une a la sala LiveKit como un participante más.
**Por detrás:** abre conexión **WebRTC** al `livekit-server`, negocia (SDP handshake, ICE), y por
default **se suscribe a todos los tracks** de los demás — o sea, empieza a recibir el audio del mic
del humano en tiempo real. `await` porque el handshake tarda ms.
**Concepto WebRTC:** protocolo de media de baja latencia. El server es SFU (Selective Forwarding
Unit): recibe tu audio y lo reenvía a los otros, sin mezclarlo. Distinto de HTTP (request/response)
— WebRTC es stream continuo bidireccional.

---

## voice.Agent

```typescript
    const agent = new voice.Agent({
      instructions: 'Sos asistente de voz breve, en español. Máx 2 frases por respuesta.',
    });
```
**Qué:** define **quién es** el agente. `instructions` = system prompt.
**Por detrás:** este string se inyecta como mensaje `system` en cada llamada al LLM. Fija
personalidad/idioma/reglas. "Máx 2 frases" importa en voz — respuestas largas se sienten eternas
habladas.
**Concepto:** separación runtime vs identidad. `Agent` = identidad (quién, qué sabe, qué tools tiene).
`AgentSession` = motor (cómo escucha/piensa/habla). Un `AgentSession` puede cambiar de `Agent` en
caliente (base de los handoffs del Hito 14).

---

## voice.AgentSession — el corazón

```typescript
    const session = new voice.AgentSession({
```
**Qué:** crea el orquestador. No hace nada todavía — solo guarda las piezas. Arranca en `.start()`.

```typescript
      stt: new openai.STT({ model: 'whisper-1', language: 'es' }),
```
**Qué:** Speech-to-Text. Audio del humano → texto.
**`model: 'whisper-1'`:** modelo de transcripción de OpenAI. **`language: 'es'`:** fija español
(sin esto autodetecta, más lento y a veces yerra idioma).
**Por detrás (clave):** whisper-1 es **batch, no streaming** — necesita un clip de audio completo,
no un flujo. Flujo real: VAD detecta "empezó a hablar"→acumula audio→VAD detecta "silencio,
terminó"→manda ese clip a whisper→texto. La `AgentSession` hace ese segmentado por vos (StreamAdapter).
**Lee `OPENAI_API_KEY`** de `process.env` (por eso dotenv arriba).

```typescript
      llm: new openai.LLM({ model: 'gpt-4o-mini' }),
```
**Qué:** el cerebro. Texto transcrito + historial + instructions → texto respuesta.
**Por detrás:** llamada HTTP a OpenAI con **streaming** — la respuesta llega token por token, no de
golpe. Eso permite que el TTS empiece a hablar la primera frase mientras el LLM todavía genera el
resto (menos latencia percibida).
**Esta línea = la que swapeás en 5.3.** El resto queda igual. Ese es el punto entero del hito.

```typescript
      tts: new openai.TTS({ model: 'tts-1', voice: 'alloy' }),
```
**Qué:** Text-to-Speech. Texto respuesta → audio.
**`voice: 'alloy'`:** una de las voces predefinidas de OpenAI.
**Por detrás:** recibe el texto en chunks del LLM, sintetiza audio, y la `AgentSession` **publica ese
audio como track** en la sala. El humano lo escucha vía su conexión WebRTC. Streaming también:
sintetiza por frases, no espera el texto completo.

```typescript
      // vad omitido ⇒ silero embebido
    });
```
**Qué NO escribís:** VAD (Voice Activity Detection).
**Por detrás:** al omitir `vad`, la `AgentSession` auto-crea `inference.VAD({model:'silero'})`.
Silero = modelo chico de red neuronal que corre **local** (no API, sin costo/latencia de red) y
clasifica cada ~30ms de audio: ¿voz o silencio?
**Para qué sirve:** (1) segmenta audio para whisper (arriba). (2) **turn detection** — saber cuándo
el humano terminó de hablar para que el agente responda. (3) **interrupciones** — si el humano habla
mientras el agente habla, VAD lo detecta y corta el TTS. Todo gratis por omitir la línea.

---

## session.start

```typescript
    await session.start({ agent, room: ctx.room });
```
**Qué:** enciende todo. Recién acá empieza a escuchar.
**`agent`:** la identidad de arriba. **`room: ctx.room`:** la sala del job (objeto `Room` que
`ctx.connect()` ya conectó).
**Por detrás:** engancha el pipeline al audio entrante de la sala y arranca el bucle infinito:
```
escuchar audio → VAD segmenta → STT transcribe → LLM piensa → TTS sintetiza → publicar audio → repetir
```
`await` porque `start` corre hasta que la sesión termina (humano se va).

---

## cli.runApp (fuera de defineAgent)

```typescript
cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'secret',
}));
```
**Qué:** el bootstrap. Todo lo de arriba solo **definió**; esto **arranca** el proceso worker.
- **`agent: import.meta.filename`** — ruta de ESTE archivo. El worker la re-importa en cada subproceso
  de job para sacar el `entry`. `import.meta.filename` = ruta absoluta del módulo actual (equivalente
  moderno de `__filename`).
- **`wsURL: 'ws://localhost:7880'`** — dónde vive el server. `ws://` = WebSocket (local sin TLS). Por
  acá el worker recibe jobs y negocia WebRTC.
- **`apiKey: 'devkey'` / `apiSecret: 'secret'`** — credenciales dev del `livekit-server --dev`. El
  worker las usa para firmar su propio token de acceso (igual que el frontend pide token a
  `/api/token`, pero el worker se lo autofirma porque tiene el secret). **Nota:** el worker es proceso
  backend de confianza → puede tener el secret. El browser NO (por eso el frontend usa route handler).
**Por detrás — subcomandos:** `runApp` parsea `process.argv`. `tsx agent.ts dev` → modo desarrollo
(logs verbose). `start` = producción. `runApp` conecta al server, se registra como worker disponible,
y queda en loop esperando jobs.

---

## Flujo completo (mapa mental)

```
Humano habla (browser, mic)
   │ WebRTC track de audio
   ▼
livekit-server (SFU :7880) ──reenvía──► Worker (suscrito)
                                          │ VAD silero: ¿terminó de hablar?
                                          │ sí → clip de audio
                                          ▼
                                        STT whisper → "¿qué hora es?"
                                          ▼
                                        LLM gpt-4o-mini (+ instructions + historial)
                                          │ stream de tokens
                                          ▼
                                        TTS tts-1 → audio
                                          │ publica track
                                          ▼
livekit-server ──reenvía──► Humano escucha (browser)
```

**Conceptos cubiertos:**
- **SFU** — el server reenvía media, no la mezcla.
- **Pipeline** — 3 modelos independientes encadenados (vs Realtime = 1 modelo, Fase C).
- **VAD/turn-detection** — cuándo empieza/termina un turno, e interrupciones.
- **Streaming end-to-end** — LLM y TTS solapan para bajar latencia.
- **Worker como participante de confianza** — tiene el secret, se une por WebRTC como uno más.
