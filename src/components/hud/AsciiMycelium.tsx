import styles from "./AsciiMycelium.module.css";

/**
 * 空状態の飾り(ASCIIモチーフ「菌類」。菌糸=グラフ)。文字で描いた菌糸のネットワークときのこ。
 * 本文・操作部品には使わず、「何もない」「待機」の状態だけに置く。緑の発光色は既存トークン
 * (--color-accent-green)のみ。下の行から順に伸びて現れ、動きを減らす設定では静止画1枚にする。
 * 絵は本サイトで描き起こしたもので、外部の素材は使っていない。
 */
const ART = [
  '      .-"""-.',
  "    .'  o .  '.",
  "   (  .   o   )",
  "    '-._____.-'",
  "         ||",
  "   o--.  ||  .--o",
  "      '--||--'",
  "  o-----+||+-----o",
  "     .-'    '-.",
  "    o    ||    o",
  "         ||",
  "         o",
] as const;

export function AsciiMycelium() {
  return (
    <pre className={styles.art} aria-hidden="true">
      {ART.map((line, index) => (
        <span
          key={index}
          className={styles.line}
          style={{ ["--grow-order" as string]: ART.length - 1 - index }}
        >
          {line}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}
