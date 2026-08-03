## ADDED Requirements

### Requirement: Envío y recepción de mensajes de texto vía text streams
El ejercicio del Hito 2 SHALL implementar el intercambio de mensajes de texto entre participantes de la sala usando los text streams / data channels de LiveKit, dentro de la app **Next.js** (accediendo al `room` vía `@livekit/components-react`, ej. `useRoomContext`), como fundamento de la sección de texto del chat objetivo. Este hito NO involucra todavía un agente de IA — es transporte de datos puro entre participantes.

#### Scenario: Un participante envía texto a la sala
- **WHEN** un participante publica un mensaje de texto por un text stream
- **THEN** los demás participantes suscritos reciben el mensaje de texto con su identidad de origen, sin pasar por audio ni transcripción

### Requirement: Transferencia de datos binarios vía byte streams
El ejercicio del Hito 2 SHALL demostrar el envío de datos binarios (byte streams) entre participantes, diferenciándolo del canal de texto.

#### Scenario: Envío de un payload binario
- **WHEN** un participante envía un payload binario por un byte stream
- **THEN** el participante receptor recibe los bytes íntegros y puede reconstruir el dato original

### Requirement: Llamada a procedimiento remoto (RPC) entre participantes
El ejercicio del Hito 2 SHALL implementar al menos una llamada RPC entre participantes usando el mecanismo de RPC de LiveKit, demostrando invocación con respuesta (request/response) sobre el data channel.

#### Scenario: Un participante invoca un método RPC en otro
- **WHEN** un participante invoca un método RPC registrado por otro participante
- **THEN** el método se ejecuta en el destino y su valor de retorno vuelve al invocador como respuesta de la llamada
