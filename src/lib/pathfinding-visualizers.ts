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
};
