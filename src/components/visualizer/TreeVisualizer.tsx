"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./TreeVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { stateColors } from "@/lib/design-tokens";
import type { TreeFrame, TreeNodeState } from "@/lib/tree-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const NODE_COLORS: Record<TreeNodeState, string> = {
  idle: stateColors.idle,
  visiting: stateColors.comparing,
  inserted: stateColors.settled,
  rotating: stateColors.swapping,
};

const LEGEND_ITEMS: { key: TreeNodeState; label: string }[] = [
  { key: "visiting", label: "探索中" },
  { key: "inserted", label: "挿入済み" },
  { key: "rotating", label: "回転で移動" },
];

type LayoutPosition = { x: number; y: number };

/**
 * 木構造の座標を計算する簡易tidy tree。in-order走査の順番でx座標を、深さでy座標を決める。
 * ノード集合・木の形そのものがフレームごとに変わるため(GraphVisualizerと違い)、
 * 座標は毎フレーム再計算する。
 */
function computeLayout(nodes: TreeFrame["nodes"], rootId: string | null): Record<string, LayoutPosition> {
  const positions: Record<string, LayoutPosition> = {};
  let counter = 0;
  let maxDepth = 0;

  const inorder = (id: string | null, depth: number) => {
    if (id === null) return;
    const node = nodes[id];
    inorder(node.left, depth + 1);
    positions[id] = { x: counter, y: depth };
    counter++;
    maxDepth = Math.max(maxDepth, depth);
    inorder(node.right, depth + 1);
  };
  inorder(rootId, 0);

  const totalLeaves = counter;
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: totalLeaves > 1 ? positions[id].x / (totalLeaves - 1) : 0.5,
      y: maxDepth > 0 ? positions[id].y / maxDepth : 0,
    };
  });
  return positions;
}

type TreeVisualizerProps = {
  algorithmId: string;
};

/** 二分木への挿入シーケンスの可視化(二分探索木/AVL木/Treap)。 */
export function TreeVisualizer({ algorithmId }: TreeVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "tree", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<TreeFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentFrame = frames[stepIndex];
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

    const marginX = 30;
    const marginTop = 30;
    const marginBottom = 20;
    const positions = computeLayout(currentFrame.nodes, currentFrame.rootId);

    const point = (id: string) => {
      const pos = positions[id];
      return {
        x: marginX + pos.x * (width - marginX * 2),
        y: marginTop + pos.y * (height - marginTop - marginBottom),
      };
    };

    ctx.font = "12px var(--font-mono), monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    Object.values(currentFrame.nodes).forEach((node) => {
      const from = point(node.id);
      [node.left, node.right].forEach((childId) => {
        if (!childId) return;
        const to = point(childId);
        ctx.strokeStyle = stateColors.idle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });

    Object.values(currentFrame.nodes).forEach((node) => {
      const state = currentFrame.nodeStates[node.id] ?? "idle";
      const color = NODE_COLORS[state];
      const { x, y } = point(node.id);

      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06070a";
      ctx.fillText(String(node.value), x, y);
    });
  }, [frames, stepIndex]);

  const currentFrame = frames[stepIndex];

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
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: NODE_COLORS[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
