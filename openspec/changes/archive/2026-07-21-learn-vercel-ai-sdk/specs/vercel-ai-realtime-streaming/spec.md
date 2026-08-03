## ADDED Requirements

### Requirement: Sesión Realtime vía token efímero y hook de React
El ejercicio del Hito 5 SHALL establecer una sesión de streaming bidireccional usando `experimental_realtime.getToken()` en el servidor (para generar un token efímero) y `experimental_useRealtime` en el cliente React para conectar y gestionar la sesión, sin exponer la API key directamente al navegador.

#### Scenario: Apertura de sesión con token efímero
- **WHEN** el cliente solicita un token vía el endpoint de servidor y lo usa para conectar
- **THEN** se establece una sesión Realtime bidireccional válida sin que la API key del proveedor quede expuesta en el código del navegador

#### Scenario: Intercambio de turnos sin reabrir conexión
- **WHEN** el usuario envía un nuevo mensaje mientras la sesión Realtime sigue abierta
- **THEN** el modelo responde usando la misma conexión, sin que la app deba solicitar un nuevo token ni reconectar

### Requirement: Mismo componente funciona con ambos providers Realtime
El ejercicio del Hito 5 SHALL usar el mismo componente/hook de React contra `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`, cambiando únicamente el modelo pasado a `getToken`.

#### Scenario: Cambio de provider sin cambiar el componente
- **WHEN** se cambia el modelo pasado a `getToken` entre `openai('gpt-realtime')` y `google('gemini-3.1-flash-live-preview')`
- **THEN** el mismo componente de React establece la sesión Realtime con el nuevo provider sin requerir cambios adicionales de código

### Requirement: Salida simultánea de texto y audio
El ejercicio del Hito 5 SHALL configurar la sesión con `outputModalities: ['audio']` (la API Realtime de OpenAI rechaza combinar `['text','audio']` en un solo valor), reproduciendo audio real (parlante) y mostrando texto en simultáneo vía los eventos de transcripción de audio (`audio-transcript-delta`/`-done`) que el hook ya mapea a `messages` — no solo texto.

#### Scenario: Respuesta con ambas modalidades
- **WHEN** el modelo responde durante la sesión Realtime
- **THEN** el usuario escucha audio real Y ve el texto correspondiente, ambos en la misma respuesta
