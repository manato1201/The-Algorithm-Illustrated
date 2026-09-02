"use client";

import styles from "./PlaybackControls.module.css";
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from "./useStepPlayer";

type PlaybackControlsProps = {
  stepIndex: number;
  frameCount: number;
  showPause: boolean;
  isFinished: boolean;
  speed: PlaybackSpeed;
  onPlayPause: () => void;
  onStep: (delta: number) => void;
  onScrub: (index: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onReset: () => void;
  resetLabel?: string;
};

/** 再生/一時停止/ステップ送り/スクラブ/速度切替/リセットの共通コントロール(useStepPlayerとセットで使う)。 */
export function PlaybackControls({
  stepIndex,
  frameCount,
  showPause,
  isFinished,
  speed,
  onPlayPause,
  onStep,
  onScrub,
  onSpeedChange,
  onReset,
  resetLabel = "リセット",
}: PlaybackControlsProps) {
  // ← →でステップ送り、Spaceで再生/一時停止。比較画面では可視化パネルが複数並ぶことがあるため、
  // windowに直接張るとどのパネルのキー操作か区別できない。フォーカスを受け取ったパネル自身に
  // リスナーを置き、クリック/Tabでフォーカスしたパネルだけが反応するようにする。
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // スクラバー(range input)自体がフォーカスされている間は、ネイティブの矢印キー操作に任せる
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
      aria-label="再生コントロール(クリック後、矢印キーで前後移動、スペースキーで再生/一時停止)"
    >
      <input
        type="range"
        className={styles.scrubber}
        min={0}
        max={Math.max(frameCount - 1, 0)}
        value={stepIndex}
        onChange={(event) => onScrub(Number(event.target.value))}
        aria-label="ステップ位置"
      />
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
        <div className={styles.speedGroup} role="group" aria-label="再生速度">
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
        <span className={styles.stepCount}>
          STEP {stepIndex + 1} / {frameCount}
        </span>
      </div>
    </div>
  );
}
