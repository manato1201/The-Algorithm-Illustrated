/**
 * 再生コントロール用の線画SVGアイコン一式(決めごと表: アイコンは線画SVG1セットで統一)。
 * 全て16x16・1.5px線・currentColor。装飾なので aria-hidden とし、意味はボタンのテキストが担う。
 */
type IconProps = { className?: string };

function Icon({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 2.5v11l9-5.5z" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3v10M11 3v10" />
    </Icon>
  );
}

export function StepBackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3v10M12.5 3L6 8l6.5 5z" />
    </Icon>
  );
}

export function StepForwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.5 3v10M3.5 3L10 8l-6.5 5z" />
    </Icon>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.9-4.2M2.5 2.5v3h3" />
    </Icon>
  );
}

export function SpeedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 11.5a6 6 0 1 1 12 0M8 11.5L11 6.5" />
    </Icon>
  );
}
