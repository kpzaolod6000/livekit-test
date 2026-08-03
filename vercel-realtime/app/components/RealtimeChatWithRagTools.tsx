'use client';
import { useState, useEffect, useMemo } from 'react';
import { experimental_useRealtime as useRealtime } from '@ai-sdk/react';
import { tool, experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const getTime = tool({
  description: 'Obtiene la hora actual del sistema',
  inputSchema: z.object({}),
  execute: async () => ({ time: new Date().toLocaleTimeString() }),
});

const tools = { getTime };

export function RealtimeChatWithRagTools({ providerArg }: { providerArg: 'openai' | 'gemini' }) {
  const [question, setQuestion] = useState('¿Qué es RAG y qué hora es?');
  const [realtimeTools, setRealtimeTools] = useState<any[]>([]);

  useEffect(() => {
    getRealtimeToolDefinitions({ tools }).then(setRealtimeTools);
  }, []);

  const model = useMemo(
    () => providerArg === 'gemini'
      ? google.experimental_realtime('gemini-3.1-flash-live-preview')
      : openai.experimental_realtime('gpt-realtime'),
    [providerArg],
  );

  // RAG + tools + audio, todo en la misma sesión
  const sessionConfig = useMemo(
    () => ({ outputModalities: ['audio'] as const, tools: realtimeTools }),
    [realtimeTools],
  );

  const { status, messages, connect, disconnect, sendTextMessage } = useRealtime({
    model,
    api: { token: `/api/realtime-token?provider=${providerArg}` },
    sessionConfig,
    onToolCall: async ({ toolCall }) => {
      console.log('[onToolCall]', toolCall.toolName, toolCall);
      if (toolCall.toolName === 'getTime') {
        return await tools.getTime.execute!({}, {} as any);
      }
      throw new Error(`Tool desconocida: ${toolCall.toolName}`);
    },
    onError: (e) => console.error('[realtime error]', e),
  });

  // Turno combinado: recupera contexto RAG (servidor) e inyecta; el modelo puede además llamar la tool.
  async function askCombined() {
    const res = await fetch('/api/rag-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });
    const { context } = await res.json();
    sendTextMessage(
      `Usá el contexto para la parte conceptual y la tool getTime para la hora si hace falta.\n\nContexto:\n${context}\n\nPregunta: ${question}`,
    );
  }

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, marginBottom: 16 }}>
      <h3>{providerArg} (RAG + tools)</h3>
      <p>Status: {status}</p>
      <button onClick={connect} disabled={status === 'connected' || realtimeTools.length === 0}>Conectar</button>{' '}
      <button onClick={disconnect} disabled={status !== 'connected'}>Desconectar</button>
      <div style={{ marginTop: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: '60%' }}
          placeholder="Pregunta que combine corpus + tool"
        />{' '}
        <button onClick={askCombined} disabled={status !== 'connected'}>
          Preguntar (RAG + tool)
        </button>
      </div>
      <ul>{messages.map((m, i) => <li key={i}>{JSON.stringify(m)}</li>)}</ul>
    </div>
  );
}
