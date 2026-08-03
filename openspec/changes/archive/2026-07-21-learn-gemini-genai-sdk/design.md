## Context

Proyecto vacío (sin `package.json` al iniciar este change). El usuario aprende `@google/genai` de cero, mentoreado por IA, en 8 hitos correlativos que van de HTTP streaming simple hasta Gemini Live API con RAG+tools. No hay código productivo existente que afecte esta spec — es un plan de mentoría, no un sistema en producción.

## Goals / Non-Goals

**Goals:**
- Progresión estrictamente secuencial: no se explica ni se entrega código de un hito sin cerrar el anterior.
- Cada hito usa exclusivamente `@google/genai` (SDK oficial actual), nunca `@google/generative-ai`.
- Cada hito es evaluable: el usuario entrega código, el mentor lo revisa contra la spec del hito antes de avanzar.

**Non-Goals:**
- No se define aquí infraestructura de producción (deploy, CI/CD, hosting) — es aprendizaje local.
- No se elige aquí un vector store específico para RAG (Hitos 3, 4, 7, 8) — se decide al llegar a ese hito, según lo que exista en el entorno del usuario.
- No se cubre autenticación/manejo de secretos más allá de buenas prácticas básicas (`.env` + `GEMINI_API_KEY`).

## Decisions

**1. `@google/genai` como único SDK permitido.**
Alternativa descartada: `@google/generative-ai` (SDK legacy, deprecado, sin soporte para Live API con la misma ergonomía). `@google/genai` unifica Developer API y Vertex AI bajo una interfaz, y es el que Google mantiene activamente — evita que el usuario aprenda una API que va a tener que migrar después.

**2. Progresión estrictamente secuencial (gate por hito).**
Alternativa descartada: exponer los 8 hitos de una vez y dejar que el usuario navegue libremente. Se descarta porque el objetivo es dominio progresivo — RAG+Tools (Hito 4) no tiene sentido pedagógico sin haber entendido tools (Hito 2) y RAG (Hito 3) por separado primero. El gate lo aplica el mentor, no una herramienta automática.

**3. Los 8 hitos + reglas de mentor son capabilities separadas, no una sola.**
Alternativa descartada: una sola capability "mentoria-gemini" con todo adentro. Se separó porque cada hito tiene criterios de aceptación (scenarios) distintos y verificables independientemente — permite marcar hitos como completados uno a uno vía tasks.md, y auditar cada uno contra su spec sin mezclar criterios.

**4. HTTP streaming (Hitos 1-4) antes de Live API (Hitos 5-8).**
Refleja la dificultad creciente real del SDK: `chats.create` + `sendMessageStream` es más simple que gestionar una sesión WebSocket bidireccional. Repetir la misma progresión conceptual (simple → tools → RAG → RAG+tools) en Live API refuerza el aprendizaje sin introducir conceptos nuevos de golpe.

## Risks / Trade-offs

- **[Riesgo] Usuario se salta el reto y pide el hito siguiente directamente.** → Mitigación: regla de mentor (`mentor-interaction-rules`) exige revisión de código entregado antes de avanzar; el mentor no debe ceder ante presión de "solo dame el siguiente".
- **[Riesgo] SDK `@google/genai` cambia su API (es relativamente nuevo).** → Mitigación: mentor debe verificar sintaxis contra docs oficiales (ai.google.dev, github.com/googleapis/js-genai) en cada hito, no confiar solo en memoria/training data.
- **[Riesgo] RAG (Hitos 3,4,7,8) sin vector store elegido de antemano puede bloquear avance.** → Mitigación: al llegar a Hito 3, mentor y usuario eligen juntos una solución simple (ej. in-memory embeddings) apta para aprendizaje, no producción.
- **[Trade-off] Live API (Hitos 5-8) requiere manejo de WebSocket que Node.js no tiene nativo tan simple como fetch.** → Aceptado: es parte del aprendizaje explícito del hito; el mentor debe explicarlo como parte de TEORÍA de Hito 5.

## Open Questions

- ¿El usuario ya tiene una cuenta/API key de Gemini activa, o eso se resuelve como paso previo al Hito 1?
- Para RAG (Hito 3), ¿se usará un corpus de ejemplo provisto por el mentor o documentos propios del usuario?
