# Hito 9 — doccode (línea por línea): `livekit/hito9/agent.ts`

> QUÉ hace / QUÉ pasa por detrás / CONCEPTO — implementado por mentor bajo frase de escape ("necesito que lo implementes tu").
> Verificado contra `@livekit/agents@1.5.3`, `@livekit/agents-plugin-{openai,google}@1.5.3`, `@google/genai` instalado. Falta checkpoint en vivo.

## Imports (líneas 1–5)

```typescript
import 'dotenv/config';
import { cli, defineAgent, voice, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';
```
- **`Modality` (nuevo, de `@google/genai`)** — QUÉ: enum que usa el `RealtimeModel` de Google para `modalities` (`Modality.AUDIO`, `Modality.TEXT`). POR DETRÁS: verificado en `dist/realtime/realtime_api.js` — `google.realtime.RealtimeModel` NO acepta strings ahí, a diferencia de `openai.realtime.RealtimeModel` que sí toma `['text','audio']`. Importado pero usado solo en la línea comentada (swap a Gemini); no rompe el build tenerlo sin usar en la rama activa.
- Nada más es nuevo — mismos imports base de siempre.

## El Agent — sin RAG ni tools (líneas 11–13)

```typescript
const agent = new voice.Agent({
  instructions: 'Asistente breve en español. Respondé en voz y por texto según cómo te escriban.',
});
```
- QUÉ: `voice.Agent` plano, no `RagAgent` (Hito 7) ni con `tools` (Hito 6/8). POR DETRÁS: este hito es sobre EL MODELO (realtime vs pipeline), no sobre capacidades adicionales — RAG/tools sobre Realtime son Hitos 10-12. CONCEPTO: separar variables — no mezclar "cambio de modelo" con "cambio de capacidades" en el mismo checkpoint.

## El punto central del hito — `AgentSession` con un solo `llm` Realtime (líneas 16–23)

```typescript
const session = new voice.AgentSession({
  llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
  // llm: new google.realtime.RealtimeModel({
  //   apiKey: process.env.GEMINI_API_KEY,
  //   modalities: [Modality.AUDIO],
  // }),
});
```
- **Ausencia de `stt`/`tts`** — QUÉ: es LA diferencia estructural vs Hitos 5-8. POR DETRÁS: `AgentSession` acepta `llm` como un `RealtimeModel` (implementa la interfaz abstracta `llm.RealtimeModel` de `dist/llm/realtime.d.ts`) en vez de un LLM de texto plano — el framework detecta el tipo y cambia su comportamiento interno (no orquesta STT/TTS separados, delega audio in/out directo al modelo). CONCEPTO: **realtime = el modelo consume/produce audio nativamente**; pipeline = el modelo solo ve/produce texto y vos (o el framework) agregás STT/TTS alrededor.
- **`openai.realtime.RealtimeModel({ modalities: ['text','audio'] })`** — QUÉ: instancia activa (OpenAI). POR DETRÁS: `modalities` default ya es `['text','audio']` (verificado `DEFAULT_REALTIME_MODEL_OPTIONS` en `dist/realtime/realtime_model.js`) — pasarlo explícito es redundante pero documenta la intención de que ambas modalidades conviven (requisito 9.4). Model default `'gpt-realtime'`, voice default `'marin'` — no hace falta especificarlos.
- **Línea comentada `google.realtime.RealtimeModel`** — QUÉ: la rama para 9.3 (swap dual-provider). POR DETRÁS: a diferencia del swap de 1 línea de Hitos 5-8, acá cambian también las OPTIONS: `modalities` es `[Modality.AUDIO]` (enum), no `['text','audio']` (strings) — verificado que el constructor de Google usa `Modality` de `@google/genai`, el de OpenAI usa strings literales. `apiKey` explícito porque el fallback interno de Google lee `process.env.GOOGLE_API_KEY`, no `GEMINI_API_KEY` (verificado en `realtime_api.js`: `options.apiKey || process.env.GOOGLE_API_KEY`) — sin este dato el swap fallaría silenciosamente si solo tenés `GEMINI_API_KEY` en el `.env`. CONCEPTO: el dual-provider en Realtime no es un swap simétrico como en Fase B — cada plugin tiene su propio shape de opciones.

## Texto entrante — el equivalente de `sendClientContent` (líneas 27–31)

```typescript
ctx.room.registerTextStreamHandler('chat', async (reader, info) => {
  const text = await reader.readAll();
  console.log(`[TEXT IN] de ${info.identity}: "${text}"`);
  session.generateReply({ userInput: text });
});
```
- **`ctx.room.registerTextStreamHandler('chat', ...)`** — QUÉ: mismo mecanismo de Hito 2 (`registerTextStreamHandler`), pero ahora del lado del WORKER (`ctx.room`, tipo `@livekit/rtc-node` Room), no del cliente browser. POR DETRÁS: verificado que `@livekit/rtc-node` expone la misma API que `livekit-client` (`dist/audio_stream-*.d.ts:300`, mismo `TextStreamHandler`). Topic `'chat'` elegido a propósito: es el mismo que ya usa el cliente de Hito 1/2 (`localParticipant.sendText(text, {topic:'chat'})`) — así el cliente existente ya sirve sin cambios para probar este hito.
- **`await reader.readAll()`** — junta el stream completo en un string (igual que Hito 2).
- **`console.log('[TEXT IN] ...')`** — mismo patrón de logging que el `[RAG]` de Hito 7/8: sin esto, no hay forma de confirmar en consola que el texto llegó al worker antes de ver (o no) la respuesta.
- **`session.generateReply({ userInput: text })`** — QUÉ: el equivalente Node de `sendClientContent()`. POR DETRÁS: verificado en `node_modules/@livekit/agents/dist/voice/agent_session.js:593-600` — envuelve el string en `new ChatMessage({ role:'user', content: text })` y dispara una generación en la `activity` actual. Es un método de `AgentSession`, NO del `RealtimeSession` del plugin — por eso funciona igual sin importar si el `llm` es OpenAI o Gemini Realtime (o incluso un LLM de pipeline). CONCEPTO: **la entrada de texto no depende del provider** — es una capa que el framework unifica arriba de cualquier `llm`, a diferencia de la construcción del `RealtimeModel` en sí (que sí difiere por provider, ver arriba).
- **No se llama con `await`** — `generateReply` no bloquea la recepción de más texto/audio mientras genera; devuelve un handle de la generación en curso (no lo usamos acá, alcanza con dispararla).

## Salida en texto (9.4, sin código nuevo)
No hay línea de código para esto en este archivo — `MessageGeneration.textStream` (verificado `dist/llm/realtime.d.ts:11-19`) ya lo expone el framework como transcripción hacia la sala, consumible del lado cliente con `@livekit/components-react` (mismo mecanismo que Hitos 5-8, no exclusivo de Realtime). El checkpoint de 9.4 es CONFIRMAR que esa transcripción está disponible, no escribir el mecanismo.

## El ciclo completo de una sesión Realtime con texto+audio
1. Cliente publica track de mic (Fase A) → llega directo al `RealtimeModel` vía `AgentSession`, sin STT intermedio orquestado por vos.
2. Si el cliente en cambio manda texto por `sendText(..., {topic:'chat'})` → `registerTextStreamHandler` lo recibe → `session.generateReply({userInput})` dispara la misma clase de generación que si hubiera hablado.
3. El modelo (OpenAI o Gemini Realtime) genera la respuesta con audio Y texto (transcripción) en la misma `MessageGeneration`.
4. Audio sale por track de la sala; texto sale por el canal de transcripción — ambos disponibles simultáneamente, sin abrir una segunda conexión.

Diferencia clave vs Fase B: acá NO hay una llamada a STT para transcribir lo que el humano dijo, ni una llamada a TTS para sintetizar la respuesta — el `RealtimeModel` hace ambas cosas como parte de la misma conversación bidireccional.
