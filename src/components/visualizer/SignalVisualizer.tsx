"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./SignalVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { buildStepKinds, signalEntities } from "./step-timeline";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { coreColors, shouldGlow, stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SIGNAL_META, type SignalFrame, type SignalPanel } from "@/lib/signal-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

/** パネル1枚あたりの高さ(px)。タイトル・目盛り・横軸ラベルの分を含む。 */
const PANEL_HEIGHT = 132;
/** ステージ左上のHUD(状態・ステップ数)がパネルに重ならないよう、先頭に空ける余白(px)。 */
const HUD_PAD = 30;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 12;
const TITLE_HEIGHT = 20;
const AXIS_HEIGHT = 18;
/** サンプル点を1つずつ描く上限。これを超える長い波形は線だけで描く(印は状態のあるサンプルのみ)。 */
const MAX_DOTS = 100;

/** 状態ごとの印の形(色だけに頼らない)。 */
const MARK_SHAPE: Record<StateColorKey, "circle" | "diamond" | "triangle" | "square"> = {
  idle: "circle",
  comparing: "circle",
  pivot: "diamond",
  swapping: "triangle",
  settled: "square",
};

const LEGEND_ITEMS: { key: StateColorKey; glyph: string; label: string }[] = [
  { key: "comparing", glyph: "●", label: "いま読んでいる・処理中" },
  { key: "pivot", glyph: "◆", label: "参照している値・候補" },
  { key: "swapping", glyph: "▲", label: "いま書き込む値" },
  { key: "settled", glyph: "■", label: "確定した結果" },
];

function drawMark(ctx: CanvasRenderingContext2D, shape: (typeof MARK_SHAPE)[StateColorKey], x: number, y: number, r: number) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (shape === "diamond") {
    ctx.moveTo(x, y - r - 1);
    ctx.lineTo(x + r + 1, y);
    ctx.lineTo(x, y + r + 1);
    ctx.lineTo(x - r - 1, y);
    ctx.closePath();
  } else if (shape === "triangle") {
    ctx.moveTo(x, y - r - 1);
    ctx.lineTo(x + r + 1, y + r);
    ctx.lineTo(x - r - 1, y + r);
    ctx.closePath();
  } else {
    ctx.rect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fill();
}

function cssColor(canvas: HTMLCanvasElement, name: string, fallback: string): string {
  const value = getComputedStyle(canvas).getPropertyValue(name).trim();
  return value || fallback;
}

/** 折れ線を、有限でない値(未計算)の所で途切れさせながら描く。 */
function strokeSeries(
  ctx: CanvasRenderingContext2D,
  values: readonly number[],
  xFor: (i: number) => number,
  yFor: (v: number) => number,
) {
  ctx.beginPath();
  let pen = false;
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      pen = false;
      return;
    }
    if (pen) ctx.lineTo(xFor(i), yFor(v));
    else ctx.moveTo(xFor(i), yFor(v));
    pen = true;
  });
  ctx.stroke();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  panel: SignalPanel,
  top: number,
  width: number,
  muted: string,
  line: string,
  text: string,
) {
  const n = panel.values.length;
  const plotLeft = PLOT_LEFT;
  const plotWidth = width - PLOT_LEFT - PLOT_RIGHT;
  const plotTop = top + TITLE_HEIGHT;
  const plotBottom = top + PANEL_HEIGHT - AXIS_HEIGHT;
  const range = panel.yMax - panel.yMin || 1;
  const xFor = (i: number) => plotLeft + ((i + 0.5) / n) * plotWidth;
  const yFor = (v: number) => plotBottom - ((Math.min(panel.yMax, Math.max(panel.yMin, v)) - panel.yMin) / range) * (plotBottom - plotTop);
  const zeroY = yFor(Math.min(panel.yMax, Math.max(panel.yMin, 0)));

  // 枠・ゼロ線・目盛り
  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  ctx.strokeRect(plotLeft + 0.5, plotTop + 0.5, plotWidth, plotBottom - plotTop);
  ctx.beginPath();
  ctx.moveTo(plotLeft, zeroY + 0.5);
  ctx.lineTo(plotLeft + plotWidth, zeroY + 0.5);
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(Number(panel.yMax.toPrecision(3)).toString(), plotLeft - 4, plotTop);
  ctx.textBaseline = "bottom";
  ctx.fillText(Number(panel.yMin.toPrecision(3)).toString(), plotLeft - 4, plotBottom);

  // タイトルと横軸ラベル
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillStyle = muted;
  ctx.fillText(panel.title, plotLeft, top + 4, plotWidth);
  if (panel.xLabel) {
    ctx.font = "9px ui-monospace, monospace";
    ctx.textBaseline = "bottom";
    ctx.fillText(panel.xLabel, plotLeft, top + PANEL_HEIGHT - 3, plotWidth);
  }

  // 縦の目印(窓の端・重なりの終端など)
  panel.markers?.forEach((marker) => {
    const x = xFor(marker.index);
    ctx.save();
    ctx.strokeStyle = coreColors.accentAmber;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotBottom);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = coreColors.accentAmber;
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = x > width - 80 ? "right" : "left";
    ctx.textBaseline = "top";
    ctx.fillText(marker.label, x + (x > width - 80 ? -3 : 3), plotTop + 2);
  });

  // 参照波形(薄く)
  if (panel.reference) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = muted;
    ctx.fillStyle = muted;
    ctx.lineWidth = 1;
    if (panel.style === "stem") {
      panel.reference.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        ctx.beginPath();
        ctx.arc(xFor(i), yFor(v), 2.5, 0, Math.PI * 2);
        ctx.stroke();
      });
    } else {
      strokeSeries(ctx, panel.reference, xFor, yFor);
    }
    ctx.restore();
  }

  // 本体
  const stemWidth = Math.max(1.5, Math.min(4, (plotWidth / n) * 0.45));
  if (panel.style === "line") {
    ctx.save();
    ctx.strokeStyle = text;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    strokeSeries(ctx, panel.values, xFor, yFor);
    ctx.restore();
  } else {
    panel.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const state = panel.highlight[i];
      ctx.strokeStyle = state ? stateColors[state] : muted;
      ctx.lineWidth = stemWidth;
      ctx.beginPath();
      ctx.moveTo(xFor(i), zeroY);
      ctx.lineTo(xFor(i), yFor(v));
      ctx.stroke();
    });
  }

  panel.values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const state = panel.highlight[i];
    const x = xFor(i);
    const y = yFor(v);
    if (!state) {
      if (panel.style === "line" && n <= MAX_DOTS) {
        ctx.fillStyle = muted;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const color = stateColors[state];
    ctx.save();
    ctx.shadowColor = shouldGlow(color) ? color : "transparent";
    ctx.shadowBlur = shouldGlow(color) ? 12 : 0;
    ctx.fillStyle = color;
    drawMark(ctx, MARK_SHAPE[state], x, y, state === "idle" ? 2 : 4);
    ctx.restore();
  });
}

type SignalVisualizerProps = {
  algorithmId: string;
};

/**
 * 音響・信号処理の可視化。波形(折れ線)とスペクトル・係数(棒)を縦に並べたパネルの列を、
 * 他の可視化と同じ再生コントロール・状態タイムラインで1ステップずつ進める。
 * 計算は src/lib/signal-*.ts で実際の信号処理として行い、ここは描くだけ。
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
  const panelCount = frames[0]?.panels.length ?? 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const muted = cssColor(canvas, "--color-text-muted", coreColors.textMuted);
    const line = cssColor(canvas, "--color-line", "rgba(255,167,51,0.14)");
    const text = cssColor(canvas, "--color-text", coreColors.text);
    currentFrame.panels.forEach((panel, index) => {
      drawPanel(ctx, panel, HUD_PAD + index * PANEL_HEIGHT, width, muted, line, text);
    });
  }, [currentFrame]);

  return (
    <div className={styles.visualizer}>
      {meta ? (
        <div className={styles.chipRow}>
          {meta.chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <ZoomableStage hud={{ kind: stepKinds[stepIndex] ?? "idle", step: stepIndex, total: frames.length }}>
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ height: HUD_PAD + panelCount * PANEL_HEIGHT }}
            role="img"
            aria-label={currentFrame ? `波形とスペクトルのパネル${currentFrame.panels.length}枚。${currentFrame.description}` : "波形の可視化"}
          />
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
      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span className={styles.legendGlyph} style={{ color: stateColors[item.key] }} aria-hidden="true">
              {item.glyph}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
