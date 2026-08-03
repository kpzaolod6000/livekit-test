## ADDED Requirements

### Requirement: Fuente obligatoria en toda sección TEORÍA
El mentor SHALL acompañar la sección TEORÍA de cada hito con su FUENTE — un link a documentación oficial (`docs.livekit.io` para conceptos de LiveKit, o la documentación oficial del provider correspondiente para conceptos específicos de OpenAI/Gemini) — desde donde se derivó ese contenido. Esta regla aplica a todos los hitos del plan `learn-livekit-sdk`.

#### Scenario: Mentor entrega TEORÍA de un hito
- **WHEN** el mentor presenta la sección TEORÍA de cualquier hito de este plan
- **THEN** la respuesta incluye, junto al concepto explicado, el link a la documentación oficial de la que proviene

#### Scenario: Fuente no disponible o no verificada
- **WHEN** el mentor no puede confirmar una fuente oficial específica para un concepto dado
- **THEN** el mentor lo señala explícitamente en vez de inventar o inferir un link, y ofrece verificarlo antes de continuar

### Requirement: Explicación línea por línea documentada antes del checkpoint
El mentor SHALL entregar, antes de que el usuario ejecute el checkpoint de un hito, una explicación **línea por línea** del código del ejercicio, donde cada línea (o bloque mínimo) cubra tres ejes: **QUÉ hace**, **QUÉ pasa por detrás** (runtime/red/proceso), y el **CONCEPTO técnico** subyacente. Esta explicación SHALL persistirse en un archivo `docs/<sdk>/hito<N>-doccode.md` (junto al `hito-<N>.md` del hito). La regla aplica a todos los hitos con código del plan `learn-livekit-sdk` de aquí en adelante, dado que el usuario es principiante.

#### Scenario: Mentor entrega el código de un hito
- **WHEN** el mentor presenta código de ejercicio para un hito con implementación
- **THEN** acompaña ese código con una explicación línea por línea (QUÉ / POR DETRÁS / CONCEPTO) persistida en `docs/<sdk>/hito<N>-doccode.md`, entregada antes del checkpoint del hito

#### Scenario: Concepto por detrás no verificable
- **WHEN** el mentor no puede confirmar con certeza el comportamiento interno ("por detrás") de una línea
- **THEN** lo marca como no verificado en vez de afirmarlo, y ofrece confirmarlo (contra tipos instalados o documentación oficial) antes de continuar
