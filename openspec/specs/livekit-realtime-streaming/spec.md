# livekit-realtime-streaming Specification

## Purpose
TBD - created by archiving change learn-livekit-sdk. Update Purpose after archive.
## Requirements
### Requirement: Sesión Realtime con modelo multimodal único
El ejercicio del Hito 9 SHALL implementar un `AgentSession` que use un modelo realtime único (sin componer STT/LLM/TTS separados) dentro de la sala LiveKit, para conversación de voz bidireccional en vivo.

#### Scenario: Conversación de voz en vivo vía modelo realtime
- **WHEN** el usuario habla al agente conectado en modo Realtime
- **THEN** el agente responde en voz usando un único modelo multimodal, sin pasos separados de transcripción y síntesis orquestados por la aplicación

### Requirement: Mismo componente probado con ambos providers Realtime
El ejercicio del Hito 9 SHALL probar la misma configuración de `AgentSession` Realtime contra `openai('gpt-realtime')` y `google('gemini-2.5-flash-native-audio-preview-12-2025')` (o el identificador de modelo Live vigente al momento del hito, confirmado en vivo si difiere).

#### Scenario: Mismo agente Realtime, distinto provider
- **WHEN** se conecta el agente Realtime configurado en OpenAI y luego en Gemini
- **THEN** ambas conexiones sostienen una conversación de voz bidireccional en vivo, difiriendo solo en el provider del modelo realtime

### Requirement: Entrada y salida por texto dentro de la sesión Realtime
El ejercicio del Hito 9 SHALL soportar, dentro de la misma sesión Realtime, entrada por texto además de audio, y salida por texto (transcripción) además de audio — reflejando la migración desde una app Gemini Live nativa que usa `sendClientContent` (texto), `sendRealtimeInput` (audio) y recibe respuestas streameadas por `onmessage`.

#### Scenario: Usuario envía texto en sesión Realtime
- **WHEN** el usuario envía un mensaje de texto (no audio) durante una sesión Realtime activa
- **THEN** el agente procesa el texto en la misma sesión y responde, sin abrir una conexión separada ni reiniciar la sesión

#### Scenario: Salida disponible en texto y audio
- **WHEN** el agente Realtime genera una respuesta
- **THEN** la respuesta está disponible tanto como audio como en texto (transcripción de la respuesta del agente), para poder renderizar ambas modalidades en la UI

#### Scenario: Mapeo explícito desde Gemini Live nativo
- **WHEN** el mentor entrega la TEORÍA de este hito
- **THEN** incluye el mapeo conceptual entre la API nativa de Gemini Live (`live.connect`, `sendClientContent`, `sendRealtimeInput`, `onmessage`) y sus equivalentes en LiveKit Agents (`AgentSession` + `RealtimeModel`, entrada de texto/audio, salida por track y transcripción)

