"use client";

import { useMemo } from "react";
import styles from "./StringMatchVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import type { CharState, StringMatchFrame } from "@/lib/string-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const CHAR_STEP_PX = 30;

const LEGEND_ITEMS: { key: CharState; label: string }[] = [
  { key: "matching", label: "比較中" },
  { key: "mismatch", label: "不一致" },
  { key: "matched", label: "一致確定" },
];

type StringMatchVisualizerProps = {
  algorithmId: string;
};

/**
 * 文字列パターンマッチングの可視化(KMP法/ラビン-カープ法/Z algorithm)。
 * テキスト行とパターン行を整列表示するHTML+CSSベースの実装(DPTableVisualizerと同じ技術選択)。
 * パターン行は data-state に応じた背景色をCSS transitionで滑らかに切り替える。
 */
export function StringMatchVisualizer({ algorithmId }: StringMatchVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "string", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<StringMatchFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <div className={styles.grid}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>text</span>
          <div className={styles.chars}>
            {currentFrame?.text.split("").map((ch, i) => (
              <span key={i} className={styles.char} data-state={currentFrame.textHighlight[i] ?? "idle"}>
                {ch}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>pattern</span>
          <div
            className={styles.chars}
            style={{ marginLeft: `${(currentFrame?.patternOffset ?? 0) * CHAR_STEP_PX}px` }}
          >
            {currentFrame?.pattern.split("").map((ch, i) => (
              <span key={i} className={styles.char} data-state={currentFrame.patternHighlight[i] ?? "idle"}>
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.description} role="status">
        {isComputing ? "Web Workerで計算中…" : currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={reset}
        resetLabel="最初から"
      />
      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem} data-legend-state={item.key}>
            <span className={styles.legendSwatch} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
