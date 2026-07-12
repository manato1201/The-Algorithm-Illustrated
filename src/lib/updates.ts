export type UpdateItem = {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  author: string;
  summary: string;
};

/**
 * 更新情報画面のデータソース。Qiitaの人気記事フィード(Atom形式)。
 * https://qiita.com/popular-items/feed が実際にAtom XMLを返すことを事前にcurlで確認済み。
 */
const FEED_URL = "https://qiita.com/popular-items/feed";

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1].trim()) : null;
}

/** <link rel="alternate" ... href="..."/> のhrefを、属性の並び順に依存せず取り出す。 */
function extractAlternateLink(block: string): string | null {
  const linkTags = block.match(/<link[^>]*\/?>/g) ?? [];
  for (const tag of linkTags) {
    if (!tag.includes('rel="alternate"')) continue;
    const hrefMatch = tag.match(/href="([^"]+)"/);
    if (hrefMatch) return decodeEntities(hrefMatch[1]);
  }
  return null;
}

/**
 * 外部Atomフィードを取得し、記事一覧に変換する。
 * Vercel Edge Functions上(src/app/api/updates/route.ts)から呼ばれる、BFFの中継処理本体。
 * ブラウザ標準のDOMParserはEdge Runtimeで使えないため、正規表現ベースの簡易パーサーで抽出する
 * (信頼できる自社ドメインではなく外部フィードが相手なので、HTMLとして描画せずテキストとしてのみ扱う)。
 */
export async function fetchUpdates(limit = 12): Promise<UpdateItem[]> {
  const res = await fetch(FEED_URL, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`フィードの取得に失敗しました(HTTP ${res.status})`);
  }
  const xml = await res.text();

  const entryBlocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entryBlocks.slice(0, limit).map((block, index) => {
    const title = extractTag(block, "title") ?? "(タイトルなし)";
    const link = extractAlternateLink(block) ?? "#";
    const publishedAt =
      extractTag(block, "published") ?? extractTag(block, "updated") ?? "";
    const author = extractTag(block, "name") ?? "";
    const rawContent = extractTag(block, "content") ?? "";
    const summary = rawContent.replace(/\s+/g, " ").slice(0, 120);
    return {
      id: `${index}-${link}`,
      title,
      link,
      publishedAt,
      author,
      summary,
    };
  });
}
