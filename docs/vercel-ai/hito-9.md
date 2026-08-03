# Hito 9 — Transcripción (speech-to-text, OpenAI-only)

## TEORÍA

Último hito, y el ÚNICO que rompe el patrón "mismo código, ambos providers" de todo el plan — por una limitación real del SDK, no de diseño:

- **`@ai-sdk/openai` SÍ expone transcripción**: `openai.transcription('whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' | ...)`.
- **`@ai-sdk/google` NO expone ningún modelo de transcripción** en este SDK. No hay `.transcription()` ni equivalente.

Por eso Hito 9 es **OpenAI-only**, documentado como excepción en `design.md` (decisión 7). Es la primera vez en los 3 planes (Gemini nativo, OpenAI nativo, Vercel AI) que no se puede comparar providers lado a lado.

Además, es **Node puro** (no browser): `transcribe()` es una función del core `ai`, no un hook de React. Vuelve al entorno de los hitos 1-4.

```
audio pregrabado (bytes)  ──►  transcribe({ model: openai.transcription('whisper-1'), audio })  ──►  { text, language, durationInSeconds }
```

## CÓMO IMPLEMENTARLO

`transcribe()` (exportada como `experimental_transcribe`) toma `audio: DataContent | URL` — un `Uint8Array` de bytes de audio sirve directo.

Para tener qué transcribir sin depender de un archivo externo, este ejercicio primero **genera** un audio con TTS (`generateSpeech`, también OpenAI) y después lo transcribe — round-trip texto→voz→texto self-contained.

```typescript
import { experimental_generateSpeech as generateSpeech, experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// 1. TTS: texto → audio (solo si no existe ya el archivo)
const speech = await generateSpeech({ model: openai.speech('tts-1'), text: FRASE, voice: 'alloy' });
writeFileSync('./sample-audio.mp3', speech.audio.uint8Array);

// 2. STT: audio → texto
const audio = new Uint8Array(readFileSync('./sample-audio.mp3'));
const result = await transcribe({ model: openai.transcription('whisper-1'), audio });
console.log(result.text);              // el texto transcripto
console.log(result.language);          // 'es'
console.log(result.durationInSeconds); // duración del audio
```

## LA TAREA

1. Implementá `vercel-hito9.ts` (arriba).
2. Corré `npx tsx vercel-hito9.ts`. Confirmá: genera `sample-audio.mp3`, y la transcripción coincide (o casi) con la frase original.
3. (Opcional) Probá `openai.transcription('gpt-4o-transcribe')` en vez de `whisper-1` y compará.

## HALLAZGOS (verificado)

- **Corrido end-to-end OK**: `tts-1` generó 97920 bytes de audio; `whisper-1` transcribió a español, `durationInSeconds ≈ 4.89`, `language: 'es'`.
- Único desvío: "Vercel" salió como "Vercell" — típico de STT con nombres propios/marcas, no es un bug. El resto de la frase, exacto.
- `transcribe()` acepta `Uint8Array` directo. Ojo: `readFileSync` devuelve un `Buffer`; envolverlo en `new Uint8Array(...)` evita ambigüedad de tipos.
- Modelos disponibles en `@ai-sdk/openai@4.x`: `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`, `gpt-realtime-whisper`.
- **Confirmado que Google no tiene transcripción en el SDK** — `@ai-sdk/google` no expone `.transcription()`. Excepción OpenAI-only real.
