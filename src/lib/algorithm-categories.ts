/**
 * カタログ画面のカテゴリ・サブカテゴリ階層(docs/design/ui-design.md 3節)。
 * コンテンツ(content/algorithms/*.md)のfrontmatter category/subcategoryはこの表のいずれかの値と一致させること。
 * 新カテゴリ・新サブカテゴリの追加はこの配列への追記だけで完結する(docs/progress.mdのロードマップ参照)。
 */
export const CATEGORY_TAXONOMY = [
  { category: "ソート", subcategories: ["比較ベース", "非比較ベース"] },
  { category: "探索", subcategories: ["配列探索", "グラフ・経路探索"] },
  {
    category: "グラフ",
    subcategories: ["最短路", "最小全域木", "最大流・マッチング", "連結性・順序"],
  },
  {
    category: "動的計画法",
    subcategories: ["数列・部分列", "ナップサック・組合せ最適化", "区間分割DP"],
  },
  { category: "貪欲法", subcategories: ["基本貪欲法"] },
  { category: "文字列", subcategories: ["パターンマッチング", "接尾辞構造", "回文・圧縮その他"] },
  {
    category: "データ構造",
    subcategories: ["木構造", "区間・累積クエリ構造", "空間分割構造", "確率的・キャッシュ構造"],
  },
  {
    category: "数論・暗号",
    subcategories: ["素数判定・素因数分解", "合同算術・剰余系", "暗号・鍵交換", "高速演算"],
  },
  { category: "計算幾何", subcategories: ["凸包・多角形", "分割統治・走査", "三角形分割・分割図"] },
  {
    category: "最適化・確率的手法",
    subcategories: ["局所探索", "進化的・確率的手法", "厳密最適化"],
  },
  {
    category: "情報検索・ランキング",
    subcategories: ["スコアリング", "グラフベースランキング", "近似検索"],
  },
  { category: "機械学習", subcategories: ["教師あり学習", "教師なし学習", "最適化基礎"] },
  { category: "デザインパターン", subcategories: ["生成", "構造", "振る舞い"] },
  {
    category: "シミュレーション・群知能",
    subcategories: ["セルオートマトン", "群知能最適化", "群れ行動シミュレーション"],
  },
  {
    category: "分散システム",
    subcategories: ["合意形成", "障害検出・選出", "データ分散・整合性"],
  },
  {
    category: "ゲーム",
    subcategories: ["ゲームAI・意思決定", "手続き型コンテンツ生成", "数理ゲーム理論"],
  },
] as const;

export const CATEGORY_ORDER = CATEGORY_TAXONOMY.map((c) => c.category);

export const SUBCATEGORIES_BY_CATEGORY: Record<string, readonly string[]> = Object.fromEntries(
  CATEGORY_TAXONOMY.map((c) => [c.category, c.subcategories]),
);
