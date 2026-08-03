# Hito 5 — Realtime: sesión bidireccional simple (React + servidor de tokens)

## Contexto: qué cambia respecto a hitos 1-4

Hitos 1-4 fueron 100% Node CLI. Este hito (y 6-8) usan la API **Realtime** del SDK — WebSocket bidireccional (audio/texto) — que solo existe como **hook de React** (`experimental_useRealtime`), no como función de Node puro. Requiere: (1) un componente React que corre en el navegador (captura mic, reproduce audio, maneja el WebSocket), y (2) un endpoint de servidor que genera un **token efímero** — nunca se manda tu API key real al navegador.

**Conceptos de React mínimos que necesitás (sin asumir experiencia previa):**
- Un **hook** (`useAlgo(...)`) es una función especial de React que solo podés llamar dentro de un componente, y que "recuerda" estado entre renders (a diferencia de una variable normal que se resetea). `experimental_useRealtime(...)` te devuelve un objeto con el estado de la conexión (`status`, `messages`) y funciones (`connect`, `sendTextMessage`, etc.) que se actualizan solos cuando algo cambia — no necesitás manejar el WebSocket a mano.
- **Por qué el token se genera en servidor:** tu `OPENAI_API_KEY`/`GEMINI_API_KEY` viven en `.env`, que el servidor lee pero el navegador NUNCA debería ver (cualquiera podría robarla del código fuente de la página). El servidor pide un **token efímero de corta duración** (minutos) a OpenAI/Google usando la key real, y solo ese token temporal viaja al navegador.

## TEORÍA

**Verificado con conexión real (Node) antes de este contenido:** ambos providers, vía `provider.experimental_realtime(modelId).doCreateClientSecret({})`, devuelven `{ token, url, expiresAt }`, y un WebSocket contra esa `url` con ese `token` abre conexión (`WS OPEN ✓` confirmado para `gpt-realtime` y `gemini-3.1-flash-live-preview`).

```
Navegador (React)                    Servidor (Next.js)              Provider (OpenAI/Google)
      │                                     │                                │
      │  1. fetch('/api/realtime-token') ──►│                                │
      │                                     │  2. provider.experimental_realtime(modelId)
      │                                     │     .doCreateClientSecret({}) ─►│
      │                                     │◄──── { token, url, expiresAt } ─┤
      │◄──── { token, url } ────────────────┤                                │
      │                                     │                                │
      │  3. experimental_useRealtime({ model, api: { token } })              │
      │     connect() ──── WebSocket(url, token) ─────────────────────────►  │
      │◄════════════ audio/texto bidireccional ═══════════════════════════► │
```

`model` (client-side) se construye con `openai.experimental_realtime('gpt-realtime')` / `google.experimental_realtime('gemini-3.1-flash-live-preview')` — esto NO hace ninguna llamada de red ni necesita la API key real en el navegador, solo arma el "traductor" de protocolo (cómo empaquetar/leer mensajes del WebSocket). La API key real solo se usa en `doCreateClientSecret`, que corre en servidor.

Docs: https://ai-sdk.dev/docs/ai-sdk-rsc/realtime (sección experimental, puede variar entre versiones — ya verificamos que la que tenés instalada, `ai@7`, funciona).

## CÓMO IMPLEMENTARLO

> **Este es el código FINAL, ya corregido.** Los 3 bugs que aparecieron durante la implementación (contrato de `api.token`, `outputModalities`, `useMemo`) están explicados en las secciones **CORRECCIÓN** y **HALLAZGOS** más abajo — dejados a propósito como registro de por qué el código quedó así.

**1. Servidor — `app/api/realtime-token/route.ts`:**
```typescript
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const providerArg = req.nextUrl.searchParams.get('provider') ?? 'openai';
  const { sessionConfig } = await req.json(); // el hook manda { sessionConfig } en el body

  const model = providerArg === 'gemini'
    ? google.experimental_realtime('gemini-3.1-flash-live-preview')
    : openai.experimental_realtime('gpt-realtime');

  const secret = await model.doCreateClientSecret({ sessionConfig });
  return Response.json(secret); // { token, url }
}
```

**2. Cliente — `app/components/RealtimeChat.tsx`:**
```tsx
'use client';
import { useMemo } from 'react';
import { experimental_useRealtime as useRealtime } from '@ai-sdk/react';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export function RealtimeChat({ providerArg }: { providerArg: 'openai' | 'gemini' }) {
  // model y sessionConfig memoizados: el hook compara por referencia (ver HALLAZGOS #3)
  const model = useMemo(
    () => providerArg === 'gemini'
      ? google.experimental_realtime('gemini-3.1-flash-live-preview')
      : openai.experimental_realtime('gpt-realtime'),
    [providerArg],
  );

  const sessionConfig = useMemo(() => ({ outputModalities: ['audio'] as const }), []);

  const { status, messages, connect, disconnect, sendTextMessage, isCapturing, isPlaying } = useRealtime({
    model,
    api: { token: `/api/realtime-token?provider=${providerArg}` }, // URL del endpoint, NO el secreto
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
```

Nota: el botón "Enviar mensaje de prueba" manda texto (`sendTextMessage`) para verificar rápido; con el mic activo también podés hablar. La respuesta llega como audio real + transcripción en `messages` (audio+texto simultáneo, tareas 5.8/5.9 — obligatorio en este plan tras revertir el non-goal original en `design.md` y la spec `vercel-ai-realtime-streaming`).

## LA TAREA

1. Creá el proyecto Next.js (`npx create-next-app@latest vercel-realtime` o similar, App Router).
2. Implementá el endpoint `/api/realtime-token` (arriba) — probalo con `curl localhost:3000/api/realtime-token?provider=openai` y `...?provider=gemini`, confirmá que devuelve `{token, url, expiresAt}` en ambos.
3. Implementá el componente `RealtimeChat` (arriba), montalo en una página.
4. Conectá con `providerArg='openai'`, mandá el mensaje de prueba, confirmá `status` pasa a `connected` y llega algo a `messages`.
5. Repetí con `providerArg='gemini'`, mismo componente, sin tocar código.

## CORRECCIÓN — bug en el flujo de conexión (encontrado al probar 5.8)

> Registro del bug que llevó al código final de arriba. El código de la sección CÓMO IMPLEMENTARLO **ya está corregido**; esto explica el porqué.

**Síntoma:** `POST http://localhost:3000/ek_...` → 404.

**Causa real:** el primer intento pasaba el secreto efímero (`ek_...`) como `api.token`. Pero `api.token` NO es el secreto — es una **URL de tu propio servidor** que el hook llama internamente. Prueba: `node_modules/ai/dist/index.js` línea ~15184, dentro de `connect()`:

```js
const response = await fetch(this.api.token, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionConfig: this.sessionConfig })
});
const { token, url, tools } = await response.json();
```

O sea: el hook hace `POST` a `api.token` (interpretado como endpoint), mandando `{ sessionConfig }` en el body, y espera de vuelta `{ token, url, tools }`. Nuestro código pasaba `secret.token` (la key `ek_...`) como si fuera esa URL → el navegador intentaba `POST` a `/ek_...` relativo a `localhost:3000` → 404.

**Fix — 2 archivos:**

`app/api/realtime-token/route.ts` — cambiar de `GET` a `POST`, leer `sessionConfig` del body, devolver `{token, url}` (sin `expiresAt`, no lo usa el hook):
```typescript
export async function POST(req: NextRequest) {
  const providerArg = req.nextUrl.searchParams.get('provider') ?? 'openai';
  const { sessionConfig } = await req.json();

  const model = providerArg === 'gemini'
    ? google.experimental_realtime('gemini-3.1-flash-live-preview')
    : openai.experimental_realtime('gpt-realtime');

  const secret = await model.doCreateClientSecret({ sessionConfig });
  return Response.json(secret); // { token, url }
}
```

`app/components/RealtimeChat.tsx` — borrar el `useState`/`handleConnect`/`useEffect` del token manual. `api.token` pasa a ser el string de la URL del endpoint, no el secreto; el botón "Conectar" llama `connect` directo (ya no hay `handleConnect` ni fetch manual). Ver el código final completo en la sección **CÓMO IMPLEMENTARLO** de arriba.

## TEORÍA — audio real (5.8/5.9)

`experimental_useRealtime` acepta `sessionConfig?: Partial<RealtimeSessionConfig>` (confirmado en `node_modules/@ai-sdk/provider/dist/index.d.ts`, tipo `RealtimeModelV4SessionConfig`). Ese config tiene `outputModalities?: Array<'text' | 'audio'>` — por default es solo texto.

El estado que devuelve el hook (`RealtimeState`) ya incluye `isCapturing: boolean` e `isPlaying: boolean` — captura de mic (`getUserMedia`) y reproducción por parlante (Web Audio) están manejadas *dentro* del hook, no hay que escribir esa parte a mano. El permiso de mic lo pide el navegador automáticamente la primera vez que se activa captura — no hace falta código extra para eso, solo aceptar el prompt del browser.

## CÓMO IMPLEMENTARLO — audio real (5.8/5.9)

1. En `RealtimeChat.tsx`, pasale `sessionConfig` a `useRealtime`:

```tsx
const sessionConfig = useMemo(() => ({ outputModalities: ['audio'] as const }), []);

const { status, messages, connect, disconnect, sendTextMessage, isCapturing, isPlaying } = useRealtime({
  model,
  api: { token: `/api/realtime-token?provider=${providerArg}` },
  sessionConfig,
});
```
(⚠️ `['audio']`, NO `['text','audio']` — ver HALLAZGO #2. El texto llega vía transcripción.)

2. Mostrá `isCapturing`/`isPlaying` en la UI (aunque sea texto plano) para verificar visualmente que el audio está fluyendo, no solo el texto.
3. Conectá, aceptá el permiso de mic del navegador, mandá el mensaje de prueba y confirmá: se escucha audio real por el parlante Y el texto sigue apareciendo en `messages` — ambos en la misma respuesta (5.8).
4. Repetí con `providerArg='gemini'` sin tocar código, mismo resultado esperado (5.9).

## HALLAZGOS AL IMPLEMENTAR (3 bugs reales, corregidos)

Estos 3 puntos NO estaban en la teoría original — salieron al probar contra la API real. Cada uno costó tiempo, dejarlos documentados:

**1. `api.token` NO es el secreto — es la URL de tu endpoint.** El hook hace internamente `POST` a `api.token` con body `{ sessionConfig }` y espera `{ token, url, tools }` de vuelta (ver `node_modules/ai/dist/index.js`, dentro de `connect()`). Pasarle el `ek_...` como si fuera el token da `404 POST /ek_...`. Correcto: `api: { token: '/api/realtime-token?provider=...' }` (string de URL). Y el endpoint de servidor debe ser `POST` (no `GET`), leer `sessionConfig` del body, devolver el resultado de `doCreateClientSecret({ sessionConfig })`.

**2. `outputModalities` solo acepta UN valor, no `['text','audio']`.** OpenAI Realtime devuelve `400 invalid_value` con `['text','audio']` combinado — solo admite `['text']` o `['audio']`. Usar `['audio']`; el texto simultáneo llega igual vía eventos de transcripción de audio (`response.audio_transcript.delta`), que el hook mapea a `messages`. Gemini mapea `['audio']` → `responseModalities: ['AUDIO']` sin problema (verificado headless: ambos providers abren WS y mantienen la sesión con `['audio']`).

**3. `model` y `sessionConfig` DEBEN ir memoizados (`useMemo`), o los botones nunca se habilitan.** El hook decide si recrear su store interno comparando `options.model` y `options.sessionConfig` **por referencia** (`!==`, ver `getRealtimeStoreKey`/`shouldCreateRealtimeStore` en `@ai-sdk/react/dist/index.js`). Si construís `const model = openai.experimental_realtime(...)` y `sessionConfig: { ... }` inline, son objetos nuevos en cada render → el hook tira el store donde corriste `connect()` (con su WebSocket vivo) y renderiza uno fresco en `disconnected`. Síntoma: los eventos (`session-created`, etc.) SÍ aparecen en `onEvent` (el WS viejo sigue vivo) pero `status` nunca pasa a `connected` y los botones quedan disabled. Fix: `useMemo(() => model, [providerArg])` y `useMemo(() => ({ outputModalities: ['audio'] as const }), [])`. `api.token` es string → compara por valor, no necesita memo.

Nota diagnóstica: `status` pasa a `connected` únicamente al recibir el evento `session-created` (`ai/dist/index.js`, reducer). Útil para debug: agregar `onError`/`onEvent` con `console.log` al `useRealtime` revela al instante si el WS conecta pero el store se está recreando.
