import { energy, panel, revealed, round, signalFrame, type SignalFrame } from "./signal-math.ts";

/**
 * 音響・信号処理: 符号化系(μ-law圧伸・ADPCM・FLACの線形予測+Rice符号・MDCT)。
 * 「どれだけビットを減らせたか」と「元に戻したときの誤差」を、実際の符号化・復号の結果で見せる。
 */

// ---------------------------------------------------------------------------
// μ-law 圧伸符号化
// ---------------------------------------------------------------------------

export const MULAW_MU = 255;
export const MULAW_BITS = 5;
export const MULAW_N = 64;
export const MULAW_QUIET_END = 32;

/** 前半は小さな音(振幅0.05)、後半は大きな音(振幅0.8)。同じ量子化幅で扱うと小さな音が潰れる。 */
export function mulawInput(): number[] {
  return Array.from({ length: MULAW_N }, (_, n) => (n < MULAW_QUIET_END ? 0.05 : 0.8) * Math.sin((2 * Math.PI * n) / 16));
}

export function mulawCompress(x: number): number {
  return Math.sign(x) * (Math.log(1 + MULAW_MU * Math.abs(x)) / Math.log(1 + MULAW_MU));
}

export function mulawExpand(y: number): number {
  return Math.sign(y) * ((Math.pow(1 + MULAW_MU, Math.abs(y)) - 1) / MULAW_MU);
}

/** [-1,1)を2^bits段に等分するmid-rise量子化(各段の中央値を返す)。 */
export function quantizeUniform(value: number, bits: number): number {
  const levels = 1 << bits;
  const step = 2 / levels;
  const index = Math.min(levels - 1, Math.max(0, Math.floor((value + 1) / step)));
  return -1 + (index + 0.5) * step;
}

export function snrDb(signal: readonly number[], decoded: readonly number[]): number {
  const noise = signal.map((v, i) => v - decoded[i]);
  return 10 * Math.log10(energy(signal) / energy(noise));
}

export function muLawCompandingSteps(): SignalFrame[] {
  const x = mulawInput();
  const compressedQ = x.map((v) => quantizeUniform(mulawCompress(v), MULAW_BITS));
  const restored = compressedQ.map(mulawExpand);
  const uniform = x.map((v) => quantizeUniform(v, MULAW_BITS));
  const errMu = x.map((v, i) => restored[i] - v);
  const errUni = x.map((v, i) => uniform[i] - v);
  const frames: SignalFrame[] = [];
  const build = (count: number, current: number | null) => [
    panel("original", "原信号 x[n](薄い線は μ-law で復元した波形)", x, {
      range: [-1, 1],
      reference: revealed(restored, count),
      highlight: current === null ? {} : { [current]: "comparing" },
      xLabel: "サンプル番号 n(前半は小さな音、後半は大きな音)",
    }),
    panel("compressed", `圧縮して${MULAW_BITS}ビットに量子化した値 F(x)`, revealed(compressedQ, count), {
      range: [-1, 1],
      highlight: current === null ? {} : { [current]: "swapping" },
      xLabel: "サンプル番号 n",
    }),
    panel("error", "復元誤差(濃い線 = μ-law、薄い線 = 圧縮せず同じビット数で量子化)", revealed(errMu, count), {
      range: [-0.15, 0.15],
      reference: revealed(errUni, count),
      highlight: current === null ? {} : { [current]: "settled" },
      xLabel: "サンプル番号 n",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: ${MULAW_BITS}ビット(${1 << MULAW_BITS}段)で量子化する。小さな音は段の幅より小さく潰れてしまう。そこで量子化の前に対数で圧縮し、後で伸ばして戻す`,
      ...build(0, null),
    ),
  );
  for (let i = 0; i < MULAW_N; i += 1) {
    frames.push(
      signalFrame(
        `n=${i}: x=${round(x[i], 3)} → 圧縮 ${round(mulawCompress(x[i]), 3)} → 量子化 ${round(compressedQ[i], 3)} → 伸長 ${round(restored[i], 3)}(誤差 ${round(errMu[i], 3)}、圧縮なしなら ${round(errUni[i], 3)})`,
        ...build(i + 1, i),
      ),
    );
  }
  const quiet = x.slice(0, MULAW_QUIET_END);
  const loud = x.slice(MULAW_QUIET_END);
  frames.push(
    signalFrame(
      `SN比(μ-law / 圧縮なし): 小さな音 ${round(snrDb(quiet, restored.slice(0, MULAW_QUIET_END)), 1)} / ${round(snrDb(quiet, uniform.slice(0, MULAW_QUIET_END)), 1)}dB、大きな音 ${round(snrDb(loud, restored.slice(MULAW_QUIET_END)), 1)} / ${round(snrDb(loud, uniform.slice(MULAW_QUIET_END)), 1)}dB。大きな音では誤差の絶対値は増えるが、小さな音の品質を大きく引き上げ、音量によらずSN比がそろう`,
      ...build(MULAW_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// ADPCM(IMA方式)
// ---------------------------------------------------------------------------

export const ADPCM_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107,
  118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894,
  6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767,
] as const;
export const ADPCM_INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8] as const;
export const ADPCM_N = 48;

export function adpcmInput(): number[] {
  return Array.from({ length: ADPCM_N }, (_, n) =>
    Math.round(11000 * Math.sin((2 * Math.PI * n) / 24) + 3000 * Math.sin((2 * Math.PI * n) / 8)),
  );
}

export type AdpcmStep = { code: number; predicted: number; stepIndex: number; stepSize: number };

/** 4ビット符号(符号ビット1+大きさ3ビット)で1サンプルずつ符号化する。復号側と同じ予測値の更新を行う。 */
export function adpcmEncode(x: readonly number[]): AdpcmStep[] {
  const steps: AdpcmStep[] = [];
  let predicted = 0;
  let index = 0;
  for (const sample of x) {
    const stepSize = ADPCM_STEP_TABLE[index];
    let diff = sample - predicted;
    let code = 0;
    if (diff < 0) {
      code = 8;
      diff = -diff;
    }
    let s = stepSize;
    if (diff >= s) {
      code |= 4;
      diff -= s;
    }
    s >>= 1;
    if (diff >= s) {
      code |= 2;
      diff -= s;
    }
    s >>= 1;
    if (diff >= s) code |= 1;
    predicted = adpcmReconstruct(predicted, code, stepSize);
    index = Math.min(88, Math.max(0, index + ADPCM_INDEX_TABLE[code & 7]));
    steps.push({ code, predicted, stepIndex: index, stepSize });
  }
  return steps;
}

export function adpcmReconstruct(predicted: number, code: number, stepSize: number): number {
  let delta = stepSize >> 3;
  if (code & 4) delta += stepSize;
  if (code & 2) delta += stepSize >> 1;
  if (code & 1) delta += stepSize >> 2;
  const next = code & 8 ? predicted - delta : predicted + delta;
  return Math.min(32767, Math.max(-32768, next));
}

export function adpcmSteps(): SignalFrame[] {
  const x = adpcmInput();
  const steps = adpcmEncode(x);
  const decoded = steps.map((s) => s.predicted);
  const signedCodes = steps.map((s) => (s.code & 8 ? -(s.code & 7) : s.code & 7));
  const stepSizes = steps.map((s) => s.stepSize);
  const stepMax = Math.max(...stepSizes);
  const frames: SignalFrame[] = [];
  const build = (count: number, current: number | null) => [
    panel("decoded", "原信号(薄い線)と、符号だけから復号した波形", revealed(decoded, count), {
      range: [-16000, 16000],
      reference: x,
      highlight: current === null ? {} : { [current]: "swapping" },
      xLabel: "サンプル番号 n",
    }),
    panel("code", "4ビット符号(符号ビット+大きさ3ビット、−7〜+7で表示)", revealed(signedCodes, count), {
      style: "stem",
      range: [-8, 8],
      highlight: current === null ? {} : { [current]: "comparing" },
      xLabel: "サンプル番号 n",
    }),
    panel("step", "ステップ幅(大きな符号が続くと広がり、小さいと縮む)", revealed(stepSizes, count), {
      range: [0, stepMax * 1.05],
      highlight: current === null ? {} : { [current]: "pivot" },
      xLabel: "サンプル番号 n",
    }),
  ];

  frames.push(
    signalFrame(
      `初期状態: 16ビットのサンプルを、直前の予測値との「差」だけ4ビットで送る。差を測る物差し(ステップ幅)は、符号の大きさに応じて自動で伸び縮みする`,
      ...build(0, null),
    ),
  );
  steps.forEach((step, n) => {
    const previous = n === 0 ? 0 : steps[n - 1].predicted;
    frames.push(
      signalFrame(
        `n=${n}: 差 ${x[n] - previous} をステップ幅${step.stepSize}で測り、符号 ${step.code.toString(2).padStart(4, "0")} → 予測値 ${step.predicted}(次のステップ幅 ${ADPCM_STEP_TABLE[step.stepIndex]})`,
        ...build(n + 1, n),
      ),
    );
  });
  const errorAt = (from: number) => Math.max(...x.slice(from).map((v, i) => Math.abs(v - decoded[from + i])));
  frames.push(
    signalFrame(
      `16ビット→4ビットで 1/4 に圧縮。ステップ幅が小さい出だしは追従できず誤差が最大 ${errorAt(0)} まで開くが、幅が育った後半(n≥24)は最大 ${errorAt(24)}(振幅 ±14000 に対して)に収まる`,
      ...build(ADPCM_N, null),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// FLAC方式のロスレス圧縮(固定線形予測+Rice符号)
// ---------------------------------------------------------------------------

export const FLAC_N = 48;
export const FLAC_MAX_ORDER = 4;
export const FLAC_SAMPLE_BITS = 16;

export function flacInput(): number[] {
  return Array.from({ length: FLAC_N }, (_, n) =>
    Math.round(2000 * Math.sin((2 * Math.PI * n) / 32) + 300 * Math.sin((2 * Math.PI * n) / 7)),
  );
}

/** FLACの固定予測器(多項式予測)。order次の差分を取った残差。先頭order個は予測できないので元の値を残す(warm-up)。 */
const FIXED_COEFS: readonly (readonly number[])[] = [[], [1], [2, -1], [3, -3, 1], [4, -6, 4, -1]];

export function flacResidual(x: readonly number[], order: number): number[] {
  return x.map((v, n) => {
    if (n < order) return v;
    let predicted = 0;
    for (let i = 0; i < order; i++) predicted += FIXED_COEFS[order][i] * x[n - 1 - i];
    return v - predicted;
  });
}

/** 残差をRice符号で表したときの総ビット数と最適なパラメータk(warm-upは16ビット固定)。 */
export function riceCost(residual: readonly number[], warmup: number): { bits: number; k: number } {
  const body = residual.slice(warmup).map((e) => (e >= 0 ? 2 * e : -2 * e - 1));
  let best = { bits: Infinity, k: 0 };
  for (let k = 0; k < 16; k++) {
    const bits = body.reduce((s, u) => s + (u >> k) + 1 + k, 0);
    if (bits < best.bits) best = { bits, k };
  }
  return { bits: best.bits + warmup * FLAC_SAMPLE_BITS, k: best.k };
}

export function flacDecode(residual: readonly number[], order: number): number[] {
  const out: number[] = [];
  residual.forEach((e, n) => {
    if (n < order) {
      out.push(e);
      return;
    }
    let predicted = 0;
    for (let i = 0; i < order; i++) predicted += FIXED_COEFS[order][i] * out[n - 1 - i];
    out.push(e + predicted);
  });
  return out;
}

export function flacLosslessCodingSteps(): SignalFrame[] {
  const x = flacInput();
  const residuals = Array.from({ length: FLAC_MAX_ORDER + 1 }, (_, order) => flacResidual(x, order));
  const costs = residuals.map((r, order) => riceCost(r, order));
  const bestOrder = costs.reduce((best, c, order) => (c.bits < costs[best].bits ? order : best), 0);
  const rawBits = FLAC_N * FLAC_SAMPLE_BITS;
  const bitsMax = Math.max(...costs.map((c) => c.bits), rawBits) * 1.05;
  const residualRange = Math.max(...residuals[0].map(Math.abs)) * 1.05;
  const frames: SignalFrame[] = [];
  const sig = (reference?: number[]) =>
    panel("signal", "原信号 x[n]", x, { range: [-residualRange, residualRange], reference, xLabel: "サンプル番号 n" });
  const res = (order: number | null) =>
    panel(
      "residual",
      order === null ? "残差 e[n](まだ計算していない)" : `${order}次の予測残差 e[n](先頭${order}個は元の値)`,
      order === null ? new Array<number>(FLAC_N).fill(Number.NaN) : residuals[order].map((v, n) => (n < order ? Number.NaN : v)),
      { range: [-residualRange, residualRange], xLabel: "サンプル番号 n" },
    );
  const bits = (count: number, highlight: Partial<Record<number, "comparing" | "settled">>) =>
    panel(
      "bits",
      `Rice符号の総ビット数(原信号そのままは${rawBits}ビット)`,
      revealed(costs.map((c) => c.bits), count),
      { style: "stem", range: [0, bitsMax], highlight, xLabel: "予測の次数(0 = 予測しない)" },
    );

  frames.push(
    signalFrame(
      `初期状態: 滑らかな波形は、直前の値から予測すると「残差」が小さくなり、小さい数は少ないビットで書ける。元に完全に戻せるのがFLACの特徴`,
      sig(),
      res(null),
      bits(0, {}),
    ),
  );
  for (let order = 0; order <= FLAC_MAX_ORDER; order++) {
    const { bits: total, k } = costs[order];
    frames.push(
      signalFrame(
        order === 0
          ? `0次: 予測せず元の値をそのまま符号化 → 残差の最大 ${Math.max(...residuals[0].map(Math.abs))}、Rice符号(k=${k})で ${total}ビット`
          : `${order}次の固定予測(${FIXED_COEFS[order].map((c, i) => `${c > 0 && i > 0 ? "+" : ""}${c}·x[n-${i + 1}]`).join(" ")}): 残差の最大 ${Math.max(...residuals[order].slice(order).map(Math.abs))}、Rice符号(k=${k})で ${total}ビット`,
        sig(),
        res(order),
        bits(order + 1, { [order]: "comparing" }),
      ),
    );
  }
  frames.push(
    signalFrame(
      `総ビット数が最小の${bestOrder}次を採用: ${costs[bestOrder].bits}ビット(原信号の ${round((costs[bestOrder].bits / rawBits) * 100, 0)}%)`,
      sig(),
      res(bestOrder),
      bits(FLAC_MAX_ORDER + 1, { [bestOrder]: "settled" }),
    ),
  );
  const decoded = flacDecode(residuals[bestOrder], bestOrder);
  const exact = decoded.every((v, n) => v === x[n]);
  frames.push(
    signalFrame(
      `復号: 残差に予測を足し戻す → 全${FLAC_N}サンプルが原信号と${exact ? "完全に一致(誤差0、ロスレス)" : "一致しない"}`,
      sig(decoded),
      panel("decodeError", "復号と原信号の差(常に0)", x.map((v, n) => decoded[n] - v), {
        range: [-residualRange, residualRange],
        highlight: Object.fromEntries(x.map((_, n) => [n, "settled" as const])),
        xLabel: "サンプル番号 n",
      }),
      bits(FLAC_MAX_ORDER + 1, { [bestOrder]: "settled" }),
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// MDCT(修正離散コサイン変換)による変換符号化
// ---------------------------------------------------------------------------

export const MDCT_BLOCK = 16;
export const MDCT_LENGTH = 64;
export const MDCT_QUANT_STEP = 0.6;

export function mdctInput(): number[] {
  return Array.from(
    { length: MDCT_LENGTH },
    (_, n) => 0.6 * Math.sin((2 * Math.PI * n) / 20) + 0.25 * Math.sin((2 * Math.PI * n) / 7 + 1),
  );
}

export function sineWindow(length: number): number[] {
  return Array.from({ length }, (_, n) => Math.sin((Math.PI * (n + 0.5)) / length));
}

/** 長さ2Nの窓かけ済み区間 → N個のMDCT係数。 */
export function mdct(segment: readonly number[]): number[] {
  const n2 = segment.length;
  const n = n2 / 2;
  return Array.from({ length: n }, (_, k) => {
    let sum = 0;
    for (let i = 0; i < n2; i++) sum += segment[i] * Math.cos((Math.PI / n) * (i + 0.5 + n / 2) * (k + 0.5));
    return sum;
  });
}

/** N個の係数 → 長さ2Nの時間信号(エイリアシングを含む。窓をかけて隣と重ね合わせると打ち消し合う)。 */
export function imdct(coefs: readonly number[]): number[] {
  const n = coefs.length;
  return Array.from({ length: 2 * n }, (_, i) => {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += coefs[k] * Math.cos((Math.PI / n) * (i + 0.5 + n / 2) * (k + 0.5));
    return (2 / n) * sum;
  });
}

export type MdctBlock = { start: number; raw: number[]; quantized: number[]; windowed: number[] };

/** 信号を半分ずつ重ねた窓で区切り、MDCT→(量子化)→IMDCT→重ね合わせで復元する。step=0なら量子化しない。 */
export function mdctProcess(x: readonly number[], step: number): { blocks: MdctBlock[]; output: number[] } {
  const n = MDCT_BLOCK;
  const window = sineWindow(2 * n);
  const output = new Array<number>(x.length).fill(0);
  const blocks: MdctBlock[] = [];
  for (let start = -n; start < x.length; start += n) {
    const windowed = Array.from({ length: 2 * n }, (_, i) => (x[start + i] ?? 0) * window[i]);
    const raw = mdct(windowed);
    const quantized = step > 0 ? raw.map((c) => Math.round(c / step) * step) : raw;
    const back = imdct(quantized);
    for (let i = 0; i < 2 * n; i++) {
      const at = start + i;
      if (at >= 0 && at < x.length) output[at] += back[i] * window[i];
    }
    blocks.push({ start, raw, quantized, windowed });
  }
  return { blocks, output };
}

export function mdctAudioCodingSteps(): SignalFrame[] {
  const x = mdctInput();
  const n = MDCT_BLOCK;
  const { blocks, output } = mdctProcess(x, MDCT_QUANT_STEP);
  const coefMax = Math.ceil(Math.max(...blocks.flatMap((b) => b.raw.map(Math.abs))));
  const frames: SignalFrame[] = [];
  const completed = (blockIndex: number) => Math.max(0, Math.min(x.length, blocks[blockIndex].start + n));
  const sig = (blockIndex: number | null, done: number) =>
    panel("signal", "入力 x[n](薄い線は復号して重ね合わせた出力)", x, {
      range: [-1, 1],
      reference: output.map((v, i) => (i < done ? v : Number.NaN)),
      markers:
        blockIndex === null
          ? undefined
          : [
              { index: Math.max(0, blocks[blockIndex].start), label: "窓の始点" },
              { index: Math.min(x.length - 1, blocks[blockIndex].start + 2 * n - 1), label: "終点" },
            ],
      xLabel: "サンプル番号 n(窓は半分ずつ重なる)",
    });
  const coefs = (block: MdctBlock | null, quantized: boolean) =>
    panel(
      "coefs",
      quantized ? "量子化後の係数(濃い棒)と量子化前(薄い線)" : "MDCT係数(周波数ごとの成分)",
      block === null ? new Array<number>(n).fill(Number.NaN) : quantized ? block.quantized : block.raw,
      {
        style: "stem",
        range: [-coefMax, coefMax],
        reference: quantized && block ? block.raw : undefined,
        highlight: block === null || !quantized ? {} : Object.fromEntries(block.quantized.map((v, k) => [k, v === 0 ? "idle" : "settled"] as const)),
        xLabel: "周波数の番号 k(低域→高域)",
      },
    );

  frames.push(
    signalFrame(
      `初期状態: 半分ずつ重なる窓で区切り、各区間を周波数成分(MDCT係数)に変える。重要でない成分を粗く丸めて、MP3/AACのように圧縮する`,
      sig(null, 0),
      coefs(null, false),
    ),
  );
  blocks.forEach((block, b) => {
    const label = `ブロック${b + 1}/${blocks.length}`;
    const zeros = block.quantized.filter((v) => v === 0).length;
    frames.push(
      signalFrame(
        `${label}: n=${block.start}〜${block.start + 2 * n - 1} に正弦窓をかけて切り出し、MDCTで${n}個の係数にする(2N点 → N点)`,
        sig(b, completed(b) - n < 0 ? 0 : completed(b) - n),
        coefs(block, false),
      ),
    );
    frames.push(
      signalFrame(
        `${label}: 係数を幅${MDCT_QUANT_STEP}で丸める。${zeros}/${n}個の係数が0になり、送るデータが減る`,
        sig(b, completed(b) - n < 0 ? 0 : completed(b) - n),
        coefs(block, true),
      ),
    );
    frames.push(
      signalFrame(
        `${label}: 逆変換して窓をかけ、前のブロックと重ねて足す。重なり部分のエイリアシング(折り返しの歪み)が打ち消し合う`,
        sig(b, completed(b)),
        coefs(block, true),
      ),
    );
  });
  frames.push(
    signalFrame(
      `完成: 出力と原信号のSN比は ${round(10 * Math.log10(energy(x) / energy(x.map((v, i) => v - output[i]))), 1)}dB。量子化しなければ(幅0)ブロックのつなぎ目で誤差なく完全に復元できる`,
      sig(null, x.length),
      coefs(blocks[blocks.length - 1], true),
    ),
  );
  return frames;
}
