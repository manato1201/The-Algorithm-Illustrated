import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { hasVisualizer } from "@/lib/has-visualizer";

const CONTENT_DIR = path.join(process.cwd(), "content", "algorithms");

/** コードフェンスの info string(```python 等)を「実装例」セクションの言語ラベルに変換する。 */
const CODE_LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  typescript: "TypeScript",
  cpp: "C++",
  rust: "Rust",
  csharp: "C#",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 「## 実装例」セクションの各言語コードブロックに言語ラベルを表示するため、
 * markedの標準レンダラーを上書きする(標準のまま`<pre><code class="language-xxx">`だけでは
 * どの言語のコードかがぱっと見て分からないため)。
 */
const contentRenderer = {
  code({ text, lang }: { text: string; lang?: string }): string {
    const label = lang ? (CODE_LANGUAGE_LABELS[lang] ?? lang) : null;
    const labelHtml = label ? `<div class="codeLangLabel">${escapeHtml(label)}</div>` : "";
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    return `<div class="codeBlock">${labelHtml}<pre><code${langClass}>${escapeHtml(text)}</code></pre></div>`;
  },
};
marked.use({ renderer: contentRenderer });

export type AlgorithmFrontmatter = {
  name: string;
  category: string;
  subcategory: string;
  complexity: string;
  summary: string;
};

export type AlgorithmMeta = AlgorithmFrontmatter & {
  id: string;
  /** ビルド時に計算する。可視化コンポーネント本体は読み込まず真偽値のみをクライアントへ渡す。 */
  hasVisualizer: boolean;
};

export type AlgorithmDetail = AlgorithmMeta & {
  bodyHtml: string;
};

/**
 * アルゴリズム図鑑の実データモデル。
 * content/algorithms/<id>.md (frontmatter + Markdown本文)をビルド時に読み込む。
 * DB/CMSではなくリポジトリ内Markdownを選んだ理由はdocs/progress.md参照。
 */
export function getAllAlgorithmIds(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .sort();
}

function readFrontmatter(
  id: string,
): { frontmatter: AlgorithmFrontmatter; content: string } | null {
  const filePath = path.join(CONTENT_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { frontmatter: data as AlgorithmFrontmatter, content };
}

/** カタログ一覧向けの軽量メタデータ。Markdown本文のHTML変換は行わない。 */
export function getAllAlgorithmsMeta(): AlgorithmMeta[] {
  return getAllAlgorithmIds()
    .map((id) => {
      const parsed = readFrontmatter(id);
      if (!parsed) return null;
      return { id, ...parsed.frontmatter, hasVisualizer: hasVisualizer(id) };
    })
    .filter((meta): meta is AlgorithmMeta => meta !== null);
}

/** 詳細ページ向け。Markdown本文をHTMLへ変換して返す。 */
export function getAlgorithmDetail(id: string): AlgorithmDetail | null {
  const parsed = readFrontmatter(id);
  if (!parsed) return null;
  return {
    id,
    ...parsed.frontmatter,
    hasVisualizer: hasVisualizer(id),
    bodyHtml: marked.parse(parsed.content, { async: false }) as string,
  };
}
