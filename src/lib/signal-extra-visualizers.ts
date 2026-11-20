import { makeRng, round, type SignalFrame, type SignalMeta } from "./signal-math.ts";
import { rangeOf, seriesFrames, type SeriesSpec } from "./series-frames.ts";

/**
 * 信号kindの可視化のうち、signal-visualizers.ts の外に置いたもの(同ファイルが展開して SIGNAL_VISUALIZERS / SIGNAL_META に登録する)。
 * 時刻を1つずつ進める時系列(seriesFrames のパネル列)で見せる。
 *  - メディアンフィルタ: 階段状の信号に混ざった外れ値を、移動平均とメディアンで比べる
 *  - α-βフィルタ(制御・ロボティクスの状態推定): 位置と速度の追跡
 *  - ゲルツェルのアルゴリズム: DTMFの8周波数のパワーを漸化式で求める
 *  - FM合成: キャリアの位相をモジュレータで揺らし、側波帯を作る
 */

// ===========================================================================
// メディアンフィルタ(窓幅5)
// ===========================================================================

export const MEDIAN_WINDOW = 5;
export const MEDIAN_LENGTH = 40;
/** 外れ値の位置と大きさ(階段状の元の信号に足す)。 */
export const MEDIAN_SPIKES: Record<number, number> = { 5: 7, 12: -3, 24: -5, 31: 6 };

/** 外れ値の無い、階段状の元の信号(k=20 で 1 から 5 へ)。 */
export const medianClean = (): number[] => Array.from({ length: MEDIAN_LENGTH }, (_, k) => (k < 20 ? 1 : 5));
export const medianInput = (): number[] => medianClean().map((v, k) => v + (MEDIAN_SPIKES[k] ?? 0));

/** 窓に入る値。端は端の値を繰り返す。 */
export function medianWindow(signal: readonly number[], k: number, width = MEDIAN_WINDOW): number[] {
  const half = Math.floor(width / 2);
  return Array.from({ length: width }, (_, t) => signal[Math.min(Math.max(k - half + t, 0), signal.length - 1)]);
}

export function medianOutputs(signal: readonly number[], width = MEDIAN_WINDOW): { median: number[]; mean: number[] } {
  const median = signal.map((_, k) => [...medianWindow(signal, k, width)].sort((a, b) => a - b)[Math.floor(width / 2)]);
  const mean = signal.map((_, k) => medianWindow(signal, k, width).reduce((a, b) => a + b, 0) / width);
  return { median, mean };
}

export function medianFilterSteps(): SignalFrame[] {
  const input = medianInput();
  const clean = medianClean();
  const { median, mean } = medianOutputs(input);
  const series: SeriesSpec[] = [
    { id: "x", title: "入力(階段状の信号に、外れ値が4つ混ざっている)", role: "input", style: "stem", values: input, reference: clean, range: rangeOf(input, 0.1, [0]) },
    { id: "mean", title: "移動平均(窓5): 外れ値が周囲に広がり、階段もなまる", role: "state", values: mean, reference: clean, range: rangeOf(input, 0.1, [0]) },
    { id: "median", title: "メディアン(窓5): 外れ値が消え、階段は鋭いまま", role: "output", values: median, reference: clean, range: rangeOf(input, 0.1, [0]) },
  ];
  return seriesFrames({
    series,
    texts: input.map((_, k) => {
      const w = medianWindow(input, k);
      const sorted = [...w].sort((a, b) => a - b);
      return `時刻${k}: 窓 [${w.join(", ")}] を並べると [${sorted.join(", ")}] → 中央値 ${median[k]}(平均なら ${round(mean[k], 1)})`;
    }),
    startText: `窓幅${MEDIAN_WINDOW}で、各時刻を「窓の値を並べた真ん中の値」で置き換える。移動平均は外れ値に引きずられるが、中央値は端に追いやられた外れ値の影響を受けない`,
    endText: `完了: メディアンの出力は、外れ値をすべて除いた元の階段(点線)と完全に一致した。移動平均は、外れ値の周りを ${round(Math.max(...mean.map((m, k) => Math.abs(m - clean[k]))), 1)} までずらし、階段の角もなまらせている`,
  });
}

// ===========================================================================
// α-βフィルタ: 位置と速度を、予測と測定の差(残差)の一部で補正する(等速で動く対象の追跡)
// ===========================================================================

export const ALPHA_BETA = { steps: 60, dt: 1, alpha: 0.5, beta: 0.2, velocity: 2, noise: 3, seed: 21 };

export type AlphaBetaRun = { truth: number[]; z: number[]; predicted: number[]; residual: number[]; x: number[]; v: number[] };

/** 標準正規分布の乱数(Box-Muller。固定シードの一様乱数から)。 */
function gaussian(rng: () => number): number {
  return Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
}

export function alphaBetaSimulation(): AlphaBetaRun {
  const { steps, dt, alpha, beta, velocity, noise, seed } = ALPHA_BETA;
  const rng = makeRng(seed);
  const run: AlphaBetaRun = { truth: [], z: [], predicted: [], residual: [], x: [], v: [] };
  let x = 0;
  let v = 0;
  for (let k = 0; k < steps; k++) {
    const truth = velocity * k * dt;
    const z = truth + noise * gaussian(rng);
    const predicted = x + v * dt;
    const residual = z - predicted;
    x = predicted + alpha * residual;
    v = v + (beta / dt) * residual;
    run.truth.push(truth);
    run.z.push(z);
    run.predicted.push(predicted);
    run.residual.push(residual);
    run.x.push(x);
    run.v.push(v);
  }
  return run;
}

export function alphaBetaFilterSteps(): SignalFrame[] {
  const run = alphaBetaSimulation();
  const { alpha, beta, velocity, dt } = ALPHA_BETA;
  const posRange = rangeOf([...run.z, ...run.x, ...run.truth], 0.08);
  const series: SeriesSpec[] = [
    { id: "z", title: "測定値 z(雑音あり。薄い線が真の位置)", role: "input", values: run.z, reference: run.truth, range: posRange },
    { id: "x", title: `推定の位置 x̂(α=${alpha})`, role: "output", values: run.x, reference: run.truth, range: posRange },
    { id: "v", title: `推定の速度 v̂(β=${beta}。薄い線が真の速度 ${velocity})`, role: "state", values: run.v, reference: run.v.map(() => velocity), range: rangeOf(run.v, 0.1, [0, velocity]) },
  ];
  const rms = (values: number[], from = 10) => Math.sqrt(values.slice(from).reduce((s, a, i) => s + (a - run.truth[i + from]) ** 2, 0) / (values.length - from));
  return seriesFrames({
    series,
    texts: run.z.map((z, k) => `時刻${k}: 予測 ${round(run.predicted[k], 1)}、測定 ${round(z, 1)} → 残差 ${round(run.residual[k], 1)}。位置は残差の ${alpha} 倍だけ、速度は ${beta}/Δt 倍だけ補正 → x̂=${round(run.x[k], 1)}、v̂=${round(run.v[k], 2)}`),
    startText: `等速(速度${velocity})で動く対象を、雑音のある位置の測定から追跡する。「前の推定から予測 → 測定との差(残差)の一部で位置と速度を補正」を毎回繰り返す。係数は α=${alpha}・β=${beta} の固定`,
    endText: `完了: 真の位置とのずれ(RMS、10ステップ以降)は、測定値の ${round(rms(run.z), 2)} に対して推定 ${round(rms(run.x), 2)}。速度は ${round(run.v[run.v.length - 1], 2)}(真の値 ${velocity})付近を推定している。Δt=${dt}`,
  });
}

// ===========================================================================
// ゲルツェルのアルゴリズム: DTMF「5」(770Hz+1336Hz)の8つの周波数のパワーを、漸化式だけで求める
// ===========================================================================

export const GOERTZEL = {
  fs: 8000,
  n: 205,
  rows: [697, 770, 852, 941],
  cols: [1209, 1336, 1477, 1633],
  toneRow: 770,
  toneCol: 1336,
  keys: ["123A", "456B", "789C", "*0#D"],
};
export const GOERTZEL_FREQS = [...GOERTZEL.rows, ...GOERTZEL.cols];

export const goertzelInput = (): number[] =>
  Array.from({ length: GOERTZEL.n }, (_, i) =>
    Math.sin((2 * Math.PI * GOERTZEL.toneRow * i) / GOERTZEL.fs) + Math.sin((2 * Math.PI * GOERTZEL.toneCol * i) / GOERTZEL.fs),
  );

export const goertzelCoeff = (freq: number): number => 2 * Math.cos((2 * Math.PI * ((freq * GOERTZEL.n) / GOERTZEL.fs)) / GOERTZEL.n);

export type GoertzelRun = {
  input: number[];
  /** 周波数ごと・時刻ごとの状態 s[n](漸化式の出力)。 */
  states: number[][];
  /** 時刻ごと・周波数ごとの「いま止めたときの」パワー s1² + s2² − coeff·s1·s2。 */
  powers: number[][];
};

export function goertzelRun(): GoertzelRun {
  const input = goertzelInput();
  const states = GOERTZEL_FREQS.map(() => [] as number[]);
  const powers: number[][] = input.map(() => []);
  GOERTZEL_FREQS.forEach((freq, f) => {
    const coeff = goertzelCoeff(freq);
    let s1 = 0;
    let s2 = 0;
    input.forEach((x, n) => {
      const s = x + coeff * s1 - s2;
      s2 = s1;
      s1 = s;
      states[f].push(s);
      powers[n].push(s1 * s1 + s2 * s2 - coeff * s1 * s2);
    });
  });
  return { input, states, powers };
}

export function goertzelAlgorithmSteps(): SignalFrame[] {
  const { input, states, powers } = goertzelRun();
  const iRow = GOERTZEL.rows.indexOf(GOERTZEL.toneRow);
  const iCol = GOERTZEL.cols.indexOf(GOERTZEL.toneCol) + 4;
  const maxPower = Math.max(...powers.flat());
  const series: SeriesSpec[] = [
    { id: "x", title: "入力(770Hz と 1336Hz の合成音。DTMFの「5」)", role: "input", style: "stem", values: input, range: rangeOf(input, 0.1, [0]) },
    { id: "s770", title: `770Hz の状態 s[n] = x[n] + ${round(goertzelCoeff(770), 3)}·s[n−1] − s[n−2]`, role: "state", values: states[iRow], range: rangeOf(states[iRow], 0.1, [0]) },
    { id: "s1336", title: `1336Hz の状態 s[n](係数 ${round(goertzelCoeff(1336), 3)})`, role: "state", values: states[iCol], range: rangeOf(states[iCol], 0.1, [0]) },
    {
      id: "power",
      title: "いま止めたときのパワー(左4本=行の周波数、右4本=列の周波数)",
      role: "output",
      style: "stem",
      xLabel: GOERTZEL_FREQS.join(" ・ "),
      labels: GOERTZEL_FREQS.map(String),
      range: [0, maxPower * 1.05],
      snapshots: powers,
    },
  ];
  const finalPowers = powers[powers.length - 1];
  const rowBest = finalPowers.slice(0, 4).indexOf(Math.max(...finalPowers.slice(0, 4)));
  const colBest = finalPowers.slice(4).indexOf(Math.max(...finalPowers.slice(4)));
  return seriesFrames({
    series,
    texts: input.map((x, n) => `サンプル${n}: x=${round(x, 2)} → 770Hz の状態 ${round(states[iRow][n], 2)}、1336Hz の状態 ${round(states[iCol][n], 2)}(8個の周波数すべてで、乗算1回・加減算2回ずつ)`),
    startText: `8kHz・${GOERTZEL.n}サンプルの音から、DTMFの8つの周波数だけを調べる。FFTで全周波数を求める代わりに、周波数ごとに2つの状態を持つ漸化式を回し、最後に s₁² + s₂² − coeff·s₁·s₂ でパワーを取り出す`,
    endText: `完了: パワーが最大の行は ${GOERTZEL.rows[rowBest]}Hz、列は ${GOERTZEL.cols[colBest]}Hz → キー「${GOERTZEL.keys[rowBest][colBest]}」。ほかの6つの周波数のパワーは、これらよりずっと小さい`,
  });
}

// ===========================================================================
// FM合成: キャリア fc の位相を、モジュレータ fm で揺らす。側波帯 fc±n·fm の振幅は ベッセル関数 J_n(I)
// ===========================================================================

export const FM = { fs: 8192, fc: 1000, fm: 200, index: 2, steps: 96, spectrumN: 1024, sidebands: 4 };

export const fmModulator = (): number[] => Array.from({ length: FM.steps }, (_, k) => FM.index * Math.sin((2 * Math.PI * FM.fm * k) / FM.fs));
export const fmOutput = (n: number = FM.steps): number[] =>
  Array.from({ length: n }, (_, k) => Math.sin((2 * Math.PI * FM.fc * k) / FM.fs + FM.index * Math.sin((2 * Math.PI * FM.fm * k) / FM.fs)));

/** 1024サンプルの信号の、fc + n·fm(n = −4..4)に当たるビンの振幅(DFTの1ビンを直接計算)。 */
export function fmSpectrum(): number[] {
  const y = fmOutput(FM.spectrumN);
  const out: number[] = [];
  for (let n = -FM.sidebands; n <= FM.sidebands; n++) {
    const bin = ((FM.fc + n * FM.fm) * FM.spectrumN) / FM.fs;
    let re = 0;
    let im = 0;
    y.forEach((v, i) => {
      re += v * Math.cos((2 * Math.PI * bin * i) / FM.spectrumN);
      im += v * Math.sin((2 * Math.PI * bin * i) / FM.spectrumN);
    });
    out.push((2 * Math.hypot(re, im)) / FM.spectrumN);
  }
  return out;
}

export function fmSynthesisSteps(): SignalFrame[] {
  const m = fmModulator();
  const y = fmOutput();
  const spectrum = fmSpectrum();
  const labels = spectrum.map((_, i) => `fc${i - FM.sidebands >= 0 ? "+" : "−"}${Math.abs(i - FM.sidebands)}fm`);
  const series: SeriesSpec[] = [
    { id: "mod", title: `モジュレータ I·sin(2π·${FM.fm}Hz·t)(変調指数 I=${FM.index})`, role: "input", values: m, range: [-FM.index * 1.15, FM.index * 1.15] },
    { id: "y", title: `出力 sin(2π·${FM.fc}Hz·t + I·sin(2π·${FM.fm}Hz·t))`, role: "output", values: y, range: [-1.15, 1.15] },
    {
      id: "spectrum",
      title: `${FM.spectrumN}サンプルのスペクトル(側波帯 fc±n·fm の振幅)`,
      role: "state",
      style: "stem",
      xLabel: "fc−4fm … fc … fc+4fm",
      labels,
      range: [0, Math.max(...spectrum) * 1.15],
      snapshots: m.map(() => spectrum),
    },
  ];
  return seriesFrames({
    series,
    texts: m.map((mv, k) => `サンプル${k}: 位相の揺れ ${round(mv, 2)} ラジアン → 出力 ${round(y[k], 2)}(キャリアの位相が揺れるぶん、周波数が上下する)`),
    startText: `${FM.fc}Hz のキャリアの位相を、${FM.fm}Hz のモジュレータ(振れ幅 I=${FM.index})で揺らす。正弦波2つだけで、${FM.fc}Hz を中心に ${FM.fm}Hz 間隔で並ぶ多数の倍音(側波帯)ができる。下のスペクトルは1024サンプルを解析したもの`,
    endText: `完了: 側波帯の振幅は 中心 ${round(spectrum[FM.sidebands], 3)}・±1本目 ${round(spectrum[FM.sidebands + 1], 3)}・±2本目 ${round(spectrum[FM.sidebands + 2], 3)}・±3本目 ${round(spectrum[FM.sidebands + 3], 3)}。これらは第1種ベッセル関数 J_n(${FM.index}) の絶対値に等しい。I を大きくすると、有意な側波帯が増えて明るい音になる`,
  });
}

export const SIGNAL_EXTRA_VISUALIZERS: Record<string, () => SignalFrame[]> = {
  "median-filter": medianFilterSteps,
  "alpha-beta-filter": alphaBetaFilterSteps,
  "goertzel-algorithm": goertzelAlgorithmSteps,
  "fm-synthesis": fmSynthesisSteps,
};

export const SIGNAL_EXTRA_META: Record<string, SignalMeta> = {
  "median-filter": { chips: ["窓幅5", "40サンプル", "外れ値4つ", "階段状の信号"] },
  "alpha-beta-filter": { chips: [`α=${ALPHA_BETA.alpha}`, `β=${ALPHA_BETA.beta}`, `等速 ${ALPHA_BETA.velocity}`, `測定雑音 σ=${ALPHA_BETA.noise}`, "擬似乱数(固定シード)"] },
  "goertzel-algorithm": { chips: ["8kHz", `${GOERTZEL.n}サンプル`, "DTMF 8周波数", "770Hz+1336Hz(キー5)"] },
  "fm-synthesis": { chips: [`fs ${FM.fs}Hz`, `キャリア ${FM.fc}Hz`, `モジュレータ ${FM.fm}Hz`, `変調指数 I=${FM.index}`] },
};
