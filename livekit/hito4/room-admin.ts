import { RoomServiceClient } from 'livekit-server-sdk';

// Task 4.2 — administración de salas server-side.
// OJO: el RoomServiceClient habla la API REST del server → host `http://`, NO el `ws://`
// del browser. Puerto 7880 (mismo server self-hosted `--dev`).
const svc = new RoomServiceClient('http://localhost:7880', 'devkey', 'secret');

const ROOM = 'sala1';

async function main() {
  // Identidad a expulsar: primer arg de CLI. `npx tsx room-admin.ts kelvin`
  const kickIdentity = process.argv[2];

  // 1. Crear la sala explícitamente (idempotente: si ya existe, la devuelve).
  await svc.createRoom({ name: ROOM });
  console.log(`sala '${ROOM}' creada/asegurada`);

  // 2. Listar todas las salas activas.
  const rooms = await svc.listRooms();
  console.log(`\nsalas activas (${rooms.length}):`);
  for (const r of rooms) {
    console.log(`  - ${r.name} · ${r.numParticipants} participante(s)`);
  }

  // 3. Listar participantes de la sala objetivo.
  const parts = await svc.listParticipants(ROOM);
  console.log(`\nparticipantes en '${ROOM}' (${parts.length}):`);
  for (const p of parts) {
    console.log(`  - ${p.identity} · state=${p.state}`);
  }

  // 4. Expulsar a alguien si se pasó identidad por CLI.
  if (kickIdentity) {
    await svc.removeParticipant(ROOM, kickIdentity);
    console.log(`\nexpulsado '${kickIdentity}' de '${ROOM}' (mirá el browser)`);
  } else {
    console.log(`\n(sin arg → no expulso a nadie. Uso: npx tsx room-admin.ts <identity>)`);
  }
}

main().catch((err) => {
  console.error('error en room-admin:', err);
  process.exit(1);
});
