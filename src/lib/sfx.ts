let audioCtx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let successBuffer: AudioBuffer | null = null;
let initialized = false;
let initializing = false;
let lastPlayTime = 0;

async function init(): Promise<void> {
  if (initialized || initializing) return;
  initializing = true;
  try {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const [clickRes, successRes] = await Promise.all([
      fetch("/sfx/clicked.wav"),
      fetch("/sfx/success.wav"),
    ]);
    const [clickArray, successArray] = await Promise.all([
      clickRes.arrayBuffer(),
      successRes.arrayBuffer(),
    ]);
    [clickBuffer, successBuffer] = await Promise.all([
      audioCtx.decodeAudioData(clickArray),
      audioCtx.decodeAudioData(successArray),
    ]);
    initialized = true;
  } catch {
    // SFX should never crash the app
  } finally {
    initializing = false;
  }
}

function playBuffer(buffer: AudioBuffer | null): void {
  if (!audioCtx || !buffer) return;
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch {
    // Never crash the app
  }
}

export function playClick(): void {
  const now = Date.now();
  if (now - lastPlayTime < 50) return;
  lastPlayTime = now;

  if (!initialized) {
    init().then(() => playBuffer(clickBuffer));
    return;
  }
  playBuffer(clickBuffer);
}

export function playSuccess(): void {
  if (!initialized) {
    init().then(() => playBuffer(successBuffer));
    return;
  }
  playBuffer(successBuffer);
}

export function playWorkspaceSwitch(): void {
  // Synthesized two-tone chime — no WAV file needed
  const ctx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (!audioCtx) audioCtx = ctx;
  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    gain.connect(ctx.destination);

    // Tone 1: 600Hz
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(600, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Tone 2: 800Hz (higher pitch, starts after tone 1)
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0, now + 0.22);
    gain2.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(800, now + 0.08);
    osc2.connect(gain2);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.16);
  } catch {
    // Never crash the app
  }
}
