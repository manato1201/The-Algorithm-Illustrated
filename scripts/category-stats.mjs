// カテゴリ別の収録数・可視化対応数を、実データ(content/algorithms と各 *_VISUALIZERS レジストリ)から集計して
// Markdownの表として出力する。READMEのカテゴリ表を手書きの数値で古くしないための元データ生成用
// (IMPROVEMENT_PLAN_2026-10 Final Phase)。 `npm run stats:categories` で再生成できる。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORY_ORDER } from "../src/lib/algorithm-categories.ts";
import { SORT_VISUALIZERS } from "../src/lib/sort-visualizers.ts";
import { PATHFINDING_VISUALIZERS } from "../src/lib/pathfinding-visualizers.ts";
import { DP_VISUALIZERS } from "../src/lib/dp-visualizers.ts";
import { GRAPH_VISUALIZERS } from "../src/lib/graph-visualizers.ts";
import { SEARCH_VISUALIZERS } from "../src/lib/search-visualizers.ts";
import { TREE_VISUALIZERS } from "../src/lib/tree-visualizers.ts";
import { STRING_VISUALIZERS } from "../src/lib/string-visualizers.ts";
import { TRIE_VISUALIZERS } from "../src/lib/trie-visualizer.ts";
import { GEOMETRY_VISUALIZERS } from "../src/lib/geometry-visualizers.ts";
import { LANE_VISUALIZERS } from "../src/lib/lane-visualizers.ts";

// src/lib/has-visualizer.ts と同じ判定(レジストリのキーに含まれるか)。
// 新しい可視化kindを追加したら、has-visualizer.ts・algorithm-worker.ts・AlgorithmVisualizer.tsx と一緒にここにも足す。
const REGISTRIES = [
  SORT_VISUALIZERS,
  PATHFINDING_VISUALIZERS,
  DP_VISUALIZERS,
  GRAPH_VISUALIZERS,
  SEARCH_VISUALIZERS,
  TREE_VISUALIZERS,
  STRING_VISUALIZERS,
  TRIE_VISUALIZERS,
  GEOMETRY_VISUALIZERS,
  LANE_VISUALIZERS,
];
const hasVisualizer = (id) => REGISTRIES.some((registry) => id in registry);

const dir = path.join(process.cwd(), "content", "algorithms");
const stats = new Map(
  CATEGORY_ORDER.map((category) => [category, { total: 0, visualized: 0 }]),
);
let total = 0;
let visualized = 0;

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
  const entry = stats.get(data.category);
  if (!entry) continue; // カテゴリの不一致は verify:categories が検出する
  entry.total++;
  total++;
  if (hasVisualizer(id)) {
    entry.visualized++;
    visualized++;
  }
}

const percent = (part, whole) =>
  whole === 0 ? "-" : `${Math.round((part / whole) * 100)}%`;

console.log("| カテゴリ | 収録数 | 可視化対応 | 対応率 |");
console.log("| --- | ---: | ---: | ---: |");
for (const [category, { total: t, visualized: v }] of stats) {
  console.log(`| ${category} | ${t} | ${v} | ${percent(v, t)} |`);
}
console.log(
  `| **合計(${CATEGORY_ORDER.length}カテゴリ)** | **${total}** | **${visualized}** | **${percent(visualized, total)}** |`,
);
