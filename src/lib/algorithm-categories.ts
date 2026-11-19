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
  {
    category: "数値計算",
    subcategories: ["求根アルゴリズム", "数値積分・微分方程式", "線形代数計算", "信号処理"],
  },
  {
    category: "コンピュータビジョン",
    subcategories: ["エッジ・特徴検出", "画像変換", "セグメンテーション・追跡", "ロバスト推定"],
  },
  {
    category: "自然言語処理",
    subcategories: ["トークン化・前処理", "系列ラベリング・構文解析", "言語モデル・分散表現", "要約・訂正"],
  },
  {
    category: "コンパイラ・構文解析",
    subcategories: ["字句解析", "構文解析", "コード生成・最適化"],
  },
  {
    category: "バイオインフォマティクス",
    subcategories: ["配列アラインメント", "系統樹・クラスタリング", "ゲノムアセンブリ", "構造予測"],
  },
  {
    category: "並行処理・並列アルゴリズム",
    subcategories: ["同期・相互排他", "並列計算パターン", "ロックフリー構造・分散協調"],
  },
  {
    category: "スケジューリング",
    subcategories: ["CPUスケジューリング", "タスク・ジョブスケジューリング", "キャッシュ置換ポリシー"],
  },
  {
    category: "制御・ロボティクス",
    subcategories: ["フィードバック制御", "状態推定", "経路計画", "姿勢・軌道生成"],
  },
  {
    category: "音響・信号処理",
    subcategories: ["音声合成・分析", "音響効果・DSP", "オーディオ圧縮・符号化"],
  },
  {
    category: "ゲーム/競技プログラミング",
    subcategories: ["競技プログラミング典型", "ゲームバランス・乱数制御"],
  },
  {
    category: "キャラクターAI・空間AI",
    subcategories: ["ビヘイビア制御", "空間認識・知覚", "群衆・マルチエージェント", "メタAI・ペーシング制御"],
  },
  {
    category: "強化学習",
    subcategories: ["価値ベース手法", "方策勾配法", "モデルベース・探索"],
  },
  {
    category: "CG・3Dレンダリング",
    subcategories: ["ジオメトリ処理", "可視性・最適化", "ライティング・シェーディング", "アニメーション"],
  },
] as const;

export const CATEGORY_ORDER = CATEGORY_TAXONOMY.map((c) => c.category);

export const SUBCATEGORIES_BY_CATEGORY: Record<string, readonly string[]> = Object.fromEntries(
  CATEGORY_TAXONOMY.map((c) => [c.category, c.subcategories]),
);

/**
 * カテゴリの大分類(カタログの左サイドバーの見出し)。29 カテゴリを 5 つにまとめ、一覧性を上げる。
 * 全カテゴリがちょうど 1 つの大分類に入る(`npm run verify:categories` が「未分類・重複・存在しないカテゴリ」を検査する)。
 * 新カテゴリを CATEGORY_TAXONOMY に足したら、ここにも 1 回だけ追記する。コンポーネント側にカテゴリ名の配列は持たない。
 * 大分類の中の並びは CATEGORY_ORDER(CATEGORY_TAXONOMY の順)に揃えて表示する。
 */
export const CATEGORY_GROUPS: { label: string; categories: string[] }[] = [
  {
    label: "基礎アルゴリズム",
    categories: [
      "ソート",
      "探索",
      "グラフ",
      "動的計画法",
      "貪欲法",
      "文字列",
      "データ構造",
      "ゲーム/競技プログラミング",
    ],
  },
  {
    label: "数理・最適化・制御",
    categories: [
      "数論・暗号",
      "計算幾何",
      "最適化・確率的手法",
      "シミュレーション・群知能",
      "数値計算",
      "制御・ロボティクス",
    ],
  },
  {
    label: "データ・AI",
    categories: [
      "情報検索・ランキング",
      "機械学習",
      "強化学習",
      "自然言語処理",
      "コンピュータビジョン",
      "バイオインフォマティクス",
    ],
  },
  {
    label: "システム・ソフトウェア",
    categories: [
      "デザインパターン",
      "分散システム",
      "コンパイラ・構文解析",
      "並行処理・並列アルゴリズム",
      "スケジューリング",
    ],
  },
  {
    label: "ゲーム・CG・メディア",
    categories: ["ゲーム", "音響・信号処理", "キャラクターAI・空間AI", "CG・3Dレンダリング"],
  },
];
