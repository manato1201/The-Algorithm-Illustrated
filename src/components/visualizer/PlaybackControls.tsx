"use client";

import { useMemo, useState } from "react";
import styles from "./PlaybackControls.module.css";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SpeedIcon,
  StepBackIcon,
  StepForwardIcon,
} from "./PlaybackIcons";
import { countKindsUpTo, type StepKind } from "./step-timeline";
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from "./useStepPlayer";

type PlaybackControlsProps = {
  stepIndex: number;
  frameCount: number;
  showPause: boolean;
  isFinished: boolean;
  speed: PlaybackSpeed;
  /** 各ステップの状態種別(下部タイムラインの色分けとカウンタに使う)。 */
  stepKinds: StepKind[];
  onPlayPause: () => void;
  onStep: (delta: number) => void;
  onScrub: (index: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onReset: () => void;
  resetLabel?: string;
};

/** タイムラインに並べる状態と表示名(決めごと表の状態語彙)。idleは数えない。 */
const COUNTED_KINDS: { kind: Exclude<StepKind, "idle">; label: string }[] = [
  { kind: "comparing", label: "比較中" },
  { kind: "swapping", label: "入れ替え" },
  { kind: "pivot", label: "基準" },
  { kind: "settled", label: "確定" },
];

/** 長い再生でもタイムラインのDOM数が膨らまないよう、目盛りはこの数までに丸める。 */
const MAX_TICKS = 240;

/** 数字が変わるたびに短くめくれるカウンタ。reduced-motion時はCSS側でアニメーションを止める。 */
function FlipNumber({ value }: { value: number }) {
  return (
    <span className={styles.flipSlot}>
      <span key={value} className={styles.flipDigit}>
        {value}
      </span>
    </span>
  );
}

/** 再生/一時停止/ステップ送り/タイムライン/速度切替/リセットの共通コントロール(useStepPlayerとセットで使う)。 */
export function PlaybackControls({
  stepIndex,
  frameCount,
  showPause,
  isFinished,
  speed,
  stepKinds,
  onPlayPause,
  onStep,
  onScrub,
  onSpeedChange,
  onReset,
  resetLabel = "リセット",
}: PlaybackControlsProps) {
  const [rippleCount, setRippleCount] = useState(0);

  // 目盛り(ビン)ごとの代表状態。ビンに複数ステップが入る場合は最も注目すべき状態を採る。
  const ticks = useMemo(() => {
    const binCount = Math.min(frameCount, MAX_TICKS);
    if (binCount <= 0) return [];
    const priority: StepKind[] = ["swapping", "comparing", "pivot", "settled", "idle"];
    const result: StepKind[] = [];
    for (let bin = 0; bin < binCount; bin++) {
      const from = Math.floor((bin * frameCount) / binCount);
      const to = Math.max(from, Math.floor(((bin + 1) * frameCount) / binCount) - 1);
      const present = new Set<StepKind>();
      for (let i = from; i <= to; i++) present.add(stepKinds[i] ?? "idle");
      result.push(priority.find((kind) => present.has(kind)) ?? "idle");
    }
    return result;
  }, [stepKinds, frameCount]);

  const counts = useMemo(() => countKindsUpTo(stepKinds, stepIndex), [stepKinds, stepIndex]);
  const presentKinds = useMemo(
    () => COUNTED_KINDS.filter(({ kind }) => stepKinds.includes(kind)),
    [stepKinds],
  );

  const lastIndex = Math.max(frameCount - 1, 0);
  const playheadPercent = lastIndex === 0 ? 0 : (stepIndex / lastIndex) * 100;
  const playedTicks =
    ticks.length === 0 ? 0 : Math.floor((stepIndex / frameCount) * ticks.length) + 1;
  const currentKind = stepKinds[stepIndex] ?? "idle";
  const currentLabel = COUNTED_KINDS.find(({ kind }) => kind === currentKind)?.label ?? "待機";

  // ← →でステップ送り、Spaceで再生/一時停止。比較画面では可視化パネルが複数並ぶことがあるため、
  // windowに直接張るとどのパネルのキー操作か区別できない。フォーカスを受け取ったパネル自身に
  // リスナーを置き、クリック/Tabでフォーカスしたパネルだけが反応するようにする。
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // タイムライン(range input)自体がフォーカスされている間は、ネイティブの矢印キー操作に任せる
    // (ここでも onStep を呼ぶと1回のキー操作で2ステップ進んでしまう)。
    if (event.target instanceof HTMLInputElement) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onStep(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onStep(1);
    } else if (event.key === " " || event.code === "Space") {
      // フォーカス中のボタンがSpaceのネイティブclickも発火させるため、二重発火を防ぐ。
      event.preventDefault();
      onPlayPause();
    }
  };

  return (
    <div
      className={styles.wrap}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-finished={isFinished && frameCount > 1}
      aria-label="再生コントロール(クリック後、矢印キーで前後移動、スペースキーで再生/一時停止)"
    >
      <div className={styles.timeline}>
        <div className={styles.strip} aria-hidden="true">
          {ticks.map((kind, index) => (
            <span
              key={index}
              className={styles.tick}
              data-kind={kind}
              data-played={index < playedTicks}
            />
          ))}
        </div>
        <span className={styles.playhead} style={{ left: `${playheadPercent}%` }} aria-hidden="true" />
        <input
          type="range"
          className={styles.timelineInput}
          min={0}
          max={lastIndex}
          value={stepIndex}
          onChange={(event) => onScrub(Number(event.target.value))}
          aria-label="ステップ位置(タイムライン)"
          aria-valuetext={`ステップ ${stepIndex + 1} / ${frameCount}(${currentLabel})`}
        />
      </div>

      <div className={styles.readout}>
        <ul className={styles.legend} aria-label="タイムラインの凡例と累計ステップ数">
          {presentKinds.map(({ kind, label }) => (
            <li key={kind} className={styles.legendItem}>
              <span className={styles.legendBar} data-kind={kind} aria-hidden="true" />
              {label}
              <FlipNumber value={counts[kind]} />
            </li>
          ))}
        </ul>
        <span className={styles.stepCount}>
          STEP <FlipNumber value={stepIndex + 1} /> / {frameCount}
        </span>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onStep(-1)}
          disabled={stepIndex === 0}
        >
          <StepBackIcon />
          戻る
        </button>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={() => {
            setRippleCount((count) => count + 1);
            onPlayPause();
          }}
        >
          {rippleCount > 0 ? (
            <span key={rippleCount} className={styles.ripple} aria-hidden="true" />
          ) : null}
          {showPause ? <PauseIcon /> : <PlayIcon />}
          {showPause ? "一時停止" : isFinished ? "最初から再生" : "再生"}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onStep(1)}
          disabled={isFinished}
        >
          進む
          <StepForwardIcon />
        </button>
        <button type="button" className={styles.button} onClick={onReset}>
          <ResetIcon />
          {resetLabel}
        </button>
        <div className={styles.speedGroup} role="group" aria-label="再生速度">
          <SpeedIcon className={styles.speedIcon} />
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.speedButton}
              data-active={s === speed}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
