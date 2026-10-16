"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LivePreview.module.css";
import { CELL_COLORS } from "@/components/visualizer/PathfindingVisualizer";
import { useFrameTween } from "@/components/visualizer/useFrameTween";
import { lerp, mixColor } from "@/lib/color-mix";
import { stateColors, type StateColorKey } from "@/lib/design-tokens";
import type { GridCellState } from "@/lib/pathfinding-visualizers";
import { useMediaQuery } from "@/lib/use-media-query";

/** ソート・探索の棒グラフ系フレーム(array+highlight)。 */
type BarFrame = {
  array: number[];
  highlight: Partial<Record<number, StateColorKey>>;
};
/** 経路探索のグリッド系フレーム。 */
type GridFrame = { cellStates: GridCellState[][] };

type Loaded =
  { kind: "bars"; frames: BarFrame[] } | { kind: "grid"; frames: GridFrame[] };

/** プレビュー用の入力(ソート)。画面の可視化と同じ並びの先頭を使う。 */
const PREVIEW_ARRAY = [62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41];

/** プレビューで使う最大フレーム数。長い実行は等間隔に間引き、ループを十数秒に収める(最初と最後は必ず残す)。 */
const MAX_PREVIEW_FRAMES = 40;

function thin<T>(frames: T[]): T[] {
  if (frames.length <= MAX_PREVIEW_FRAMES) return frames;
  return Array.from(
    { length: MAX_PREVIEW_FRAMES },
    (_, i) => frames[Math.round((i * (frames.length - 1)) / (MAX_PREVIEW_FRAMES - 1))],
  );
}

/**
 * idに対応する可視化のフレーム列を、必要になった時点で動的に読み込んで生成する。
 * カタログのバンドルに可視化ロジックを抱え込まないよう、種類ごとに別チャンクにしている。
 * 対応しているのは、小さく表示しても意味が伝わる3種類(ソート・探索の棒、経路探索のグリッド)。
 */
async function loadFrames(id: string): Promise<Loaded | null> {
  const sort = await import("@/lib/sort-visualizers");
  if (id in sort.SORT_VISUALIZERS) {
    return {
      kind: "bars",
      frames: thin(sort.SORT_VISUALIZERS[id]([...PREVIEW_ARRAY])),
    };
  }
  const search = await import("@/lib/search-visualizers");
  if (id in search.SEARCH_VISUALIZERS) {
    return { kind: "bars", frames: thin(search.SEARCH_VISUALIZERS[id]()) };
  }
  const pathfinding = await import("@/lib/pathfinding-visualizers");
  if (id in pathfinding.PATHFINDING_VISUALIZERS) {
    return { kind: "grid", frames: thin(pathfinding.PATHFINDING_VISUALIZERS[id]()) };
  }
  return null;
}

const STEP_INTERVAL_MS = 320;
const HOLD_AT_END_MS = 1400;

type LivePreviewProps = {
  algorithmId: string;
  /** hero: トップの大きな舞台(HUD付き)。card: 入口カード・代表カード用の小さな舞台。 */
  variant?: "card" | "hero";
  /** heroのHUDに出す名前(英字)。 */
  label?: string;
};

/**
 * ライブプレビュー(視覚表現の強化): 画面に入ったときだけ読み込み・再生し、最後まで進んだら
 * 少し止まってから最初に戻る、をループする小さな舞台。画面外では止まる。
 * 動きを減らす設定では、ループせずに最後のフレーム(結果)を静止表示する。
 */
export function LivePreview({
  algorithmId,
  variant = "card",
  label,
}: LivePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const frameCount = loaded?.frames.length ?? 0;
  const lastIndex = Math.max(frameCount - 1, 0);
  const shownStep = reduceMotion ? lastIndex : Math.min(step, lastIndex);
  const tween = useFrameTween(shownStep, 1);

  // 画面に入ったかどうか(出たら再生を止める)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { threshold: 0.25 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // 初めて見えたときに、フレーム列を読み込む
  useEffect(() => {
    if (!visible || loaded || failed) return;
    let cancelled = false;
    loadFrames(algorithmId)
      .then((result) => {
        if (cancelled) return;
        if (result) setLoaded(result);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, loaded, failed, algorithmId]);

  // ループ再生: 最後で少し止まり、最初へ戻る
  useEffect(() => {
    if (!visible || !loaded || reduceMotion || frameCount < 2) return;
    const atEnd = step >= lastIndex;
    const timer = setTimeout(
      () => setStep(atEnd ? 0 : step + 1),
      atEnd ? HOLD_AT_END_MS : STEP_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [visible, loaded, reduceMotion, step, lastIndex, frameCount]);

  // 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
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

    if (loaded.kind === "bars") {
      const frame = loaded.frames[shownStep];
      const fromFrame = loaded.frames[tween.from];
      if (!frame) return;
      const values = frame.array;
      const n = values.length;
      const gap = Math.max(2, Math.round(width / 120));
      const barWidth = (width - gap * (n - 1)) / n;
      const minValue = Math.min(0, ...values);
      const maxValue = Math.max(0, ...values);
      const range = maxValue - minValue || 1;
      const usable = height - 8;
      const yFor = (value: number) =>
        height - 4 - ((value - minValue) / range) * usable;
      const zeroY = yFor(0);
      const canTween = fromFrame !== undefined && fromFrame.array.length === n;
      values.forEach((value, index) => {
        const targetColor = stateColors[frame.highlight[index] ?? "idle"];
        let valueY = yFor(value);
        let color: string = targetColor;
        if (canTween) {
          valueY = lerp(yFor(fromFrame.array[index]), valueY, tween.t);
          color = mixColor(
            stateColors[fromFrame.highlight[index] ?? "idle"],
            targetColor,
            tween.t,
          );
        }
        ctx.fillStyle = color;
        ctx.fillRect(
          index * (barWidth + gap),
          Math.min(valueY, zeroY),
          barWidth,
          Math.max(Math.abs(zeroY - valueY), 1),
        );
      });
    } else {
      const frame = loaded.frames[shownStep];
      const fromFrame = loaded.frames[tween.from];
      if (!frame) return;
      const rows = frame.cellStates.length;
      const cols = frame.cellStates[0]?.length ?? 0;
      const gap = 2;
      const cellWidth = (width - gap * (cols - 1)) / cols;
      const cellHeight = (height - gap * (rows - 1)) / rows;
      frame.cellStates.forEach((row, r) => {
        row.forEach((state, c) => {
          const fromState = fromFrame?.cellStates[r]?.[c];
          const target = CELL_COLORS[state];
          ctx.fillStyle = fromState
            ? mixColor(CELL_COLORS[fromState], target, tween.t)
            : target;
          ctx.fillRect(
            c * (cellWidth + gap),
            r * (cellHeight + gap),
            cellWidth,
            cellHeight,
          );
        });
      });
    }
  }, [loaded, shownStep, tween.from, tween.t]);

  return (
    <div
      ref={rootRef}
      className={styles.preview}
      data-variant={variant}
      data-surface="dark"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {variant === "hero" ? (
        <div className={styles.hud} aria-hidden="true">
          <span className={styles.hudBadge}>
            <span className={styles.hudDot} />
            LIVE PREVIEW
          </span>
          <span>{label}</span>
          <span className={styles.hudStep}>
            {loaded
              ? `STEP ${String(shownStep + 1).padStart(3, "0")}/${String(frameCount).padStart(3, "0")}`
              : "LOADING"}
          </span>
        </div>
      ) : null}
      {variant === "hero" ? (
        <span className={styles.bracketTl} aria-hidden="true" />
      ) : null}
      {variant === "hero" ? (
        <span className={styles.bracketBr} aria-hidden="true" />
      ) : null}
    </div>
  );
}
