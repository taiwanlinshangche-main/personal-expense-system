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
