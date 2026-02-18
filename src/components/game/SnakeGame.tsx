"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type FoodType = "green" | "yellow" | "red";
type Food = { x: number; y: number; type: FoodType };

const GRID = 20;
const TICK_MS = 105; // slightly faster for snappier feel

function randomPos(occupied: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.some((o) => o.x === p.x && o.y === p.y));
  return p;
}

const FOOD_TYPES: FoodType[] = ["green", "green", "yellow", "yellow", "red", "red"];
const FOOD_POINTS: Record<FoodType, number> = { green: 1, yellow: 5, red: 10 };
const FOOD_GROW: Record<FoodType, number> = { green: 1, yellow: 5, red: 10 };
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
  const occupied: Point[] = [...snake, ...otherFoods];
  const p = randomPos(occupied);
  return { ...p, type };
}

// Synthesized SFX via Web Audio API
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
  } catch { /* Audio not available */ }
}

function tryVibrate() {
  try { navigator.vibrate?.(8); } catch { /* */ }
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

export default function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(300);

  const dirRef = useRef<Direction>("RIGHT");
  // Input queue — buffer up to 3 moves so rapid presses aren't lost
  const inputQueue = useRef<Direction[]>([]);
  const initialSnake: Point[] = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  const snakeRef = useRef<Point[]>(initialSnake);
  const foodsRef = useRef<Food[]>(spawnFoods(initialSnake));
  const growRef = useRef(0);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // Enqueue a direction — validates against the last queued (or current) direction
  const enqueueDir = useCallback((newDir: Direction) => {
    const queue = inputQueue.current;
    // The "effective" direction is the last queued one, or current if queue is empty
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
    // Don't reverse and don't duplicate
    if (newDir === OPPOSITE[lastDir] || newDir === lastDir) return;
    if (queue.length < 3) {
      queue.push(newDir);
      tryVibrate();
    }
  }, []);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("snake_high_score");
      if (saved) {
        const n = parseInt(saved, 10);
        highScoreRef.current = n;
        setHighScore(n);
      }
    } catch { /* SSR guard */ }
  }, []);

  // Responsive canvas size
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

    // Background grid
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if ((x + y) % 2 === 0) {
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    // Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const progress = 1 - i / snake.length;
      const r = isHead ? cell * 0.45 : cell * 0.38;

      if (isHead) {
        const grd = ctx.createRadialGradient(
          seg.x * cell + cell / 2, seg.y * cell + cell / 2, 0,
          seg.x * cell + cell / 2, seg.y * cell + cell / 2, cell
        );
        grd.addColorStop(0, "rgba(56,189,248,0.3)");
        grd.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(seg.x * cell - cell / 2, seg.y * cell - cell / 2, cell * 2, cell * 2);
      }

      ctx.beginPath();
      ctx.arc(seg.x * cell + cell / 2, seg.y * cell + cell / 2, r, 0, Math.PI * 2);
      const alpha = 0.5 + 0.5 * progress;
      ctx.fillStyle = isHead
        ? `rgba(56,189,248,${alpha})`
        : `rgba(56,189,248,${alpha * 0.7})`;
      ctx.fill();
    });

    // Foods
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
    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(scoreRef.current);
      try { localStorage.setItem("snake_high_score", String(scoreRef.current)); } catch { /* */ }
    }
  }, []);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;

    // Dequeue next direction from input buffer
    if (inputQueue.current.length > 0) {
      dirRef.current = inputQueue.current.shift()!;
    }

    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    switch (dirRef.current) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame();
      return;
    }

    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    const eatenIdx = foodsRef.current.findIndex((f) => f.x === head.x && f.y === head.y);
    if (eatenIdx !== -1) {
      const eaten = foodsRef.current[eatenIdx];
      const points = FOOD_POINTS[eaten.type];
      const growAmount = FOOD_GROW[eaten.type];

      scoreRef.current += points;
      setScore(scoreRef.current);
      playEatSound(eaten.type);

      growRef.current += growAmount - 1;

      const otherFoods = foodsRef.current.filter((_, i) => i !== eatenIdx);
      const newFood = respawnOne(eaten.type, snake, otherFoods);
      foodsRef.current = [...otherFoods, newFood];
    } else {
      if (growRef.current > 0) {
        growRef.current -= 1;
      } else {
        snake.pop();
      }
    }

    snakeRef.current = snake;
    draw();
  }, [draw, endGame]);

  const startGame = useCallback(() => {
    const startSnake: Point[] = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ];
    snakeRef.current = startSnake;
    dirRef.current = "RIGHT";
    inputQueue.current = [];
    foodsRef.current = spawnFoods(startSnake);
    growRef.current = 0;
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    draw();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS);
  }, [draw, tick]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw, canvasSize]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      let newDir: Direction | null = null;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": newDir = "UP"; break;
        case "ArrowDown": case "s": case "S": newDir = "DOWN"; break;
        case "ArrowLeft": case "a": case "A": newDir = "LEFT"; break;
        case "ArrowRight": case "d": case "D": newDir = "RIGHT"; break;
        case " ":
          e.preventDefault();
          if (gameOverRef.current || !started) startGame();
          return;
      }
      if (newDir) {
        e.preventDefault();
        enqueueDir(newDir);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, startGame, enqueueDir]);

  // Touch / swipe controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return;

    const newDir: Direction = absDx > absDy
      ? (dx > 0 ? "RIGHT" : "LEFT")
      : (dy > 0 ? "DOWN" : "UP");
    enqueueDir(newDir);
    touchStart.current = null;
  }, [enqueueDir]);

  // D-pad button handler — uses onTouchStart for mobile + onMouseDown for desktop
  const dpad = useCallback((dir: Direction) => {
    enqueueDir(dir);
  }, [enqueueDir]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg-primary"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[400px] px-4 mb-3">
        <button
          onClick={onClose}
          className="p-2 rounded-full text-text-secondary active:bg-bg-tertiary transition-colors"
          aria-label="Close"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-text-tertiary">HI {highScore}</span>
          <span className="text-sm font-bold text-text-primary tabular-nums">{score}</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full max-w-[400px] px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative rounded-2xl overflow-hidden border border-border"
          style={{ width: canvasSize, height: canvasSize, margin: "0 auto" }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="block"
          />

          <AnimatePresence>
            {(!started || gameOver) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary/80 backdrop-blur-sm"
              >
                {gameOver && (
                  <p className="text-lg font-bold text-text-primary mb-1">Game Over</p>
                )}
                {gameOver && score === highScore && score > 0 && (
                  <p className="text-xs text-income font-medium mb-3">New High Score!</p>
                )}
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-full bg-btn-primary-bg text-btn-primary-text text-sm font-semibold active:bg-btn-primary-hover transition-colors"
                >
                  {gameOver ? "Play Again" : "Start"}
                </button>
                <p className="text-[11px] text-text-tertiary mt-3">
                  Swipe or use buttons to move
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* D-Pad controls */}
      <div className="mt-5 select-none touch-none flex flex-col items-center gap-3">
        <button
          onTouchStart={(e) => { e.preventDefault(); dpad("UP"); }}
          onMouseDown={() => dpad("UP")}
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-90 transition-all duration-75"
          aria-label="Up"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); dpad("LEFT"); }}
            onMouseDown={() => dpad("LEFT")}
            className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-90 transition-all duration-75"
            aria-label="Left"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="w-20 h-20" />
          <button
            onTouchStart={(e) => { e.preventDefault(); dpad("RIGHT"); }}
            onMouseDown={() => dpad("RIGHT")}
            className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-90 transition-all duration-75"
            aria-label="Right"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); dpad("DOWN"); }}
          onMouseDown={() => dpad("DOWN")}
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary active:scale-90 transition-all duration-75"
          aria-label="Down"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
