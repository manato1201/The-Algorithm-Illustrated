import styles from "./StatusChip.module.css";

type Status = "online" | "active" | "idle";

const STATUS_CONFIG: Record<
  Status,
  { colorVar: string; label: string; glow: boolean }
> = {
  online: {
    colorVar: "var(--color-accent-green)",
    label: "SYSTEM ONLINE",
    glow: true,
  },
  active: {
    colorVar: "var(--color-accent-amber)",
    label: "実行中",
    glow: true,
  },
  idle: { colorVar: "var(--color-text-muted)", label: "待機中", glow: false },
};

type StatusChipProps = {
  status?: Status;
  label?: string;
};

/** ステータスチップ(docs/design/ui-design.md 2.6節)。green=状態/成立/成功のみに限定使用 */
export function StatusChip({ status = "online", label }: StatusChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={styles.chip}>
      <span
        className={styles.dot}
        style={{
          backgroundColor: config.colorVar,
          boxShadow: config.glow ? `0 0 8px ${config.colorVar}` : "none",
        }}
        aria-hidden="true"
      />
      <span className={styles.label}>{label ?? config.label}</span>
    </span>
  );
}
