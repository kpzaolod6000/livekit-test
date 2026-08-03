## Context

Tercera vuelta del plan de mentoría, esta vez con **Vercel AI SDK** — la capa de abstracción multi-provider. El usuario ya completó los planes equivalentes con los SDKs nativos de Gemini y OpenAI (`openspec/changes/archive/`). El objetivo explícito aquí NO es aprender un provider nuevo, sino aprender la **abstracción**: cómo el mismo código sirve para ambos providers ya conocidos.

Investigación previa a este change (vía docs oficiales, ai-sdk.dev):
- `ai` (core) expone `generateText`, `streamText`, `tool()`, `embed`/`embedMany`, y un helper nativo `cosineSimilarity` — simplifica bastante respecto a los SDKs nativos (no hay que reconstruir tool calls fragmentados a mano, ni escribir cosine similarity propio).
- `@ai-sdk/openai` y `@ai-sdk/google` exponen `openai(modelId)` / `google(modelId)` como referencias de modelo intercambiables.
- La sección **Realtime** (`experimental_*`, aún experimental) SÍ cubre bidireccional WebSocket para `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')` — pero es una API de **React/navegador** (`experimental_useRealtime` hook, captura de mic, token efímero generado en servidor), no un helper de Node puro como los SDKs nativos.

## Goals / Non-Goals

**Goals:**
- Cada hito 1-4 corre el MISMO código Node CLI contra ambos providers, cambiando solo `model: openai(...)` vs `model: google(...)` — demuestra la abstracción en la práctica, no solo en teoría.
- Hitos 5-8 usan la arquitectura Realtime real del SDK (React + servidor de tokens), aceptando el cambio de entorno respecto a los planes anteriores.
- Aprovechar las simplificaciones nativas del SDK (`tool()` con `execute` automático, `cosineSimilarity` nativo) en vez de replicar la implementación manual de los SDKs nativos.

**Non-Goals:**
- No se re-explica el comportamiento del mentor (`mentor-interaction-rules`, ya definido y reusado sin cambios).
- Hitos 5-8 SÍ implementan audio real simultáneo con texto — mic real vía `getUserMedia`, parlante real vía Web Audio (ya manejado internamente por `experimental_useRealtime`). Mecanismo real (corregido tras probar contra la API): `outputModalities` solo acepta un valor único (`['text']` o `['audio']`), nunca ambos combinados — usar `['audio']`; el texto simultáneo llega por separado vía eventos de transcripción de audio (`audio-transcript-delta`/`-done`), que el hook ya mapea a `messages`.
- No se define infraestructura de producción/deploy — sigue siendo aprendizaje local.

## Decisions

**1. Comparación lado a lado (mismo código, swap de modelo) en vez de hitos alternados por provider.**
Alternativa descartada: dividir hitos por provider (impares Gemini, pares OpenAI). Se descarta porque el valor pedagógico central de Vercel AI SDK es la abstracción — verla funcionar con el MISMO código y solo cambiar el modelo es la lección, no solo repetir SDKs distintos.

**2. Realtime real (React + navegador) en vez de mantenerlo en Node CLI.**
Alternativa descartada: redefinir Hitos 5-8 a algo Node-puro (agentes multi-step, fallback entre providers). Se descarta porque el usuario explícitamente quiere ver el mecanismo Realtime real del SDK — que es justo el que unifica `gpt-realtime` y `gemini-3.1-flash-live-preview` bajo la misma API, algo que no vimos en los SDKs nativos (ahí cada uno tenía su propio protocolo WebSocket a mano).

**3. Corpus RAG: a decidir al llegar al Hito 3 (reusar el de los changes anteriores, o uno nuevo) — mismo patrón que en los dos changes previos.**

**4. Framework de frontend para Hitos 5-8: a decidir al llegar al Hito 5** — la doc no especifica un framework obligatorio, `experimental_useRealtime` es un hook de React que funciona en cualquier setup React (Next.js, Vite+React, etc). Se elige el más liviano posible para no distraer del objetivo pedagógico (probablemente Vite+React sobre Next.js completo, salvo que el usuario prefiera Next.js).

**5. Selección de provider vía argumento de terminal, no edición manual de código.**
En vez de que el usuario edite la línea `const model = openai(...)` cada vez que quiere comparar, los ejercicios de Hitos 1-4 (Node CLI) SHALL leer el provider desde `process.argv` (ej. `npx tsx vercel-hito1.ts openai` o `... gemini`). Mismo código, cero ediciones — el swap de provider se vuelve un parámetro de ejecución, no un cambio de archivo. Convención reusada en todos los hitos CLI de este plan.

**6. Audio y texto simultáneos en Hitos 5-8, vía `outputModalities: ['audio']` + transcripción automática (no `['text','audio']` combinado).**
Alternativa descartada: mantener solo texto (decisión original). Se descarta porque el usuario quiere ver el mecanismo de voz real del SDK, que es el caso de uso principal para el que Vercel diseñó Realtime — texto-only dejaba fuera la mitad del valor pedagógico del hito. Corrección (encontrada al implementar Hito 5): la API de OpenAI Realtime rechaza `output_modalities` con más de un valor (`400 invalid_value`, solo admite `['text']` o `['audio']` por separado) — el texto simultáneo se obtiene igual, pero vía los eventos de transcripción de audio, no configurando ambas modalidades a la vez.

**7. Hito 9 (transcripción, speech-to-text) es OpenAI-only — Google no lo soporta en este SDK.**
Verificado: `@ai-sdk/google` no expone ningún método de transcripción (ni `.transcription()` ni equivalente); `@ai-sdk/openai` sí (`whisper-1`, `gpt-4o-transcribe`, etc.). Se acepta como excepción documentada al patrón "mismo código, ambos providers" — es la primera vez que el plan no puede comparar providers lado a lado, por limitación real del SDK, no de diseño.

**8. AI Gateway: descartado para este plan.**
Requiere cuenta Vercel + `AI_GATEWAY_API_KEY` (credencial propia, no las keys de OpenAI/Gemini que ya tenemos) — fuera de alcance sin esa cuenta.

## Risks / Trade-offs

- **[Riesgo] API Realtime marcada `experimental_` — puede cambiar de forma sin aviso entre versiones del SDK.** → Mitigación: verificar con una llamada/conexión de prueba real antes de entregar el contenido teórico de cada hito 5-8, igual que se hizo con los SDKs nativos (mismo patrón que ya funcionó bien: no confiar solo en la doc, probar primero).
- **[Riesgo] Cambio de arquitectura (CLI → React/navegador) en Hitos 5-8 puede ser un salto grande si el usuario no tiene experiencia previa con React.** → Mitigación: mentor debe explicar en TEORÍA del Hito 5 los conceptos de React estrictamente necesarios (qué es un hook, por qué el token se genera en servidor), sin asumir conocimiento previo de React.
- **[Riesgo] `embed`/`embedMany` y modelos de embedding pueden diferir en dimensiones entre Gemini y OpenAI — comparar RAG "lado a lado" entre providers de chat no implica que el embedding también deba cambiar.** → Mitigación: usar UN SOLO provider de embeddings consistente (a decidir en Hito 3) para que la recuperación no varíe, solo el modelo de generación de texto cambia entre providers.
- **[Trade-off] Tools en Realtime vía `onToolCall`/`addToolOutput` puede tener timing distinto al de `tool()` con `execute` de Hitos 1-4.** → Aceptado: se verifica y ajusta al implementar Hito 6, como ya fue el patrón en los 2 changes anteriores.
- **[Riesgo] Audio real en navegador (mic/parlante) agrega permisos y estado que Node CLI no tenía.** → Mitigación: el hook `experimental_useRealtime` ya maneja captura/reproducción (`isCapturing`/`isPlaying`) — mentor debe explicar en TEORÍA del Hito 5 que hay que otorgar permiso de micrófono en el navegador la primera vez.
- **[Riesgo] `outputModalities` de OpenAI Realtime NO acepta combinar `['text','audio']` (400 `invalid_value`) — solo un valor a la vez.** → Mitigación: usar `outputModalities: ['audio']`; el texto simultáneo llega igual vía eventos de transcripción de audio (`audio-transcript-delta`/`-done`), que el hook mapea a `messages` sin código adicional. Pendiente confirmar si Gemini tiene la misma restricción.

## Open Questions

- ¿Reusar el mismo corpus `.txt` de los changes anteriores para RAG (Hito 3), o preparar uno nuevo?
- ¿Vite+React o Next.js para los Hitos 5-8? (o algo aún más liviano si existe)
- ¿El usuario ya tiene ambas API keys (OpenAI, Gemini) configuradas — ya deberían estar de los changes anteriores, pero confirmar que siguen con cuota disponible.
