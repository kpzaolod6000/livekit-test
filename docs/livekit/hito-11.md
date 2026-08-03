# Hito 11 — Realtime + RAG (contexto de un corpus dentro de una sesión Realtime)

> Plan `learn-livekit-sdk`, **Fase C (Agents Realtime)**.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-realtime-rag/spec.md`
> Base: `livekit/hito10/agent.ts` (tools en Realtime). Reusás el `buildIndex`/`embed`/`cosine`/`retrieve` de Hito 7.

## TEORÍA

### El hook de Hito 7 (`onUserTurnCompleted`) NO aplica acá — verificado, no es una suposición
En Hito 7 inyectabas contexto en `onUserTurnCompleted(chatCtx, newMessage)`, llamado por el framework "antes de
que el LLM piense". Para Realtime **ese hook no se dispara** cuando el modelo maneja su propio turn-detection
(el default en ambos providers). Verificado en dos fuentes independientes:
- **Código instalado** `node_modules/@livekit/agents/dist/voice/agent_activity.js` (función `userTurnCompleted`):
  ```javascript
  if (this.llm instanceof RealtimeModel) {
    if (this.llm.capabilities.turnDetection) {
      return;   // ← corta ACÁ, antes de llegar a this.agent.onUserTurnCompleted(...)
    }
    ...
  }
  ```
  `capabilities.turnDetection` es `true` por default en ambos plugins (`server_vad`/`semantic_vad` en OpenAI,
  `automaticActivityDetection` en Google) — o sea, con la config que ya venís usando desde Hito 9, el `return`
  siempre se ejecuta y el hook nunca corre.
- **Documentación oficial** (`docs.livekit.io/agents/build/external-data/`, sección "Add context during
  conversation"): *"This method ... is only available for STT-LLM-TTS pipelines that have access to the user's
  turn in text form."* — confirma en texto lo mismo que vimos en el código.

FUENTE: https://docs.livekit.io/agents/build/external-data/ · tipos/código instalados
`node_modules/@livekit/agents/dist/voice/agent_activity.js` (función `userTurnCompleted`).

### Por qué pasa esto (concepto, no solo la regla)
Con turn-detection server-side, el propio proveedor (OpenAI/Gemini) decide cuándo terminó tu turno Y dispara la
generación de la respuesta automáticamente (`create_response: true` por default — verificado
`DEFAULT_TURN_DETECTION` en `@livekit/agents-plugin-openai/dist/realtime/realtime_model.js`). No hay una pausa
donde el framework te devuelva el control ANTES de que el modelo empiece a responder — a diferencia del pipeline,
donde el framework arma el prompt final y recién ahí llama al LLM (dándote el hueco para meter contexto en el
medio). CONCEPTO: pipeline = vos armás el turno pieza por pieza; Realtime = el modelo compone audio en vivo,
sin una "foto" del turno que puedas interceptar de forma determinística.

### Lo que SÍ hace el spec de este hito — 2 técnicas, no una sola obligatoria
El spec (`livekit-realtime-rag`) pide inyectar contexto "como parte de las **instrucciones iniciales**" o "de un
**mensaje de contexto enviado a la sesión**". Son dos técnicas reales y separadas, cada una cubre un canal:

1. **Instrucciones iniciales (para el canal de VOZ):** dado que tu corpus (`corpus/RAG.txt`, ~12 KB) entra
   entero y de sobra en el prompt de sistema, la técnica honesta es incluir el contenido relevante del corpus
   directamente en `instructions` del `Agent`, UNA sola vez al construirlo — no hay retrieval por turno para
   voz, pero el contexto SÍ fue "recuperado" (lo armaste corriendo tu `retrieve()`/`buildIndex()` de Hito 7,
   simplemente con el momento de la recuperación movido a "antes de arrancar la sesión" en vez de "por cada
   turno"). Esto es lo único determinístico posible para voz, dado el punto anterior.
2. **Mensaje de contexto enviado a la sesión (para el canal de TEXTO):** acá SÍ tenés control total del momento
   exacto, porque el texto entrante pasa por tu `registerTextStreamHandler` (Hito 9) ANTES de que vos decidas
   llamar `session.generateReply()`. Podés correr `retrieve(query)` (igual que Hito 7) y construir el
   `userInput` combinando pregunta + contexto recuperado, o inyectarlo vía `agent.updateChatCtx()` antes de
   llamar `generateReply`. Acá SÍ hay retrieval real por-consulta, sin carreras.

CONCEPTO CLAVE: no es un compromiso a medias — es la única combinación que es simultáneamente **verificable**
(no le prometo al modelo un comportamiento que el código no garantiza) y **cubre ambos canales** del spec
(voz + texto) sin inventar un hack no soportado (ej. desactivar `capabilities.turnDetection` para forzar el
hook de Hito 7 tampoco sirve solo — sin un `stt:` configurado en el `AgentSession`, no hay nada que llene
`newMessage.textContent` para un turno de voz; verificado en `dist/voice/audio_recognition.js`, el acumulador de
transcript solo se llena desde `this.stt`, no desde la transcripción propia del `RealtimeModel`).

## CÓMO IMPLEMENTARLO

1. **Carpeta** `livekit/hito11/agent.ts`. Base: `livekit/hito10/agent.ts` (Realtime + tools). Reusá el bloque
   completo de Hito 7: `embed()`, `buildIndex()`, `indexPromise` (sin top-level await, mismo fix del Hito 7/8),
   `cosine()`, `retrieve()`.
2. **Instrucciones iniciales con el corpus (canal voz):**
   ```typescript
   const corpusText = readFileSync('corpus/RAG.txt', 'utf-8');   // ~12 KB, entra entero
   const agent = new voice.Agent({
     instructions: `Asistente de voz breve, en español. Respondé usando este contexto cuando aplique:\n${corpusText}`,
     tools: { webSearch, getTime },   // seguís teniendo las de Hito 10 si querés, no es requisito de este hito
   });
   ```
3. **Retrieval real en el canal de texto:**
   ```typescript
   ctx.room.registerTextStreamHandler('chat', async (reader, info) => {
     const text = await reader.readAll();
     const hits = await retrieve(text, 3);
     console.log(`[RAG] query="${text}" → ${hits.length} chunks`);
     const context = hits.join('\n---\n');
     session.generateReply({
       userInput: `${text}\n\n(Contexto recuperado del corpus, usalo si aplica:\n${context})`,
     });
   });
   ```
4. **`AgentSession` Realtime:** igual que Hito 9/10, sin cambios estructurales — el `llm` sigue siendo
   `RealtimeModel`, no hay `stt`/`tts`.
5. **Verificá con `tsx livekit/hito11/agent.ts`** antes del checkpoint (lección de Hito 7/8: `tsc` limpio no
   basta).
6. **Dual-provider (11.3):** swap del `llm` completo, mismo patrón asimétrico de Hitos 9/10.

## LA TAREA (tasks 11.2–11.3) + CHECKPOINTS

- **11.2** Contexto del corpus disponible en la sesión Realtime, por los 2 canales. ✅ Checkpoints:
  (a) **voz** — preguntá algo que solo está en el corpus → la respuesta hablada lo incorpora (viene de las
  instrucciones iniciales, no hay log de retrieval para este canal); (b) **texto** — mandá una pregunta por el
  mismo mecanismo de Hito 9 → log `[RAG]` visible con los chunks recuperados, respuesta incorpora ese contexto.
- **11.3** Mismo comportamiento con ambos providers Realtime. ✅ Checkpoint: swap del `llm` a Gemini, repetís
  ambos checkpoints (voz y texto) y responden igual (atento a cuota free-tier si iterás rápido).

Criterio de cierre (spec `livekit-realtime-rag`): 1. contexto del corpus inyectado en sesión Realtime activa,
sin LLM separado para la respuesta hablada · 2. funciona igual con ambos providers Realtime.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 11.2 y 11.3.** Reviso y cierro en 11.4.
Antes de tu checkpoint te entrego `hito11-doccode.md` (línea por línea). Frase de escape disponible si hay
presión de tiempo genuina.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| contenido mentor (teoría + limitación real del hook H7 en Realtime) | 11.1 | ✅ (esta doc) |
| contexto del corpus en sesión Realtime (voz + texto) | 11.2 | ✅ confirmado por usuario (voz desde instructions, texto con log `[RAG]`) |
| dual-provider Realtime con RAG | 11.3 | ✅ confirmado por usuario (swap a Gemini, ambos canales) |
| review final vs `livekit-realtime-rag` | 11.4 | ✅ cerrado — 2/2 requisitos OK |

Ver línea por línea en `docs/livekit/hito11-doccode.md`. **Hito 11 cerrado.** Arranca Hito 12 (Realtime + RAG + Tools combinados).
