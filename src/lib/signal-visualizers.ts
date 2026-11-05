import type { StateColorKey } from "./design-tokens";

/**
 * 音響・信号処理の可視化(波形を1サンプルずつ処理していくkind)。
 * 入力波形・係数・出力波形を縦に並べ、「いま処理しているサンプル」と「参照しているサンプル」を示す。
 * 信号はすべて固定値(乱数は固定シードのLCG)から決定的に作り、フレームは実際のDSP計算をそのまま追う。
 *
 * 状態の使い方:
 *   pivot=いま処理している入力 / comparing=計算に使っているサンプル / swapping=加工された(遮断・圧縮・クリップ等)
 *   settled=出力として確定したサンプル
 */

export type SignalTrace = {
  id: string;
  label: string;
  /** 未計算のサンプルは null(まだ描かない)。 */
  samples: (number | null)[];
  /** サンプル番号→状態。ここに無いサンプルは idle。 */
  marks: Partial<Record<number, StateColorKey>>;
  /** 縦軸の表示範囲(±range)。ステップをまたいで固定し、波形が伸び縮みして見えないようにする。 */
  range: number;
};

export type SignalGuide = { traceId: string; value: number; label: string };

export type SignalFrame = {
  traces: SignalTrace[];
  guides: SignalGuide[];
  readouts: { label: string; value: string }[];
  description: string;
};

export type SignalMeta = { chips: string[]; caveat?: string };

type Mark = Partial<Record<number, StateColorKey>>;
type Readout = { label: string; value: string };

const f2 = (v: number) => v.toFixed(2);
const f3 = (v: number) => v.toFixed(3);
const TWO_PI = Math.PI * 2;

/** 固定シードの線形合同法(0以上1未満)。Math.randomは使わない。 */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ---- ステップ列を作る共通エンジン ----

type StreamStep = {
  /** 出力トレース(複数可)の、このステップで確定する値。 */
  values: number[];
  /** 出力サンプルの位置(省略時はステップ番号)。 */
  outIndex?: number;
  kind: StateColorKey;
  /** 固定トレース(入力・係数)のこのステップの印。トレースid→(サンプル番号→状態)。 */
  marks: Record<string, Mark>;
  /** このステップだけ内容が変わるトレース(遅延バッファ・ずらした波形など)。 */
  overrides?: Record<string, (number | null)[]>;
  readouts: Readout[];
  text: string;
};

type StreamConfig = {
  fixed: { id: string; label: string; samples: number[]; range: number }[];
  /** ステップごとに内容が変わるトレースの初期内容。 */
  dynamic?: { id: string; label: string; samples: (number | null)[]; range: number }[];
  outputs: { id: string; label: string; length: number; range: number }[];
  steps: StreamStep[];
  guides?: SignalGuide[];
  startText: string;
  startReadouts?: Readout[];
  endText: string;
  endReadouts?: Readout[];
  /** 最終フレームで出力に付ける印の上書き(例: 検出したピーク)。出力トレースid→印。 */
  finalMarks?: Record<string, Mark>;
};

function streamFrames(config: StreamConfig): SignalFrame[] {
  const { fixed, dynamic = [], outputs, steps } = config;
  const guides = config.guides ?? [];
  const emptyOutputs = (): (number | null)[][] => outputs.map((o) => Array<number | null>(o.length).fill(null));

  const build = (
    marks: Record<string, Mark>,
    overrides: Record<string, (number | null)[]> | undefined,
    outputSamples: (number | null)[][],
    outputMarks: Mark[],
    readouts: Readout[],
    description: string,
  ): SignalFrame => ({
    traces: [
      ...fixed.map((t) => ({ id: t.id, label: t.label, samples: [...t.samples], marks: { ...(marks[t.id] ?? {}) }, range: t.range })),
      ...dynamic.map((t) => ({
        id: t.id,
        label: t.label,
        samples: [...(overrides?.[t.id] ?? t.samples)],
        marks: { ...(marks[t.id] ?? {}) },
        range: t.range,
      })),
      ...outputs.map((o, i) => ({
        id: o.id,
        label: o.label,
        samples: [...outputSamples[i]],
        marks: { ...outputMarks[i], ...(marks[o.id] ?? {}) },
        range: o.range,
      })),
    ],
    guides,
    readouts,
    description,
  });

  const frames: SignalFrame[] = [
    build({}, undefined, emptyOutputs(), outputs.map(() => ({})), config.startReadouts ?? [], config.startText),
  ];
  const written = emptyOutputs();
  steps.forEach((step, s) => {
    const at = step.outIndex ?? s;
    step.values.forEach((v, i) => {
      written[i][at] = v;
    });
    frames.push(
      build(
        step.marks,
        step.overrides,
        written.map((w) => [...w]),
        outputs.map(() => ({ [at]: step.kind })),
        step.readouts,
        step.text,
      ),
    );
  });
  const finalMarks = outputs.map((o) => {
    const all: Mark = {};
    written[outputs.indexOf(o)].forEach((v, i) => {
      if (v !== null) all[i] = "settled";
    });
    return { ...all, ...(config.finalMarks?.[o.id] ?? {}) };
  });
  frames.push(
    build(
      {},
      steps.length > 0 ? steps[steps.length - 1].overrides : undefined,
      written.map((w) => [...w]),
      finalMarks,
      config.endReadouts ?? [],
      config.endText,
    ),
  );
  return frames;
}

// ===========================================================================
// ノイズゲート: エンベロープがしきい値を下回ったら(ホールドが切れた後)出力を絞る
// ===========================================================================

export const NOISE_GATE_THRESHOLD = 0.25;
export const NOISE_GATE_HOLD = 3;
export const NOISE_GATE_FLOOR = 0.05;
const NOISE_GATE_DECAY = 0.8;
const NOISE_GATE_SMOOTH = 0.6;

/** 大きい演奏(0〜11)→ 小さい背景ノイズ(12〜27)→ 大きい演奏(28〜39)。 */
export function noiseGateInput(): number[] {
  const rng = lcg(7);
  return Array.from({ length: 40 }, (_, n) => {
    const noise = 0.06 * (rng() * 2 - 1);
    return n >= 12 && n < 28 ? noise : 0.8 * Math.sin((TWO_PI * n) / 8);
  });
}

export function noiseGateSteps(): SignalFrame[] {
  const x = noiseGateInput();
  let env = 0;
  let hold = 0;
  let gain = 0;
  const steps: StreamStep[] = x.map((value, n) => {
    const level = Math.abs(value);
    env = level > env ? level : env * NOISE_GATE_DECAY;
    hold = env >= NOISE_GATE_THRESHOLD ? NOISE_GATE_HOLD : Math.max(0, hold - 1);
    const open = env >= NOISE_GATE_THRESHOLD || hold > 0;
    gain += ((open ? 1 : NOISE_GATE_FLOOR) - gain) * NOISE_GATE_SMOOTH;
    const y = value * gain;
    return {
      values: [y],
      kind: open ? "settled" : "swapping",
      marks: { in: { [n]: "pivot" } },
      readouts: [
        { label: "エンベロープ", value: f2(env) },
        { label: "ゲート", value: open ? "開(通す)" : "閉(絞る)" },
        { label: "ゲイン", value: f2(gain) },
      ],
      text: `サンプル${n}: レベル${f2(env)}はしきい値${NOISE_GATE_THRESHOLD}${env >= NOISE_GATE_THRESHOLD ? "以上" : "未満"}。${open ? (env >= NOISE_GATE_THRESHOLD ? "ゲートを開けて通す" : `ホールド中なのでまだ開けたまま`) : "ゲートを閉じて絞る"}(ゲイン${f2(gain)})`,
    };
  });
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n]", samples: x, range: 1 }],
    outputs: [{ id: "out", label: "出力 y[n] = x[n] × ゲイン", length: x.length, range: 1 }],
    steps,
    guides: [
      { traceId: "in", value: NOISE_GATE_THRESHOLD, label: "しきい値" },
      { traceId: "in", value: -NOISE_GATE_THRESHOLD, label: "" },
    ],
    startText: "演奏音の間に小さな背景ノイズが挟まっている。レベルがしきい値を下回った区間だけ出力を絞る。",
    endText: "完了: 中ほどの背景ノイズの区間だけ出力が小さくなり、演奏音はそのまま通っている。",
  });
}

// ===========================================================================
// ウェーブシェーピング歪み: tanhのソフトクリップとハードクリップを並べる
// ===========================================================================

export const WAVESHAPER_DRIVE = 3;
export const WAVESHAPER_CLIP = 0.8;

export function waveshaperInput(): number[] {
  return Array.from({ length: 32 }, (_, n) => 0.9 * Math.sin((TWO_PI * n) / 16));
}

/** 長さ N の列の、周波数ビン k の振幅(片側スペクトル、正規化済み)。 */
export function dftMagnitude(values: readonly number[], bin: number): number {
  let re = 0;
  let im = 0;
  values.forEach((v, n) => {
    re += v * Math.cos((TWO_PI * bin * n) / values.length);
    im -= v * Math.sin((TWO_PI * bin * n) / values.length);
  });
  return (2 * Math.hypot(re, im)) / values.length;
}

export function waveshapingDistortionSteps(): SignalFrame[] {
  const x = waveshaperInput();
  const soft = x.map((v) => Math.tanh(WAVESHAPER_DRIVE * v) / Math.tanh(WAVESHAPER_DRIVE));
  const hard = x.map((v) => Math.max(-WAVESHAPER_CLIP, Math.min(WAVESHAPER_CLIP, WAVESHAPER_DRIVE * v)) / WAVESHAPER_CLIP);
  const steps: StreamStep[] = x.map((value, n) => {
    const driven = WAVESHAPER_DRIVE * value;
    const clipped = Math.abs(driven) > WAVESHAPER_CLIP;
    return {
      values: [soft[n], hard[n]],
      kind: clipped ? "swapping" : "comparing",
      marks: { in: { [n]: "pivot" } },
      readouts: [
        { label: "ドライブ後 g·x", value: f2(driven) },
        { label: "ソフト tanh(g·x)", value: f2(soft[n]) },
        { label: "ハード clamp", value: f2(hard[n]) },
      ],
      text: `サンプル${n}: g·x = ${f2(driven)}。${clipped ? "しきい値を超えたので、ハードクリップは頭を切り、tanhは丸めて抑える" : "しきい値の内側なので、ほぼそのまま通る"}`,
    };
  });
  const spectrum = (signal: number[]) => `3次倍音 ${f3(dftMagnitude(signal, 6))}`;
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](正弦波)", samples: x, range: 1.1 }],
    outputs: [
      { id: "soft", label: "ソフトクリップ tanh(g·x)", length: x.length, range: 1.1 },
      { id: "hard", label: "ハードクリップ clamp(g·x)", length: x.length, range: 1.1 },
    ],
    steps,
    startText: `ドライブ g=${WAVESHAPER_DRIVE} で持ち上げた波形を、非線形な関数に通す。通した波形には元の正弦波になかった倍音が生まれる。`,
    startReadouts: [{ label: "入力の3次倍音", value: f3(dftMagnitude(x, 6)) }],
    endText: `完了: 角が丸まった/切り落とされた波形になり、3次倍音が入力の${f3(dftMagnitude(x, 6))}から${f3(dftMagnitude(soft, 6))}(ソフト)・${f3(dftMagnitude(hard, 6))}(ハード)に増えた。`,
    endReadouts: [
      { label: "入力", value: spectrum(x) },
      { label: "ソフト", value: spectrum(soft) },
      { label: "ハード", value: spectrum(hard) },
    ],
  });
}

// ===========================================================================
// μ-law圧伸: 同じ少ないビット数でも、小さい振幅の誤差が小さくなる
// ===========================================================================

export const MU_LAW_MU = 255;
export const COMPANDING_BITS = 4;

export function muLawInput(): number[] {
  return Array.from({ length: 40 }, (_, n) => 0.9 * Math.exp(-n / 10) * Math.sin((TWO_PI * n) / 10));
}
export function muLawCompress(x: number): number {
  return (Math.sign(x) * Math.log(1 + MU_LAW_MU * Math.abs(x))) / Math.log(1 + MU_LAW_MU);
}
export function muLawExpand(y: number): number {
  return (Math.sign(y) * ((1 + MU_LAW_MU) ** Math.abs(y) - 1)) / MU_LAW_MU;
}
/** -1〜1を bits ビットの均一量子化で丸める。 */
export function uniformQuantize(v: number, bits: number): number {
  const levels = 2 ** bits - 1;
  return (Math.round(((Math.max(-1, Math.min(1, v)) + 1) / 2) * levels) / levels) * 2 - 1;
}

export function muLawCompandingSteps(): SignalFrame[] {
  const x = muLawInput();
  const linear = x.map((v) => uniformQuantize(v, COMPANDING_BITS));
  const mu = x.map((v) => muLawExpand(uniformQuantize(muLawCompress(v), COMPANDING_BITS)));
  let linearError = 0;
  let muError = 0;
  const steps: StreamStep[] = x.map((value, n) => {
    const eLinear = Math.abs(linear[n] - value);
    const eMu = Math.abs(mu[n] - value);
    linearError += eLinear;
    muError += eMu;
    return {
      values: [linear[n], mu[n]],
      kind: eMu < eLinear ? "settled" : "comparing",
      marks: { in: { [n]: "pivot" } },
      readouts: [
        { label: "圧縮後 F(x)", value: f2(muLawCompress(value)) },
        { label: "線形の誤差", value: f3(eLinear) },
        { label: "μ-lawの誤差", value: f3(eMu) },
        { label: "誤差の累計 線形/μ-law", value: `${f2(linearError)} / ${f2(muError)}` },
      ],
      text: `サンプル${n}: x=${f2(value)}。誤差は 線形${f3(eLinear)} に対して μ-law${f3(eMu)}(${eMu < eLinear ? "μ-lawが小さい" : "線形が小さい、または同程度"})`,
    };
  });
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](だんだん小さくなる)", samples: x, range: 1 }],
    outputs: [
      { id: "linear", label: `線形${COMPANDING_BITS}bit 量子化 → 復元`, length: x.length, range: 1 },
      { id: "mu", label: `μ-law ${COMPANDING_BITS}bit 圧縮 → 量子化 → 伸張`, length: x.length, range: 1 },
    ],
    steps,
    startText: `同じ${COMPANDING_BITS}bitでも、先に対数圧縮(μ=${MU_LAW_MU})してから量子化すると、小さい振幅を細かく刻める。`,
    endText: `完了: 誤差の累計は 線形${f2(linearError)} / μ-law${f2(muError)}。振幅が小さくなる後半ほど、線形は段差が目立ち、μ-lawは波形に追従している。`,
  });
}

// ===========================================================================
// ダイナミックレンジコンプレッサー: しきい値を超えた分だけ比率で圧縮する
// ===========================================================================

export const COMPRESSOR_THRESHOLD_DB = -12;
export const COMPRESSOR_RATIO = 4;
const COMPRESSOR_ATTACK = 0.6;
const COMPRESSOR_RELEASE = 0.15;

/** 小さい(0.2)→ 大きい(0.9)→ 小さい(0.2)の演奏。 */
export function compressorInput(): number[] {
  return Array.from({ length: 40 }, (_, n) => {
    const amp = n >= 10 && n < 30 ? 0.9 : 0.2;
    return amp * Math.sin((TWO_PI * n) / 8);
  });
}

export function dynamicRangeCompressionSteps(): SignalFrame[] {
  const x = compressorInput();
  let env = 0;
  const thresholdLinear = 10 ** (COMPRESSOR_THRESHOLD_DB / 20);
  const steps: StreamStep[] = x.map((value, n) => {
    const level = Math.abs(value);
    env += (level - env) * (level > env ? COMPRESSOR_ATTACK : COMPRESSOR_RELEASE);
    const levelDb = 20 * Math.log10(Math.max(env, 1e-6));
    const reductionDb = Math.max(0, levelDb - COMPRESSOR_THRESHOLD_DB) * (1 - 1 / COMPRESSOR_RATIO);
    const gain = 10 ** (-reductionDb / 20);
    return {
      values: [value * gain],
      kind: reductionDb > 0 ? "swapping" : "comparing",
      marks: { in: { [n]: "pivot" } },
      readouts: [
        { label: "エンベロープ", value: `${f2(env)}(${levelDb.toFixed(1)}dB)` },
        { label: "ゲイン減衰", value: `${reductionDb.toFixed(1)}dB` },
        { label: "ゲイン", value: f2(gain) },
      ],
      text:
        reductionDb > 0
          ? `サンプル${n}: レベル${levelDb.toFixed(1)}dBがしきい値${COMPRESSOR_THRESHOLD_DB}dBを超過。超過分を1/${COMPRESSOR_RATIO}に圧縮して${reductionDb.toFixed(1)}dB下げる`
          : `サンプル${n}: レベル${levelDb.toFixed(1)}dBはしきい値以下なので、そのまま通す`,
    };
  });
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](小→大→小)", samples: x, range: 1 }],
    outputs: [{ id: "out", label: "出力 y[n] = x[n] × ゲイン", length: x.length, range: 1 }],
    steps,
    guides: [
      { traceId: "in", value: thresholdLinear, label: "しきい値" },
      { traceId: "in", value: -thresholdLinear, label: "" },
    ],
    startText: `しきい値${COMPRESSOR_THRESHOLD_DB}dB・比率${COMPRESSOR_RATIO}:1。大きい区間だけゲインを下げ、音量差を縮める。`,
    endText: "完了: 大きい区間の振幅が抑えられ、小さい区間との差が縮まった(立ち上がりはアタックの分だけ遅れて効く)。",
  });
}

// ===========================================================================
// 双二次フィルタ(ローパス): 直前2サンプルの入出力から1サンプルずつ計算する
// ===========================================================================

export const BIQUAD_OMEGA = TWO_PI / 16;
export const BIQUAD_Q = Math.SQRT1_2;

export function biquadInput(): number[] {
  return Array.from({ length: 48 }, (_, n) => 0.6 * Math.sin((TWO_PI * n) / 32) + 0.4 * Math.sin((TWO_PI * n) / 4));
}
/** Audio EQ Cookbook のローパス係数(a0で割って正規化済み)。 */
export function biquadLowpassCoefficients(): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const alpha = Math.sin(BIQUAD_OMEGA) / (2 * BIQUAD_Q);
  const cos = Math.cos(BIQUAD_OMEGA);
  const a0 = 1 + alpha;
  return { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

export function biquadFilterSteps(): SignalFrame[] {
  const x = biquadInput();
  const c = biquadLowpassCoefficients();
  const y: number[] = [];
  const steps: StreamStep[] = x.map((value, n) => {
    const x1 = n >= 1 ? x[n - 1] : 0;
    const x2 = n >= 2 ? x[n - 2] : 0;
    const y1 = n >= 1 ? y[n - 1] : 0;
    const y2 = n >= 2 ? y[n - 2] : 0;
    const out = c.b0 * value + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    y.push(out);
    const inMarks: Mark = { [n]: "pivot" };
    const outMarks: Mark = {};
    if (n >= 1) {
      inMarks[n - 1] = "comparing";
      outMarks[n - 1] = "comparing";
    }
    if (n >= 2) {
      inMarks[n - 2] = "comparing";
      outMarks[n - 2] = "comparing";
    }
    return {
      values: [out],
      kind: "settled",
      marks: { in: inMarks, out: outMarks },
      readouts: [
        { label: "入力 x[n], x[n-1], x[n-2]", value: `${f2(value)}, ${f2(x1)}, ${f2(x2)}` },
        { label: "出力 y[n-1], y[n-2]", value: `${f2(y1)}, ${f2(y2)}` },
        { label: "y[n]", value: f3(out) },
      ],
      text: `サンプル${n}: y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] − a1·y[n-1] − a2·y[n-2] = ${f3(out)}(直前2サンプルの入出力だけを使う)`,
    };
  });
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](ゆっくりした波 + 細かい波)", samples: x, range: 1.1 }],
    outputs: [{ id: "out", label: "出力 y[n](ローパス)", length: x.length, range: 1.1 }],
    steps,
    startText: `カットオフ ω0=2π/16・Q=0.707 のローパス。係数 b0=${f3(c.b0)} b1=${f3(c.b1)} b2=${f3(c.b2)} a1=${f3(c.a1)} a2=${f3(c.a2)}。`,
    startReadouts: [{ label: "係数", value: `b0=${f3(c.b0)} b1=${f3(c.b1)} b2=${f3(c.b2)} a1=${f3(c.a1)} a2=${f3(c.a2)}` }],
    endText: "完了: 細かい波が落ち、ゆっくりした波だけが残った(最初の数サンプルは過渡応答)。",
  });
}

// ===========================================================================
// コンボリューションリバーブ: 入力の各サンプルがインパルス応答のコピーを残す
// ===========================================================================

export const CONVOLUTION_X = [1, 0, 0.6, 0, 0, -0.5, 0.3, 0, 0, 0, 0, 0];
export const CONVOLUTION_H = [1, 0.7, 0.5, 0.35, 0.2, 0.1];

export function convolutionReverbSteps(): SignalFrame[] {
  const x = CONVOLUTION_X;
  const h = CONVOLUTION_H;
  const outLength = x.length + h.length - 1;
  const steps: StreamStep[] = Array.from({ length: outLength }, (_, s) => {
    const xMarks: Mark = {};
    const hMarks: Mark = {};
    const terms: string[] = [];
    let sum = 0;
    for (let k = Math.max(0, s - h.length + 1); k <= Math.min(x.length - 1, s); k++) {
      const product = x[k] * h[s - k];
      sum += product;
      if (x[k] !== 0) {
        xMarks[k] = "comparing";
        hMarks[s - k] = "comparing";
        terms.push(`x[${k}]·h[${s - k}]=${f2(product)}`);
      }
    }
    return {
      values: [sum],
      kind: terms.length > 0 ? "comparing" : "idle",
      marks: { x: xMarks, h: hMarks },
      readouts: [
        { label: "足し合わせる項", value: terms.length > 0 ? terms.join(" + ") : "なし(0)" },
        { label: "y[n]", value: f3(sum) },
      ],
      text:
        terms.length > 0
          ? `y[${s}] = Σ x[k]·h[${s}−k] = ${terms.join(" + ")} = ${f3(sum)}`
          : `y[${s}]: この位置に届く音はない(0)`,
    };
  });
  return streamFrames({
    fixed: [
      { id: "x", label: "入力 x[n](まばらな音)", samples: x, range: 1 },
      { id: "h", label: "インパルス応答 h[n](空間の残響)", samples: h, range: 1 },
    ],
    outputs: [{ id: "y", label: "出力 y[n] = x * h(畳み込み)", length: outLength, range: 1.2 }],
    steps,
    startText: "入力の1つ1つの音が、インパルス応答のコピー(その音の大きさ倍)を残していく。出力はそれらの重ね合わせ。",
    endText: `完了: 長さ ${x.length} と ${h.length} の畳み込みなので、出力は ${outLength} サンプル。各音の後ろに残響が尾を引いている。`,
  });
}

// ===========================================================================
// 自己相関法のピッチ検出: ラグを変えながら自分自身との似かたを測る
// ===========================================================================

export const AUTOCORR_PERIOD = 10;
export const AUTOCORR_SAMPLE_RATE = 800;
export const AUTOCORR_MAX_LAG = 24;

export function autocorrelationInput(): number[] {
  return Array.from(
    { length: 48 },
    (_, n) => Math.sin((TWO_PI * n) / AUTOCORR_PERIOD) + 0.5 * Math.sin((TWO_PI * 2 * n) / AUTOCORR_PERIOD + 0.6),
  );
}
export function autocorrelationAt(x: readonly number[], lag: number): number {
  let sum = 0;
  for (let n = 0; n + lag < x.length; n++) sum += x[n] * x[n + lag];
  return sum;
}
/** 自己相関の最初の明確なピーク(R が一度負になった後の最初の極大)のラグ。 */
export function pickPitchLag(r: readonly number[]): number {
  let wentNegative = false;
  for (let lag = 1; lag < r.length - 1; lag++) {
    if (r[lag] < 0) wentNegative = true;
    if (wentNegative && r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > 0) return lag;
  }
  return -1;
}

export function pitchDetectionAutocorrelationSteps(): SignalFrame[] {
  const x = autocorrelationInput();
  const r = [0, ...Array.from({ length: AUTOCORR_MAX_LAG }, (_, i) => autocorrelationAt(x, i + 1))];
  const rMax = Math.max(...r.map(Math.abs));
  const peak = pickPitchLag(r);
  const steps: StreamStep[] = Array.from({ length: AUTOCORR_MAX_LAG }, (_, i) => {
    const lag = i + 1;
    const shifted = x.map((_, n) => (n + lag < x.length ? x[n + lag] : null));
    return {
      values: [r[lag]],
      outIndex: lag,
      kind: "comparing" as StateColorKey,
      marks: {},
      overrides: { shifted },
      readouts: [
        { label: "ラグ τ", value: String(lag) },
        { label: "R(τ) = Σ x[n]·x[n+τ]", value: f2(r[lag]) },
      ],
      text: `τ=${lag}: 波形を${lag}サンプルずらして掛け合わせると R(${lag}) = ${f2(r[lag])}(${r[lag] > 0 ? "似ている" : "逆向きに似ている/似ていない"})`,
    };
  });
  const sampleRate = AUTOCORR_SAMPLE_RATE;
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](基本波 + 2倍音)", samples: x, range: 1.7 }],
    dynamic: [{ id: "shifted", label: "τサンプルずらした x[n+τ]", samples: Array<number | null>(x.length).fill(null), range: 1.7 }],
    outputs: [{ id: "r", label: "自己相関 R(τ)(横軸はラグ τ。τ=0は除外)", length: r.length, range: rMax }],
    steps,
    startText: "波形を少しずつずらして自分自身と掛け合わせる。ぴったり重なるずらし幅が1周期に当たる。",
    finalMarks: { r: { [peak]: "pivot" } },
    endText: `完了: 一度負になった後の最初のピークは τ=${peak}。基本周波数は ${sampleRate}Hz ÷ ${peak} = ${sampleRate / peak}Hz(サンプリング周波数${sampleRate}Hzの仮定)。`,
    endReadouts: [
      { label: "ピークのラグ", value: String(peak) },
      { label: "基本周波数", value: `${sampleRate / peak}Hz` },
    ],
  });
}

// ===========================================================================
// Karplus-Strong: ノイズを詰めた遅延バッファを平均化しながら循環させる
// ===========================================================================

export const KARPLUS_BUFFER = 10;
export const KARPLUS_DECAY = 0.97;
export const KARPLUS_LENGTH = 50;

export function karplusInitialBuffer(): number[] {
  const rng = lcg(11);
  return Array.from({ length: KARPLUS_BUFFER }, () => rng() * 2 - 1);
}

export function karplusStrongSteps(): SignalFrame[] {
  const buffer = karplusInitialBuffer();
  const initial = [...buffer];
  const steps: StreamStep[] = [];
  for (let n = 0; n < KARPLUS_LENGTH; n++) {
    const i = n % KARPLUS_BUFFER;
    const next = (i + 1) % KARPLUS_BUFFER;
    const out = buffer[i];
    const avg = (buffer[i] + buffer[next]) / 2;
    buffer[i] = KARPLUS_DECAY * avg;
    steps.push({
      values: [out],
      kind: "settled",
      marks: {},
      overrides: { buffer: [...buffer] },
      readouts: [
        { label: "読み出し buf[i]", value: f2(out) },
        { label: "平均 (buf[i]+buf[i+1])/2", value: f2(avg) },
        { label: "書き戻し", value: f2(buffer[i]) },
      ],
      text: `サンプル${n}: buf[${i}]=${f2(out)} を出力。隣の buf[${next}] との平均に ${KARPLUS_DECAY} を掛けて書き戻す(高い周波数ほど早く弱まる)`,
    });
    steps[n].marks = { buffer: { [i]: "pivot", [next]: "comparing" } };
  }
  return streamFrames({
    fixed: [],
    dynamic: [{ id: "buffer", label: `遅延バッファ(長さ${KARPLUS_BUFFER}。一周するたびに平均化される)`, samples: initial, range: 1 }],
    outputs: [{ id: "out", label: "出力(弦の音)", length: KARPLUS_LENGTH, range: 1 }],
    steps,
    startText: `長さ${KARPLUS_BUFFER}のバッファをノイズで満たす。バッファ長がそのまま1周期=音の高さになる。`,
    endText: `完了: バッファを${KARPLUS_LENGTH / KARPLUS_BUFFER}周した。周期${KARPLUS_BUFFER}で繰り返しながら、周を重ねるごとに振幅が弱まり、波形がなめらかになっていく。`,
  });
}

// ===========================================================================
// ウェーブテーブル合成: 1周期分のテーブルを位相増分で読み出し、線形補間する
// ===========================================================================

export const WAVETABLE_SIZE = 16;
export const WAVETABLE_INCREMENT = 1.7;
export const WAVETABLE_LENGTH = 32;

export function wavetable(): number[] {
  return Array.from({ length: WAVETABLE_SIZE }, (_, k) => 0.7 * Math.sin((TWO_PI * k) / WAVETABLE_SIZE) + 0.3 * Math.sin((TWO_PI * 3 * k) / WAVETABLE_SIZE));
}

export function wavetableSynthesisSteps(): SignalFrame[] {
  const table = wavetable();
  let phase = 0;
  const steps: StreamStep[] = [];
  for (let n = 0; n < WAVETABLE_LENGTH; n++) {
    const i0 = Math.floor(phase);
    const i1 = (i0 + 1) % WAVETABLE_SIZE;
    const frac = phase - i0;
    const out = table[i0] * (1 - frac) + table[i1] * frac;
    steps.push({
      values: [out],
      kind: "settled",
      marks: { table: { [i0]: "pivot", [i1]: "comparing" } },
      readouts: [
        { label: "位相", value: phase.toFixed(2) },
        { label: "隣り合う2点", value: `table[${i0}]=${f2(table[i0])}, table[${i1}]=${f2(table[i1])}` },
        { label: "補間(小数部" + f2(frac) + ")", value: f3(out) },
      ],
      text: `サンプル${n}: 位相${phase.toFixed(2)}。table[${i0}]と table[${i1}] を ${f2(1 - frac)}:${f2(frac)} で混ぜて ${f3(out)}`,
    });
    phase = (phase + WAVETABLE_INCREMENT) % WAVETABLE_SIZE;
  }
  return streamFrames({
    fixed: [{ id: "table", label: `テーブル(1周期=${WAVETABLE_SIZE}点)`, samples: table, range: 1 }],
    outputs: [{ id: "out", label: "出力", length: WAVETABLE_LENGTH, range: 1 }],
    steps,
    startText: `位相を1サンプルごとに ${WAVETABLE_INCREMENT} ずつ進めてテーブルを読む。増分を大きくすると高い音になる。`,
    endText: `完了: テーブル1周分(${WAVETABLE_SIZE}点)を${(WAVETABLE_SIZE / WAVETABLE_INCREMENT).toFixed(1)}サンプルで一周する速さで読み出した。端数の位置は隣り合う2点の補間で埋めている。`,
  });
}

// ===========================================================================
// ADPCM: 予測との差を、変化の激しさに応じて伸び縮みするステップ幅で符号化する
// ===========================================================================

export const ADPCM_CODE_LIMIT = 7;
export const ADPCM_STEP_MIN = 0.02;
export const ADPCM_STEP_MAX = 0.5;
export const ADPCM_STEP_START = 0.05;
/** |コード|ごとの、次のステップ幅の倍率(大きい差が続くほどステップを広げる)。 */
export const ADPCM_STEP_FACTOR = [0.9, 0.9, 0.9, 0.9, 1.2, 1.6, 2, 2.4];

export function adpcmInput(): number[] {
  return Array.from({ length: 40 }, (_, n) => (n < 16 ? 0.15 * Math.sin((TWO_PI * n) / 16) : 0.85 * Math.sin((TWO_PI * n) / 10)));
}

export function adpcmSteps(): SignalFrame[] {
  const x = adpcmInput();
  let predicted = 0;
  let step = ADPCM_STEP_START;
  let totalBits = 0;
  const steps: StreamStep[] = x.map((value, n) => {
    const diff = value - predicted;
    const code = Math.max(-ADPCM_CODE_LIMIT, Math.min(ADPCM_CODE_LIMIT, Math.round(diff / step)));
    predicted = Math.max(-1, Math.min(1, predicted + code * step));
    const usedStep = step;
    step = Math.max(ADPCM_STEP_MIN, Math.min(ADPCM_STEP_MAX, step * ADPCM_STEP_FACTOR[Math.abs(code)]));
    totalBits += 4;
    return {
      values: [predicted],
      kind: Math.abs(code) >= 4 ? "swapping" : "comparing",
      marks: { in: { [n]: "pivot" } },
      readouts: [
        { label: "差分 / ステップ幅", value: `${f2(diff)} / ${f3(usedStep)}` },
        { label: "4bitコード", value: String(code) },
        { label: "次のステップ幅", value: f3(step) },
      ],
      text: `サンプル${n}: 予測との差${f2(diff)}をステップ${f3(usedStep)}で割ってコード${code}。${Math.abs(code) >= 4 ? "差が大きいので次のステップ幅を広げる" : "差が小さいので次のステップ幅を縮める"}`,
    };
  });
  return streamFrames({
    fixed: [{ id: "in", label: "入力 x[n](小さい波 → 急に大きい波)", samples: x, range: 1 }],
    outputs: [{ id: "out", label: "復元した波形(予測値の更新)", length: x.length, range: 1 }],
    steps,
    startText: "各サンプルを「予測との差」を4bit(−7〜7)のコードにして送る。差が大きい間はステップ幅を広げて追いつく。",
    endText: `完了: ${x.length}サンプルを ${totalBits}bit(1サンプル4bit)で符号化。振幅が急に増えた直後は追従が遅れ、ステップ幅が広がるにつれて波形に追いついている。`,
  });
}

// ---- レジストリ ----

export const SIGNAL_VISUALIZERS: Record<string, () => SignalFrame[]> = {
  "noise-gate": noiseGateSteps,
  "waveshaping-distortion": waveshapingDistortionSteps,
  "mu-law-a-law-companding": muLawCompandingSteps,
  "dynamic-range-compression": dynamicRangeCompressionSteps,
  "biquad-filter": biquadFilterSteps,
  "convolution-reverb": convolutionReverbSteps,
  "pitch-detection-autocorrelation": pitchDetectionAutocorrelationSteps,
  "karplus-strong-string-synthesis": karplusStrongSteps,
  "wavetable-synthesis": wavetableSynthesisSteps,
  adpcm: adpcmSteps,
};

/** 画面の説明用メタ情報(チップ文言・注意書き)。 */
export const SIGNAL_META: Record<string, SignalMeta> = {
  "noise-gate": {
    chips: [`しきい値 ${NOISE_GATE_THRESHOLD}`, `ホールド ${NOISE_GATE_HOLD}サンプル`, "エンベロープ追従 + ゲイン平滑化"],
    caveat: "アタック/ホールド/リリースを、1サンプル単位の簡略なモデルにしています(実機は数ms〜数百ms)。",
  },
  "waveshaping-distortion": {
    chips: [`ドライブ g=${WAVESHAPER_DRIVE}`, "ソフト=tanh / ハード=clamp", "3次倍音を離散フーリエ変換で計測"],
  },
  "mu-law-a-law-companding": {
    chips: [`μ=${MU_LAW_MU}`, `${COMPANDING_BITS}bit で比較`],
    caveat: `違いが見えるよう${COMPANDING_BITS}bitで比べています。実際のG.711は8bitで、区分線形近似を使います。`,
  },
  "dynamic-range-compression": {
    chips: [`しきい値 ${COMPRESSOR_THRESHOLD_DB}dB`, `比率 ${COMPRESSOR_RATIO}:1`, "アタック速め・リリース遅め"],
  },
  "biquad-filter": {
    chips: ["ローパス(Audio EQ Cookbook)", "ω0 = 2π/16", `Q = ${BIQUAD_Q.toFixed(3)}`],
  },
  "convolution-reverb": {
    chips: [`入力 ${CONVOLUTION_X.length}サンプル`, `インパルス応答 ${CONVOLUTION_H.length}サンプル`, "直接計算 O(n·m)"],
    caveat: "実用ではFFTによる高速畳み込みを使います。ここでは定義どおりの直接計算を追っています。",
  },
  "pitch-detection-autocorrelation": {
    chips: [`周期 ${AUTOCORR_PERIOD}サンプル(正解)`, `サンプリング周波数 ${AUTOCORR_SAMPLE_RATE}Hz(仮定)`, `ラグ 1〜${AUTOCORR_MAX_LAG}`],
  },
  "karplus-strong-string-synthesis": {
    chips: [`バッファ長 ${KARPLUS_BUFFER}`, `減衰 ${KARPLUS_DECAY}`, "2点平均 = ローパス"],
    caveat: "減衰を目に見える速さにするため、実際の値(0.98〜0.999)より強めにしています。",
  },
  "wavetable-synthesis": {
    chips: [`テーブル ${WAVETABLE_SIZE}点`, `位相増分 ${WAVETABLE_INCREMENT}`, "線形補間"],
  },
  adpcm: {
    chips: ["4bitコード(−7〜7)", "ステップ幅を適応", "デコーダも同じ計算で復元"],
    caveat: "IMAに近い考え方の簡略モデルです(本物のIMA-ADPCMは89段のステップ表を使います)。",
  },
};
