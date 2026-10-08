/** 年表の1項目。名称・分野は記事のfrontmatterから引き、年表データ側には重複して持たない。 */
export type AtlasEntry = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  year: number;
  approximate: boolean;
  people: string;
  purpose: string;
  source: string;
};

/** 年の表示。紀元前は「紀元前300年頃」のように書く。(fsに依存しないので、クライアントからも使える) */
export function formatAtlasYear(year: number, approximate: boolean): string {
  const base = year < 0 ? `紀元前${-year}年` : `${year}年`;
  return approximate ? `${base}頃` : base;
}
