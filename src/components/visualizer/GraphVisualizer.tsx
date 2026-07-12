"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./GraphVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { stateColors } from "@/lib/design-tokens";
import {
  GRAPH_DATASETS,
  type GraphEdgeState,
  type GraphFrame,
  type GraphNodeState,
} from "@/lib/graph-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const NODE_COLORS: Record<GraphNodeState, string> = {
  idle: stateColors.idle,
  visited: stateColors.comparing,
  settled: stateColors.settled,
};

const EDGE_COLORS: Record<GraphEdgeState, string> = {
  idle: stateColors.idle,
  checking: stateColors.pivot,
  relaxed: stateColors.comparing,
  tree: stateColors.settled,
  rejected: stateColors.swapping,
};

const LEGEND_NODE_ITEMS: { key: GraphNodeState; label: string }[] = [
  { key: "idle", label: "未確定の頂点" },
  { key: "visited", label: "更新された頂点" },
  { key: "settled", label: "確定/木に採用済みの頂点" },
];

const LEGEND_EDGE_ITEMS: { key: GraphEdgeState; label: string }[] = [
  { key: "checking", label: "検討中の辺" },
  { key: "relaxed", label: "緩和/更新された辺" },
  { key: "tree", label: "採用された辺" },
  { key: "rejected", label: "棄却された辺(閉路)" },
];

type GraphVisualizerProps = {
  algorithmId: string;
};

/**
 * ノードリンク図によるグラフアルゴリズムの可視化(ベルマン・フォード法/プリム法/クラスカル法)。
 * BFS/DFS/ダイクストラ法/A*探索が固定迷路(グリッド)を使うのに対し、
 * こちらは一般的なグラフ(頂点+重み付き辺)を円形レイアウトでCanvas 2D描画する。
 */
export function GraphVisualizer({ algorithmId }: GraphVisualizerProps) {
  const dataset = GRAPH_DATASETS[algorithmId];
  const request = useMemo<WorkerRequest>(
    () => ({ kind: "graph", algorithmId }),
    [algorithmId],
  );
  const { frames, isComputing } = useWorkerFrames<GraphFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentFrame = frames[stepIndex];
    if (!canvas || !currentFrame || !dataset) return;
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

    const point = (nodeId: string) => {
      const node = dataset.nodes.find((n) => n.id === nodeId)!;
      return { x: node.x * width, y: node.y * height };
    };

    ctx.font = "11px var(--font-mono), monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const edge of dataset.edges) {
      const state = currentFrame.edgeStates[edge.id] ?? "idle";
      const color = EDGE_COLORS[state];
      const from = point(edge.from);
      const to = point(edge.to);

      ctx.strokeStyle = color;
      ctx.lineWidth = state === "idle" ? 1.5 : 3;
      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 10;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      if (dataset.directed) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const nodeRadius = 16;
        const tipX = to.x - Math.cos(angle) * nodeRadius;
        const tipY = to.y - Math.sin(angle) * nodeRadius;
        const arrowSize = 8;
        ctx.fillStyle = color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - arrowSize * Math.cos(angle - Math.PI / 6),
          tipY - arrowSize * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          tipX - arrowSize * Math.cos(angle + Math.PI / 6),
          tipY - arrowSize * Math.sin(angle + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();
      }

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06070a";
      ctx.fillRect(midX - 12, midY - 8, 24, 16);
      ctx.fillStyle = color;
      ctx.fillText(String(edge.weight), midX, midY);
    }

    for (const node of dataset.nodes) {
      const state = currentFrame.nodeStates[node.id] ?? "idle";
      const color = NODE_COLORS[state];
      const { x, y } = point(node.id);

      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06070a";
      ctx.fillText(node.label, x, y);

      const distance = currentFrame.distances[node.id];
      if (distance !== undefined) {
        ctx.fillStyle = color;
        ctx.font = "10px var(--font-mono), monospace";
        ctx.fillText(distance === null ? "∞" : String(distance), x, y + 26);
        ctx.font = "11px var(--font-mono), monospace";
      }
    }
  }, [frames, stepIndex, dataset]);

  if (!dataset) return null;

  const currentFrame = frames[stepIndex];
  const showDistanceLegend = Object.keys(currentFrame?.distances ?? {}).length > 0;

  return (
    <div className={styles.visualizer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
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
        {LEGEND_NODE_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: NODE_COLORS[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
        {LEGEND_EDGE_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: EDGE_COLORS[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
        {showDistanceLegend ? (
          <li className={styles.legendItem}>頂点の下の数字は開始頂点からの距離</li>
        ) : null}
      </ul>
    </div>
  );
}
