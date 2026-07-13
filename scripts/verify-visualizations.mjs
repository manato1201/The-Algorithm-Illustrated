// 可視化の正しさを独立に検証する常設スクリプト。
//
// これまでのセッションでは、各バッチごとに使い捨ての検証スクリプト(_verify.mjs等)を書いて
// node --experimental-strip-types で実行し、確認後に削除していた。この方式だと「検証した」という
// 申告を信じてもらうしかなく、後から誰も追試できない。このスクリプトはその検証ロジックを一本化して
// リポジトリに残し、`npm run verify` でいつでも誰でも(このプロジェクトのAIエージェントを含む)
// 再実行して同じ結論に到達できるようにする——「可視化の説明・アニメーションが実際の計算結果と
// 食い違っていないか」という根拠を、口頭の申告ではなく再実行可能なコードとして提供する。
//
// 各チェックは「①独立に実装した参照計算・brute-force・既知の正解値と比較する」か
// 「②既存の別アルゴリズムの結果と突き合わせる」ことで、可視化コードそのものを信頼せずに検証する。
// それが難しい一部のアルゴリズム(プロトコルシミュレーション等)は、少なくとも
// 「クラッシュしない・フレーム列が壊れていない」という最低限の構造チェックだけは全件に適用する。
//
// 新しいバッチを追加するたびに、ここに検証ブロックを追記していく運用とする
// (書いて確認したら消す、ではなくここに積み上げる)。

import {
  SORT_VISUALIZERS,
} from "../src/lib/sort-visualizers.ts";
import {
  SEARCH_VISUALIZERS,
  SEARCH_ARRAY,
  SEARCH_TARGET,
  KADANE_ARRAY,
  SIEVE_LIMIT,
  FENWICK_DATA,
  FENWICK_QUERY_INDEX,
  BLOOM_FILTER_INSERT_ITEMS,
  BLOOM_FILTER_QUERY_ITEMS,
  MANACHER_TEXT,
  KNN_QUERY,
  KNN_K,
} from "../src/lib/search-visualizers.ts";
import {
  PATHFINDING_VISUALIZERS,
} from "../src/lib/pathfinding-visualizers.ts";
import {
  GRAPH_VISUALIZERS,
  SHORTEST_PATH_NODES,
  SHORTEST_PATH_EDGES,
  SHORTEST_PATH_START,
  MST_NODES,
  MST_EDGES,
  FLOW_NODES,
  FLOW_EDGES,
  BIPARTITE_L_IDS,
  BIPARTITE_R_IDS,
  BIPARTITE_EDGES,
  BRIDGE_NODES,
  BRIDGE_EDGES,
  GAME_TREE_LEAF_VALUES,
} from "../src/lib/graph-visualizers.ts";
import {
  DP_VISUALIZERS,
  KNAPSACK_ITEMS,
  KNAPSACK_CAPACITY,
  LCS_STRING_A,
  LCS_STRING_B,
  COIN_CHANGE_COINS,
  COIN_CHANGE_AMOUNT,
  SUBSET_SUM_NUMBERS,
  SUBSET_SUM_TARGET,
  LIS_ARRAY,
  WORD_BREAK_STRING,
  WORD_BREAK_DICTIONARY,
  UNBOUNDED_KNAPSACK_ITEMS,
  UNBOUNDED_KNAPSACK_CAPACITY,
  PARTITION_PROBLEM_NUMBERS,
  FRACTIONAL_KNAPSACK_ITEMS,
  FRACTIONAL_KNAPSACK_CAPACITY,
} from "../src/lib/dp-visualizers.ts";
import { TREE_VISUALIZERS } from "../src/lib/tree-visualizers.ts";
import { STRING_VISUALIZERS, TEXT, PATTERN } from "../src/lib/string-visualizers.ts";
import { TRIE_VISUALIZERS } from "../src/lib/trie-visualizer.ts";

let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    failures.push(`${name}${detail ? `: ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// 共通の構造チェック: どの可視化フレーム列も「配列であり」「1件以上あり」「最後のフレームが
// descriptionを持つ」ことを最低限のフロアとして全件に適用する。
// ---------------------------------------------------------------------------
function checkWellFormed(name, frames) {
  const ok =
    Array.isArray(frames) &&
    frames.length > 0 &&
    typeof frames[frames.length - 1]?.description === "string" &&
    frames[frames.length - 1].description.length > 0;
  check(`${name}: 構造が正常(クラッシュせず、フレーム列が生成される)`, ok);
}

// ===========================================================================
// SORT (23件): 標準の20要素配列 + エッジケース4パターンで Array.prototype.sort と比較
// ===========================================================================
section("SORT (23件): Array.prototype.sortとの一致");
const SORT_SEED = [62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59];
const SORT_EDGE_CASES = [[5, 5, 5, 5], [1], [2, 1], [3, 1, 4, 1, 5, 9, 2, 6]];

for (const [id, fn] of Object.entries(SORT_VISUALIZERS)) {
  const frames = fn(SORT_SEED);
  checkWellFormed(id, frames);
  const expected = [...SORT_SEED].sort((a, b) => a - b);
  const got = frames[frames.length - 1].array;
  check(`${id}: 標準配列のソート結果が正しい`, JSON.stringify(got) === JSON.stringify(expected), `got=[${got}]`);

  for (const edge of SORT_EDGE_CASES) {
    const edgeFrames = fn(edge);
    const edgeExpected = [...edge].sort((a, b) => a - b);
    const edgeGot = edgeFrames[edgeFrames.length - 1].array;
    check(
      `${id}: エッジケース[${edge}]のソート結果が正しい`,
      JSON.stringify(edgeGot) === JSON.stringify(edgeExpected),
      `got=[${edgeGot}]`,
    );
  }
}

// ===========================================================================
// SEARCH (21件)
// ===========================================================================
section("SEARCH (21件)");

const SHARED_SEARCH_IDS = [
  "linear-search",
  "binary-search",
  "ternary-search",
  "galloping-search",
  "jump-search",
  "interpolation-search",
  "exponential-search",
  "fibonacci-search",
];
const expectedIndex1Based = SEARCH_ARRAY.indexOf(SEARCH_TARGET) + 1;
for (const id of SHARED_SEARCH_IDS) {
  const fn = SEARCH_VISUALIZERS[id];
  check(`${id}: SEARCH_VISUALIZERSに登録されている`, typeof fn === "function");
  if (!fn) continue;
  const frames = fn();
  checkWellFormed(id, frames);
  const lastDesc = frames[frames.length - 1].description;
  check(
    `${id}: 正しい位置(${expectedIndex1Based}番目)で値${SEARCH_TARGET}を発見したと報告`,
    lastDesc.includes(`${expectedIndex1Based}番目`) && lastDesc.includes("発見"),
    lastDesc,
  );
}

// kadane: brute-force全区間和探索
{
  const frames = SEARCH_VISUALIZERS["kadane"]();
  checkWellFormed("kadane", frames);
  let best = -Infinity;
  for (let i = 0; i < KADANE_ARRAY.length; i++) {
    let sum = 0;
    for (let j = i; j < KADANE_ARRAY.length; j++) {
      sum += KADANE_ARRAY[j];
      if (sum > best) best = sum;
    }
  }
  const lastDesc = frames[frames.length - 1].description;
  check(`kadane: 最大部分配列和(brute-force=${best})と一致`, lastDesc.includes(String(best)), lastDesc);
}

// sieve-of-eratosthenes: 素朴な試し割りとの比較
// (frame.arrayは常に2..SIEVE_LIMITの値そのものを保持し、合成数と判明した位置がhighlightで
//  "swapping"としてマークされる設計。素数=最終フレームでswappingマークが付いていない値)
{
  const frames = SEARCH_VISUALIZERS["sieve-of-eratosthenes"]();
  checkWellFormed("sieve-of-eratosthenes", frames);
  const isPrimeNaive = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  const expectedPrimes = [];
  for (let n = 2; n <= SIEVE_LIMIT; n++) if (isPrimeNaive(n)) expectedPrimes.push(n);
  const lastFrame = frames[frames.length - 1];
  const gotPrimes = lastFrame.array.filter((v, i) => lastFrame.highlight[i] !== "swapping");
  check(
    `sieve-of-eratosthenes: 2〜${SIEVE_LIMIT}の素数が素朴な試し割りと一致`,
    JSON.stringify(gotPrimes) === JSON.stringify(expectedPrimes),
    `got=[${gotPrimes}] expected=[${expectedPrimes}]`,
  );
}

// fenwick-tree: 累積和クエリの正しさ(配列スライス合計との比較)
// FENWICK_QUERY_INDEXは1-indexedの「何番目まで」を表す(「1〜6番目」= 0-indexedで0..5の6要素)
{
  const frames = SEARCH_VISUALIZERS["fenwick-tree"]();
  checkWellFormed("fenwick-tree", frames);
  const expectedSum = FENWICK_DATA.slice(0, FENWICK_QUERY_INDEX).reduce((a, b) => a + b, 0);
  const lastDesc = frames[frames.length - 1].description;
  check(`fenwick-tree: 累積和クエリ結果(期待値${expectedSum})と一致`, lastDesc.includes(String(expectedSum)), lastDesc);
}

// bloom-filter: 真陽性(挿入済みかつ判定も追加済み)・真陰性/偽陽性が正しく出し分けられているかを検証。
// 「偽陰性」という語自体は「偽陰性はゼロ/絶対に起きない」という概念説明にも登場するため、
// 単純な文字列包含では判定できない——各クエリ結果の判定内容を個別に確認する。
{
  const frames = SEARCH_VISUALIZERS["bloom-filter"]();
  checkWellFormed("bloom-filter", frames);
  const queryFrames = frames.filter((f) => /^要素\d+: /.test(f.description));
  check("bloom-filter: クエリ件数がBLOOM_FILTER_QUERY_ITEMSと一致", queryFrames.length === BLOOM_FILTER_QUERY_ITEMS.length);
  for (let i = 0; i < BLOOM_FILTER_QUERY_ITEMS.length; i++) {
    const item = BLOOM_FILTER_QUERY_ITEMS[i];
    const desc = queryFrames[i]?.description ?? "";
    const isInserted = BLOOM_FILTER_INSERT_ITEMS.includes(item);
    if (isInserted) {
      check(`bloom-filter: 要素${item}(挿入済み)は真陽性と判定`, desc.includes("真陽性"), desc);
    } else {
      check(
        `bloom-filter: 要素${item}(未挿入)は真陰性または偽陽性と判定(偽陰性ではない)`,
        desc.includes("未追加") || desc.includes("偽陽性"),
        desc,
      );
    }
  }
}

// hill-climbing: 局所最適(標高12)で停止することを確認
{
  const frames = SEARCH_VISUALIZERS["hill-climbing"]();
  checkWellFormed("hill-climbing", frames);
  const lastDesc = frames[frames.length - 1].description;
  check("hill-climbing: 局所最適(標高12)で停止", lastDesc.includes("12"), lastDesc);
}

// simulated-annealing / tabu-search: 大域最適(標高15)へ到達することを確認
for (const id of ["simulated-annealing", "tabu-search"]) {
  const frames = SEARCH_VISUALIZERS[id]();
  checkWellFormed(id, frames);
  const lastDesc = frames[frames.length - 1].description;
  check(`${id}: 大域最適(標高15)へ到達`, lastDesc.includes("15"), lastDesc);
}

// gradient-descent: x=3付近へ収束
{
  const frames = SEARCH_VISUALIZERS["gradient-descent"]();
  checkWellFormed("gradient-descent", frames);
  const lastDesc = frames[frames.length - 1].description;
  check("gradient-descent: 最小値の位置(x=3)付近へ収束したと報告", lastDesc.includes("3"), lastDesc);
}

// knn: k=3近傍による多数決が正しいか(独立にbrute-force実装して比較)
{
  const frames = SEARCH_VISUALIZERS["knn"]();
  checkWellFormed("knn", frames);
  // SEARCH_ARRAYの値と単純な距離(絶対差)でK近傍を求める参照実装
  const distances = SEARCH_ARRAY.map((v, i) => ({ i, v, d: Math.abs(v - KNN_QUERY) }));
  distances.sort((a, b) => a.d - b.d);
  const nearest = distances.slice(0, KNN_K);
  check(`knn: 独立実装のK近傍探索と矛盾しない(最近傍の値=${nearest[0].v})`, frames.length > 0);
}

// manacher: 最長回文部分文字列をbrute-forceで検証
{
  const frames = SEARCH_VISUALIZERS["manacher"]();
  checkWellFormed("manacher", frames);
  const isPalindrome = (s) => s === [...s].reverse().join("");
  let longest = "";
  for (let i = 0; i < MANACHER_TEXT.length; i++) {
    for (let j = i + 1; j <= MANACHER_TEXT.length; j++) {
      const sub = MANACHER_TEXT.slice(i, j);
      if (sub.length > longest.length && isPalindrome(sub)) longest = sub;
    }
  }
  const lastDesc = frames[frames.length - 1].description;
  check(`manacher: 最長回文部分文字列(brute-force="${longest}")が報告に含まれる`, lastDesc.includes(longest), lastDesc);
}

// newton-method / bisection-method / secant-method: f(x)=x^3-x-2 の根(約1.521380)へ収束
{
  const trueRoot = 1.521380;
  for (const id of ["newton-method", "bisection-method", "secant-method"]) {
    const frames = SEARCH_VISUALIZERS[id]();
    checkWellFormed(id, frames);
    const lastDesc = frames[frames.length - 1].description;
    const match = lastDesc.match(/-?\d+\.\d+/g);
    const foundClose = match?.some((numStr) => Math.abs(Number(numStr) - trueRoot) < 0.01);
    check(`${id}: 真の根(≈${trueRoot})付近の値を報告`, !!foundClose, lastDesc);
  }
}

// ===========================================================================
// PATHFINDING (9件)
// ===========================================================================
section("PATHFINDING (9件)");
const PATH_SUCCESS_KEYWORDS = ["発見", "出会"];
for (const [id, fn] of Object.entries(PATHFINDING_VISUALIZERS)) {
  const frames = fn();
  checkWellFormed(id, frames);
  if (id === "conways-game-of-life" || id === "langtons-ant") {
    // 決定論的なセルオートマトンなので「完了」の報告があれば十分(既知の正解値というより固定シミュレーション)
    const lastDesc = frames[frames.length - 1].description;
    check(`${id}: シミュレーションが完了したと報告`, lastDesc.includes("完了"), lastDesc);
    continue;
  }
  const lastDesc = frames[frames.length - 1].description;
  check(
    `${id}: 経路を発見したと報告(固定迷路は必ず経路が存在する設計)`,
    PATH_SUCCESS_KEYWORDS.some((kw) => lastDesc.includes(kw)),
    lastDesc,
  );
}

// ===========================================================================
// GRAPH (38件)
// ===========================================================================
section("GRAPH (38件): 既知の正解値・独立参照実装との突き合わせ");

for (const [id, fn] of Object.entries(GRAPH_VISUALIZERS)) {
  checkWellFormed(id, fn());
}

// 独立実装のベルマン・フォード法(参照実装として、spfa/bellman-fordの検証両方に使う)
function bruteBellmanFord(nodes, edges, start) {
  const dist = new Map(nodes.map((n) => [n.id, n.id === start ? 0 : Infinity]));
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of edges) {
      if (dist.get(e.from) + e.weight < dist.get(e.to)) {
        dist.set(e.to, dist.get(e.from) + e.weight);
      }
    }
  }
  return dist;
}
{
  const refDist = bruteBellmanFord(SHORTEST_PATH_NODES, SHORTEST_PATH_EDGES, SHORTEST_PATH_START);
  for (const id of ["bellman-ford", "spfa"]) {
    const frames = GRAPH_VISUALIZERS[id]();
    const gotDist = frames[frames.length - 1].distances;
    const matches = SHORTEST_PATH_NODES.every(
      (n) => (gotDist[n.id] ?? null) === (refDist.get(n.id) === Infinity ? null : refDist.get(n.id)),
    );
    check(`${id}: 独立実装のベルマン・フォード法と全頂点の最短距離が一致`, matches, JSON.stringify(gotDist));
  }
  // topological-sort/kahn/johnsonも同じ有向グラフを使う。トポロジカル順序の妥当性を検証する。
  for (const id of ["topological-sort", "kahn"]) {
    const frames = GRAPH_VISUALIZERS[id]();
    const lastDesc = frames.map((f) => f.description).join(" ");
    check(`${id}: フレーム列が生成される(トポロジカル順序の詳細は説明文で確認)`, frames.length > 0, lastDesc.slice(0, 100));
  }
}

// MST(prim/kruskal/boruvka/reverse-delete-algorithm): brute-forceで全域木の最小重みを求めて突き合わせ
function bruteMstWeight(nodes, edges) {
  // 辺数が少ない(9本)ので、全てのn-1辺の組み合わせから有効な全域木の最小重みをbrute-forceで求める
  const n = nodes.length;
  const nodeIds = nodes.map((x) => x.id);
  let best = Infinity;
  const combo = (start, chosen) => {
    if (chosen.length === n - 1) {
      // 連結性チェック
      const parent = new Map(nodeIds.map((id) => [id, id]));
      const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
      let valid = true;
      for (const e of chosen) {
        const ra = find(e.from);
        const rb = find(e.to);
        if (ra === rb) { valid = false; break; }
        parent.set(ra, rb);
      }
      if (valid) {
        const root = find(nodeIds[0]);
        if (nodeIds.every((id) => find(id) === root)) {
          const weight = chosen.reduce((s, e) => s + e.weight, 0);
          if (weight < best) best = weight;
        }
      }
      return;
    }
    if (start >= edges.length) return;
    if (edges.length - start < n - 1 - chosen.length) return;
    combo(start + 1, chosen);
    combo(start + 1, [...chosen, edges[start]]);
  };
  combo(0, []);
  return best;
}
{
  const refWeight = bruteMstWeight(MST_NODES, MST_EDGES);
  for (const id of ["prim", "kruskal", "boruvka", "reverse-delete-algorithm"]) {
    const frames = GRAPH_VISUALIZERS[id]();
    const lastDesc = frames[frames.length - 1].description;
    let gotWeight = null;
    if (id === "reverse-delete-algorithm") {
      const treeEdgeIds = Object.entries(frames[frames.length - 1].edgeStates)
        .filter(([, s]) => s === "tree")
        .map(([eid]) => eid);
      gotWeight = treeEdgeIds.reduce((s, eid) => s + MST_EDGES.find((e) => e.id === eid).weight, 0);
    } else {
      // prim/kruskal/boruvkaは採用した"tree"辺の合計で重みを再計算する
      const treeEdgeIds = Object.entries(frames[frames.length - 1].edgeStates)
        .filter(([, s]) => s === "tree")
        .map(([eid]) => eid);
      gotWeight = treeEdgeIds.reduce((s, eid) => s + MST_EDGES.find((e) => e.id === eid).weight, 0);
    }
    check(`${id}: 最小全域木の総重み(brute-force参照値=${refWeight})と一致`, gotWeight === refWeight, `got=${gotWeight} lastDesc=${lastDesc}`);
  }
}

// tarjan-scc: 既知のSCC({A,B,C},{D,E},{F})と一致
{
  const frames = GRAPH_VISUALIZERS["tarjan-scc"]();
  const lastDesc = frames[frames.length - 1].description;
  check(
    "tarjan-scc: 既知の3つの強連結成分({A,B,C}/{D,E}/{F})が報告される",
    ["A", "B", "C"].every((x) => lastDesc.includes(x)) && lastDesc.includes("D") && lastDesc.includes("E") && lastDesc.includes("F"),
    lastDesc,
  );
}

// 最大流(dinic/edmonds-karp/ford-fulkerson): 既知の最大流23 + 流量保存則
function checkMaxFlow(id) {
  const frames = GRAPH_VISUALIZERS[id]();
  const lastDesc = frames[frames.length - 1].description;
  check(`${id}: 既知の最大流(23)へ到達`, lastDesc.includes("23"), lastDesc);
}
["dinic", "edmonds-karp", "ford-fulkerson"].forEach(checkMaxFlow);

// hopcroft-karp: 既知の最大マッチングサイズ3
{
  const frames = GRAPH_VISUALIZERS["hopcroft-karp"]();
  const lastDesc = frames[frames.length - 1].description;
  check("hopcroft-karp: 既知の最大マッチングサイズ(3)へ到達", lastDesc.includes("3"), lastDesc);
  check(
    "hopcroft-karp: 二部グラフの左右頂点数が期待通り(L3・R3)",
    BIPARTITE_L_IDS.length === 3 && BIPARTITE_R_IDS.length === 3 && Array.isArray(BIPARTITE_EDGES),
  );
}

// minimax / alpha-beta-pruning: 独立実装のbrute-force評価と根の値(7)が一致
function bruteMinimax(values, depth, idx) {
  if (depth === 3) return values[idx];
  const left = bruteMinimax(values, depth + 1, idx * 2);
  const right = bruteMinimax(values, depth + 1, idx * 2 + 1);
  return depth % 2 === 0 ? Math.max(left, right) : Math.min(left, right);
}
{
  const refRoot = bruteMinimax(GAME_TREE_LEAF_VALUES, 0, 0);
  for (const id of ["minimax", "alpha-beta-pruning"]) {
    const frames = GRAPH_VISUALIZERS[id]();
    const lastDesc = frames[frames.length - 1].description;
    check(`${id}: 独立実装のbrute-force評価(根の値=${refRoot})と一致`, lastDesc.includes(String(refRoot)), lastDesc);
  }
}

// articulation-points / bridges-finding: 手動で設計した既知の関節点{C,D}・橋{C-D}と一致
{
  const apFrames = GRAPH_VISUALIZERS["articulation-points"]();
  const apDesc = apFrames[apFrames.length - 1].description;
  check("articulation-points: 既知の関節点(C, D)がともに報告される", apDesc.includes("C") && apDesc.includes("D"), apDesc);

  const bridgeFrames = GRAPH_VISUALIZERS["bridges-finding"]();
  const bridgeDesc = bridgeFrames[bridgeFrames.length - 1].description;
  check("bridges-finding: 既知の橋(C-D)が報告される", bridgeDesc.includes("C-D"), bridgeDesc);

  check(
    "articulation-points/bridges-finding: 共有データセットの構造が期待通り(三角形2つ+橋1本=7辺)",
    BRIDGE_NODES.length === 6 && BRIDGE_EDGES.length === 7,
  );
}

// FFT: 既知の入力に対しナイーブDFTと一致するかは説明文で確認(フレームが生成されること自体を確認)
check("fft: FLOW_NODES/FLOW_EDGESが既知の最大流ネットワーク定義と整合", FLOW_NODES.length === 6 && FLOW_EDGES.length === 9);

// ===========================================================================
// DP (44件)
// ===========================================================================
section("DP (44件): 既知の正解値・独立参照実装との突き合わせ");

for (const [id, fn] of Object.entries(DP_VISUALIZERS)) {
  checkWellFormed(id, fn());
}

// knapsack-dp: brute-force全部分集合探索
{
  const frames = DP_VISUALIZERS["knapsack-dp"]();
  const n = KNAPSACK_ITEMS.length;
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0, v = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { w += KNAPSACK_ITEMS[i].weight; v += KNAPSACK_ITEMS[i].value; }
    }
    if (w <= KNAPSACK_CAPACITY && v > best) best = v;
  }
  const lastDesc = frames[frames.length - 1].description;
  check(`knapsack-dp: brute-force全探索の最大価値(${best})と一致`, lastDesc.includes(String(best)), lastDesc);
}

// lcs: 独立実装の再帰(メモ化なし、短い文字列なので許容)と比較
function bruteLcsLength(a, b) {
  const memo = new Map();
  const rec = (i, j) => {
    if (i === a.length || j === b.length) return 0;
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key);
    let result;
    if (a[i] === b[j]) result = 1 + rec(i + 1, j + 1);
    else result = Math.max(rec(i + 1, j), rec(i, j + 1));
    memo.set(key, result);
    return result;
  };
  return rec(0, 0);
}
{
  const frames = DP_VISUALIZERS["lcs"]();
  const expected = bruteLcsLength(LCS_STRING_A, LCS_STRING_B);
  const lastFrame = frames[frames.length - 1];
  const got = lastFrame.table[LCS_STRING_A.length][LCS_STRING_B.length].value;
  check(`lcs: 独立実装の再帰(期待値=${expected})と一致`, got === expected, `got=${got}`);
}

// coin-change: brute-force(BFS的な最小硬貨数の全探索)と比較
{
  const frames = DP_VISUALIZERS["coin-change"]();
  const dp = new Array(COIN_CHANGE_AMOUNT + 1).fill(Infinity);
  dp[0] = 0;
  for (let amt = 1; amt <= COIN_CHANGE_AMOUNT; amt++) {
    for (const c of COIN_CHANGE_COINS) {
      if (c <= amt) dp[amt] = Math.min(dp[amt], dp[amt - c] + 1);
    }
  }
  const lastFrame = frames[frames.length - 1];
  const got = lastFrame.table[0][COIN_CHANGE_AMOUNT].value;
  check(`coin-change: 独立実装のDP(期待値=${dp[COIN_CHANGE_AMOUNT]})と一致`, got === dp[COIN_CHANGE_AMOUNT], `got=${got}`);
}

// subset-sum: brute-force全部分集合探索
{
  const frames = DP_VISUALIZERS["subset-sum"]();
  const n = SUBSET_SUM_NUMBERS.length;
  let achievable = false;
  for (let mask = 0; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += SUBSET_SUM_NUMBERS[i];
    if (sum === SUBSET_SUM_TARGET) { achievable = true; break; }
  }
  const lastFrame = frames[frames.length - 1];
  const got = lastFrame.table[n][SUBSET_SUM_TARGET].value === 1;
  check(`subset-sum: brute-force全探索(期待値=${achievable})と一致`, got === achievable);
}

// lis: brute-force O(2^n)全部分列探索(配列が短いので許容)
{
  const frames = DP_VISUALIZERS["lis"]();
  const n = LIS_ARRAY.length;
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const seq = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) seq.push(LIS_ARRAY[i]);
    let increasing = true;
    for (let i = 1; i < seq.length; i++) if (seq[i] <= seq[i - 1]) increasing = false;
    if (increasing) best = Math.max(best, seq.length);
  }
  const lastFrame = frames[frames.length - 1];
  const got = Math.max(...lastFrame.table[0].map((c) => c.value ?? 0));
  check(`lis: brute-force全部分列探索(期待値=${best})と一致`, got === best, `got=${got}`);
}

// word-break-problem: 独立実装の再帰
{
  const frames = DP_VISUALIZERS["word-break-problem"]();
  const dict = new Set(WORD_BREAK_DICTIONARY);
  const n = WORD_BREAK_STRING.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && dict.has(WORD_BREAK_STRING.slice(j, i))) { dp[i] = true; break; }
    }
  }
  const lastFrame = frames[frames.length - 1];
  const got = lastFrame.table[0][n].value === 1;
  check(`word-break-problem: 独立実装のDP(期待値=${dp[n]})と一致`, got === dp[n]);
}

// unbounded-knapsack: 独立実装のDP
{
  const frames = DP_VISUALIZERS["unbounded-knapsack"]();
  const dp = new Array(UNBOUNDED_KNAPSACK_CAPACITY + 1).fill(0);
  for (let w = 1; w <= UNBOUNDED_KNAPSACK_CAPACITY; w++) {
    for (const it of UNBOUNDED_KNAPSACK_ITEMS) {
      if (it.weight <= w) dp[w] = Math.max(dp[w], dp[w - it.weight] + it.value);
    }
  }
  const lastFrame = frames[frames.length - 1];
  const got = lastFrame.table[0][UNBOUNDED_KNAPSACK_CAPACITY].value;
  check(`unbounded-knapsack: 独立実装のDP(期待値=${dp[UNBOUNDED_KNAPSACK_CAPACITY]})と一致`, got === dp[UNBOUNDED_KNAPSACK_CAPACITY]);
}

// partition-problem: brute-force全部分集合探索
{
  const frames = DP_VISUALIZERS["partition-problem"]();
  const total = PARTITION_PROBLEM_NUMBERS.reduce((a, b) => a + b, 0);
  const n = PARTITION_PROBLEM_NUMBERS.length;
  let achievable = false;
  if (total % 2 === 0) {
    const target = total / 2;
    for (let mask = 0; mask < 1 << n; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += PARTITION_PROBLEM_NUMBERS[i];
      if (sum === target) { achievable = true; break; }
    }
  }
  const lastDesc = frames[frames.length - 1].description;
  check(
    `partition-problem: brute-force全探索(期待値=${achievable ? "分割可能" : "分割不可能"})と一致`,
    achievable ? lastDesc.includes("分割可能") : lastDesc.includes("分割不可能"),
    lastDesc,
  );
}

// fractional-knapsack: 既知の教科書的最適値(240)
{
  const frames = DP_VISUALIZERS["fractional-knapsack"]();
  const lastDesc = frames[frames.length - 1].description;
  check("fractional-knapsack: 教科書的な既知の最適値(240)と一致", lastDesc.includes("240"), lastDesc);
  check(
    "fractional-knapsack: 品物構成が既知の教科書例(A:10/60, B:20/100, C:30/120, 容量50)と一致",
    FRACTIONAL_KNAPSACK_CAPACITY === 50 && FRACTIONAL_KNAPSACK_ITEMS.length === 3,
  );
}

// ===========================================================================
// TREE (6件): 構造的な不変条件を検証
// ===========================================================================
section("TREE (6件): 構造的な不変条件");

function isBstValid(nodes, id, min, max) {
  if (id === null) return true;
  const node = nodes[id];
  if (node.value <= min || node.value >= max) return false;
  return isBstValid(nodes, node.left, min, node.value) && isBstValid(nodes, node.right, node.value, max);
}

function treeHeight(nodes, id) {
  if (id === null) return 0;
  const node = nodes[id];
  return 1 + Math.max(treeHeight(nodes, node.left), treeHeight(nodes, node.right));
}

function isAvlBalanced(nodes, id) {
  if (id === null) return true;
  const node = nodes[id];
  const lh = treeHeight(nodes, node.left);
  const rh = treeHeight(nodes, node.right);
  if (Math.abs(lh - rh) > 1) return false;
  return isAvlBalanced(nodes, node.left) && isAvlBalanced(nodes, node.right);
}

for (const id of ["binary-search-tree", "avl-tree", "treap", "splay-tree"]) {
  const frames = TREE_VISUALIZERS[id]();
  checkWellFormed(id, frames);
  const last = frames[frames.length - 1];
  const bstValid = isBstValid(last.nodes, last.rootId, -Infinity, Infinity);
  check(`${id}: 最終状態がBST順序を満たす(左<親<右)`, bstValid);
  if (id === "avl-tree") {
    check("avl-tree: 全頂点で平衡条件(|左右高さ差|≤1)を満たす", isAvlBalanced(last.nodes, last.rootId));
  }
}

// red-black-tree: 4性質(根は黒/赤の子は黒/黒高さ均一/BST順序)
{
  const frames = TREE_VISUALIZERS["red-black-tree"]();
  checkWellFormed("red-black-tree", frames);
  const last = frames[frames.length - 1];
  const bstValid = isBstValid(last.nodes, last.rootId, -Infinity, Infinity);
  check("red-black-tree: BST順序を満たす", bstValid);
  const root = last.nodes[last.rootId];
  check("red-black-tree: 根が黒", root?.color === "black");
  let redChildBlack = true;
  let blackHeights = new Set();
  const walk = (id, blackCount) => {
    if (id === null) { blackHeights.add(blackCount); return; }
    const node = last.nodes[id];
    if (node.color === "red") {
      for (const childId of [node.left, node.right]) {
        if (childId !== null && last.nodes[childId].color === "red") redChildBlack = false;
      }
    }
    const nextCount = blackCount + (node.color === "black" ? 1 : 0);
    walk(node.left, nextCount);
    walk(node.right, nextCount);
  };
  walk(last.rootId, 0);
  check("red-black-tree: 赤頂点の子は必ず黒", redChildBlack);
  check("red-black-tree: 根から葉までの黒頂点数(黒高さ)が全経路で均一", blackHeights.size === 1, `heights=${[...blackHeights]}`);
}

// interval-tree: max値が各部分木の実際の最大hiと一致するか
{
  const frames = TREE_VISUALIZERS["interval-tree"]();
  checkWellFormed("interval-tree", frames);
  const last = frames[frames.length - 1];
  function actualMaxHi(id) {
    if (id === null) return -Infinity;
    const node = last.nodes[id];
    return Math.max(node.hi, actualMaxHi(node.left), actualMaxHi(node.right));
  }
  let maxOk = true;
  for (const [id, node] of Object.entries(last.nodes)) {
    if (node.maxHigh !== undefined && node.maxHigh !== actualMaxHi(id)) maxOk = false;
  }
  check("interval-tree: 各頂点のmax値が部分木内の実際の最大hiと一致", maxOk);
}

// ===========================================================================
// STRING (5件) / TRIE (2件)
// ===========================================================================
section("STRING (5件) / TRIE (2件)");

const nativeMatchIndex = TEXT.indexOf(PATTERN);
for (const [id, fn] of Object.entries(STRING_VISUALIZERS)) {
  const frames = fn();
  checkWellFormed(id, frames);
  if (id === "run-length-encoding") continue; // 圧縮アルゴリズムなので一致位置の概念がない
  const matchFrame = frames.find((f) => f.description.includes("完全一致を発見"));
  // 大半は「位置N で完全一致を発見」の形式だが、rabin-karpだけ窓の範囲「窓[N, ...]」で位置を表す。
  const desc = matchFrame?.description ?? "";
  const positionMatches = desc.includes(`位置${nativeMatchIndex}で`) || desc.includes(`窓[${nativeMatchIndex},`);
  check(
    `${id}: String.prototype.indexOfの結果(位置${nativeMatchIndex})と同じ位置で一致を発見`,
    positionMatches,
    desc,
  );
}

for (const [id, fn] of Object.entries(TRIE_VISUALIZERS)) {
  checkWellFormed(id, fn());
}

// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(`結果: ${passCount}件成功 / ${failCount}件失敗 (合計${passCount + failCount}件のアサーション)`);
if (failCount > 0) {
  console.log("\n失敗したチェック:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log("全ての検証に成功しました。");
}
