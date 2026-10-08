"use client";

import { useMemo } from "react";
import styles from "./LaneVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { ZoomableStage } from "./ZoomableStage";
import { laneStepKinds } from "./step-timeline";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { LANE_META, type LaneFrame, type LaneState } from "@/lib/lane-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

/** 電力の目安を示す丸の数。 */
const POWER_CIRCLES = 5;

function matrixText(matrix: number[][]): string {
  return `[${matrix.map((row) => `[${row.join(",")}]`).join(",")}]`;
}

type LaneVisualizerProps = {
  algorithmId: string;
};

/**
 * 同じ計算を複数の方式で並べて進める可視化(逐次 / 並列 / 回路固定)。
 * 全レーンが同じステップ番号で進み、巻き戻すと全レーンが同じ時点に戻る(フレームが全レーンをまとめて持つため)。
 * 電力の目安は「メモリ読み出し量」にもとづく定性的なもので、実測値ではない。
 */
export function LaneVisualizer({ algorithmId }: LaneVisualizerProps) {
  const meta = LANE_META[algorithmId];
  const request = useMemo<WorkerRequest>(() => ({ kind: "lanes", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<LaneFrame>(request);
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => laneStepKinds(frames), [frames]);

  if (!meta) return null;
  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <ul className={styles.chips}>
        {meta.chips.map((chip) => (
          <li key={chip} className={styles.chip}>
            {chip}
          </li>
        ))}
        <li className={styles.chip}>
          A = {matrixText(meta.matrixA)} / B = {matrixText(meta.matrixB)}
        </li>
      </ul>

      <ZoomableStage>
        <div className={styles.lanes}>
          {currentFrame?.lanes.map((lane) => (
            <LaneCard key={lane.id} lane={lane} size={meta.size} maxReads={meta.maxReads} />
          ))}
        </div>
      </ZoomableStage>

      <p className={styles.description} role="status">
        {isComputing ? "Web Workerで計算中…" : currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        speed={speed}
        stepKinds={stepKinds}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onScrub={handleScrub}
        onSpeedChange={setSpeed}
        onReset={reset}
        resetLabel="最初から"
      />
      <p className={styles.caveat}>
        ※ 電力の目安はメモリ読み出し量にもとづく定性的なもので、実測値ではありません。専用回路(NPUなど)の実装は製品ごとに異なるため、ここでは考え方を示す簡略モデルです。
      </p>
    </div>
  );
}

function LaneCard({ lane, size, maxReads }: { lane: LaneState; size: number; maxReads: number }) {
  const powerLevel = Math.round((lane.memoryReads / maxReads) * POWER_CIRCLES);
  return (
    <section className={styles.lane} data-finished={lane.finished}>
      <header className={styles.laneHead}>
        <h3 className={styles.laneTitle}>{lane.label}</h3>
        {lane.finished ? <span className={styles.doneBadge}>完了</span> : null}
      </header>

      {/* 出力行列Cの各セル: 数字は部分和、下の点の数は足し込んだ積の数(色だけでなく数と形で進み具合を示す) */}
      <div
        className={styles.matrix}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        role="img"
        aria-label={`出力行列Cの計算の進み具合。完了${lane.cells.filter((cell) => cell.done === size).length}/${lane.cells.length}セル`}
      >
        {lane.cells.map((cell, index) => (
          <div
            key={index}
            className={styles.cell}
            data-state={cell.done >= size ? "settled" : cell.done > 0 ? "comparing" : "idle"}
          >
            <span className={styles.cellValue}>{cell.done === 0 ? "·" : cell.partial}</span>
            <span className={styles.cellDots} aria-hidden="true">
              {Array.from({ length: size }, (_, k) => (k < cell.done ? "●" : "○")).join("")}
            </span>
          </div>
        ))}
      </div>

      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt>完了した計算</dt>
          <dd>
            {lane.completedMacs} / {lane.totalMacs}
          </dd>
        </div>
        <div className={styles.metric}>
          <dt>同時に動く演算器</dt>
          <dd>{lane.activeUnits}</dd>
        </div>
        <div className={styles.metric}>
          <dt>データ読み出し</dt>
          <dd>{lane.memoryReads}</dd>
        </div>
        <div className={styles.metric}>
          <dt>電力の目安</dt>
          <dd aria-label={`${POWER_CIRCLES}段階中${powerLevel}(定性的な目安)`}>
            <span aria-hidden="true">
              {"●".repeat(powerLevel)}
              {"○".repeat(POWER_CIRCLES - powerLevel)}
            </span>
          </dd>
        </div>
      </dl>
      <p className={styles.note}>{lane.note}</p>
    </section>
  );
}
