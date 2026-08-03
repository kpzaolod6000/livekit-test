# Hito 0 — Setup: arquitectura de 3 procesos, self-host, herramientas de debug

> Plan `learn-livekit-sdk`. Modo self-hosted (`livekit-server --dev`, sin cuenta LiveKit Cloud).

## TEORÍA

### Por qué LiveKit no es "importar una librería y listo"

Los 3 planes anteriores (Gemini nativo, OpenAI nativo, Vercel AI SDK) eran 1-2 procesos:
un CLI, o un frontend + un endpoint. LiveKit es una **plataforma de infraestructura
WebRTC (un SFU — Selective Forwarding Unit) + un framework de Agents**. Para una app de
voz IA típica corren **3 procesos separados**:

```
┌─────────────┐   1) GET token   ┌──────────────────┐
│  Frontend    │ ───────────────▶ │ Servidor tokens  │
│ livekit-     │                  │ livekit-server-  │
│ client /     │                  │ sdk (mina JWT)   │
│ components-  │                  └──────────────────┘
│ react        │
│ (mic in/out) │   2) join con token (WebRTC)
└──────┬───────┘ ─────────────────────────────┐
       │                                        ▼
       │                         ┌──────────────────────────┐
       │                         │  livekit-server --dev     │
       │                         │  (SFU, 127.0.0.1:7880,    │
       │                         │   devkey / secret)        │
       │                         └──────────────────────────┘
       │                                        ▲
       │                                        │ 3) worker se auto-despacha
       │                         ┌──────────────────────────┐
       └────────── habla ───────▶│  Agent worker             │
                                  │  @livekit/agents +        │
                                  │  plugins de provider      │
                                  │  (proceso largo, aparte)  │
                                  └──────────────────────────┘
```

- **livekit-server** — el SFU. Enruta audio/video entre participantes de una *sala* (room).
  En `--dev` usa credenciales fijas `devkey`/`secret` y escucha en `127.0.0.1:7880`.
  FUENTE: https://docs.livekit.io/home/self-hosting/local/
- **Servidor de tokens** — antes de conectar, un cliente necesita un JWT firmado que le
  autoriza a entrar a una sala. Lo mina tu backend con `livekit-server-sdk` (clase
  `AccessToken` + `VideoGrant` + `await at.toJwt()`). Nunca expongas `secret` al frontend.
  FUENTE: https://docs.livekit.io/home/server/generating-tokens/
- **Agent worker** — proceso de larga duración que se registra contra el server y se
  *auto-despacha* a las salas. Ahí vive tu IA: un `AgentSession` que compone STT+LLM+TTS
  (modo Pipeline) o un modelo multimodal único (modo Realtime).
  FUENTE: https://docs.livekit.io/agents/

### AgentSession: los 2 modos

`AgentSession` (accedido en JS como `voice.AgentSession`) es el orquestador GA (desde 1.0,
agosto 2025) que reemplaza a los viejos `VoicePipelineAgent`/`MultimodalAgent`.

- **Pipeline** (Hitos 5-8): compones piezas — STT (ej. Deepgram) → LLM (OpenAI o Gemini) →
  TTS (ej. Cartesia) + VAD/turn-detection (ej. Silero). Comparás provider cambiando **solo el LLM**.
- **Realtime** (Hitos 9-12): un solo modelo speech-to-speech, sin STT/TTS separados.
  OpenAI (`gpt-realtime`) vs Gemini Live (`google.beta.realtime.RealtimeModel`).

> NOTA (reestructura): los **Hitos 1-4 son Fase A — Transport** (rooms, data/text streams,
> video/screenshare, webhooks — SIN IA). El framework de Agents recién entra en Hito 5.
> Ver `openspec/changes/learn-livekit-sdk/proposal.md`.

FUENTE: https://docs.livekit.io/agents/start/voice-ai/

### Herramientas de debug

- **Agent playground / Console** — el propio `@livekit/agents` CLI puede correr el worker
  en modo consola para hablarle sin frontend propio (`node ... dev` / modo console).
  FUENTE: https://docs.livekit.io/agents/
- **livekit-server --dev** imprime logs de conexión de sala y participantes en su terminal —
  es tu primer lugar para ver si el cliente y el worker realmente se unieron.

## PAQUETES VERIFICADOS (2026-07, dist-tag `latest`)

| Rol | Paquete | Versión |
|-----|---------|---------|
| Servidor tokens | `livekit-server-sdk` | 2.17.0 |
| Cliente | `livekit-client` | 2.20.2 |
| Cliente React (opcional) | `@livekit/components-react` | 2.9.23 |
| Framework agents | `@livekit/agents` | 1.5.3 (GA) |
| Plugin OpenAI | `@livekit/agents-plugin-openai` | 1.5.3 |
| Plugin Google/Gemini | `@livekit/agents-plugin-google` | 1.5.3 |
| STT Deepgram | `@livekit/agents-plugin-deepgram` | 1.5.3 |
| TTS Cartesia | `@livekit/agents-plugin-cartesia` | 1.5.3 |
| VAD Silero | `@livekit/agents-plugin-silero` | 1.5.3 |
| Turn-detection LiveKit | `@livekit/agents-plugin-livekit` | 1.5.3 |

- Node.js **>= 20** requerido (por docs; no forzado por `engines`).
- Los plugins van version-locked a la versión del core (1.5.3).
- Gemini Live JS: audio speech-to-speech soportado; **video input es Python-only**.
- Model string Gemini Live: preview con fecha (ej. `gemini-2.5-flash-native-audio-preview-12-2025`) —
  **verificar el string vigente en las docs al llegar a Hito 9** (los preview IDs cambian).

## CÓMO IMPLEMENTARLO (setup)

1. Instalar y correr el server:
   ```bash
   curl -sSL https://get.livekit.io | bash
   livekit-server --dev      # deja corriendo; 127.0.0.1:7880, devkey/secret
   ```
2. Confirmar keys en `.env`: `OPENAI_API_KEY`, `GEMINI_API_KEY` (o `GOOGLE_API_KEY`).
   Para el pipeline necesitarás además keys de STT/TTS (Deepgram/Cartesia) — recién en Hito 5.
3. Instalar deps base (las STT/TTS específicas se deciden en Hito 5):
   ```bash
   npm install livekit-server-sdk livekit-client \
     @livekit/agents @livekit/agents-plugin-openai @livekit/agents-plugin-google \
     @livekit/agents-plugin-silero
   ```

## LA TAREA (Hito 0)

1. Dejar `livekit-server --dev` corriendo y confirmar el puerto 7880.
2. Confirmar keys OpenAI + Gemini en `.env`.
3. Hacer `npm install` de los paquetes de arriba y confirmar que resuelven a las versiones
   de la tabla.

Cerrás Hito 0 cuando: server corriendo + keys presentes + deps instaladas. Luego pasamos a Hito 1.
