import styles from "./StepScore.module.css";
import { STEP_KIND_LABELS, type StepKind } from "./step-timeline";
import { STEP_TONE, STEP_TONE_MAX_RANK } from "@/lib/step-sound";

/** 現在位置の前後に並べる数(合計 = 前 + 1 + 後)。 */
const WINDOW_BEFORE = 6;
const WINDOW_AFTER = 8;

type StepScoreProps = {
  stepKinds: readonly StepKind[];
  stepIndex: number;
};

/**
 * 操作の列を譜面のように並べ、いまの1つを枠で強調する表示(Z25)。
 * 縦の位置が状態の種類(音の高さと同じ段)、記号が状態。タイムラインより手前の数ステップだけを
 * 大きく見せる「窓」で、全体の位置はタイムライン側が担う。読み上げはタイムラインに任せ、ここは装飾。
 */
export function StepScore({ stepKinds, stepIndex }: StepScoreProps) {
  const cells = Array.from({ length: WINDOW_BEFORE + 1 + WINDOW_AFTER }, (_, offset) => {
    const index = stepIndex - WINDOW_BEFORE + offset;
    return { index, kind: index >= 0 && index < stepKinds.length ? stepKinds[index] : null };
  });

  return (
    <div className={styles.score} data-surface="dark" aria-hidden="true">
      {cells.map(({ index, kind }) => (
        <div
          key={index}
          className={styles.cell}
          data-current={index === stepIndex}
          data-empty={kind === null}
        >
          {kind ? (
            <span
              className={styles.note}
              data-kind={kind}
              style={{ bottom: `${12 + (STEP_TONE[kind].rank / STEP_TONE_MAX_RANK) * 70}%` }}
            >
              {STEP_KIND_LABELS[kind].glyph}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
