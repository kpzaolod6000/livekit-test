# Hito 7 — Realtime + RAG

## TEORÍA

RAG en Realtime tiene una restricción nueva respecto a los hitos 3-4 (Node CLI): **los embeddings necesitan la API key, así que la recuperación DEBE correr en el servidor**, nunca en el navegador. El navegador no puede embeber la pregunta ni leer el corpus.

Arquitectura (reusa el patrón RAG de hito 3, pero partido cliente/servidor):

```
Navegador (React)                Servidor (Next.js)                 Provider
      │                                │                                │
      │ 1. usuario escribe pregunta    │                                │
      │ POST /api/rag-context {query} ►│                                │
      │                                │ 2. embed(query) + embedMany(corpus)
      │                                │    cosineSimilarity → top-k ──►│ (embeddings)
      │                                │◄── chunks relevantes ──────────┤
      │◄──── { context } ──────────────┤                                │
      │                                │                                │
      │ 3. sendTextMessage(            │                                │
      │      "Contexto:\n{context}\n   │                                │
      │       Pregunta: {question}") ──── WebSocket (sesión ya abierta) ──►│
      │◄══════ audio + transcripción (respuesta apoyada en el contexto) ══│
```

Puntos clave:
- **La sesión Realtime NO cambia** — sigue siendo la misma de hitos 5/6 (`useRealtime`, `outputModalities: ['audio']`, token efímero). El RAG es un paso PREVIO al `sendTextMessage`: recuperás contexto y lo antepones al mensaje. La inyección es texto plano dentro del turno, no una config especial de la sesión.
- **Embeddings server-side**: un endpoint `/api/rag-context` indexa el corpus (cacheado a nivel módulo, se calcula una vez) y por cada pregunta embebe la query, hace `cosineSimilarity`, devuelve los top-k chunks. Mismo `embeddingModel` (`gemini-embedding-001`) que hito 3, para consistencia — el provider de embeddings NO cambia aunque cambie el provider de chat/voz.
- **Audio sigue activo**: la respuesta llega como audio real + transcripción en `messages`, igual que hitos 5/6. El RAG no lo degrada.

## CÓMO IMPLEMENTARLO

**1. Servidor — `app/api/rag-context/route.ts`** (índice cacheado + retrieval):
```typescript
import { embed, embedMany, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
let indexPromise = null; // cache a nivel módulo: indexá una sola vez

function indexCorpus() {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const folder = join(process.cwd(), 'corpus');
    const texts = [];
    for (const f of readdirSync(folder).filter(x => x.endsWith('.txt')))
      texts.push(...readFileSync(join(folder, f), 'utf-8').split('\n\n').filter(p => p.trim()));
    const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
    return texts.map((text, i) => ({ text, embedding: embeddings[i] }));
  })();
  return indexPromise;
}

export async function POST(req) {
  const { query, k = 3 } = await req.json();
  const chunks = await indexCorpus();
  const { embedding } = await embed({ model: embeddingModel, value: query });
  const context = chunks
    .map(c => ({ text: c.text, score: cosineSimilarity(embedding, c.embedding) }))
    .sort((a, b) => b.score - a.score).slice(0, k).map(c => c.text).join('\n\n---\n\n');
  return Response.json({ context });
}
```
(Copiá el corpus `.txt` dentro del proyecto Next, ej. `vercel-realtime/corpus/`, para que `process.cwd()/corpus` lo encuentre.)

**2. Cliente — `app/components/RealtimeChatWithRag.tsx`**: mismo `useRealtime` de hito 5 (model + sessionConfig memoizados, `api.token` = URL, `outputModalities: ['audio']`), más un input de texto y un botón que primero recupera contexto y después inyecta:
```tsx
async function askWithRag() {
  const res = await fetch('/api/rag-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: question }),
  });
  const { context } = await res.json();
  sendTextMessage(`Usá SOLO este contexto para responder.\n\nContexto:\n${context}\n\nPregunta: ${question}`);
}
```

## LA TAREA

1. Copiá el corpus a `vercel-realtime/corpus/`.
2. Implementá `/api/rag-context` (arriba). Probalo: `curl -X POST localhost:3000/api/rag-context -H 'Content-Type: application/json' -d '{"query":"¿Qué es RAG?"}'` → debe devolver `{context}` con chunks relevantes.
3. Implementá `RealtimeChatWithRag`, montalo en `page.tsx`.
4. Conectá (openai), escribí una pregunta del corpus, "Preguntar con RAG" → confirmá: escuchás audio con una respuesta que usa el contexto recuperado + texto en `messages`.
5. Repetí con gemini, mismo código.

## HALLAZGOS AL IMPLEMENTAR (verificado)

- **Retrieval verificado headless** contra el corpus real (`gemini-embedding-001`, 23 chunks): query "¿Qué es RAG?" devuelve top-3 con score ~0.73, todos on-topic. Mismo pipeline exacto que hito 3.
- **El corpus debe estar DENTRO del proyecto Next** (`vercel-realtime/corpus/`), porque `process.cwd()` en `next dev` es el dir del proyecto, no el root del repo. Referenciar `../corpus` es frágil — mejor copiarlo.
- **Índice cacheado a nivel módulo** (`indexPromise`): sin eso, cada request re-embebe todo el corpus (lento y caro). Con el cache, se indexa en el primer request y se reusa.
- La sesión Realtime es idéntica a hito 5 — el RAG vive 100% antes del `sendTextMessage`. No hay que tocar `sessionConfig` para inyectar contexto.
