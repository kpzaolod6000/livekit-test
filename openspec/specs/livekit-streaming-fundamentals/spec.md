# livekit-streaming-fundamentals Specification

## Purpose
TBD - created by archiving change learn-livekit-sdk. Update Purpose after archive.
## Requirements
### Requirement: Servidor LiveKit self-hosted corriendo localmente
El ejercicio del Hito 5 SHALL correr contra una instancia de `livekit-server` self-hosted en modo desarrollo (`livekit-server --dev`), sin dependencia de cuenta LiveKit Cloud, usando las credenciales de desarrollo por defecto (`devkey` / `secret`).

#### Scenario: Verificación de servidor antes de implementar
- **WHEN** el usuario inicia el ejercicio del Hito 5
- **THEN** confirma que `livekit-server --dev` está corriendo localmente antes de conectar cualquier cliente o agente

### Requirement: Conversación de voz vía pipeline STT-LLM-TTS con instrucciones de sistema
El ejercicio del Hito 5 SHALL implementar un `AgentSession` (framework `@livekit/agents`) que componga un modelo de Speech-to-Text, un LLM y un modelo de Text-to-Speech, con instrucciones de sistema definidas para el agente, y SHALL unir al agente a una sala LiveKit donde un participante humano (frontend cliente) puede hablarle y escucharlo.

#### Scenario: Usuario habla al agente
- **WHEN** un participante humano se une a la sala y habla por el micrófono
- **THEN** el agente transcribe el audio (STT), genera una respuesta con el LLM respetando las instrucciones de sistema, y la sintetiza como audio (TTS) audible para el participante

### Requirement: Mismo pipeline ejecutado contra ambos providers de LLM
El ejercicio del Hito 5 SHALL ejecutar el mismo `AgentSession` cambiando únicamente el provider del componente LLM (OpenAI y Gemini), sin modificar la estructura del pipeline STT-TTS ni el código de la aplicación.

#### Scenario: Mismo pipeline, distinto provider de LLM
- **WHEN** se ejecuta el agente configurado con el LLM de OpenAI y luego reconfigurado solo en el LLM hacia Gemini
- **THEN** ambas ejecuciones usan el mismo pipeline STT-TTS y la misma estructura de `AgentSession`, difiriendo solo en el provider del componente LLM

### Requirement: App Next.js (frontend + token) separada del agent worker
El ejercicio del Hito 5 SHALL mantener la app **Next.js** (frontend con `@livekit/components-react` + route handler de tokens `app/api/token` con `livekit-server-sdk`) como proceso separado del agent worker (`@livekit/agents`), reflejando la arquitectura de 2 procesos propios (app Next.js + worker) sobre el `livekit-server` self-hosted.

#### Scenario: Usuario se une a la sala
- **WHEN** el frontend cliente solicita unirse a una sala
- **THEN** primero obtiene un token JWT del servidor de tokens, y luego usa ese token para conectar a la sala vía WebRTC, sin que el agent worker participe en la emisión de tokens

