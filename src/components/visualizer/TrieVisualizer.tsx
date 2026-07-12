"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./TrieVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { stateColors } from "@/lib/design-tokens";
import type { TrieFrame, TrieNodeState } from "@/lib/trie-visualizer";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const NODE_COLORS: Record<TrieNodeState, string> = {
  idle: stateColors.idle,
  visiting: stateColors.comparing,
  inserted: stateColors.settled,
  matched: stateColors.pivot,
};

const LEGEND_ITEMS: { key: TrieNodeState; label: string }[] = [
  { key: "visiting", label: "経路をたどる/作成" },
  { key: "inserted", label: "単語の終端" },
];

const MATCHED_LEGEND_ITEM: { key: TrieNodeState; label: string } = {
  key: "matched",
  label: "テキスト走査でパターンが一致",
};

type LayoutPosition = { x: number; y: number };

/**
 * トライ木(多分木)の座標を計算する一般化tidy tree。
 * 二分木のTreeVisualizerと違い子の数が可変なため、in-order走査ではなく
 * 「葉は左から順に1スロットずつ、内部頂点は自分の子たちのx座標の平均」という
 * children-first(帰りがけ)の集約でx座標を決める。
 */
function computeLayout(nodes: TrieFrame["nodes"], rootId: string): Record<string, LayoutPosition> {
  const positions: Record<string, LayoutPosition> = {};
  let counter = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number) => {
    const node = nodes[id];
    const childIds = Object.values(node.children);
    maxDepth = Math.max(maxDepth, depth);

    if (childIds.length === 0) {
      positions[id] = { x: counter, y: depth };
      counter++;
      return;
    }

    childIds.forEach((childId) => visit(childId, depth + 1));
    const childXs = childIds.map((childId) => positions[childId].x);
    positions[id] = { x: (Math.min(...childXs) + Math.max(...childXs)) / 2, y: depth };
  };
  visit(rootId, 0);

  const totalLeaves = counter;
  Object.keys(positions).forEach((id) => {
    positions[id] = {
      x: totalLeaves > 1 ? positions[id].x / (totalLeaves - 1) : 0.5,
      y: maxDepth > 0 ? positions[id].y / maxDepth : 0,
    };
  });
  return positions;
}

type TrieVisualizerProps = {
  algorithmId: string;
};

/** トライ木(接頭辞木)への複数単語の挿入シーケンスの可視化。 */
export function TrieVisualizer({ algorithmId }: TrieVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "trie", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<TrieFrame>(request);
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
      Object.values(node.children).forEach((childId) => {
        const to = point(childId);
        ctx.strokeStyle = stateColors.idle;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });

    if (currentFrame.failEdges) {
      ctx.strokeStyle = stateColors.pivot;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.5;
      currentFrame.failEdges.forEach(([fromId, toId]) => {
        if (fromId === toId) return;
        const from = point(fromId);
        const to = point(toId);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    Object.values(currentFrame.nodes).forEach((node) => {
      const state = currentFrame.nodeStates[node.id] ?? "idle";
      const color = NODE_COLORS[state];
      const { x, y } = point(node.id);
      const radius = node.isEndOfWord ? 15 : 13;

      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (node.isEndOfWord) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(237,240,245,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06070a";
      ctx.fillText(node.char || "∅", x, y);
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
        {algorithmId === "aho-corasick" ? (
          <li className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: NODE_COLORS[MATCHED_LEGEND_ITEM.key] }}
              aria-hidden="true"
            />
            {MATCHED_LEGEND_ITEM.label}
          </li>
        ) : null}
        <li className={styles.legendItem}>(二重丸 = 単語の終端)</li>
        {algorithmId === "aho-corasick" ? (
          <li className={styles.legendItem}>(点線 = 失敗リンク)</li>
        ) : null}
      </ul>
    </div>
  );
}
