"use client";

import styles from "./PlaybackControls.module.css";

type PlaybackControlsProps = {
  stepIndex: number;
  frameCount: number;
  showPause: boolean;
  isFinished: boolean;
  onPlayPause: () => void;
  onStep: (delta: number) => void;
  onReset: () => void;
  resetLabel?: string;
};

/** 再生/一時停止/ステップ送り/リセットの共通コントロール(useStepPlayerとセットで使う)。 */
export function PlaybackControls({
  stepIndex,
  frameCount,
  showPause,
  isFinished,
  onPlayPause,
  onStep,
  onReset,
  resetLabel = "リセット",
}: PlaybackControlsProps) {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onStep(-1)}
        disabled={stepIndex === 0}
      >
        ← 戻る
      </button>
      <button type="button" className={styles.buttonPrimary} onClick={onPlayPause}>
        {showPause ? "一時停止" : isFinished ? "最初から再生" : "再生"}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onStep(1)}
        disabled={isFinished}
      >
        進む →
      </button>
      <button type="button" className={styles.button} onClick={onReset}>
        {resetLabel}
      </button>
      <span className={styles.stepCount}>
        STEP {stepIndex + 1} / {frameCount}
      </span>
    </div>
  );
}
