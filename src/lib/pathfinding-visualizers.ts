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
 * 貪欲最良優先探索(Greedy Best-First Search)のステップ列を生成する。
 * A*探索と違い、スタートからの実コストgを一切追跡せず、ゴールまでの推定距離hだけで
 * 次に展開するマスを選ぶ。最短経路を保証しないが、実装がシンプルで高速に探索できる。
 */
export function bestFirstSearchSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: "初期状態(貪欲最良優先探索: hだけを見て進む)" }];
  const parent = new Map<string, string>();
  const visited = new Set<string>([key(START[0], START[1])]);
  const queue: [number, number][] = [START];

  let found = false;
  while (queue.length > 0 && !found) {
    queue.sort((a, b) => heuristic(...a) - heuristic(...b));
    const [r, c] = queue.shift()!;
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `(${r + 1}, ${c + 1}) をh=${heuristic(r, c)}(ゴールまでの推定距離)で選択`,
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
      visited.add(key(nr, nc));
      parent.set(key(nr, nc), key(r, c));
      if (grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
      queue.push([nr, nc]);
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `隣接マスをヒューリスティックのみで評価しキューに追加(キュー内 ${queue.length}件)`,
    });
  }

  if (found) {
    reconstructPath(grid, frames, parent);
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: found ? "探索完了(経路を発見。最短とは限らない)" : "探索完了(経路が見つかりませんでした)",
  });

  return frames;
}

/**
 * 双方向探索のステップ列を生成する。スタートとゴールの双方から同時にBFSを1段階ずつ交互に進め、
 * 双方の探索済み集合が最初に重なった地点(出会いの地点)を経由して経路を復元する。
 * 単方向BFSが探索する頂点数が「半径rの円」1つに近似されるのに対し、双方向探索は
 * 「半径r/2の円」2つ分で済むため、指数的に成長する探索空間では大幅な削減になる。
 */
export function bidirectionalSearchSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [
    { cellStates: cloneGrid(grid), description: "初期状態(双方向探索: スタートとゴールから同時にBFS)" },
  ];

  const startKey = key(START[0], START[1]);
  const goalKey = key(GOAL[0], GOAL[1]);
  const visitedF = new Set<string>([startKey]);
  const visitedB = new Set<string>([goalKey]);
  const parentF = new Map<string, string>();
  const parentB = new Map<string, string>();
  let queueF: [number, number][] = [START];
  let queueB: [number, number][] = [GOAL];
  let meetKey: string | null = null;

  const expand = (
    queue: [number, number][],
    visited: Set<string>,
    otherVisited: Set<string>,
    parent: Map<string, string>,
    label: string,
  ): [number, number][] => {
    const nextQueue: [number, number][] = [];
    for (const [r, c] of queue) {
      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        const nk = key(nr, nc);
        if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(nk)) continue;
        visited.add(nk);
        parent.set(nk, key(r, c));
        if (grid[nr][nc] !== "start" && grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
        nextQueue.push([nr, nc]);
        if (otherVisited.has(nk) && !meetKey) meetKey = nk;
      }
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `${label}側から1段階拡張(新たに${nextQueue.length}マス)`,
    });
    return nextQueue;
  };

  while (queueF.length > 0 && queueB.length > 0 && !meetKey) {
    queueF = expand(queueF, visitedF, visitedB, parentF, "スタート");
    if (meetKey) break;
    queueB = expand(queueB, visitedB, visitedF, parentB, "ゴール");
  }

  if (meetKey) {
    const forwardPath: string[] = [];
    let cur: string | undefined = meetKey;
    while (cur && cur !== startKey) {
      forwardPath.push(cur);
      cur = parentF.get(cur);
    }
    forwardPath.push(startKey);
    forwardPath.reverse();

    const backwardPath: string[] = [];
    cur = meetKey;
    while (cur && cur !== goalKey) {
      cur = parentB.get(cur);
      if (cur) backwardPath.push(cur);
    }

    const fullPath = [...forwardPath, ...backwardPath];
    for (const p of fullPath) {
      const [r, c] = p.split(",").map(Number);
      if (grid[r][c] !== "start" && grid[r][c] !== "goal") grid[r][c] = "path";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: "両側の探索が出会い、経路を復元",
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: meetKey ? "探索完了(スタート側とゴール側が出会った)" : "探索完了(経路が見つかりませんでした)",
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

export const WIREWORLD_ROWS = 10;
export const WIREWORLD_COLS = 14;
export const WIREWORLD_GENERATIONS = 40;

function isWireworldRingCell(r: number, c: number): boolean {
  const onHorizontalEdge = (r === 1 || r === WIREWORLD_ROWS - 2) && c >= 1 && c <= WIREWORLD_COLS - 2;
  const onVerticalEdge = (c === 1 || c === WIREWORLD_COLS - 2) && r >= 1 && r <= WIREWORLD_ROWS - 2;
  return onHorizontalEdge || onVerticalEdge;
}

/**
 * 導線(conductor)がループ状に1本つながった単純な回路を作り、信号(電子ヘッド+テールの対)を
 * ループ上端の1箇所に置く。「wall」を導線、「visited」を電子テール、「frontier」を電子ヘッドに
 * 転用することでGridCellStateパレットをそのまま流用する(コンウェイのライフゲーム・
 * ラングトンのアリと同じ再利用パターン)。
 */
function buildWireworldGrid(): GridCellState[][] {
  const grid: GridCellState[][] = Array.from({ length: WIREWORLD_ROWS }, () =>
    Array<GridCellState>(WIREWORLD_COLS).fill("idle"),
  );
  for (let r = 0; r < WIREWORLD_ROWS; r++) {
    for (let c = 0; c < WIREWORLD_COLS; c++) {
      if (isWireworldRingCell(r, c)) grid[r][c] = "wall";
    }
  }
  // ループ上端(r=1)に電子テール(c=2)→電子ヘッド(c=3)の対を置き、右向きに走らせる
  grid[1][2] = "visited";
  grid[1][3] = "frontier";
  return grid;
}

function wireworldCountHeadNeighbors(grid: GridCellState[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < WIREWORLD_ROWS && nc >= 0 && nc < WIREWORLD_COLS && grid[nr][nc] === "frontier") {
        count++;
      }
    }
  }
  return count;
}

/**
 * WireWorldのステップ列を生成する。各セルは空・導線(conductor)・電子ヘッド・電子テールの
 * 4状態を持ち、「電子ヘッドは次に電子テールになる」「電子テールは次に導線に戻る」
 * 「導線は隣接8マスの電子ヘッドがちょうど1つか2つなら電子ヘッドになる」という3つの規則だけを
 * 全マスに同時適用する。導線をループ状に配線すれば、信号が電子ヘッド→テール→導線を
 * 繰り返しながらループを永久に周回し続け、論理回路(ANDゲート等)を組む土台になる。
 */
export function wireworldSteps(): GridFrame[] {
  let grid = buildWireworldGrid();
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "初期状態。導線(wall色)のループに電子ヘッド(frontier色)・テール(visited色)の対を1つ配置",
    },
  ];

  for (let gen = 1; gen <= WIREWORLD_GENERATIONS; gen++) {
    const next: GridCellState[][] = grid.map((row) => [...row]);
    for (let r = 0; r < WIREWORLD_ROWS; r++) {
      for (let c = 0; c < WIREWORLD_COLS; c++) {
        const state = grid[r][c];
        if (state === "idle") {
          next[r][c] = "idle";
        } else if (state === "frontier") {
          next[r][c] = "visited";
        } else if (state === "visited") {
          next[r][c] = "wall";
        } else if (state === "wall") {
          const headNeighbors = wireworldCountHeadNeighbors(grid, r, c);
          next[r][c] = headNeighbors === 1 || headNeighbors === 2 ? "frontier" : "wall";
        }
      }
    }
    grid = next;
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${gen}: ヘッド→テール→導線の遷移と、隣接ヘッド数1〜2の導線からの新規発火を同時適用`,
    });
  }

  frames.push({ cellStates: cloneGrid(grid), description: `計算完了(${WIREWORLD_GENERATIONS}世代経過、信号はループを周回し続ける)` });
  return frames;
}

/** 固定シードの線形合同法による疑似乱数生成器(0〜1未満)。再現性のため乱数は決定的にする。 */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const ELEMENTARY_CA_ROWS = 30;
export const ELEMENTARY_CA_COLS = 61;
export const ELEMENTARY_CA_RULE = 30;

/** ルール番号(0〜255)を8通りの近傍パターン(パターン値0=000〜7=111)ごとの次状態(true=1)へ展開する。 */
function elementaryCaRuleBits(rule: number): boolean[] {
  return Array.from({ length: 8 }, (_, i) => ((rule >> i) & 1) === 1);
}

function elementaryCaAliveAt(row: GridCellState[], c: number): 0 | 1 {
  if (c < 0 || c >= row.length) return 0;
  return row[c] === "visited" ? 1 : 0;
}

/**
 * 初等セルオートマトン(Rule 30)のステップ列を生成する。content/algorithms/elementary-cellular-automaton.mdの
 * elementary_ca()と同じ規則を、1次元のセル列を1世代ごとに1行ずつ下に積み重ねて2次元グリッドとして
 * 表示することで、時間発展がそのまま模様として見えるようにする。各セルの次状態は「自分自身と左右の
 * 隣接セル」というたった3セル(2³=8パターン)の現在状態だけで決まり、ルール番号を2進展開した8ビットが
 * その対応表そのものになる(Rule 30は00011110)。完全に決定論的な規則にもかかわらず、
 * 生成される模様は統計的検定をパスするほど「ランダムに見える」ことで知られる。
 */
export function elementaryCellularAutomatonSteps(): GridFrame[] {
  const grid: GridCellState[][] = Array.from({ length: ELEMENTARY_CA_ROWS }, () =>
    Array<GridCellState>(ELEMENTARY_CA_COLS).fill("idle"),
  );
  const mid = Math.floor(ELEMENTARY_CA_COLS / 2);
  grid[0][mid] = "visited";
  const bits = elementaryCaRuleBits(ELEMENTARY_CA_RULE);

  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: `初等セルオートマトン(Rule ${ELEMENTARY_CA_RULE})を開始。1行目は中央のセルのみ生きている(1)状態`,
    },
  ];

  for (let r = 1; r < ELEMENTARY_CA_ROWS; r++) {
    const prev = grid[r - 1];
    for (let c = 0; c < ELEMENTARY_CA_COLS; c++) {
      const left = elementaryCaAliveAt(prev, c - 1);
      const center = elementaryCaAliveAt(prev, c);
      const right = elementaryCaAliveAt(prev, c + 1);
      const pattern = left * 4 + center * 2 + right;
      grid[r][c] = bits[pattern] ? "visited" : "idle";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `${r + 1}行目: 各セルは真上とその左右計3セルの状態(8パターン)をRule ${ELEMENTARY_CA_RULE}の変換表(00011110)に当てはめて計算`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: `計算完了(${ELEMENTARY_CA_ROWS}世代)。局所規則の反復だけで、一見ランダムだが実は完全に決定的な三角形フラクタル模様が生まれた`,
  });

  return frames;
}

export const BRIANS_BRAIN_ROWS = 14;
export const BRIANS_BRAIN_COLS = 18;
export const BRIANS_BRAIN_GENERATIONS = 14;

/** 初期状態: 発火中(firing)セルを数か所に配置した固定パターン。 */
const BRIANS_BRAIN_SEED: [number, number][] = [
  [5, 8],
  [5, 9],
  [6, 8],
  [6, 9],
  [8, 3],
  [9, 3],
  [10, 3],
  [3, 13],
  [4, 14],
  [5, 13],
];

function buildBriansBrainGrid(): GridCellState[][] {
  const grid: GridCellState[][] = Array.from({ length: BRIANS_BRAIN_ROWS }, () =>
    Array<GridCellState>(BRIANS_BRAIN_COLS).fill("idle"),
  );
  BRIANS_BRAIN_SEED.forEach(([r, c]) => {
    grid[r][c] = "visited";
  });
  return grid;
}

function briansBrainCountFiringNeighbors(grid: GridCellState[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < BRIANS_BRAIN_ROWS && nc >= 0 && nc < BRIANS_BRAIN_COLS && grid[nr][nc] === "visited") {
        count++;
      }
    }
  }
  return count;
}

/**
 * ブライアンの脳(Brian's Brain)のステップ列を生成する。ライフゲームを3状態(off/firing/refractory)に
 * 拡張したセルオートマトンで、conwaysGameOfLifeSteps()と同じ「全マス同時適用」の枠組みをそのまま使う。
 * off(休止)=idle、firing(発火中)=visited、refractory(不応期、発火直後で1世代だけ休む)=frontierに転用する。
 * 規則は次の3つだけ: 「firingのセルは次に必ずrefractoryになる」「refractoryのセルは次に必ずoffに戻る」
 * 「offのセルは、8近傍のfiring数がちょうど2のときだけ次にfiringになる」。ライフゲームと違い発火セル自体は
 * 生存し続けられない(必ず1世代で消える)ため、パターンは静止状態に落ち着かず常に移動・拡散し続ける。
 */
export function briansBrainCellularAutomatonSteps(): GridFrame[] {
  let grid = buildBriansBrainGrid();
  const frames: GridFrame[] = [
    { cellStates: cloneGrid(grid), description: "初期状態。数か所に発火中(firing)セルを配置" },
  ];

  for (let gen = 1; gen <= BRIANS_BRAIN_GENERATIONS; gen++) {
    const next: GridCellState[][] = Array.from({ length: BRIANS_BRAIN_ROWS }, () =>
      Array<GridCellState>(BRIANS_BRAIN_COLS).fill("idle"),
    );
    for (let r = 0; r < BRIANS_BRAIN_ROWS; r++) {
      for (let c = 0; c < BRIANS_BRAIN_COLS; c++) {
        const state = grid[r][c];
        if (state === "visited") {
          next[r][c] = "frontier";
        } else if (state === "frontier") {
          next[r][c] = "idle";
        } else {
          const firingNeighbors = briansBrainCountFiringNeighbors(grid, r, c);
          next[r][c] = firingNeighbors === 2 ? "visited" : "idle";
        }
      }
    }
    grid = next;
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${gen}: 発火中→不応期→休止の遷移と、休止セルのうち発火中隣接がちょうど2つのものだけ新規発火、を全マスへ同時適用`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: `計算完了(${BRIANS_BRAIN_GENERATIONS}世代経過)。ライフゲームと違い、発火セルは静止せず常にパターンが移動し続ける`,
  });
  return frames;
}

export const FOREST_FIRE_ROWS = 16;
export const FOREST_FIRE_COLS = 20;
export const FOREST_FIRE_GENERATIONS = 18;
const FOREST_FIRE_P_SPREAD = 0.9;
const FOREST_FIRE_P_LIGHTNING = 0.01;
const FOREST_FIRE_P_GROWTH = 0.03;

function buildForestFireGrid(): GridCellState[][] {
  const grid: GridCellState[][] = Array.from({ length: FOREST_FIRE_ROWS }, () =>
    Array<GridCellState>(FOREST_FIRE_COLS).fill("path"),
  );
  const clearings: [number, number][] = [
    [3, 4],
    [3, 5],
    [4, 5],
    [11, 14],
    [12, 14],
    [12, 15],
  ];
  clearings.forEach(([r, c]) => {
    grid[r][c] = "idle";
  });
  grid[8][10] = "difficult";
  return grid;
}

function forestFireBurningNeighborCount(grid: GridCellState[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < FOREST_FIRE_ROWS && nc >= 0 && nc < FOREST_FIRE_COLS && grid[nr][nc] === "difficult") {
        count++;
      }
    }
  }
  return count;
}

/**
 * 森林火災モデル(Drossel-Schwabl forest-fire model)のステップ列を生成する。木(path=緑)・
 * 燃えている木(difficult=赤)・空き地(idle)の3状態が、確率的な規則で遷移する:
 * 「燃えている木は次に必ず空き地になる」「隣接8マスに燃えている木がある木は確率P_SPREADで延焼する」
 * 「隣接に火がなくても木は確率P_LIGHTNINGで自然発火(落雷)する」「空き地は確率P_GROWTHで新たに木が育つ」。
 * 乱数は再現性のため固定シードの疑似乱数(seededRandom)を使う。延焼が止まった後も低確率の落雷と成長が
 * 続くことで、外部から手を加えなくても火事のサイクルを自己組織的に繰り返し続ける
 * (十分長く走らせると火事のサイズがべき乗則に従う「自己組織臨界現象」の代表例として知られる)。
 */
export function forestFireModelSteps(): GridFrame[] {
  let grid = buildForestFireGrid();
  const rng = seededRandom(20240601);
  const frames: GridFrame[] = [
    { cellStates: cloneGrid(grid), description: "森林火災モデルを開始。中央付近に火種(燃えている木)を1本配置" },
  ];

  for (let gen = 1; gen <= FOREST_FIRE_GENERATIONS; gen++) {
    const next: GridCellState[][] = grid.map((row) => [...row]);
    for (let r = 0; r < FOREST_FIRE_ROWS; r++) {
      for (let c = 0; c < FOREST_FIRE_COLS; c++) {
        const state = grid[r][c];
        if (state === "difficult") {
          next[r][c] = "idle";
        } else if (state === "path") {
          const burningNeighbors = forestFireBurningNeighborCount(grid, r, c);
          if (burningNeighbors > 0) {
            next[r][c] = rng() < FOREST_FIRE_P_SPREAD ? "difficult" : "path";
          } else {
            next[r][c] = rng() < FOREST_FIRE_P_LIGHTNING ? "difficult" : "path";
          }
        } else {
          next[r][c] = rng() < FOREST_FIRE_P_GROWTH ? "path" : "idle";
        }
      }
    }
    grid = next;
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${gen}: 燃えている木→空き地、隣接に火がある木は確率${FOREST_FIRE_P_SPREAD}で延焼、それ以外の木も確率${FOREST_FIRE_P_LIGHTNING}で自然発火、空き地は確率${FOREST_FIRE_P_GROWTH}で新たな木が成長`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: `計算完了(${FOREST_FIRE_GENERATIONS}世代経過)。延焼・消火・成長のサイクルが繰り返され続ける自己組織的なシステムになった`,
  });
  return frames;
}

export const ROCK_PAPER_SCISSORS_CA_ROWS = 20;
export const ROCK_PAPER_SCISSORS_CA_COLS = 24;
export const ROCK_PAPER_SCISSORS_CA_GENERATIONS = 20;
const ROCK_PAPER_SCISSORS_CA_THRESHOLD = 3;

type RpsHand = "rock" | "paper" | "scissors";
const RPS_STATE_OF: Record<RpsHand, GridCellState> = {
  rock: "frontier",
  paper: "visited",
  scissors: "difficult",
};
/** キー(自分の手)に対して、その手に「勝つ手」を値として持つ表。 */
const RPS_BEATEN_BY: Record<RpsHand, RpsHand> = {
  rock: "paper",
  paper: "scissors",
  scissors: "rock",
};
const RPS_HAND_OF: Record<string, RpsHand> = { frontier: "rock", visited: "paper", difficult: "scissors" };

/** 固定シードの疑似乱数でグー・チョキ・パーをほぼ均等にばらまいた初期盤面。 */
function buildRockPaperScissorsGrid(): GridCellState[][] {
  const rng = seededRandom(908070);
  const hands: RpsHand[] = ["rock", "paper", "scissors"];
  return Array.from({ length: ROCK_PAPER_SCISSORS_CA_ROWS }, () =>
    Array.from({ length: ROCK_PAPER_SCISSORS_CA_COLS }, () => RPS_STATE_OF[hands[Math.floor(rng() * 3)]]),
  );
}

function rpsCountBeatingNeighbors(grid: GridCellState[][], r: number, c: number, beatingHand: RpsHand): number {
  let count = 0;
  const beatingState = RPS_STATE_OF[beatingHand];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < ROCK_PAPER_SCISSORS_CA_ROWS &&
        nc >= 0 &&
        nc < ROCK_PAPER_SCISSORS_CA_COLS &&
        grid[nr][nc] === beatingState
      ) {
        count++;
      }
    }
  }
  return count;
}

/**
 * じゃんけんセルオートマトン(循環優性モデル、Rock-Paper-Scissors CA)のステップ列を生成する。
 * 各セルはグー/チョキ/パーのいずれかの手を持ち(frontier=グー、visited=パー、difficult=チョキに転用)、
 * 8近傍のうち「自分に勝つ手」を持つセルがROCK_PAPER_SCISSORS_CA_THRESHOLD個以上あれば、
 * そのセルは次の世代でその「勝つ手」に置き換わる(侵食される)。グーはパーに負け、パーはチョキに負け、
 * チョキはグーに負けるという循環的な優劣関係(どの手も絶対的な強者ではない)により、特定の手が
 * 盤面を制圧することはなく、三すくみのまま渦を巻くように勢力が入れ替わり続ける、非平衡系の
 * 自己組織化の代表例。初期配置は固定シードの疑似乱数で3種類をほぼ均等にばらまく
 * (完全に規則的な初期配置だと対称性が壊れず渦が発生しにくいため)。
 */
export function rockPaperScissorsCellularAutomatonSteps(): GridFrame[] {
  let grid = buildRockPaperScissorsGrid();
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "グー(水色)・チョキ(赤)・パー(黄)を固定シードの疑似乱数でほぼ均等にばらまいて開始",
    },
  ];

  for (let gen = 1; gen <= ROCK_PAPER_SCISSORS_CA_GENERATIONS; gen++) {
    const next: GridCellState[][] = grid.map((row) => [...row]);
    for (let r = 0; r < ROCK_PAPER_SCISSORS_CA_ROWS; r++) {
      for (let c = 0; c < ROCK_PAPER_SCISSORS_CA_COLS; c++) {
        const hand = RPS_HAND_OF[grid[r][c]];
        const beatingHand = RPS_BEATEN_BY[hand];
        const beatingCount = rpsCountBeatingNeighbors(grid, r, c, beatingHand);
        if (beatingCount >= ROCK_PAPER_SCISSORS_CA_THRESHOLD) {
          next[r][c] = RPS_STATE_OF[beatingHand];
        }
      }
    }
    grid = next;
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${gen}: 8近傍に自分に勝つ手が${ROCK_PAPER_SCISSORS_CA_THRESHOLD}個以上あるセルは、その勝つ手に置き換わる(侵食)`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: `計算完了(${ROCK_PAPER_SCISSORS_CA_GENERATIONS}世代経過)。三すくみの循環優位性により、どの手も盤面を制圧できず勢力が渦を巻きながら入れ替わり続ける`,
  });
  return frames;
}

export const SANDPILE_SIZE = 17;
export const SANDPILE_INITIAL_GRAINS = 130;
const SANDPILE_TOPPLE_THRESHOLD = 4;

/** 閾値以上のセルをすべて同時に崩す1スイープ。境界の外に出た分は消失する(開放境界)。 */
function sandpileSweep(counts: number[][]): { next: number[][]; toppled: number } {
  const size = counts.length;
  const next = counts.map((row) => [...row]);
  let toppled = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (counts[r][c] < SANDPILE_TOPPLE_THRESHOLD) continue;
      toppled++;
      next[r][c] -= SANDPILE_TOPPLE_THRESHOLD;
      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) next[nr][nc] += 1;
      }
    }
  }
  return { next, toppled };
}

function sandpileStateOf(count: number): GridCellState {
  if (count <= 0) return "idle";
  if (count === 1) return "frontier";
  if (count === 2) return "visited";
  if (count === 3) return "difficult";
  return "path";
}

function sandpileGridFrom(counts: number[][]): GridCellState[][] {
  return counts.map((row) => row.map(sandpileStateOf));
}

/**
 * 砂山モデル(Bak-Tang-Wiesenfeldモデル、Abelian sandpile model)のステップ列を生成する。
 * 各セルは積もった砂粒の数を持ち(0=idle,1=frontier,2=visited,3=difficult,4以上=path「崩れる寸前」に転用)、
 * 4粒以上積もったセルは同時に4粒を失い、上下左右の4近傍へ1粒ずつ配る(格子の外に出た分は消失する)。
 * 中心に大量の砂を一度に落とし、閾値を超えたセルが同時に崩れる「並列スイープ」を安定するまで繰り返す。
 * 1回の崩れが隣接セルを新たに閾値超えにし、それがまた崩れて…という連鎖(カスケード、雪崩)が起こる点が
 * 本質で、初期投入量に対して雪崩のサイズがべき乗則に従う(自己組織臨界性)ことで知られる。
 */
export function sandpileModelSteps(): GridFrame[] {
  const size = SANDPILE_SIZE;
  const counts: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const center = Math.floor(size / 2);
  counts[center][center] = SANDPILE_INITIAL_GRAINS;

  const frames: GridFrame[] = [
    {
      cellStates: sandpileGridFrom(counts),
      description: `中心セルに${SANDPILE_INITIAL_GRAINS}粒の砂を一度に落とす(閾値${SANDPILE_TOPPLE_THRESHOLD}粒を大きく超えている)`,
    },
  ];

  let current = counts;
  let sweep = 0;
  let stable = false;
  const maxSweeps = 500;
  while (sweep < maxSweeps) {
    const { next, toppled } = sandpileSweep(current);
    if (toppled === 0) {
      stable = true;
      break;
    }
    sweep++;
    current = next;
    frames.push({
      cellStates: sandpileGridFrom(current),
      description: `スイープ${sweep}: 閾値以上の${toppled}セルが同時に崩れ、それぞれ隣接4セルへ1粒ずつ配る(盤外に出た分は消失)`,
    });
  }

  frames.push({
    cellStates: sandpileGridFrom(current),
    description: stable
      ? `計算完了(${sweep}回のスイープで安定)。どのセルも3粒以下に落ち着いたが、崩れの連鎖(カスケード)は初期投入量からは予測しにくい大きさになった`
      : `計算未完了(${maxSweeps}回のスイープでも一部のセルがまだ崩れ続けている)`,
  });

  return frames;
}

export const TRAFFIC_CA_ROWS = 30;
export const TRAFFIC_CA_COLS = 40;
const TRAFFIC_CA_VMAX = 3;
const TRAFFIC_CA_P_BRAKE = 0.3;
const TRAFFIC_CA_SPACING = 3;

/** 環状道路上で、各車の位置から見た「次の車までの空きセル数」を位置→gapの対応表として計算する。 */
function trafficCaGaps(positions: number[], roadLength: number): Map<number, number> {
  const sorted = [...positions].sort((a, b) => a - b);
  const n = sorted.length;
  const gaps = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % n];
    const gap = ((next - cur + roadLength) % roadLength) - 1;
    gaps.set(cur, gap);
  }
  return gaps;
}

function trafficCaStateForVelocity(v: number): GridCellState {
  if (v <= 0) return "difficult";
  if (v === 1) return "frontier";
  if (v === 2) return "visited";
  return "path";
}

/**
 * 交通流のセルオートマトン(Nagel-Schreckenbergモデル)のステップ列を生成する。1車線・環状(周期境界)の
 * 道路上で、各車が持つ整数速度v(0〜vmax)に対して次の4規則を全車に同時適用する:
 * (1)加速: v<vmaxならv+1。(2)減速(車間距離による安全制動): 前の車までの空きセル数(gap)より速いと
 * 衝突するため、v>gapならv=gapまで落とす。(3)ランダムブレーキ: 確率P_BRAKEでv>0ならさらにv-1
 * (現実の運転者の「不必要なブレーキ」を模したノイズ)。(4)移動: 各車を新しい速度vだけ前進させる。
 * 全車が最初は停止(v=0)から出発するにもかかわらず、ランダムブレーキという小さなノイズだけから
 * 「幽霊渋滞(phantom traffic jam)」——事故も車線変更もないのに自然発生し後方へ伝播する渋滞の波——が
 * 生まれることが、このモデル最大の見どころ。時間発展を1世代ずつ下へ積み重ねた時空間図として表示し、
 * 車の速度が低いほど赤(渋滞)、高いほど緑(自由走行)に着色する。
 */
export function trafficCellularAutomatonSteps(): GridFrame[] {
  const rng = seededRandom(19700101);
  let positions: number[] = [];
  for (let i = 0; i < TRAFFIC_CA_COLS; i += TRAFFIC_CA_SPACING) positions.push(i);
  let velocities: number[] = positions.map(() => 0);

  const renderRow = (): GridCellState[] => {
    const row = Array<GridCellState>(TRAFFIC_CA_COLS).fill("idle");
    positions.forEach((p, i) => {
      row[p] = trafficCaStateForVelocity(velocities[i]);
    });
    return row;
  };

  const grid: GridCellState[][] = Array.from({ length: TRAFFIC_CA_ROWS }, () =>
    Array<GridCellState>(TRAFFIC_CA_COLS).fill("idle"),
  );
  grid[0] = renderRow();

  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: `環状道路(長さ${TRAFFIC_CA_COLS}マス)に${positions.length}台の車を等間隔・停止状態(v=0)で配置`,
    },
  ];

  for (let t = 1; t < TRAFFIC_CA_ROWS; t++) {
    const gaps = trafficCaGaps(positions, TRAFFIC_CA_COLS);
    const newVelocities = velocities.map((v, i) => {
      let nv = Math.min(v + 1, TRAFFIC_CA_VMAX);
      const gap = gaps.get(positions[i])!;
      nv = Math.min(nv, gap);
      if (nv > 0 && rng() < TRAFFIC_CA_P_BRAKE) nv -= 1;
      return nv;
    });
    const newPositions = positions.map((p, i) => (p + newVelocities[i]) % TRAFFIC_CA_COLS);
    positions = newPositions;
    velocities = newVelocities;
    grid[t] = renderRow();
    const avgV = (velocities.reduce((s, v) => s + v, 0) / velocities.length).toFixed(2);
    frames.push({
      cellStates: cloneGrid(grid),
      description: `世代${t}: 加速→車間による減速→確率${TRAFFIC_CA_P_BRAKE}のランダムブレーキ→前進、を全車に同時適用(平均速度${avgV})`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。障害物も車線変更もないのに、ランダムブレーキだけから後方へ伝播する渋滞の波(幽霊渋滞)が自己組織的に発生した",
  });

  return frames;
}

/**
 * フローフィールド経路探索のステップ列を生成する。content/algorithms/flow-field-pathfinding.mdの
 * build_integration_field()と同じ要領で、ゴールを起点に逆方向BFSでコストを伝播させる
 * (通常のBFS/ダイクストラ法とは探索の向きが逆になる点が本質)。全到達可能セルの統合コストが
 * 確定した時点で「全セルがゴールへの方向を持つ」ことを、それらを一括でpath色に塗ることで表す
 * (実際のフローフィールドは方向ベクトルだが、このグリッド表現では方向までは描画できないため、
 * 「経路が確定した」という到達可能性の側面を可視化する)。
 */
export function flowFieldPathfindingSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "ゴールを起点に、逆方向BFSで統合コストフィールド(Integration Field)の構築を開始する",
    },
  ];
  const visited = new Set<string>([key(GOAL[0], GOAL[1])]);
  const queue: [number, number][] = [[GOAL[0], GOAL[1]]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") {
      grid[r][c] = "visited";
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `(${r + 1}, ${c + 1})の統合コストを確定し、隣接セルへコストを伝播する`,
    });

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      visited.add(key(nr, nc));
      queue.push([nr, nc]);
      if (grid[nr][nc] !== "start" && grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
    }
    if (neighbors.some(([nr, nc]) => inBounds(nr, nc) && !isWall(nr, nc))) {
      frames.push({
        cellStates: cloneGrid(grid),
        description: `新たに到達したセルをキューに追加(キュー内 ${queue.length}件)`,
      });
    }
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "統合コストフィールド完成。次に各セルで最もコストの低い隣接セルを選び、方向ベクトル場(フローフィールド)を構築する",
  });

  for (const k of visited) {
    const [r, c] = k.split(",").map(Number);
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") grid[r][c] = "path";
  }
  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。到達可能な全セルがゴールへの方向を持つフローフィールドとなった。以降どのユニットもO(1)の参照だけで移動できる",
  });

  return frames;
}

export const LOS_OBSERVER: [number, number] = [0, 0];
export const LOS_TARGETS: [number, number][] = [
  [0, 15],
  [9, 8],
  [4, 13],
];

/**
 * レイキャストによる視線判定(DDA法)のステップ列を生成する。
 * content/algorithms/line-of-sight-raycasting.mdのhas_line_of_sight()と全く同じ判定ロジックを、
 * 観測者から3方向のターゲットへ実際にレイを飛ばして1マスずつ辿る過程として可視化する。
 * 途中で壁に衝突すれば「遮られている」、衝突せず到達すれば「見える」と判定する(始点・終点自身は
 * 障害物判定に含めない、という元記事のルールをそのまま踏襲する)。
 */
export function lineOfSightRaycastingSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const [or_, oc] = LOS_OBSERVER;
  grid[or_][oc] = "frontier";
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: `観測者(${or_ + 1}, ${oc + 1})から複数のターゲットへ視線判定(DDA法)を行う`,
    },
  ];

  for (const [tr, tc] of LOS_TARGETS) {
    const dr = tr - or_;
    const dc = tc - oc;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const rInc = dr / steps;
    const cInc = dc / steps;
    let r = or_;
    let c = oc;
    let blocked = false;
    const rayCells: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const cr = Math.round(r);
      const cc = Math.round(c);
      const isEndpoint = (cr === or_ && cc === oc) || (cr === tr && cc === tc);
      if (!isEndpoint) {
        rayCells.push([cr, cc]);
        if (isWall(cr, cc)) {
          blocked = true;
          frames.push({
            cellStates: cloneGrid(grid),
            description: `(${cr + 1}, ${cc + 1})で障害物に衝突。ターゲット(${tr + 1}, ${tc + 1})への視線は遮られている(見えない)`,
          });
          break;
        }
        grid[cr][cc] = "frontier";
        frames.push({
          cellStates: cloneGrid(grid),
          description: `(${cr + 1}, ${cc + 1})を走査。障害物なし`,
        });
      }
      r += rInc;
      c += cInc;
    }

    if (!blocked) {
      for (const [cr, cc] of rayCells) grid[cr][cc] = "path";
      frames.push({
        cellStates: cloneGrid(grid),
        description: `ターゲット(${tr + 1}, ${tc + 1})まで障害物なし。視線が通っている(発見)`,
      });
    } else {
      for (const [cr, cc] of rayCells) {
        if (grid[cr][cc] === "frontier") grid[cr][cc] = "visited";
      }
      frames.push({
        cellStates: cloneGrid(grid),
        description: `ターゲット(${tr + 1}, ${tc + 1})への視線判定が終了(遮られている)`,
      });
    }
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。観測者から3方向への視線判定を行い、それぞれの障害物の有無を確認した",
  });
  return frames;
}

function bfsDistanceField(from: [number, number]): number[][] {
  const dist: number[][] = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(-1));
  dist[from[0]][from[1]] = 0;
  const queue: [number, number][] = [from];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return dist;
}

export const CROWD_AGENT_STARTS: [number, number][] = [
  [0, 2],
  [4, 0],
  [8, 1],
];

/**
 * セルオートマトン群衆モデルのステップ列を生成する。content/algorithms/cellular-automaton-crowd.mdの
 * step_crowd()と同じ「フロアフィールド(ゴールまでの距離)が下がる隣接セルへ移動する」規則を、
 * 3人の歩行者に同時適用する。同じセルを2人以上が希望した場合はエージェント番号の小さい方を
 * 優先する決定的なルールで競合解決する(元記事はランダム選択だが、可視化は再現性のため決定的にする)。
 */
export function cellularAutomatonCrowdSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const floorField = bfsDistanceField([GOAL[0], GOAL[1]]);
  const positions: [number, number][] = CROWD_AGENT_STARTS.map((p) => [...p] as [number, number]);
  const frames: GridFrame[] = [];

  const render = (description: string) => {
    const snapshot = cloneGrid(grid);
    positions.forEach(([r, c], i) => {
      if (snapshot[r][c] !== "goal") snapshot[r][c] = i === 0 ? "frontier" : "visited";
    });
    frames.push({ cellStates: snapshot, description });
  };

  render("3人の歩行者(P1〜P3)がフロアフィールド(ゴールまでの距離)に従って移動を開始する");

  for (let step = 1; step <= 12; step++) {
    if (positions.every(([r, c]) => r === GOAL[0] && c === GOAL[1])) break;
    const proposals = new Map<string, number[]>();

    positions.forEach(([r, c], i) => {
      if (r === GOAL[0] && c === GOAL[1]) return;
      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      let best: [number, number] | null = null;
      let bestDist = floorField[r][c];
      for (const [nr, nc] of neighbors) {
        if (!inBounds(nr, nc) || isWall(nr, nc) || floorField[nr][nc] === -1) continue;
        if (floorField[nr][nc] < bestDist) {
          bestDist = floorField[nr][nc];
          best = [nr, nc];
        }
      }
      const target = best ?? [r, c];
      const k = key(target[0], target[1]);
      const list = proposals.get(k) ?? [];
      list.push(i);
      proposals.set(k, list);
    });

    let moved = false;
    for (const [k, agents] of proposals) {
      const [tr, tc] = k.split(",").map(Number);
      if (tr === positions[agents[0]][0] && tc === positions[agents[0]][1] && agents.length === 1) continue;
      const winner = Math.min(...agents);
      if (positions[winner][0] !== tr || positions[winner][1] !== tc) {
        positions[winner] = [tr, tc];
        moved = true;
      }
    }
    render(
      moved
        ? `ステップ${step}: 各歩行者が空きセルへの移動を提案し、競合するセルは番号の小さいエージェントが優先された`
        : `ステップ${step}: 全員が現在のセルに留まった(渋滞)`,
    );
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。単純な「空きセルへの移動確率」規則の繰り返しだけで、群衆の流れが再現された",
  });
  return frames;
}

export const INFLUENCE_ALLY_SOURCE: [number, number] = [1, 1];
export const INFLUENCE_ENEMY_SOURCE: [number, number] = [8, 14];

/**
 * 影響マップのステップ列を生成する。content/algorithms/influence-map.mdのbuild_influence_map()と
 * 同じ式(influence = Σ strength / (1 + distance))で、味方拠点(+10)・敵拠点(-10)からの
 * 影響力を全セルに合算し、結果を3段階(優勢/拮抗/劣勢)に離散化して塗り分ける。
 * BFSのような探索過程を持たない直接計算のアルゴリズムであるため、フレーム数は少ない。
 */
export function influenceMapSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const [ar, ac] = INFLUENCE_ALLY_SOURCE;
  const [er, ec] = INFLUENCE_ENEMY_SOURCE;
  grid[ar][ac] = "goal";
  grid[er][ec] = "difficult";

  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: `味方拠点(${ar + 1}, ${ac + 1}、強さ+10)と敵拠点(${er + 1}, ${ec + 1}、強さ-10)を配置する`,
    },
  ];

  const distance = (r: number, c: number, sr: number, sc: number) => Math.hypot(r - sr, c - sc);

  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (isWall(r, c) || (r === ar && c === ac) || (r === er && c === ec)) continue;
      const value = 10 / (1 + distance(r, c, ar, ac)) - 10 / (1 + distance(r, c, er, ec));
      if (value > 0.6) grid[r][c] = "path";
      else if (value < -0.6) grid[r][c] = "difficult";
      else grid[r][c] = "frontier";
    }
  }
  frames.push({
    cellStates: cloneGrid(grid),
    description:
      "各セルについて味方・敵からの影響を距離減衰させながら合算した勢力マップが完成(緑=味方優勢、水色=拮抗/国境線候補、赤=敵優勢)",
  });

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。この数値マップを参照するだけで「どこを守るべきか」「どこが手薄か」を判断できる",
  });
  return frames;
}

/**
 * ナビゲーションメッシュ生成(2D簡略版)のステップ列を生成する。
 * content/algorithms/navmesh-generation.mdのextract_walkable_rectangles()と全く同じ貪欲アルゴリズムで、
 * 歩行可能セルを走査順に最大矩形へ併合していく。1つの矩形=1つの凸多角形(ナビゲーションメッシュの1面)
 * に相当する。
 */
export function navmeshGenerationSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const walkable: boolean[][] = Array.from({ length: MAZE_ROWS }, (_, r) =>
    Array.from({ length: MAZE_COLS }, (_, c) => !isWall(r, c)),
  );
  const used: boolean[][] = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(false));
  const frames: GridFrame[] = [
    { cellStates: cloneGrid(grid), description: "衝突判定メッシュから歩行可能セルを抽出済み。少数の矩形(凸多角形)へ貪欲に併合していく" },
  ];

  for (let y = 0; y < MAZE_ROWS; y++) {
    for (let x = 0; x < MAZE_COLS; x++) {
      if (!walkable[y][x] || used[y][x]) continue;

      let width = 0;
      while (x + width < MAZE_COLS && walkable[y][x + width] && !used[y][x + width]) width++;
      let height = 1;
      while (
        y + height < MAZE_ROWS &&
        Array.from({ length: width }, (_, w) => w).every((w) => walkable[y + height][x + w] && !used[y + height][x + w])
      ) {
        height++;
      }

      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          used[y + dy][x + dx] = true;
          if (grid[y + dy][x + dx] !== "start" && grid[y + dy][x + dx] !== "goal") {
            grid[y + dy][x + dx] = "path";
          }
        }
      }
      frames.push({
        cellStates: cloneGrid(grid),
        description: `(${y + 1}, ${x + 1})を起点に幅${width}×高さ${height}の矩形領域を1つの凸多角形として確定`,
      });
    }
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。グリッド全体が少数の凸領域(ナビゲーションメッシュ)へ縮約された",
  });
  return frames;
}

/**
 * 引力(ゴール方向)+斥力(壁・追加の反発点までの距離)を合成したポテンシャル場の勾配に
 * 貪欲に従って格子上を1歩ずつ移動する共通ロジック。content/algorithms/potential-field-navigation.md
 * (ゲームAI向け)とcontent/algorithms/potential-field-path-planning.md(ロボティクス向け)は
 * 同じ数式(引力+斥力ポテンシャルの負の勾配)を扱う姉妹記事のため、格子上の離散化ロジックを共有し、
 * 開始地点・追加の反発点(社会的な力モデルの「他の歩行者」等)・説明文だけを差し替える。
 */
function gradientDescentWalkSteps(
  start: [number, number],
  extraRepulsionPoints: [number, number][],
  intro: string,
  stepLabel: string,
  outroSuccess: string,
  outroStuck: string,
): GridFrame[] {
  const grid = buildInitialGrid();
  const goalDist = bfsDistanceField([GOAL[0], GOAL[1]]);

  const nearestWallDistance = (r: number, c: number): number => {
    let best = Infinity;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && isWall(nr, nc)) {
          best = Math.min(best, Math.hypot(dr, dc));
        }
      }
    }
    for (const [pr, pc] of extraRepulsionPoints) {
      best = Math.min(best, Math.hypot(r - pr, c - pc));
    }
    return best;
  };
  const potential = (r: number, c: number): number => {
    const attract = goalDist[r][c] === -1 ? Infinity : goalDist[r][c];
    const wallDist = nearestWallDistance(r, c);
    const repel = wallDist <= 1.5 ? (1.5 - wallDist) * 6 : 0;
    return attract + repel;
  };

  let [r, c] = start;
  const visitedCells = new Set<string>([key(r, c)]);
  const frames: GridFrame[] = [{ cellStates: cloneGrid(grid), description: intro }];

  let stuck = false;
  for (let step = 1; step <= 40; step++) {
    if (r === GOAL[0] && c === GOAL[1]) break;
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    let best: [number, number] | null = null;
    let bestP = potential(r, c);
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc)) continue;
      const p = potential(nr, nc);
      if (p < bestP - 1e-9) {
        bestP = p;
        best = [nr, nc];
      }
    }
    if (!best) {
      stuck = true;
      frames.push({
        cellStates: cloneGrid(grid),
        description: `ステップ${step}: (${r + 1}, ${c + 1})で全ての隣接セルのポテンシャルが現在地以上になった(局所的最小値に陥った)`,
      });
      break;
    }
    [r, c] = best;
    const k = key(r, c);
    if (visitedCells.has(k)) {
      stuck = true;
      frames.push({
        cellStates: cloneGrid(grid),
        description: `ステップ${step}: 既に訪れたセル(${r + 1}, ${c + 1})に戻ってきた(振動、局所的最小値の兆候)`,
      });
      break;
    }
    visitedCells.add(k);
    if (grid[r][c] !== "goal") grid[r][c] = "visited";
    frames.push({
      cellStates: cloneGrid(grid),
      description: `ステップ${step}: ${stepLabel}、(${r + 1}, ${c + 1})へ1歩移動`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: stuck ? outroStuck : outroSuccess,
  });
  return frames;
}

/**
 * ポテンシャルフィールド法によるナビゲーションのステップ列を生成する。
 * content/algorithms/potential-field-navigation.mdのpotential_field_step()の発想を格子上で離散化し、
 * 「ゴールまでの距離(引力)」と「最も近い壁までの距離の逆数(斥力)」の和が最小になる隣接セルへ
 * 貪欲に移動する。元記事が弱点として挙げる局所的最小値(周囲より自分の方が低ポテンシャルになり
 * 動けなくなる状態)に実際に陥った場合は、そのままその結果を報告する。
 */
export function potentialFieldNavigationSteps(): GridFrame[] {
  return gradientDescentWalkSteps(
    START,
    [],
    "引力(ゴール方向)と斥力(壁からの距離)を合成したポテンシャル場に従って移動を開始する",
    "負の勾配方向(引力+斥力の合成)",
    "計算完了。経路探索なしに、各ステップの局所的な勾配だけを見て目的地へ到達した",
    "計算完了。局所的最小値に陥り、経路の事前計画なしではこれ以上目的地へ近づけなかった(RVOやA*との併用が実務では有効)",
  );
}

/**
 * ポテンシャル法(人工ポテンシャル場法)によるロボット経路計画のステップ列を生成する。
 * content/algorithms/potential-field-path-planning.mdと数式は同一(引力+斥力ポテンシャルの負の勾配)
 * だが、キャラクターAI向けの姉妹記事とは異なる開始地点(壁の凹みに近い位置)から出発させることで、
 * 記事が「最大の弱点」として挙げる局所的最小値問題そのものを直接体験できるようにする。
 */
export function potentialFieldPathPlanningSteps(): GridFrame[] {
  return gradientDescentWalkSteps(
    [3, 3],
    [],
    "ゴールを引力源、壁を斥力源とする仮想的なポテンシャル場を定義し、ロボットがその勾配を下るように移動を開始する",
    "負の勾配方向へ",
    "計算完了。勾配に従うだけの反応的な制御で、経路の事前計画なしに目的地へ到達した",
    "計算完了。引力と斥力が打ち消し合う局所的な谷にはまり込み、動けなくなった(Dynamic Window Approachが抱える弱点と本質的に同じ現象)",
  );
}

/**
 * ソーシャルフォースモデルのステップ列を生成する。content/algorithms/social-force-model.mdの
 * 「目的地への駆動力+他の歩行者・壁からの斥力の合成」を、gradientDescentWalkSteps()の壁反発に
 * 「他の歩行者」を表す2つの追加反発点を加えることで表現する。ポテンシャルフィールド法(壁のみ)との
 * 違いは、動的な他者(歩行者)も斥力源として扱う点にある。
 */
export function socialForceModelSteps(): GridFrame[] {
  return gradientDescentWalkSteps(
    START,
    [
      [3, 5],
      [6, 9],
    ],
    "目的地への駆動力と、他の歩行者・壁からのパーソナルスペース反発力を合成した「社会的な力」に従って移動を開始する",
    "駆動力+社会的反発力の合成",
    "計算完了。他の歩行者を避けながら、力の合成だけで自然な経路が形成された",
    "計算完了。他の歩行者と壁からの反発力が拮抗し、局所的な谷にはまり込んで動けなくなった",
  );
}

/**
 * 連続体力学による群衆シミュレーションのステップ列を生成する。
 * content/algorithms/continuum-crowd-model.mdの「Eikonal方程式をFast Marching Method(ダイクストラ法に
 * 似たアルゴリズム)で解く」というコスト場構築を、ゴールを起点に密度依存のコスト(WEIGHT_MAPの高コスト
 * 地形を「密集した群衆エリア」に見立てる)で伝播させるダイクストラ法として可視化する。全到達可能セルの
 * コストが確定した時点で、フローフィールド経路探索と同様「全セルが移動方向を持つ」ことを一括で示す。
 */
export function continuumCrowdModelSteps(): GridFrame[] {
  const grid = buildInitialGrid();
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "ゴールを起点に、密度依存のコスト場(Eikonal方程式)をFast Marching Method的に構築する",
    },
  ];
  const dist = new Map<string, number>();
  const visited = new Set<string>();
  const startKey = key(GOAL[0], GOAL[1]);
  dist.set(startKey, 0);
  const queue: [number, number][] = [[GOAL[0], GOAL[1]]];

  while (queue.length > 0) {
    queue.sort((a, b) => (dist.get(key(...a)) ?? Infinity) - (dist.get(key(...b)) ?? Infinity));
    const [r, c] = queue.shift()!;
    const currentKey = key(r, c);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") grid[r][c] = "visited";
    frames.push({
      cellStates: cloneGrid(grid),
      description: `(${r + 1}, ${c + 1})の累積コスト${dist.get(currentKey)}を確定(密度が高い地形ほどコストが高い)`,
    });

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    let pushed = false;
    for (const [nr, nc] of neighbors) {
      if (!inBounds(nr, nc) || isWall(nr, nc) || visited.has(key(nr, nc))) continue;
      const candidateDist = dist.get(currentKey)! + weightOf(nr, nc);
      const neighborKey = key(nr, nc);
      if (candidateDist < (dist.get(neighborKey) ?? Infinity)) {
        dist.set(neighborKey, candidateDist);
        if (grid[nr][nc] !== "start" && grid[nr][nc] !== "goal") grid[nr][nc] = "frontier";
        queue.push([nr, nc]);
        pushed = true;
      }
    }
    if (pushed) {
      frames.push({ cellStates: cloneGrid(grid), description: `隣接セルへコストを伝播(キュー内 ${queue.length}件)` });
    }
  }

  for (const k of visited) {
    const [r, c] = k.split(",").map(Number);
    if (grid[r][c] !== "start" && grid[r][c] !== "goal") grid[r][c] = "path";
  }
  frames.push({
    cellStates: cloneGrid(grid),
    description:
      "計算完了。コスト場が確定し、密度の高い地形を避けた「最もコストの低い目的地への方向」がマップ全体で得られた。エージェント数が増えても1体あたりの追加コストはほぼ一定",
  });

  return frames;
}

// ============================================================
// コンピュータビジョン: 画像処理を小さいピクセルグリッドとして表現する5アルゴリズム
// ============================================================

/** 3×3ソーベルカーネルによる勾配計算(gx, gy, 大きさ, 角度)を行う共通ヘルパー。
 * Cannyエッジ検出・ソーベルフィルタの両方から利用する(単純な畳み込みなのでコードを共有する)。
 * 境界は端の画素を複製(クランプ)して処理する。 */
function computeSobelGradients(
  img: number[][],
  rows: number,
  cols: number,
): { gx: number[][]; gy: number[][]; mag: number[][]; angleDeg: number[][] } {
  const gxKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gyKernel = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];
  const gx: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const gy: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const mag: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const angleDeg: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sx = 0;
      let sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = Math.min(Math.max(y + ky, 0), rows - 1);
          const xx = Math.min(Math.max(x + kx, 0), cols - 1);
          sx += img[yy][xx] * gxKernel[ky + 1][kx + 1];
          sy += img[yy][xx] * gyKernel[ky + 1][kx + 1];
        }
      }
      gx[y][x] = sx;
      gy[y][x] = sy;
      mag[y][x] = Math.hypot(sx, sy);
      const deg = (Math.atan2(sy, sx) * 180) / Math.PI;
      angleDeg[y][x] = ((deg % 180) + 180) % 180;
    }
  }
  return { gx, gy, mag, angleDeg };
}

// ------------------------------------------------------------
// Cannyエッジ検出 (canny-edge-detection)
// ------------------------------------------------------------

export const CANNY_ROWS = 8;
export const CANNY_COLS = 8;

/** 明るい矩形(値8)+右に隣接する中間の明るさの帯(値4、矩形と連結した弱いエッジになる)+
 * 孤立したノイズ画素(値8、周囲が全て背景で連結成分を持たない)を配置した合成画像。 */
const CANNY_IMAGE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 8, 8, 8, 4, 0, 0, 0],
  [0, 8, 8, 8, 4, 0, 0, 0],
  [0, 8, 8, 8, 4, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Cannyエッジ検出のステップ列を生成する。①勾配強度計算(ソーベルフィルタ)→②非最大値抑制→
 * ③ヒステリシス閾値処理、の3段階を順番に可視化する。閾値は画像内の最大勾配強度からの
 * 相対値(highは最大値の50%、lowは20%)として動的に決定し、決め打ちの定数に依存しない。
 * 矩形右に連結した弱い帯は強いエッジへ8近傍で連結しているため昇格し、孤立したノイズ画素の
 * 周囲にできる弱い勾配のリングはどの強いエッジにも連結していないため最終的に棄却される。
 */
export function cannyEdgeDetectionSteps(): GridFrame[] {
  const rows = CANNY_ROWS;
  const cols = CANNY_COLS;
  const initialGrid: GridCellState[][] = CANNY_IMAGE.map((row) => row.map((v) => (v > 0 ? "difficult" : "idle")));
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(initialGrid),
      description: "入力画像(明るい矩形+それに連結した弱い帯+孤立したノイズ画素)からCannyエッジ検出を開始する",
    },
  ];

  const { mag, angleDeg } = computeSobelGradients(CANNY_IMAGE, rows, cols);
  const maxMag = Math.max(0, ...mag.flat());
  const high = maxMag * 0.5;
  const low = maxMag * 0.2;

  const bucketByMag = (v: number): GridCellState => {
    if (v <= 0) return "idle";
    return v < low ? "frontier" : v < high ? "difficult" : "wall";
  };

  const magGrid: GridCellState[][] = mag.map((row) => row.map(bucketByMag));
  frames.push({
    cellStates: cloneGrid(magGrid),
    description: `段階1: 各画素でソーベルフィルタにより勾配強度を計算(明るいほど強い勾配、最大値≈${maxMag.toFixed(1)})`,
  });

  // 段階2: 非最大値抑制(勾配方向に沿った前後の画素と比較し、局所的な最大値でなければ0に抑制)
  const suppressed: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const m = mag[y][x];
      if (m === 0) continue;
      const a = angleDeg[y][x];
      let n1 = 0;
      let n2 = 0;
      if (a < 22.5 || a >= 157.5) {
        n1 = x > 0 ? mag[y][x - 1] : 0;
        n2 = x < cols - 1 ? mag[y][x + 1] : 0;
      } else if (a < 67.5) {
        n1 = y > 0 && x < cols - 1 ? mag[y - 1][x + 1] : 0;
        n2 = y < rows - 1 && x > 0 ? mag[y + 1][x - 1] : 0;
      } else if (a < 112.5) {
        n1 = y > 0 ? mag[y - 1][x] : 0;
        n2 = y < rows - 1 ? mag[y + 1][x] : 0;
      } else {
        n1 = y > 0 && x > 0 ? mag[y - 1][x - 1] : 0;
        n2 = y < rows - 1 && x < cols - 1 ? mag[y + 1][x + 1] : 0;
      }
      suppressed[y][x] = m >= n1 && m >= n2 ? m : 0;
    }
  }
  const nmsGrid: GridCellState[][] = suppressed.map((row) => row.map(bucketByMag));
  frames.push({
    cellStates: cloneGrid(nmsGrid),
    description:
      "段階2: 非最大値抑制。勾配方向に沿った前後の画素と比較し、局所的な最大値でない画素を0に抑制する(太いエッジを細い線に絞り込む)",
  });

  // 段階3: ヒステリシス閾値処理
  const strong: boolean[][] = suppressed.map((row) => row.map((v) => v >= high));
  const weak: boolean[][] = suppressed.map((row) => row.map((v) => v >= low && v < high));
  const result: boolean[][] = strong.map((row) => [...row]);

  const renderHysteresis = (): GridCellState[][] =>
    result.map((row, y) => row.map((isEdge, x) => (isEdge ? "wall" : weak[y][x] ? "frontier" : "idle")));

  frames.push({
    cellStates: renderHysteresis(),
    description: `段階3: ヒステリシス閾値処理を開始。強い勾配(≥${high.toFixed(1)})は確実なエッジとして即採用し、弱い勾配(${low.toFixed(1)}〜${high.toFixed(1)})は保留とする`,
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!weak[y][x] || result[y][x]) continue;
        let connectedToStrong = false;
        for (let dy = -1; dy <= 1 && !connectedToStrong; dy++) {
          for (let dx = -1; dx <= 1 && !connectedToStrong; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy >= 0 && yy < rows && xx >= 0 && xx < cols && result[yy][xx]) connectedToStrong = true;
          }
        }
        if (connectedToStrong) {
          result[y][x] = true;
          changed = true;
        }
      }
    }
    if (changed) {
      frames.push({
        cellStates: renderHysteresis(),
        description: "強いエッジに8近傍で連結している弱いエッジを昇格させる(ヒステリシス伝播)",
      });
    }
  }

  const finalGrid: GridCellState[][] = result.map((row) => row.map((isEdge) => (isEdge ? "path" : "idle")));
  frames.push({
    cellStates: cloneGrid(finalGrid),
    description:
      "計算完了。強いエッジに連結していない弱いエッジ(孤立したノイズ画素の周囲)は棄却され、連結した細いエッジ線だけが残った",
  });

  return frames;
}

// ------------------------------------------------------------
// ソーベルフィルタ (sobel-filter)
// ------------------------------------------------------------

export const SOBEL_ROWS = 8;
export const SOBEL_COLS = 8;

/** 縦の明暗差(左が暗い/右が明るい)と横の明暗差(上が明るい/下が暗い)を両方持つ合成画像。 */
const SOBEL_IMAGE: number[][] = [
  [2, 2, 2, 2, 8, 8, 8, 8],
  [2, 2, 2, 2, 8, 8, 8, 8],
  [2, 2, 2, 2, 8, 8, 8, 8],
  [2, 2, 2, 2, 8, 8, 8, 8],
  [0, 0, 0, 0, 6, 6, 6, 6],
  [0, 0, 0, 0, 6, 6, 6, 6],
  [0, 0, 0, 0, 6, 6, 6, 6],
  [0, 0, 0, 0, 6, 6, 6, 6],
];

function sobelMagnitudeBucket(v: number, maxMag: number): GridCellState {
  if (maxMag <= 0) return "idle";
  const ratio = v / maxMag;
  if (ratio < 0.15) return "idle";
  if (ratio < 0.45) return "frontier";
  if (ratio < 0.75) return "difficult";
  return "wall";
}

/**
 * ソーベルフィルタのステップ列を生成する。各画素で水平方向の勾配Gxと垂直方向の勾配Gyを
 * 3×3カーネルで計算し、その大きさ√(Gx²+Gy²)をそのままセルの濃淡(強度)として表示する。
 * 行ごとに上から下へ計算を進めていく過程を可視化する。
 */
export function sobelFilterSteps(): GridFrame[] {
  const rows = SOBEL_ROWS;
  const cols = SOBEL_COLS;
  const { mag } = computeSobelGradients(SOBEL_IMAGE, rows, cols);
  const maxMag = Math.max(0, ...mag.flat());

  const grid: GridCellState[][] = Array.from({ length: rows }, () => new Array<GridCellState>(cols).fill("idle"));
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "入力画像(左が暗く右が明るい縦のエッジ+上下の明暗差)にソーベルフィルタを適用する",
    },
  ];

  for (let y = 0; y < rows; y++) {
    const highlightRow = cloneGrid(grid);
    for (let x = 0; x < cols; x++) highlightRow[y][x] = "frontier";
    frames.push({
      cellStates: highlightRow,
      description: `${y + 1}行目の各画素で水平方向の勾配Gxと垂直方向の勾配Gyを3×3カーネルで計算中`,
    });

    for (let x = 0; x < cols; x++) {
      grid[y][x] = sobelMagnitudeBucket(mag[y][x], maxMag);
    }
    frames.push({
      cellStates: cloneGrid(grid),
      description: `${y + 1}行目完了。勾配の大きさ√(Gx²+Gy²)をセルの濃淡として表示(濃いほど強いエッジ)`,
    });
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。縦のエッジ境界(列3/4)と横の明暗差の境界(行3/4)でエッジ強度マップが明るくなった",
  });
  return frames;
}

// ------------------------------------------------------------
// 連結成分ラベリング (connected-component-labeling)
// ------------------------------------------------------------

export const CCL_ROWS = 8;
export const CCL_COLS = 8;

/** 2値画像(1=前景)。4連結で数えると独立した4つの塊がある。 */
const CCL_IMAGE: number[][] = [
  [1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const CCL_LABEL_STATES: GridCellState[] = ["start", "goal", "path", "difficult"];

/**
 * 連結成分ラベリングのステップ列を生成する。シード充填法(4連結BFS)で実装し、
 * 未ラベルの前景画素を見つけるたびに新しいラベルを割り当て、そこから隣接する前景画素へ
 * 同じラベルをBFSで広げていく。
 */
export function connectedComponentLabelingSteps(): GridFrame[] {
  const rows = CCL_ROWS;
  const cols = CCL_COLS;
  const grid: GridCellState[][] = CCL_IMAGE.map((row) => row.map((v) => (v === 1 ? "wall" : "idle")));
  const labeled: boolean[][] = CCL_IMAGE.map((row) => row.map(() => false));
  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description:
        "2値画像(前景=明るいセル)から連結成分ラベリングを開始する。前景セルをBFSで走査し、連結した塊ごとに別のラベル(色)を割り当てる",
    },
  ];

  let labelCount = 0;
  for (let sy = 0; sy < rows; sy++) {
    for (let sx = 0; sx < cols; sx++) {
      if (CCL_IMAGE[sy][sx] !== 1 || labeled[sy][sx]) continue;
      const labelState = CCL_LABEL_STATES[labelCount % CCL_LABEL_STATES.length];
      labelCount++;
      labeled[sy][sx] = true;
      grid[sy][sx] = "frontier";
      const queue: [number, number][] = [[sy, sx]];
      frames.push({
        cellStates: cloneGrid(grid),
        description: `未ラベルの前景セル(${sy + 1}, ${sx + 1})を発見。新しいラベル${labelCount}を割り当ててBFSを開始する`,
      });

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        grid[r][c] = labelState;
        frames.push({ cellStates: cloneGrid(grid), description: `(${r + 1}, ${c + 1})にラベル${labelCount}を確定` });

        const neighbors: [number, number][] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        let addedAny = false;
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (CCL_IMAGE[nr][nc] !== 1 || labeled[nr][nc]) continue;
          labeled[nr][nc] = true;
          grid[nr][nc] = "frontier";
          queue.push([nr, nc]);
          addedAny = true;
        }
        if (addedAny) {
          frames.push({
            cellStates: cloneGrid(grid),
            description: `隣接する前景セルをキューに追加(キュー内 ${queue.length}件)`,
          });
        }
      }
    }
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: `計算完了。${labelCount}個の連結成分をそれぞれ異なるラベル(色)に分類した`,
  });
  return frames;
}

// ------------------------------------------------------------
// Watershed法(分水嶺法) (watershed-algorithm)
// ------------------------------------------------------------

export const WATERSHED_ROWS = 9;
export const WATERSHED_COLS = 9;

const WATERSHED_SEEDS: { r: number; c: number; state: GridCellState }[] = [
  { r: 1, c: 1, state: "start" },
  { r: 1, c: 7, state: "goal" },
  { r: 7, c: 4, state: "difficult" },
];

/**
 * Watershed法(分水嶺法)の簡略化ステップ列を生成する。実際の輝度地形の代わりに平坦な地形上での
 * 複数シードからの同時多元BFSとして実装する——各セルは最も近いシードの領域として1マスずつ
 * 同時に成長し、同じラウンドで複数のシードから同時に到達したセルは分水嶺(境界)として確定する。
 * これは平坦な地形上でのWatershed法(各セルが最近傍シードに属するボロノイ分割になり、
 * その境界が分水嶺線になる)と数学的に同値である。
 */
export function watershedAlgorithmSteps(): GridFrame[] {
  const rows = WATERSHED_ROWS;
  const cols = WATERSHED_COLS;
  const grid: GridCellState[][] = Array.from({ length: rows }, () => new Array<GridCellState>(cols).fill("idle"));
  const owner: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let frontiers: [number, number][][] = WATERSHED_SEEDS.map((s) => [[s.r, s.c]]);

  WATERSHED_SEEDS.forEach((s, i) => {
    owner[s.r][s.c] = i;
    grid[s.r][s.c] = s.state;
  });

  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: `${WATERSHED_SEEDS.length}個の種(マーカー)を配置し、Watershed法(複数領域の同時成長)を開始する`,
    },
  ];

  let round = 0;
  let anyExpanded = true;
  while (anyExpanded) {
    anyExpanded = false;
    round++;
    const proposals = new Map<string, number[]>();
    for (let i = 0; i < frontiers.length; i++) {
      for (const [r, c] of frontiers[i]) {
        const neighbors: [number, number][] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (owner[nr][nc] !== -1) continue;
          const k = `${nr},${nc}`;
          const list = proposals.get(k) ?? [];
          if (!list.includes(i)) list.push(i);
          proposals.set(k, list);
        }
      }
    }

    const nextFrontiers: [number, number][][] = frontiers.map(() => []);
    for (const [k, seedIds] of proposals) {
      const [r, c] = k.split(",").map(Number);
      if (seedIds.length === 1) {
        owner[r][c] = seedIds[0];
        grid[r][c] = WATERSHED_SEEDS[seedIds[0]].state;
        nextFrontiers[seedIds[0]].push([r, c]);
      } else {
        owner[r][c] = -2;
        grid[r][c] = "wall";
      }
      anyExpanded = true;
    }

    frontiers = nextFrontiers;

    if (anyExpanded) {
      frames.push({
        cellStates: cloneGrid(grid),
        description: `ラウンド${round}: 各領域が1マスずつ同時に成長する。複数の種から同じラウンドで到達したセルは分水嶺(境界)として確定`,
      });
    }
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。全セルが最も近い種の領域に分割され、領域同士が接する境界が分水嶺として確定した",
  });
  return frames;
}

// ------------------------------------------------------------
// 距離変換(Distance Transform) (distance-transform)
// ------------------------------------------------------------

export const DISTANCE_TRANSFORM_ROWS = 8;
export const DISTANCE_TRANSFORM_COLS = 8;

/** 2値画像(1=前景の塊、0=背景)。中心に近いほど背景から遠い。 */
const DISTANCE_TRANSFORM_IMAGE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const DISTANCE_TRANSFORM_BUCKETS: GridCellState[] = ["frontier", "visited", "path", "difficult"];

/**
 * 距離変換のステップ列を生成する。全ての背景セル(値0)を距離0の起点とする多元BFSを行い、
 * 各前景セルについて最も近い背景セルまでの距離を波状に広げながら確定する。
 * 距離が大きい(=境界から遠い)セルほど濃い色で表示する。
 */
export function distanceTransformSteps(): GridFrame[] {
  const rows = DISTANCE_TRANSFORM_ROWS;
  const cols = DISTANCE_TRANSFORM_COLS;
  const grid: GridCellState[][] = DISTANCE_TRANSFORM_IMAGE.map((row) => row.map((v) => (v === 1 ? "wall" : "idle")));
  const dist: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let frontier: [number, number][] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (DISTANCE_TRANSFORM_IMAGE[y][x] === 0) {
        dist[y][x] = 0;
        frontier.push([y, x]);
      }
    }
  }

  const frames: GridFrame[] = [
    {
      cellStates: cloneGrid(grid),
      description: "2値画像(前景=明るい塊)に対し、全ての背景セルを距離0の起点としてBFSで距離変換を計算する",
    },
  ];

  while (frontier.length > 0) {
    const nextFrontier: [number, number][] = [];
    for (const [r, c] of frontier) {
      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (dist[nr][nc] !== -1) continue;
        dist[nr][nc] = dist[r][c] + 1;
        nextFrontier.push([nr, nc]);
      }
    }
    if (nextFrontier.length > 0) {
      const d = dist[nextFrontier[0][0]][nextFrontier[0][1]];
      const bucketIndex = Math.min(d - 1, DISTANCE_TRANSFORM_BUCKETS.length - 1);
      for (const [r, c] of nextFrontier) grid[r][c] = DISTANCE_TRANSFORM_BUCKETS[bucketIndex];
      frames.push({
        cellStates: cloneGrid(grid),
        description: `距離${d}: 背景から${d}マス離れた前景セルを確定(距離が大きいほど濃い色)`,
      });
    }
    frontier = nextFrontier;
  }

  frames.push({
    cellStates: cloneGrid(grid),
    description: "計算完了。各前景セルに最も近い背景セルまでの距離が確定した(塊の中心に近いほど距離が大きい)",
  });
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
  wireworld: wireworldSteps,
  "flow-field-pathfinding": flowFieldPathfindingSteps,
  "line-of-sight-raycasting": lineOfSightRaycastingSteps,
  "cellular-automaton-crowd": cellularAutomatonCrowdSteps,
  "influence-map": influenceMapSteps,
  "navmesh-generation": navmeshGenerationSteps,
  "potential-field-navigation": potentialFieldNavigationSteps,
  "potential-field-path-planning": potentialFieldPathPlanningSteps,
  "social-force-model": socialForceModelSteps,
  "continuum-crowd-model": continuumCrowdModelSteps,
  "best-first-search": bestFirstSearchSteps,
  "bidirectional-search": bidirectionalSearchSteps,
  "canny-edge-detection": cannyEdgeDetectionSteps,
  "sobel-filter": sobelFilterSteps,
  "connected-component-labeling": connectedComponentLabelingSteps,
  "watershed-algorithm": watershedAlgorithmSteps,
  "distance-transform": distanceTransformSteps,
  "elementary-cellular-automaton": elementaryCellularAutomatonSteps,
  "brians-brain-cellular-automaton": briansBrainCellularAutomatonSteps,
  "forest-fire-model": forestFireModelSteps,
  "rock-paper-scissors-cellular-automaton": rockPaperScissorsCellularAutomatonSteps,
  "sandpile-model": sandpileModelSteps,
  "traffic-cellular-automaton": trafficCellularAutomatonSteps,
};
