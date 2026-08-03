# Hito 9 — Realtime: sesión bidireccional con modelo multimodal único (texto + audio)

> Plan `learn-livekit-sdk`, **Fase C (Agents Realtime)** — arranca la fase núcleo de tu migración.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-realtime-streaming/spec.md`
> A partir de acá NO hay pipeline STT-LLM-TTS separado — un solo modelo multimodal maneja audio+texto de punta a punta.

## TEORÍA

### Qué cambia vs Fase B (Hitos 5-8)
En Fase B, `AgentSession({ stt, llm, tts })` componía 3 piezas: el LLM solo "pensaba" texto, y vos (o el framework)
orquestaba transcribir el audio de entrada y sintetizar el de salida. En Realtime, el **modelo mismo** recibe
audio/texto crudo y devuelve audio/texto crudo — no hay transcripción intermedia orquestada por el framework
(aunque el modelo puede emitir transcripciones como metadata). `AgentSession` en Node se configura con un único
`llm: RealtimeModel` en vez de `{stt, llm, tts}`.
FUENTE: https://docs.livekit.io/agents/build/realtime/ (Realtime models) · tipos instalados
`node_modules/@livekit/agents/dist/llm/realtime.d.ts` (`RealtimeModel`, `RealtimeSession` abstractos que implementan los plugins).

### Mapeo de migración: tu app Gemini Live nativa → LiveKit Agents
Esto es lo que hace viable migrar tu proyecto existente. Verificado contra `@google/genai` nativo (que ya usás)
y `@livekit/agents-plugin-google@1.5.3` (lo que vas a usar acá):

| Gemini Live nativo (tu app actual) | LiveKit Agents (Node, este hito) |
|---|---|
| `ai.live.connect({ model, config, callbacks })` | `new voice.AgentSession({ llm: new google.realtime.RealtimeModel({ model, voice, ... }) })` |
| `session.sendRealtimeInput({ audio })` (audio del mic) | track de micrófono publicado a la sala (`ctx.room`) — el framework lo alimenta al modelo automático, no lo llamás vos |
| `session.sendClientContent({ turns })` (texto) | `session.generateReply({ userInput: texto })` — verificado en `dist/voice/agent_session.js:593`, funciona igual en pipeline y realtime |
| `callbacks.onmessage` (audio+texto de vuelta) | audio: track de salida a la sala (automático) · texto: `MessageGeneration.textStream` por mensaje (`dist/llm/realtime.d.ts`) — se expone vía transcripción, mismo mecanismo que en pipeline |
| Cerrar con `session.close()` | `await session.close()` en el `RealtimeSession`, o simplemente terminar el job del worker |

CONCEPTO CLAVE: tu app nativa YA está pensada en términos de "sesión bidireccional con un modelo que hace todo" —
por eso Realtime en LiveKit es el destino natural, no el pipeline de Fase B. Todo lo de Fase B (tools, RAG) SÍ
se reusa conceptualmente acá (Hitos 10-12), solo cambia el `llm` de `AgentSession`.

### Los dos providers Realtime — API distinta por plugin (verificado en código instalado, no en docs)
No son simétricos. Verificado leyendo `node_modules/@livekit/agents-plugin-{openai,google}/dist/realtime/*.js`:

**OpenAI** (`@livekit/agents-plugin-openai@1.5.3`):
```typescript
import * as openai from '@livekit/agents-plugin-openai';
new openai.realtime.RealtimeModel({
  model: 'gpt-realtime',            // default si omitís model
  voice: 'marin',                   // default
  modalities: ['text', 'audio'],    // strings en minúscula
});
```
Requiere `OPENAI_API_KEY` (env o `apiKey` explícito). Namespace: `openai.realtime.RealtimeModel` (NO hay `.beta`).

**Google** (`@livekit/agents-plugin-google@1.5.3`):
```typescript
import * as google from '@livekit/agents-plugin-google';
import { Modality } from '@google/genai';
new google.realtime.RealtimeModel({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',  // default si omitís model
  voice: 'Puck',                    // default
  apiKey: process.env.GEMINI_API_KEY,  // ojo: el fallback interno lee GOOGLE_API_KEY, no GEMINI_API_KEY — pasalo explícito como venís haciendo en Hitos 5-8
  modalities: [Modality.AUDIO],     // enum de @google/genai, NO strings — a diferencia de OpenAI
});
```
**Corrección vs lo verificado en Hito 0:** ahí decía `google.beta.realtime.RealtimeModel`. Sigue funcionando
(`beta.realtime` es un re-export), pero el módulo `realtime` ya está también al nivel raíz del plugin —
`google.realtime.RealtimeModel` es el path más directo, usalo así.

CONCEPTO: **"mismo componente, mismo AgentSession, un solo `llm` distinto"** sigue siendo el patrón dual-provider
de Hitos 5-8 — pero acá la construcción de cada `RealtimeModel` no es intercambiable 1:1 en las opciones
(modalities como string vs enum, defaults de modelo/voice distintos). El `AgentSession` que lo envuelve sí es
idéntico en ambos casos.

### Entrada de texto en la misma sesión (el corazón de 9.4)
No hay una tool ni un hook especial — es un método directo en `AgentSession`, el mismo para pipeline y realtime
(verificado `dist/voice/agent_session.js:593-637`):
```typescript
session.generateReply({ userInput: 'texto que el usuario escribió' });
```
Por detrás: envuelve el string en un `ChatMessage({ role: 'user', content })` y dispara una generación — funciona
sin tocar el estado de audio en curso. Para RECIBIR el texto desde la sala (el cliente lo tipea en la UI), usás
el mismo mecanismo de Hito 2: `room.registerTextStreamHandler(topic, handler)` en el worker, y en el handler
llamás `session.generateReply({ userInput: text })`.

### Salida en texto (transcripción) además de audio
Cada generación expone `MessageGeneration.textStream` (ReadableStream) junto con `audioStream` — verificado
`dist/llm/realtime.d.ts:11-19`. El framework ya expone esto como transcripción hacia la sala (mismo mecanismo
que uds vieron implícito en Hitos 5-8 vía `@livekit/components-react`, que consume transcripciones automáticamente
para renderizar subtítulos). No necesitás código nuevo para "que exista" texto de salida — necesitás renderizarlo
en el cliente (eso ya lo trae `@livekit/components-react`; se aprovecha completo en Hito 13).

## CÓMO IMPLEMENTARLO

1. **Carpeta** `livekit/hito9/agent.ts`. Base: estructura de Hito 5 (`entry`, `ctx.connect()`, `cli.runApp`), pero
   SIN `stt`/`tts` — un solo `llm: RealtimeModel`.
2. **`AgentSession` Realtime:**
   ```typescript
   const session = new voice.AgentSession({
     llm: new openai.realtime.RealtimeModel({ modalities: ['text', 'audio'] }),
     // llm: new google.realtime.RealtimeModel({ apiKey: process.env.GEMINI_API_KEY, modalities: [Modality.AUDIO] }),
   });
   ```
   `voice.Agent` con `instructions` igual que siempre — no hace falta `RagAgent` ni tools en este hito (eso es H10-12).
3. **Texto entrante:** registrá un text stream handler en el `ctx.room` (patrón de Hito 2, topic ej. `'lk.chat'` o
   uno propio) que, al recibir texto, llame `session.generateReply({ userInput: text })`.
4. **Audio:** no hace falta código nuevo — el track de mic publicado desde el cliente (Fase A) ya alimenta al
   `RealtimeModel` automáticamente vía el `AgentSession`.
5. **Correr:** mismos 3 procesos de siempre. Probá primero solo con audio (hablá), después mandá texto desde
   algún cliente que ya tenga el publish de texto (Hito 2) o un script simple que llame al mismo mecanismo.
6. **Dual-provider (9.3):** swap del `llm` completo (no es 1 línea limpia como en Fase B, porque `modalities`
   tiene tipos distintos por provider — dejá ambas construcciones comentadas, una activa a la vez).

## LA TAREA (tasks 9.2–9.4) + CHECKPOINTS

- **9.2** `AgentSession` Realtime sin pipeline STT/TTS separado. ✅ Checkpoint: hablás, el agente responde en
  audio, sin ver en el código ningún `stt:`/`tts:` en el `AgentSession`.
- **9.3** Mismo componente contra `gpt-realtime` y Gemini Live. ✅ Checkpoint: swap del `llm`, misma conversación
  de voz funciona con ambos (atento a la cuota free-tier de Gemini si iterás rápido, ver nota en Hito 7/8).
- **9.4** Entrada por texto además de audio en la misma sesión, salida disponible en texto y audio. ✅ Checkpoint:
  mandás un mensaje de texto (sin hablar) → el agente responde (en audio); confirmás que hay transcripción de
  esa respuesta disponible como texto (no solo audio).

Criterio de cierre (spec `livekit-realtime-streaming`): 1. conversación de voz bidireccional con modelo único,
sin pasos separados de transcripción/síntesis orquestados por la app · 2. mismo agente sostiene la conversación
con ambos providers Realtime · 3. entrada/salida de texto conviven con audio en la misma sesión, sin conexión
separada · 4. TEORÍA (esta doc) incluye el mapeo desde la API nativa Gemini Live.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 9.2, 9.3, 9.4.** Reviso y cierro en 9.5.
Frase de escape disponible si hay presión de tiempo genuina.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor (teoría + mapeo Gemini Live nativo) | 9.1 | ✅ (esta doc) |
| AgentSession Realtime sin pipeline separado | 9.2 | ✅ confirmado por usuario (voz→respuesta sin pipeline separado) |
| dual-provider Realtime | 9.3 | ✅ confirmado por usuario (Gemini Realtime funcionando) |
| texto + audio en la misma sesión | 9.4 | ✅ confirmado por usuario (log `[TEXT IN]`, respuesta + transcripción visibles) |
| review final vs `livekit-realtime-streaming` | 9.5 | ✅ cerrado — 4/4 requisitos OK |

Ver línea por línea en `docs/livekit/hito9-doccode.md`. **Hito 9 cerrado.** Arranca Hito 10 (Realtime + Tools).
