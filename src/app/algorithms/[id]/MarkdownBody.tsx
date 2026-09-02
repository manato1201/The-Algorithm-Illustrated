"use client";

import { useEffect, useRef } from "react";

type MarkdownBodyProps = {
  html: string;
  className: string;
};

const COPIED_LABEL = "コピーしました";
const FAILED_LABEL = "コピーに失敗";
const RESET_DELAY_MS = 1600;

/**
 * content/algorithms/*.md をmarked経由でHTML化した文字列をdangerouslySetInnerHTMLで描画する。
 * コードブロックの「コピー」ボタンはReactツリー外の生HTMLに埋め込まれているため、
 * 個々にonClickを付けられない。コンテナに1つだけクリックリスナーを置き、
 * .codeCopyButtonへのクリックを委譲で拾う。
 */
export function MarkdownBody({ html, className }: MarkdownBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(".codeCopyButton");
      if (!button || !container.contains(button)) return;

      const code = button.closest(".codeBlock")?.querySelector("pre code");
      const text = code?.textContent ?? "";
      if (!text) return;

      const originalLabel = button.dataset.originalLabel ?? button.textContent ?? "コピー";
      button.dataset.originalLabel = originalLabel;

      navigator.clipboard
        .writeText(text)
        .then(() => {
          button.textContent = COPIED_LABEL;
          button.classList.add("copied");
        })
        .catch(() => {
          button.textContent = FAILED_LABEL;
        })
        .finally(() => {
          window.setTimeout(() => {
            button.textContent = originalLabel;
            button.classList.remove("copied");
          }, RESET_DELAY_MS);
        });
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      // content/algorithms/*.md はリポジトリで管理する信頼済みコンテンツのみ(外部入力なし)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
