"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./SignalVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { ZoomableStage } from "./ZoomableStage";
import { buildStepKinds, signalEntities, STEP_KIND_LABELS } from "./step-timeline";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { shouldGlow, stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SIGNAL_META, type SignalFrame, type SignalTrace } from "@/lib/signal-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const LANE_HEIGHT = 112;
const LABEL_HEIGHT = 20;
const SIDE_PADDING = 12;
/** ステージ左上・右上のHUD(状態・ステップ番号)と波形のラベルが重ならないための上余白。 */
const HUD_MARGIN = 26;

/** 凡例。色だけでなく記号(形)でも区別する(ui-design.md 2.7節)。 */
const LEGEND_ITEMS: { key: StateColorKey; label: string }[] = [
  { key: "pivot", label: "いま処理している入力" },
  { key: "comparing", label: "計算に使っているサンプル" },
  { key: "swapping", label: "加工された(遮断・圧縮・クリップなど)" },
  { key: "settled", label: "出力として確定" },
];

/** 状態ごとに違う形でサンプル点を描く。 */
function drawMarker(ctx: CanvasRenderingContext2D, state: StateColorKey, x: number, y: number) {
  const r = state === "idle" ? 2.5 : 4.5;
  ctx.beginPath();
  if (state === "swapping") {
    ctx.moveTo(x, y - r - 1);
    ctx.lineTo(x + r + 1, y + r);
    ctx.lineTo(x - r - 1, y + r);
    ctx.closePath();
  } else if (state === "pivot") {
    ctx.moveTo(x, y - r - 1);
    ctx.lineTo(x + r + 1, y);
    ctx.lineTo(x, y + r + 1);
    ctx.lineTo(x - r - 1, y);
    ctx.closePath();
  } else if (state === "settled") {
    ctx.rect(x - r + 0.5, y - r + 0.5, 2 * r - 1, 2 * r - 1);
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  trace: SignalTrace,
  guides: SignalFrame["guides"],
  top: number,
  width: number,
) {
  const n = trace.samples.length;
  const usable = width - SIDE_PADDING * 2;
  const mid = top + LABEL_HEIGHT + (LANE_HEIGHT - LABEL_HEIGHT) / 2;
  const half = (LANE_HEIGHT - LABEL_HEIGHT) / 2 - 6;
  const xFor = (i: number) => SIDE_PADDING + ((i + 0.5) / n) * usable;
  const yFor = (v: number) => mid - (Math.max(-trace.range, Math.min(trace.range, v)) / trace.range) * half;

  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "#8B93A7";
  ctx.textBaseline = "top";
  ctx.fillText(trace.label, SIDE_PADDING, top + 2);

  ctx.strokeStyle = "#2A2F3D";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SIDE_PADDING, mid + 0.5);
  ctx.lineTo(width - SIDE_PADDING, mid + 0.5);
  ctx.stroke();

  // しきい値などの基準線(破線 + ラベル)
  for (const guide of guides) {
    if (guide.traceId !== trace.id) continue;
    const y = yFor(guide.value);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = stateColors.pivot;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(SIDE_PADDING, y + 0.5);
    ctx.lineTo(width - SIDE_PADDING, y + 0.5);
    ctx.stroke();
    ctx.restore();
    if (guide.label) {
      ctx.fillStyle = stateColors.pivot;
      ctx.fillText(guide.label, width - SIDE_PADDING - ctx.measureText(guide.label).width, y - 14);
    }
  }

  // 値の棒(茎)と、サンプル同士をつなぐ細い線
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#4A5163";
  let previous: { x: number; y: number } | null = null;
  ctx.beginPath();
  trace.samples.forEach((value, i) => {
    if (value === null) {
      previous = null;
      return;
    }
    const x = xFor(i);
    const y = yFor(value);
    if (previous) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    previous = { x, y };
  });
  ctx.stroke();

  trace.samples.forEach((value, i) => {
    if (value === null) return;
    const x = xFor(i);
    const y = yFor(value);
    const state = trace.marks[i] ?? "idle";
    const color = stateColors[state];
    ctx.strokeStyle = state === "idle" ? "#2F3442" : color;
    ctx.beginPath();
    ctx.moveTo(x, mid);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowColor = shouldGlow(color) && state !== "idle" ? color : "transparent";
    ctx.shadowBlur = shouldGlow(color) && state !== "idle" ? 10 : 0;
    ctx.fillStyle = color;
    drawMarker(ctx, state, x, y);
    ctx.shadowBlur = 0;
  });
}

type SignalVisualizerProps = {
  algorithmId: string;
};

/**
 * 音響・信号処理の波形可視化。入力・係数・出力の波形を縦に並べて、1サンプルずつ進める。
 * サンプル点は状態ごとに形を変える(◆処理中の入力 / ●使っているサンプル / ▲加工された / ■確定)。
 */
export function SignalVisualizer({ algorithmId }: SignalVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "signal", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<SignalFrame>(request);
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => buildStepKinds(frames, signalEntities), [frames]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meta = SIGNAL_META[algorithmId];
  const currentFrame = frames[stepIndex];
  const laneCount = currentFrame?.traces.length ?? frames[0]?.traces.length ?? 2;
  const canvasHeight = HUD_MARGIN + laneCount * LANE_HEIGHT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = HUD_MARGIN + currentFrame.traces.length * LANE_HEIGHT;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    currentFrame.traces.forEach((trace, index) => {
      drawTrace(ctx, trace, currentFrame.guides, HUD_MARGIN + index * LANE_HEIGHT, width);
    });
  }, [currentFrame]);

  if (!meta) return null;

  return (
    <div className={styles.visualizer}>
      <ul className={styles.chips}>
        {meta.chips.map((chip) => (
          <li key={chip} className={styles.chip}>
            {chip}
          </li>
        ))}
      </ul>

      <ZoomableStage hud={{ kind: stepKinds[stepIndex] ?? "idle", step: stepIndex, total: frames.length }}>
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ height: canvasHeight }}
            role="img"
            aria-label={currentFrame ? currentFrame.traces.map((t) => t.label).join(" / ") : "波形"}
          />
        </div>
      </ZoomableStage>

      {currentFrame && currentFrame.readouts.length > 0 ? (
        <dl className={styles.readouts}>
          {currentFrame.readouts.map((readout) => (
            <div key={readout.label} className={styles.readout}>
              <dt>{readout.label}</dt>
              <dd>{readout.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

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
      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ color: stateColors[item.key] }} aria-hidden="true">
              {STEP_KIND_LABELS[item.key].glyph}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      {meta.caveat ? <p className={styles.caveat}>※ {meta.caveat}</p> : null}
    </div>
  );
}
