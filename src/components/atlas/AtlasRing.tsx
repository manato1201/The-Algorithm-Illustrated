"use client";

import { useMemo } from "react";
import styles from "./AtlasView.module.css";
import { CATEGORY_ORDER } from "@/lib/algorithm-categories";
import { formatAtlasYear, type AtlasEntry } from "@/lib/atlas-format";

const SIZE = 720;
const CENTER = SIZE / 2;
const INNER_RADIUS = 56;
const OUTER_RADIUS = 250;
const LABEL_RADIUS = OUTER_RADIUS + 18;

/** 年→中心からの距離。1900年より前は数が少なく間隔が長いので内側15%に圧縮し、近現代を広く使う。 */
const ANCIENT_END = 1900;
const MODERN_END = 2020;
const ANCIENT_SHARE = 0.15;

function radiusForYear(year: number): number {
  const span = OUTER_RADIUS - INNER_RADIUS;
  if (year < ANCIENT_END) {
    const t = (year + 300) / (ANCIENT_END + 300);
    return INNER_RADIUS + t * ANCIENT_SHARE * span;
  }
  const t = Math.min((year - ANCIENT_END) / (MODERN_END - ANCIENT_END), 1);
  return INNER_RADIUS + ANCIENT_SHARE * span + t * (1 - ANCIENT_SHARE) * span;
}

/** 0度=真上、時計回り。 */
function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

const GUIDE_YEARS = [1950, 1980, 2010];

type Props = {
  entries: AtlasEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * 分野の輪。分野ごとの扇に項目を置き、中心から外側へ古い→新しい順に並べる。
 * 点は色ではなく「どの扇のどの距離にあるか」で意味を持つので、色分けに頼らない。
 */
export function AtlasRing({ entries, selectedId, onSelect }: Props) {
  const categories = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) =>
        entries.some((entry) => entry.category === category),
      ),
    [entries],
  );
  const sector = 360 / categories.length;

  const dots = useMemo(() => {
    return categories.flatMap((category, categoryIndex) => {
      const inCategory = entries.filter((entry) => entry.category === category);
      const center = categoryIndex * sector + sector / 2;
      return inCategory.map((entry, order) => {
        // 同じ扇の中は、年の古い順に左→右へ少しずつずらして重なりを避ける
        const spread =
          inCategory.length === 1
            ? 0
            : (order / (inCategory.length - 1) - 0.5) * sector * 0.6;
        return { entry, ...polar(center + spread, radiusForYear(entry.year)) };
      });
    });
  }, [categories, entries, sector]);

  return (
    <svg
      className={styles.ring}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="group"
      aria-label="分野の輪。分野ごとの扇に、アルゴリズムの発表年を中心から外側へ並べた図"
    >
      {GUIDE_YEARS.map((year) => (
        <g key={year}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={radiusForYear(year)}
            className={styles.guide}
          />
          <text
            x={CENTER + 4}
            y={CENTER - radiusForYear(year) - 3}
            className={styles.guideLabel}
          >
            {year}
          </text>
        </g>
      ))}
      {categories.map((category, index) => {
        const edge = polar(index * sector, OUTER_RADIUS);
        const inner = polar(index * sector, INNER_RADIUS);
        const label = polar(index * sector + sector / 2, LABEL_RADIUS);
        const anchor =
          label.x < CENTER - 8
            ? "end"
            : label.x > CENTER + 8
              ? "start"
              : "middle";
        return (
          <g key={category}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={edge.x}
              y2={edge.y}
              className={styles.spoke}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={styles.sectorLabel}
            >
              {category}
            </text>
          </g>
        );
      })}
      {dots.map(({ entry, x, y }) => {
        const isSelected = entry.id === selectedId;
        const label = `${entry.name}(${formatAtlasYear(entry.year, entry.approximate)}、${entry.category})`;
        return (
          <g
            key={entry.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            className={styles.dotGroup}
            onClick={() => onSelect(entry.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(entry.id);
              }
            }}
          >
            <title>{label}</title>
            {/* 大きめの透明な当たり判定(指でも押しやすい) */}
            <circle cx={x} cy={y} r={12} className={styles.dotHit} />
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 7 : 5}
              className={isSelected ? styles.dotSelected : styles.dot}
            />
          </g>
        );
      })}
    </svg>
  );
}
