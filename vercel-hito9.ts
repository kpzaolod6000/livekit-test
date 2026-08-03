import 'dotenv/config';
import { experimental_generateSpeech as generateSpeech, experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

// Hito 9 — Transcripción (speech-to-text), OpenAI-only.
// Google no expone modelo de transcripción en este SDK (@ai-sdk/google), así que
// este hito NO tiene comparación "mismo código, ambos providers": es la excepción
// documentada del plan (ver design.md, decisión 7).

const AUDIO_FILE = './sample-audio.mp3';
const FRASE = 'Hola, esto es una prueba de transcripción con el Vercel AI SDK usando Whisper.';

async function main() {
  // 1. Si no hay audio pregrabado, generá uno con TTS (openai.speech) para tener qué transcribir.
  if (!existsSync(AUDIO_FILE)) {
    console.log('[TTS] generando audio de prueba...');
    const speech = await generateSpeech({
      model: openai.speech('tts-1'),
      text: FRASE,
      voice: 'alloy',
    });
    writeFileSync(AUDIO_FILE, speech.audio.uint8Array);
    console.log(`[TTS] audio guardado en ${AUDIO_FILE} (${speech.audio.uint8Array.length} bytes)`);
  }

  // 2. Transcribí el audio pregrabado con whisper-1.
  const audio = new Uint8Array(readFileSync(AUDIO_FILE));
  console.log('[STT] transcribiendo con whisper-1...');
  const result = await transcribe({
    model: openai.transcription('whisper-1'),
    audio,
  });

  console.log('\n--- TRANSCRIPCIÓN ---');
  console.log(result.text);
  console.log('---------------------');
  console.log(`\nFrase original: ${FRASE}`);
  console.log(`duración detectada: ${result.durationInSeconds ?? '?'}s | idioma: ${result.language ?? '?'}`);
}

main();
