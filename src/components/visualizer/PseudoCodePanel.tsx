import styles from "./PseudoCodePanel.module.css";
import { activePseudoLines, PSEUDO_CODE } from "@/lib/pseudo-code";
import type { StepKind } from "./step-timeline";

type PseudoCodePanelProps = {
  algorithmId: string;
  /** 再生中のステップの状態種別。ここから現在行を決める。 */
  kind: StepKind;
};

/**
 * 擬似コードの現在行を示す「窓」。再生位置の状態種別に対応する行を ▶ と太字・背景で示す
 * (色だけに頼らない)。対応していないアルゴリズムでは何も出さない。
 */
export function PseudoCodePanel({ algorithmId, kind }: PseudoCodePanelProps) {
  const lines = PSEUDO_CODE[algorithmId];
  if (!lines) return null;
  const active = new Set(activePseudoLines(algorithmId, kind));

  return (
    <section className={styles.panel} aria-label="擬似コードと現在の行">
      <h3 className={styles.title}>PSEUDO CODE</h3>
      <ol className={styles.lines}>
        {lines.map((line, index) => (
          <li
            key={index}
            className={styles.line}
            data-active={active.has(index)}
            aria-current={active.has(index) ? "step" : undefined}
            style={{ paddingLeft: `${line.indent * 1.25}rem` }}
          >
            <span className={styles.marker} aria-hidden="true">
              {active.has(index) ? "▶" : ""}
            </span>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
