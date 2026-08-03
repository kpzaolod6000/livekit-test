## ADDED Requirements

### Requirement: RAG y tools combinados en un mismo turno de streaming
El ejercicio del Hito 4 SHALL permitir que, dentro de un mismo turno de Chat Completions API en streaming, el modelo use contexto recuperado vía RAG y además pueda invocar tools declaradas, según lo requiera la pregunta del usuario.

#### Scenario: Pregunta que requiere contexto y acción externa
- **WHEN** la pregunta del usuario requiere tanto datos del corpus indexado como una acción o dato externo vía tool
- **THEN** el sistema recupera e inyecta el contexto relevante y permite al modelo invocar la tool necesaria, todo dentro del mismo turno de streaming, sin requerir que el usuario reinicie la conversación

### Requirement: Orden de resolución no bloquea el streaming
La resolución de recuperación RAG y de function calls SHALL coexistir sin impedir que la respuesta final se transmita en streaming al usuario.

#### Scenario: Tool y contexto resueltos antes de respuesta final
- **WHEN** tanto el contexto RAG como el resultado de una tool ya fueron incorporados a la conversación
- **THEN** el modelo transmite su respuesta final en streaming incorporando ambas fuentes de información
