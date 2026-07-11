export type SampleAlgorithm = {
  id: string;
  name: string;
  category: string;
  complexity: string;
  summary: string;
};

/**
 * 仮データ(プレースホルダ)。有名なものからマニアックなものまで幅広く収録。
 * 実データ・状態遷移ロジック・AST解析による複雑度判定の実装は今後のフェーズ(docs/design/ui-design.md 7節)。
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
] as const;

export const sampleAlgorithms: SampleAlgorithm[] = [
  // ソート
  {
    id: "bubble-sort",
    name: "バブルソート",
    category: "ソート",
    complexity: "O(n²)",
    summary:
      "隣接要素の比較・交換を繰り返す最も素朴な手法。仕組みの理解に最適だが実務での採用は少ない。",
  },
  {
    id: "selection-sort",
    name: "選択ソート",
    category: "ソート",
    complexity: "O(n²)",
    summary: "未整列部分から最小値を選んで確定させていく。交換回数が少なく書き込みコストが高い場面で有利。",
  },
  {
    id: "insertion-sort",
    name: "挿入ソート",
    category: "ソート",
    complexity: "O(n²)",
    summary: "整列済み部分に1つずつ挿入していく。ほぼ整列済みのデータに対しては高速に動く。",
  },
  {
    id: "merge-sort",
    name: "マージソート",
    category: "ソート",
    complexity: "O(n log n)",
    summary: "分割統治+マージで安定ソートを実現する。外部ソートや並列化と相性が良い。",
  },
  {
    id: "quick-sort",
    name: "クイックソート",
    category: "ソート",
    complexity: "O(n log n)",
    summary: "ピボットを軸に分割統治する。平均は非常に高速だが、ピボット選択次第で最悪ケースに落ち込む。",
  },
  {
    id: "heap-sort",
    name: "ヒープソート",
    category: "ソート",
    complexity: "O(n log n)",
    summary: "二分ヒープを使い、追加メモリなしで整列できる。安定性はないが最悪ケースも保証される。",
  },
  {
    id: "shell-sort",
    name: "シェルソート",
    category: "ソート",
    complexity: "O(n log n) 〜 O(n²)",
    summary: "挿入ソートを間隔を空けて繰り返し適用し、徐々に間隔を詰めていく改良版。",
  },
  {
    id: "counting-sort",
    name: "計数ソート(カウンティングソート)",
    category: "ソート",
    complexity: "O(n + k)",
    summary: "値の出現回数を数えて並べる。値域が小さい整数データに強い非比較ソート。",
  },
  {
    id: "radix-sort",
    name: "基数ソート",
    category: "ソート",
    complexity: "O(d(n + k))",
    summary: "桁ごとに安定ソートを繰り返す。整数や固定長文字列の整列に向く。",
  },
  {
    id: "bucket-sort",
    name: "バケットソート",
    category: "ソート",
    complexity: "O(n + k)",
    summary: "値域をバケットに分けて個別に整列する。一様分布のデータで威力を発揮する。",
  },
  {
    id: "tim-sort",
    name: "Timsort",
    category: "ソート",
    complexity: "O(n log n)",
    summary: "挿入ソートとマージソートを組み合わせた実用重視のハイブリッド。Python/Javaの標準ソートに採用。",
  },

  // 探索
  {
    id: "linear-search",
    name: "線形探索",
    category: "探索",
    complexity: "O(n)",
    summary: "先頭から順に調べる最も単純な探索。前処理不要でどんなデータにも使える。",
  },
  {
    id: "binary-search",
    name: "二分探索",
    category: "探索",
    complexity: "O(log n)",
    summary: "ソート済み配列を半分ずつ絞り込みながら目的の値を探す。前提条件(整列済み)が鍵。",
  },
  {
    id: "ternary-search",
    name: "三分探索",
    category: "探索",
    complexity: "O(log n)",
    summary: "単峰関数の極値探索に使う、二分探索の派生形。",
  },
  {
    id: "bfs",
    name: "幅優先探索(BFS)",
    category: "探索",
    complexity: "O(V + E)",
    summary: "近い頂点から順に探索し、重みなしグラフでの最短経路を保証する。",
  },
  {
    id: "dfs",
    name: "深さ優先探索(DFS)",
    category: "探索",
    complexity: "O(V + E)",
    summary: "行き止まりまで掘り進めてから戻る。経路の全探索や連結成分の検出に使う。",
  },
  {
    id: "a-star",
    name: "A*探索",
    category: "探索",
    complexity: "O(E)",
    summary: "ヒューリスティックで探索方向を絞り込むダイクストラ法の拡張。ゲームの経路探索の定番。",
  },
  {
    id: "iddfs",
    name: "反復深化探索(IDDFS)",
    category: "探索",
    complexity: "O(b^d)",
    summary: "深さ制限を徐々に広げるDFS。メモリ効率とBFS相当の最短性を両立する。",
  },
  {
    id: "jump-search",
    name: "ジャンプ探索",
    category: "探索",
    complexity: "O(√n)",
    summary: "一定間隔で飛び飛びに調べてから線形探索する。ジャンプコストが低い環境で二分探索より有利な場合がある。",
  },

  // グラフ
  {
    id: "dijkstra",
    name: "ダイクストラ法",
    category: "グラフ",
    complexity: "O((V + E) log V)",
    summary: "重み付きグラフの最短経路を、確定済み頂点を1つずつ広げながら求める。負の辺には非対応。",
  },
  {
    id: "bellman-ford",
    name: "ベルマン・フォード法",
    category: "グラフ",
    complexity: "O(VE)",
    summary: "負の辺を許容する最短経路法。負閉路の検出にも使える。",
  },
  {
    id: "floyd-warshall",
    name: "フロイド・ワーシャル法",
    category: "グラフ",
    complexity: "O(V³)",
    summary: "全点対の最短経路を動的計画法で一括に求める。",
  },
  {
    id: "prim",
    name: "プリム法",
    category: "グラフ",
    complexity: "O(E log V)",
    summary: "頂点を1つずつ広げながら最小全域木を構築する。",
  },
  {
    id: "kruskal",
    name: "クラスカル法",
    category: "グラフ",
    complexity: "O(E log E)",
    summary: "辺をコストの小さい順に採用し、Union-Findで閉路を避けながら最小全域木を作る。",
  },
  {
    id: "topological-sort",
    name: "トポロジカルソート",
    category: "グラフ",
    complexity: "O(V + E)",
    summary: "依存関係のあるタスクを実行可能な順序に並べる。DAG(有向非巡回グラフ)にのみ適用できる。",
  },
  {
    id: "tarjan-scc",
    name: "タージャンの強連結成分分解",
    category: "グラフ",
    complexity: "O(V + E)",
    summary: "1回のDFSで有向グラフの強連結成分をすべて求める。",
  },
  {
    id: "union-find",
    name: "Union-Find(素集合データ構造)",
    category: "グラフ",
    complexity: "O(α(n))(ほぼ定数)",
    summary: "グループの併合と所属判定をほぼ定数時間で行う。クラスカル法の内部でも活躍する。",
  },
  {
    id: "ford-fulkerson",
    name: "フォード・ファルカーソン法",
    category: "グラフ",
    complexity: "O(E・maxflow)",
    summary: "増加パスを探し続けて最大フローを求める。増加パスの選び方で性能が大きく変わる。",
  },
  {
    id: "edmonds-karp",
    name: "エドモンズ・カープ法",
    category: "グラフ",
    complexity: "O(VE²)",
    summary: "フォード・ファルカーソン法の増加パスをBFSで選ぶことで計算量を保証した版。",
  },
  {
    id: "hopcroft-karp",
    name: "ホップクロフト・カープ法",
    category: "グラフ",
    complexity: "O(E√V)",
    summary: "二部グラフの最大マッチングを高速に求める。",
  },
  {
    id: "johnson",
    name: "ジョンソンのアルゴリズム",
    category: "グラフ",
    complexity: "O(V² log V + VE)",
    summary: "負の辺を再重み付けしてから全点対最短経路を高速に解く。",
  },
  {
    id: "dinic",
    name: "ディニッツ法",
    category: "グラフ",
    complexity: "O(V²E)",
    summary: "レベルグラフとブロッキングフローを使い、最大フローを高速に求める。",
  },

  // 動的計画法
  {
    id: "knapsack-dp",
    name: "0-1ナップサック問題",
    category: "動的計画法",
    complexity: "O(nW)",
    summary: "部分問題の解を表に記録し、重複計算を避けながら最適な詰め方を組み立てる。",
  },
  {
    id: "lcs",
    name: "最長共通部分列(LCS)",
    category: "動的計画法",
    complexity: "O(nm)",
    summary: "2つの列に共通する最長の並びを求める。差分表示(diff)の基礎理論。",
  },
  {
    id: "lis",
    name: "最長増加部分列(LIS)",
    category: "動的計画法",
    complexity: "O(n log n)",
    summary: "二分探索を併用することで、素朴なO(n²)から高速化できる典型例。",
  },
  {
    id: "edit-distance",
    name: "編集距離(レーベンシュタイン距離)",
    category: "動的計画法",
    complexity: "O(nm)",
    summary: "挿入・削除・置換の最小回数で2つの文字列の近さを測る。",
  },
  {
    id: "matrix-chain-multiplication",
    name: "行列連鎖積(区間DP)",
    category: "動的計画法",
    complexity: "O(n³)",
    summary: "行列の掛け算の順序を工夫することで、総計算量を最小化する。",
  },
  {
    id: "tsp-bitdp",
    name: "巡回セールスマン問題(ビットDP)",
    category: "動的計画法",
    complexity: "O(2ⁿ・n²)",
    summary: "訪問済み集合をビットで表現し状態数を抑える、古典的なDP高速化テクニック。",
  },

  // 貪欲法
  {
    id: "huffman-coding",
    name: "ハフマン符号化",
    category: "貪欲法",
    complexity: "O(n log n)",
    summary: "出現頻度の低い記号ほど長い符号を割り当て、全体の符号長を最小化する。",
  },
  {
    id: "interval-scheduling",
    name: "区間スケジューリング問題",
    category: "貪欲法",
    complexity: "O(n log n)",
    summary: "終了時刻の早い順に選ぶ貪欲法で、両立可能な区間の最大数を求められることを証明できる好例。",
  },
  {
    id: "kadane",
    name: "カダンのアルゴリズム(最大部分配列問題)",
    category: "貪欲法",
    complexity: "O(n)",
    summary: "局所最適な部分和を更新し続けるだけで全体最適に到達する、貪欲法とDPの境界にある手法。",
  },

  // 文字列
  {
    id: "kmp",
    name: "KMP法(Knuth-Morris-Pratt法)",
    category: "文字列",
    complexity: "O(n + m)",
    summary: "不一致時に照合済み情報を使い、パターンを後戻りさせずに文字列検索する。",
  },
  {
    id: "boyer-moore",
    name: "Boyer-Moore法",
    category: "文字列",
    complexity: "O(n/m) 〜 O(nm)",
    summary: "パターンの末尾から比較し、大きくスキップすることで実用上高速な文字列検索を実現する。",
  },
  {
    id: "rabin-karp",
    name: "Rabin-Karp法",
    category: "文字列",
    complexity: "O(n + m)",
    summary: "ハッシュ値の比較で候補を絞り込む文字列検索。複数パターンの同時検索に強い。",
  },
  {
    id: "z-algorithm",
    name: "Z algorithm",
    category: "文字列",
    complexity: "O(n)",
    summary: "各位置から始まる接頭辞との一致長を、線形時間ですべて求める。",
  },
  {
    id: "manacher",
    name: "Manacherのアルゴリズム",
    category: "文字列",
    complexity: "O(n)",
    summary: "すべての中心について最長回文半径を線形時間で求める。",
  },
  {
    id: "aho-corasick",
    name: "Aho-Corasick法",
    category: "文字列",
    complexity: "O(n + m + z)",
    summary: "複数パターンを1本のオートマトンにまとめ、テキストを1回走査するだけで全パターンを検出する。",
  },
  {
    id: "suffix-array",
    name: "接尾辞配列(Suffix Array)",
    category: "文字列",
    complexity: "O(n log n)",
    summary: "全ての接尾辞をソートした配列。文字列検索や最長共通部分文字列の土台になる。",
  },

  // データ構造
  {
    id: "binary-search-tree",
    name: "二分探索木",
    category: "データ構造",
    complexity: "O(log n) 〜 O(n)",
    summary: "左小右大の性質で探索・挿入・削除をこなす。偏ると性能が線形に劣化する弱点を持つ。",
  },
  {
    id: "red-black-tree",
    name: "赤黒木",
    category: "データ構造",
    complexity: "O(log n)",
    summary: "色と回転規則で自己平衡を保つ二分探索木。多くの言語の標準ライブラリの内部実装に採用されている。",
  },
  {
    id: "segment-tree",
    name: "セグメント木",
    category: "データ構造",
    complexity: "O(log n)",
    summary: "区間に対する演算(和・最小値など)を高速に更新・照会できる木構造。",
  },
  {
    id: "fenwick-tree",
    name: "フェニック木(Binary Indexed Tree)",
    category: "データ構造",
    complexity: "O(log n)",
    summary: "累積和の更新・照会を、セグメント木よりも省メモリ・省コードで実現する。",
  },
  {
    id: "trie",
    name: "トライ木",
    category: "データ構造",
    complexity: "O(文字数)",
    summary: "共通の接頭辞を共有して文字列集合を格納する木。前方一致検索や入力補完に向く。",
  },
  {
    id: "bloom-filter",
    name: "ブルームフィルタ",
    category: "データ構造",
    complexity: "O(k)",
    summary: "偽陽性を許容する代わりに、極めて省メモリで「集合に含まれるか」を判定する確率的データ構造。",
  },
  {
    id: "skip-list",
    name: "スキップリスト",
    category: "データ構造",
    complexity: "O(log n)(期待値)",
    summary: "複数階層のリンクリストで、平衡木に近い性能を乱数だけで実現する。",
  },
  {
    id: "lru-cache",
    name: "LRUキャッシュ",
    category: "データ構造",
    complexity: "O(1)",
    summary: "ハッシュマップと双方向リストを組み合わせ、最も使われていないデータを定数時間で追い出す。",
  },

  // 数論・暗号
  {
    id: "euclidean-algorithm",
    name: "ユークリッドの互除法",
    category: "数論・暗号",
    complexity: "O(log min(a,b))",
    summary: "剰余を取り続けるだけで最大公約数を求める、現存する最古級のアルゴリズムの一つ。",
  },
  {
    id: "extended-euclidean",
    name: "拡張ユークリッドの互除法",
    category: "数論・暗号",
    complexity: "O(log min(a,b))",
    summary: "最大公約数に加え、ax + by = gcd(a,b) を満たす係数まで同時に求める。",
  },
  {
    id: "sieve-of-eratosthenes",
    name: "エラトステネスの篩",
    category: "数論・暗号",
    complexity: "O(n log log n)",
    summary: "合成数を篩い落としていくことで、ある範囲の素数を一括で列挙する。",
  },
  {
    id: "miller-rabin",
    name: "ミラー・ラビン素数判定法",
    category: "数論・暗号",
    complexity: "O(k log³ n)",
    summary: "確率的に大きな数の素数判定を行う。RSA暗号の鍵生成などで実用される。",
  },
  {
    id: "fft",
    name: "高速フーリエ変換(FFT)",
    category: "数論・暗号",
    complexity: "O(n log n)",
    summary: "多項式乗算や信号処理を、素朴なO(n²)から劇的に高速化する分割統治アルゴリズム。",
  },
  {
    id: "karatsuba",
    name: "カラツバ法",
    category: "数論・暗号",
    complexity: "O(n^1.585)",
    summary: "大きな数の掛け算を3回の乗算に分割統治することで、筆算より高速化する。",
  },
  {
    id: "rsa",
    name: "RSA暗号",
    category: "数論・暗号",
    complexity: "O(log n)(べき乗剰余)",
    summary: "素因数分解の困難さを安全性の根拠にした公開鍵暗号。べき乗剰余の高速計算が実装の要。",
  },

  // 計算幾何
  {
    id: "graham-scan",
    name: "凸包(グラハムスキャン)",
    category: "計算幾何",
    complexity: "O(n log n)",
    summary: "点群を角度順にソートしてスタックで包んでいく、凸包を求める代表的手法。",
  },
  {
    id: "line-sweep-intersection",
    name: "線分交差判定(走査線法)",
    category: "計算幾何",
    complexity: "O(n log n)",
    summary: "平面を掃くように処理することで、素朴なO(n²)の全探索を避ける計算幾何の基本テクニック。",
  },

  // 最適化・確率的手法
  {
    id: "simulated-annealing",
    name: "焼きなまし法(シミュレーテッド・アニーリング)",
    category: "最適化・確率的手法",
    complexity: "O(問題依存)",
    summary: "温度を下げながら悪化する解も確率的に受け入れ、局所最適から脱出する近似解法。",
  },
  {
    id: "genetic-algorithm",
    name: "遺伝的アルゴリズム",
    category: "最適化・確率的手法",
    complexity: "O(問題依存)",
    summary: "選択・交叉・突然変異を模した確率的探索で、厳密解が難しい問題の近似解を探る。",
  },
  {
    id: "monte-carlo",
    name: "モンテカルロ法",
    category: "最適化・確率的手法",
    complexity: "O(問題依存)",
    summary: "乱数を大量に用いたサンプリングで、解析的に解きにくい問題を確率的に近似する。",
  },
];
