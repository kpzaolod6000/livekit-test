## 0. Setup previo

- [x] 0.1 Instalar `livekit-server` self-hosted (`curl -sSL https://get.livekit.io | bash` en Linux) y correrlo con `livekit-server --dev` (credenciales `devkey`/`secret`, puerto 127.0.0.1:7880) — v1.13.4, LISTEN :7880 verificado
- [x] 0.2 Confirmar API keys de OpenAI y Gemini disponibles en `.env` (ya deberían existir de los changes anteriores) — ambas con valor
- [x] 0.3 Mentor verifica en vivo los nombres exactos de paquetes npm — CONFIRMADO todo: `@livekit/agents`, `@livekit/agents-plugin-google` (Gemini realtime Node, modelo `gemini-2.5-flash-native-audio-preview-12-2025`), `@livekit/agents-plugin-openai`, `@livekit/components-react`, `livekit-client`, `livekit-server-sdk` — todos instalados OK
- [x] 0.4 `npm install` de los paquetes confirmados en 0.3 — @livekit/agents + plugin-google + plugin-openai + components-react + livekit-client + livekit-server-sdk instalados
- [x] 0.5 Mentor entrega TEORÍA (con FUENTE) + CÓMO IMPLEMENTARLO + LA TAREA para Hito 0 (arquitectura de 3 procesos, self-host, Agent Console/debug tools)

## FASE A — TRANSPORT (plataforma WebRTC pura, sin comparación de provider)

## 1. Hito 1 — Rooms + Participants + audio track (transport puro)

- [x] 1.1 Mentor entrega contenido de Hito 1 (solo tras cerrar Hito 0)
- [x] 1.2 Usuario implementa servidor de tokens (`livekit-server-sdk`) que emite JWT de acceso a sala — implementado por mentor bajo frase de escape (`livekit/hito1/token-server.ts`), JWT + grant + CORS verificados
- [x] 1.3 Usuario implementa frontend cliente (`livekit-client`/`@livekit/components-react`) que obtiene token y se une a la sala vía WebRTC — implementado por mentor bajo frase de escape (`livekit/hito1/client/`, Vite vanilla-ts), compila y bundlea OK; falta checkpoint browser del usuario
- [x] 1.4 Usuario publica track de micrófono y se suscribe a tracks de otros participantes (publish/subscribe, sin IA) — implementado por mentor bajo frase de escape (`client/src/main.ts`: setMicrophoneEnabled + TrackSubscribed/attach), build OK; falta checkpoint browser 2 pestañas
- [x] 1.5 Usuario maneja eventos de participante (entra/sale) y estado de conexión — implementado por mentor bajo frase de escape (`client/src/main.ts`: ParticipantConnected/Disconnected/Disconnected → lista DOM), build OK; falta checkpoint browser
- [x] 1.6 Mentor revisa entrega contra `livekit-transport-rooms` y confirma cierre de hito — 3/3 requisitos OK (token server separado, 2 participantes se escuchan sin IA, eventos entra/sale), checkpoints B/C/D confirmados por usuario

## 2. Hito 2 — Data: text streams + byte streams + RPC (base de la sección texto)

- [x] 2.1 Mentor entrega contenido de Hito 2 (solo tras cerrar Hito 1)
- [x] 2.2 Usuario implementa intercambio de mensajes de texto entre participantes vía text stream / data channel — mentor bajo frase de escape (`sendText`/`registerTextStreamHandler`, topic 'chat'), build OK; falta checkpoint browser
- [x] 2.3 Usuario implementa envío de datos binarios (byte stream) distinguido del canal de texto — mentor bajo frase de escape (`streamBytes` writer + `registerByteStreamHandler`, topic 'file'), build OK; falta checkpoint browser
- [x] 2.4 Usuario implementa al menos 1 llamada RPC request/response entre participantes — mentor bajo frase de escape (`registerRpcMethod('ping')` + `performRpc`), build OK; falta checkpoint browser
- [x] 2.5 Mentor revisa entrega contra `livekit-transport-data` y confirma cierre de hito — 3/3 requisitos OK (texto por topic, byte stream íntegro vía streamBytes, RPC con retorno), checkpoints confirmados por usuario

## 3. Hito 3 — Media avanzado: video track + screenshare

- [x] 3.1 Mentor entrega contenido de Hito 3 (solo tras cerrar Hito 2)
- [x] 3.2 Usuario publica y renderiza track de video (cámara) entre participantes — mentor bajo frase de escape (`setCameraEnabled` + TrackSubscribed ampliado a video → `<video>`), build OK; falta checkpoint browser
- [x] 3.3 Usuario implementa screenshare como track de video adicional distinguible de la cámara — mentor bajo frase de escape (`setScreenShareEnabled`, distinguido por `publication.source === Track.Source.ScreenShare`), build OK; falta checkpoint browser
- [x] 3.4 Usuario observa la adaptación automática de calidad de la plataforma (sin gestionar bitrate manual) — observacional (throttle en DevTools); a constatar en checkpoint browser
- [x] 3.5 Mentor revisa entrega contra `livekit-transport-media` y confirma cierre de hito — 3/3 requisitos OK (video cámara renderizado, screenshare distinguible por source, adaptación de calidad), checkpoints confirmados por usuario

## 4. Hito 4 — Server-side: room management + webhooks

- [x] 4.1 Mentor entrega contenido de Hito 4 (solo tras cerrar Hito 3)
- [x] 4.2 Usuario administra salas server-side con `livekit-server-sdk` (crear, listar, desconectar participante) — implementado por mentor bajo frase de escape (`livekit/hito4/room-admin.ts`: createRoom/listRooms/listParticipants/removeParticipant vs `http://localhost:7880`), typecheck OK; falta checkpoint (server up + kick visible en browser)
- [x] 4.3 Usuario configura endpoint de webhooks y verifica autenticidad de los eventos de `livekit-server` — implementado por mentor bajo frase de escape (`livekit/hito4/webhook-server.ts`: raw body + `Authorization` → `WebhookReceiver.receive`; `livekit/hito4/config.yaml` con bloque webhook), typecheck OK; falta checkpoint (join/leave loguea eventos verificados)
- [x] 4.4 Mentor revisa entrega contra `livekit-transport-server` y confirma cierre de hito — 3/3 requisitos OK (room-admin create/list/kick vía server SDK REST http:7880, webhook con firma verificada sobre raw body + Authorization, todo contra server self-hosted `--config config.yaml`), checkpoints A–D confirmados en vivo por usuario

## FASE B — AGENTS PIPELINE (STT-LLM-TTS, comparación dual OpenAI/Gemini)

## 5. Hito 5 — Pipeline STT-LLM-TTS: conversación de voz + instrucciones de sistema (ambos LLM)

- [x] 5.1 Mentor entrega contenido de Hito 5 (solo tras cerrar Hito 4) — `docs/livekit/hito-5.md`: TEORÍA (pipeline vs realtime, AgentSession, VAD silero auto, 3er proceso worker) + API verificada contra tipos instalados (@livekit/agents@1.5.3; openai plugin=STT+TTS+LLM, google plugin=LLM only ⇒ dual-provider cambia solo el `llm`) + CÓMO + TAREA
- [x] 5.2 Usuario implementa agent worker con `AgentSession` (STT + LLM + TTS) e instrucciones de sistema, reusando el token server y el cliente de la Fase A — `livekit/hito5/agent.ts` (STT openai whisper-1 + LLM gpt-4o-mini + TTS tts-1/alloy, VAD silero auto, `defineAgent`/`cli.runApp`), checkpoint browser confirmado por usuario (habla→respuesta de voz)
- [x] 5.3 Usuario prueba el mismo pipeline cambiando solo el provider del LLM (OpenAI y luego Gemini) — swap de 1 línea a `google.LLM({model:'gemini-2.5-flash', apiKey: GEMINI_API_KEY})`, STT/TTS OpenAI intactos, ambas corridas OK
- [x] 5.4 Mentor revisa entrega contra `livekit-streaming-fundamentals` y confirma cierre de hito — 3/3 requisitos OK (server self-hosted --dev, AgentSession STT-LLM-TTS con instrucciones + humano habla/escucha, mismo pipeline solo cambia LLM), app Next.js separada del worker. Nota dev-loop: Ctrl+C deja huérfanos (worker+inference) conectados; limpiar con `pkill -f agent.ts` o `setsid`+kill de grupo antes de reiniciar

## 6. Hito 6 — Pipeline + Tools (function calling)

- [x] 6.1 Mentor entrega contenido de Hito 6 (solo tras cerrar Hito 5) — `docs/livekit/hito-6.md`: TEORÍA (tools=function calling, viven en `voice.Agent`, mismo set sirve ambos providers por traducción del plugin) + FUENTE (docs.livekit.io/agents/build/tools + tipos instalados) + API verificada (`tool()` de `@livekit/agents`, `parameters` Zod@4.4.3 ó JSONSchema7, `AgentOptions.tools` array u objeto map) + CÓMO + TAREA
- [x] 6.2 Usuario declara al menos 2 tools ejecutables por el `AgentSession` — `livekit/hito6/agent.ts`: `webSearch` (Tavily, `parameters` Zod + `execute` trim answer/sources) + `getTime` (sin args), ambas en `voice.Agent({ tools })`; implementado por mentor bajo frase de escape (fix `inputSchema`→`parameters` + 2ª tool); checkpoint browser confirmado por usuario
- [x] 6.3 Usuario confirma que el mismo set de tools funciona con ambos providers de LLM — swap de 1 línea a `google.LLM({model:'gemini-2.5-flash', apiKey:GEMINI_API_KEY})`, tools intactas, ambas corridas OK
- [x] 6.4 Mentor revisa entrega contra `livekit-function-calling` y confirma cierre de hito — 2/2 requisitos OK (≥2 tools vía `tool()` de @livekit/agents, LLM invoca y resultado se sintetiza a audio; mismo set de tools con ambos providers sin tocar declaración). Bug encontrado en review: `inputSchema` no es key válida (es `parameters`); tsx no typechea ⇒ fallaba silencioso. doccode: `docs/livekit/hito6-doccode.md`

## 7. Hito 7 — Pipeline + RAG

- [x] 7.1 Mentor y usuario deciden corpus (reusar el de changes anteriores o uno nuevo) — REUSAR `./corpus/` (`RAG.txt` ~12KB + `embedings.txt`), corpus en español de planes previos; chico ⇒ retrieve en memoria
- [x] 7.2 Mentor entrega contenido de Hito 7 (solo tras cerrar Hito 6) — `docs/livekit/hito-7.md`: TEORÍA (hook `onUserTurnCompleted(chatCtx, newMessage)` verificado como punto de inyección RAG; embeddings por SDK `openai` v6.48 `text-embedding-3-small` porque plugins LiveKit no exportan Embeddings ⇒ dual-provider swap solo `llm`; retrieve coseno en memoria) + FUENTE (docs.livekit.io/agents/build/external-data + tipos instalados) + CÓMO (subclase `RagAgent extends voice.Agent`, `chatCtx.addMessage`) + TAREA
- [x] 7.3 Usuario implementa indexación y recuperación de contexto, inyectado en el turno del `AgentSession` — implementado por mentor bajo frase de escape ("necesito que lo implementes tu"): `livekit/hito7/agent.ts` (`RagAgent extends voice.Agent` + `onUserTurnCompleted`, `buildIndex`/`embed`/`cosine`/`retrieve` sobre `corpus/RAG.txt`, chunk por párrafo). Typecheck OK. Retrieve verificado en vivo standalone (pregunta de test → top hit score 0.79, chunk correcto). Log `[RAG] query=... → N chunks` agregado para checkpoint. **BUG encontrado por usuario al correr `tsx`:** `Top-level await is currently not supported with the "cjs" output format` — `const INDEX = await buildIndex()` a nivel módulo no funciona porque root `package.json` no tiene `"type":"module"` y tsx compila a CJS; afirmación previa en doccode ("tsx lo ejecuta como ESM") era una suposición no verificada y estaba mal. Fix: `const indexPromise = buildIndex()` (dispara sin awaitear) + `await indexPromise` dentro de `retrieve()`. Re-typecheck OK, `tsx livekit/hito7/agent.ts` ya no tira el error. Falta checkpoint browser real (voz→respuesta citando corpus)
- [x] 7.4 Usuario confirma RAG funciona igual cambiando solo el provider del LLM — corrida en vivo con `google.LLM` confirmada por usuario (tras cooldown de cuota 429 free-tier que había bloqueado el primer intento)
- [x] 7.5 Mentor revisa entrega contra `livekit-rag` y confirma cierre de hito — 2/2 requisitos OK (indexación+recuperación inyectada en el turno vía `onUserTurnCompleted`, log `[RAG]` visible en consola; RAG funciona igual solo cambiando el `llm` a Gemini), checkpoints confirmados por usuario

## 8. Hito 8 — Pipeline + RAG + Tools combinados

- [x] 8.1 Mentor entrega contenido de Hito 8 (solo tras cerrar Hito 7) — entregado ADELANTADO bajo frase de escape aunque Hito 7 no está cerrado (faltan 7.4/7.5); `docs/livekit/hito-8.md`
- [x] 8.2 Usuario implementa turno único que combina RAG y tools sobre el pipeline — implementado por mentor bajo frase de escape: `livekit/hito8/agent.ts` (unión literal de `RagAgent` de Hito 7 + tools `webSearch`/`getTime` de Hito 6 vía `new RagAgent({instructions, tools})`). Typecheck OK. Mismo bug de top-level await que 7.3 (heredado de la base copiada) — mismo fix aplicado (`indexPromise` sin awaitear a nivel módulo). `tsx livekit/hito8/agent.ts` ya no tira el error. Falta checkpoint browser real (pregunta combinada por voz)
- [x] 8.3 Usuario confirma combinación funciona con ambos providers de LLM — corrida en vivo con `google.LLM` confirmada por usuario (tras cooldown de cuota 429 free-tier)
- [x] 8.4 Mentor revisa entrega contra `livekit-rag-with-tools` y confirma cierre de hito — 2/2 requisitos OK (turno único combina contexto recuperado + tool invocada en una sola respuesta de audio, confirmado por usuario; combinación funciona igual con ambos providers de LLM). **Fase B (Agents Pipeline) completa.**

## FASE C — AGENTS REALTIME (modelo único; núcleo de la migración; dual OpenAI/Gemini)

## 9. Hito 9 — Realtime: sesión bidireccional con modelo multimodal único (texto + audio)

- [x] 9.1 Mentor entrega contenido de Hito 9 (solo tras cerrar Hito 8), incluyendo el mapeo conceptual desde la API nativa de Gemini Live (`live.connect`/`sendClientContent`/`sendRealtimeInput`/`onmessage`) a LiveKit Agents — `docs/livekit/hito-9.md`; API verificada leyendo código instalado (`openai.realtime.RealtimeModel` vs `google.realtime.RealtimeModel`, modalities string vs enum, texto entrante vía `session.generateReply({userInput})` confirmado en `dist/voice/agent_session.js:593`)
- [x] 9.2 Usuario implementa `AgentSession` Realtime (sin pipeline STT/TTS separado) — implementado por mentor bajo frase de escape: `livekit/hito9/agent.ts` (`voice.AgentSession({ llm: new openai.realtime.RealtimeModel(...) })`, sin `stt`/`tts`). Checkpoint confirmado por usuario (voz→respuesta sin pipeline separado)
- [x] 9.3 Usuario prueba el mismo componente contra `openai('gpt-realtime')` y Gemini Live — swap a `google.realtime.RealtimeModel` confirmado en vivo por usuario, funcionando
- [x] 9.4 Usuario prueba entrada por TEXTO además de audio en la misma sesión, y verifica salida disponible en texto (transcripción) y audio — confirmado por usuario: log `[TEXT IN]` visible, texto disparó respuesta vía `generateReply`, transcripción de la respuesta visible además del audio
- [x] 9.5 Mentor revisa entrega contra `livekit-realtime-streaming` y confirma cierre de hito — 4/4 requisitos OK (AgentSession realtime sin pipeline separado; mismo agente sostiene conversación con ambos providers; texto y audio conviven en la misma sesión sin conexión aparte; TEORÍA incluye mapeo desde Gemini Live nativo), checkpoints confirmados por usuario

## 10. Hito 10 — Realtime + Tools

- [x] 10.1 Mentor entrega contenido de Hito 10 (solo tras cerrar Hito 9) — `docs/livekit/hito-10.md`: TEORÍA (tools viven en `voice.Agent`, mismo `ToolContext` que pipeline; verificado `RealtimeCapabilities.autoToolReplyGeneration`/`manualFunctionCalls` en tipos instalados) + FUENTE (docs.livekit.io/agents/build/tools + código instalado `@livekit/agents-plugin-{openai,google}/dist/realtime/*.js`) + asimetría real hallada (Google `midSessionToolsUpdate: false` + knob `toolBehavior`/`toolResponseScheduling` que OpenAI no tiene) + CÓMO + TAREA
- [x] 10.2 Usuario implementa tools disponibles dentro de la sesión Realtime — implementado por mentor bajo frase de escape: `livekit/hito10/agent.ts` (mismas tools `webSearch`/`getTime` de Hito 6, agregadas a `voice.Agent({tools})` sobre el `AgentSession` Realtime de Hito 9, sin cambios en el `llm`). `tsc` limpio (mismo warning `import.meta` que todos los hitos), `tsx livekit/hito10/agent.ts --help` carga OK. Doccode línea por línea en `docs/livekit/hito10-doccode.md`. Checkpoint confirmado por usuario (voz dispara tool, sesión sigue sin cortar)
- [x] 10.3 Usuario confirma tools con ambos providers Realtime — usuario swapeó el `llm` a `google.realtime.RealtimeModel` en `livekit/hito10/agent.ts` y confirmó en vivo que la misma tool sigue funcionando
- [x] 10.4 Mentor revisa entrega contra `livekit-realtime-tools` y confirma cierre de hito — 2/2 requisitos OK (tool se invoca y resuelve dentro de la misma sesión sin cortar; mismo set de tools funciona con ambos providers Realtime, confirmado en vivo por usuario)

## 11. Hito 11 — Realtime + RAG

- [x] 11.1 Mentor entrega contenido de Hito 11 (solo tras cerrar Hito 10) — `docs/livekit/hito-11.md`: TEORÍA + FUENTE (verificado en código instalado `dist/voice/agent_activity.js` + docs.livekit.io/agents/build/external-data que `onUserTurnCompleted` NO se dispara para RealtimeModel con turn-detection server-side) + 2 técnicas del spec (instrucciones iniciales para voz, mensaje de contexto vía `generateReply` para texto) + CÓMO + TAREA
- [x] 11.2 Usuario implementa inyección de contexto RAG dentro de sesión Realtime — implementado por mentor bajo frase de escape: `livekit/hito11/agent.ts` (corpus completo en `instructions` para canal voz + retrieval real de Hito 7 antes de `generateReply` para canal texto, ambos sobre el `AgentSession` Realtime de Hito 10 con tools intactas). `tsc` limpio, `tsx livekit/hito11/agent.ts --help` carga OK. Doccode línea por línea en `docs/livekit/hito11-doccode.md`. Checkpoint confirmado por usuario (voz respondida desde instructions, texto con log `[RAG]`)
- [x] 11.3 Usuario confirma RAG con ambos providers Realtime — usuario swapeó a `google.realtime.RealtimeModel` y confirmó ambos canales (voz + texto) funcionando igual
- [x] 11.4 Mentor revisa entrega contra `livekit-realtime-rag` y confirma cierre de hito — 2/2 requisitos OK (contexto de corpus inyectado en sesión Realtime activa sin LLM separado; funciona igual con ambos providers, confirmado en vivo por usuario)

## 12. Hito 12 — Realtime + RAG + Tools combinados

- [x] 12.1 Mentor entrega contenido de Hito 12 (solo tras cerrar Hito 11) — `docs/livekit/hito-12.md`: TEORÍA (RAG estático en `instructions` + tools dinámicas no compiten por ningún punto de enganche, a diferencia de Fase B ⇒ `livekit/hito11/agent.ts` ya satisface la combinación sin código nuevo) + CÓMO (copiar/reusar Hito 11) + TAREA
- [x] 12.2 Usuario implementa turno único con RAG y tools dentro de sesión Realtime — implementado por mentor bajo frase de escape: `livekit/hito12/agent.ts` = copia literal de `livekit/hito11/agent.ts` (RAG estático en instructions + tools dinámicas ya conviven, sin código nuevo, ver `docs/livekit/hito-12.md`). `tsc` limpio, `tsx livekit/hito12/agent.ts --help` carga OK. Checkpoint confirmado por usuario (pregunta combinada por voz resuelta en una sola respuesta)
- [x] 12.3 Usuario confirma combinación con ambos providers Realtime — confirmado por usuario con swap a Gemini
- [x] 12.4 Mentor revisa entrega contra `livekit-realtime-rag-with-tools` y confirma cierre de hito — 2/2 requisitos OK (turno único combina contexto recuperado + tool invocada sin cortar sesión; funciona igual con ambos providers). **Fase C (Agents Realtime) completa.**

## FASE D — INTEGRACIÓN (la app objetivo) — ⚠️ MOVIDA A OTRO PROYECTO (2026-07-28)

**Fase D salió del alcance de este change por decisión del usuario (2026-07-28).** Este change se
cierra con **Fases A, B y C completas (H0–H12)**: LiveKit Transport, Agents Pipeline y Agents
Realtime, todos con checkpoints confirmados en vivo.

La Fase D (H13 UI de chat 2 secciones = app objetivo de la migración; H14 bonus multi-agent
handoffs + turn-detection; H14.5 retro final de los 4 SDKs) **continúa en un proyecto propio**:

- **Ruta:** `/home/judal/Project/livekit`
- **Change ahí:** `openspec/changes/livekit-chat-app/`
- **Qué se llevó:** los delta specs `livekit-chat-ui` y `livekit-multi-agent-handoffs` (removidos de
  este change, no quedaron sin implementar aquí), el código de H0–H12 (`livekit/hitoN/`,
  `livekit/nextjs-frontend/`), `docs/livekit/*`, `corpus/`, deps instaladas y las reglas de mentor.
- **Qué queda aquí:** este change archivado como registro de H0–H12, y los 12 specs principales
  (`livekit-transport-*`, `livekit-streaming-fundamentals`, `livekit-function-calling`,
  `livekit-rag*`, `livekit-realtime-*`) sincronizados a `openspec/specs/`.
