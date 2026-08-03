## Purpose

Arquitectura RAG sobre Chat Completions API: recuperación de contexto de un corpus indexado (vía `client.embeddings.create`) antes de generar la respuesta (Hito 3 del plan de estudios OpenAI).

## Requirements

### Requirement: Recuperación de contexto previa a la generación
El ejercicio del Hito 3 SHALL recuperar fragmentos relevantes de un corpus indexado (embeddings vía `client.embeddings.create`) antes de enviar el prompt aumentado a Chat Completions API.

#### Scenario: Pregunta relacionada al corpus indexado
- **WHEN** el usuario hace una pregunta relacionada al contenido del corpus
- **THEN** el sistema recupera los fragmentos más relevantes y los incluye como contexto en el mensaje `role: 'user'` (o `system`) del array `messages` enviado al modelo, antes de iniciar el streaming

### Requirement: Respuesta en streaming basada en contexto recuperado
El modelo SHALL generar y transmitir en streaming una respuesta que se apoye en el contexto recuperado por RAG.

#### Scenario: Respuesta generada con contexto inyectado
- **WHEN** el contexto recuperado se envía junto al mensaje del usuario
- **THEN** la respuesta se transmite en streaming y su contenido refleja o se basa en la información del contexto recuperado, no solo en conocimiento genérico del modelo
