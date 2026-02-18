"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type FoodType = "green" | "yellow" | "red";
type Food = { x: number; y: number; type: FoodType };
type GameMode = "normal" | "fast";

const GRID = 20;
const TICK_MS: Record<GameMode, number> = { normal: 105, fast: 65 };
const POINTS: Record<GameMode, Record<FoodType, number>> = {
  normal: { green: 1, yellow: 5, red: 10 },
  fast:   { green: 10, yellow: 30, red: 50 },
};
const FOOD_GROW: Record<FoodType, number> = { green: 1, yellow: 5, red: 10 };

function randomPos(occupied: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.some((o) => o.x === p.x && o.y === p.y));
  return p;
}

const FOOD_TYPES: FoodType[] = ["green", "green", "yellow", "yellow", "red", "red"];
const FOOD_COLORS: Record<FoodType, { fill: string; glowR: string; glowG: string }> = {
  green:  { fill: "#4ade80", glowR: "rgba(74,222,128,0.4)",  glowG: "rgba(74,222,128,0)" },
  yellow: { fill: "#facc15", glowR: "rgba(250,204,21,0.45)", glowG: "rgba(250,204,21,0)" },
  red:    { fill: "#f87171", glowR: "rgba(248,113,113,0.5)", glowG: "rgba(248,113,113,0)" },
};

function spawnFoods(snake: Point[]): Food[] {
  const foods: Food[] = [];
  for (const type of FOOD_TYPES) {
    const p = randomPos([...snake, ...foods]);
    foods.push({ ...p, type });
  }
  return foods;
}

function respawnOne(type: FoodType, snake: Point[], otherFoods: Food[]): Food {
  const p = randomPos([...snake, ...otherFoods]);
  return { ...p, type };
}

function playEatSound(type: FoodType) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    if (type === "red") {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.06);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "yellow") {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.13, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch { /* */ }
}

function playGameOverMusic() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Congratulatory melody: C5 E5 G5 C6 (ascending arpeggio) then a sustained chord
    const notes = [
      { freq: 523, start: 0, dur: 0.15 },    // C5
      { freq: 659, start: 0.12, dur: 0.15 },  // E5
      { freq: 784, start: 0.24, dur: 0.15 },  // G5
      { freq: 1047, start: 0.36, dur: 0.4 },  // C6 (longer)
      // Final chord: C5+E5+G5
      { freq: 523, start: 0.5, dur: 0.5 },
      { freq: 659, start: 0.5, dur: 0.5 },
      { freq: 784, start: 0.5, dur: 0.5 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + n.start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + n.start + n.dur);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur);
    }
  } catch { /* */ }
}

function tryVibrate() {
  try { navigator.vibrate?.(8); } catch { /* */ }
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

export default function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(300);

  const dirRef = useRef<Direction>("RIGHT");
  const inputQueue = useRef<Direction[]>([]);
  const modeRef = useRef<GameMode>("normal");
  const initialSnake: Point[] = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
  const snakeRef = useRef<Point[]>(initialSnake);
  const foodsRef = useRef<Food[]>(spawnFoods(initialSnake));
  const growRef = useRef(0);
  const scoreRef = useRef(0);
  const highScoreRef = useRef<Record<GameMode, number>>({ normal: 0, fast: 0 });
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<GameMode>("normal");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const enqueueDir = useCallback((newDir: Direction) => {
    const queue = inputQueue.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
    if (newDir === OPPOSITE[lastDir] || newDir === lastDir) return;
    if (queue.length < 3) {
      queue.push(newDir);
      tryVibrate();
    }
  }, []);

  // Load high scores
  useEffect(() => {
    try {
      const n = localStorage.getItem("snake_hi_normal");
      const f = localStorage.getItem("snake_hi_fast");
      if (n) highScoreRef.current.normal = parseInt(n, 10);
      if (f) highScoreRef.current.fast = parseInt(f, 10);
      setHighScore(highScoreRef.current[mode]);
    } catch { /* */ }
  }, [mode]);

  // Responsive canvas
  useEffect(() => {
    function resize() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 32;
        setCanvasSize(Math.min(w, 380));
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cell = canvasSize / GRID;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);

    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const progress = 1 - i / snake.length;
      const r = isHead ? cell * 0.45 : cell * 0.38;
      if (isHead) {
        const grd = ctx.createRadialGradient(seg.x * cell + cell / 2, seg.y * cell + cell / 2, 0, seg.x * cell + cell / 2, seg.y * cell + cell / 2, cell);
        grd.addColorStop(0, "rgba(56,189,248,0.3)");
        grd.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(seg.x * cell - cell / 2, seg.y * cell - cell / 2, cell * 2, cell * 2);
      }
      ctx.beginPath();
      ctx.arc(seg.x * cell + cell / 2, seg.y * cell + cell / 2, r, 0, Math.PI * 2);
      const alpha = 0.5 + 0.5 * progress;
      ctx.fillStyle = isHead ? `rgba(56,189,248,${alpha})` : `rgba(56,189,248,${alpha * 0.7})`;
      ctx.fill();
    });

    for (const food of foodsRef.current) {
      const fx = food.x * cell + cell / 2;
      const fy = food.y * cell + cell / 2;
      const colors = FOOD_COLORS[food.type];
      const dotR = food.type === "red" ? 0.42 : food.type === "yellow" ? 0.38 : 0.35;
      const fgrd = ctx.createRadialGradient(fx, fy, 0, fx, fy, cell);
      fgrd.addColorStop(0, colors.glowR);
      fgrd.addColorStop(1, colors.glowG);
      ctx.fillStyle = fgrd;
      ctx.fillRect(fx - cell, fy - cell, cell * 2, cell * 2);
      ctx.beginPath();
      ctx.arc(fx, fy, cell * dotR, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill;
      ctx.fill();
    }
  }, [canvasSize]);

  const endGame = useCallback(() => {
    gameOverRef.current = true;
    setGameOver(true);
    if (tickRef.current) clearInterval(tickRef.current);
    playGameOverMusic();
    const m = modeRef.current;
    if (scoreRef.current > highScoreRef.current[m]) {
      highScoreRef.current[m] = scoreRef.current;
      setHighScore(scoreRef.current);
      try { localStorage.setItem(`snake_hi_${m}`, String(scoreRef.current)); } catch { /* */ }
    }
  }, []);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;
    if (inputQueue.current.length > 0) dirRef.current = inputQueue.current.shift()!;
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };
    switch (dirRef.current) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { endGame(); return; }
    if (snake.some((s) => s.x === head.x && s.y === head.y)) { endGame(); return; }
    snake.unshift(head);
    const eatenIdx = foodsRef.current.findIndex((f) => f.x === head.x && f.y === head.y);
    if (eatenIdx !== -1) {
      const eaten = foodsRef.current[eatenIdx];
      scoreRef.current += POINTS[modeRef.current][eaten.type];
      setScore(scoreRef.current);
      playEatSound(eaten.type);
      growRef.current += FOOD_GROW[eaten.type] - 1;
      const otherFoods = foodsRef.current.filter((_, i) => i !== eatenIdx);
      foodsRef.current = [...otherFoods, respawnOne(eaten.type, snake, otherFoods)];
    } else {
      if (growRef.current > 0) growRef.current -= 1;
      else snake.pop();
    }
    snakeRef.current = snake;
    draw();
  }, [draw, endGame]);

  const startGame = useCallback(() => {
    const s: Point[] = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    snakeRef.current = s;
    dirRef.current = "RIGHT";
    inputQueue.current = [];
    foodsRef.current = spawnFoods(s);
    growRef.current = 0;
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    draw();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS[modeRef.current]);
  }, [draw, tick]);

  const switchMode = useCallback((m: GameMode) => {
    modeRef.current = m;
    setMode(m);
    setHighScore(highScoreRef.current[m]);
    // Reset game state when switching mode
    if (started) {
      if (tickRef.current) clearInterval(tickRef.current);
      setStarted(false);
      setGameOver(false);
      setScore(0);
    }
  }, [started]);

  useEffect(() => { return () => { if (tickRef.current) clearInterval(tickRef.current); }; }, []);
  useEffect(() => { draw(); }, [draw, canvasSize]);

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      let d: Direction | null = null;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": d = "UP"; break;
        case "ArrowDown": case "s": case "S": d = "DOWN"; break;
        case "ArrowLeft": case "a": case "A": d = "LEFT"; break;
        case "ArrowRight": case "d": case "D": d = "RIGHT"; break;
        case " ": e.preventDefault(); if (gameOverRef.current || !started) startGame(); return;
      }
      if (d) { e.preventDefault(); enqueueDir(d); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, startGame, enqueueDir]);

  // Swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x, dy = t.clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    enqueueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : (dy > 0 ? "DOWN" : "UP"));
    touchStart.current = null;
  }, [enqueueDir]);

  const dpad = useCallback((dir: Direction) => { enqueueDir(dir); }, [enqueueDir]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-bg-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[400px] mx-auto px-4 pt-3 pb-1" style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}>
        <button onClick={onClose} className="p-2 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-text-tertiary">HI {highScore}</span>
          <span className="text-sm font-bold text-text-primary tabular-nums">{score}</span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex justify-center mt-1 mb-2">
        <div className="flex rounded-xl bg-bg-tertiary p-1 gap-0.5">
          {(["normal", "fast"] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${mode === m ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-tertiary"}`}
            >
              {m === "normal" ? "Normal" : "Fast"}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="w-full max-w-[400px] mx-auto px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="relative rounded-2xl overflow-hidden border border-border" style={{ width: canvasSize, height: canvasSize, margin: "0 auto" }}>
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className="block" />
          <AnimatePresence>
            {(!started || gameOver) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
                {gameOver && <p className="text-lg font-bold text-text-primary mb-1">Game Over</p>}
                {gameOver && score === highScore && score > 0 && <p className="text-xs text-income font-medium mb-3">New High Score!</p>}
                <button onClick={startGame} className="px-6 py-2.5 rounded-full bg-btn-primary-bg text-btn-primary-text text-sm font-semibold active:bg-btn-primary-hover transition-colors">
                  {gameOver ? "Play Again" : "Start"}
                </button>
                <p className="text-[11px] text-text-tertiary mt-3">Swipe or use buttons to move</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* D-Pad — fills ALL remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center select-none touch-none px-4 pb-safe gap-1 min-h-0">
        <button
          onTouchStart={(e) => { e.preventDefault(); dpad("UP"); }}
          onMouseDown={() => dpad("UP")}
          className="flex items-center justify-center w-full max-w-[280px] flex-1 max-h-[80px] rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-95 transition-all duration-75"
          aria-label="Up"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
        </button>
        <div className="flex items-center gap-1 w-full max-w-[280px] flex-1 max-h-[80px]">
          <button
            onTouchStart={(e) => { e.preventDefault(); dpad("LEFT"); }}
            onMouseDown={() => dpad("LEFT")}
            className="flex items-center justify-center flex-1 h-full rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-95 transition-all duration-75"
            aria-label="Left"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); dpad("RIGHT"); }}
            onMouseDown={() => dpad("RIGHT")}
            className="flex items-center justify-center flex-1 h-full rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-95 transition-all duration-75"
            aria-label="Right"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); dpad("DOWN"); }}
          onMouseDown={() => dpad("DOWN")}
          className="flex items-center justify-center w-full max-w-[280px] flex-1 max-h-[80px] rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-95 transition-all duration-75"
          aria-label="Down"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
    </motion.div>
  );
}
