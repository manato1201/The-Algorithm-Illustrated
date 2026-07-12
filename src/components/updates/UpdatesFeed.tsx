"use client";

import { useEffect, useState } from "react";
import styles from "./UpdatesFeed.module.css";
import type { UpdateItem } from "@/lib/updates";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: UpdateItem[] };

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * /api/updates(Edge Function BFF)を叩いて記事一覧を表示するクライアントコンポーネント。
 * effect内で直接setStateせず、fetchのthen/catchコールバック内でのみ呼ぶことでreact-hooks/set-state-in-effectを回避する。
 */
export function UpdatesFeed() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/updates")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: data.error ?? "取得に失敗しました",
          });
          return;
        }
        setState({ status: "ready", items: data.items });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message: "ネットワークエラーが発生しました",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <p className={styles.status} role="status">
        Edge Functionでフィードを取得中…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className={styles.status} role="alert">
        {state.message}
      </p>
    );
  }

  if (state.items.length === 0) {
    return <p className={styles.status}>記事が見つかりませんでした。</p>;
  }

  return (
    <ul className={styles.list}>
      {state.items.map((item) => (
        <li key={item.id} className={styles.card}>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardLink}
          >
            <h2 className={styles.cardTitle}>{item.title}</h2>
            {item.summary ? (
              <p className={styles.cardSummary}>{item.summary}</p>
            ) : null}
            <div className={styles.cardMeta}>
              {item.author ? <span>{item.author}</span> : null}
              {item.publishedAt ? (
                <span>{formatDate(item.publishedAt)}</span>
              ) : null}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
