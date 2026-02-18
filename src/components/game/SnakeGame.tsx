"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type Food = { x: number; y: number; type: "normal" | "bonus" };

const GRID = 20;
const TICK_MS = 120;

function randomPos(occupied: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.some((o) => o.x === p.x && o.y === p.y));
  return p;
}

function spawnFoods(snake: Point[]): Food[] {
  const all: Point[] = [...snake];
  const foods: Food[] = [];
  // 2 normal (red) + 1 bonus (yellow)
  for (let i = 0; i < 2; i++) {
    const p = randomPos([...all, ...foods]);
    foods.push({ ...p, type: "normal" });
  }
  const bp = randomPos([...all, ...foods]);
  foods.push({ ...bp, type: "bonus" });
  return foods;
}

function respawnOne(type: "normal" | "bonus", snake: Point[], otherFoods: Food[]): Food {
  const occupied: Point[] = [...snake, ...otherFoods];
  const p = randomPos(occupied);
  return { ...p, type };
}

// Synthesized SFX via Web Audio API
function playEatSound(bonus: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (bonus) {
      // Rising arpeggio for bonus
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.06);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Short blip for normal
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch { /* Audio not available */ }
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
  const nextDirRef = useRef<Direction>("RIGHT");
  const initialSnake: Point[] = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  const snakeRef = useRef<Point[]>(initialSnake);
  const foodsRef = useRef<Food[]>(spawnFoods(initialSnake));
  const growRef = useRef(0); // pending segments to grow
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

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
        const w = containerRef.current.clientWidth - 32; // subtract px-4 padding (16*2)
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

    // Background grid (subtle)
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

    // Foods (3 total)
    for (const food of foodsRef.current) {
      const fx = food.x * cell + cell / 2;
      const fy = food.y * cell + cell / 2;
      const isBonus = food.type === "bonus";

      // Glow
      const fgrd = ctx.createRadialGradient(fx, fy, 0, fx, fy, cell);
      if (isBonus) {
        fgrd.addColorStop(0, "rgba(250,204,21,0.45)");
        fgrd.addColorStop(1, "rgba(250,204,21,0)");
      } else {
        fgrd.addColorStop(0, "rgba(248,113,113,0.4)");
        fgrd.addColorStop(1, "rgba(248,113,113,0)");
      }
      ctx.fillStyle = fgrd;
      ctx.fillRect(fx - cell, fy - cell, cell * 2, cell * 2);

      // Dot
      ctx.beginPath();
      ctx.arc(fx, fy, cell * (isBonus ? 0.4 : 0.35), 0, Math.PI * 2);
      ctx.fillStyle = isBonus ? "#facc15" : "#f87171";
      ctx.fill();

      // Bonus star indicator
      if (isBonus) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.font = `bold ${cell * 0.45}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", fx, fy + 1);
      }
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

    dirRef.current = nextDirRef.current;
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    switch (dirRef.current) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame();
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    // Check food collision
    const eatenIdx = foodsRef.current.findIndex((f) => f.x === head.x && f.y === head.y);
    if (eatenIdx !== -1) {
      const eaten = foodsRef.current[eatenIdx];
      const isBonus = eaten.type === "bonus";
      const points = isBonus ? 5 : 1;
      const growAmount = isBonus ? 5 : 1;

      scoreRef.current += points;
      setScore(scoreRef.current);
      playEatSound(isBonus);

      // Queue growth (1 segment already added by not popping, rest via growRef)
      growRef.current += growAmount - 1;

      // Respawn that food
      const otherFoods = foodsRef.current.filter((_, i) => i !== eatenIdx);
      const newFood = respawnOne(eaten.type, snake, otherFoods);
      foodsRef.current = [...otherFoods, newFood];
    } else {
      // No food eaten — shrink tail (unless growing)
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
    nextDirRef.current = "RIGHT";
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
      if (newDir && newDir !== OPPOSITE[dirRef.current]) {
        e.preventDefault();
        nextDirRef.current = newDir;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, startGame]);

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

    let newDir: Direction;
    if (absDx > absDy) {
      newDir = dx > 0 ? "RIGHT" : "LEFT";
    } else {
      newDir = dy > 0 ? "DOWN" : "UP";
    }
    if (newDir !== OPPOSITE[dirRef.current]) {
      nextDirRef.current = newDir;
    }
    touchStart.current = null;
  }, []);

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

          {/* Start / Game Over overlay */}
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
      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          onPointerDown={() => { if (dirRef.current !== "DOWN") nextDirRef.current = "UP"; }}
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary transition-colors"
          aria-label="Up"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <button
            onPointerDown={() => { if (dirRef.current !== "RIGHT") nextDirRef.current = "LEFT"; }}
            className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary transition-colors"
            aria-label="Left"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="w-20 h-20" />
          <button
            onPointerDown={() => { if (dirRef.current !== "LEFT") nextDirRef.current = "RIGHT"; }}
            className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary transition-colors"
            aria-label="Right"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <button
          onPointerDown={() => { if (dirRef.current !== "UP") nextDirRef.current = "DOWN"; }}
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-bg-secondary active:bg-bg-tertiary transition-colors"
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
