## Why

El usuario completó los planes de mentoría de 8 hitos con los SDKs nativos de Gemini (`@google/genai`), OpenAI (`openai`) y la capa de abstracción Vercel AI SDK (`ai`) — ver `openspec/changes/archive/` y `openspec/changes/learn-vercel-ai-sdk/`. Ahora quiere aprender **LiveKit** con un objetivo concreto: **migrar un proyecto propio existente** que hoy usa la **API nativa de Gemini Live** (`live.connect` → `sendClientContent` para texto, `sendRealtimeInput` para audio, respuestas streameadas por `onmessage`) hacia una app realtime construida sobre LiveKit self-hosted.

La app objetivo es un **chat multimodal en tiempo real** con dos secciones — texto y audio — soportando entrada por texto y por audio, y salida por texto y por audio, con **tools** y **RAG**, comparando providers **Gemini** y **OpenAI**. A diferencia de los SDKs anteriores ("mismo código, cambia el provider"), LiveKit es una **plataforma de infraestructura WebRTC/SFU + framework de Agents**, con arquitectura de 3 procesos (servidor de tokens, frontend cliente, agent worker) sobre servidor propio.

**Verificado en vivo (docs.livekit.io, exploración):** LiveKit Agents soporta Gemini Live API como modelo realtime **también en Node.js/JavaScript** (no es Python-only). Paquete: `@livekit/agents-plugin-google`; modelo Node de ejemplo: `gemini-2.5-flash-native-audio-preview-12-2025`; soporta modalidades AUDIO + TEXT. Esto hace la migración viable.

## What Changes

- Se define un **plan de estudios de 15 hitos (H0–H14)** en 4 fases: **A) Transport** (plataforma WebRTC pura), **B) Agents Pipeline** (STT-LLM-TTS), **C) Agents Realtime** (modelo multimodal único — el núcleo de la migración), **D) Integración** (la app de chat objetivo + bonus).
- **Fase A (Transport, H1–H4)** cubre la plataforma completa provider-agnostic: rooms/participants + audio tracks, data (text streams / byte streams / RPC — base de la sección texto del chat), media avanzado (video + screenshare), y server-side (room management + webhooks). Estos hitos NO llevan comparación dual de provider (no hay LLM).
- **Fase B (Pipeline, H5–H8)** replica las 4 progresiones ya conocidas (streaming → tools → RAG → RAG+tools) en modo pipeline, comparando LLM **OpenAI vs Gemini**.
- **Fase C (Realtime, H9–H12)** replica las mismas 4 progresiones con modelo realtime único, comparando `openai('gpt-realtime')` vs Gemini Live (`gemini-2.5-flash-native-audio-preview-12-2025`). **H9 incluye explícitamente modalidad texto dentro de la sesión realtime** y el **mapeo conceptual desde la API nativa de Gemini Live** — el corazón de la migración del usuario.
- **Fase D (Integración)**: **H13** construye la UI de chat de 2 secciones (texto+audio, las 4 rutas de modalidad, con tools+RAG) = la app objetivo equivalente a lo que se migra. **H14 (bonus)** multi-agent handoffs + turn-detection avanzado.
- **Self-hosting obligatorio**: `livekit-server --dev` local (`devkey`/`secret`), sin cuenta LiveKit Cloud.
- Se reutiliza el **comportamiento del mentor** (`mentor-interaction-rules`) con la regla ya agregada: TEORÍA SHALL ir siempre acompañada de su FUENTE (link a documentación oficial).
- **Regla de arquitectura (actualizada a Next.js)**: el frontend es una app **Next.js (App Router)** con `@livekit/components-react`, que además **hospeda el servidor de tokens como route handler** (`app/api/token/route.ts`, usando `livekit-server-sdk` server-side). Esto colapsa la arquitectura a **2 procesos propios** — (1) app Next.js (frontend + emisión de tokens), (2) agent worker (`@livekit/agents` + plugins) — más el `livekit-server` self-hosted. El frontend vanilla-ts previo (`livekit/hito1/`) se conserva como referencia, no se borra.

## Alcance final al cierre (2026-07-28)

Este change se cierra con **Fases A, B y C completas (H0–H12)**. La **Fase D (H13 UI de chat, H14
bonus multi-agent, H14.5 retro)** se movió por decisión del usuario a un proyecto propio en
`/home/judal/Project/livekit` (change `livekit-chat-app`), junto con el código de H0–H12, los docs y
los delta specs `livekit-chat-ui` / `livekit-multi-agent-handoffs`. Ver la nota en `tasks.md`.

## Capabilities

### New Capabilities
- `livekit-transport-rooms`: Hito 1 — rooms + participants + audio track publish/subscribe + tokens JWT, contra server self-hosted, sin IA.
- `livekit-transport-data`: Hito 2 — data channels: **text streams** (base de la sección texto), byte streams y RPC entre participantes, sin IA.
- `livekit-transport-media`: Hito 3 — video track + screenshare + adaptación de calidad de la plataforma.
- `livekit-transport-server`: Hito 4 — administración de salas server-side y webhooks con `livekit-server-sdk`.
- `livekit-streaming-fundamentals`: Hito 5 — pipeline STT-LLM-TTS, voz + instrucciones de sistema, ambos providers de LLM.
- `livekit-function-calling`: Hito 6 — tools/function calling sobre el pipeline, ambos providers.
- `livekit-rag`: Hito 7 — RAG sobre el pipeline, ambos providers.
- `livekit-rag-with-tools`: Hito 8 — RAG + tools sobre el pipeline, ambos providers.
- `livekit-realtime-streaming`: Hito 9 — modelo realtime único; comparación OpenAI Realtime vs Gemini Live; **modalidad texto + audio en la sesión**; mapeo desde Gemini Live nativo.
- `livekit-realtime-tools`: Hito 10 — Realtime con tools, ambos providers.
- `livekit-realtime-rag`: Hito 11 — Realtime con contexto RAG, ambos providers.
- `livekit-realtime-rag-with-tools`: Hito 12 — Realtime combinando RAG + tools, ambos providers.
- ~~`livekit-chat-ui`: Hito 13~~ y ~~`livekit-multi-agent-handoffs`: Hito 14~~ — **movidas** al proyecto
  `/home/judal/Project/livekit` (change `livekit-chat-app`), ver "Alcance final al cierre".

### Modified Capabilities
- `mentor-interaction-rules`: regla ya agregada — TEORÍA SHALL ir acompañada de su FUENTE (link a documentación oficial), aplicable a todos los hitos de este plan. La frase de escape ("necesito que lo implementes tu") permanece sin cambios.

## Impact

- **Objetivo de migración**: el plan está ordenado para habilitar la migración de la app Gemini Live nativa del usuario; la ruta crítica es la Fase C (Realtime), pero la Fase A da la base de plataforma (incluida la modalidad texto vía data channels) y la Fase B da el modo alternativo pipeline como contraste conceptual.
- **Código**: arquitectura de 2 procesos propios (app Next.js que sirve frontend + route handler de tokens, y agent worker) sobre `livekit-server` self-hosted. El cliente vanilla-ts inicial (`livekit/hito1/`) queda archivado como referencia.
- **Infraestructura**: requiere instalar y correr `livekit-server` localmente (`livekit-server --dev`), sin cuenta LiveKit Cloud.
- **Dependencias**: `next` + `react` + `@livekit/components-react` (frontend), `livekit-server-sdk` (route handler de tokens y ops server-side), `@livekit/agents` + plugins de provider (worker). `livekit-client` queda como dependencia transitiva de components-react. Confirmado en vivo: `@livekit/agents-plugin-google` (Gemini, incl. realtime en Node); el plugin OpenAI y el nombre exacto de versión se confirman en Hito 0.
- **Alcance**: gobierna el contenido técnico de los 15 hitos; el comportamiento del mentor sigue regido por `mentor-interaction-rules`.
