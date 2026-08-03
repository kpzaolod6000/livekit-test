import { createServer } from 'node:http';
import { AccessToken } from 'livekit-server-sdk';

// Credenciales de desarrollo del `livekit-server --dev`.
// NUNCA van en el cliente: el navegador solo recibe el JWT firmado, jamás el secret.
const PORT = 3312;
const API_KEY = 'devkey';
const API_SECRET = 'secret';

const server = createServer(async (req, res) => {
  // A3 — CORS: el cliente corre en http://localhost:5173 (Vite) y pega acá (:3001).
  // Sin estos headers el navegador bloquea la respuesta.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight de CORS.
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '', `http://localhost:${PORT}`);

  if (url.pathname !== '/token') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ruta no encontrada; usá /token' }));
    return;
  }

  const room = url.searchParams.get('room');
  const identity = url.searchParams.get('identity');

  if (!room || !identity) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'faltan query params: room e identity' }));
    return;
  }

  // Construir el token de acceso y firmarlo con el secret del server dev.
  const at = new AccessToken(API_KEY, API_SECRET, { identity });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt(); // async

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ token }));
});

server.listen(PORT, () => {
  console.log(`token server escuchando en http://localhost:${PORT}`);
  console.log(`probá: curl "http://localhost:${PORT}/token?room=sala1&identity=kelvin"`);
});
