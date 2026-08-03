import { createServer } from 'node:http';
import { WebhookReceiver } from 'livekit-server-sdk';

// Task 4.3 — endpoint que recibe webhooks de `livekit-server` y verifica su firma.
const receiver = new WebhookReceiver('devkey', 'secret');
const PORT = 3002;

const server = createServer((req, res) => {
  // El server solo hace POST a /webhook. Todo lo demás lo ignoramos.
  if (req.method !== 'POST') {
    res.writeHead(404);
    res.end();
    return;
  }

  // TRAMPA CLAVE: `receive()` valida la firma sobre los BYTES CRUDOS del body.
  // Si parseás el JSON antes, la verificación falla. → acumulamos el string tal cual.
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      // El header `Authorization` lleva el token firmado que autentica el POST.
      const authHeader = req.headers['authorization'];
      const event = await receiver.receive(body, authHeader); // async, valida firma

      // Reaccionar al evento verificado (acá: log; en prod: DB / lógica de negocio).
      const who = event.participant?.identity ?? event.room?.name ?? '(sin sujeto)';
      console.log(`webhook verificado → ${event.event} · ${who}`);

      res.writeHead(200);
      res.end();
    } catch (err) {
      // Firma inválida o body corrupto: rechazar, no confiar en el evento.
      console.error('webhook rechazado (firma inválida?):', err);
      res.writeHead(401);
      res.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`webhook server escuchando en http://localhost:${PORT}/webhook`);
});
