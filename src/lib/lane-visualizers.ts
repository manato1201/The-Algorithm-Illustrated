/**
 * 「同じ計算を3方式で並べる」レーン可視化(IMPROVEMENT_PLAN_2026-10 A1)。
 * 1つの入力に対して複数のレーンが「同じステップ番号」で同時に進み、方式による違い(かかるステップ数、
 * 同時に動く演算器の数、データの読み出し量)が一目で比べられる。
 * 巻き戻しても全レーンが同じ時点に戻るよう、フレームは全レーンの状態を1つにまとめて持つ。
 */

export type LaneId = "sequential" | "parallel" | "fixed";

export type LaneState = {
  id: LaneId;
  label: string;
  /** 出力行列Cの各セルについて、これまでに足し込んだ積の数(0..N)と、その時点の部分和。 */
  cells: { done: number; partial: number }[];
  /** 完了した乗加算(MAC)の数と、総数。 */
  completedMacs: number;
  totalMacs: number;
  /** このステップで同時に動いた演算器の数。 */
  activeUnits: number;
  /** ここまでのメモリ読み出し回数(データ移動量の目安)。 */
  memoryReads: number;
  /** このレーンが全て完了したか。 */
  finished: boolean;
  /** このステップでレーンが何をしたかの短い説明。 */
  note: string;
};

export type LaneFrame = {
  /** 全レーン共通のステップ番号(0=開始前)。 */
  step: number;
  lanes: LaneState[];
  description: string;
};

export type LaneMeta = {
  /** 行列のサイズ(N×N)。 */
  size: number;
  matrixA: number[][];
  matrixB: number[][];
  /** メモリ読み出しの最大値(電力の目安の正規化に使う)。 */
  maxReads: number;
  chips: string[];
};

const N = 3;
const MATRIX_A = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const MATRIX_B = [
  [1, 0, 2],
  [0, 1, 3],
  [1, 2, 0],
];

const TOTAL_MACS = N * N * N;
const CELLS = N * N;

/** セル(i,j)のk番目の積 A[i][k]*B[k][j]。 */
function product(i: number, j: number, k: number): number {
  return MATRIX_A[i][k] * MATRIX_B[k][j];
}

/** セル(i,j)に先頭からdone個の積を足し込んだ部分和。 */
function partialSum(i: number, j: number, done: number): number {
  let sum = 0;
  for (let k = 0; k < done; k++) sum += product(i, j, k);
  return sum;
}

function cellsFromProgress(progress: (cell: number) => number): LaneState["cells"] {
  return Array.from({ length: CELLS }, (_, cell) => {
    const done = progress(cell);
    return { done, partial: partialSum(Math.floor(cell / N), cell % N, done) };
  });
}

/** 乗加算1回につき、aとbの2つの値を読む(キャッシュ等は考えない素朴な見積もり)。 */
const READS_PER_MAC = 2;

/** 逐次: 演算器1個が、セルを1つずつ・積を1つずつ処理する。 */
function sequentialLane(step: number): LaneState {
  const completed = Math.min(step, TOTAL_MACS);
  const cells = cellsFromProgress((cell) => Math.max(0, Math.min(N, completed - cell * N)));
  const finished = completed === TOTAL_MACS;
  const current = completed === 0 ? null : completed - 1;
  const note =
    current === null
      ? "演算器1個。まだ何も計算していない"
      : finished
        ? "全部の積を1個ずつ処理し終えた"
        : `C[${Math.floor(Math.floor(current / N) / N)}][${Math.floor(current / N) % N}] の ${(current % N) + 1} つ目の積を計算`;
  return {
    id: "sequential",
    label: "逐次(演算器1個)",
    cells,
    completedMacs: completed,
    totalMacs: TOTAL_MACS,
    activeUnits: step >= 1 ? 1 : 0,
    memoryReads: completed * READS_PER_MAC,
    finished,
    note,
  };
}

/** 並列: 9個の演算器がそれぞれ1つの出力セルを担当し、毎ステップ全員が同時に1つずつ積を足す。 */
function parallelLane(step: number): LaneState {
  const rounds = Math.min(step, N);
  const cells = cellsFromProgress(() => rounds);
  const completed = rounds * CELLS;
  const finished = rounds === N;
  return {
    id: "parallel",
    label: "並列(演算器9個)",
    cells,
    completedMacs: completed,
    totalMacs: TOTAL_MACS,
    activeUnits: step >= 1 && step <= N ? CELLS : 0,
    memoryReads: completed * READS_PER_MAC,
    finished,
    note:
      step === 0
        ? "演算器9個。まだ何も計算していない"
        : finished && step > N
          ? "計算は終わっている(待機)"
          : `9個が同時に ${Math.min(step, N)} つ目の積を計算`,
  };
}

/**
 * 回路固定: 行列Bの値を回路に「固定」して(最初の1ステップで読み込む)、行列Aを1行ずつ流す。
 * 固定した後はBを読み直さないので、データ移動が少ない。一方、固定する準備に1ステップかかる。
 * ※実際の専用回路(NPU等)は製品ごとに実装が違う。ここでは考え方を示す簡略モデル。
 */
function fixedLane(step: number): LaneState {
  const rowsDone = Math.max(0, Math.min(N, step - 1));
  const cells = cellsFromProgress((cell) => (Math.floor(cell / N) < rowsDone ? N : 0));
  const completed = rowsDone * CELLS;
  const finished = rowsDone === N;
  // Bの読み込み(N*N回)を1ステップ目に行い、以後はAの要素だけを読む(1行あたりN回)
  const reads = step >= 1 ? CELLS + rowsDone * N : 0;
  return {
    id: "fixed",
    label: "回路固定(Bを固定)",
    cells,
    completedMacs: completed,
    totalMacs: TOTAL_MACS,
    activeUnits: step >= 2 && step <= N + 1 ? CELLS : 0,
    memoryReads: reads,
    finished,
    note:
      step === 0
        ? "回路にBを固定する準備がまだ"
        : step === 1
          ? `Bの${CELLS}個の値を回路に固定する(以後は読み直さない)`
          : finished && step > N + 1
            ? "計算は終わっている(待機)"
            : `Aの第${step - 1}行を流し、Cの1行を一度に出力`,
  };
}

function frameAt(step: number): LaneFrame {
  const lanes = [sequentialLane(step), parallelLane(step), fixedLane(step)];
  const finishedLabels = lanes.filter((lane) => lane.finished).map((lane) => lane.label);
  let description: string;
  if (step === 0) {
    description = `同じ ${N}×${N} 行列の掛け算 C = A×B(積は全部で${TOTAL_MACS}回)を、3つの方式で同時にスタートする。`;
  } else if (lanes.every((lane) => lane.finished)) {
    description = `ステップ${step}: 3方式とも完了。かかったステップ数と、データの読み出し量が方式で大きく違う。`;
  } else if (finishedLabels.length > 0) {
    description = `ステップ${step}: ${finishedLabels.join("・")}が完了。他の方式はまだ計算中。`;
  } else {
    description = `ステップ${step}: 3方式が同じステップ番号で進んでいる。`;
  }
  return { step, lanes, description };
}

/** 逐次レーンが最後に終わるので、そのステップ数(=TOTAL_MACS)までを1ステップずつ進める。 */
export function matrixMultiplicationLanesSteps(): LaneFrame[] {
  return Array.from({ length: TOTAL_MACS + 1 }, (_, step) => frameAt(step));
}

export const LANE_VISUALIZERS: Record<string, () => LaneFrame[]> = {
  "matrix-multiplication-three-ways": matrixMultiplicationLanesSteps,
};

export const LANE_META: Record<string, LaneMeta> = {
  "matrix-multiplication-three-ways": {
    size: N,
    matrixA: MATRIX_A,
    matrixB: MATRIX_B,
    maxReads: TOTAL_MACS * READS_PER_MAC,
    chips: [
      `${N}×${N}行列の掛け算 C = A×B(積${TOTAL_MACS}回)`,
      "逐次=演算器1個 / 並列=演算器9個 / 回路固定=Bを回路に固定してAを流す",
      "電力の目安は、メモリ読み出し量にもとづく定性的なもの(実測値ではない)",
    ],
  },
};
