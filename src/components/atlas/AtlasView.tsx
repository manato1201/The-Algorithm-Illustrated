"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./AtlasView.module.css";
import { AtlasRing } from "./AtlasRing";
import { formatAtlasYear, type AtlasEntry } from "@/lib/atlas-format";

type View = "timeline" | "ring";

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: "timeline", label: "時間軸", hint: "古い順に、いつ・誰が・なぜ生み出したかを読む" },
  { key: "ring", label: "分野の輪", hint: "分野ごとの扇に、年代を中心(古い)から外側(新しい)へ並べる" },
];

/** 1項目の詳細(目的・出典つき)。時間軸の各カードと、分野の輪の選択パネルで共通に使う。 */
export function AtlasEntryCard({ entry, compact = false }: { entry: AtlasEntry; compact?: boolean }) {
  return (
    <article className={compact ? styles.detailCompact : styles.card}>
      <header className={styles.cardHead}>
        <span className={styles.year}>{formatAtlasYear(entry.year, entry.approximate)}</span>
        <h3 className={styles.cardTitle}>
          <Link href={`/algorithms/${entry.id}`} className={styles.cardLink}>
            {entry.name}
          </Link>
        </h3>
        <span className={styles.category}>
          {entry.category} ・ {entry.subcategory}
        </span>
      </header>
      <p className={styles.people}>{entry.people}</p>
      <p className={styles.purpose}>
        <span className={styles.purposeLabel}>生まれた目的</span>
        {entry.purpose}
      </p>
      <p className={styles.source}>
        <span className={styles.sourceLabel}>出典</span>
        {entry.source}
      </p>
    </article>
  );
}

/**
 * アルゴリズム年表Atlas(IMPROVEMENT_PLAN_2026-10 A3)。2つのビューを切り替える:
 * 時間軸(読む)と分野の輪(全体像を眺めて、気になる点を選ぶ)。
 */
export function AtlasView({ entries }: { entries: AtlasEntry[] }) {
  const [view, setView] = useState<View>("timeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const active = VIEWS.find((v) => v.key === view)!;

  return (
    <div className={styles.atlas}>
      <div className={styles.tabs} role="tablist" aria-label="年表の表示切替">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            id={`atlas-tab-${v.key}`}
            aria-selected={view === v.key}
            aria-controls="atlas-panel"
            className={`${styles.tab} ${view === v.key ? styles.tabActive : ""}`}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
        <span className={styles.tabHint}>{active.hint}</span>
      </div>

      <div id="atlas-panel" role="tabpanel" aria-labelledby={`atlas-tab-${view}`}>
        {view === "timeline" ? (
          <ol className={styles.timeline}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.timelineItem}>
                <AtlasEntryCard entry={entry} />
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.ringLayout}>
            <AtlasRing entries={entries} selectedId={selectedId} onSelect={setSelectedId} />
            <div className={styles.detailPane} aria-live="polite">
              {selected ? (
                <AtlasEntryCard entry={selected} compact />
              ) : (
                <p className={styles.detailHint}>
                  輪の上の点を選ぶと、そのアルゴリズムが生まれた目的と出典がここに表示されます。
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
