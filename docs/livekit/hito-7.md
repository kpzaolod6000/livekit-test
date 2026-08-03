# Hito 7 — Pipeline + RAG (inyección de contexto en el turno)

> Plan `learn-livekit-sdk`, **Fase B (Agents Pipeline)** — mismo worker de Hito 5/6, ahora con RAG.
> Spec: `openspec/changes/learn-livekit-sdk/specs/livekit-rag/spec.md`
> RAG SIN tools todavía (tools+RAG combinados = Hito 8). Acá el contexto entra por un **hook de turno**, no por una tool.
> Sigue con los mismos 3 procesos (app Next.js + `livekit-server` + agent worker).

## 7.1 — Corpus decidido: REUSAR `./corpus/`
Ya existe de los planes anteriores (Gemini/OpenAI/Vercel):
- `corpus/RAG.txt` (~12 KB) — texto sobre "qué es RAG" (en español).
- `corpus/embedings.txt` (~1.4 KB) — texto sobre embeddings.

Decisión: **reusar ese corpus** (no crear uno nuevo). Es chico → cabe en memoria, embeddings baratos,
y ya conocés el dominio de los planes previos. Si querés otro, cambiás la ruta de carga; el resto igual.

## TEORÍA

> Nota (design.md): NO se re-explica RAG desde cero — ya lo dominás de los planes anteriores.
> El foco del hito es **cómo se expresa RAG dentro del modelo de LiveKit Agents**.

### El punto LiveKit-específico: el hook `onUserTurnCompleted`
En los planes anteriores vos armabas el prompt a mano e inyectabas el contexto recuperado. En LiveKit
Agents el `AgentSession` maneja el turno por vos, así que necesitás un **punto de enganche** para meter
el contexto recuperado ANTES de que el LLM piense. Ese punto es el método `onUserTurnCompleted` del
`Agent`: se dispara cuando el humano terminó de hablar y su mensaje ya está transcripto, pero **antes**
de que corra el LLM. Ahí embebés la pregunta, recuperás del corpus, y agregás el contexto al `chatCtx`.
FUENTE: https://docs.livekit.io/agents/build/external-data/ (RAG / external data) · tipos instalados
`node_modules/@livekit/agents/dist/voice/agent.d.ts` (`onUserTurnCompleted(chatCtx, newMessage)`).

### Firma verificada del hook (tipos instalados @1.5.3)
```typescript
onUserTurnCompleted(chatCtx: ChatContext, newMessage: ChatMessage): Promise<void>
```
- **`newMessage.textContent`** → el texto del turno del humano (lo que preguntó). (verificado: `ChatMessage.textContent: string | undefined`).
- **`chatCtx`** → el contexto de chat que va a ver el LLM en este turno. Es **mutable acá**: le agregás
  un mensaje con el contexto recuperado vía `chatCtx.addMessage({ role, content })` (verificado línea 278).
- Para modificar el chatCtx FUERA de este hook hay que `chatCtx.copy()` + `agent.updateChatCtx(...)`
  (hay un `errorMsg` que lo obliga). Dentro de `onUserTurnCompleted` lo mutás directo — es su razón de ser.

### Embeddings: van por OpenAI (igual patrón que STT/TTS)
Ni `@livekit/agents-plugin-openai` ni `-plugin-google` exportan un componente de Embeddings (verificado:
`grep -i embedding` en ambos = vacío). RAG no es parte del pipeline STT-LLM-TTS; los embeddings los
generás **por tu cuenta** con el SDK `openai` (v6.48 instalado) → `openai.embeddings.create({...})`,
modelo `text-embedding-3-small`. **Consecuencia para 7.4 (dual-provider):** los embeddings quedan
**fijos en OpenAI**; lo único que swapeás es el `llm` del pipeline — idéntico a Hito 5/6.
FUENTE: https://platform.openai.com/docs/guides/embeddings (modelos de embeddings OpenAI).

### Recuperación: similitud coseno en memoria
Corpus chico ⇒ no necesitás vector DB. Al arrancar: partís el texto en chunks (por párrafo/heading),
embebés cada chunk una vez. Por turno: embebés la pregunta, calculás **coseno** contra cada chunk,
tomás los top-k (ej. 3), y ese texto es el contexto. CONCEPTO: coseno mide ángulo entre vectores →
cercanía semántica (ya lo viste en planes previos).

## CÓMO IMPLEMENTARLO

1. **Carpeta** `livekit/hito7/`. Copiá base de Hito 5 (pipeline sin tools) o de Hito 6 (si querés dejar tools; pero RAG puro = sin tools).
2. **Carga + embed del corpus (1 vez, a nivel módulo):**
   - Leé `corpus/RAG.txt` (+ `embedings.txt` si querés).
   - Chunk: partí por doble salto de línea / headings. Guardá `[{ text, embedding }]`.
   - Embebé cada chunk con `openai.embeddings.create({ model:'text-embedding-3-small', input: chunk })`.
3. **Subclase del Agent con el hook:**
   ```typescript
   import { voice, llm } from '@livekit/agents';

   class RagAgent extends voice.Agent {
     async onUserTurnCompleted(chatCtx: llm.ChatContext, newMessage: llm.ChatMessage) {
       const q = newMessage.textContent;
       if (!q) return;
       const hits = await retrieve(q, 3);            // tu coseno vs corpus embebido
       const context = hits.map((h) => h.text).join('\n---\n');
       chatCtx.addMessage({
         role: 'system',
         content: `Contexto recuperado (usalo si aplica):\n${context}`,
       });
     }
   }
   ```
   Verificá el import exacto de `ChatContext`/`ChatMessage` (namespace `llm` de `@livekit/agents`).
4. **Instanciá `new RagAgent({ instructions })`** en vez de `new voice.Agent(...)`. El `AgentSession`
   (STT/LLM/TTS) queda igual que Hito 5.
5. **Corré los 3 procesos** (igual que antes; `pkill -f agent.ts` antes de reiniciar).
6. **Dual-provider (7.4):** swap SOLO del `llm` a `google.LLM(...)`. Embeddings + retrieve intactos.

## LA TAREA (tasks 7.3–7.4) + CHECKPOINTS

- **7.3** Indexación + recuperación, contexto inyectado en el turno del `AgentSession` vía
  `onUserTurnCompleted`. ✅ Checkpoint: preguntás por voz algo que SOLO está en el corpus (ej. una
  definición puntual de `RAG.txt`) → el agente responde citando ese contenido; en los logs ves los
  chunks recuperados metidos en el chatCtx.
- **7.4** Mismo RAG cambiando SOLO el LLM (OpenAI → Gemini). ✅ Checkpoint: ambas corridas responden
  con el contexto recuperado; el diff es una sola línea (el `llm`); embeddings siguen en OpenAI.

Criterio de cierre (spec `livekit-rag`): 1. indexación + recuperación con contexto inyectado en el
turno del pipeline · 2. RAG funciona igual cambiando solo el provider del LLM.

## RECORDATORIO DE ROL (mentor)
Yo entrego TEORÍA + CÓMO + TAREA (esto). **Vos implementás 7.3 y 7.4.** Reviso y cierro en 7.5.
Antes de tu checkpoint te entrego `hito7-doccode.md` (línea por línea). Frase de escape disponible.

## ESTADO

| Paso | Task | Estado |
|------|------|--------|
| corpus decidido (reusar `./corpus/`) | 7.1 | ✅ |
| contenido mentor | 7.2 | ✅ entregado |
| indexación + retrieve + inyección en turno | 7.3 | ✅ implementado (mentor, frase de escape) — `livekit/hito7/agent.ts`; checkpoint browser confirmado por usuario (respuesta citando corpus + log `[RAG]` visible) |
| RAG dual-provider (solo cambia LLM) | 7.4 | ✅ confirmado por usuario con `google.LLM` en vivo |
| review final vs `livekit-rag` | 7.5 | ✅ cerrado — 2/2 requisitos OK |
