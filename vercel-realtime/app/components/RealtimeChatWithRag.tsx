'use client';
import { useState, useMemo } from 'react';
import { experimental_useRealtime as useRealtime } from '@ai-sdk/react';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export function RealtimeChatWithRag({ providerArg }: { providerArg: 'openai' | 'gemini' }) {
  const [question, setQuestion] = useState('¿Qué es RAG?');

  const model = useMemo(
    () => providerArg === 'gemini'
      ? google.experimental_realtime('gemini-3.1-flash-live-preview')
      : openai.experimental_realtime('gpt-realtime'),
    [providerArg],
  );

  const sessionConfig = useMemo(() => ({ outputModalities: ['audio'] as const }), []);

  const { status, messages, connect, disconnect, sendTextMessage } = useRealtime({
    model,
    api: { token: `/api/realtime-token?provider=${providerArg}` },
    sessionConfig,
    onError: (e) => console.error('[realtime error]', e),
  });

  // RAG: recupera contexto en el servidor (embeddings ahí, key segura) y lo inyecta en el turno.
  async function askWithRag() {
    const res = await fetch('/api/rag-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });
    const { context } = await res.json();
    sendTextMessage(
      `Usá SOLO este contexto para responder.\n\nContexto:\n${context}\n\nPregunta: ${question}`,
    );
  }

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, marginBottom: 16 }}>
      <h3>{providerArg} (RAG)</h3>
      <p>Status: {status}</p>
      <button onClick={connect} disabled={status === 'connected'}>Conectar</button>{' '}
      <button onClick={disconnect} disabled={status !== 'connected'}>Desconectar</button>
      <div style={{ marginTop: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: '60%' }}
          placeholder="Preguntá algo del corpus"
        />{' '}
        <button onClick={askWithRag} disabled={status !== 'connected'}>
          Preguntar con RAG
        </button>
      </div>
      <ul>{messages.map((m, i) => <li key={i}>{JSON.stringify(m)}</li>)}</ul>
    </div>
  );
}
