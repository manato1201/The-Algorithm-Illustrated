import type { StateColorKey } from "./design-tokens";

/**
 * 「音響・信号処理」カテゴリ用の可視化kind(signal)の型と、計算の共通部品。
 * 波形(折れ線)とスペクトル・係数(棒)を縦に並べた「パネル」の列として1フレームを表す。
 * 状態色の意味は他の可視化と共通のまま、信号処理の語彙に次のように対応させる:
 *   comparing = いま読んでいる・処理中のサンプル / pivot = 参照している基準(過去のサンプル・候補)
 *   swapping  = いま書き込む出力値             / settled = 確定した結果
 * 描画側は色に加えて印の形(●◆▲■)でも区別する。
 */

export type SignalPanel = {
  /** フレーム内で一意なid(状態タイムラインの要素キーに使う)。 */
  id: string;
  title: string;
  /** line = 連続波形の折れ線 / stem = スペクトル・係数などの棒。 */
  style: "line" | "stem";
  /** サンプル値。有限でない値(NaN)は「まだ計算していない」を表し、描画しない。 */
  values: number[];
  /** 比較用に薄く重ねる参照波形(原信号・ずらした信号など)。 */
  reference?: number[];
  highlight: Partial<Record<number, StateColorKey>>;
  /** 縦軸の範囲。全フレームで固定して、見た目の拡大縮小で誤解させない。 */
  yMin: number;
  yMax: number;
  /** サンプル位置の縦の目印(窓の端・ピーク位置など)。 */
  markers?: { index: number; label: string }[];
  /** 横軸が何を表すか(例: 「サンプル番号」「周波数ビン」)。 */
  xLabel?: string;
};

export type SignalFrame = {
  panels: SignalPanel[];
  description: string;
};

export type SignalMeta = {
  /** 入力の条件(サンプリング周波数・長さなど)を示すチップ。 */
  chips: string[];
};

type PanelOptions = {
  range: [number, number];
  style?: "line" | "stem";
  reference?: readonly number[];
  highlight?: Partial<Record<number, StateColorKey>>;
  markers?: { index: number; label: string }[];
  xLabel?: string;
};

export function panel(id: string, title: string, values: readonly number[], options: PanelOptions): SignalPanel {
  return {
    id,
    title,
    style: options.style ?? "line",
    values: [...values],
    reference: options.reference ? [...options.reference] : undefined,
    highlight: options.highlight ?? {},
    yMin: options.range[0],
    yMax: options.range[1],
    markers: options.markers,
    xLabel: options.xLabel,
  };
}

export function signalFrame(description: string, ...panels: SignalPanel[]): SignalFrame {
  return { panels, description };
}

/** 固定シードの乱数(mulberry32)。可視化は毎回同じ入力で再現できなければならない。 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 素朴なDFT(O(N²))。可視化の入力は最大256点なので十分で、FFTの添字操作より読みやすい。 */
export function dft(x: readonly number[]): { re: number[]; im: number[] } {
  const n = x.length;
  const re = new Array<number>(n).fill(0);
  const im = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      re[k] += x[t] * Math.cos(angle);
      im[k] += x[t] * Math.sin(angle);
    }
  }
  return { re, im };
}

/** 振幅スペクトル(0〜N/2のビン)。振幅1の正弦波がちょうど1になるよう 2/N で正規化する(DCは1/N)。 */
export function amplitudeSpectrum(x: readonly number[]): number[] {
  const n = x.length;
  const { re, im } = dft(x);
  const bins = Math.floor(n / 2) + 1;
  return Array.from({ length: bins }, (_, k) => {
    const magnitude = Math.hypot(re[k], im[k]);
    return k === 0 || (n % 2 === 0 && k === n / 2) ? magnitude / n : (2 * magnitude) / n;
  });
}

export function hannWindow(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
}

export function sineTone(length: number, period: number, amplitude = 1, phase = 0): number[] {
  return Array.from({ length }, (_, n) => amplitude * Math.sin((2 * Math.PI * n) / period + phase));
}

export function maxAbs(values: readonly number[]): number {
  let max = 0;
  for (const v of values) if (Number.isFinite(v)) max = Math.max(max, Math.abs(v));
  return max;
}

export function energy(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v * v;
  return sum;
}

/** 値配列の先頭からcount個だけを有効とし、残りを「未計算」(NaN)にした配列を返す。 */
export function revealed(values: readonly number[], count: number): number[] {
  return values.map((v, i) => (i < count ? v : Number.NaN));
}

export function round(value: number, digits = 2): string {
  return value.toFixed(digits);
}
