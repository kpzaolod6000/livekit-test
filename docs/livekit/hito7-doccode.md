# Hito 7 — doccode (línea por línea): `livekit/hito7/agent.ts`

> QUÉ hace / QUÉ pasa por detrás / CONCEPTO — solo lo NUEVO vs Hito 5 (pipeline base ya visto en `hito5-doccode.md`).
> Verificado contra `@livekit/agents@1.5.3`, `openai@6.48.0`, corpus `corpus/RAG.txt`.

## Imports (líneas 1–6)

```typescript
import 'dotenv/config';
import { cli, defineAgent, voice, ServerOptions, type JobContext, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as google from '@livekit/agents-plugin-google';
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
```
- **`llm`** (nuevo) — QUÉ: namespace que trae `ChatContext`/`ChatMessage`. POR DETRÁS: `@livekit/agents` reexporta todo `llm/index.js` bajo ese nombre (`export * as llm`). CONCEPTO: un solo import de `@livekit/agents` — evita el bug de identificador duplicado que tenías antes (`voice` importado 2 veces rompía el módulo en runtime, no solo en tsc).
- **`OpenAI` (SDK `openai`, no el plugin `-plugin-openai`)** — QUÉ: cliente REST directo a la API de OpenAI. POR DETRÁS: los plugins de LiveKit (`agents-plugin-openai`) NO exportan Embeddings (verificado, grep vacío) — por eso vas al SDK crudo. CONCEPTO: RAG no es parte del pipeline STT-LLM-TTS; es infraestructura tuya, al costado.
- **`readFileSync` (node:fs)** — lee el corpus del disco de forma síncrona. Se usa 1 sola vez al arrancar (no en el hot path del turno).

## Cliente + embeddings (líneas 8–13)

```typescript
const oai = new OpenAI();

async function embed(input: string | string[]) {
  const res = await oai.embeddings.create({ model: 'text-embedding-3-small', input });
  return res.data.map((d) => d.embedding);   // number[][]
}
```
- **`new OpenAI()`** — QUÉ: cliente a nivel módulo (singleton). POR DETRÁS: lee `OPENAI_API_KEY` de `process.env` automáticamente (constructor por defecto). CONCEPTO: mismo patrón que `tavilyClient` en Hito 6 — instanciar 1 vez, reusar.
- **`embed(input: string | string[])`** — QUÉ: wrapper que acepta 1 texto o varios. POR DETRÁS: la API de Tavily... digo, de OpenAI, embebe en batch cuando `input` es array → 1 sola request HTTP para N textos (barato). Verificado: `CreateEmbeddingResponse.data: Array<Embedding>`, cada uno con `.embedding: number[]`. CONCEPTO: **embedding** = vector numérico que representa el significado del texto; textos semánticamente parecidos ⇒ vectores cercanos.
- **`model: 'text-embedding-3-small'`** — modelo de embeddings de OpenAI (no confundir con `gpt-4o-mini`, que es de chat). Verificado en tipos del SDK.

## Chunk + índice (líneas 14–21)

```typescript
type Chunk = { text: string; vec: number[] };

async function buildIndex(): Promise<Chunk[]> {
  const raw = readFileSync('corpus/RAG.txt', 'utf-8');
  const texts = raw.split(/\n\s*\n/).map((t) => t.trim()).filter((t) => t.length > 40);
  const vecs = await embed(texts);
  return texts.map((text, i) => ({ text, vec: vecs[i] }));
}
```
- **`readFileSync('corpus/RAG.txt', 'utf-8')`** — QUÉ: carga el corpus completo a memoria como string. POR DETRÁS: ruta **relativa al cwd** del proceso `tsx` — si corrés desde otra carpeta, `ENOENT`. CONCEPTO: no hay DB ni servidor de archivos; el corpus vive en el filesystem local del worker.
- **`raw.split(/\n\s*\n/)`** — QUÉ: parte el texto por párrafos (1+ líneas en blanco entre bloques). POR DETRÁS: regex greedy sobre saltos de línea + espacios intermedios. CONCEPTO: **chunking por párrafo** — unidad natural de sentido en este corpus (cada párrafo = 1 idea).
- **`.filter((t) => t.length > 40)`** — descarta chunks basura (títulos sueltos, líneas vacías tras trim). Threshold arbitrario pero razonable para este corpus.
- **`await embed(texts)`** — embebe TODOS los chunks en 1 request batch. `vecs[i]` corresponde 1:1 con `texts[i]` (mismo orden que entra, garantía de la API).
- **`buildIndex()`** retorna `Chunk[]` — cada uno con su texto original + su vector. Esto ES el índice: para buscar, comparás vectores, no strings.

## Indexación offline (línea 23)

```typescript
const indexPromise: Promise<Chunk[]> = buildIndex();  // arranca ya, sin bloquear la carga del módulo
```
- QUÉ: dispara `buildIndex` 1 sola vez, al cargar el módulo (antes de que `entry` reciba ningún job) — sin bloquear la carga. POR DETRÁS: **CORREGIDO (bug real encontrado en checkpoint):** la versión anterior era `const INDEX = await buildIndex()` (top-level await). Afirmé acá que "tsx lo ejecuta como ESM así que es válido" — **eso era una suposición no verificada, y estaba mal**: el root `package.json` no tiene `"type":"module"`, así que `tsx`/esbuild compila el archivo a CJS, y CJS no soporta top-level await → `Error: Transform failed... Top-level await is currently not supported with the "cjs" output format`. Nunca se había corrido el archivo hasta este checkpoint, por eso no saltó antes. Fix: en vez de esperar la promesa a nivel de módulo, la guardo sin awaitear (`buildIndex()` arranca de inmediato, corre en background) y cada `retrieve()` hace `await indexPromise` — la promesa ya resuelta (o resolviéndose) se comparte entre todas las llamadas, mismo efecto de "1 sola indexación", sin top-level await. CONCEPTO: **indexación offline** — el costo (tiempo + $ de la API) de embeber el corpus se paga 1 vez al arrancar el worker, NO en cada turno; lo que cambió es CÓMO se espera esa promesa, no CUÁNDO se dispara el trabajo.

## Similitud coseno (líneas 25–29)

```typescript
function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```
- QUÉ: mide qué tan "alineados" están 2 vectores (0 a 1, aprox). POR DETRÁS: `dot` = producto punto; `na`/`nb` = norma (magnitud) de cada vector; dividir el punto por el producto de normas normaliza el resultado — es el **coseno del ángulo** entre los vectores. CONCEPTO: coseno alto = vectores apuntan "para el mismo lado" = textos semánticamente parecidos, independiente de la longitud del texto.

## Retrieve — top-k (líneas 31–38)

```typescript
async function retrieve(query: string, k = 3): Promise<string[]> {
  const index = await indexPromise;
  const [qv] = await embed(query);
  return index
    .map((c) => ({ text: c.text, score: cosine(qv, c.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((c) => c.text);
}
```
- **`const index = await indexPromise`** (nuevo, del fix del bug top-level-await) — QUÉ: espera a que termine la indexación antes de comparar. POR DETRÁS: si `retrieve` se llama ANTES de que `buildIndex()` termine (ej. primer turno llega muy rápido tras arrancar el worker), esta línea bloquea hasta que esté lista; si ya terminó, resuelve al instante (promesa ya resuelta). CONCEPTO: mover el `await` de nivel-módulo a nivel-función no cambia CUÁNDO arranca la indexación (arranca al cargar el módulo, igual que antes) — solo mueve DÓNDE se espera el resultado.
- **`const [qv] = await embed(query)`** — QUÉ: embebe la pregunta del usuario. POR DETRÁS: aunque `query` es 1 string, `embed` siempre retorna `number[][]` (batch de 1) → destructuring `[qv]` saca el único vector. CONCEPTO: para comparar hay que llevar la pregunta AL MISMO espacio vectorial que el corpus — mismo modelo de embeddings para ambos lados, siempre.
- **`.map(...).sort(...).slice(0,k).map(...)`** — QUÉ: puntúa cada chunk contra la pregunta, ordena de más a menos parecido, toma los `k` mejores, devuelve solo el texto. POR DETRÁS: es **búsqueda brute-force** — O(n) sobre todos los chunks; con corpus chico (pocas decenas de párrafos) es instantáneo. CONCEPTO: no hay índice ANN ni vector DB — para este tamaño de corpus no hace falta.

## El hook de inyección — el punto LiveKit-específico (líneas 41–53)

```typescript
class RagAgent extends voice.Agent {
  async onUserTurnCompleted(chatCtx: llm.ChatContext, newMessage: llm.ChatMessage) {
    const q = newMessage.textContent;
    if (!q) return;
    const hits = await retrieve(q, 3);
    console.log(`[RAG] query="${q}" → ${hits.length} chunks:`, hits.map((h) => h.slice(0, 60)));
    const context = hits.join('\n---\n');
    chatCtx.addMessage({
      role: 'system',
      content: `Contexto recuperado del corpus (usalo si responde la pregunta):\n${context}`,
    });
  }
}
```
- **`class RagAgent extends voice.Agent`** — QUÉ: subclase, no instancia directa de `voice.Agent`. POR DETRÁS: `Agent` expone métodos "hook" pensados para override (`onEnter`, `onUserTurnCompleted`, `llmNode`, etc. — verificado en `dist/voice/agent.d.ts`); el `AgentSession` los llama en puntos fijos del ciclo de vida del turno. CONCEPTO: **template method pattern** — el framework define el flujo, vos enganchás comportamiento en puntos específicos.
- **`onUserTurnCompleted(chatCtx, newMessage)`** — QUÉ: override del hook que corre justo después de que el humano terminó de hablar (STT ya transcribió) y ANTES de que el LLM piense. POR DETRÁS: `AgentSession` invoca esto automáticamente en cada turno — vos no lo llamás manualmente. Firma verificada en tipos instalados. CONCEPTO: es el ÚNICO lugar donde podés mutar el `chatCtx` libremente antes del turno del LLM sin pasar por `copy()`+`updateChatCtx()`.
- **`newMessage.textContent`** — QUÉ: el texto transcripto de lo que dijo el humano. POR DETRÁS: `ChatMessage.textContent: string | undefined` (puede venir vacío si el turno no tuvo texto, ej. solo audio no transcripto) — de ahí el guard `if (!q) return`.
- **`await retrieve(q, 3)`** — busca los 3 chunks más relevantes a la pregunta.
- **`console.log('[RAG] query=...')`** — QUÉ: línea agregada tras el checkpoint inicial, no estaba en la primera versión revisada acá. POR DETRÁS: `hits` ya son los textos top-k (strings) devueltos por `retrieve`; se loguea la query + primeros 60 chars de cada chunk. CONCEPTO: sin esto, la inyección al `chatCtx` es invisible desde afuera — es la única forma de confirmar en el checkpoint (voz→respuesta) QUÉ chunks entraron al turno, sin instrumentar el chatCtx mismo.
- **`chatCtx.addMessage({ role: 'system', content })`** — QUÉ: agrega un mensaje de sistema al contexto de ESTE turno, con el contexto recuperado. POR DETRÁS: `ChatContext.addMessage` inserta el item respetando orden cronológico (verificado, `dist/llm/chat_context.d.ts:278`); el LLM lo va a ver como parte del historial cuando genere la respuesta. CONCEPTO: `role:'system'` es válido (`ChatRole = 'developer'|'system'|'user'|'assistant'`, verificado) — usás `system` para distinguir "esto es contexto inyectado", no algo que dijo el humano ni el asistente.

## Wiring — instanciar `RagAgent` en vez de `voice.Agent` (líneas 58–60)

```typescript
const agent = new RagAgent({
  instructions: 'Asistente breve en español. Respondé usando el contexto recuperado cuando aplique.',
});
```
- QUÉ: única diferencia vs Hito 5 en el `entry` — la clase instanciada. POR DETRÁS: `RagAgent` hereda TODO de `voice.Agent` (constructor, demás hooks) y solo pisa `onUserTurnCompleted`. CONCEPTO: el resto del `AgentOptions` (`instructions`) funciona idéntico a la clase base — herencia, no reemplazo.

## Pipeline (líneas 62–68) — sin cambios vs Hito 5
`AgentSession({ stt, llm, tts })` idéntico. La línea 64 (`openai.LLM`) es la que swapeás a `google.LLM` para 7.4 — **RAG (embed/retrieve/hook) no se toca**, mismo argumento que en Hitos 5 y 6.

## El ciclo completo de un turno con RAG
1. Humano habla → STT → texto transcripto.
2. `AgentSession` dispara `onUserTurnCompleted(chatCtx, newMessage)` de tu `RagAgent`.
3. Tu hook: embebe la pregunta, corre coseno contra `INDEX`, saca top-3, los mete en `chatCtx` como mensaje `system`.
4. Recién ahí el LLM corre — ve la pregunta del humano + el contexto que vos inyectaste.
5. LLM redacta respuesta grounded en el corpus → TTS la sintetiza → audio a la sala.

Diferencia clave vs Hitos 5/6: en 5/6 el LLM solo veía `instructions` + historial de conversación. Acá, CADA turno, además ve contexto fresco recuperado del corpus — sin que vos toques el pipeline STT-LLM-TTS.
