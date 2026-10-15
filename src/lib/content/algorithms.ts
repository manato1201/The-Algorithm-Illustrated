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
    const labelHtml = label
      ? `<span class="codeLangLabel">${escapeHtml(label)}</span>`
      : "<span></span>";
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    const header = `<div class="codeBlockHeader">${labelHtml}<button type="button" class="codeCopyButton">コピー</button></div>`;
    return `<div class="codeBlock">${header}<pre><code${langClass}>${escapeHtml(text)}</code></pre></div>`;
  },
};
marked.use({ renderer: contentRenderer });

/**
 * 見出し(## ...)単位でアコーディオン(<details>)に包む節と、初期状態。
 * 長いコード(実装例)は普段は閉じ、読み物の中心(特性・トレードオフ)は開いたままにする。
 * 概要・仕組みは常に見せたいので包まない。
 */
const ACCORDION_SECTIONS: Record<string, { open: boolean }> = {
  "特性・トレードオフ": { open: true },
  実装例: { open: false },
};

/** markedが出力したHTMLを<h2>ごとに分け、対象の節だけ <details> で包む。 */
function wrapAccordions(html: string): string {
  return html
    .split(/(?=<h2[ >])/)
    .map((chunk) => {
      const match = chunk.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (!match) return chunk;
      const title = match[1].replace(/<[^>]+>/g, "").trim();
      // 「実装例(Lomuto分割方式)」のように補足が付く見出しも対象にするため、前方一致で探す
      const key = Object.keys(ACCORDION_SECTIONS).find((name) => title.startsWith(name));
      const config = key ? ACCORDION_SECTIONS[key] : undefined;
      if (!config) return chunk;
      const heading = match[0];
      const rest = chunk.slice(heading.length);
      return `<details class="accordion"${config.open ? " open" : ""}><summary class="accordionSummary">${heading}</summary><div class="accordionBody">${rest}</div></details>`;
    })
    .join("");
}

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

/**
 * カタログ一覧向けの軽量メタデータ。Markdown本文のHTML変換は行わない。
 * 詳細ページ(generateStaticParamsで698件を静的生成)の各ページがgetRelatedAlgorithms経由で
 * 呼ぶため、プロセス内でメモ化して全frontmatterの再読み込みをビルド全体で1回に抑える。
 */
let cachedMeta: AlgorithmMeta[] | null = null;

export function getAllAlgorithmsMeta(): AlgorithmMeta[] {
  if (cachedMeta) return cachedMeta;
  cachedMeta = getAllAlgorithmIds()
    .map((id) => {
      const parsed = readFrontmatter(id);
      if (!parsed) return null;
      return { id, ...parsed.frontmatter, hasVisualizer: hasVisualizer(id) };
    })
    .filter((meta): meta is AlgorithmMeta => meta !== null);
  return cachedMeta;
}

/** 詳細ページの「関連アルゴリズム」欄向け。同じサブカテゴリの他アルゴリズムを最大limit件返す。 */
export function getRelatedAlgorithms(id: string, limit = 6): AlgorithmMeta[] {
  const all = getAllAlgorithmsMeta();
  const current = all.find((meta) => meta.id === id);
  if (!current) return [];
  return all
    .filter((meta) => meta.id !== id && meta.subcategory === current.subcategory)
    .slice(0, limit);
}

/** 詳細ページ向け。Markdown本文をHTMLへ変換して返す。 */
export function getAlgorithmDetail(id: string): AlgorithmDetail | null {
  const parsed = readFrontmatter(id);
  if (!parsed) return null;
  return {
    id,
    ...parsed.frontmatter,
    hasVisualizer: hasVisualizer(id),
    bodyHtml: wrapAccordions(marked.parse(parsed.content, { async: false }) as string),
  };
}
