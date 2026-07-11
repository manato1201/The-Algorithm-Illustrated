export type GridCellState =
  | "idle"
  | "wall"
  | "start"
  | "goal"
  | "frontier"
  | "visited"
  | "path"
  | "difficult";

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

/**
 * 地形コスト。既定は1、一部を「コストの高い地形」(5)にすることで、
 * 歩数最短(BFS/DFS)と累積コスト最小(ダイクストラ法)が別の経路を選ぶ様子を対比できるようにする。
 * BFS/DFSはこのコストを無視してそのまま突っ切るが、ダイクストラ法だけが迂回する。
 */
function buildWeightMap(): number[][] {
  const weights: number[][] = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(1));
  for (let c = 1; c <= 14; c++) {
    weights[MAZE_ROWS - 1][c] = 5;
  }
  return weights;
}

const WEIGHT_MAP = buildWeightMap();
const weightOf = (r: number, c: number) => WEIGHT_MAP[r][c];

function buildInitialGrid(): GridCellState[][] {
  const grid: GridCellState[][] = WALL_MAP.map((row, r) =>
    row.map((isWall, c) => {
      if (isWall) return "wall";
      return weightOf(r, c) > 1 ? "difficult" : "idle";
    }),
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

/**
 * ダイクストラ法のステップ列を生成する。
 * BFSの「歩数」の代わりに「累積コスト」を優先度にして探索することで、
 * コストの高い地形(difficult)を迂回する経路を選ぶ様子を可視化する。
 * グリッドが小さいため、優先度付きキューは配列+ソートの素朴な実装で十分。
 */
export function dijkstraSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態" }];
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();
  const visited = new Set<string>();
  const startKey = key(START[0], START[1]);
  dist.set(startKey, 0);

  const queue: [number, number][] = [START];

  let found = false;
  while (queue.length > 0 && !found) {
    queue.sort((a, b) => (dist.get(key(...a)) ?? Infinity) - (dist.get(key(...b)) ?? Infinity));
    const [r, c] = queue.shift()!;
    const currentKey = key(r, c);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `(${r + 1}, ${c + 1}) を累積コスト${dist.get(currentKey)}で確定`,
    });

    if (r === GOAL[0] && c === GOAL[1]) {
      found = true;
      break;
    }

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      const candidateDist = dist.get(currentKey)! + weightOf(nr, nc);
      const neighborKey = key(nr, nc);
      if (candidateDist < (dist.get(neighborKey) ?? Infinity)) {
        dist.set(neighborKey, candidateDist);
        parent.set(neighborKey, currentKey);
        if (grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
        queue.push([nr, nc]);
      }
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `隣接マスの累積コストを更新(キュー内 ${queue.length}件)`,
    });
  }

  if (found) {
    reconstructPath(grid, frames, parent);
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: found
      ? `探索完了(最小コスト経路を発見、総コスト${dist.get(key(GOAL[0], GOAL[1]))})`
      : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

/** マンハッタン距離ヒューリスティック(A*が「ゴールまでの残り」を見積もるのに使う) */
const heuristic = (r: number, c: number) => Math.abs(GOAL[0] - r) + Math.abs(GOAL[1] - c);

/**
 * A*探索のステップ列を生成する。
 * ダイクストラ法とほぼ同じ実装だが、優先度を「累積コストg」ではなく「g + ヒューリスティックh」にすることで、
 * ゴール方向を優先的に探索し、同じ最小コスト経路をより少ない探索マス数で見つけられる。
 */
export function aStarSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態" }];
  const gScore = new Map<string, number>();
  const parent = new Map<string, string>();
  const visited = new Set<string>();
  const startKey = key(START[0], START[1]);
  gScore.set(startKey, 0);

  const fScore = (r: number, c: number) => (gScore.get(key(r, c)) ?? Infinity) + heuristic(r, c);

  const queue: [number, number][] = [START];

  let found = false;
  while (queue.length > 0 && !found) {
    queue.sort((a, b) => fScore(...a) - fScore(...b));
    const [r, c] = queue.shift()!;
    const currentKey = key(r, c);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `(${r + 1}, ${c + 1}) を f=g+h=${fScore(r, c)}(g=${gScore.get(currentKey)}, h=${heuristic(r, c)})で確定`,
    });

    if (r === GOAL[0] && c === GOAL[1]) {
      found = true;
      break;
    }

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      const candidateG = gScore.get(currentKey)! + weightOf(nr, nc);
      const neighborKey = key(nr, nc);
      if (candidateG < (gScore.get(neighborKey) ?? Infinity)) {
        gScore.set(neighborKey, candidateG);
        parent.set(neighborKey, currentKey);
        if (grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
        queue.push([nr, nc]);
      }
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `隣接マスのg値を更新(キュー内 ${queue.length}件)`,
    });
  }

  if (found) {
    reconstructPath(grid, frames, parent);
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: found
      ? `探索完了(最小コスト経路を発見、総コスト${gScore.get(key(GOAL[0], GOAL[1]))})`
      : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

export const PATHFINDING_VISUALIZERS: Record<string, () => GridFrame[]> = {
  bfs: bfsSteps,
  dfs: dfsSteps,
  dijkstra: dijkstraSteps,
  "a-star": aStarSteps,
};
