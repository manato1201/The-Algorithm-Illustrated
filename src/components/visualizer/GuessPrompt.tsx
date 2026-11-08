import styles from "./GuessPrompt.module.css";
import { STEP_KIND_LABELS, type StepKind } from "./step-timeline";

type GuessPromptProps = {
  /** 選択肢(この再生に現れる種類)。 */
  choices: readonly Exclude<StepKind, "idle">[];
  /** 次のステップの本当の種類。 */
  answer: StepKind;
  /** 選んだ種類。まだ選んでいなければ null。 */
  chosen: StepKind | null;
  onChoose: (kind: Exclude<StepKind, "idle">) => void;
  /** 答えを見ずに進む(スキップ)、または答えを見たあとに進む。 */
  onContinue: () => void;
};

/**
 * 先に予想させる(Guess first)。「次のステップで起きるのは?」を選んでから進む。
 * 採点はしない(点数も正答率も出さない)。答え合わせは、一致したかを一言で返すだけ。いつでもスキップできる。
 */
export function GuessPrompt({ choices, answer, chosen, onChoose, onContinue }: GuessPromptProps) {
  const answerLabel = STEP_KIND_LABELS[answer];
  return (
    <div className={styles.prompt} role="group" aria-label="次のステップの予想">
      {chosen === null ? (
        <>
          <p className={styles.question}>次のステップで起きるのは?</p>
          <div className={styles.choices}>
            {choices.map((kind) => (
              <button key={kind} type="button" className={styles.choice} data-kind={kind} onClick={() => onChoose(kind)}>
                <span aria-hidden="true">{STEP_KIND_LABELS[kind].glyph}</span> {STEP_KIND_LABELS[kind].ja}
              </button>
            ))}
            <button type="button" className={styles.skip} onClick={onContinue}>
              答えを見ずに進む
            </button>
          </div>
        </>
      ) : (
        <div className={styles.result} role="status">
          <p>
            {chosen === answer ? "予想どおり、" : "次は、"}
            <strong>
              {answerLabel.glyph} {answerLabel.ja}
            </strong>
            でした。
          </p>
          <button type="button" className={styles.next} onClick={onContinue}>
            続ける
          </button>
        </div>
      )}
    </div>
  );
}
