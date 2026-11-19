import styles from "./RelatedSites.module.css";

export type SiteId = "algorithm" | "foundations" | "color" | "houdini";

/**
 * 自作の関連サイト 4 つ(図鑑 3 つ+Houdini リファレンス)の名前・URL・一言。各サイトに同じ内容を置く(共有パッケージは作らない)。
 * url が空文字のサイトは、リンクを出さない(本番 URL が確認できるまで推測で書かない)。
 * フッター(この下の RelatedSites)とヘッダーの「関連サイト」メニュー(SitesMenu)が、この 1 つの定数を共有する。
 */
export const RELATED_SITES: { id: SiteId; name: string; desc: string; url: string }[] = [
  {
    id: "algorithm",
    name: "アルゴリズム図鑑",
    desc: "動きを 1 コマずつ再生して学ぶ",
    url: "https://the-algorithm-illustrated.vercel.app",
  },
  {
    id: "foundations",
    name: "基礎学習図鑑",
    desc: "言語・IT・DCC の土台を手順の図で",
    url: "https://foundations-encyclopedia.vercel.app",
  },
  {
    id: "color",
    name: "色彩図鑑",
    desc: "色と図形の図鑑・色彩検定の対策",
    url: "https://color-encyclopedia.vercel.app",
  },
  {
    id: "houdini",
    name: "Houdini リファレンス",
    desc: "Tips・ニュース・リファレンスを自動で集めて見る",
    url: "https://houdini-reference.vercel.app",
  },
];

/** 全画面共通のフッター「関連サイト」。いま見ているサイトはリンクにせず、他のサイトへ飛べる。 */
export function RelatedSites({ current }: { current: SiteId }) {
  return (
    <footer className={styles.footer} aria-labelledby="related-sites-heading">
      <h2 id="related-sites-heading" className={styles.heading}>
        関連サイト
      </h2>
      <ul className={styles.list}>
        {RELATED_SITES.map((site) => (
          <li key={site.id} className={styles.item}>
            {site.id === current ? (
              <span className={styles.current} aria-current="true">
                {site.name}
                <span className={styles.desc}>いま見ているサイト</span>
              </span>
            ) : site.url ? (
              <a className={styles.link} href={site.url} rel="noopener">
                {site.name}
                <span className={styles.desc}>{site.desc}</span>
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.note}>お気に入り・テーマ・設定はサイトごとに別々に保存され、共有されません。</p>
    </footer>
  );
}
