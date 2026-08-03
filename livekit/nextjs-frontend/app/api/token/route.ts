import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Route handler = el token server vive DENTRO de Next.js (Hito 1 en Next.js).
// El secret nunca llega al cliente: este código corre solo en el servidor.
const API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'secret';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const identity = req.nextUrl.searchParams.get('identity');

  if (!room || !identity) {
    return NextResponse.json({ error: 'faltan query params: room e identity' }, { status: 400 });
  }

  const at = new AccessToken(API_KEY, API_SECRET, { identity });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  const token = await at.toJwt(); // async

  return NextResponse.json({ token });
}
