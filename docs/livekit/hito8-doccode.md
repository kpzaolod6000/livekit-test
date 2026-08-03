# Hito 8 — doccode (línea por línea): `livekit/hito8/agent.ts`

> QUÉ hace / QUÉ pasa por detrás / CONCEPTO — solo lo NUEVO vs Hito 6 (`hito6-doccode.md`) y Hito 7 (`hito7-doccode.md`).
> El archivo es una unión de ambos; casi todas las líneas ya están documentadas en esos dos. Acá solo el punto de unión.

## Imports (líneas 1–8)
Unión de los imports de Hito 6 (`tool`, `z`, `tavily`/`TavilyClient`) y Hito 7 (`llm`, `OpenAI`, `readFileSync`). Sin sorpresas — ningún import se pisa entre sí.

## Bloque RAG (líneas 10–52)
Idéntico línea por línea a `hito7-doccode.md` (`embed`, `Chunk`, `buildIndex`, `INDEX`, `cosine`, `retrieve`, `RagAgent`). No repito acá — ver esa doc.

## Bloque Tools (líneas 55–72)
Idéntico línea por línea a `hito6-doccode.md` (`tavilyClient`, `webSearch`, `getTime`). No repito acá — ver esa doc.

## El punto de unión real (líneas 87–93)

```typescript
const agent = new RagAgent({
  instructions: 'Asistente breve en español. Respondé usando el contexto recuperado del corpus cuando aplique; si la pregunta es sobre info actual/tiempo real o la hora, usá las tools.',
  tools: {
    webSearch: webSearch,
    getTime: getTime,
  },
});
```
- **`new RagAgent({ instructions, tools })`** — QUÉ: la única línea nueva del hito. Antes (Hito 7) `RagAgent` recibía solo `instructions`; ahora también `tools`. POR DETRÁS: `RagAgent extends voice.Agent` y NO overridea el constructor — hereda el `AgentOptions` completo de la clase base, que ya soportaba `tools` desde Hito 6 (`voice.Agent({ instructions, tools })`). El `tools` no tiene ningún vínculo con el hook `onUserTurnCompleted` que `RagAgent` sí overridea — son dos capacidades independientes de `AgentOptions` que conviven en el mismo objeto. CONCEPTO: **composición por herencia sin conflicto** — cada capacidad (RAG vía override de método, tools vía config del constructor) vive en una parte distinta de la clase; combinarlas no requirió escribir lógica de "orquestación" nueva, porque el framework ya las corre en momentos distintos del ciclo de turno (ver TEORÍA en `hito-8.md`).
- **`instructions` actualizada** — QUÉ: el texto ahora menciona explícitamente cuándo usar corpus vs cuándo usar tools. POR DETRÁS: no es una API nueva — mismo campo `instructions` de siempre, solo con texto más específico. CONCEPTO: la "orquestación" entre RAG y tools no es código, es **prompt engineering**: el LLM decide con qué responder (contexto ya inyectado, tool a invocar, o ambos) guiado por este texto, no por una regla programada.

## Resto del archivo (pipeline, `cli.runApp`)
Sin cambios vs Hito 6/7 — mismo `AgentSession({stt, llm, tts})`, misma línea de swap comentada, mismo `ServerOptions`.

## El ciclo completo de un turno combinado
1. Humano habla → STT → texto transcripto.
2. `onUserTurnCompleted` de `RagAgent` corre primero: recupera contexto del corpus, lo inyecta como mensaje `system`. Log `[RAG] query=...`.
3. LLM piensa con `chatCtx` ya enriquecido. Si la pregunta lo amerita (según `description` de cada tool + `instructions`), invoca `webSearch` y/o `getTime` — mecanismo de function-calling estándar, sin relación con el paso 2.
4. LLM redacta UNA respuesta final combinando: contexto del corpus + resultado de tool(s) (si corrieron) → TTS la sintetiza → audio a la sala.

Diferencia clave vs Hito 6 (solo tools) o Hito 7 (solo RAG): acá el `chatCtx` que ve el LLM en el paso 3 ya tiene el contexto del corpus Y las tools disponibles al mismo tiempo — ninguna de las dos capacidades se desactiva por la presencia de la otra.
