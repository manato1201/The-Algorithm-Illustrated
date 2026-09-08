"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./AlgorithmStackBrowser.module.css";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import { FavoriteToggleButton } from "@/components/hud/FavoriteToggleButton";
import type { AlgorithmMeta } from "@/lib/content/algorithms";

type AlgorithmStackBrowserProps = {
  algorithms: AlgorithmMeta[];
  favorites: Set<string>;
  favoritesLoaded: boolean;
  onToggleFavorite: (id: string) => void;
};

/**
 * モバイル向けの横スワイプ・スタック閲覧モード(IMPROVEMENT_PLAN.md Phase 5)。
 * scroll-snapで1枚ずつ中央に来るようにし、IntersectionObserverで画面中央から外れたカードを
 * 縮小・半透明化することで、スワイプするとカードがめくれていくような重なりを表現する。
 */
export function AlgorithmStackBrowser({
  algorithms,
  favorites,
  favoritesLoaded,
  onToggleFavorite,
}: AlgorithmStackBrowserProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [peekingIds, setPeekingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setPeekingIds((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.cardId;
            if (!id) continue;
            if (entry.intersectionRatio < 0.9) {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
          return next;
        });
      },
      { root: track, threshold: [0, 0.5, 0.9, 1] },
    );

    const cards = track.querySelectorAll<HTMLElement>(`[data-card-id]`);
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [algorithms]);

  return (
    <div className={styles.stackTrack} ref={trackRef}>
      {algorithms.map((algorithm) => (
        <div
          key={algorithm.id}
          className={styles.stackCard}
          data-card-id={algorithm.id}
          data-peek={peekingIds.has(algorithm.id)}
        >
          <Link
            href={`/algorithms/${algorithm.id}`}
            className={styles.stackCardHead}
          >
            <span className={styles.stackCardCategory}>
              {algorithm.category} ・ {algorithm.subcategory}
            </span>
            <h3 className={styles.stackCardName}>{algorithm.name}</h3>
            <ComplexityBadge notation={algorithm.complexity} />
          </Link>
          <p className={styles.stackCardSummary}>{algorithm.summary}</p>
          <FavoriteToggleButton
            variant="label"
            active={favorites.has(algorithm.id)}
            disabled={!favoritesLoaded}
            onToggle={() => onToggleFavorite(algorithm.id)}
          />
        </div>
      ))}
    </div>
  );
}
