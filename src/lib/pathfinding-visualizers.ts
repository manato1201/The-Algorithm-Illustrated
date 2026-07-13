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

/**
 * 反復深化深さ優先探索(IDDFS)のステップ列を生成する。深さ制限0から始め、
 * 制限付きDFSでゴールが見つからなければ制限を1つ増やしてやり直す、を繰り返す。
 * 同じ浅い部分を毎回再探索する無駄はあるものの、BFSのような「全頂点を記憶するメモリ」を
 * 使わずにDFSの省メモリ性を保ったまま、BFSと同じ「最短距離での発見」を保証できる
 * (深さ優先探索とその都度の深さ制限の組み合わせが名前の由来)。
 */
export function iddfsSteps(): GridFrame[] {
  const frames: GridFrame[] = [{ cellStates: cloneGrid(buildInitialGrid()), description: "反復深化深さ優先探索(IDDFS)を開始" }];
  let found = false;
  let finalGrid = buildInitialGrid();
  let finalParent = new Map<string, string>();

  for (let depthLimit = 0; !found && depthLimit <= MAZE_ROWS * MAZE_COLS; depthLimit++) {
    const grid = buildInitialGrid();
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    frames.push({ cellStates: cloneGrid(grid), description: `深さ制限=${depthLimit}で深さ制限付きDFSを開始` });

    const visit = (r: number, c: number, depth: number): boolean => {
      visited.add(key(r, c));
      if (grid[r][c] !== "start" && grid[r][c] !== "goal") grid[r][c] = "visited";
      frames.push({ cellStates: cloneGrid(grid), description: `(${r + 1}, ${c + 1})を探索(深さ${depth}/${depthLimit})` });

      if (r === GOAL[0] && c === GOAL[1]) return true;
      if (depth >= depthLimit) return false;

      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
        parent.set(key(nr, nc), key(r, c));
        if (visit(nr, nc, depth + 1)) return true;
      }
      return false;
    };

    found = visit(START[0], START[1], 0);
    if (found) {
      finalGrid = grid;
      finalParent = parent;
    } else {
      frames.push({ cellStates: cloneGrid(grid), description: `深さ制限=${depthLimit}ではゴールに届かず。制限を1増やして最初からやり直す` });
    }
  }

  if (found) {
    reconstructPath(finalGrid, frames, finalParent);
  }

  frames.push({
    cellStates: cloneGrid(finalGrid),
    description: found ? "探索完了(最短経路を発見)" : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

export const LIFE_ROWS = 12;
export const LIFE_COLS = 12;
export const LIFE_GENERATIONS = 8;
/** グライダーパターン(4世代ごとに右下へ1マスずつ移動しながら形を保つ、最も有名な「移動する」パターン)。 */
const LIFE_GLIDER: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];

function buildLifeGrid(): GridCellState[][] {
  const grid: GridCellState[][] = Array.from({ length: LIFE_ROWS }, () => Array<GridCellState>(LIFE_COLS).fill("idle"));
  LIFE_GLIDER.forEach(([r, c]) => {
    grid[r][c] = "visited";
  });
  return grid;
}

function lifeCountAliveNeighbors(grid: GridCellState[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < LIFE_ROWS && nc >= 0 && nc < LIFE_COLS && grid[nr][nc] === "visited") count++;
    }
  }
  return count;
}

/**
 * ライフゲーム(コンウェイのライフゲーム)のステップ列を生成する。各セルは生/死の2状態を持ち、
 * 「生きたセルは隣接する生きたセルが2つか3つならそのまま生存、それ以外は死ぬ」
 * 「死んだセルは隣接する生きたセルがちょうど3つなら誕生する」という単純な2つの規則だけを
 * 全マスに同時適用し続けることで、静止パターン・振動パターン・グライダーのように移動する
 * パターンなど、驚くほど複雑な振る舞いが自己組織的に生まれる。チューリング完全であることも
 * 証明されている、セルオートマトンの最も有名な例。
 */
export function conwaysGameOfLifeSteps(): GridFrame[] {
  let grid = buildLifeGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態(グライダーパターン)。生きたセル=explored色" }];

  for (let gen = 1; gen <= LIFE_GENERATIONS; gen++) {
    const next: GridCellState[][] = grid.map((row) => [...row]);
    for (let r = 0; r < LIFE_ROWS; r++) {
      for (let c = 0; c < LIFE_COLS; c++) {
        const alive = grid[r][c] === "visited";
        const n = lifeCountAliveNeighbors(grid, r, c);
        next[r][c] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? "visited" : "idle";
      }
    }
    grid = next;
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${gen}: 生存(隣接2〜3)・誕生(隣接3)のルールを全マスに同時適用`,
    });
  }

  frames.push({ cellStates: cloneGrid(grid), description: `計算完了(${LIFE_GENERATIONS}世代経過)` });
  return frames;
}

export const ANT_GRID_SIZE = 25;
export const ANT_STEPS = 60;

/**
 * ラングトンのアリのステップ列を生成する。1匹のアリが「今いるマスが白なら右に90度回転して
 * マスを黒に反転、黒なら左に90度回転して白に反転」した後に1マス前進する、というだけの
 * 単純な規則に従う。最初は無秩序に見える軌跡を描くが、十分な時間が経つと
 * 「ハイウェイ」と呼ばれる規則的な斜めのパターンへ必ず収束することが知られている
 * ——単純な局所規則の繰り返しから予測困難な複雑さが生まれる、創発の代表例。
 */
export function langtonsAntSteps(): GridFrame[] {
  const grid: GridCellState[][] = Array.from({ length: ANT_GRID_SIZE }, () => Array<GridCellState>(ANT_GRID_SIZE).fill("idle"));
  let r = Math.floor(ANT_GRID_SIZE / 2);
  let c = Math.floor(ANT_GRID_SIZE / 2);
  let dir = 0;
  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];

  const withAnt = (): GridCellState[][] => {
    const copy = cloneGrid(grid);
    copy[r][c] = "frontier";
    return copy;
  };

  const frames: GridFrame[] = [
    { cellStates: withAnt(), description: `ラングトンのアリを開始。中央(${r + 1},${c + 1})から上向きでスタート` },
  ];

  for (let step = 1; step <= ANT_STEPS; step++) {
    const isWhite = grid[r][c] === "idle";
    if (isWhite) {
      dir = (dir + 1) % 4;
      grid[r][c] = "wall";
    } else {
      dir = (dir + 3) % 4;
      grid[r][c] = "idle";
    }
    const nr = r + dr[dir];
    const nc = c + dc[dir];
    if (nr < 0 || nr >= ANT_GRID_SIZE || nc < 0 || nc >= ANT_GRID_SIZE) break;
    r = nr;
    c = nc;
    frames.push({
      cellStates: withAnt(),
      description: `ステップ${step}: ${isWhite ? "白マスなので右に90度回転しマスを黒に反転" : "黒マスなので左に90度回転しマスを白に反転"}、1マス前進`,
    });
  }

  frames.push({ cellStates: cloneGrid(grid), description: `計算完了(${ANT_STEPS}ステップ経過)` });
  return frames;
}

export const PATHFINDING_VISUALIZERS: Record<string, () => GridFrame[]> = {
  bfs: bfsSteps,
  dfs: dfsSteps,
  dijkstra: dijkstraSteps,
  "a-star": aStarSteps,
  iddfs: iddfsSteps,
  "conways-game-of-life": conwaysGameOfLifeSteps,
  "langtons-ant": langtonsAntSteps,
};
