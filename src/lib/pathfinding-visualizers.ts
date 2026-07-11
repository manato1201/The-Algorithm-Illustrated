export type GridCellState =
  | "idle"
  | "wall"
  | "start"
  | "goal"
  | "frontier"
  | "visited"
  | "path";

export type GridFrame = {
  cellStates: GridCellState[][];
  description: string;
};

export const MAZE_ROWS = 10;
export const MAZE_COLS = 16;

const START: [number, number] = [0, 0];
const GOAL: [number, number] = [MAZE_ROWS - 1, MAZE_COLS - 1];

/**
 * 迷路レイアウト。外周(行0/行9/列0/列15)を常に開けておくことで、
 * どのブロック配置でもstartからgoalへの経路が必ず存在することを保証する。
 */
function buildWallMap(): boolean[][] {
  const walls: boolean[][] = Array.from({ length: MAZE_ROWS }, () =>
    Array(MAZE_COLS).fill(false),
  );
  const blocks: [number, number, number, number][] = [
    [1, 3, 2, 4],
    [5, 7, 2, 4],
    [1, 3, 7, 9],
    [5, 7, 7, 9],
    [1, 3, 11, 13],
    [5, 7, 11, 13],
  ];
  for (const [r0, r1, c0, c1] of blocks) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        walls[r][c] = true;
      }
    }
  }
  return walls;
}

const WALL_MAP = buildWallMap();

function buildInitialGrid(): GridCellState[][] {
  const grid: GridCellState[][] = WALL_MAP.map((row) =>
    row.map((isWall) => (isWall ? "wall" : "idle")),
  );
  grid[START[0]][START[1]] = "start";
  grid[GOAL[0]][GOAL[1]] = "goal";
  return grid;
}

function cloneGrid(grid: GridCellState[][]): GridCellState[][] {
  return grid.map((row) => [...row]);
}

const key = (r: number, c: number) => `${r},${c}`;
const inBounds = (r: number, c: number) => r >= 0 && r < MAZE_ROWS && c >= 0 && c < MAZE_COLS;
const isWall = (r: number, c: number) => WALL_MAP[r][c];

function reconstructPath(
  grid: GridCellState[][],
  frames: GridFrame[],
  parent: Map<string, string>,
): void {
  const path: string[] = [];
  let cur = key(GOAL[0], GOAL[1]);
  const startKey = key(START[0], START[1]);
  while (cur !== startKey) {
    path.push(cur);
    const prev = parent.get(cur);
    if (!prev) break;
    cur = prev;
  }
  path.reverse();
  for (const p of path) {
    const [r, c] = p.split(",").map(Number);
    if (grid[r][c] !== "goal") grid[r][c] = "path";
    frames.push({ cellStates: cloneGrid(grid), description: `最短経路を復元: (${r + 1}, ${c + 1})` });
  }
}

/**
 * 幅優先探索(BFS)のステップ列を生成する。
 * frontier=次に訪れる候補(pivot相当)、visited=探索済み(comparing相当)、path=最短経路(settled相当)。
 */
export function bfsSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態" }];
  const visited = new Set<string>([key(START[0], START[1])]);
  const parent = new Map<string, string>();
  const queue: [number, number][] = [START];

  let found = false;
  while (queue.length > 0 && !found) {
    const [r, c] = queue.shift()!;
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({ cellStates: cloneGrid(grid), description: `(${r + 1}, ${c + 1}) を探索キューから取り出す` });

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      visited.add(key(nr, nc));
      parent.set(key(nr, nc), key(r, c));
      queue.push([nr, nc]);
      if (grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
      if (nr === GOAL[0] && nc === GOAL[1]) found = true;
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `隣接マスをキューに追加(キュー内 ${queue.length}件)`,
    });
  }

  if (found) {
    reconstructPath(grid, frames, parent);
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: found ? "探索完了(最短経路を発見)" : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

/**
 * 深さ優先探索(DFS)のステップ列を生成する。
 * BFSと違い最短経路は保証しないが、行き止まりまで掘り進めてから戻る挙動が可視化できる。
 */
export function dfsSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態" }];
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  let found = false;

  const visit = (r: number, c: number): boolean => {
    visited.add(key(r, c));
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({ cellStates: cloneGrid(grid), description: `(${r + 1}, ${c + 1}) を探索` });

    if (r === GOAL[0] && c === GOAL[1]) return true;

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      parent.set(key(nr, nc), key(r, c));
      if (grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
      frames.push({
        cellStates: cloneGrid(grid),
        description: `(${nr + 1}, ${nc + 1}) を次の候補としてスタックに積む`,
      });
      if (visit(nr, nc)) return true;
    }
    return false;
  };

  found = visit(START[0], START[1]);

  if (found) {
    reconstructPath(grid, frames, parent);
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: found ? "探索完了(経路を発見)" : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

export const PATHFINDING_VISUALIZERS: Record<string, () => GridFrame[]> = {
  bfs: bfsSteps,
  dfs: dfsSteps,
};
