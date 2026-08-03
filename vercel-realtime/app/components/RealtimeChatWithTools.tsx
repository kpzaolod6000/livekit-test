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

export function RealtimeChatWithTools({ providerArg }: { providerArg: 'openai' | 'gemini' }) {
  const [realtimeTools, setRealtimeTools] = useState<any[]>([]);

  useEffect(() => {
    getRealtimeToolDefinitions({ tools })
    .then(setRealtimeTools)
    .catch(err => console.error('[tools] fallo al cargar', err));
  }, []);

  const model = useMemo(
    () => providerArg === 'gemini'
      ? google.experimental_realtime('gemini-3.1-flash-live-preview')
      : openai.experimental_realtime('gpt-realtime'),
    [providerArg],
  );

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
  });

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, marginBottom: 16 }}>
      <h3>{providerArg} (con tools)</h3>
      <p>Status: {status}</p>
      <button onClick={connect} disabled={status === 'connected' || realtimeTools.length === 0}>Conectar</button>{' '}
      <button onClick={disconnect} disabled={status !== 'connected'}>Desconectar</button>{' '}
      <button onClick={() => sendTextMessage('qué hora es?')} disabled={status !== 'connected'}>
        Preguntar hora (dispara tool)
      </button>
      <ul>{messages.map((m, i) => <li key={i}>{JSON.stringify(m)}</li>)}</ul>
    </div>
  );
}
