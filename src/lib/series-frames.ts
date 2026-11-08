import {
  panel,
  revealed,
  signalFrame,
  type SignalFrame,
} from "./signal-math.ts";

/**
 * 時系列(制御・オプティマイザ・補間など、時刻 k を1つずつ進める処理)を、信号kindのパネル列として描くための共通部品。
 * 各パネルは「時刻 k までの値」を表示し、いま進めた時刻の点に印を付ける。
 *   入力(input)の点=comparing(いま読んでいる値) / 状態(state)=pivot(参照している値) / 出力(output)=swapping(いま書き込む値)
 * 最後のフレームでは、出力の全点を settled(確定)にする。
 */

export type SeriesRole = "input" | "state" | "output";

type SeriesCommon = {
  id: string;
  title: string;
  range: [number, number];
  style?: "line" | "stem";
  role: SeriesRole;
  xLabel?: string;
};

/** 時刻ごとに1点ずつ増える波形。 */
export type TimeSeries = SeriesCommon & {
  values: readonly number[];
  reference?: readonly number[];
};

/** 時刻ごとに全体が入れ替わる棒(例: P・I・Dの各項、更新後のパラメータ)。 */
export type SnapshotSeries = SeriesCommon & {
  snapshots: readonly (readonly number[])[];
  labels?: readonly string[];
};

export type SeriesSpec = TimeSeries | SnapshotSeries;

const KIND_OF_ROLE = {
  input: "comparing",
  state: "pivot",
  output: "swapping",
} as const;

function isSnapshot(series: SeriesSpec): series is SnapshotSeries {
  return "snapshots" in series;
}

export type SeriesFramesConfig = {
  series: readonly SeriesSpec[];
  /** 時刻ごとの説明(長さ = ステップ数)。 */
  texts: readonly string[];
  startText: string;
  endText: string;
};

/** 時刻 0..N-1 を1つずつ進めるフレーム列。フレーム数 = ステップ数 + 2(開始前と完了)。 */
export function seriesFrames(config: SeriesFramesConfig): SignalFrame[] {
  const { series, texts } = config;
  const steps = texts.length;
  const make = (
    count: number,
    description: string,
    finished: boolean,
  ): SignalFrame =>
    signalFrame(
      description,
      ...series.map((s) => {
        if (isSnapshot(s)) {
          const snapshot = s.snapshots[Math.max(0, Math.min(count, steps) - 1)];
          const values =
            count === 0 ? snapshot.map(() => Number.NaN) : [...snapshot];
          const highlight: Partial<
            Record<number, "comparing" | "pivot" | "swapping" | "settled">
          > = {};
          if (count > 0)
            snapshot.forEach(
              (_, i) =>
                (highlight[i] = finished ? "settled" : KIND_OF_ROLE[s.role]),
            );
          return panel(s.id, s.title, values, {
            range: s.range,
            style: s.style ?? "stem",
            highlight,
            xLabel: s.xLabel,
          });
        }
        const highlight: Partial<
          Record<number, "comparing" | "pivot" | "swapping" | "settled">
        > = {};
        if (finished && s.role === "output")
          s.values.forEach((_, i) => (highlight[i] = "settled"));
        else if (count > 0) highlight[count - 1] = KIND_OF_ROLE[s.role];
        return panel(s.id, s.title, revealed(s.values, count), {
          range: s.range,
          style: s.style ?? "line",
          reference: s.reference,
          highlight,
          xLabel: s.xLabel ?? "時刻 k",
        });
      }),
    );
  return [
    make(0, config.startText, false),
    ...Array.from({ length: steps }, (_, k) => make(k + 1, texts[k], false)),
    make(steps, config.endText, true),
  ];
}

/** 値の列から、余白を付けた縦軸の範囲を作る(全フレームで固定するため、事前に全体から決める)。 */
export function rangeOf(
  values: readonly number[],
  pad = 0.1,
  include: readonly number[] = [],
): [number, number] {
  const all = [...values, ...include].filter(Number.isFinite);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const margin = (hi - lo || 1) * pad;
  return [lo - margin, hi + margin];
}
