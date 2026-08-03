# Hito 8 — Realtime + RAG + Tools combinados

## TEORÍA

Hito 8 no introduce mecanismos nuevos — **combina** los dos anteriores dentro de la misma sesión Realtime:
- **RAG** (hito 7): recuperás contexto en el servidor y lo inyectás en el turno vía `sendTextMessage`.
- **Tools** (hito 6): exponés tools con `experimental_getRealtimeToolDefinitions` en `sessionConfig`, y las resolvés vía `onToolCall`.

Ambos conviven sin fricción porque operan en capas distintas del mismo turno:

```
usuario pregunta algo que necesita CONTEXTO + ACCIÓN
        │
        ▼
1. fetch /api/rag-context {query} → context   (RAG, server-side, embeddings)
        │
        ▼
2. sendTextMessage("Contexto:\n{context}\n\nPregunta: {question}")
        │                                        (sesión Realtime abierta, audio activo)
        ▼
3. el modelo lee el contexto Y decide llamar la tool
        │
        ▼
4. onToolCall({ toolCall }) → ejecutás → return    (tool, hito 6)
        │
        ▼
5. respuesta final: audio + transcripción, usando contexto RAG + resultado de la tool
```

Punto clave: el contexto RAG va como **texto del turno** (paso 2), las tools van en la **config de la sesión** (`sessionConfig.tools`). Son canales independientes — por eso se combinan sin pisarse. `outputModalities: ['audio']` se mantiene igual que en hitos 5-7.

## CÓMO IMPLEMENTARLO

Es la fusión literal de `RealtimeChatWithRag` (hito 7) + `RealtimeChatWithTools` (hito 6):
- Del de tools: `tools`, `getRealtimeToolDefinitions` en `useEffect`, `sessionConfig` memoizado con `{ outputModalities:['audio'], tools: realtimeTools }`, y `onToolCall`.
- Del de RAG: el input de pregunta + `askCombined()` que hace `fetch('/api/rag-context')` y después `sendTextMessage(context + question)`.

```tsx
const sessionConfig = useMemo(
  () => ({ outputModalities: ['audio'] as const, tools: realtimeTools }),
  [realtimeTools],
);

const { status, messages, connect, disconnect, sendTextMessage } = useRealtime({
  model, // memoizado por providerArg
  api: { token: `/api/realtime-token?provider=${providerArg}` },
  sessionConfig,
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getTime') return await tools.getTime.execute!({}, {} as any);
    throw new Error(`Tool desconocida: ${toolCall.toolName}`);
  },
});

async function askCombined() {
  const res = await fetch('/api/rag-context', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: question }),
  });
  const { context } = await res.json();
  sendTextMessage(`Usá el contexto para lo conceptual y la tool getTime para la hora.\n\nContexto:\n${context}\n\nPregunta: ${question}`);
}
```

No hacen falta endpoints nuevos: `/api/realtime-token` (hito 5) y `/api/rag-context` (hito 7) ya existen y se reusan tal cual.

## LA TAREA

1. Creá `RealtimeChatWithRagTools.tsx` (fusión de hitos 6 + 7), montalo en `page.tsx`.
2. Conectá (openai), preguntá algo que combine corpus + acción, ej. **"¿Qué es RAG y qué hora es?"**.
3. Confirmá en un solo turno: (a) `onToolCall` se dispara (`getTime` en consola), (b) la respuesta en audio + transcripción menciona la definición de RAG del corpus Y la hora de la tool, (c) la sesión no se reconecta.
4. Repetí con gemini, mismo componente.

## HALLAZGOS

- Ambos mecanismos ya fueron verificados por separado: tools headless en openai+gemini (hito 6), RAG retrieval headless (hito 7). Hito 8 es la composición — no agrega superficie de API nueva, solo el mismo componente con las dos piezas juntas.
- Los dos canales no compiten: RAG = texto del turno (`sendTextMessage`), tools = `sessionConfig.tools` + `onToolCall`. Un turno puede usar uno, otro, o ambos según lo que pida la pregunta.
- Reusa los endpoints de hitos 5 y 7 sin cambios.
