## ADDED Requirements

### Requirement: Contexto RAG disponible dentro de sesión Realtime
El ejercicio del Hito 7 SHALL poner a disposición del modelo, dentro de una sesión Realtime activa, contexto recuperado de un corpus indexado (vía `embedMany`/`embed` + `cosineSimilarity`), ya sea inyectado en las instrucciones de la sesión o expuesto como tool de recuperación.

#### Scenario: Pregunta sobre corpus dentro de sesión Realtime
- **WHEN** el usuario pregunta algo relacionado al corpus indexado mientras la sesión Realtime está abierta
- **THEN** el sistema recupera el contexto relevante y lo pone a disposición del modelo antes de que este genere su respuesta

### Requirement: Sesión Realtime se mantiene con RAG
La recuperación de contexto RAG SHALL ocurrir sin cerrar ni bloquear la sesión Realtime activa.

#### Scenario: Recuperación de contexto no interrumpe la sesión
- **WHEN** el sistema recupera contexto antes de responder
- **THEN** la sesión Realtime permanece abierta durante y después de la recuperación

### Requirement: Mismo mecanismo de RAG funciona con ambos providers Realtime
El ejercicio del Hito 7 SHALL usar el mismo mecanismo de inyección de contexto contra `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`.

#### Scenario: Mismo corpus, ambos providers Realtime
- **WHEN** se prueba la misma pregunta sobre el corpus con ambos providers Realtime
- **THEN** ambos responden usando el mismo contexto recuperado, difiriendo solo en el provider del modelo

### Requirement: RAG funciona con salida de texto y audio simultáneos
La sesión Realtime del Hito 7 SHALL mantener `outputModalities: ['audio']` (heredado del Hito 5, ver corrección en `vercel-ai-realtime-streaming`) mientras recupera e inyecta contexto RAG, conservando texto simultáneo vía transcripción.

#### Scenario: Contexto RAG con audio activo
- **WHEN** el sistema recupera contexto del corpus mientras la sesión responde en texto y audio
- **THEN** la respuesta final incluye audio real Y texto, apoyados en el mismo contexto recuperado
