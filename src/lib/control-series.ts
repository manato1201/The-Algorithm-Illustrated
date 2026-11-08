import { makeRng, round, type SignalFrame, type SignalMeta } from "./signal-math.ts";
import { rangeOf, seriesFrames, type SeriesSpec } from "./series-frames.ts";

/**
 * 制御・ロボティクス: PID制御・Bang-bang制御・相補フィルタ・カルマンフィルタ(1次元)・最小躍度軌道を、
 * 時刻を1つずつ進める時系列のパネルで見せる(信号kindのパネル列を流用)。
 * 制御対象(プラント)やセンサの雑音は、考え方を示すための簡単なモデル(固定シードの擬似乱数)で、実機の応答ではない。
 */

// ===========================================================================
// PID制御: 目標との差(誤差)から、P・I・Dの3つの項を足して操作量を決める
// ===========================================================================

export const PID_GAINS = { kp: 3, ki: 0.5, kd: 1 };
export const PID_STEPS = 60;
export const PID_SETPOINT = 1;
/** 制御対象: 1次遅れ y[k+1] = a·y[k] + b·u[k](直流ゲイン b/(1−a) = 1)。 */
export const PID_PLANT = { a: 0.9, b: 0.1 };

export type PidRun = { y: number[]; e: number[]; u: number[]; p: number[]; i: number[]; d: number[] };

/** kp, ki, kd を指定してシミュレーションする(積分・微分の項を0にすれば P 制御などを試せる)。 */
export function pidSimulation(gains = PID_GAINS, steps = PID_STEPS): PidRun {
  const run: PidRun = { y: [], e: [], u: [], p: [], i: [], d: [] };
  let y = 0;
  let integral = 0;
  let previousError = PID_SETPOINT;
  for (let k = 0; k < steps; k++) {
    const e = PID_SETPOINT - y;
    integral += e;
    const derivative = e - previousError;
    previousError = e;
    const p = gains.kp * e;
    const i = gains.ki * integral;
    const d = gains.kd * derivative;
    const u = p + i + d;
    run.y.push(y);
    run.e.push(e);
    run.u.push(u);
    run.p.push(p);
    run.i.push(i);
    run.d.push(d);
    y = PID_PLANT.a * y + PID_PLANT.b * u;
  }
  return run;
}

export function pidControlSteps(): SignalFrame[] {
  const run = pidSimulation();
  const series: SeriesSpec[] = [
    { id: "y", title: "出力 y(目標 r=1 に近づく)", role: "state", values: run.y, reference: run.y.map(() => PID_SETPOINT), range: rangeOf(run.y, 0.1, [0, PID_SETPOINT]) },
    { id: "e", title: "誤差 e = r − y", role: "input", values: run.e, range: rangeOf(run.e, 0.1, [0]) },
    {
      id: "terms",
      title: "P・I・D の各項(Kp·e, Ki·Σe, Kd·Δe)",
      role: "state",
      style: "stem",
      xLabel: "P  I  D",
      range: rangeOf([...run.p, ...run.i, ...run.d], 0.1, [0]),
      snapshots: run.p.map((_, k) => [run.p[k], run.i[k], run.d[k]]),
    },
    { id: "u", title: "操作量 u = P + I + D", role: "output", values: run.u, range: rangeOf(run.u, 0.1, [0]) },
  ];
  return seriesFrames({
    series,
    texts: run.y.map((y, k) => `時刻${k}: 誤差 ${round(run.e[k], 3)} → P ${round(run.p[k], 2)} + I ${round(run.i[k], 2)} + D ${round(run.d[k], 2)} = 操作量 ${round(run.u[k], 2)}。出力は ${round(y, 3)}`),
    startText: `目標 r=${PID_SETPOINT} に向けて、制御対象(1次遅れ)を動かす。Kp=${PID_GAINS.kp}・Ki=${PID_GAINS.ki}・Kd=${PID_GAINS.kd}。誤差から、現在(P)・過去の積み重ね(I)・変化の勢い(D)の3つで操作量を決める`,
    endText: `完了: 出力が ${round(Math.max(...run.y), 3)} まで少し行き過ぎてから、目標 ${PID_SETPOINT} に収束した(最終 ${round(run.y[run.y.length - 1], 4)})。Iの項があるので、残る誤差が0になる`,
  });
}

// ===========================================================================
// Bang-bang制御(ヒステリシス付きのサーモスタット): 上限で切り、下限で入れる
// ===========================================================================

export const THERMOSTAT = { ambient: 10, setpoint: 20, band: 1, heat: 2.5, leak: 0.15, steps: 50, start: 12 };

export type ThermostatRun = { temp: number[]; heater: number[] };

export function thermostatSimulation(): ThermostatRun {
  const { ambient, setpoint, band, heat, leak, steps, start } = THERMOSTAT;
  const run: ThermostatRun = { temp: [], heater: [] };
  let t = start;
  let on = false;
  for (let k = 0; k < steps; k++) {
    if (t < setpoint - band) on = true;
    else if (t > setpoint + band) on = false;
    run.temp.push(t);
    run.heater.push(on ? 1 : 0);
    t = t + leak * (ambient - t) + (on ? heat : 0);
  }
  return run;
}

export function bangBangControlSteps(): SignalFrame[] {
  const run = thermostatSimulation();
  const { setpoint, band } = THERMOSTAT;
  const series: SeriesSpec[] = [
    { id: "temp", title: `温度(目標 ${setpoint}℃ の ±${band}℃ の幅で保つ)`, role: "state", values: run.temp, reference: run.temp.map(() => setpoint), range: rangeOf(run.temp, 0.1, [setpoint]) },
    { id: "heater", title: "ヒーター(1=入, 0=切)", role: "output", style: "stem", values: run.heater, range: [-0.15, 1.15] },
  ];
  return seriesFrames({
    series,
    texts: run.temp.map((t, k) => {
      const changed = k > 0 && run.heater[k] !== run.heater[k - 1];
      return `時刻${k}: 温度 ${round(t, 1)}℃。${changed ? (run.heater[k] === 1 ? `下限 ${setpoint - band}℃ を下回ったのでヒーターを入れる` : `上限 ${setpoint + band}℃ を上回ったのでヒーターを切る`) : run.heater[k] === 1 ? "ヒーターは入ったまま(上限までは切らない)" : "ヒーターは切れたまま(下限までは入れない)"}`;
    }),
    startText: `室温 10℃ の部屋を ${setpoint}℃ に保つ。「入/切」の2択だけで、下限(${setpoint - band}℃)で入れ、上限(${setpoint + band}℃)で切る。幅(ヒステリシス)を持たせて、頻繁な切り替えを防ぐ`,
    endText: `完了: 温度は目標の周りを ${round(Math.min(...run.temp.slice(10)), 1)}〜${round(Math.max(...run.temp.slice(10)), 1)}℃ で上下し続ける(切り替え ${run.heater.reduce((n, h, k) => n + (k > 0 && h !== run.heater[k - 1] ? 1 : 0), 0)}回)。細かくは合わせられないが、単純で壊れにくい`,
  });
}

// ===========================================================================
// 相補フィルタ: ジャイロ(速いが漂う)と加速度計(遅くて雑音が大きいが漂わない)を混ぜる
// ===========================================================================

export const COMPLEMENTARY = { steps: 80, dt: 0.1, alpha: 0.97, accelNoise: 15, gyroBias: 2, gyroNoise: 1, seed: 5, amplitude: 30, period: 8 };

export type ComplementaryRun = { truth: number[]; accel: number[]; gyroIntegral: number[]; fused: number[] };

export function complementarySimulation(): ComplementaryRun {
  const { steps, dt, alpha, accelNoise, gyroBias, gyroNoise, seed, amplitude, period } = COMPLEMENTARY;
  const rng = makeRng(seed);
  const run: ComplementaryRun = { truth: [], accel: [], gyroIntegral: [], fused: [] };
  let gyro = 0;
  let fused = 0;
  for (let k = 0; k < steps; k++) {
    const t = k * dt;
    const truth = amplitude * Math.sin((2 * Math.PI * t) / period);
    const rate = amplitude * ((2 * Math.PI) / period) * Math.cos((2 * Math.PI * t) / period);
    const accel = truth + accelNoise * (rng() * 2 - 1);
    const measuredRate = rate + gyroBias + gyroNoise * (rng() * 2 - 1);
    gyro += measuredRate * dt;
    fused = k === 0 ? accel : alpha * (fused + measuredRate * dt) + (1 - alpha) * accel;
    run.truth.push(truth);
    run.accel.push(accel);
    run.gyroIntegral.push(gyro);
    run.fused.push(fused);
  }
  return run;
}

export function complementaryFilterSteps(): SignalFrame[] {
  const run = complementarySimulation();
  const range = rangeOf([...run.truth, ...run.accel, ...run.gyroIntegral, ...run.fused], 0.08);
  const { alpha, dt } = COMPLEMENTARY;
  const series: SeriesSpec[] = [
    { id: "accel", title: "加速度計の角度(雑音が大きい)", role: "input", values: run.accel, reference: run.truth, range },
    { id: "gyro", title: "ジャイロの積分(漂う)", role: "input", values: run.gyroIntegral, reference: run.truth, range },
    { id: "fused", title: `合成 θ̂ = ${alpha}·(θ̂ + 角速度·Δt) + ${round(1 - alpha, 2)}·加速度計`, role: "output", values: run.fused, reference: run.truth, range },
  ];
  const rms = (values: number[]) => Math.sqrt(values.reduce((s, v, i) => s + (v - run.truth[i]) ** 2, 0) / values.length);
  return seriesFrames({
    series,
    texts: run.fused.map((f, k) => `時刻${round(k * dt, 1)}秒: 加速度計 ${round(run.accel[k], 1)}°、ジャイロ積分 ${round(run.gyroIntegral[k], 1)}° → 合成 ${round(f, 1)}°(真の角度 ${round(run.truth[k], 1)}°)`),
    startText: `傾きを推定する。加速度計は雑音が大きく、ジャイロは積分すると漂う。短い時間はジャイロを信じ、長い時間は加速度計に引き戻して混ぜる(薄い線が真の角度)`,
    endText: `完了: 真の角度との平均的なずれ(RMS)は 加速度計 ${round(rms(run.accel), 1)}°・ジャイロ積分 ${round(rms(run.gyroIntegral), 1)}° に対して、合成 ${round(rms(run.fused), 1)}°。それぞれの欠点を打ち消し合っている`,
  });
}

// ===========================================================================
// カルマンフィルタ(1次元): 予測と測定を、不確かさで重みづけして混ぜる
// ===========================================================================

export const KALMAN = { steps: 40, truth: 5, measurementNoise: 1, q: 0.01, r: 1, seed: 12 };

export type KalmanRun = { z: number[]; estimate: number[]; gain: number[]; variance: number[] };

export function kalmanSimulation(): KalmanRun {
  const { steps, truth, measurementNoise, q, r, seed } = KALMAN;
  const rng = makeRng(seed);
  const run: KalmanRun = { z: [], estimate: [], gain: [], variance: [] };
  let x = 0;
  let p = 10;
  for (let k = 0; k < steps; k++) {
    // 測定値: 真の値 + 一様乱数の雑音(±√3·σ の一様分布の分散がちょうど σ² で、フィルタに渡す測定ノイズ分散 R と一致する)
    const z = truth + measurementNoise * (rng() * 2 - 1) * Math.sqrt(3);
    const priorP = p + q;
    const gain = priorP / (priorP + r);
    x = x + gain * (z - x);
    p = (1 - gain) * priorP;
    run.z.push(z);
    run.estimate.push(x);
    run.gain.push(gain);
    run.variance.push(p);
  }
  return run;
}

export function kalmanFilterSteps(): SignalFrame[] {
  const run = kalmanSimulation();
  const { truth } = KALMAN;
  const valueRange = rangeOf([...run.z, ...run.estimate], 0.1, [truth, 0]);
  const series: SeriesSpec[] = [
    { id: "z", title: "測定値 z(雑音あり。薄い線が真の値)", role: "input", values: run.z, reference: run.z.map(() => truth), range: valueRange },
    { id: "x", title: "推定値 x̂", role: "output", values: run.estimate, reference: run.z.map(() => truth), range: valueRange },
    { id: "k", title: "カルマンゲイン K(測定をどれだけ信じるか)", role: "state", values: run.gain, range: [0, 1] },
    { id: "p", title: "推定の不確かさ P(分散)", role: "state", values: run.variance, range: rangeOf(run.variance, 0.1, [0]) },
  ];
  return seriesFrames({
    series,
    texts: run.z.map((z, k) => `時刻${k}: 測定 ${round(z, 2)}。ゲイン K=${round(run.gain[k], 3)}(${run.gain[k] > 0.5 ? "まだ不確かなので測定を強く取り込む" : "推定が安定してきたので測定の影響は小さい"})→ 推定 ${round(run.estimate[k], 3)}、不確かさ P=${round(run.variance[k], 3)}`),
    startText: `一定の値(真の値 ${truth})を、雑音の入った測定から推定する。最初の推定は 0 で不確かさが大きい。測定のたびに「予測と測定のどちらをどれだけ信じるか」(ゲイン K)を、不確かさから計算して更新する`,
    endText: `完了: 推定 ${round(run.estimate[run.estimate.length - 1], 3)}(真の値 ${truth})。ゲイン K が ${round(run.gain[0], 2)} から ${round(run.gain[run.gain.length - 1], 3)} へ下がり、不確かさ P は定常値に落ち着いた`,
  });
}

// ===========================================================================
// 最小躍度軌道: 始点と終点で速度・加速度が0になる、なめらかな5次多項式
// ===========================================================================

export const MIN_JERK = { x0: 0, xf: 1, duration: 1, steps: 40 };

export function minimumJerk(tau: number): { x: number; v: number; a: number } {
  const { x0, xf, duration } = MIN_JERK;
  const d = xf - x0;
  return {
    x: x0 + d * (10 * tau ** 3 - 15 * tau ** 4 + 6 * tau ** 5),
    v: (d * (30 * tau ** 2 - 60 * tau ** 3 + 30 * tau ** 4)) / duration,
    a: (d * (60 * tau - 180 * tau ** 2 + 120 * tau ** 3)) / duration ** 2,
  };
}

export function minimumJerkTrajectorySteps(): SignalFrame[] {
  const { steps } = MIN_JERK;
  const samples = Array.from({ length: steps + 1 }, (_, k) => minimumJerk(k / steps));
  const x = samples.map((s) => s.x);
  const v = samples.map((s) => s.v);
  const a = samples.map((s) => s.a);
  const series: SeriesSpec[] = [
    { id: "x", title: "位置 x(0 → 1)", role: "output", values: x, range: rangeOf(x, 0.1, [0, 1]) },
    { id: "v", title: "速度 v(両端で0)", role: "state", values: v, range: rangeOf(v, 0.1, [0]) },
    { id: "a", title: "加速度 a(両端で0)", role: "state", values: a, range: rangeOf(a, 0.1, [0]) },
  ];
  return seriesFrames({
    series,
    texts: samples.map((s, k) => `τ=${round(k / steps, 3)}: 位置 ${round(s.x, 3)}、速度 ${round(s.v, 3)}、加速度 ${round(s.a, 3)}`),
    startText: "始点から終点まで、なめらかに動かす軌道。位置を x = 10τ³ − 15τ⁴ + 6τ⁵(τ = 時刻/所要時間)にすると、始点と終点で速度も加速度も0になり、躍度(加速度の変化)の2乗の合計が最小になる",
    endText: `完了: 速度は中央で最大 ${round(Math.max(...v), 3)}(= 1.875)、両端では0。加速度も両端で0なので、動き出しと停止で衝撃が出ない`,
  });
}

export const CONTROL_SERIES_VISUALIZERS: Record<string, () => SignalFrame[]> = {
  "pid-control": pidControlSteps,
  "bang-bang-control": bangBangControlSteps,
  "complementary-filter": complementaryFilterSteps,
  "kalman-filter": kalmanFilterSteps,
  "minimum-jerk-trajectory": minimumJerkTrajectorySteps,
};

export const CONTROL_SERIES_META: Record<string, SignalMeta> = {
  "pid-control": { chips: [`Kp=${PID_GAINS.kp}`, `Ki=${PID_GAINS.ki}`, `Kd=${PID_GAINS.kd}`, "制御対象: 1次遅れ", `${PID_STEPS}ステップ`] },
  "bang-bang-control": { chips: [`目標 ${THERMOSTAT.setpoint}℃`, `幅 ±${THERMOSTAT.band}℃`, `室温 ${THERMOSTAT.ambient}℃`, "ヒステリシス付き"] },
  "complementary-filter": { chips: [`α=${COMPLEMENTARY.alpha}`, `加速度計の雑音 ±${COMPLEMENTARY.accelNoise}°`, `ジャイロの偏り ${COMPLEMENTARY.gyroBias}°/秒`, "擬似乱数(固定シード)"] },
  "kalman-filter": { chips: [`真の値 ${KALMAN.truth}`, `測定ノイズ分散 R=${KALMAN.r}`, `プロセスノイズ Q=${KALMAN.q}`, "1次元"] },
  "minimum-jerk-trajectory": { chips: ["0 → 1", "所要時間 1", "5次多項式", `${MIN_JERK.steps}分割`] },
};
