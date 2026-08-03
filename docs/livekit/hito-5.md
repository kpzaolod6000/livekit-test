# Hito 5 — Pipeline STT-LLM-TTS: conversación de voz + instrucciones de sistema (ambos LLM)

> Plan `learn-livekit-sdk`, **Fase B (Agents Pipeline)** — PRIMER hito con IA.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-streaming-fundamentals/spec.md`
> Ahora aparece el **2º proceso propio**: el **agent worker** (`@livekit/agents`).
> Reusa la app Next.js de Fase A (frontend + `/api/token`) como el "humano" que habla.

## TEORÍA

### Pipeline vs Realtime (los 2 modos de LiveKit Agents)
LiveKit Agents construye agentes de voz de 2 formas. Este hito es el **modo Pipeline**:
tres modelos encadenados —
**STT** (voz→texto) → **LLM** (texto→texto) → **TTS** (texto→voz).
Cada pieza es intercambiable. El modo Realtime (un solo modelo multimodal, ej. Gemini Live)
viene en Fase C. Empezamos por Pipeline porque hace visibles las 3 etapas por separado —
es el mejor sitio para ver "cambiar SOLO el LLM" sin tocar el resto.
FUENTE: https://docs.livekit.io/agents/ (overview) · docs de "Voice pipeline agent".

### AgentSession = el orquestador
`AgentSession` es el runtime que junta STT+LLM+TTS, detecta turnos (¿terminó de hablar el
humano?), maneja interrupciones y streamea el audio de vuelta a la sala. Vos le pasás las
piezas; él corre el bucle escucha→piensa→habla. Las **instrucciones de sistema** viven en un
objeto `Agent` (no en la session).
FUENTE: https://docs.livekit.io/agents/build/ (Building voice agents / AgentSession).

### VAD y turn-detection (por qué NO instalaste silero)
Para saber cuándo el humano dejó de hablar hace falta **VAD** (Voice Activity Detection).
En `@livekit/agents@1.5.3` la `AgentSession` **auto-provee un VAD silero embebido** si no pasás
uno — por eso el plugin silero no está en tus deps y no falta nada. (Verificado en los tipos
instalados: `vad?` omitido ⇒ `inference.VAD({ model: 'silero' })` por defecto; `null` = opt-out.)
FUENTE: tipos instalados `node_modules/@livekit/agents/dist/voice/agent_session.d.ts` (doc del campo `vad`).

### Arquitectura: aparece el 2º proceso
Fase A eran 2 procesos (app Next.js + `livekit-server`). Ahora **3**:
```
   App Next.js  ──┐
   (humano: mic)  │
                  ├──►  livekit-server --dev  ◄──  Agent worker
   /api/token  ───┘        (SFU, :7880)            (@livekit/agents + plugins)
```
El worker es un **cliente más** de la sala: se une con su propio token, se suscribe al audio del
humano y publica su audio TTS. No pasa por `/api/token` del browser — usa `wsURL/apiKey/apiSecret`
directo (devkey/secret).
FUENTE: https://docs.livekit.io/agents/ (worker lifecycle).

## API VERIFICADA (tipos instalados, @livekit/agents@1.5.3 + plugins 1.5.3)

⚠️ Fuente primaria = los `.d.ts` instalados (más fiable que cualquier link, es tu versión exacta).
Los links docs.livekit.io son de apoyo conceptual; si algún path exacto no carga, avisá y lo verifico.

### Piezas disponibles en TUS plugins
| Etapa | Plugin OpenAI (`@livekit/agents-plugin-openai`) | Plugin Google (`@livekit/agents-plugin-google`) |
|-------|--------------------------------------------------|--------------------------------------------------|
| STT   | ✅ `openai.STT({ model, language })` (whisper)   | ❌ no exporta STT |
| LLM   | ✅ `openai.LLM({ model, apiKey })`               | ✅ `google.LLM({ model, apiKey })` |
| TTS   | ✅ `openai.TTS({ model, voice })`                | ❌ no exporta TTS |

**Consecuencia clave para el dual-provider (task 5.3):** STT y TTS se quedan **fijos en OpenAI**;
lo único que cambia entre corridas es el `llm`. Eso ES el punto pedagógico del hito — "mismo
pipeline, distinto LLM" — expresado literalmente en el código.

### Esqueleto del worker (estructura, NO copiar entero — es tuyo implementarlo)
```typescript
import { cli, defineAgent, voice, ServerOptions, type JobContext } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();                       // el worker se une a la sala

    const agent = new voice.Agent({
      instructions: 'Sos un asistente de voz breve y amable. Respondé en español.',
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({ model: 'whisper-1', language: 'es' }),
      // 🔀 SOLO esta línea cambia entre providers (task 5.3):
      llm: new openai.LLM({ model: 'gpt-4o-mini' }),      // ó new google.LLM({ model: 'gemini-2.5-flash' })
      tts: new openai.TTS({ model: 'gpt-4o-mini-tts', voice: 'alloy' }),
      // vad: omitido ⇒ silero embebido automático
    });

    await session.start({ agent, room: ctx.room });
  },
});

cli.runApp(new ServerOptions({
  agent: import.meta.filename,
  wsURL: 'ws://localhost:7880',
  apiKey: 'devkey',
  apiSecret: 'secret',
}));
```
Notas verificadas en los tipos:
- La clase del CLI es **`ServerOptions`** (no `WorkerOptions`); `cli.runApp(new ServerOptions({...}))`.
- `instructions` va en `voice.Agent`, no en `AgentSession`.
- `session.start({ agent, room })` — `room` sale de `ctx.room`.
- API keys: podés pasarlas por opción (`apiKey`) o por env (`OPENAI_API_KEY`, `GOOGLE_API_KEY`
  / `GEMINI_API_KEY`) — confirmá el nombre exacto de env que lee el plugin google en sus tipos.

## CÓMO IMPLEMENTARLO

1. **Carpeta** `livekit/hito5/` con el worker (ej. `agent.ts`). Cargá `.env` (dotenv) para las keys.
2. **Instrucciones de sistema** propias en el `voice.Agent` (personalidad + idioma).
3. **Pipeline** OpenAI completo primero (STT whisper + LLM gpt-4o-mini + TTS). Correlo:
   ```bash
   # Terminal 1: livekit-server --dev
   # Terminal 2: cd livekit/nextjs-frontend && npm run dev
   # Terminal 3: tsx livekit/hito5/agent.ts dev     # o el subcomando que muestre el CLI
   ```
   Confirmá el subcomando exacto que imprime `cli.runApp` (típicamente `dev` / `start`).
4. **Habla con el agente**: abrí el frontend (1 pestaña basta), hablá por el mic → el agente
   responde con voz. Verificá en los logs del worker las 3 etapas (transcripción, respuesta, TTS).
5. **Dual-provider (5.3)**: cambiá SOLO la línea del `llm` a `google.LLM({ model:'gemini-2.5-flash' })`,
   reiniciá el worker, repetí. Mismo STT/TTS, misma estructura.

## LA TAREA (tasks 5.2–5.3) + CHECKPOINTS

- **5.2** Worker `AgentSession` (STT+LLM+TTS) + instrucciones de sistema, reusando token/cliente
  de Fase A. ✅ Checkpoint: hablás por el mic en el frontend Next.js y **escuchás la respuesta de
  voz** del agente; los logs del worker muestran transcripción→respuesta→TTS.
- **5.3** Mismo pipeline cambiando **solo el LLM** (OpenAI → Gemini). ✅ Checkpoint: ambas corridas
  funcionan; el diff entre ellas es **una sola línea** (el `llm`), STT y TTS intactos.

Criterio de cierre (spec `livekit-streaming-fundamentals`, 3 requisitos):
1. server self-hosted `--dev` corriendo · 2. `AgentSession` STT-LLM-TTS con instrucciones, humano
habla y escucha · 3. mismo pipeline, solo cambia el provider del LLM. App Next.js separada del worker.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 5.2 y 5.3.** Reviso y cierro en 5.4.
Frase de escape sigue disponible si necesitás que implemente yo.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor | 5.1 | ✅ entregado |
| worker AgentSession pipeline | 5.2 | ✅ `livekit/hito5/agent.ts` · checkpoint browser OK (habla→voz) |
| dual-provider LLM (OpenAI→Gemini) | 5.3 | ✅ swap de 1 línea (`google.LLM`), STT/TTS intactos |
| review final | 5.4 | ✅ cerrado — 3/3 requisitos spec `livekit-streaming-fundamentals` |

## Aprendido (dev-loop)
Ctrl+C en `tsx agent.ts dev` deja subprocesos huérfanos (worker de jobs + inference del VAD)
conectados al server → el reinicio no engancha hasta matar el server. Fix: `pkill -f agent.ts`
antes de reiniciar, o correr con `setsid` y matar el grupo entero; doble Ctrl+C salta el drain.
