## Purpose

Transcripción de audio pregrabado con el Vercel AI SDK: uso de `transcribe()` con un modelo de `@ai-sdk/openai`, documentando explícitamente que este hito es una excepción OpenAI-only al patrón de comparación dual-provider del plan (Hito 9).

## Requirements

### Requirement: Transcripción de audio pregrabado con transcribe()
El ejercicio del Hito 9 SHALL transcribir un archivo de audio pregrabado a texto usando la función `transcribe()` de `ai` con un modelo de `@ai-sdk/openai` (`whisper-1` o `gpt-4o-transcribe`).

#### Scenario: Transcripción de un audio de prueba
- **WHEN** el usuario provee un archivo de audio pregrabado al ejercicio
- **THEN** el sistema devuelve el texto transcripto correspondiente al contenido hablado del audio

### Requirement: Limitación OpenAI-only documentada
El ejercicio del Hito 9 SHALL documentar explícitamente que la transcripción solo está disponible con `@ai-sdk/openai` en este SDK, sin comparación equivalente contra Google, a diferencia de todos los hitos anteriores del plan.

#### Scenario: Usuario intenta comparar con Google
- **WHEN** el usuario pregunta por un equivalente de transcripción con `@ai-sdk/google`
- **THEN** el mentor explica que `@ai-sdk/google` no expone un modelo de transcripción en este SDK, y que este hito es una excepción documentada al patrón de comparación dual-provider del plan
