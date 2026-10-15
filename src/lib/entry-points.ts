/**
 * トップの入口の段分け(IMPROVEMENT_DESIGN_2026-10 T5): 「まずはここから」と「用途から」。
 * idは content/algorithms/<id>.md と一致させる。存在しないidはビルド時(app/page.tsx)に例外にして、
 * 入口にリンク切れが混ざらないようにする。
 */
export const START_HERE_IDS: readonly string[] = [
  "linear-search",
  "binary-search",
  "bubble-sort",
  "insertion-sort",
  "merge-sort",
  "quick-sort",
  "bfs",
  "dfs",
];

export const USE_CASE_GROUPS: readonly { label: string; ids: readonly string[] }[] = [
  { label: "並べ替えたい", ids: ["insertion-sort", "merge-sort", "quick-sort"] },
  { label: "最短の道を探したい", ids: ["bfs", "dijkstra", "a-star"] },
  { label: "文字列を探したい", ids: ["kmp"] },
  { label: "文章を検索・順位づけしたい", ids: ["tf-idf", "bm25", "pagerank"] },
  { label: "暗号・安全な通信を知りたい", ids: ["diffie-hellman", "rsa"] },
  { label: "データを小さくしたい", ids: ["huffman-coding"] },
  { label: "最適な組み合わせを探したい", ids: ["knapsack-dp", "genetic-algorithm", "simulated-annealing"] },
  { label: "ゲームのAI・地形づくり", ids: ["minimax", "monte-carlo-tree-search", "perlin-noise", "wave-function-collapse"] },
  { label: "画像から輪郭を取りたい", ids: ["sobel-filter", "canny-edge-detection"] },
  { label: "複数のサーバーで合意したい", ids: ["paxos", "raft"] },
  { label: "データから学習させたい", ids: ["k-means", "q-learning"] },
];
