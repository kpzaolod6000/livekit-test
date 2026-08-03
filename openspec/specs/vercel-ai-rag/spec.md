## Purpose

RAG (Retrieval-Augmented Generation) con el Vercel AI SDK: indexación de un corpus con `embedMany`/`embed`, recuperación con el helper nativo `cosineSimilarity`, e inyección de contexto antes de `streamText`, funcionando igual cambiando el provider de chat vía argumento de terminal (Hito 3).

## Requirements

### Requirement: Recuperación de contexto con embed/embedMany y cosineSimilarity nativo
El ejercicio del Hito 3 SHALL indexar un corpus usando `embedMany` (o `embed` por fragmento) del paquete `ai`, y SHALL recuperar los fragmentos más relevantes usando el helper nativo `cosineSimilarity`, antes de llamar `streamText`.

#### Scenario: Pregunta relacionada al corpus indexado
- **WHEN** el usuario hace una pregunta relacionada al contenido del corpus
- **THEN** el sistema recupera los fragmentos más relevantes usando `cosineSimilarity` sobre los embeddings generados, y los incluye como contexto en el mensaje enviado antes de iniciar el streaming

### Requirement: RAG funciona igual cambiando el provider de chat vía argumento de terminal
El ejercicio del Hito 3 SHALL generar la respuesta final usando el mismo contexto recuperado, ejecutando el mismo código contra `openai(...)` y `google(...)` como modelo de chat, seleccionado por argumento de línea de comandos.

#### Scenario: Mismo contexto, distinto provider de chat vía argumento
- **WHEN** se genera la respuesta final con el argumento `openai` y luego con el argumento `gemini`, usando el mismo contexto RAG recuperado
- **THEN** ambas respuestas se apoyan en el mismo contexto, difiriendo solo en el proveedor del modelo de chat usado para generar el texto, sin cambios de código entre corridas
