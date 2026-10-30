import styles from "./AsciiStage.module.css";
import { STEP_KIND_LABELS } from "./step-timeline";
import { asciiBarRows } from "@/lib/ascii-view";
import { stateColors, type StateColorKey } from "@/lib/design-tokens";

type AsciiStageProps = {
  values: readonly number[];
  highlight: Partial<Record<number, StateColorKey>>;
};

/**
 * 並べ替え・探索の状態を、文字のマスで表す別表示(D1)。Canvasの代わりに出す。
 * 棒は「█」の段、下の行に状態の記号(○●▲◆■。ステージのHUDと同じ)と値を並べる。
 * 色は補助で、状態は記号でも読める。画面読み上げには配列の中身を要約して渡す。
 */
export function AsciiStage({ values, highlight }: AsciiStageProps) {
  const rows = asciiBarRows(values);
  const summary = values.map((value, index) => {
    const state = highlight[index] ?? "idle";
    return state === "idle" ? `${value}` : `${value}(${STEP_KIND_LABELS[state].ja})`;
  });

  return (
    <div
      className={styles.stage}
      data-surface="dark"
      role="img"
      aria-label={`文字表示の配列: ${summary.join("、")}`}
    >
      <div className={styles.grid} aria-hidden="true">
        {rows.map((row, r) => (
          <div key={r} className={styles.row}>
            {row.map((filled, c) => (
              <span
                key={c}
                className={styles.cell}
                style={{ color: stateColors[highlight[c] ?? "idle"] }}
              >
                {filled ? "███" : " "}
              </span>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          {values.map((_, c) => (
            <span key={c} className={styles.cell}>
              {STEP_KIND_LABELS[highlight[c] ?? "idle"].glyph}
            </span>
          ))}
        </div>
        <div className={`${styles.row} ${styles.valueRow}`}>
          {values.map((value, c) => (
            <span key={c} className={styles.cell}>
              {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
