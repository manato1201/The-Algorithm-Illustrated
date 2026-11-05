import { amplitudeSpectrum, energy, hannWindow, makeRng, panel, revealed, round, signalFrame, type SignalFrame } from "./signal-math.ts";

/**
 * 音響・信号処理: エフェクト・合成系(双二次フィルタ・ノイズゲート・コンプレッサー・Karplus-Strong・
 * ウェーブシェーピング・ウェーブテーブル・コーラス/フランジャー・コンボリューションリバーブ・グラニュラー合成)。
 * 1サンプルずつ「何を読み、何を足し、何を書いたか」が追えるよう、実際の処理と同じ順で計算する。
 */

// ---------------------------------------------------------------------------
// 双二次フィルタ(Biquad)によるパラメトリックEQ
// ---------------------------------------------------------------------------

export const BIQUAD_FS = 8000;
export const BIQUAD_F0 = 500;
export const BIQUAD_Q = 2;
export const BIQUAD_GAIN_DB = 12;
export const BIQUAD_N = 64;
const BIQUAD_RESPONSE_POINTS = 64;

export type BiquadCoefs = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** ピーキングEQの係数(Audio EQ Cookbook)。a0で割って正規化済み。 */
export function peakingEqCoefs(fs: number, f0: number, q: number, gainDb: number): BiquadCoefs {
  const amp = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha / amp;
  return {
    b0: (1 + alpha * amp) / a0,
    b1: (-2 * Math.cos(w0)) / a0,
    b2: (1 - alpha * amp) / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha / amp) / a0,
  };
}

/** 500Hz(周期16)と1000Hz(周期8)の2つの音を混ぜた入力。EQで500Hzだけを持ち上げる。 */
export function biquadInput(): number[] {
  return Array.from(
    { length: BIQUAD_N },
    (_, n) => 0.4 * Math.sin((2 * Math.PI * n) / 16) + 0.4 * Math.sin((2 * Math.PI * n) / 8),
  );
}

export function biquadFilter(x: readonly number[], c: BiquadCoefs): number[] {
  const y: number[] = [];
  for (let n = 0; n < x.length; n++) {
    const x1 = x[n - 1] ?? 0;
    const x2 = x[n - 2] ?? 0;
    const y1 = y[n - 1] ?? 0;
    const y2 = y[n - 2] ?? 0;
    y.push(c.b0 * x[n] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2);
  }
  return y;
}

/** 周波数f(Hz)での振幅応答(dB)。 */
export function biquadResponseDb(c: BiquadCoefs, fs: number, f: number): number {
  const w = (2 * Math.PI * f) / fs;
  const numRe = c.b0 + c.b1 * Math.cos(w) + c.b2 * Math.cos(2 * w);
  const numIm = -(c.b1 * Math.sin(w) + c.b2 * Math.sin(2 * w));
  const denRe = 1 + c.a1 * Math.cos(w) + c.a2 * Math.cos(2 * w);
  const denIm = -(c.a1 * Math.sin(w) + c.a2 * Math.sin(2 * w));
  return 20 * Math.log10(Math.hypot(numRe, numIm) / Math.hypot(denRe, denIm));
}

/** 周期period(サンプル)の成分の振幅を、区間[start, start+length)から相関で求める。 */
export function toneAmplitude(x: readonly number[], period: number, start: number, length: number): number {
  let s = 0;
  let c = 0;
  for (let i = start; i < start + length; i++) {
    s += x[i] * Math.sin((2 * Math.PI * i) / period);
    c += x[i] * Math.cos((2 * Math.PI * i) / period);
  }
  return (2 / length) * Math.hypot(s, c);
}

export function biquadFilterSteps(): SignalFrame[] {
  const x = biquadInput();
  const coefs = peakingEqCoefs(BIQUAD_FS, BIQUAD_F0, BIQUAD_Q, BIQUAD_GAIN_DB);
  const y = biquadFilter(x, coefs);
  const response = Array.from({ length: BIQUAD_RESPONSE_POINTS }, (_, i) =>
    biquadResponseDb(coefs, BIQUAD_FS, Math.max(20, (i * (BIQUAD_FS / 2)) / (BIQUAD_RESPONSE_POINTS - 1))),
  );
  const markerAt = (f: number) => Math.round((f / (BIQUAD_FS / 2)) * (BIQUAD_RESPONSE_POINTS - 1));
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null) => [
    panel("input", "入力 x[n](500Hz + 1000Hz)", x, {
      range: [-1, 1],
      highlight: n === null ? {} : { [n]: "comparing", ...(n >= 1 ? { [n - 1]: "pivot" } : {}), ...(n >= 2 ? { [n - 2]: "pivot" } : {}) },
      xLabel: "サンプル番号 n",
    }),
    panel("output", "出力 y[n](薄い線は入力)", revealed(y, count), {
      range: [-2.5, 2.5],
      reference: x,
      highlight: n === null ? {} : { [n]: "swapping" },
      xLabel: "サンプル番号 n",
    }),
    panel("response", `周波数応答(dB): 中心${BIQUAD_F0}Hz・Q=${BIQUAD_Q}・${BIQUAD_GAIN_DB > 0 ? "+" : ""}${BIQUAD_GAIN_DB}dB`, response, {
      range: [-3, 15],
      markers: [
        { index: markerAt(500), label: "500Hz" },
        { index: markerAt(1000), label: "1000Hz" },
      ],
      xLabel: "周波数(0〜4000Hz)",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 2つの音が混ざった波形のうち、500Hzだけを持ち上げたい。直前2つの入力と直前2つの出力を係数で混ぜるだけで、周波数ごとの増減が作れる`,
      ...build(0, null),
    ),
  );
  for (let n = 0; n < BIQUAD_N; n++) {
    const terms = [
      `${round(coefs.b0, 3)}·x[n]`,
      `${round(coefs.b1, 3)}·x[n−1]`,
      `${round(coefs.b2, 3)}·x[n−2]`,
      `${round(-coefs.a1, 3)}·y[n−1]`,
      `${round(-coefs.a2, 3)}·y[n−2]`,
    ];
    frames.push(
      signalFrame(
        `n=${n}: y[n] = ${terms.join(" + ")} = ${round(y[n], 3)}${n < 2 ? "(まだ過去の値が足りないので0として扱う)" : ""}`,
        ...build(n + 1, n),
      ),
    );
  }
  const before = toneAmplitude(x, 16, 32, 32);
  const after = toneAmplitude(y, 16, 32, 32);
  const beforeHigh = toneAmplitude(x, 8, 32, 32);
  const afterHigh = toneAmplitude(y, 8, 32, 32);
  frames.push(
    signalFrame(
      `落ち着いた区間の振幅: 500Hz成分は ${round(before)} → ${round(after)}(${round(20 * Math.log10(after / before), 1)}dB)、1000Hz成分は ${round(beforeHigh)} → ${round(afterHigh)}(${round(20 * Math.log10(afterHigh / beforeHigh), 1)}dB)。応答曲線の予告どおり`,
      ...build(BIQUAD_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ノイズゲート
// ---------------------------------------------------------------------------

export const GATE_N = 128;
export const GATE_OPEN_THRESHOLD = 0.2;
export const GATE_CLOSE_THRESHOLD = 0.12;
const GATE_ENV_RELEASE = 0.92;
const GATE_GAIN_ATTACK = 0.5;
const GATE_GAIN_RELEASE = 0.15;

/** 常に小さな雑音が乗っていて、n=20〜60に大きな音、n=100〜118に(しきい値より)小さな音がある。 */
export function gateInput(): number[] {
  const rand = makeRng(3);
  return Array.from({ length: GATE_N }, (_, n) => {
    const tone = Math.sin((2 * Math.PI * n) / 14);
    const burst = n >= 20 && n < 60 ? 0.7 * tone : n >= 100 && n < 118 ? 0.12 * tone : 0;
    return burst + 0.03 * (rand() * 2 - 1);
  });
}

export type GateState = { envelope: number[]; open: boolean[]; gain: number[]; output: number[] };

export function noiseGateProcess(x: readonly number[]): GateState {
  const envelope: number[] = [];
  const open: boolean[] = [];
  const gain: number[] = [];
  let env = 0;
  let isOpen = false;
  let g = 0;
  for (const sample of x) {
    env = Math.max(Math.abs(sample), env * GATE_ENV_RELEASE);
    if (!isOpen && env > GATE_OPEN_THRESHOLD) isOpen = true;
    else if (isOpen && env < GATE_CLOSE_THRESHOLD) isOpen = false;
    const target = isOpen ? 1 : 0;
    g += (target - g) * (target > g ? GATE_GAIN_ATTACK : GATE_GAIN_RELEASE);
    envelope.push(env);
    open.push(isOpen);
    gain.push(g);
  }
  return { envelope, open, gain, output: x.map((v, n) => v * gain[n]) };
}

export function noiseGateSteps(): SignalFrame[] {
  const x = gateInput();
  const state = noiseGateProcess(x);
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null) => [
    panel("input", `入力 x[n](薄い線は包絡。開く>${GATE_OPEN_THRESHOLD}、閉じる<${GATE_CLOSE_THRESHOLD})`, x, {
      range: [-1, 1],
      reference: revealed(state.envelope, count),
      highlight: n === null ? {} : { [n]: "comparing" },
      xLabel: "サンプル番号 n",
    }),
    panel("gain", "ゲートのゲイン(1=開く、0=閉じる)", revealed(state.gain, count), {
      range: [0, 1.1],
      highlight: n === null ? {} : { [n]: state.open[n] ? "settled" : "pivot" },
      xLabel: "サンプル番号 n",
    }),
    panel("output", "出力 y[n] = x[n] × ゲイン", revealed(state.output, count), {
      range: [-1, 1],
      highlight: n === null ? {} : { [n]: "swapping" },
      xLabel: "サンプル番号 n",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 演奏していない間の小さな雑音(ヒスノイズ)を消したい。音の大きさ(包絡)がしきい値を超えたら通し、下がったら閉じる`,
      ...build(0, null),
    ),
  );
  for (let n = 0; n < GATE_N; n += 2) {
    const m = n + 1;
    frames.push(
      signalFrame(
        `n=${m}: 包絡 ${round(state.envelope[m])} → ゲートは${state.open[m] ? "開" : "閉"}。ゲイン ${round(state.gain[m])} を掛けて出力 ${round(state.output[m], 3)}`,
        ...build(m + 1, m),
      ),
    );
  }
  const noiseIn = energy(x.slice(0, 20));
  const noiseOut = energy(state.output.slice(0, 20));
  const quietNoteIn = energy(x.slice(100, 118));
  const quietNoteOut = energy(state.output.slice(100, 118));
  frames.push(
    signalFrame(
      `雑音だけの区間(n<20)のエネルギーは ${round(noiseIn, 4)} → ${round(noiseOut, 4)}。ただし小さな音(n=100〜118、しきい値未満)も ${round(quietNoteIn, 2)} → ${round(quietNoteOut, 3)} と一緒に消える。しきい値の設定が難しいところ`,
      ...build(GATE_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ダイナミックレンジコンプレッサー
// ---------------------------------------------------------------------------

export const COMP_N = 128;
export const COMP_THRESHOLD = 0.4;
export const COMP_RATIO = 4;
const COMP_ENV_RELEASE = 0.94;
const COMP_GAIN_ATTACK = 0.5;
const COMP_GAIN_RELEASE = 0.08;

/** 小さい音(0.2)→大きい音(0.9)→中くらい(0.3)と振幅が変わる正弦波。 */
export function compressorInput(): number[] {
  return Array.from({ length: COMP_N }, (_, n) => {
    const amp = n < 40 ? 0.2 : n < 88 ? 0.9 : 0.3;
    return amp * Math.sin((2 * Math.PI * n) / 16);
  });
}

export function compressorProcess(x: readonly number[]): { envelope: number[]; target: number[]; gain: number[]; output: number[] } {
  const envelope: number[] = [];
  const target: number[] = [];
  const gain: number[] = [];
  let env = 0;
  let g = 1;
  for (const sample of x) {
    env = Math.max(Math.abs(sample), env * COMP_ENV_RELEASE);
    const t = env > COMP_THRESHOLD ? (COMP_THRESHOLD + (env - COMP_THRESHOLD) / COMP_RATIO) / env : 1;
    g += (t - g) * (t < g ? COMP_GAIN_ATTACK : COMP_GAIN_RELEASE);
    envelope.push(env);
    target.push(t);
    gain.push(g);
  }
  return { envelope, target, gain, output: x.map((v, n) => v * gain[n]) };
}

export function dynamicRangeCompressionSteps(): SignalFrame[] {
  const x = compressorInput();
  const state = compressorProcess(x);
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null) => [
    panel("input", `入力 x[n](薄い線は包絡。しきい値 ${COMP_THRESHOLD})`, x, {
      range: [-1, 1],
      reference: revealed(state.envelope, count),
      highlight: n === null ? {} : { [n]: "comparing" },
      xLabel: "サンプル番号 n",
    }),
    panel("gain", `ゲイン(薄い線は目標。しきい値を超えた分を 1/${COMP_RATIO} に)`, revealed(state.gain, count), {
      range: [0, 1.1],
      reference: revealed(state.target, count),
      highlight: n === null ? {} : { [n]: "pivot" },
      xLabel: "サンプル番号 n",
    }),
    panel("output", "出力 y[n] = x[n] × ゲイン(薄い線は入力)", revealed(state.output, count), {
      range: [-1, 1],
      reference: x,
      highlight: n === null ? {} : { [n]: "swapping" },
      xLabel: "サンプル番号 n",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 大きい音は下げ、小さい音はそのまま。音量の差(ダイナミックレンジ)を縮めて、全体を持ち上げても割れにくくする`,
      ...build(0, null),
    ),
  );
  for (let n = 0; n < COMP_N; n += 2) {
    const m = n + 1;
    const over = state.envelope[m] > COMP_THRESHOLD;
    frames.push(
      signalFrame(
        over
          ? `n=${m}: 包絡 ${round(state.envelope[m])} がしきい値超え → 目標ゲイン ${round(state.target[m])}(超過分を1/${COMP_RATIO}に)。実際のゲインは ${round(state.gain[m])} へ追従`
          : `n=${m}: 包絡 ${round(state.envelope[m])} はしきい値以下 → ゲイン ${round(state.gain[m])}(目標 ${round(state.target[m])})`,
        ...build(m + 1, m),
      ),
    );
  }
  const peak = (values: readonly number[], from: number, to: number) => Math.max(...values.slice(from, to).map(Math.abs));
  frames.push(
    signalFrame(
      `大きい区間(n=72〜88)のピークは ${round(peak(x, 72, 88))} → ${round(peak(state.output, 72, 88))}、小さい区間(n=24〜40)は ${round(peak(x, 24, 40))} → ${round(peak(state.output, 24, 40))}。差が縮まった。立ち上がりの瞬間は追従が遅れて少し突き抜ける(アタック)`,
      ...build(COMP_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// Karplus-Strong弦楽器合成
// ---------------------------------------------------------------------------

export const KS_LENGTH = 32;
export const KS_PASSES = 12;
export const KS_DECAY = 0.998;
export const KS_FS = 8000;

export function karplusInitialBuffer(): number[] {
  const rand = makeRng(7);
  return Array.from({ length: KS_LENGTH }, () => rand() * 2 - 1);
}

/** 遅延線を passes 周ぶん回して得た出力。out[t] = 読み出した値、書き戻す値は隣との平均×減衰。 */
export function karplusStrongOutput(passes: number): number[] {
  const buf = karplusInitialBuffer();
  const out: number[] = [];
  for (let t = 0; t < passes * KS_LENGTH; t++) {
    const p = t % KS_LENGTH;
    out.push(buf[p]);
    buf[p] = KS_DECAY * 0.5 * (buf[p] + buf[(p + 1) % KS_LENGTH]);
  }
  return out;
}

export function karplusStrongStringSynthesisSteps(): SignalFrame[] {
  const buf = karplusInitialBuffer();
  const total = KS_PASSES * KS_LENGTH;
  const out: number[] = [];
  const frames: SignalFrame[] = [];
  const build = (highlight: Partial<Record<number, "comparing" | "pivot" | "swapping">>) => [
    panel("delay", `遅延線(長さ${KS_LENGTH}のリングバッファ)`, buf, {
      range: [-1, 1],
      highlight,
      xLabel: "バッファ内の位置",
    }),
    panel("output", "出力波形(読み出した値を並べたもの)", revealed([...out, ...new Array<number>(total - out.length).fill(0)], out.length), {
      range: [-1, 1],
      xLabel: `出力サンプル番号 t(1周=${KS_LENGTH}サンプル)`,
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 長さ${KS_LENGTH}の遅延線に雑音(弦をはじいた瞬間の乱れ)を詰める。これを1周ごとにならしていくと、${KS_LENGTH}サンプルの周期を持つ音になる`,
      ...build({}),
    ),
  );
  for (let t = 0; t < total; t++) {
    const p = t % KS_LENGTH;
    const next = (p + 1) % KS_LENGTH;
    const read = buf[p];
    const neighbor = buf[next];
    out.push(read);
    buf[p] = KS_DECAY * 0.5 * (read + neighbor);
    const pass = Math.floor(t / KS_LENGTH) + 1;
    const detailed = pass <= 2;
    if (detailed) {
      frames.push(
        signalFrame(
          `t=${t}(${pass}周目): バッファ[${p}]=${round(read, 3)} を出力し、隣[${next}]=${round(neighbor, 3)} との平均×${KS_DECAY} = ${round(buf[p], 3)} を書き戻す`,
          ...build({ [p]: "swapping", [next]: "pivot" }),
        ),
      );
    } else if (p === KS_LENGTH - 1) {
      const roughness = buf.reduce((s, v, i) => s + Math.abs(v - buf[(i + 1) % KS_LENGTH]), 0) / KS_LENGTH;
      frames.push(
        signalFrame(
          `${pass}周目が終了: 隣り合う値の差の平均が ${round(roughness, 3)} に。平均を取るたびに細かい凸凹(高い周波数)から先に消え、まろやかな音に近づく`,
          ...build({}),
        ),
      );
    }
  }
  frames.push(
    signalFrame(
      `周期は遅延線の長さ ${KS_LENGTH}サンプル → 音の高さ = ${KS_FS} / ${KS_LENGTH} = ${KS_FS / KS_LENGTH}Hz。遅延線を短くすれば高い音、長くすれば低い音になる`,
      ...build({}),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ウェーブシェーピング歪み
// ---------------------------------------------------------------------------

export const SHAPER_N = 64;
export const SHAPER_CYCLE = 16;
export const SHAPER_DRIVE = 4;
const SHAPER_CURVE_POINTS = 65;

export function shaperCurve(u: number): number {
  return Math.tanh(SHAPER_DRIVE * u) / Math.tanh(SHAPER_DRIVE);
}

export function waveshapingDistortionSteps(): SignalFrame[] {
  const x = Array.from({ length: SHAPER_N }, (_, n) => Math.sin((2 * Math.PI * n) / SHAPER_CYCLE));
  const y = x.map(shaperCurve);
  const curve = Array.from({ length: SHAPER_CURVE_POINTS }, (_, i) => shaperCurve(-1 + (2 * i) / (SHAPER_CURVE_POINTS - 1)));
  const spectrum = amplitudeSpectrum(y);
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null, showSpectrum: boolean) => {
    const curveIndex = n === null ? null : Math.round(((x[n] + 1) / 2) * (SHAPER_CURVE_POINTS - 1));
    return [
      panel("input", "入力 x[n](振幅1の正弦波)", x, {
        range: [-1.2, 1.2],
        highlight: n === null ? {} : { [n]: "comparing" },
        xLabel: "サンプル番号 n",
      }),
      panel("curve", `伝達曲線 y = tanh(${SHAPER_DRIVE}x)/tanh(${SHAPER_DRIVE})(入力の値を出力の値へ写す)`, curve, {
        range: [-1.2, 1.2],
        highlight: curveIndex === null ? {} : { [curveIndex]: "pivot" },
        xLabel: "入力の値(−1〜+1)",
      }),
      panel("output", "出力 y[n](薄い線は入力)", revealed(y, count), {
        range: [-1.2, 1.2],
        reference: x,
        highlight: n === null ? {} : { [n]: "swapping" },
        xLabel: "サンプル番号 n",
      }),
      panel("spectrum", "出力の振幅スペクトル(基本波はビン4、奇数倍音は12, 20, …)", showSpectrum ? spectrum : spectrum.map(() => Number.NaN), {
        style: "stem",
        range: [0, 1.4],
        highlight: showSpectrum ? Object.fromEntries([4, 12, 20, 28].map((k) => [k, "settled" as const])) : {},
        xLabel: "周波数ビン",
      }),
    ];
  };

  frames.push(
    signalFrame(
      `初期状態: 入力の値を曲線で写し替えるだけで、波形が歪み、元になかった周波数(倍音)が生まれる。ギターのオーバードライブの基本形`,
      ...build(0, null, false),
    ),
  );
  for (let n = 0; n < SHAPER_N; n++) {
    frames.push(
      signalFrame(
        `n=${n}: 入力 ${round(x[n], 3)} を曲線で写して出力 ${round(y[n], 3)}。${Math.abs(x[n]) > 0.8 ? "大きな値は曲線が寝ているので頭が押しつぶされる" : "小さな値はほぼ比例のまま"}`,
        ...build(n + 1, n, false),
      ),
    );
  }
  frames.push(
    signalFrame(
      `出力をスペクトルにすると、基本波(ビン4)に加えて奇数倍音(ビン12, 20, 28)が現れる。曲線が左右対称なので偶数倍音はほぼ0。非対称な曲線にすると偶数倍音も出る`,
      ...build(SHAPER_N, null, true),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ウェーブテーブル音源合成
// ---------------------------------------------------------------------------

export const WAVETABLE_SIZE = 32;
export const WAVETABLE_INCREMENT = 3.2;
export const WAVETABLE_N = 64;

/** 1周期ぶんの波形(基本波と3つの倍音を足して最大1に正規化)。 */
export function wavetableTable(): number[] {
  const raw = Array.from({ length: WAVETABLE_SIZE }, (_, i) => {
    let v = 0;
    for (let h = 1; h <= 4; h++) v += Math.sin((2 * Math.PI * h * i) / WAVETABLE_SIZE) / h;
    return v;
  });
  const peak = Math.max(...raw.map(Math.abs));
  return raw.map((v) => v / peak);
}

export function wavetableOutput(table: readonly number[], increment: number, length: number): { out: number[]; phase: number[] } {
  const out: number[] = [];
  const phases: number[] = [];
  let phase = 0;
  for (let n = 0; n < length; n++) {
    const i0 = Math.floor(phase) % table.length;
    const i1 = (i0 + 1) % table.length;
    const frac = phase - Math.floor(phase);
    out.push(table[i0] * (1 - frac) + table[i1] * frac);
    phases.push(phase);
    phase = (phase + increment) % table.length;
  }
  return { out, phase: phases };
}

export function wavetableSynthesisSteps(): SignalFrame[] {
  const table = wavetableTable();
  const { out, phase } = wavetableOutput(table, WAVETABLE_INCREMENT, WAVETABLE_N);
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null) => {
    const i0 = n === null ? 0 : Math.floor(phase[n]) % WAVETABLE_SIZE;
    return [
      panel("table", `波形テーブル(1周期=${WAVETABLE_SIZE}点)`, table, {
        range: [-1.2, 1.2],
        highlight: n === null ? {} : { [i0]: "comparing", [(i0 + 1) % WAVETABLE_SIZE]: "pivot" },
        xLabel: "テーブルの位置",
      }),
      panel("phase", `読み出し位置(1サンプルごとに${WAVETABLE_INCREMENT}ずつ進み、末尾で先頭に戻る)`, revealed(phase, count), {
        range: [0, WAVETABLE_SIZE],
        highlight: n === null ? {} : { [n]: "pivot" },
        xLabel: "サンプル番号 n",
      }),
      panel("output", "出力", revealed(out, count), {
        range: [-1.2, 1.2],
        highlight: n === null ? {} : { [n]: "swapping" },
        xLabel: "サンプル番号 n",
      }),
    ];
  };

  frames.push(
    signalFrame(
      `初期状態: 1周期ぶんの波形をテーブルに保存しておき、読み出す速さを変えて音の高さを作る。進む幅が大きいほど周期が短く、高い音になる`,
      ...build(0, null),
    ),
  );
  for (let n = 0; n < WAVETABLE_N; n++) {
    const i0 = Math.floor(phase[n]) % WAVETABLE_SIZE;
    const frac = phase[n] - Math.floor(phase[n]);
    frames.push(
      signalFrame(
        frac === 0
          ? `n=${n}: 位置 ${round(phase[n], 1)} はちょうど点${i0}の上 → 出力 ${round(out[n], 3)}`
          : `n=${n}: 位置 ${round(phase[n], 1)} は点${i0}と点${(i0 + 1) % WAVETABLE_SIZE}の間 → ${round(1 - frac, 1)}×${round(table[i0], 2)} + ${round(frac, 1)}×${round(table[(i0 + 1) % WAVETABLE_SIZE], 2)} = ${round(out[n], 3)}(線形補間)`,
        ...build(n + 1, n),
      ),
    );
  }
  frames.push(
    signalFrame(
      `周期 = ${WAVETABLE_SIZE} / ${WAVETABLE_INCREMENT} = ${round(WAVETABLE_SIZE / WAVETABLE_INCREMENT, 1)}サンプル。補間をしないと点を飛ばして読むので、粗いザラついた音(エイリアシング)になる`,
      ...build(WAVETABLE_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// コーラス/フランジャー(可変遅延ディレイライン)
// ---------------------------------------------------------------------------

export const CHORUS_N = 128;
export const CHORUS_BASE_DELAY = 6;
export const CHORUS_DEPTH = 4;
export const CHORUS_LFO_PERIOD = 64;

export function chorusInput(): number[] {
  return Array.from({ length: CHORUS_N }, (_, n) => 0.6 * Math.sin((2 * Math.PI * n) / 12));
}

export function chorusDelay(n: number): number {
  return CHORUS_BASE_DELAY + CHORUS_DEPTH * Math.sin((2 * Math.PI * n) / CHORUS_LFO_PERIOD);
}

/** 小数の遅延を線形補間で読む。範囲外(負の時刻)は0。 */
export function readFractional(x: readonly number[], position: number): number {
  const i0 = Math.floor(position);
  const frac = position - i0;
  const a = i0 >= 0 ? x[i0] ?? 0 : 0;
  const b = i0 + 1 >= 0 ? x[i0 + 1] ?? 0 : 0;
  return a * (1 - frac) + b * frac;
}

export function chorusFlangerOutput(x: readonly number[]): number[] {
  return x.map((v, n) => 0.5 * v + 0.5 * readFractional(x, n - chorusDelay(n)));
}

export function chorusFlangerEffectSteps(): SignalFrame[] {
  const x = chorusInput();
  const delay = x.map((_, n) => chorusDelay(n));
  const y = chorusFlangerOutput(x);
  const frames: SignalFrame[] = [];
  const build = (count: number, n: number | null) => {
    const read = n === null ? 0 : n - delay[n];
    const i0 = Math.floor(read);
    return [
      panel("input", "入力 x[n]", x, {
        range: [-1, 1],
        highlight: n === null ? {} : { [n]: "comparing", ...(i0 >= 0 ? { [i0]: "pivot" } : {}), ...(i0 + 1 >= 0 ? { [i0 + 1]: "pivot" } : {}) },
        xLabel: "サンプル番号 n",
      }),
      panel("delay", `遅延時間 d[n](LFOで ${CHORUS_BASE_DELAY}±${CHORUS_DEPTH} サンプルを往復)`, revealed(delay, count), {
        range: [0, CHORUS_BASE_DELAY + CHORUS_DEPTH + 1],
        highlight: n === null ? {} : { [n]: "pivot" },
        xLabel: "サンプル番号 n",
      }),
      panel("output", "出力 y[n] = ½·x[n] + ½·x[n−d[n]](薄い線は入力)", revealed(y, count), {
        range: [-1, 1],
        reference: x,
        highlight: n === null ? {} : { [n]: "swapping" },
        xLabel: "サンプル番号 n",
      }),
    ];
  };

  frames.push(
    signalFrame(
      `初期状態: 原音と、少し遅らせた音を混ぜる。遅らせる量をゆっくり揺らし続けると、うねるような広がり(コーラス/フランジャー)が生まれる`,
      ...build(0, null),
    ),
  );
  for (let n = 0; n < CHORUS_N; n += 2) {
    const read = n - delay[n];
    frames.push(
      signalFrame(
        `n=${n}: 遅延 d=${round(delay[n])} → 過去の位置 ${round(read)} を前後2点から線形補間して ${round(readFractional(x, read), 3)}、原音と半々に混ぜて ${round(y[n], 3)}`,
        ...build(n + 1, n),
      ),
    );
  }
  frames.push(
    signalFrame(
      `出力の振幅が遅延量に合わせて大きくなったり小さくなったりしている(遅延した音との位相が強め合い/打ち消し合いを繰り返す)。遅延が短いと櫛形フィルタの凹みが目立つフランジャー、長めで複数重ねるとコーラスになる`,
      ...build(CHORUS_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// コンボリューションリバーブ
// ---------------------------------------------------------------------------

export const REVERB_IR_LENGTH = 24;
export const REVERB_DRY_LENGTH = 32;
export const REVERB_IMPULSES: readonly [number, number][] = [
  [0, 1],
  [5, -0.5],
  [11, 0.8],
  [17, 0.4],
  [24, -0.7],
  [29, 0.6],
];

/** 部屋の応答(インパルス応答): 直接音のあとに、減衰しながら不規則に続く反射。 */
export function reverbImpulseResponse(): number[] {
  const rand = makeRng(9);
  return Array.from({ length: REVERB_IR_LENGTH }, (_, k) => (k === 0 ? 1 : Math.exp(-k / 6) * (rand() * 2 - 1) * 0.8));
}

export function reverbDry(): number[] {
  const x = new Array<number>(REVERB_DRY_LENGTH).fill(0);
  for (const [n, v] of REVERB_IMPULSES) x[n] = v;
  return x;
}

export function convolveDirect(x: readonly number[], h: readonly number[]): number[] {
  const y = new Array<number>(x.length + h.length - 1).fill(0);
  for (let n = 0; n < y.length; n++) {
    for (let m = 0; m < x.length; m++) {
      const k = n - m;
      if (k >= 0 && k < h.length) y[n] += x[m] * h[k];
    }
  }
  return y;
}

export function convolutionReverbSteps(): SignalFrame[] {
  const x = reverbDry();
  const h = reverbImpulseResponse();
  const outLength = x.length + h.length - 1;
  const frames: SignalFrame[] = [];
  const acc = new Array<number>(outLength).fill(0);
  const pad = (values: readonly number[], offset: number) => Array.from({ length: outLength }, (_, i) => values[i - offset] ?? 0);
  const build = (current: number | null, contribution: number[]) => [
    panel("dry", "乾いた音 x[n](手を叩いた数回のクリック)", pad(x, 0), {
      style: "stem",
      range: [-1.1, 1.1],
      highlight: current === null ? {} : { [current]: "comparing" },
      xLabel: "サンプル番号 n",
    }),
    panel("ir", `部屋のインパルス応答 h[k](長さ${REVERB_IR_LENGTH}。薄い線は今回の寄与)`, pad(h, 0), {
      range: [-1.1, 1.1],
      reference: contribution,
      xLabel: "遅れ k(サンプル)",
    }),
    panel("wet", "残響つきの音 y[n](寄与を足し込んだ結果)", [...acc], {
      range: [-1.6, 1.6],
      highlight: current === null ? {} : Object.fromEntries(h.map((_, k) => [current + k, "swapping" as const])),
      xLabel: "サンプル番号 n",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 部屋に「パン!」と1発鳴らしたときの響き(インパルス応答)を測っておけば、どんな音でもその部屋で鳴らしたように作れる。音の各サンプルが、応答の波形を自分の大きさで縮尺・ずらしたものを放つ`,
      ...build(null, new Array<number>(outLength).fill(Number.NaN)),
    ),
  );
  for (const [n, value] of REVERB_IMPULSES) {
    const contribution = pad(h.map((v) => v * value), n);
    for (let i = 0; i < outLength; i++) acc[i] += contribution[i];
    frames.push(
      signalFrame(
        `x[${n}]=${round(value)}: 応答を ${round(value)} 倍して ${n} サンプルずらし、出力に足し込む(重なった部分は足し算)`,
        ...build(n, contribution),
      ),
    );
  }
  frames.push(
    signalFrame(
      `全ての寄与を足して完成。出力の長さは ${REVERB_DRY_LENGTH}+${REVERB_IR_LENGTH}−1=${outLength} サンプルで、元の音より響きの分だけ長い。これが畳み込み(Σ x[m]·h[n−m])そのもの`,
      ...build(null, new Array<number>(outLength).fill(Number.NaN)),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// グラニュラー音響合成
// ---------------------------------------------------------------------------

export const GRANULAR_SOURCE_LENGTH = 96;
export const GRANULAR_GRAIN = 24;
export const GRANULAR_HOP = 12;
export const GRANULAR_GRAINS = 8;

export function granularSource(): number[] {
  return Array.from({ length: GRANULAR_SOURCE_LENGTH }, (_, n) =>
    0.8 * Math.sin((2 * Math.PI * n * (1 + n / 96)) / 18),
  );
}

/** 各粒(グレイン)を取り出す元波形の位置。固定シードで決める。 */
export function granularStarts(): number[] {
  const rand = makeRng(17);
  return Array.from({ length: GRANULAR_GRAINS }, () => Math.floor(rand() * (GRANULAR_SOURCE_LENGTH - GRANULAR_GRAIN)));
}

export function granularOutput(source: readonly number[], starts: readonly number[]): number[] {
  const window = hannWindow(GRANULAR_GRAIN);
  const out = new Array<number>((starts.length - 1) * GRANULAR_HOP + GRANULAR_GRAIN).fill(0);
  starts.forEach((start, g) => {
    for (let i = 0; i < GRANULAR_GRAIN; i++) out[g * GRANULAR_HOP + i] += source[start + i] * window[i];
  });
  return out;
}

export function granularSynthesisSteps(): SignalFrame[] {
  const source = granularSource();
  const starts = granularStarts();
  const window = hannWindow(GRANULAR_GRAIN);
  const outLength = (GRANULAR_GRAINS - 1) * GRANULAR_HOP + GRANULAR_GRAIN;
  const acc = new Array<number>(outLength).fill(0);
  const frames: SignalFrame[] = [];
  const build = (grain: number | null) => {
    const start = grain === null ? 0 : starts[grain];
    return [
      panel("source", "元の音(この中から小さな粒を切り出す)", source, {
        range: [-1, 1],
        markers: grain === null ? undefined : [{ index: start, label: "粒の始点" }, { index: start + GRANULAR_GRAIN - 1, label: "終点" }],
        xLabel: "元の音のサンプル番号",
      }),
      panel(
        "grain",
        "切り出した粒(ハン窓で両端を絞る)",
        grain === null ? new Array<number>(GRANULAR_GRAIN).fill(Number.NaN) : window.map((w, i) => source[start + i] * w),
        { range: [-1, 1], xLabel: "粒の中の位置" },
      ),
      panel("out", "出力(粒を少しずつずらして重ね足し)", [...acc], {
        range: [-1.2, 1.2],
        highlight:
          grain === null
            ? {}
            : { [grain * GRANULAR_HOP]: "pivot", [grain * GRANULAR_HOP + GRANULAR_GRAIN - 1]: "swapping" },
        xLabel: "出力のサンプル番号",
      }),
    ];
  };

  frames.push(
    signalFrame(
      `初期状態: 音を数十ミリ秒の小さな粒(グレイン)に刻み、窓で端を丸めて、並べ直して重ねる。粒の切り出し位置・間隔を変えるだけで、元の音とは違う質感の音が作れる`,
      ...build(null),
    ),
  );
  const out = granularOutput(source, starts);
  starts.forEach((start, g) => {
    for (let i = 0; i < GRANULAR_GRAIN; i++) acc[g * GRANULAR_HOP + i] += source[start + i] * window[i];
    frames.push(
      signalFrame(
        `粒${g + 1}/${GRANULAR_GRAINS}: 元の音のn=${start}〜${start + GRANULAR_GRAIN - 1}を切り出し、出力の${g * GRANULAR_HOP}〜${g * GRANULAR_HOP + GRANULAR_GRAIN - 1}に重ねる(前の粒と半分重なる)`,
        ...build(g),
      ),
    );
  });
  frames.push(
    signalFrame(
      `${GRANULAR_GRAINS}個の粒で長さ${out.length}の音ができた。窓が半分ずつ重なると、窓の値の合計がちょうど1になるので、つなぎ目で音量が凹まない`,
      ...build(null),
    ),
  );
  return frames;
}
