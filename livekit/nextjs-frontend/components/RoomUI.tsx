'use client';

import { useEffect, useState } from 'react';
import { Track } from 'livekit-client';
import {
  useParticipants,
  useRoomContext,
  useLocalParticipant,
  useTracks,
  TrackToggle,
  VideoTrack,
  isTrackReference,
} from '@livekit/components-react';

// Replica de los Hitos 1-3 en Next.js + @livekit/components-react:
//   Hito 1 → lista de participantes (audio lo maneja <RoomAudioRenderer/> en page.tsx)
//   Hito 2 → data channels: text streams, byte streams, RPC
//   Hito 3 → media: cámara + screenshare (toggles + render de video)

//room → la sala activa. La usas para registrar los handlers de streams.
//participants → array de todos los presentes (reactivo: si alguien entra/sale, se re-renderiza).
//localParticipant → tú. Con él envías texto, bytes, RPC y controlas tus pistas.

export default function RoomUI({ identity }: { identity: string }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState<string[]>([]);
  const [text, setText] = useState('');
  const log = (m: string) => setMessages((prev) => [...prev, m]);

  // Hito 2 — receptores: registrar una vez, limpiar al desmontar
  // (el cleanup evita el error de doble-registro por React StrictMode en dev).
  useEffect(() => {
    room.registerTextStreamHandler('chat', async (reader, info) => {
      const t = await reader.readAll();
      log(`${info.identity}: ${t}`);
    });
    room.registerByteStreamHandler('file', async (reader, info) => {
      const chunks: Uint8Array[] = [];
      for await (const c of reader) chunks.push(c);
      const total = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let off = 0;
      for (const c of chunks) {
        total.set(c, off);
        off += c.length;
      }
      log(`bytes de ${info.identity}: ${new TextDecoder().decode(total)} (${total.length}B)`);
    });
    localParticipant.registerRpcMethod('ping', async () => 'pong');

    return () => {
      room.unregisterTextStreamHandler('chat');
      room.unregisterByteStreamHandler('file');
      localParticipant.unregisterRpcMethod('ping');
    };
  }, [room, localParticipant]);

  // Hito 3 — tracks de video (cámara + pantalla) de todos los participantes
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // Hito 2 — emisores
  const sendText = async () => {
    if (!text) return;
    await localParticipant.sendText(text, { topic: 'chat' });
    log(`yo: ${text}`);
    setText('');
  };
  const sendBytes = async () => {
    const bytes = new TextEncoder().encode('archivo-de-prueba');
    const writer = await localParticipant.streamBytes({ topic: 'file' });
    await writer.write(bytes);
    await writer.close();
    log(`yo envié ${bytes.length} bytes`);
  };
  const callRpc = async () => {
    const target = participants.find((p) => p.identity !== identity)?.identity;
    if (!target) {
      log('no hay participante remoto para RPC');
      return;
    }
    const res = await localParticipant.performRpc({
      destinationIdentity: target,
      method: 'ping',
      payload: 'hi',
    });
    log(`RPC a ${target}: ${res}`);
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <p>
        conectado como <b>{identity}</b>
      </p>

      <h3>Participantes (Hito 1)</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.identity}>
            {p.identity}
            {p.identity === identity ? ' (yo)' : ''}
          </li>
        ))}
      </ul>

      <h3>Media (Hito 3)</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <TrackToggle source={Track.Source.Microphone}>Mic</TrackToggle>
        <TrackToggle source={Track.Source.Camera}>Cámara</TrackToggle>
        <TrackToggle source={Track.Source.ScreenShare}>Pantalla</TrackToggle>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {videoTracks.filter(isTrackReference).map((ref) => (
          <figure key={`${ref.participant.identity}-${ref.source}`} style={{ margin: 0 }}>
            <figcaption>
              {ref.participant.identity} — {ref.source === Track.Source.ScreenShare ? 'pantalla' : 'cámara'}
            </figcaption>
            <VideoTrack trackRef={ref} style={{ width: 320 }} />
          </figure>
        ))}
      </div>

      <h3>Chat / Data (Hito 2)</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="mensaje..." />
        <button onClick={sendText}>enviar texto</button>
        <button onClick={sendBytes}>enviar bytes</button>
        <button onClick={callRpc}>RPC ping</button>
      </div>
      <div style={{ marginTop: 8 }}>
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>
    </div>
  );
}
