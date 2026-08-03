# Hito 6 — Realtime + Tools

## TEORÍA

En hitos 1-4, `tool()` con `execute` hacía TODO automático (el SDK detectaba, ejecutaba, reenviaba). En Realtime **no hay auto-ejecución** — la sesión WebSocket no conoce tu función `execute`, solo entiende el protocolo de eventos del provider. Por eso el flujo tiene un paso manual extra:

1. Declarás tools igual que siempre, con `tool()` (`webSearch`, `getTime` — reusá las de hitos 2/4).
2. `experimental_getRealtimeToolDefinitions({ tools })` convierte esas tools al formato plano que entiende el protocolo Realtime (`{ type: 'function', name, description, parameters }` — SIN el `execute`, porque la sesión no puede llamarlo sola).
3. Pasás ese array a `sessionConfig: { tools: realtimeTools }` al conectar.
4. Cuando el modelo decide usar una tool, llega por el callback `onToolCall({ toolCall })` — ahí VOS ejecutás la lógica (buscando `toolCall.toolName` a mano) y devolvés el resultado.
5. Si `onToolCall` devuelve el resultado (incluso una Promise), la sesión lo resuelve solo. Si necesitás resolverlo más tarde fuera del callback (ej. esperando algo async largo), usás `addToolOutput(callId, result)` en su lugar y no devolvés nada desde `onToolCall`.

```
sessionConfig: { tools: await experimental_getRealtimeToolDefinitions({ tools: { webSearch, getTime } }) }
                              │
                              ▼
         modelo decide usar una tool durante la sesión
                              │
                              ▼
      onToolCall({ toolCall: { toolCallId, toolName, args } })
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
   ejecutás vos mismo (switch/lookup      caso async largo:
   por toolName) y hacés return          addToolOutput(callId, result)
   del resultado                         (sin return en onToolCall)
              │                                │
              └───────────────┬────────────────┘
                               ▼
         sesión sigue en la MISMA conexión, sin reconectar
```

## CÓMO IMPLEMENTARLO

Extendé `RealtimeChat.tsx` del hito 5:

```tsx
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
    getRealtimeToolDefinitions({ tools }).then(setRealtimeTools);
  }, []);

  // memoizar model y sessionConfig (mismo motivo que hito 5: el hook compara por referencia)
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
    api: { token: `/api/realtime-token?provider=${providerArg}` }, // URL del endpoint, NO el secreto
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
```

> Este componente hereda las 3 correcciones del hito 5 (ver `hito-5.md`, sección HALLAZGOS): `api.token` = URL del endpoint (no el secreto), `connect` directo sin `handleConnect`/fetch manual, y `model`/`sessionConfig` memoizados. Sin eso: `405`/`res.json()` explota, o conecta pero los botones nunca se habilitan.

## LA TAREA

1. Creá `RealtimeChatWithTools.tsx` (arriba) y montalo en `page.tsx` junto al de hito 5 (o reemplazalo).
2. Conectá con `providerArg='openai'`, click "Preguntar hora (dispara tool)".
3. Confirmá en la consola/UI que `onToolCall` se disparó (agregá un `console.log` adentro) y que la sesión sigue respondiendo sin reconectar.
4. Repetí con `providerArg='gemini'`, mismo código.

## HALLAZGOS AL IMPLEMENTAR (verificado headless + browser, ambos providers)

**Mecanismo de tools confirmado end-to-end en openai Y gemini** (test headless contra la API real, con `outputModalities: ['audio']` activo):
- `getRealtimeToolDefinitions` genera `{ type:'function', name, description, parameters }`. En la sesión, openai lo mapea a `session.tools` + `tool_choice:'auto'`; gemini a `functionDeclarations`. Mismo array de entrada, ambos providers.
- Al preguntar "qué hora es?", ambos emiten `function-call-arguments-done` (openai `call_...`, gemini `fc_...`) → `onToolCall` recibe la invocación → `return` del resultado la resuelve en la misma sesión.

**`response-create` serializa a `null` en gemini** (usa turnos automáticos, no lleva ese evento). El SDK saltea envíos `null` (`ai/dist/index.js:14703`, `if (serialized != null)`). No es bug — si replicás el flujo a mano (WS crudo) tenés que saltear los `null` o gemini cierra con `1007 "Root element must be a message"`.

**Los 5 bugs que tuvo el componente al empezar** (todos ya corregidos, para referencia): (1) `api.token` = secreto en vez de URL → 404; (2) `handleConnect` con `GET` → 405 (`res.json()` explota con body vacío); (3) `model` sin memo; (4) `sessionConfig` sin memo; (5) faltaba `outputModalities:['audio']`. Los 3 primeros son idénticos a hito 5.
