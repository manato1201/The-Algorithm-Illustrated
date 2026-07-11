/**
 * カタログ画面のカテゴリ表示順(docs/design/ui-design.md 3節)。
 * コンテンツ(content/algorithms/*.md)のfrontmatter categoryはこのいずれかの値と一致させること。
 */
export const CATEGORY_ORDER = [
  "ソート",
  "探索",
  "グラフ",
  "動的計画法",
  "貪欲法",
  "文字列",
  "データ構造",
  "数論・暗号",
  "計算幾何",
  "最適化・確率的手法",
  "情報検索・ランキング",
  "機械学習",
  "デザインパターン",
  "シミュレーション・群知能",
  "分散システム",
] as const;
