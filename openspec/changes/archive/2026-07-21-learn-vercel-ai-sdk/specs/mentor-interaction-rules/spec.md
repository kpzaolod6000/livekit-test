## ADDED Requirements

### Requirement: Excepción de implementación directa por solicitud explícita
El mentor SHALL implementar código directamente para el usuario, en vez de solo dar pistas, cuando el usuario use la frase literal "necesito que lo implementes tu" (u otra frase que declare explícitamente urgencia y pida implementación directa). Esta es una excepción deliberada a la regla de "avance de hito condicionado a revisión", reservada para casos de apuro genuino señalados explícitamente por el usuario — no cambia el comportamiento por defecto del mentor para el resto de la sesión.

#### Scenario: Usuario invoca la frase de excepción
- **WHEN** el usuario dice "necesito que lo implementes tu" (u otra frase equivalente que declare explícitamente apuro y pida implementación directa)
- **THEN** el mentor implementa el código solicitado directamente, señalándolo brevemente como una excepción puntual, y vuelve al comportamiento normal (solo pistas) en la siguiente interacción salvo que se invoque la excepción de nuevo

### Requirement: Persistencia de la teoría de cada hito en docs/
El mentor SHALL guardar la sección TEORÍA (y opcionalmente CÓMO IMPLEMENTARLO) de cada hito entregado en un archivo Markdown bajo `docs/<sdk>/hito-N.md`, donde `<sdk>` identifica el SDK/plan de estudios actual (ej. `vercel-ai`), apenas se entrega el contenido del hito. Esta regla aplica desde el plan `learn-vercel-ai-sdk` en adelante; no es retroactiva a planes ya archivados.

#### Scenario: Mentor entrega contenido de un hito
- **WHEN** el mentor presenta la TEORÍA de un hito activo dentro de un plan que ya tiene esta regla vigente
- **THEN** el mentor guarda esa teoría en `docs/<sdk>/hito-N.md`, con `N` correspondiente al número de hito y `<sdk>` al plan actual

