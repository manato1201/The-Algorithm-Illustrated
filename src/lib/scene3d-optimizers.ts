import {
  fixed,
  surfaceOf,
  type Scene3DFrame,
  type Scene3DMeta,
  type Scene3DPath,
  type Vec3,
} from "./scene3d.ts";

/**
 * 機械学習のオプティマイザ(モーメンタム・RMSProp・AdaGrad・Adam)を、損失の曲面の上を転がる点として3次元で見せる。
 * 損失は、縦長の谷になる2次関数 f(a, b) = ½(1·a² + 10·b²)(b 方向のほうが10倍急)。
 * 勾配降下法がこの谷でジグザグになるところを、各オプティマイザがどう改善するか(または別の癖を持つか)が見える。
 * 3Dの座標は [a, 高さ = LOSS_HEIGHT_SCALE × 損失, b]。高さは見やすくするための縮尺で、損失の値そのものは説明に出す。
 */

export const LOSS_CURVATURE: [number, number] = [1, 10];
export const OPT_START: [number, number] = [4, 1.5];
export const OPT_STEPS = 40;
export const LOSS_HEIGHT_SCALE = 0.25;
export const A_RANGE: [number, number] = [-4.5, 4.5];
export const B_RANGE: [number, number] = [-2, 2];

export const lossAt = (a: number, b: number): number => 0.5 * (LOSS_CURVATURE[0] * a * a + LOSS_CURVATURE[1] * b * b);
export const gradAt = (a: number, b: number): [number, number] => [LOSS_CURVATURE[0] * a, LOSS_CURVATURE[1] * b];
const toScene = (a: number, b: number): Vec3 => [a, LOSS_HEIGHT_SCALE * lossAt(a, b), b];

export type OptimizerId = "momentum-sgd" | "rmsprop" | "adagrad-optimizer" | "adam-optimizer";

export const OPTIMIZER_PARAMS = {
  "momentum-sgd": { lr: 0.02, beta: 0.9 },
  rmsprop: { lr: 0.1, rho: 0.9, eps: 1e-8 },
  "adagrad-optimizer": { lr: 1, eps: 1e-8 },
  "adam-optimizer": { lr: 0.3, beta1: 0.9, beta2: 0.999, eps: 1e-8 },
} as const;

export type OptimizerStep = {
  position: [number, number];
  grad: [number, number];
  /** この反復での更新量(パラメータに足した値)。 */
  delta: [number, number];
  /** オプティマイザが持つ内部の値(モーメンタムの速度・勾配の2乗の平均など)。 */
  memory: [number, number];
};

/** 開始点から OPT_STEPS 回の更新を行った軌跡(添字 0 は開始点で、更新量は 0)。 */
export function optimizerTrajectory(id: OptimizerId): OptimizerStep[] {
  let [a, b] = OPT_START;
  const first = gradAt(a, b);
  const steps: OptimizerStep[] = [{ position: [a, b], grad: first, delta: [0, 0], memory: [0, 0] }];
  let m: [number, number] = [0, 0];
  let v: [number, number] = [0, 0];
  for (let t = 1; t <= OPT_STEPS; t++) {
    const g = gradAt(a, b);
    let delta: [number, number];
    let memory: [number, number];
    if (id === "momentum-sgd") {
      const { lr, beta } = OPTIMIZER_PARAMS["momentum-sgd"];
      m = [beta * m[0] + g[0], beta * m[1] + g[1]];
      delta = [-lr * m[0], -lr * m[1]];
      memory = [m[0], m[1]];
    } else if (id === "rmsprop") {
      const { lr, rho, eps } = OPTIMIZER_PARAMS.rmsprop;
      v = [rho * v[0] + (1 - rho) * g[0] ** 2, rho * v[1] + (1 - rho) * g[1] ** 2];
      delta = [(-lr * g[0]) / (Math.sqrt(v[0]) + eps), (-lr * g[1]) / (Math.sqrt(v[1]) + eps)];
      memory = [v[0], v[1]];
    } else if (id === "adagrad-optimizer") {
      const { lr, eps } = OPTIMIZER_PARAMS["adagrad-optimizer"];
      v = [v[0] + g[0] ** 2, v[1] + g[1] ** 2];
      delta = [(-lr * g[0]) / (Math.sqrt(v[0]) + eps), (-lr * g[1]) / (Math.sqrt(v[1]) + eps)];
      memory = [v[0], v[1]];
    } else {
      const { lr, beta1, beta2, eps } = OPTIMIZER_PARAMS["adam-optimizer"];
      m = [beta1 * m[0] + (1 - beta1) * g[0], beta1 * m[1] + (1 - beta1) * g[1]];
      v = [beta2 * v[0] + (1 - beta2) * g[0] ** 2, beta2 * v[1] + (1 - beta2) * g[1] ** 2];
      const mHat = [m[0] / (1 - beta1 ** t), m[1] / (1 - beta1 ** t)];
      const vHat = [v[0] / (1 - beta2 ** t), v[1] / (1 - beta2 ** t)];
      delta = [(-lr * mHat[0]) / (Math.sqrt(vHat[0]) + eps), (-lr * mHat[1]) / (Math.sqrt(vHat[1]) + eps)];
      memory = [m[0], m[1]];
    }
    a += delta[0];
    b += delta[1];
    steps.push({ position: [a, b], grad: gradAt(a, b), delta, memory });
  }
  return steps;
}

const MEMORY_LABEL: Record<OptimizerId, string> = {
  "momentum-sgd": "速度 v(勾配を溜めたもの)",
  rmsprop: "勾配²の移動平均 s",
  "adagrad-optimizer": "勾配²の累計 G",
  "adam-optimizer": "一次モーメント m",
};

const UPDATE_TEXT: Record<OptimizerId, string> = {
  "momentum-sgd": "v ← β·v + g、θ ← θ − η·v(過去の勾配を速度として溜め、谷の向きに加速する)",
  rmsprop: "s ← ρ·s + (1−ρ)·g²、θ ← θ − η·g/√s(急な軸ほど歩幅を小さくする)",
  "adagrad-optimizer": "G ← G + g²、θ ← θ − η·g/√G(これまでの勾配²の累計で割る。歩幅は単調に縮む)",
  "adam-optimizer": "m, v を移動平均して偏りを補正し、θ ← θ − η·m̂/√v̂(モーメンタムとRMSPropの合わせ技)",
};

export const OPTIMIZER_CHIPS: Record<OptimizerId, string[]> = {
  "momentum-sgd": [`学習率 η=${OPTIMIZER_PARAMS["momentum-sgd"].lr}`, `β=${OPTIMIZER_PARAMS["momentum-sgd"].beta}`],
  rmsprop: [`学習率 η=${OPTIMIZER_PARAMS.rmsprop.lr}`, `ρ=${OPTIMIZER_PARAMS.rmsprop.rho}`],
  "adagrad-optimizer": [`学習率 η=${OPTIMIZER_PARAMS["adagrad-optimizer"].lr}`],
  "adam-optimizer": [
    `学習率 η=${OPTIMIZER_PARAMS["adam-optimizer"].lr}`,
    `β1=${OPTIMIZER_PARAMS["adam-optimizer"].beta1}`,
    `β2=${OPTIMIZER_PARAMS["adam-optimizer"].beta2}`,
  ],
};

function framesFor(id: OptimizerId): Scene3DFrame[] {
  const trajectory = optimizerTrajectory(id);
  const surface = surfaceOf((a, b) => LOSS_HEIGHT_SCALE * lossAt(a, b), A_RANGE, B_RANGE, 25, 17);
  const minimum = { id: "minimum", position: toScene(0, 0) as Vec3, state: "settled" as const, size: 1.3 };
  const make = (k: number, kind: Scene3DFrame["kind"], description: string): Scene3DFrame => {
    const upTo = trajectory.slice(0, k + 1);
    const here = upTo[upTo.length - 1];
    const path: Scene3DPath = { id: "trajectory", points: upTo.map((s) => toScene(s.position[0], s.position[1])), state: "comparing" };
    const loss = lossAt(here.position[0], here.position[1]);
    return {
      kind,
      surface,
      paths: k > 0 ? [path] : [],
      points: [minimum, { id: "current", position: toScene(here.position[0], here.position[1]), state: kind === "settled" ? "settled" : "pivot", size: 1.2 }],
      readouts: [
        { label: "パラメータ (a, b)", value: `(${fixed(here.position[0])}, ${fixed(here.position[1])})` },
        { label: "損失", value: fixed(loss) },
        ...(k > 0
          ? [
              { label: "勾配 g", value: `(${fixed(trajectory[k - 1].grad[0])}, ${fixed(trajectory[k - 1].grad[1])})` },
              { label: "更新量", value: `(${fixed(here.delta[0])}, ${fixed(here.delta[1])})` },
              { label: MEMORY_LABEL[id], value: `(${fixed(here.memory[0])}, ${fixed(here.memory[1])})` },
            ]
          : []),
      ],
      description,
    };
  };
  const frames: Scene3DFrame[] = [
    make(0, "idle", `損失の曲面(縦長の谷。b方向のほうが10倍急)の上、開始点(${OPT_START.join(", ")})から出発する。底(緑の立方体)が最小点。${UPDATE_TEXT[id]}`),
  ];
  for (let k = 1; k <= OPT_STEPS; k++) {
    const s = trajectory[k];
    frames.push(make(k, k === OPT_STEPS ? "settled" : "comparing", `第${k}反復: 更新量(${fixed(s.delta[0])}, ${fixed(s.delta[1])})だけ動いて、損失は ${fixed(lossAt(s.position[0], s.position[1]))}${k === OPT_STEPS ? `。${OPT_STEPS}回で到達した位置(最小点は (0, 0))` : ""}`));
  }
  return frames;
}

export const SCENE3D_OPTIMIZERS: Record<string, () => Scene3DFrame[]> = {
  "momentum-sgd": () => framesFor("momentum-sgd"),
  rmsprop: () => framesFor("rmsprop"),
  "adagrad-optimizer": () => framesFor("adagrad-optimizer"),
  "adam-optimizer": () => framesFor("adam-optimizer"),
};

const OPTIMIZER_META_BASE: Omit<Scene3DMeta, "chips"> = {
  camera: { position: [12, 9, 12], target: [0, 2.2, 0] },
  axes: { x: "パラメータ a", y: "損失(高さは見やすい縮尺)", z: "パラメータ b" },
  caveat: "損失は2次関数の谷という最も単純な例です。実際のニューラルネットの損失は、もっと凹凸があり、次元も桁違いに多くなります。",
};

export const SCENE3D_OPTIMIZER_META: Record<string, Scene3DMeta> = Object.fromEntries(
  (Object.keys(OPTIMIZER_CHIPS) as OptimizerId[]).map((id) => [
    id,
    { ...OPTIMIZER_META_BASE, chips: ["損失 ½(a² + 10b²)", `開始点 (${OPT_START.join(", ")})`, `${OPT_STEPS}回の更新`, ...OPTIMIZER_CHIPS[id]] },
  ]),
);
