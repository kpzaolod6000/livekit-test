'use client';
import { useMemo } from 'react';
import { experimental_useRealtime as useRealtime } from '@ai-sdk/react';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export function RealtimeChat({ providerArg }: { providerArg: 'openai' | 'gemini' }) {
  const model = useMemo(
    () => providerArg === 'gemini'
      ? google.experimental_realtime('gemini-3.1-flash-live-preview')
      : openai.experimental_realtime('gpt-realtime'),
    [providerArg],
  );

  const sessionConfig = useMemo(() => ({ outputModalities: ['audio'] as const }), []);

  const { status, messages, connect, disconnect, sendTextMessage, isCapturing, isPlaying } = useRealtime({
    model,
    api: { token: `/api/realtime-token?provider=${providerArg}` },
    sessionConfig,
    onError: (e) => console.error('[realtime error]', e),
    onEvent: (ev) => console.log('[realtime event]', ev),
  });

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, marginBottom: 16 }}>
      <h3>{providerArg}</h3>
      <p>Status: {status} | Mic: {isCapturing ? 'capturando' : 'off'} | Audio: {isPlaying ? 'reproduciendo' : 'off'}</p>
      <button onClick={connect} disabled={status === 'connected'}>Conectar</button>{' '}
      <button onClick={disconnect} disabled={status !== 'connected'}>Desconectar</button>{' '}
      <button onClick={() => sendTextMessage('Hola, quién sos?')} disabled={status !== 'connected'}>
        Enviar mensaje de prueba
      </button>
      <ul>{messages.map((m, i) => <li key={i}>{JSON.stringify(m)}</li>)}</ul>
    </div>
  );
}
