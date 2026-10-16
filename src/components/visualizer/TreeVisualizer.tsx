"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./TreeVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { buildStepKinds, treeEntities } from "./step-timeline";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useFrameTween } from "./useFrameTween";
import { useWorkerFrames } from "./useWorkerFrames";
import { ParticleBurstLayer, type ParticleBurst } from "./ParticleBurstLayer";
import { lerp, mixColor } from "@/lib/color-mix";
import { coreColors, readableTextColor, shouldGlow, stateColors } from "@/lib/design-tokens";
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
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => buildStepKinds(frames, treeEntities), [frames]);
  const tween = useFrameTween(stepIndex, speed);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // burstsのxRatio/yRatio計算にcanvasの実サイズが必要だが、useMemo内でref.currentを直接読むのは
  // レンダー中のref参照になり許可されない(react-hooks/refs)。描画useEffectで測定した値をstateとして
  // 保持し、bursts側はそのstateを参照する。
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  // 描画用useEffectとbursts用useMemoの両方が同じレイアウトを必要とするため、
  // computeLayout()の再計算(木構造の再帰走査)を1箇所に集約する。
  const layout = useMemo(() => {
    const currentFrame = frames[stepIndex];
    if (!currentFrame) return null;
    const hasIntervalNodes = Object.values(currentFrame.nodes).some((n) => n.hi !== undefined);
    const marginX = 30;
    const marginTop = 30;
    // 区間木は最下段ノードの下に「max=」ラベル(radius 22 + 10px)を描くため、
    // 通常木より広いマージンを確保しないとcanvas下端からはみ出る(見切れの原因だった)。
    const marginBottom = hasIntervalNodes ? 46 : 20;
    const positions = computeLayout(currentFrame.nodes, currentFrame.rootId);
    return { positions, marginX, marginTop, marginBottom };
  }, [frames, stepIndex]);

  // 補間の起点になるフレームの配置(回転で頂点が動く様子を滑らかに描くため)
  const fromPositions = useMemo(() => {
    const fromFrame = frames[tween.from];
    if (!fromFrame || tween.from === stepIndex) return null;
    return computeLayout(fromFrame.nodes, fromFrame.rootId);
  }, [frames, tween.from, stepIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentFrame = frames[stepIndex];
    if (!canvas || !currentFrame || !layout) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    setCanvasSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { positions, marginX, marginTop, marginBottom } = layout;

    const fromFrame = frames[tween.from];

    // 直前のフレームにも居た頂点は、その位置から現在の位置へ動かす
    const point = (id: string) => {
      const pos = positions[id];
      const prev = fromPositions?.[id];
      const mixed = prev ? { x: lerp(prev.x, pos.x, tween.t), y: lerp(prev.y, pos.y, tween.t) } : pos;
      return {
        x: marginX + mixed.x * (width - marginX * 2),
        y: marginTop + mixed.y * (height - marginTop - marginBottom),
      };
    };
    const isNew = (id: string) => fromFrame !== undefined && tween.from !== stepIndex && !(id in fromFrame.nodes);

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
        ctx.globalAlpha = isNew(childId) ? tween.t : 1;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });
    ctx.globalAlpha = 1;

    Object.values(currentFrame.nodes).forEach((node) => {
      const state = currentFrame.nodeStates[node.id] ?? "idle";
      const isRedBlackNode = node.color !== undefined;
      const isIntervalNode = node.hi !== undefined;
      const fillColor = isRedBlackNode ? (node.color === "red" ? RB_RED : RB_BLACK) : NODE_COLORS[state];
      const isTransient = state === "visiting" || state === "rotating";
      const showGlow = isRedBlackNode ? isTransient : state !== "idle";
      const { x, y } = point(node.id);
      const newNode = isNew(node.id);
      const baseRadius = isIntervalNode ? 22 : 16;
      // 新しい頂点は、小さい透明な状態から通常の大きさへ現れる
      const radius = newNode ? baseRadius * (0.4 + 0.6 * tween.t) : baseRadius;

      // 直前のフレームにも居た頂点は、状態色を補間して塗る(色の切り替わりを滑らかに)
      const fromNode = fromFrame?.nodes[node.id];
      let paintColor = fillColor;
      if (fromNode && tween.from !== stepIndex) {
        const fromState = fromFrame.nodeStates[node.id] ?? "idle";
        const fromFill =
          fromNode.color !== undefined ? (fromNode.color === "red" ? RB_RED : RB_BLACK) : NODE_COLORS[fromState];
        paintColor = mixColor(fromFill, fillColor, tween.t);
      }

      const glow = showGlow && shouldGlow(NODE_COLORS[state]);
      ctx.globalAlpha = newNode ? tween.t : 1;
      ctx.shadowColor = glow ? NODE_COLORS[state] : "transparent";
      ctx.shadowBlur = glow ? 12 * tween.t : 0;
      ctx.fillStyle = paintColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      if (isRedBlackNode && node.color === "black") {
        ctx.strokeStyle = "rgba(237,240,245,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ノードの塗り色(fillColor)の実際の輝度から文字色を決める。状態色が増減しても常に読める組み合わせになる。
      ctx.fillStyle = readableTextColor(paintColor);
      if (isIntervalNode) {
        ctx.font = "10px var(--font-mono), monospace";
        ctx.fillText(`[${node.value},${node.hi}]`, x, y);
        ctx.font = "12px var(--font-mono), monospace";
        if (node.maxHigh !== undefined) {
          ctx.fillStyle = state === "idle" ? coreColors.textMuted : NODE_COLORS[state];
          ctx.font = "10px var(--font-mono), monospace";
          ctx.fillText(`max=${node.maxHigh}`, x, y + radius + 10);
          ctx.font = "12px var(--font-mono), monospace";
        }
      } else {
        ctx.fillText(String(node.value), x, y);
      }
      ctx.globalAlpha = 1;
    });
  }, [frames, stepIndex, layout, tween.from, tween.t, fromPositions]);

  const bursts = useMemo<ParticleBurst[]>(() => {
    const currentFrame = frames[stepIndex];
    const previousFrame = frames[stepIndex - 1];
    if (!currentFrame || !layout || !canvasSize) return [];
    // 描画用useEffectのpoint()と同じmargin込みの座標変換を再現する(canvas全体に対するratioが必要なため)。
    const { width, height } = canvasSize;
    const { positions, marginX, marginTop, marginBottom } = layout;
    const result: ParticleBurst[] = [];

    Object.values(currentFrame.nodes).forEach((node) => {
      const state = currentFrame.nodeStates[node.id] ?? "idle";
      const previousState = previousFrame?.nodeStates[node.id];
      if (state === "inserted" && previousState !== "inserted") {
        const pos = positions[node.id];
        const px = marginX + pos.x * (width - marginX * 2);
        const py = marginTop + pos.y * (height - marginTop - marginBottom);
        result.push({
          id: `${stepIndex}-${node.id}-inserted`,
          xRatio: px / width,
          yRatio: py / height,
          color: stateColors.settled,
        });
      }
    });
    return result;
  }, [frames, stepIndex, layout, canvasSize]);

  const currentFrame = frames[stepIndex];
  const isRedBlackTree = algorithmId === "red-black-tree";

  return (
    <div className={styles.visualizer}>
      <ZoomableStage hud={{ kind: stepKinds[stepIndex] ?? "idle", step: stepIndex, total: frames.length }}>
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <ParticleBurstLayer bursts={bursts} />
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
