import styles from "./FlowOverview.module.css";
import { STEP_KIND_LABELS, type StepKind } from "./step-timeline";
import { GUESS_KIND_ORDER } from "@/lib/guess-first";
import {
  PROVENANCE_LABELS,
  PROVENANCE_ORDER,
  type ProvenanceInfo,
} from "@/lib/provenance";
import type { FlowIO } from "@/lib/flow-overview";

type FlowOverviewProps = {
  flow: FlowIO;
  provenance: ProvenanceInfo;
  /** この再生に現れる状態種別(工程として並べる)。 */
  presentKinds: readonly StepKind[];
  /** いまのステップの状態種別。この工程が光る。 */
  currentKind: StepKind;
};

/**
 * 全体図(設計書 第6弾): 入力 → 工程 → 出力を、再生コントロールの上に出しっぱなしにする。
 * いまの工程は、色だけでなく枠・太字・記号(●▲◆■)と aria-current でも示す。
 * 値の出どころの札(読んだ/再生/模擬/実行)で、図の値がどうやって得られたかも明示する。
 */
export function FlowOverview({
  flow,
  provenance,
  presentKinds,
  currentKind,
}: FlowOverviewProps) {
  const phases = GUESS_KIND_ORDER.filter((kind) => presentKinds.includes(kind));
  return (
    <section
      className={styles.overview}
      aria-label="全体図(入力・工程・出力)と値の出どころ"
    >
      <div className={styles.flow}>
        <p className={styles.endpoint}>
          <span className={styles.endpointLabel}>入力</span>
          {flow.input}
        </p>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <ol
          className={styles.phases}
          aria-label="工程(いまのステップの工程が光る)"
        >
          {phases.map((kind) => (
            <li
              key={kind}
              className={styles.phase}
              data-kind={kind}
              data-active={currentKind === kind}
              aria-current={currentKind === kind ? "step" : undefined}
            >
              <span className={styles.phaseGlyph} aria-hidden="true">
                {STEP_KIND_LABELS[kind].glyph}
              </span>
              {STEP_KIND_LABELS[kind].ja}
            </li>
          ))}
        </ol>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <p className={styles.endpoint}>
          <span className={styles.endpointLabel}>出力</span>
          {flow.output}
        </p>
      </div>

      <div className={styles.provenance}>
        <span className={styles.provenanceTitle}>この図の出どころ</span>
        {provenance.kinds.map((kind, index) => (
          <span
            key={kind}
            className={styles.badge}
            data-provenance={kind}
            title={provenance.notes[index]}
          >
            <span aria-hidden="true">{PROVENANCE_LABELS[kind].glyph}</span>{" "}
            {PROVENANCE_LABELS[kind].ja}
          </span>
        ))}
        <details className={styles.legendDetails}>
          <summary>札の意味と、この図について</summary>
          <ul className={styles.noteList}>
            {provenance.kinds.map((kind, index) => (
              <li key={kind}>
                <strong>
                  {PROVENANCE_LABELS[kind].glyph} {PROVENANCE_LABELS[kind].ja}
                </strong>
                : {provenance.notes[index]}
              </li>
            ))}
          </ul>
          <p className={styles.legendTitle}>4つの札</p>
          <ul className={styles.noteList}>
            {PROVENANCE_ORDER.map((kind) => (
              <li key={kind}>
                <strong>
                  {PROVENANCE_LABELS[kind].glyph} {PROVENANCE_LABELS[kind].ja}
                </strong>
                : {PROVENANCE_LABELS[kind].meaning}
              </li>
            ))}
          </ul>
          <p className={styles.legendTitle}>
            実物の結果を再現したとは主張しません。解説の文章は「読んだ」もの、図は上の札のとおりです。
          </p>
        </details>
      </div>
    </section>
  );
}
