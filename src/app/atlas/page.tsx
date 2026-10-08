import type { Metadata } from "next";
import styles from "./page.module.css";
import { AtlasView } from "@/components/atlas/AtlasView";
import { getAtlasEntries } from "@/lib/content/atlas";

export const metadata: Metadata = {
  title: "アルゴリズム年表 | The Algorithm Illustrated",
  description:
    "代表的なアルゴリズムが、いつ・誰によって・どんな目的で生まれたかを、時間軸と分野の輪で眺める年表。",
};

/** アルゴリズム年表Atlas(IMPROVEMENT_PLAN_2026-10 A3)。データは content/atlas/milestones.json。 */
export default function AtlasPage() {
  const entries = getAtlasEntries();

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>■ ATLAS アルゴリズム年表</p>
      <h1 className={styles.title}>
        いつ、誰が、<span className={styles.accent}>なぜ</span>生み出したか。
      </h1>
      <p className={styles.lead}>
        代表的な{entries.length}件を、発表された年の順に並べました。各項目に、生まれた目的と原典を添えています。
        年は原典の発表年で、「頃」が付くものは古代の推定です。
      </p>
      <AtlasView entries={entries} />
    </div>
  );
}
