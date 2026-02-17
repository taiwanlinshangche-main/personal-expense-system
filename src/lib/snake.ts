export interface Position {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "idle" | "running" | "paused" | "over";

export interface SnakeGameState {
  rows: number;
  cols: number;
  snake: Position[];
  direction: Direction;
  food: Position | null;
  score: number;
  status: GameStatus;
}

const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function isOppositeDirection(
  current: Direction,
  next: Direction
): boolean {
  return (
    (current === "up" && next === "down") ||
    (current === "down" && next === "up") ||
    (current === "left" && next === "right") ||
    (current === "right" && next === "left")
  );
}

export function createInitialSnakeGame(
  rows: number,
  cols: number,
  random: () => number = Math.random
): SnakeGameState {
  const startX = Math.floor(cols / 2);
  const startY = Math.floor(rows / 2);
  const snake: Position[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  return {
    rows,
    cols,
    snake,
    direction: "right",
    food: placeFood(rows, cols, snake, random),
    score: 0,
    status: "idle",
  };
}

export function stepSnakeGame(
  state: SnakeGameState,
  random: () => number = Math.random
): SnakeGameState {
  if (state.status !== "running" || !state.food) {
    return state;
  }

  const head = state.snake[0];
  const move = DIRECTION_VECTORS[state.direction];
  const nextHead = { x: head.x + move.x, y: head.y + move.y };

  if (!isInsideGrid(nextHead, state.rows, state.cols)) {
    return {
      ...state,
      status: "over",
    };
  }

  const willGrow = isSamePosition(nextHead, state.food);
  const collisionBody = willGrow ? state.snake : state.snake.slice(0, -1);

  if (collisionBody.some((segment) => isSamePosition(segment, nextHead))) {
    return {
      ...state,
      status: "over",
    };
  }

  const movedSnake = [nextHead, ...state.snake];
  const nextSnake = willGrow ? movedSnake : movedSnake.slice(0, -1);
  const nextFood = willGrow
    ? placeFood(state.rows, state.cols, nextSnake, random)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    food: nextFood,
    score: willGrow ? state.score + 1 : state.score,
    status: willGrow && !nextFood ? "over" : state.status,
  };
}

export function placeFood(
  rows: number,
  cols: number,
  snake: Position[],
  random: () => number = Math.random
): Position | null {
  const snakeCells = new Set(snake.map((segment) => serializePosition(segment)));
  const emptyCells: Position[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const pos = { x, y };
      if (!snakeCells.has(serializePosition(pos))) {
        emptyCells.push(pos);
      }
    }
  }

  if (emptyCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * emptyCells.length);
  return emptyCells[index];
}

export function isSamePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function serializePosition(pos: Position): string {
  return `${pos.x}:${pos.y}`;
}

function isInsideGrid(pos: Position, rows: number, cols: number): boolean {
  return pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows;
}
