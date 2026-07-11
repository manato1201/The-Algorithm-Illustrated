"use client";

import { useEffect, useState } from "react";
import styles from "./LiveClock.module.css";

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * ライブ時計(docs/design/ui-design.md 2.6節)。
 * サーバー/クライアントの初回レンダリングを一致させるため、マウント後に時刻を反映する。
 */
export function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setTime(timeFormatter.format(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={styles.clock}>
      <span className={styles.time}>{time ?? "--:--:--"}</span>
      <span className={styles.zone}>JST</span>
    </span>
  );
}
