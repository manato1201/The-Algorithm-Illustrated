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

/** 赤黒木専用。node.colorが設定されている場合、状態パレットの代わりにこちらを使う。 */
const RB_RED = stateColors.swapping;
const RB_BLACK = stateColors.idle;

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

    const hasIntervalNodes = Object.values(currentFrame.nodes).some((n) => n.hi !== undefined);
    const marginX = 30;
    const marginTop = 30;
    // 区間木は最下段ノードの下に「max=」ラベル(radius 22 + 10px)を描くため、
    // 通常木より広いマージンを確保しないとcanvas下端からはみ出る(見切れの原因だった)。
    const marginBottom = hasIntervalNodes ? 46 : 20;
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
      const isRedBlackNode = node.color !== undefined;
      const isIntervalNode = node.hi !== undefined;
      const fillColor = isRedBlackNode ? (node.color === "red" ? RB_RED : RB_BLACK) : NODE_COLORS[state];
      const isTransient = state === "visiting" || state === "rotating";
      const showGlow = isRedBlackNode ? isTransient : state !== "idle";
      const { x, y } = point(node.id);
      const radius = isIntervalNode ? 22 : 16;

      ctx.shadowColor = showGlow ? NODE_COLORS[state] : "transparent";
      ctx.shadowBlur = showGlow ? 12 : 0;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      if (isRedBlackNode && node.color === "black") {
        ctx.strokeStyle = "rgba(237,240,245,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = isRedBlackNode && node.color === "black" ? "#edf0f5" : "#06070a";
      if (isIntervalNode) {
        ctx.font = "10px var(--font-mono), monospace";
        ctx.fillText(`[${node.value},${node.hi}]`, x, y);
        ctx.font = "12px var(--font-mono), monospace";
        if (node.maxHigh !== undefined) {
          ctx.fillStyle = NODE_COLORS[state];
          ctx.font = "10px var(--font-mono), monospace";
          ctx.fillText(`max=${node.maxHigh}`, x, y + radius + 10);
          ctx.font = "12px var(--font-mono), monospace";
        }
      } else {
        ctx.fillText(String(node.value), x, y);
      }
    });
  }, [frames, stepIndex]);

  const currentFrame = frames[stepIndex];
  const isRedBlackTree = algorithmId === "red-black-tree";

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
        {isRedBlackTree ? (
          <>
            <li className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ backgroundColor: RB_RED }} aria-hidden="true" />
              赤
            </li>
            <li className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ backgroundColor: RB_BLACK }} aria-hidden="true" />
              黒
            </li>
          </>
        ) : null}
        {LEGEND_ITEMS.filter((item) => !isRedBlackTree || item.key !== "inserted").map((item) => (
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
