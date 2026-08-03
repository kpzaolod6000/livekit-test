'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import RoomUI from '@/components/RoomUI';

// Hito 1 en Next.js: pedir token al route handler y entrar a la sala.
// `audio` publica el mic al conectar (equivale al setMicrophoneEnabled del vanilla).

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://127.0.0.1:7880';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState('');

  useEffect(() => {
    // identity/room configurables por querystring: ?identity=pedro
    const params = new URLSearchParams(window.location.search);
    const id = params.get('identity') ?? 'kelvin';
    const room = params.get('room') ?? 'sala1';
    setIdentity(id);
    fetch(`/api/token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setToken(d.token))
      .catch((e) => console.error('error pidiendo token', e));
  }, []);

  if (!token) return <p style={{ padding: 16 }}>conectando…</p>;

  return (
    //audio → publica el micrófono al conectar. El comentario del código lo aclara: equivale a setMicrophoneEnabled(true)
    <LiveKitRoom serverUrl={LIVEKIT_URL} token={token} connect audio data-lk-theme="default">
      {/* Hito 1: reproduce automáticamente el audio de todos los remotos */}
      <RoomAudioRenderer />
      <RoomUI identity={identity} />
    </LiveKitRoom>
  );
}
