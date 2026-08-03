## Context

Los 3 planes previos (Gemini nativo, OpenAI nativo, Vercel AI SDK) usaron arquitecturas relativamente simples: CLI puro en Node (Hitos 1-4 de cada plan), y en los Hitos Realtime/5-8, WebSocket directo o (en Vercel AI SDK) un frontend React + endpoint de servidor de 2 piezas. LiveKit cambia esto: es una plataforma de infraestructura (WebRTC/SFU) + framework de Agents, no una librería que se importa y listo. Requiere un proceso de servidor corriendo (self-hosted, sin cuenta cloud), y la construcción típica de una app de voz IA involucra 3 procesos separados en vez de 1-2.

El usuario es nuevo en esta herramienta (OpenSpec) y en LiveKit específicamente — nunca usó WebRTC, tokens de sala, ni el modelo pipeline vs realtime propio de LiveKit Agents.

## Goals / Non-Goals

**Objetivo de negocio del usuario:** migrar un proyecto propio que hoy usa la **API nativa de Gemini Live** (`live.connect` → `sendClientContent` para texto, `sendRealtimeInput` para audio, respuestas por `onmessage`) hacia una app de **chat multimodal realtime** (secciones texto + audio, entrada y salida en ambas, tools + RAG, providers Gemini y OpenAI) sobre LiveKit self-hosted. El plan está ordenado para habilitar esa migración: ruta crítica = Fase C (Realtime).

**Goals:**
- Mantener la paridad estructural con los 3 planes anteriores: TEORÍA + CÓMO IMPLEMENTARLO + LA TAREA por hito, avance secuencial estricto, comparación dual-provider en los hitos con LLM.
- Cubrir **LiveKit Transport completo** (Fase A, H1–H4) como base de plataforma: rooms/participants + audio tracks, data (text/byte streams + RPC — base de la sección texto), media (video + screenshare), server-side (room mgmt + webhooks). Provider-agnostic, sin comparación dual.
- Cubrir los 2 modos de construcción de agentes LiveKit — Pipeline STT-LLM-TTS (Fase B) y Realtime con modelo multimodal único (Fase C) — con las 4 progresiones (streaming → tools → RAG → RAG+tools), comparando OpenAI vs Gemini.
- Cubrir **modalidad texto dentro de la sesión Realtime** (H9) y el **mapeo conceptual desde Gemini Live nativo**, por ser el corazón de la migración.
- Culminar en la **app objetivo** (H13): UI de chat 2 secciones con las 4 rutas de modalidad, tools y RAG.
- Operar 100% self-hosted: sin cuenta LiveKit Cloud, usando `livekit-server --dev` local.
- Mantener la regla de citar FUENTE en cada TEORÍA (`mentor-interaction-rules`).
- Incluir un hito bonus (H14) de multi-agent handoffs / turn-detection avanzado, exclusivo de LiveKit.

**Non-Goals:**
- No se cubre despliegue a producción (load balancing, escalado de agent workers, LiveKit Cloud) — el plan es estrictamente local/self-hosted para aprendizaje.
- No se cubre SIP/telefonía ni E2EE encryption (posible extensión futura; el usuario eligió transport completo sin encryption).
- No se re-explica RAG o tools desde cero — se asume el usuario ya domina esos conceptos de los planes anteriores; el foco es cómo se expresan dentro del modelo de LiveKit Agents.

## Decisions

**Arquitectura (ACTUALIZADA a Next.js — 2 procesos propios + server):**

Decisión de migración de frontend (mid-plan): se pasa de un cliente vanilla-ts (Vite) +
token-server Node separado, a una **app Next.js (App Router)** que usa `@livekit/components-react`
y **hospeda el token server como route handler** (`app/api/token/route.ts`). Esto colapsa 3
procesos propios a 2. El cliente vanilla-ts previo (`livekit/hito1/`) se conserva como referencia.

```
┌───────────────────────────────────┐        ┌─────────────────┐
│  App Next.js (App Router)          │        │  Agent worker    │
│  - UI con @livekit/components-react│        │  (@livekit/      │
│  - /api/token (route handler,      │        │  agents +        │
│    livekit-server-sdk, mina JWT)   │        │  plugin provider)│
│  - mic/cámara in/out               │        │  proceso aparte  │
└──────┬─────────────────────────────┘        └────────┬─────────┘
       │                                                 │
       └──────────────► livekit-server --dev ◄───────────┘
                        (self-host local, devkey/secret, 127.0.0.1:7880)
```
El `secret` sigue viviendo server-side (dentro del route handler), nunca en el bundle del cliente.
Alternativa descartada: usar solo el server SDK sin agent worker (lógica IA embebida en el backend)
— no es el patrón de LiveKit Agents y perdería turn-detection/interrupciones automáticas.
Alternativa descartada: mantener token-server como proceso Node aparte — innecesario en Next.js,
donde un route handler cumple el mismo rol dentro de la misma app.

**Self-host vs LiveKit Cloud:** self-host elegido explícitamente por el usuario — evita dependencia de cuenta externa, mantiene el plan reproducible localmente igual que los 3 planes anteriores (que solo requerían API keys de provider, sin cuentas de infraestructura adicionales).

**Dual-provider por hito (Pipeline: LLM OpenAI vs Gemini; Realtime: `gpt-realtime` vs `gemini-3.1-flash-live-preview`):** mantiene el punto pedagógico ya validado en los 3 planes previos — comparar el mismo concepto entre providers. Se implementa vía los plugins de provider de `@livekit/agents` (nombres exactos de paquete a confirmar en vivo en Hito 0, mismo patrón usado para verificar modelos Gemini/OpenAI en planes anteriores).

**Hito 9 bonus sin comparación dual obligatoria:** multi-agent handoffs y turn-detection avanzado son features de orquestación de LiveKit Agents, no de un modelo de IA específico — forzar comparación de provider ahí no aporta valor pedagógico adicional; queda a discreción de mentor/usuario si se prueba con uno o ambos providers.

**Regla de FUENTE en TEORÍA:** agregada a `mentor-interaction-rules` como requisito nuevo, exclusivo de este plan en la práctica (aplica a todos los mentores hacia adelante por ser la misma capability compartida, pero motivado por la necesidad de este plan de verificar contra documentación de una plataforma nueva y menos familiar).

## Risks / Trade-offs

- **[Riesgo, parcialmente resuelto] Nombres de paquete npm de plugins LiveKit Agents.** Plugin Google confirmado en vivo (`@livekit/agents-plugin-google`); resta confirmar plugin OpenAI y versiones exactas del cliente/server SDK → Mitigación: Hito 0 confirma lo pendiente antes de entregar contenido.
- **[Riesgo] Self-host introduce un proceso de infraestructura adicional (livekit-server) que el usuario debe mantener corriendo durante toda la sesión** → Mitigación: Hito 0 cubre instalación y arranque en modo `--dev`, con credenciales fijas (devkey/secret) para reducir fricción de configuración.
- **[Riesgo] 3 procesos simultáneos (server, token endpoint, agent worker) más complejo de depurar que los planes anteriores (1-2 piezas)** → Mitigación: Agent Console / herramientas de debug de LiveqKit se introducen en Hito 0-1 antes de pedir implementación de piezas propias.
- **[Trade-off] Hito 9 no obligatoriamente dual-provider** → aceptado explícitamente: es un hito bonus de orquestación, no de comparación de modelos.

## Hechos verificados en vivo (docs.livekit.io)

- **Gemini Live API SÍ soportado como realtime model en Node.js/JavaScript** (no es Python-only; los únicos Python-only son Amazon Nova Sonic, NVIDIA PersonaPlex, Ultravox). → la migración de la app Gemini Live nativa del usuario es viable sobre LiveKit Node.
- Paquete Node del plugin Google: `@livekit/agents-plugin-google@1.x`; import `import * as google from '@livekit/agents-plugin-google';`.
- Modelo realtime Gemini (ejemplo Node en docs): `gemini-2.5-flash-native-audio-preview-12-2025`. Construcción: `new google.beta.realtime.RealtimeModel({ model, voice, temperature, instructions })`.
- Modalidades del RealtimeModel: `["AUDIO"]` por defecto, configurable a `["TEXT"]`; soporta entradas de texto, audio y video. → cubre la modalidad texto+audio del chat objetivo.

**Mapeo de migración (Gemini Live nativo → LiveKit Agents):**
| Gemini Live nativo | LiveKit Agents |
|---|---|
| `live.connect()` | `new voice.AgentSession({ llm: RealtimeModel })` |
| `sendRealtimeInput()` (audio) | track de micrófono publicado a la sala |
| `sendClientContent()` (texto) | entrada de texto / data stream a la sesión |
| `session.onmessage` (respuesta) | track de audio de salida + transcripción de texto |

## Open Questions

- Nombre/versión exacta del plugin OpenAI Realtime en Node y de `livekit-client`/`@livekit/components-react`/`livekit-server-sdk` — confirmar en Hito 0 (Google ya confirmado arriba).
- Detalle de cómo se envía la entrada de texto a un `AgentSession` Realtime en Node (API exacta para el equivalente de `sendClientContent`) — confirmar en vivo al llegar a Hito 9.
