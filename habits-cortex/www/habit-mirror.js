/**
 * habit-mirror.js, Habit Mirror client library
 *
 * Provides peer-to-peer habit file transfer via WebRTC DataChannel.
 * The signaling server (@ha-bits/share) only relays SDP/ICE messages;
 * all file data flows directly between peers.
 *
 * Usage:
 *   // Receiver side, generates the pairing code
 *   const { code, transfer } = await HabitMirror.createReceiver('wss://mirror.example.com/ws');
 *   showCode(code); // display to user
 *   const { name, blob } = await transfer; // resolves when file arrives
 *
 *   // Sender side, enters the code shown by the receiver
 *   await HabitMirror.sendHabit('wss://mirror.example.com/ws', code, fileObject, { onProgress: pct => ... });
 */

window.HabitMirror = (() => {
  'use strict';

  const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
  const CHUNK_SIZE = 65536; // 64 KB DataChannel chunks

  function makePC() {
    return new RTCPeerConnection({ iceServers: STUN_SERVERS });
  }

  function openWs(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(ws), { once: true });
      ws.addEventListener('error', (e) => reject(new Error('WebSocket error: ' + (e.message ?? 'unknown'))), { once: true });
    });
  }

  /**
   * Start a receiver session. Generates a 6-char pairing code.
   * Returns { code, transfer } where transfer is a Promise<{name, blob}>.
   *
   * @param {string} wsBaseUrl  e.g. "wss://mirror.example.com/ws"
   * @param {{ onProgress?: (pct: number) => void }} [opts]
   */
  async function createReceiver(wsBaseUrl, opts = {}) {
    // Fetch a server-generated code to avoid collisions
    const origin = wsBaseUrl.replace(/^wss?:\/\//, (m) => m.startsWith('wss') ? 'https://' : 'http://');
    const apiBase = origin.replace(/\/ws$/, '').replace(/\/$/, '');
    const { code } = await fetch(apiBase + '/api/code').then((r) => r.json());

    const ws = await openWs(`${wsBaseUrl}?code=${code}`);
    const pc = makePC();

    const transfer = new Promise((resolve, reject) => {
      pc.ondatachannel = ({ channel: dc }) => {
        let meta = null;
        const chunks = [];
        let received = 0;

        dc.binaryType = 'arraybuffer';
        dc.onmessage = ({ data }) => {
          if (typeof data === 'string') {
            const msg = JSON.parse(data);
            if (msg.type === 'meta') {
              meta = msg;
            } else if (msg.type === 'done') {
              resolve({ name: meta.name, blob: new Blob(chunks) });
            }
          } else {
            chunks.push(data);
            received += data.byteLength;
            if (meta && opts.onProgress) {
              opts.onProgress(Math.min(100, (received / meta.size) * 100));
            }
          }
        };
        dc.onerror = (e) => reject(new Error('DataChannel error: ' + e));
        dc.onclose = () => {
          if (chunks.length === 0) reject(new Error('Connection closed before transfer completed'));
        };
      };
    });

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
      } else if (msg.type === 'ice' && msg.candidate) {
        await pc.addIceCandidate(msg.candidate);
      }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) ws.send(JSON.stringify({ type: 'ice', candidate }));
    };

    ws.addEventListener('close', (e) => {
      if (e.code === 4001) console.warn('[HabitMirror] Pairing code expired');
      if (e.code === 4002) console.warn('[HabitMirror] Room full, another sender already connected');
    });

    return { code, transfer };
  }

  /**
   * Send a habit file to a receiver identified by their 6-char pairing code.
   *
   * @param {string} wsBaseUrl
   * @param {string} code        The receiver's 6-char code
   * @param {File|Blob} file     The .habit file to send
   * @param {{ onProgress?: (pct: number) => void }} [opts]
   */
  async function sendHabit(wsBaseUrl, code, file, opts = {}) {
    const ws = await openWs(`${wsBaseUrl}?code=${code.toUpperCase().trim()}`);
    const pc = makePC();
    const dc = pc.createDataChannel('habit', { ordered: true });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) ws.send(JSON.stringify({ type: 'ice', candidate }));
    };
    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'answer') {
        await pc.setRemoteDescription(msg.sdp);
      } else if (msg.type === 'ice' && msg.candidate) {
        await pc.addIceCandidate(msg.candidate);
      }
    };
    ws.addEventListener('close', (e) => {
      if (e.code === 4001) console.warn('[HabitMirror] Pairing code expired');
      if (e.code === 4002) console.warn('[HabitMirror] Room full, receiver already has a sender');
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));

    // Wait for DataChannel to open (receiver accepted the connection)
    await new Promise((resolve, reject) => {
      dc.onopen = resolve;
      dc.onerror = (e) => reject(new Error('DataChannel open failed: ' + e));
    });

    const buf = await file.arrayBuffer();
    const name = file instanceof File ? file.name : 'habit.habit';

    dc.send(JSON.stringify({ type: 'meta', name, size: buf.byteLength }));
    for (let offset = 0; offset < buf.byteLength; offset += CHUNK_SIZE) {
      // Back-pressure: wait if send buffer is getting full
      while (dc.bufferedAmount > CHUNK_SIZE * 16) {
        await new Promise((r) => setTimeout(r, 10));
      }
      dc.send(buf.slice(offset, offset + CHUNK_SIZE));
      if (opts.onProgress) {
        opts.onProgress(Math.min(100, ((offset + CHUNK_SIZE) / buf.byteLength) * 100));
      }
    }
    dc.send(JSON.stringify({ type: 'done' }));
    if (opts.onProgress) opts.onProgress(100);
  }

  return { createReceiver, sendHabit };
})();
