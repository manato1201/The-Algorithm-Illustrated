import {
  fixed,
  makeRng3,
  type Scene3DFrame,
  type Scene3DMeta,
  type Scene3DPath,
  type Scene3DPoint,
  type Vec3,
} from "./scene3d.ts";

/**
 * CG・3Dレンダリング: クォータニオンの補間(slerp と nlerp)、カールノイズの流れ、カスケードシャドウマップの分割を3次元で見せる。
 */

// ===========================================================================
// slerp: 回転を球面上で等しい角速度で補間する(nlerpは途中で速さが変わる)
// ===========================================================================

type Quat = [number, number, number, number]; // [w, x, y, z]

export const SLERP_AXIS: Vec3 = [Math.SQRT1_2, Math.SQRT1_2, 0];
export const SLERP_ANGLE_DEG = 170;
export const SLERP_STEPS = 10;
/** 回転させる「前向きの矢」。その先端が球面を動く。 */
export const SLERP_VECTOR: Vec3 = [0, 0, 1];

export const quatFromAxisAngle = (axis: Vec3, radians: number): Quat => {
  const s = Math.sin(radians / 2);
  return [Math.cos(radians / 2), axis[0] * s, axis[1] * s, axis[2] * s];
};
const quatDot = (a: Quat, b: Quat) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
const quatNormalize = (q: Quat): Quat => {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
};
/** 単位クォータニオン q でベクトル v を回す。 */
export function rotateByQuat(q: Quat, v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  // v' = v + 2w(u×v) + 2u×(u×v)、u=(x,y,z)
  const u: Vec3 = [x, y, z];
  const uv: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const uuv: Vec3 = [u[1] * uv[2] - u[2] * uv[1], u[2] * uv[0] - u[0] * uv[2], u[0] * uv[1] - u[1] * uv[0]];
  return [v[0] + 2 * (w * uv[0] + uuv[0]), v[1] + 2 * (w * uv[1] + uuv[1]), v[2] + 2 * (w * uv[2] + uuv[2])];
}
export function slerp(q0: Quat, q1: Quat, t: number): Quat {
  let end = q1;
  let d = quatDot(q0, q1);
  if (d < 0) {
    end = [-q1[0], -q1[1], -q1[2], -q1[3]];
    d = -d;
  }
  const theta = Math.acos(Math.min(1, d));
  if (theta < 1e-9) return q0;
  const a = Math.sin((1 - t) * theta) / Math.sin(theta);
  const b = Math.sin(t * theta) / Math.sin(theta);
  return [a * q0[0] + b * end[0], a * q0[1] + b * end[1], a * q0[2] + b * end[2], a * q0[3] + b * end[3]];
}
export function nlerp(q0: Quat, q1: Quat, t: number): Quat {
  const end: Quat = quatDot(q0, q1) < 0 ? [-q1[0], -q1[1], -q1[2], -q1[3]] : q1;
  return quatNormalize([
    (1 - t) * q0[0] + t * end[0],
    (1 - t) * q0[1] + t * end[1],
    (1 - t) * q0[2] + t * end[2],
    (1 - t) * q0[3] + t * end[3],
  ]);
}

const angleBetween = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

/** t=0..1 を SLERP_STEPS 等分した各点での、先端の位置(slerp / nlerp)。 */
export function slerpTips(): { t: number; slerp: Vec3; nlerp: Vec3 }[] {
  const q0: Quat = [1, 0, 0, 0];
  const q1 = quatFromAxisAngle(SLERP_AXIS, (SLERP_ANGLE_DEG * Math.PI) / 180);
  return Array.from({ length: SLERP_STEPS + 1 }, (_, k) => {
    const t = k / SLERP_STEPS;
    return { t, slerp: rotateByQuat(slerp(q0, q1, t), SLERP_VECTOR), nlerp: rotateByQuat(nlerp(q0, q1, t), SLERP_VECTOR) };
  });
}

export function slerpSteps(): Scene3DFrame[] {
  const tips = slerpTips();
  const total = (SLERP_ANGLE_DEG * Math.PI) / 180;
  const frames: Scene3DFrame[] = [];
  for (let k = 0; k <= SLERP_STEPS; k++) {
    const upTo = tips.slice(0, k + 1);
    const points: Scene3DPoint[] = upTo.flatMap((tip, i) => [
      { id: `slerp${i}`, position: tip.slerp, state: "settled" as const, size: 1 },
      ...(i === 0 ? [] : [{ id: `nlerp${i}`, position: tip.nlerp, state: "comparing" as const, size: 0.9 }]),
    ]);
    const paths: Scene3DPath[] = k > 0
      ? [
          { id: "slerp-path", points: upTo.map((tip) => tip.slerp), state: "settled" },
          { id: "nlerp-path", points: upTo.map((tip) => tip.nlerp), state: "comparing" },
        ]
      : [];
    const stepSlerp = k > 0 ? angleBetween(tips[k - 1].slerp, tips[k].slerp) : 0;
    const stepNlerp = k > 0 ? angleBetween(tips[k - 1].nlerp, tips[k].nlerp) : 0;
    frames.push({
      kind: k === 0 ? "idle" : k === SLERP_STEPS ? "settled" : "comparing",
      sphere: { radius: 1 },
      paths,
      points,
      readouts:
        k > 0
          ? [
              { label: "t", value: fixed(tips[k].t) },
              { label: "slerpの1ステップの回転角", value: `${fixed((stepSlerp * 180) / Math.PI, 1)}°` },
              { label: "nlerpの1ステップの回転角", value: `${fixed((stepNlerp * 180) / Math.PI, 1)}°` },
            ]
          : [{ label: "全体の回転", value: `${SLERP_ANGLE_DEG}°` }],
      description:
        k === 0
          ? `向きを「前向きの矢」の先端(球面上の点)で表す。単位クォータニオンを ${SLERP_ANGLE_DEG}° 離れた2つの向きの間で補間し、t を ${SLERP_STEPS} 等分した位置を、緑=slerp・黄=nlerp(線形補間して正規化)で比べる`
          : k === SLERP_STEPS
            ? `完了: slerp(緑)は ${SLERP_STEPS} 等分で毎回ほぼ ${fixed(((total / SLERP_STEPS) * 180) / Math.PI, 1)}° ずつ進み、等間隔。nlerp(黄)は両端でゆっくり、中ほどで速くなり、間隔が不揃いになる`
            : `t=${fixed(tips[k].t)}: slerpは ${fixed((stepSlerp * 180) / Math.PI, 1)}°、nlerpは ${fixed((stepNlerp * 180) / Math.PI, 1)}° 進んだ`,
    });
  }
  return frames;
}

// ===========================================================================
// カールノイズ: 発散のない(圧縮しない)流れで粒子を動かす
// ===========================================================================

export const CURL_PARTICLES = 18;
export const CURL_STEPS = 36;
export const CURL_DT = 0.2;
export const CURL_SEED = 31;
export const CURL_BOX = Math.PI;

/**
 * ベクトルポテンシャル ψ = (sin y + cos z, sin z + cos x, sin x + cos y) の回転 v = ∇×ψ。
 * 回転(カール)の発散は必ず0なので、この流れは粒子を一点に集めたり散らしたりしない。
 * 本物のカールノイズはポテンシャルに「ノイズ関数」を使う。ここでは同じ性質を厳密に確かめられるよう、周期関数にしている。
 */
export function curlVelocity(p: Vec3): Vec3 {
  const [x, y, z] = p;
  return [-Math.sin(y) - Math.cos(z), -Math.sin(z) - Math.cos(x), -Math.sin(x) - Math.cos(y)];
}

/** 中点法(2次のルンゲ・クッタ)で1ステップ進める。 */
export function curlStep(p: Vec3, dt = CURL_DT): Vec3 {
  const v1 = curlVelocity(p);
  const mid: Vec3 = [p[0] + 0.5 * dt * v1[0], p[1] + 0.5 * dt * v1[1], p[2] + 0.5 * dt * v1[2]];
  const v2 = curlVelocity(mid);
  return [p[0] + dt * v2[0], p[1] + dt * v2[1], p[2] + dt * v2[2]];
}

export function curlStartPoints(): Vec3[] {
  const rng = makeRng3(CURL_SEED);
  return Array.from({ length: CURL_PARTICLES }, () => [
    (rng() * 2 - 1) * CURL_BOX,
    (rng() * 2 - 1) * CURL_BOX,
    (rng() * 2 - 1) * CURL_BOX,
  ] as Vec3);
}

/** 中心差分で数値的に求めた発散 ∂vx/∂x + ∂vy/∂y + ∂vz/∂z。 */
export function curlDivergence(p: Vec3, h = 1e-4): number {
  const d = (axis: 0 | 1 | 2) => {
    const plus: Vec3 = [...p];
    const minus: Vec3 = [...p];
    plus[axis] += h;
    minus[axis] -= h;
    return (curlVelocity(plus)[axis] - curlVelocity(minus)[axis]) / (2 * h);
  };
  return d(0) + d(1) + d(2);
}

function boxEdges(half: number): Scene3DPath[] {
  const corners: Vec3[] = [];
  for (const x of [-half, half]) for (const y of [-half, half]) for (const z of [-half, half]) corners.push([x, y, z]);
  const edges: Scene3DPath[] = [];
  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      const differing = [0, 1, 2].filter((axis) => corners[i][axis] !== corners[j][axis]).length;
      if (differing === 1) edges.push({ id: `box${i}-${j}`, points: [corners[i], corners[j]], state: "idle" });
    }
  }
  return edges;
}

export function curlNoiseSteps(): Scene3DFrame[] {
  const start = curlStartPoints();
  const trails: Vec3[][] = start.map((p) => [p]);
  for (let k = 0; k < CURL_STEPS; k++) trails.forEach((trail) => trail.push(curlStep(trail[trail.length - 1])));
  const box = boxEdges(CURL_BOX);
  const frames: Scene3DFrame[] = [];
  for (let k = 0; k <= CURL_STEPS; k++) {
    const here = trails.map((trail) => trail[k]);
    const meanSpeed = here.reduce((sum, p) => sum + Math.hypot(...curlVelocity(p)), 0) / here.length;
    const finished = k === CURL_STEPS;
    frames.push({
      kind: k === 0 ? "idle" : finished ? "settled" : "comparing",
      paths: [...box, ...(k > 0 ? trails.map((trail, i) => ({ id: `trail${i}`, points: trail.slice(0, k + 1), state: "comparing" as const })) : [])],
      points: here.map((p, i) => ({ id: `p${i}`, position: p, state: finished ? ("settled" as const) : ("pivot" as const), size: 0.8 })),
      readouts: [
        { label: "時刻", value: fixed(k * CURL_DT) },
        { label: "粒子の平均の速さ", value: fixed(meanSpeed) },
        { label: "発散 ∇·v(数値微分)", value: Math.abs(curlDivergence(here[0])).toExponential(1) },
      ],
      description:
        k === 0
          ? `${CURL_PARTICLES}個の粒子を立方体の中にばらまく。流れは ψ の回転 v = ∇×ψ で、発散が常に0(圧縮しない)`
          : finished
            ? "完了: 粒子は渦を巻くように流れ、一点に集まったり散らばったりしない(発散が0だから)。立方体の外へ出ることもある"
            : `時刻 ${fixed(k * CURL_DT)}: 各粒子を速度 v の向きに中点法で ${CURL_DT} だけ進めた`,
    });
  }
  return frames;
}

// ===========================================================================
// カスケードシャドウマップ: 視錐台を手前ほど細かく分割する
// ===========================================================================

export const CSM_NEAR = 1;
export const CSM_FAR = 40;
export const CSM_CASCADES = 4;
export const CSM_LAMBDA = 0.6;
export const CSM_FOV_DEG = 60;
export const CSM_ASPECT = 16 / 9;

/** 実用的な分割(Parallel-Split Shadow Maps): 対数分割と一様分割を λ で混ぜる。 */
export function csmSplit(i: number, near = CSM_NEAR, far = CSM_FAR, count = CSM_CASCADES, lambda = CSM_LAMBDA): number {
  const logarithmic = near * (far / near) ** (i / count);
  const uniform = near + (i / count) * (far - near);
  return lambda * logarithmic + (1 - lambda) * uniform;
}
export const csmLog = (i: number) => CSM_NEAR * (CSM_FAR / CSM_NEAR) ** (i / CSM_CASCADES);
export const csmUniform = (i: number) => CSM_NEAR + (i / CSM_CASCADES) * (CSM_FAR - CSM_NEAR);

function frustumRect(depth: number): Vec3[] {
  const halfH = depth * Math.tan((CSM_FOV_DEG * Math.PI) / 360);
  const halfW = halfH * CSM_ASPECT;
  return [
    [-halfW, -halfH, depth],
    [halfW, -halfH, depth],
    [halfW, halfH, depth],
    [-halfW, halfH, depth],
  ];
}

export function cascadedShadowMapsSteps(): Scene3DFrame[] {
  const nearRect = frustumRect(CSM_NEAR);
  const farRect = frustumRect(CSM_FAR);
  const edges: Scene3DPath[] = nearRect.map((corner, i) => ({ id: `edge${i}`, points: [corner, farRect[i]], state: "idle" }));
  const frames: Scene3DFrame[] = [];
  for (let c = 0; c <= CSM_CASCADES; c++) {
    const planes: Scene3DPath[] = [];
    for (let j = 0; j <= c; j++) {
      planes.push({ id: `plane${j}`, points: frustumRect(csmSplit(j)), closed: true, state: j === c && c > 0 ? "pivot" : "settled" });
    }
    frames.push({
      kind: c === 0 ? "idle" : c === CSM_CASCADES ? "settled" : "comparing",
      paths: [...edges, ...planes],
      points: [{ id: "camera", position: [0, 0, 0], state: "pivot", size: 1.2 }],
      readouts:
        c === 0
          ? [{ label: "近(near) / 遠(far)", value: `${CSM_NEAR} / ${CSM_FAR}` }]
          : [
              { label: `分割面 C${c}(実用)`, value: fixed(csmSplit(c)) },
              { label: "対数分割", value: fixed(csmLog(c)) },
              { label: "一様分割", value: fixed(csmUniform(c)) },
              { label: `カスケード${c}の奥行き`, value: `${fixed(csmSplit(c - 1))} 〜 ${fixed(csmSplit(c))}` },
            ],
      description:
        c === 0
          ? `カメラ(青い点)の視錐台(近=${CSM_NEAR}・遠=${CSM_FAR})を、奥行きで${CSM_CASCADES}つのカスケードに分ける。手前ほど細かく分けて、近くの影の解像度を保つ`
          : c === CSM_CASCADES
            ? `完了: 分割面は C0=${fixed(csmSplit(0))}, ${Array.from({ length: CSM_CASCADES }, (_, i) => fixed(csmSplit(i + 1))).join(", ")}。手前のカスケードほど奥行きが短く、遠くは長い`
            : `分割面 C${c} = ${CSM_LAMBDA}×対数(${fixed(csmLog(c))}) + ${fixed(1 - CSM_LAMBDA)}×一様(${fixed(csmUniform(c))}) = ${fixed(csmSplit(c))}`,
    });
  }
  return frames;
}

export const SCENE3D_GRAPHICS: Record<string, () => Scene3DFrame[]> = {
  "skeletal-animation-slerp-blending": slerpSteps,
  "curl-noise": curlNoiseSteps,
  "cascaded-shadow-maps": cascadedShadowMapsSteps,
};

export const SCENE3D_GRAPHICS_META: Record<string, Scene3DMeta> = {
  "skeletal-animation-slerp-blending": {
    chips: [`回転 ${SLERP_ANGLE_DEG}°`, `t を ${SLERP_STEPS} 等分`, "緑=slerp / 黄=nlerp"],
    camera: { position: [2.8, 2.2, 3.2], target: [0, 0, 0] },
    axes: { x: "x", y: "y(上)", z: "z" },
    caveat: "骨格アニメーションの1本の関節の向きだけを、球面上の点で表した簡略図です(実際はクォータニオンの4成分で補間します)。",
  },
  "curl-noise": {
    chips: [`粒子 ${CURL_PARTICLES}個`, `時間刻み ${CURL_DT}`, "中点法で積分"],
    camera: { position: [9, 7, 9], target: [0, 0, 0] },
    axes: { x: "x", y: "y(上)", z: "z" },
    caveat: "本物のカールノイズはポテンシャルにノイズ関数を使います。ここでは発散が0であることを確かめやすい周期関数を使った簡略版です。",
  },
  "cascaded-shadow-maps": {
    chips: [`near ${CSM_NEAR} / far ${CSM_FAR}`, `${CSM_CASCADES}カスケード`, `λ=${CSM_LAMBDA}`, `画角 ${CSM_FOV_DEG}°`],
    camera: { position: [30, 22, -8], target: [0, 0, 16] },
    axes: { x: "x(右)", y: "y(上)", z: "z(カメラの向き=奥行き)" },
  },
};
