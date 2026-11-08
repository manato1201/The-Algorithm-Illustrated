import type { StateColorKey } from "./design-tokens";

/**
 * 3次元の可視化(kind = "scene3d")の型と、計算の共通部品。描画は three.js(Scene3DVisualizer)。
 * 座標は three.js と同じ「y が上」: Vec3 = [x, y(上), z]。曲面は (x, z) の格子の上に高さ y を置く。
 * 状態色の意味は他の可視化と共通のまま、形でも区別する(3Dでは球=比較中・円錐=入れ替え/減少・八面体=基準・立方体=確定):
 *   comparing = 進行中の点・経路 / pivot = いま注目している点 / swapping = 負の影響・比較対象 / settled = 確定した結果
 * 計算は実際のアルゴリズムどおりに行い、ここは見せるための座標に直すだけ(見た目だけのアニメーションにしない)。
 */

export type Vec3 = [number, number, number];

export type Scene3DSurface = {
  /** x 方向・z 方向の格子点の数。 */
  nx: number;
  nz: number;
  xRange: [number, number];
  zRange: [number, number];
  /** 高さ y。長さ nx*nz、添字は iz*nx + ix。 */
  heights: number[];
};

export type Scene3DPath = {
  id: string;
  points: Vec3[];
  state: StateColorKey;
  /** true なら最後の点と最初の点を結ぶ(輪郭など)。 */
  closed?: boolean;
};

export type Scene3DPoint = {
  id: string;
  position: Vec3;
  state: StateColorKey;
  /** 大きさ(既定 1)。 */
  size?: number;
};

export type Scene3DFrame = {
  /** このステップの種類。タイムラインの色・高さに使う(最初のフレームは idle)。 */
  kind: StateColorKey;
  surface?: Scene3DSurface;
  /** 半径 r の球(ワイヤー)。回転の可視化で使う。 */
  sphere?: { radius: number };
  paths: Scene3DPath[];
  points: Scene3DPoint[];
  readouts: { label: string; value: string }[];
  description: string;
};

export type Scene3DMeta = {
  /** 画面上部のチップ(入力の条件)。 */
  chips: string[];
  camera: { position: Vec3; target: Vec3 };
  /** 軸の意味(画面の下に文字でも示す)。 */
  axes: { x: string; y: string; z: string };
  /** 簡略化や見た目のための調整があれば、その注意書き。 */
  caveat?: string;
};

/** 固定シードの乱数(mulberry32)。3Dの入力も毎回同じにして、再現できるようにする。 */
export function makeRng3(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 標準正規分布の乱数(Box-Muller法)。 */
export function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** (x, z) の格子の上で関数 f(x, z) を評価して、曲面を作る。 */
export function surfaceOf(
  f: (x: number, z: number) => number,
  xRange: [number, number],
  zRange: [number, number],
  nx: number,
  nz: number,
): Scene3DSurface {
  const heights: number[] = [];
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = xRange[0] + ((xRange[1] - xRange[0]) * ix) / (nx - 1);
      const z = zRange[0] + ((zRange[1] - zRange[0]) * iz) / (nz - 1);
      heights.push(f(x, z));
    }
  }
  return { nx, nz, xRange, zRange, heights };
}

export const add3 = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const scale3 = (a: Vec3, s: number): Vec3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
];
export const dot3 = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function fixed(value: number, digits = 2): string {
  return value.toFixed(digits);
}
export function vecText(v: Vec3, digits = 2): string {
  return `(${v.map((c) => c.toFixed(digits)).join(", ")})`;
}
