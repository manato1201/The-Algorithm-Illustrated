"use client";

import { useEffect, useState } from "react";
import styles from "./LostDotMaze.module.css";
import { useMediaQuery } from "@/lib/use-media-query";

/** '#'=壁 / '.'=通路 / 'S'=迷子の点 / 'G'=出口。行き止まりをいくつか含む小さな迷路。 */
const MAZE = [
  "S..#......",
  ".#.#.####.",
  ".#...#....",
  ".####.#.#.",
  "......#.#.",
  ".####...#G",
];

type Cell = { r: number; c: number };

const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const key = (r: number, c: number) => r * COLS + c;

function findCell(symbol: string): Cell {
  for (let r = 0; r < ROWS; r++) {
    const c = MAZE[r].indexOf(symbol);
    if (c >= 0) return { r, c };
  }
  throw new Error(`迷路に ${symbol} がありません`);
}

/** 幅優先探索で、探索順(order)と出口までの最短経路(path)を事前に求める。 */
function solveMaze(): { order: Cell[]; path: Cell[] } {
  const start = findCell("S");
  const goal = findCell("G");
  const parent = new Map<number, number | null>([
    [key(start.r, start.c), null],
  ]);
  const queue: Cell[] = [start];
  const order: Cell[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    order.push(cur);
    if (cur.r === goal.r && cur.c === goal.c) break;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const r = cur.r + dr;
      const c = cur.c + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (MAZE[r][c] === "#" || parent.has(key(r, c))) continue;
      parent.set(key(r, c), key(cur.r, cur.c));
      queue.push({ r, c });
    }
  }

  const path: Cell[] = [];
  let cursor: number | null | undefined = key(goal.r, goal.c);
  while (cursor !== null && cursor !== undefined) {
    path.push({ r: Math.floor(cursor / COLS), c: cursor % COLS });
    cursor = parent.get(cursor);
  }
  path.reverse();
  return { order, path };
}

/** 迷路は固定なので、解(探索順と最短経路)はモジュール読み込み時に一度だけ求める。 */
const SOLUTION = solveMaze();

const VISIT_INTERVAL_MS = 80;
const PATH_INTERVAL_MS = 70;

/**
 * 404ページの小さな遊び(IMPROVEMENT_PLAN_2026-10 A6 / U6)。迷子の点が幅優先で出口を探す。
 * 近い所から順に広げるので、最初に出口へ届いた経路がそのまま最短になる、というBFSの性質を数秒で見せる。
 * 動きを減らす設定では、アニメーションせず結果(探索範囲と最短経路)をそのまま表示する。
 */
export function LostDotMaze() {
  const { order, path } = SOLUTION;
  const total = order.length + path.length;
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [tick, setTick] = useState(0);

  const progress = reduceMotion ? total : Math.min(tick, total);

  useEffect(() => {
    if (reduceMotion || tick >= total) return;
    const interval = tick < order.length ? VISIT_INTERVAL_MS : PATH_INTERVAL_MS;
    const timer = setTimeout(() => setTick((t) => t + 1), interval);
    return () => clearTimeout(timer);
  }, [tick, total, order.length, reduceMotion]);

  const visitedCount = Math.min(progress, order.length);
  const pathCount = Math.max(0, progress - order.length);
  const visited = new Set(
    order.slice(0, visitedCount).map((cell) => key(cell.r, cell.c)),
  );
  const onPath = new Set(
    path.slice(0, pathCount).map((cell) => key(cell.r, cell.c)),
  );
  const head =
    visitedCount > 0 && visitedCount <= order.length
      ? order[visitedCount - 1]
      : null;
  const finished = progress >= total;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.maze}
        data-surface="dark"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        role="img"
        aria-label="迷子の点が幅優先探索で出口を探す小さなアニメーション"
      >
        {MAZE.flatMap((row, r) =>
          row.split("").map((symbol, c) => {
            const id = key(r, c);
            let state = "open";
            if (symbol === "#") state = "wall";
            else if (onPath.has(id)) state = "path";
            else if (visited.has(id)) state = "visited";
            const isDot =
              head !== null && head.r === r && head.c === c && !finished;
            return (
              <span
                key={id}
                className={styles.cell}
                data-state={state}
                data-goal={symbol === "G"}
                data-start={symbol === "S"}
                data-dot={isDot || (finished && symbol === "G")}
              />
            );
          }),
        )}
      </div>
      <div className={styles.caption} role="status">
        <span>
          {finished
            ? `出口に到着。探索したマス ${order.length} ・ 最短経路 ${path.length - 1} 歩`
            : `探索中… 調べたマス ${visitedCount}`}
        </span>
        <button
          type="button"
          className={styles.replay}
          onClick={() => setTick(0)}
        >
          もう一度
        </button>
      </div>
    </div>
  );
}
