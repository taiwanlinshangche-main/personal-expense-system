"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createInitialSnakeGame,
  isOppositeDirection,
  stepSnakeGame,
  type Direction,
} from "@/lib/snake";

const GRID_ROWS = 16;
const GRID_COLS = 16;
const TICK_MS = 140;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

export default function SnakePage() {
  const [game, setGame] = useState(() =>
    createInitialSnakeGame(GRID_ROWS, GRID_COLS)
  );
  const queuedDirectionRef = useRef<Direction | null>(null);
  const latestGameRef = useRef(game);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  const queueDirection = useCallback((direction: Direction) => {
    const currentDirection = queuedDirectionRef.current ?? latestGameRef.current.direction;
    if (isOppositeDirection(currentDirection, direction)) {
      return;
    }

    queuedDirectionRef.current = direction;

    setGame((prev) => {
      if (prev.status === "idle" || prev.status === "paused") {
        return { ...prev, status: "running" };
      }
      return prev;
    });
  }, []);

  const restartGame = useCallback(() => {
    queuedDirectionRef.current = null;
    setGame(createInitialSnakeGame(GRID_ROWS, GRID_COLS));
  }, []);

  const togglePause = useCallback(() => {
    setGame((prev) => {
      if (prev.status === "running") {
        return { ...prev, status: "paused" };
      }
      if (prev.status === "paused" || prev.status === "idle") {
        return { ...prev, status: "running" };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[event.key];

      if (direction) {
        event.preventDefault();
        queueDirection(direction);
        return;
      }

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === "Enter" && latestGameRef.current.status === "over") {
        event.preventDefault();
        restartGame();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [queueDirection, restartGame, togglePause]);

  useEffect(() => {
    if (game.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setGame((prev) => {
        const queued = queuedDirectionRef.current;
        queuedDirectionRef.current = null;
        const direction = queued ?? prev.direction;
        return stepSnakeGame({ ...prev, direction });
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [game.status]);

  const snakeCells = useMemo(
    () => new Set(game.snake.map((segment) => `${segment.x}:${segment.y}`)),
    [game.snake]
  );

  const foodCell = game.food ? `${game.food.x}:${game.food.y}` : "";

  return (
    <div className="px-4 pt-4 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-text-primary">Snake</h1>
        <Link href="/" className="text-sm font-medium text-accent">
          Go Home
        </Link>
      </header>

      <section className="mt-4 rounded-2xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">Score</p>
          <p className="tabular-nums text-lg font-semibold text-text-primary">
            {game.score}
          </p>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {game.status === "idle" && "Press arrow keys or WASD to start"}
          {game.status === "running" && "Press Space to pause"}
          {game.status === "paused" && "Paused, press Space to continue"}
          {game.status === "over" && "Game over, press Enter or restart"}
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-bg-secondary p-3">
        <div
          className="grid aspect-square w-full rounded-xl border border-border bg-bg-primary"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          aria-label="Snake game board"
        >
          {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, index) => {
            const x = index % GRID_COLS;
            const y = Math.floor(index / GRID_COLS);
            const key = `${x}:${y}`;
            const isSnake = snakeCells.has(key);
            const isFood = foodCell === key;

            return (
              <div
                key={key}
                className={[
                  "border-[0.5px] border-border/30",
                  isSnake ? "bg-accent" : "",
                  isFood ? "bg-expense" : "",
                ].join(" ")}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => queueDirection("up")}
          className="col-start-2 rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary active:bg-bg-tertiary"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => queueDirection("left")}
          className="rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary active:bg-bg-tertiary"
          aria-label="Move left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => queueDirection("down")}
          className="rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary active:bg-bg-tertiary"
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => queueDirection("right")}
          className="rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary active:bg-bg-tertiary"
          aria-label="Move right"
        >
          →
        </button>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={togglePause}
          disabled={game.status === "over"}
          className="rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary disabled:opacity-50"
        >
          {game.status === "running" ? "Pause" : "Start/Resume"}
        </button>
        <button
          type="button"
          onClick={restartGame}
          className="rounded-xl border border-border bg-bg-secondary py-2 text-sm text-text-primary"
        >
          Restart
        </button>
      </section>
    </div>
  );
}
