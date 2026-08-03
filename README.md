# genai_geminiv2 — laboratorio de 4 SDKs de IA

Repo de aprendizaje con 4 currículas de hitos, cada una sobre un SDK distinto:

| SDK | Hitos | Dónde vive el código | Docs |
|-----|-------|----------------------|------|
| `@google/genai` (Gemini) | 1–8 | `hito*.ts` (raíz) | — (archivado en `openspec/changes/archive/2026-07-21-learn-gemini-genai-sdk/`) |
| `openai` | 1–8 | `openai-hito*.ts` (raíz) | — (archivado en `openspec/changes/archive/2026-07-21-learn-openai-sdk/`) |
| Vercel AI SDK (`ai`) | 1–9 | `vercel-hito*.ts` + `vercel-realtime/` | `docs/vercel-ai/` |
| LiveKit (`@livekit/agents`) | 0–12 | `livekit/` | `docs/livekit/` |

---

## Setup común

```bash
npm install
```

Variables en `.env` (raíz, cargado por `dotenv/config` en cada script):

```
GEMINI_API_KEY=...
OPENAI_API_KEY=...
TAVILY_API_KEY=...                  # búsqueda web en los hitos de tools
GOOGLE_GENERATIVE_AI_API_KEY=...    # el que lee @ai-sdk/google
```

Los sub-proyectos Next.js tienen su propio env:
- `vercel-realtime/.env.local` → `GEMINI_API_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- `livekit/nextjs-frontend/.env.local` → `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret`, `NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880`

Todos los scripts de raíz se corren con `tsx` (sin build). Los que usan `readline` son
chats interactivos: escribí en la terminal, `Ctrl+C` para salir.

---

## Gemini — `@google/genai`

```bash
npx tsx hito1.ts                  # H1 — Chat streaming + systemInstruction
npx tsx hito2.ts                  # H2 — Streaming + Tools (function calling)
npx tsx hito3-rag.ts              # H3 — Streaming + RAG (corpus/RAG.txt)
npx tsx hito4-rag-tools.ts        # H4 — Streaming + RAG + Tools
npx tsx hito5-live.ts             # H5 — Live API bidireccional
npx tsx hito6-live-tools.ts       # H6 — Live API + Tools
npx tsx hito7-live-rag.ts         # H7 — Live API + RAG
npx tsx hito8-live-rag-tools.ts   # H8 — Live API + RAG + Tools
```

Necesita `GEMINI_API_KEY` (y `TAVILY_API_KEY` en H2/H4/H6/H8).
El corpus de RAG está en `corpus/RAG.txt` y `corpus/embedings.txt`.

## OpenAI — `openai`

```bash
npx tsx openai-hito1.ts   # H1 — Chat Completions streaming + system prompt
npx tsx openai-hito2.ts   # H2 — Streaming + Tools
npx tsx openai-hito3.ts   # H3 — Streaming + RAG
npx tsx openai-hito4.ts   # H4 — Streaming + RAG + Tools
npx tsx openai-hito5.ts   # H5 — Realtime API por WebSocket
npx tsx openai-hito6.ts   # H6 — Realtime + Tools
npx tsx openai-hito7.ts   # H7 — Realtime + RAG
npx tsx openai-hito8.ts   # H8 — Realtime + RAG + Tools
```

Necesita `OPENAI_API_KEY`. Los hitos Realtime (5–8) abren un WS a
`wss://api.openai.com/v1/realtime` y usan el canal de texto.

## Vercel AI SDK — `ai`

Hitos 1–4 y 9 son scripts de terminal y son **multi-provider**: el primer argumento
elige el provider (`openai` por defecto).

```bash
npx tsx vercel-hito1.ts openai    # H1 — Chat streaming + system (o: gemini)
npx tsx vercel-hito1.ts gemini
npx tsx vercel-hito2.ts gemini    # H2 — Streaming + Tools
npx tsx vercel-hito3.ts gemini    # H3 — Streaming + RAG (embed/embedMany + cosineSimilarity)
npx tsx vercel-hito4.ts gemini    # H4 — Streaming + RAG + Tools
npx tsx vercel-hito9.ts           # H9 — Transcripción (OpenAI-only, usa sample-audio.mp3)
```

Hitos 5–8 (Realtime) viven en la app Next.js `vercel-realtime/`:

```bash
cd vercel-realtime
npm install          # primera vez
npm run dev          # http://localhost:3000
```

`app/page.tsx` monta los 4 hitos en la misma página, cada uno en sus dos variantes
de provider:

| Hito | Componente |
|------|-----------|
| H5 — Realtime simple | `app/components/RealtimeChat.tsx` |
| H6 — Realtime + Tools | `app/components/RealtimeChatWithTools.tsx` |
| H7 — Realtime + RAG | `app/components/RealtimeChatWithRag.tsx` |
| H8 — Realtime + RAG + Tools | `app/components/RealtimeChatWithRagTools.tsx` |

Route handlers server-side: `app/api/realtime-token/route.ts` (token efímero) y
`app/api/rag-context/route.ts`.

## LiveKit — `@livekit/agents`

### H0 — Setup (una sola vez, requerido por todos los demás)

```bash
curl -sSL https://get.livekit.io | bash
livekit-server --dev     # dejar corriendo: ws://localhost:7880, devkey/secret
```

Arquitectura de 3 procesos: **server** (`livekit-server --dev`) + **cliente**
(browser) + **worker** (el agent). Los hitos 1–4 no necesitan worker.

### H1–H3 — Transport puro, sin IA

Dos opciones de frontend; ambas hablan con el mismo `livekit-server --dev`.

**Vanilla (original, 3 procesos):**

```bash
# Terminal 1
livekit-server --dev
# Terminal 2 — token server (devkey/secret hardcodeados, puerto 3312)
npx tsx livekit/hito1/token-server.ts
# Terminal 3 — cliente Vite
cd livekit/hito1/client && npm install && npm run dev    # http://localhost:5173
```

**Next.js (migración, 2 procesos — recomendado):**

```bash
# Terminal 1
livekit-server --dev
# Terminal 2
cd livekit/nextjs-frontend && npm install && npm run dev  # http://localhost:3000
```

Probar con dos participantes: abrir dos pestañas con distinta identidad,
`http://localhost:3000/?identity=kelvin` y `?identity=pedro`.

Qué cubre cada hito en ese cliente:
- **H1** — Rooms + participants + audio track. Token server en `app/api/token/route.ts`.
- **H2** — Data: text streams, byte streams, RPC (`livekit/hito1/client/src/main.ts`).
- **H3** — Media avanzado: video de cámara + screenshare, distinguidos por `source`.

### H4 — Server-side: room management + webhooks

```bash
npx tsx livekit/hito4/room-admin.ts             # lista salas/participantes
npx tsx livekit/hito4/room-admin.ts <identity>  # además kickea a ese participante
npx tsx livekit/hito4/webhook-server.ts         # receptor de webhooks
```

Para que el server dispare webhooks hay que arrancarlo con la config del hito:

```bash
livekit-server --config livekit/hito4/config.yaml --dev
```

### H5–H12 — Agents (worker)

Todos se corren igual: `dev` es el subcomando del CLI de `@livekit/agents` (hot
reload, se conecta a `ws://localhost:7880` con `devkey`/`secret` fijados en el
propio archivo).

```bash
npx tsx livekit/hito5/agent.ts dev    # H5  — Pipeline STT-LLM-TTS + system instructions
npx tsx livekit/hito6/agent.ts dev    # H6  — Pipeline + Tools
npx tsx livekit/hito7/agent.ts dev    # H7  — Pipeline + RAG
npx tsx livekit/hito8/agent.ts dev    # H8  — Pipeline + RAG + Tools
npx tsx livekit/hito9/agent.ts dev    # H9  — Realtime (modelo multimodal único)
npx tsx livekit/hito10/agent.ts dev   # H10 — Realtime + Tools
npx tsx livekit/hito11/agent.ts dev   # H11 — Realtime + RAG
npx tsx livekit/hito12/agent.ts dev   # H12 — Realtime + RAG + Tools (= H11, ver docs)
```

`npx tsx livekit/hito10/agent.ts --help` lista los otros subcomandos del CLI.

Secuencia completa para probar un agent (3 terminales):

```bash
# 1
livekit-server --dev
# 2
cd livekit/nextjs-frontend && npm run dev
# 3
npx tsx livekit/hito5/agent.ts dev
```

Después entrar a `http://localhost:3000/?identity=kelvin` y hablar.

---

## Documentación

- `docs/livekit/hito-N.md` — teoría + tarea de cada hito; `hitoN-doccode.md` — repaso
  línea por línea del código.
- `docs/vercel-ai/hito-N.md` — ídem para Vercel AI SDK.
- `docs/livekit/nextjs-frontend.md` — por qué y cómo se migró el frontend vanilla a Next.js.
- `openspec/changes/archive/` — las 4 currículas cerradas (specs + tasks).

## Notas

- `livekit/hito1/token-server.ts` y los `agent.ts` traen `devkey`/`secret` hardcodeados:
  son las credenciales de `livekit-server --dev`, no sirven fuera de local. Para
  cualquier deploy real hay que moverlas a env.
- La Fase D del curso de LiveKit (app de chat) vive en otro repo: `/home/judal/Project/livekit`.
