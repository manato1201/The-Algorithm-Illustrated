"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./CategoryRail.module.css";
import { useMediaQuery } from "@/lib/use-media-query";

export type RailItem = { label: string; targetId: string; count: number };

type CategoryRailProps = {
  items: RailItem[];
  /** 目次を出す範囲(この要素が画面にかかっている間だけ表示する)。 */
  containerId: string;
};

const KEY_STEP: Record<string, number> = {
  ArrowUp: -1,
  ArrowLeft: -1,
  ArrowDown: 1,
  ArrowRight: 1,
};

/**
 * 一覧用のつまめる縦の目次(IMPROVEMENT_DESIGN_2026-10 Y3の考え方: モノコード=1本の弦の上を動く指)。
 * 役割: チップは「絞り込む」、この目次は長い一覧の「いまどこにいるか」と「そこへ飛ぶ」。
 * 現在位置のつまみをドラッグ(またはキー操作)すると、対応するカテゴリの節へ移動する。
 * 広い画面の、絞り込んでいない一覧でだけ出す。外部のコードは使っていない(自前の実装)。
 */
export function CategoryRail({ items, containerId }: CategoryRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inRange, setInRange] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const dragging = useRef(false);
  const isWide = useMediaQuery("(min-width: 1100px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // スクロール位置から、いま見えているカテゴリと、目次を出す範囲かどうかを求める
  useEffect(() => {
    if (!isWide) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const container = document.getElementById(containerId);
      if (container) {
        const rect = container.getBoundingClientRect();
        setInRange(
          rect.top < window.innerHeight * 0.5 &&
            rect.bottom > window.innerHeight * 0.3,
        );
      }
      const line = window.innerHeight * 0.3;
      let current = 0;
      items.forEach((item, index) => {
        const el = document.getElementById(item.targetId);
        if (el && el.getBoundingClientRect().top <= line) current = index;
      });
      setActiveIndex(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isWide, items, containerId]);

  const goTo = useCallback(
    (index: number, instant: boolean) => {
      const clamped = Math.min(items.length - 1, Math.max(0, index));
      setActiveIndex(clamped);
      document.getElementById(items[clamped].targetId)?.scrollIntoView({
        block: "start",
        behavior: instant || reduceMotion ? "auto" : "smooth",
      });
    },
    [items, reduceMotion],
  );

  const indexFromPointer = (clientY: number) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return Math.round(ratio * (items.length - 1));
  };

  if (!isWide || items.length < 2) return null;

  const current = items[Math.min(activeIndex, items.length - 1)];
  const thumbPercent = (activeIndex / (items.length - 1)) * 100;

  return (
    <div className={styles.wrap} data-visible={inRange} data-engaged={engaged}>
      <div
        ref={railRef}
        className={styles.rail}
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="カテゴリ目次(つまんで動かすと、そのカテゴリの節へ移動します)"
        aria-valuemin={1}
        aria-valuemax={items.length}
        aria-valuenow={activeIndex + 1}
        aria-valuetext={`${current.label}(${current.count}件)`}
        onFocus={() => setEngaged(true)}
        onBlur={() => setEngaged(false)}
        onPointerEnter={() => setEngaged(true)}
        onPointerLeave={() => {
          if (!dragging.current) setEngaged(false);
        }}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setEngaged(true);
          goTo(indexFromPointer(event.clientY), true);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          const next = indexFromPointer(event.clientY);
          if (next !== activeIndex) goTo(next, true);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (event.key in KEY_STEP) {
            event.preventDefault();
            goTo(activeIndex + KEY_STEP[event.key], false);
          } else if (event.key === "Home") {
            event.preventDefault();
            goTo(0, false);
          } else if (event.key === "End") {
            event.preventDefault();
            goTo(items.length - 1, false);
          }
        }}
      >
        <span className={styles.string} aria-hidden="true" />
        {items.map((item, index) => (
          <span
            key={item.targetId}
            className={styles.tick}
            data-passed={index <= activeIndex}
            style={{ top: `${(index / (items.length - 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        <span
          className={styles.thumb}
          style={{ top: `${thumbPercent}%` }}
          aria-hidden="true"
        />
        <span
          className={styles.label}
          style={{ top: `${thumbPercent}%` }}
          aria-hidden="true"
        >
          {current.label}
          <span className={styles.labelCount}>{current.count}</span>
        </span>
      </div>
    </div>
  );
}
