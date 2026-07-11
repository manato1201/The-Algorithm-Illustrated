import styles from "./ComplexityBadge.module.css";

type ComplexityBadgeProps = {
  notation: string;
};

/** Big-O表記バッジ。等幅フォント+amberで統一(docs/design/ui-design.md 2.3節) */
export function ComplexityBadge({ notation }: ComplexityBadgeProps) {
  return <span className={styles.badge}>{notation}</span>;
}
