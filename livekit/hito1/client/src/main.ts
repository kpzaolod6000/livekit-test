import { Room, RoomEvent, Track } from 'livekit-client';
import type { RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';

// Paso B (1.3): entrar a la sala.  Paso C (1.4): publicar mic + oír a otros.
// Paso D (1.5): lista de participantes que se actualiza con los eventos.
// Hito 2: data channels — text streams (2.2), byte streams (2.3), RPC (2.4). SIN IA.
// Hito 3: media — video cámara (3.2) + screenshare (3.3), distinguidos por source. SIN IA.

const TOKEN_SERVER = 'http://localhost:3312';
const LIVEKIT_URL = 'ws://127.0.0.1:7880';

// identity y room configurables por querystring, para poder abrir
// una 2da pestaña con otra identity: ?identity=pedro
const params = new URLSearchParams(location.search);
const identity = params.get('identity') ?? 'kelvin';
const roomName = params.get('room') ?? 'sala1';

const app = document.querySelector<HTMLDivElement>('#app')!;

function show(msg: string) {
  app.textContent = msg;
  console.log(msg);
}

// contenedor donde colgamos los <audio> de los participantes remotos
const audioContainer = document.createElement('div');
document.body.appendChild(audioContainer);

// Paso D — lista visible de participantes en la sala
const participantsList = document.createElement('ul');
document.body.appendChild(participantsList);

// Hito 2 — UI (ZONA 1): mensajes + input de texto + botones de bytes/RPC
const messages = document.createElement('div');
const textInput = document.createElement('input');
textInput.placeholder = 'escribí un mensaje...';
const sendBtn = document.createElement('button');
sendBtn.textContent = 'enviar texto (2.2)';
const bytesBtn = document.createElement('button');
bytesBtn.textContent = 'enviar bytes (2.3)';
const rpcBtn = document.createElement('button');
rpcBtn.textContent = 'RPC ping (2.4)';
document.body.append(messages, textInput, sendBtn, bytesBtn, rpcBtn);

// Hito 3 — UI: contenedor de videos + botones cámara/pantalla
const cameraBtn = document.createElement('button');
cameraBtn.textContent = 'cámara (3.2)';
const screenBtn = document.createElement('button');
screenBtn.textContent = 'compartir pantalla (3.3)';
const videoContainer = document.createElement('div');
document.body.append(cameraBtn, screenBtn, videoContainer);

function logMsg(html: string) {
  messages.innerHTML += `<div>${html}</div>`;
}

function renderParticipants(room: Room) {
  // se reconstruye entera en cada evento: yo (local) + todos los remotos
  const names = [
    `${room.localParticipant.identity} (yo)`,
    ...[...room.remoteParticipants.values()].map((p) => p.identity),
  ];
  participantsList.innerHTML = names.map((n) => `<li>${n}</li>`).join('');
  console.log('participantes en sala:', names);
}

async function main() {
  show(`pidiendo token para ${identity}...`);

  // 1. pedir el JWT al token-server (que lo firma con el secret)
  const resp = await fetch(
    `${TOKEN_SERVER}/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`,
  );
  if (!resp.ok) throw new Error(`token-server respondió ${resp.status}`);
  const { token } = await resp.json();

  const room = new Room();

  // Paso C / Hito 3 — recibir tracks: audio → parlante, video → <video>.
  // Registrar ANTES de connect para no perder tracks de quien ya estaba.
  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      const el = track.attach();
      if (track.kind === Track.Kind.Audio) {
        audioContainer.appendChild(el); // al estar en el DOM, empieza a sonar
      } else if (track.kind === Track.Kind.Video) {
        // 3.3 — distinguir cámara de pantalla por el source de la publicación
        const esPantalla = publication.source === Track.Source.ScreenShare;
        (el as HTMLVideoElement).width = 320;
        const fig = document.createElement('figure');
        const cap = document.createElement('figcaption');
        cap.textContent = `${participant.identity} — ${esPantalla ? 'pantalla' : 'cámara'}`;
        fig.append(cap, el);
        videoContainer.appendChild(fig);
      }
    },
  );

  // limpiar el elemento cuando el track se va (video: sacar el <figure> entero)
  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    track.detach().forEach((el) => (el.closest('figure') ?? el).remove());
  });

  // Paso D — actualizar la lista cuando alguien entra o sale
  room.on(RoomEvent.ParticipantConnected, () => renderParticipants(room));
  room.on(RoomEvent.ParticipantDisconnected, () => renderParticipants(room));
  room.on(RoomEvent.Disconnected, () => {
    participantsList.innerHTML = '';
    show(`desconectado de "${roomName}"`);
  });

  // Hito 2 — ZONA 2: receptores (registrar antes de connect)

  // 2.2 recibir texto por topic 'chat'
  room.registerTextStreamHandler('chat', async (reader, info) => {
    const text = await reader.readAll();
    logMsg(`<b>${info.identity}:</b> ${text}`);
  });

  // 2.3 recibir bytes por topic 'file' → reconstruir y mostrar
  room.registerByteStreamHandler('file', async (reader, info) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of reader) chunks.push(chunk);
    const total = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      total.set(c, off);
      off += c.length;
    }
    logMsg(`<i>bytes de ${info.identity}: ${new TextDecoder().decode(total)} (${total.length} bytes)</i>`);
  });

  // 2.4 responder RPC 'ping' → devolver 'pong'
  room.localParticipant.registerRpcMethod('ping', async (data) => {
    console.log('ping recibido de', data.callerIdentity, 'payload:', data.payload);
    return 'pong';
  });

  // 2. conectar a la sala vía WebRTC
  await room.connect(LIVEKIT_URL, token);

  // Paso C — publicar tu mic (dispara el permiso de micrófono del navegador)
  await room.localParticipant.setMicrophoneEnabled(true);

  // Paso D — pintar el estado inicial (yo + los que ya estaban)
  renderParticipants(room);

  // Hito 2 — ZONA 3: emisores (usan room, van después de connect)

  // 2.2 enviar texto
  sendBtn.onclick = async () => {
    if (!textInput.value) return;
    await room.localParticipant.sendText(textInput.value, { topic: 'chat' });
    logMsg(`<b>yo:</b> ${textInput.value}`); // eco local
    textInput.value = '';
  };

  // 2.3 enviar bytes (streamBytes devuelve un writer: write + close)
  bytesBtn.onclick = async () => {
    const bytes = new TextEncoder().encode('archivo-de-prueba');
    const writer = await room.localParticipant.streamBytes({ topic: 'file' });
    await writer.write(bytes);
    await writer.close();
    logMsg(`<i>yo envié ${bytes.length} bytes</i>`);
  };

  // 2.4 llamar RPC 'ping' al primer participante remoto
  rpcBtn.onclick = async () => {
    const target = [...room.remoteParticipants.values()][0]?.identity;
    if (!target) {
      logMsg('<i>no hay participante remoto para RPC</i>');
      return;
    }
    const res = await room.localParticipant.performRpc({
      destinationIdentity: target,
      method: 'ping',
      payload: 'hi',
    });
    logMsg(`<i>RPC a ${target} respondió: ${res}</i>`);
  };

  // Hito 3 — publicar cámara / pantalla (cada uno es un track de video separado)
  cameraBtn.onclick = async () => {
    await room.localParticipant.setCameraEnabled(true);
    logMsg('<i>cámara publicada</i>');
  };
  screenBtn.onclick = async () => {
    await room.localParticipant.setScreenShareEnabled(true); // abre el selector del navegador
    logMsg('<i>pantalla compartida</i>');
  };

  show(`conectado como "${room.localParticipant.identity}" en "${roomName}" — mic activo, escuchando`);
}

main().catch((err) => {
  show(`error conectando: ${err.message}`);
  console.error(err);
});
