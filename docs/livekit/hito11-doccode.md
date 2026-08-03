# Hito 11 — doccode (línea por línea): `livekit/hito11/agent.ts`

> QUÉ hace / QUÉ pasa por detrás / CONCEPTO — implementado por mentor bajo frase de escape ("necesito que lo implementes tu").
> Verificado contra `@livekit/agents@1.5.3`, `tsc` limpio (mismo `import.meta` esperado que Hitos 5-10) y `tsx livekit/hito11/agent.ts --help` carga sin error. Falta checkpoint en vivo (voz + texto).

## Imports (líneas 1–9)

```typescript
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
```
- QUÉ: los mismos dos imports "extra" de Hito 7 — `OpenAI` (SDK crudo, para embeddings, porque ningún plugin de
  `@livekit/agents-plugin-*` exporta un componente de Embeddings) y `readFileSync` (leer el corpus del disco).
  POR DETRÁS/CONCEPTO: sin novedad respecto a Hito 7 — ver `hito7-doccode.md` si querés el detalle de por qué
  los embeddings van por SDK crudo.

## RAG de Hito 7 — copiado literal (líneas 33–61)

```typescript
async function embed(input: string | string[]) { /* ... */ }
async function buildIndex(): Promise<Chunk[]> { /* ... */ }
const indexPromise: Promise<Chunk[]> = buildIndex();
function cosine(a: number[], b: number[]) { /* ... */ }
async function retrieve(query: string, k = 3): Promise<string[]> { /* ... */ }
```
- QUÉ: cero cambios respecto a `livekit/hito7/agent.ts` — mismo chunking por párrafo, mismo `text-embedding-3-small`,
  mismo coseno, mismo `indexPromise` sin `await` a nivel de módulo (evita el crash `Top-level await ... cjs`
  que encontraron en Hito 7 — mismo motivo, mismo fix). POR DETRÁS: `retrieve()` sigue siendo async y espera
  `indexPromise` internamente, así que la primera consulta puede tardar un poco más si el índice todavía se está
  construyendo (embeddings del corpus corriendo en paralelo desde que arrancó el módulo). CONCEPTO: el mecanismo
  de retrieval en sí (embed → coseno → top-k) es 100% independiente de si el `llm` es pipeline o Realtime — lo
  que cambia en este hito es DÓNDE y CUÁNDO se usa ese resultado (ver más abajo), no cómo se calcula.

## El corpus completo, embebido en las instrucciones (línea 65)

```typescript
const corpusText = readFileSync('corpus/RAG.txt', 'utf-8');
```
- QUÉ: lee el archivo entero (~12 KB) como un solo string, sin chunking ni embeddings — no es lo mismo que
  `buildIndex()` de arriba (que sí trocea y embebe para retrieval). POR DETRÁS: esto se usa UNA sola vez, al
  construir el `Agent` (línea 71), no en cada turno. CONCEPTO — **por qué existe esta variable, y no solo
  `retrieve()`:** verificado en `docs/livekit/hito-11.md` que `onUserTurnCompleted` (el hook de Hito 7) nunca se
  dispara para un `llm` `RealtimeModel` con turn-detection server-side (la config que venís usando desde Hito 9)
  — no hay un punto donde el framework te deje interceptar la pregunta hablada ANTES de que el modelo empiece a
  responder. Como el corpus es chico, la única forma determinística de que una pregunta HABLADA reciba contexto
  del corpus es que ese contexto YA esté en las instrucciones del agente desde el arranque — no depende de que
  el framework te avise nada por turno.

## El Agent — instructions con corpus + tools de Hito 10 (líneas 69–72)

```typescript
const agent = new voice.Agent({
  instructions: `Asistente de voz breve, en español. Máx 2 frases por respuesta. Respondé usando este contexto del corpus cuando la pregunta lo requiera:\n${corpusText}`,
  tools: { webSearch, getTime },
});
```
- **`instructions` con el corpus interpolado** — QUÉ: system prompt del agente incluye el corpus completo como
  texto plano, más una instrucción explícita de cuándo usarlo. POR DETRÁS: esto es simplemente el string que el
  framework manda como `instructions`/system message al `RealtimeModel` al construir la sesión (mismo mecanismo
  de siempre, sin API nueva) — no hay compresión ni resumen, el modelo recibe el texto entero. Esto funciona acá
  porque 12 KB es trivial dentro de la ventana de contexto de cualquiera de los dos modelos Realtime; con un
  corpus mucho más grande esta técnica dejaría de ser viable y habría que buscar otra alternativa (fuera del
  alcance de este hito). CONCEPTO: "RAG por instrucciones" es retrieval que corrió UNA vez (en este caso, ni
  siquiera hizo falta retrieval real porque entra todo — la recuperación fue trivial: "todo el corpus") en vez
  de recuperar por pregunta.
- **`tools: { webSearch, getTime }`** — heredado de Hito 10 sin cambios, no es requisito de este hito pero no
  molesta dejarlo (el mismo `AgentSession` sigue soportando ambos mecanismos a la vez, que es justamente lo que
  se combina de forma explícita en Hito 12).

## `AgentSession` — sin cambios respecto a Hito 9/10 (líneas 74–80)
Idéntico a los hitos anteriores — el `llm` sigue siendo `RealtimeModel`, ninguna opción nueva relacionada a RAG.
Esto confirma la separación de conceptos: el `RealtimeModel` no sabe ni le importa que el `Agent` tenga contexto
de corpus en sus instrucciones — para él es system prompt como cualquier otro.

## Canal de texto — retrieval real por consulta, antes de `generateReply` (líneas 86–95)

```typescript
ctx.room.registerTextStreamHandler('chat', async (reader, info) => {
  const text = await reader.readAll();
  const hits = await retrieve(text, 3);
  console.log(`[RAG] query="${text}" → ${hits.length} chunks:`, hits.map((h) => h.slice(0, 60)));
  const context = hits.join('\n---\n');
  console.log(`[TEXT IN] de ${info.identity}: "${text}"`);
  session.generateReply({
    userInput: `${text}\n\n(Contexto recuperado del corpus, usalo si aplica:\n${context})`,
  });
});
```
- **`await retrieve(text, 3)`** — QUÉ: el retrieval real, por pregunta, igual que Hito 7. POR DETRÁS: acá SÍ hay
  una ventana determinística — a diferencia de la voz, este código es el que decide cuándo se llama
  `generateReply`, así que podés hacer `await` de la recuperación ANTES de esa llamada sin ninguna carrera:
  nada dispara una respuesta hasta que vos llamás `generateReply` explícitamente. CONCEPTO: esta es la otra
  técnica que pide el spec — "mensaje de contexto enviado a la sesión" — y es la única de las dos con retrieval
  genuino por-consulta en este hito.
- **`console.log('[RAG] ...')`** — mismo patrón de logging que Hito 7/8, para poder confirmar en el checkpoint
  qué chunks se recuperaron para esa pregunta puntual.
- **`session.generateReply({ userInput: ... })`** — QUÉ: mismo método de Hito 9 (`AgentSession.generateReply`,
  no del `RealtimeSession` del plugin). POR DETRÁS: el string que le pasás como `userInput` es lo que se envuelve
  en un `ChatMessage({role:'user', content})` y dispara la generación — al meterle el contexto recuperado DENTRO
  del mismo string (en vez de, por ejemplo, un `chatCtx.addMessage` separado), garantizás que el modelo lo vea
  como parte del mismo turno de usuario, sin depender de sincronización entre dos llamadas distintas.

## El ciclo completo — 2 canales, 2 técnicas
1. **Voz:** modelo ya "sabe" el corpus desde `instructions` (recuperación de una sola vez, al arrancar) → pregunta
   hablada relacionada al corpus se responde con ese contexto ya presente, sin código extra por turno.
2. **Texto:** llega por `registerTextStreamHandler('chat', ...)` → `retrieve(text)` corre EN ESE MOMENTO (recuperación
   real, por consulta) → el resultado se mete en el mismo `userInput` de `generateReply` → el modelo responde
   incorporando ese contexto específico de esa pregunta.
3. Ninguno de los dos canales pasa por `onUserTurnCompleted` — ese hook simplemente no aplica a este `llm`
   (ver TEORÍA en `hito-11.md`).
