import styles from "./LogFeed.module.css";

export type LogEntry = {
  time: string;
  tag: string;
  text: string;
};

type LogFeedProps = {
  entries: LogEntry[];
};

/**
 * タイムスタンプ付きログフィード(docs/design/ui-design.md 2.6節)。
 * 詳細画面ではアルゴリズム実行のステップイベント履歴、カタログ/更新情報画面ではデータ取得・更新履歴に転用する。
 */
export function LogFeed({ entries }: LogFeedProps) {
  return (
    <ul className={styles.feed}>
      {entries.map((entry, index) => (
        <li key={`${entry.time}-${index}`} className={styles.row}>
          <span className={styles.time}>{entry.time}</span>
          <span className={styles.tag}>{entry.tag}</span>
          <span className={styles.text}>{entry.text}</span>
        </li>
      ))}
    </ul>
  );
}
