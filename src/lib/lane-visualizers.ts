/**
 * 「同じ計算を3方式で並べる」レーン可視化(IMPROVEMENT_PLAN_2026-10 A1 / 設計書 T1 比較ラボ)。
 * 1つの入力に対して複数のレーンが「同じステップ番号」で同時に進み、方式による違い(かかるステップ数、
 * 同時に動く演算器の数、データの読み出し量)が一目で比べられる。入力サイズ(行列のn)を変えると、
 * ステップ数や読み出し量が条件に合わせて変わる。
 * 巻き戻しても全レーンが同じ時点に戻るよう、フレームは全レーンの状態を1つにまとめて持つ。
 */

export type LaneId = "sequential" | "parallel" | "fixed";

export type LaneState = {
  id: LaneId;
  label: string;
  /** 出力行列Cの各セルについて、これまでに足し込んだ積の数(0..n)と、その時点の部分和。 */
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
  /** 行列のサイズ(n×n)。 */
  size: number;
  matrixA: number[][];
  matrixB: number[][];
  /** メモリ読み出しの最大値(電力の目安の正規化に使う)。 */
  maxReads: number;
  chips: string[];
};

/** 行列サイズnの範囲(最大でも n³+1=126フレームに収まる)。 */
export const LANE_MIN_SIZE = 2;
export const LANE_MAX_SIZE = 5;
export const LANE_DEFAULT_SIZE = 3;

/** 乗加算1回につき、aとbの2つの値を読む(キャッシュ等は考えない素朴な見積もり)。 */
const READS_PER_MAC = 2;

function clampSize(size: number | undefined): number {
  const value = Math.round(size ?? LANE_DEFAULT_SIZE);
  return Math.min(LANE_MAX_SIZE, Math.max(LANE_MIN_SIZE, value));
}

/** n=3のとき A=[[1,2,3],[4,5,6],[7,8,9]]。nに依らず1〜9の小さい整数で決定的に作る。 */
function buildMatrixA(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => ((i * n + k) % 9) + 1));
}

/** 0〜2の小さい整数(0を含む)で決定的に作る。 */
function buildMatrixB(n: number): number[][] {
  return Array.from({ length: n }, (_, k) => Array.from({ length: n }, (_, j) => (k + 2 * j) % 3));
}

type Model = {
  n: number;
  a: number[][];
  b: number[][];
  totalMacs: number;
  cellCount: number;
};

function buildModel(size: number): Model {
  const n = clampSize(size);
  return { n, a: buildMatrixA(n), b: buildMatrixB(n), totalMacs: n * n * n, cellCount: n * n };
}

/** セル(i,j)に先頭からdone個の積を足し込んだ部分和。 */
function partialSum(model: Model, i: number, j: number, done: number): number {
  let sum = 0;
  for (let k = 0; k < done; k++) sum += model.a[i][k] * model.b[k][j];
  return sum;
}

function cellsFromProgress(model: Model, progress: (cell: number) => number): LaneState["cells"] {
  return Array.from({ length: model.cellCount }, (_, cell) => {
    const done = progress(cell);
    return { done, partial: partialSum(model, Math.floor(cell / model.n), cell % model.n, done) };
  });
}

/** 逐次: 演算器1個が、セルを1つずつ・積を1つずつ処理する。 */
function sequentialLane(model: Model, step: number): LaneState {
  const { n, totalMacs } = model;
  const completed = Math.min(step, totalMacs);
  const cells = cellsFromProgress(model, (cell) => Math.max(0, Math.min(n, completed - cell * n)));
  const finished = completed === totalMacs;
  const current = completed === 0 ? null : completed - 1;
  const note =
    current === null
      ? "演算器1個。まだ何も計算していない"
      : finished
        ? "全部の積を1個ずつ処理し終えた"
        : `C[${Math.floor(Math.floor(current / n) / n)}][${Math.floor(current / n) % n}] の ${(current % n) + 1} つ目の積を計算`;
  return {
    id: "sequential",
    label: "逐次(演算器1個)",
    cells,
    completedMacs: completed,
    totalMacs,
    activeUnits: step >= 1 ? 1 : 0,
    memoryReads: completed * READS_PER_MAC,
    finished,
    note,
  };
}

/** 並列: n²個の演算器がそれぞれ1つの出力セルを担当し、毎ステップ全員が同時に1つずつ積を足す。 */
function parallelLane(model: Model, step: number): LaneState {
  const { n, totalMacs, cellCount } = model;
  const rounds = Math.min(step, n);
  const cells = cellsFromProgress(model, () => rounds);
  const completed = rounds * cellCount;
  const finished = rounds === n;
  return {
    id: "parallel",
    label: `並列(演算器${cellCount}個)`,
    cells,
    completedMacs: completed,
    totalMacs,
    activeUnits: step >= 1 && step <= n ? cellCount : 0,
    memoryReads: completed * READS_PER_MAC,
    finished,
    note:
      step === 0
        ? `演算器${cellCount}個。まだ何も計算していない`
        : finished && step > n
          ? "計算は終わっている(待機)"
          : `${cellCount}個が同時に ${Math.min(step, n)} つ目の積を計算`,
  };
}

/**
 * 回路固定: 行列Bの値を回路に「固定」して(最初の1ステップで読み込む)、行列Aを1行ずつ流す。
 * 固定した後はBを読み直さないので、データ移動が少ない。一方、固定する準備に1ステップかかる。
 * ※実際の専用回路(NPU等)は製品ごとに実装が違う。ここでは考え方を示す簡略モデル。
 */
function fixedLane(model: Model, step: number): LaneState {
  const { n, totalMacs, cellCount } = model;
  const rowsDone = Math.max(0, Math.min(n, step - 1));
  const cells = cellsFromProgress(model, (cell) => (Math.floor(cell / n) < rowsDone ? n : 0));
  const completed = rowsDone * cellCount;
  const finished = rowsDone === n;
  // Bの読み込み(n*n回)を1ステップ目に行い、以後はAの要素だけを読む(1行あたりn回)
  const reads = step >= 1 ? cellCount + rowsDone * n : 0;
  return {
    id: "fixed",
    label: "回路固定(Bを固定)",
    cells,
    completedMacs: completed,
    totalMacs,
    activeUnits: step >= 2 && step <= n + 1 ? cellCount : 0,
    memoryReads: reads,
    finished,
    note:
      step === 0
        ? "回路にBを固定する準備がまだ"
        : step === 1
          ? `Bの${cellCount}個の値を回路に固定する(以後は読み直さない)`
          : finished && step > n + 1
            ? "計算は終わっている(待機)"
            : `Aの第${step - 1}行を流し、Cの1行を一度に出力`,
  };
}

function frameAt(model: Model, step: number): LaneFrame {
  const lanes = [sequentialLane(model, step), parallelLane(model, step), fixedLane(model, step)];
  const finishedLabels = lanes.filter((lane) => lane.finished).map((lane) => lane.label);
  let description: string;
  if (step === 0) {
    description = `同じ ${model.n}×${model.n} 行列の掛け算 C = A×B(積は全部で${model.totalMacs}回)を、3つの方式で同時にスタートする。`;
  } else if (lanes.every((lane) => lane.finished)) {
    description = `ステップ${step}: 3方式とも完了。かかったステップ数と、データの読み出し量が方式で大きく違う。`;
  } else if (finishedLabels.length > 0) {
    description = `ステップ${step}: ${finishedLabels.join("・")}が完了。他の方式はまだ計算中。`;
  } else {
    description = `ステップ${step}: 3方式が同じステップ番号で進んでいる。`;
  }
  return { step, lanes, description };
}

/** 逐次レーンが最後に終わるので、そのステップ数(=n³)までを1ステップずつ進める。sizeは行列のn。 */
export function matrixMultiplicationLanesSteps(size: number = LANE_DEFAULT_SIZE): LaneFrame[] {
  const model = buildModel(size);
  return Array.from({ length: model.totalMacs + 1 }, (_, step) => frameAt(model, step));
}

export const LANE_VISUALIZERS: Record<string, (size?: number) => LaneFrame[]> = {
  "matrix-multiplication-three-ways": matrixMultiplicationLanesSteps,
};

/** 画面の説明用メタ情報(行列の中身・チップ文言・読み出しの正規化値)。 */
export const LANE_META: Record<string, (size: number) => LaneMeta> = {
  "matrix-multiplication-three-ways": (size) => {
    const model = buildModel(size);
    return {
      size: model.n,
      matrixA: model.a,
      matrixB: model.b,
      maxReads: model.totalMacs * READS_PER_MAC,
      chips: [
        `${model.n}×${model.n}行列の掛け算 C = A×B(積${model.totalMacs}回)`,
        `逐次=演算器1個 / 並列=演算器${model.cellCount}個 / 回路固定=Bを回路に固定してAを流す`,
        "電力の目安は、メモリ読み出し量にもとづく定性的なもの(実測値ではない)",
      ],
    };
  },
};
