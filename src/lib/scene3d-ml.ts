import {
  add3,
  dot3,
  fixed,
  gaussian,
  makeRng3,
  norm3,
  scale3,
  sub3,
  type Scene3DFrame,
  type Scene3DMeta,
  type Scene3DPath,
  type Scene3DPoint,
  type Vec3,
} from "./scene3d.ts";

/**
 * 機械学習: 主成分分析(PCA)を、3次元の点群と主成分の軸で見せる。
 * 点群は「細長い楕円体」を固定の回転で傾けたもの。共分散行列の固有ベクトルが軸、固有値が軸方向の分散になる。
 */

export const PCA_POINTS = 70;
export const PCA_SEED = 17;
export const PCA_SCALES: Vec3 = [3, 1.2, 0.4];
export const PCA_CENTER: Vec3 = [1, 1.5, -0.5];

const rotateY = (v: Vec3, a: number): Vec3 => [Math.cos(a) * v[0] + Math.sin(a) * v[2], v[1], -Math.sin(a) * v[0] + Math.cos(a) * v[2]];
const rotateZ = (v: Vec3, a: number): Vec3 => [Math.cos(a) * v[0] - Math.sin(a) * v[1], Math.sin(a) * v[0] + Math.cos(a) * v[1], v[2]];

export function pcaData(): Vec3[] {
  const rng = makeRng3(PCA_SEED);
  return Array.from({ length: PCA_POINTS }, () => {
    const raw: Vec3 = [gaussian(rng) * PCA_SCALES[0], gaussian(rng) * PCA_SCALES[1], gaussian(rng) * PCA_SCALES[2]];
    return add3(rotateZ(rotateY(raw, (25 * Math.PI) / 180), (35 * Math.PI) / 180), PCA_CENTER);
  });
}

export const meanOf = (points: readonly Vec3[]): Vec3 => scale3(points.reduce((sum, p) => add3(sum, p), [0, 0, 0] as Vec3), 1 / points.length);

/** 共分散行列(標本ではなく母集団: N で割る)。 */
export function covariance(points: readonly Vec3[]): number[][] {
  const mean = meanOf(points);
  const c = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = sub3(p, mean);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i][j] += (d[i] * d[j]) / points.length;
  }
  return c;
}

const mulMat = (m: number[][], v: Vec3): Vec3 => [dot3(m[0] as Vec3, v), dot3(m[1] as Vec3, v), dot3(m[2] as Vec3, v)];

/** べき乗法と縮約(deflation)で、固有値の大きい順に固有ベクトルを求める。 */
export function principalAxes(points: readonly Vec3[]): { values: number[]; vectors: Vec3[] } {
  const c = covariance(points).map((row) => [...row]);
  const values: number[] = [];
  const vectors: Vec3[] = [];
  const starts: Vec3[] = [
    [1, 0.3, 0.2],
    [0.2, 1, 0.3],
    [0.3, 0.2, 1],
  ];
  for (let axis = 0; axis < 3; axis++) {
    let v: Vec3 = starts[axis];
    // 既に求めた軸と直交させてから、べき乗法を繰り返す
    for (let iter = 0; iter < 500; iter++) {
      let w = mulMat(c, v);
      for (const found of vectors) w = sub3(w, scale3(found, dot3(w, found)));
      const n = norm3(w);
      if (n < 1e-15) break;
      v = scale3(w, 1 / n);
    }
    const lambda = dot3(v, mulMat(c, v));
    values.push(lambda);
    vectors.push(v);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i][j] -= lambda * v[i] * v[j];
  }
  return { values, vectors };
}

export function pcaSteps(): Scene3DFrame[] {
  const points = pcaData();
  const mean = meanOf(points);
  const { values, vectors } = principalAxes(points);
  const total = values.reduce((a, b) => a + b, 0);
  const ratio = values.map((v) => v / total);
  const original: Scene3DPoint[] = points.map((p, i) => ({ id: `o${i}`, position: p, state: "idle", size: 0.7 }));
  const axisPath = (i: number, state: Scene3DPath["state"]): Scene3DPath => {
    const half = 2 * Math.sqrt(values[i]);
    return { id: `axis${i}`, points: [sub3(mean, scale3(vectors[i], half)), add3(mean, scale3(vectors[i], half))], state };
  };
  const projected: Scene3DPoint[] = points.map((p, i) => {
    const d = sub3(p, mean);
    const q = add3(add3(mean, scale3(vectors[0], dot3(d, vectors[0]))), scale3(vectors[1], dot3(d, vectors[1])));
    return { id: `q${i}`, position: q, state: "swapping", size: 0.7 };
  });
  const lambdaText = values.map((v, i) => `λ${i + 1}=${fixed(v)}`).join(" ");
  const meanPoint: Scene3DPoint = { id: "mean", position: mean, state: "pivot", size: 1.4 };
  return [
    { kind: "idle", paths: [], points: original, readouts: [{ label: "点の数", value: String(PCA_POINTS) }], description: `${PCA_POINTS}個の3次元の点。細長く、傾いた形に広がっている。どの向きに最も広がっているか(分散が大きいか)を探す` },
    { kind: "pivot", paths: [], points: [...original, meanPoint], readouts: [{ label: "平均", value: `(${fixed(mean[0])}, ${fixed(mean[1])}, ${fixed(mean[2])})` }], description: "まず全点の平均(青い点)を求める。主成分の軸は、すべてこの平均を通る" },
    { kind: "comparing", paths: [axisPath(0, "comparing")], points: [...original, meanPoint], readouts: [{ label: "第1主成分の分散 λ1", value: fixed(values[0]) }, { label: "寄与率", value: `${fixed(ratio[0] * 100, 1)}%` }], description: `共分散行列の最大の固有値 λ1=${fixed(values[0])} の固有ベクトルが、最も広がる向き(第1主成分)。寄与率は全分散の ${fixed(ratio[0] * 100, 1)}%` },
    { kind: "comparing", paths: [axisPath(0, "comparing"), axisPath(1, "comparing")], points: [...original, meanPoint], readouts: [{ label: "第2主成分の分散 λ2", value: fixed(values[1]) }, { label: "寄与率", value: `${fixed(ratio[1] * 100, 1)}%` }], description: `第1主成分と直交する向きのうち最も広がる第2主成分。λ2=${fixed(values[1])}(寄与率 ${fixed(ratio[1] * 100, 1)}%)` },
    { kind: "comparing", paths: [axisPath(0, "comparing"), axisPath(1, "comparing"), axisPath(2, "comparing")], points: [...original, meanPoint], readouts: [{ label: "第3主成分の分散 λ3", value: fixed(values[2]) }, { label: "寄与率", value: `${fixed(ratio[2] * 100, 1)}%` }], description: `残りの向きが第3主成分で、λ3=${fixed(values[2])}。3つの軸は互いに直交し、分散の合計(${fixed(total)})は元の点群の分散の合計と等しい` },
    { kind: "swapping", paths: [axisPath(0, "settled"), axisPath(1, "settled"), axisPath(2, "comparing")], points: [...original, meanPoint, ...projected], readouts: [{ label: "残る分散の割合", value: `${fixed((ratio[0] + ratio[1]) * 100, 1)}%` }], description: "第1・第2主成分が作る平面に、すべての点を垂直に落とす(第3主成分の向きの情報を捨てる)" },
    { kind: "settled", paths: [axisPath(0, "settled"), axisPath(1, "settled"), axisPath(2, "idle")], points: [...original, meanPoint, ...projected.map((p) => ({ ...p, state: "settled" as const }))], readouts: [{ label: "固有値", value: lambdaText }, { label: "第1+第2の寄与率", value: `${fixed((ratio[0] + ratio[1]) * 100, 1)}%` }], description: `完了: 3次元を2次元に減らしても、全分散の ${fixed((ratio[0] + ratio[1]) * 100, 1)}% が残る(${lambdaText})` },
  ];
}

export const SCENE3D_ML: Record<string, () => Scene3DFrame[]> = {
  pca: pcaSteps,
};

export const SCENE3D_ML_META: Record<string, Scene3DMeta> = {
  pca: {
    chips: [`${PCA_POINTS}点`, "共分散行列の固有分解", "べき乗法+縮約"],
    camera: { position: [9, 7, 9], target: [1, 1.5, -0.5] },
    axes: { x: "x", y: "y(上)", z: "z" },
    caveat: "点群は固定シードで作った人工データです。固有ベクトルは、符号(向き)が反対でも同じ軸を表します。",
  },
};
