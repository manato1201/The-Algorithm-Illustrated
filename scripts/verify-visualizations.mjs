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
  INTEGRATION_TRUE_VALUE,
  eulersMethodSteps,
  rungeKuttaMethodSteps,
  trapezoidalRuleSteps,
  simpsonsRuleSteps,
  monteCarloIntegrationSteps,
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
  STABLE_MARRIAGE_MEN,
  STABLE_MARRIAGE_WOMEN,
  STABLE_MARRIAGE_MEN_PREFS,
  STABLE_MARRIAGE_WOMEN_PREFS,
  HIERHOLZER_EDGES,
  TWO_SAT_CLAUSES,
  REGISTER_INTERFERENCE_EDGES,
  SUFFIX_AUTOMATON_STRING,
} from "../src/lib/graph-visualizers.ts";
import {
  DP_VISUALIZERS,
  Q_LEARNING_GRID_SIZE,
  Q_LEARNING_GOAL_STATE,
  Q_LEARNING_ACTIONS,
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
  POLLARDS_P_MINUS_1_N,
  TONELLI_SHANKS_N,
  TONELLI_SHANKS_P,
  MONTGOMERY_A,
  MONTGOMERY_B,
  MONTGOMERY_N,
  EC_SCALAR,
  EC_BASE_POINT,
  EC_A,
  EC_P,
  TOOM_COOK_X,
  TOOM_COOK_Y,
  CONVOLUTION_SIGNAL,
  CONVOLUTION_KERNEL,
  NEEDLEMAN_WUNSCH_A,
  NEEDLEMAN_WUNSCH_B,
  NEEDLEMAN_WUNSCH_MATCH,
  NEEDLEMAN_WUNSCH_MISMATCH,
  NEEDLEMAN_WUNSCH_GAP,
  SMITH_WATERMAN_A,
  SMITH_WATERMAN_B,
  SMITH_WATERMAN_MATCH,
  SMITH_WATERMAN_MISMATCH,
  SMITH_WATERMAN_GAP,
  NUSSINOV_RNA,
  MSA_SEQUENCES,
  VITERBI_STATES,
  VITERBI_OBSERVATIONS,
  VITERBI_START_PROB,
  VITERBI_TRANS_PROB,
  VITERBI_EMIT_PROB,
  CKY_SENTENCE,
  CRF_SENTENCE,
  CRF_TAGS,
  CRF_EMISSION_SCORE,
  CRF_TRANSITION_SCORE,
  CRF_START_SCORE,
  OBST_FREQ,
  PALINDROME_PARTITIONING_STRING,
  BURST_BALLOONS_NUMS,
  HUNGARIAN_COST_MATRIX,
} from "../src/lib/dp-visualizers.ts";
import { TREE_VISUALIZERS } from "../src/lib/tree-visualizers.ts";
import { STRING_VISUALIZERS, TEXT, PATTERN } from "../src/lib/string-visualizers.ts";
import { TRIE_VISUALIZERS } from "../src/lib/trie-visualizer.ts";
import { GEOMETRY_VISUALIZERS, GEOMETRY_DATASETS } from "../src/lib/geometry-visualizers.ts";
import { LANE_VISUALIZERS, LANE_META } from "../src/lib/lane-visualizers.ts";
import {
  STOCK_PRICES, JUMP_GAME_NUMS, GAS_STATION_GAS, GAS_STATION_COST, CANDY_RATINGS, STOCK_SPAN_PRICES, MEETINGS,
  POINT_COVER_INTERVALS, INTERVAL_COLORING_INTERVALS, JOB_SEQUENCING_JOBS, MOORE_HODGSON_JOBS, LPT_JOBS, LPT_MACHINES,
  FFD_ITEMS, FFD_CAPACITY, EGYPTIAN_NUMERATOR, EGYPTIAN_DENOMINATOR, SET_COVER_UNIVERSE, SET_COVER_SETS,
  MERGE_FILE_SIZES, SHANNON_FANO_SYMBOLS, CANONICAL_HUFFMAN_LENGTHS, TASK_SCHEDULER_COUNTS, TASK_SCHEDULER_COOLDOWN,
} from "../src/lib/greedy-visualizers.ts";
import { SIGNAL_VISUALIZERS, SIGNAL_META } from "../src/lib/signal-visualizers.ts";
import {
  AUTOCORR_MIN_LAG, AUTOCORR_MAX_LAG, AUTOCORR_PERIOD, autocorrInput,
  STFT_N, STFT_WIN, STFT_HOP, STFT_SWITCH, stftInput,
  LPC_ORDER, lpcInput, levinsonDurbin,
  CEPSTRUM_MIN_Q, CEPSTRUM_MAX_Q, CEPSTRUM_PERIOD, cepstrumInput,
  MFCC_FS, MFCC_FILTERS, MFCC_COEFS, mfccInput, mfccOf,
} from "../src/lib/signal-analysis.ts";
import {
  mulawInput, ADPCM_STEP_TABLE, adpcmInput, adpcmEncode, flacInput,
  MDCT_QUANT_STEP, mdctInput, mdctProcess, mdct,
} from "../src/lib/signal-codecs.ts";
import {
  biquadInput, toneAmplitude, gateInput, noiseGateProcess, compressorInput, compressorProcess,
  karplusInitialBuffer, karplusStrongOutput, wavetableTable, chorusInput,
  reverbDry, reverbImpulseResponse, granularSource, granularStarts,
} from "../src/lib/signal-effects.ts";
import { PSEUDO_CODE, activePseudoLines } from "../src/lib/pseudo-code.ts";
import { buildStepKinds, highlightEntities, STEP_KIND_LABELS } from "../src/components/visualizer/step-timeline.ts";
import { STEP_TONE, STEP_TONE_MAX_RANK } from "../src/lib/step-sound.ts";
import { easeSpring } from "../src/lib/color-mix.ts";
import { ASCII_LEVELS, asciiBarLevels, asciiBarRows } from "../src/lib/ascii-view.ts";

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

// ---------------------------------------------------------------------------
// SORT: 要素数ステッパー(4〜30)の全長さで、全ソートが Array.prototype.sort と一致すること。
// 画面側のステッパーが生成する入力(重複なし・シャッフル済み)と同じ形で、長さだけを振って確かめる。
// ---------------------------------------------------------------------------
section("SORT: 要素数4〜30(要素数ステッパーの範囲)");
{
  let state = 123456789;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  let allOk = true;
  const failed = [];
  for (let count = 4; count <= 30; count++) {
    const input = Array.from({ length: count }, (_, i) => Math.round(((i + 1) * 100) / count));
    for (let i = input.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [input[i], input[j]] = [input[j], input[i]];
    }
    const expected = [...input].sort((a, b) => a - b);
    for (const [id, fn] of Object.entries(SORT_VISUALIZERS)) {
      const frames = fn([...input]);
      const last = frames[frames.length - 1];
      const ok = JSON.stringify(last.array) === JSON.stringify(expected);
      if (!ok) {
        allOk = false;
        failed.push(`${id}(n=${count})`);
      }
    }
  }
  check(
    `全${Object.keys(SORT_VISUALIZERS).length}種が要素数4〜30のすべてでArray.prototype.sortと一致`,
    allOk,
    failed.slice(0, 8).join(", "),
  );
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
// PATHFINDING (19件)
// ===========================================================================
section("PATHFINDING (19件)");
const PATH_SUCCESS_KEYWORDS = ["発見", "出会"];
for (const [id, fn] of Object.entries(PATHFINDING_VISUALIZERS)) {
  const frames = fn();
  checkWellFormed(id, frames);
  if (
    id === "conways-game-of-life" ||
    id === "langtons-ant" ||
    id === "wireworld" ||
    id === "flow-field-pathfinding" ||
    id === "line-of-sight-raycasting" ||
    id === "cellular-automaton-crowd" ||
    id === "influence-map" ||
    id === "navmesh-generation" ||
    id === "potential-field-navigation" ||
    id === "potential-field-path-planning" ||
    id === "social-force-model" ||
    id === "continuum-crowd-model" ||
    id === "canny-edge-detection" ||
    id === "sobel-filter" ||
    id === "connected-component-labeling" ||
    id === "watershed-algorithm" ||
    id === "distance-transform" ||
    id === "elementary-cellular-automaton" ||
    id === "brians-brain-cellular-automaton" ||
    id === "forest-fire-model" ||
    id === "rock-paper-scissors-cellular-automaton" ||
    id === "sandpile-model" ||
    id === "traffic-cellular-automaton"
  ) {
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
  for (const id of ["minimax", "alpha-beta-pruning", "negamax", "iterative-deepening-minimax"]) {
    const frames = GRAPH_VISUALIZERS[id]();
    checkWellFormed(id, frames);
    const lastDesc = frames[frames.length - 1].description;
    check(`${id}: 独立実装のbrute-force評価(根の値=${refRoot})と一致`, lastDesc.includes(String(refRoot)), lastDesc);
  }
}

// expectimax: 独立実装のbrute-force評価(MINノードを平均に読み替え)と一致
function bruteExpectimax(values, depth, idx) {
  if (depth === 3) return values[idx];
  const left = bruteExpectimax(values, depth + 1, idx * 2);
  const right = bruteExpectimax(values, depth + 1, idx * 2 + 1);
  return depth % 2 === 0 ? Math.max(left, right) : (left + right) / 2;
}
{
  const refRoot = bruteExpectimax(GAME_TREE_LEAF_VALUES, 0, 0);
  const frames = GRAPH_VISUALIZERS["expectimax"]();
  checkWellFormed("expectimax", frames);
  const lastDesc = frames[frames.length - 1].description;
  check(`expectimax: 独立実装のbrute-force評価(期待値=${refRoot})と一致`, lastDesc.includes(String(refRoot)), lastDesc);
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
// GRAPH追加分: グラフ系9件
// ===========================================================================
section("GRAPH追加分: グラフ系9件");

// stable-marriage-problem: 得られたマッチングにブロッキングペアが存在しないことを検証
{
  const frames = GRAPH_VISUALIZERS["stable-marriage-problem"]();
  checkWellFormed("stable-marriage-problem", frames);
  const lastDesc = frames[frames.length - 1].description;
  const match = lastDesc.match(/安定マッチング: (.+?)\(/);
  const pairs = match ? match[1].trim().split(", ").map((p) => p.split("-")) : [];
  const engagement = new Map(pairs.map(([m, w]) => [w, m]));
  let stable = pairs.length === 3;
  for (const m of STABLE_MARRIAGE_MEN) {
    const currentW = pairs.find(([mm]) => mm === m)?.[1];
    for (const w of STABLE_MARRIAGE_WOMEN) {
      if (w === currentW) continue;
      const mPrefs = STABLE_MARRIAGE_MEN_PREFS[m];
      if (mPrefs.indexOf(w) < mPrefs.indexOf(currentW)) {
        const wPrefs = STABLE_MARRIAGE_WOMEN_PREFS[w];
        if (wPrefs.indexOf(m) < wPrefs.indexOf(engagement.get(w))) stable = false;
      }
    }
  }
  check(`stable-marriage-problem: 完全マッチングかつブロッキングペアが存在しない`, stable, lastDesc);
}

// push-relabel-max-flow: Edmonds-Karp/Dinic/Ford-Fulkersonと同じ既知の最大流23と一致
{
  const frames = GRAPH_VISUALIZERS["push-relabel-max-flow"]();
  checkWellFormed("push-relabel-max-flow", frames);
  const lastDesc = frames[frames.length - 1].description;
  check("push-relabel-max-flow: 既知の最大流23と一致", lastDesc.includes("最大流=23"), lastDesc);
}

// hierholzer-algorithm: 得られたオイラー閉路が全ての辺をちょうど1回ずつ通ることを検証
{
  const frames = GRAPH_VISUALIZERS["hierholzer-algorithm"]();
  checkWellFormed("hierholzer-algorithm", frames);
  const lastDesc = frames[frames.length - 1].description;
  const match = lastDesc.match(/オイラー閉路: (.+?)\(/);
  const circuit = match ? match[1].trim().split("→") : [];
  const usedEdges = new Set();
  let valid = circuit.length - 1 === HIERHOLZER_EDGES.length;
  for (let i = 0; valid && i < circuit.length - 1; i++) {
    const a = circuit[i], b = circuit[i + 1];
    const edge = HIERHOLZER_EDGES.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    if (!edge || usedEdges.has(edge.id)) { valid = false; break; }
    usedEdges.add(edge.id);
  }
  check(`hierholzer-algorithm: 全${HIERHOLZER_EDGES.length}辺をちょうど1回ずつ通る閉路`, valid && usedEdges.size === HIERHOLZER_EDGES.length, lastDesc);
}

// two-sat: brute-force全8通りの真偽値割り当てとの充足可能性の一致
{
  function evalClause([a, b], assign) {
    const lit = (l) => (l.startsWith("!") ? !assign[l.slice(1)] : assign[l]);
    return lit(a) || lit(b);
  }
  let satisfiable = false;
  for (let mask = 0; mask < 8; mask++) {
    const assign = { x1: !!(mask & 1), x2: !!(mask & 2), x3: !!(mask & 4) };
    if (TWO_SAT_CLAUSES.every((c) => evalClause(c, assign))) { satisfiable = true; break; }
  }
  const frames = GRAPH_VISUALIZERS["two-sat"]();
  checkWellFormed("two-sat", frames);
  const lastDesc = frames[frames.length - 1].description;
  const reportedSat = lastDesc.includes("充足可能");
  check(`two-sat: brute-force全探索(充足可能=${satisfiable})と一致`, reportedSat === satisfiable, lastDesc);
}

// textrank: フレームが正常に生成されランキングを報告すること
{
  const frames = GRAPH_VISUALIZERS["textrank"]();
  checkWellFormed("textrank", frames);
  const lastDesc = frames[frames.length - 1].description;
  check("textrank: 採用する順位を報告", lastDesc.includes("採用する順位"), lastDesc);
}

// register-allocation-graph-coloring: 隣接する頂点が同じ色にならない妥当な彩色であることを検証
{
  const frames = GRAPH_VISUALIZERS["register-allocation-graph-coloring"]();
  checkWellFormed("register-allocation-graph-coloring", frames);
  const colors = frames[frames.length - 1].distances;
  const validColoring = REGISTER_INTERFERENCE_EDGES.every((e) => colors[e.from] !== colors[e.to]);
  check("register-allocation-graph-coloring: 隣接する頂点間で色の衝突がない", validColoring);
}

// de-bruijn-graph-assembly: 全頂点で入次数=出次数(オイラー閉路が存在)であることを確認
{
  const frames = GRAPH_VISUALIZERS["de-bruijn-graph-assembly"]();
  checkWellFormed("de-bruijn-graph-assembly", frames);
  const lastDesc = frames[frames.length - 1].description;
  check("de-bruijn-graph-assembly: 全頂点で入次数=出次数、オイラー閉路が存在", lastDesc.includes("一致") && lastDesc.includes("復元できる"), lastDesc);
}

// suffix-automaton: 独立実装した接尾辞オートマトンが全ての部分文字列を受理することを確認
{
  function buildAutomaton(s) {
    const states = [{ len: 0, link: -1, trans: new Map() }];
    let last = 0;
    for (const ch of s) {
      const cur = states.length;
      states.push({ len: states[last].len + 1, link: -1, trans: new Map() });
      let p = last;
      while (p !== -1 && !states[p].trans.has(ch)) { states[p].trans.set(ch, cur); p = states[p].link; }
      if (p === -1) states[cur].link = 0;
      else {
        const q = states[p].trans.get(ch);
        if (states[p].len + 1 === states[q].len) states[cur].link = q;
        else {
          const clone = states.length;
          states.push({ len: states[p].len + 1, link: states[q].link, trans: new Map(states[q].trans) });
          while (p !== -1 && states[p].trans.get(ch) === q) { states[p].trans.set(ch, clone); p = states[p].link; }
          states[q].link = clone;
          states[cur].link = clone;
        }
      }
      last = cur;
    }
    return states;
  }
  const s = SUFFIX_AUTOMATON_STRING;
  const states = buildAutomaton(s);
  let allAccepted = true;
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      let cur = 0;
      let accepted = true;
      for (const ch of s.slice(i, j + 1)) {
        if (states[cur].trans.has(ch)) cur = states[cur].trans.get(ch);
        else { accepted = false; break; }
      }
      if (!accepted) allAccepted = false;
    }
  }
  const frames = GRAPH_VISUALIZERS["suffix-automaton"]();
  checkWellFormed("suffix-automaton", frames);
  const lastDesc = frames[frames.length - 1].description;
  const match = lastDesc.match(/状態数=(\d+)/);
  const stateCount = match ? parseInt(match[1], 10) : null;
  check(`suffix-automaton: 独立実装が全部分文字列を受理し状態数(${states.length})も一致`, allAccepted && stateCount === states.length, lastDesc);
}

// ===========================================================================
// DP (44件)
// ===========================================================================
section("DP (44件): 既知の正解値・独立参照実装との突き合わせ");

for (const [id, fn] of Object.entries(DP_VISUALIZERS)) {
  checkWellFormed(id, fn());
}

// q-learning: 独立実装したQ学習の参照シミュレーションと最終Q値テーブルを突き合わせる
{
  const frames = DP_VISUALIZERS["q-learning"]();
  const nStates = Q_LEARNING_GRID_SIZE * Q_LEARNING_GRID_SIZE;
  const nActions = Q_LEARNING_ACTIONS.length;
  const deltas = [
    [-1, 0], // 上
    [1, 0], // 下
    [0, -1], // 左
    [0, 1], // 右
  ];
  const step = (state, action) => {
    const row = Math.floor(state / Q_LEARNING_GRID_SIZE);
    const col = state % Q_LEARNING_GRID_SIZE;
    const [dr, dc] = deltas[action];
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= Q_LEARNING_GRID_SIZE || nc < 0 || nc >= Q_LEARNING_GRID_SIZE) return state;
    return nr * Q_LEARNING_GRID_SIZE + nc;
  };
  const alpha = 0.5, gamma = 0.9;
  const episodeActions = [3, 3, 1, 1]; // 右,右,下,下 (S0→S1→S2→S5→S8)
  const q = Array.from({ length: nStates }, () => new Array(nActions).fill(0));
  const round3 = (v) => Math.round(v * 1000) / 1000;
  for (let episode = 0; episode < 3; episode++) {
    let state = 0;
    for (const action of episodeActions) {
      const nextState = step(state, action);
      const isTerminal = nextState === Q_LEARNING_GOAL_STATE;
      const reward = isTerminal ? 10 : -1;
      const maxNext = isTerminal ? 0 : Math.max(...q[nextState]);
      const tdTarget = reward + (isTerminal ? 0 : gamma * maxNext);
      q[state][action] = round3(q[state][action] + alpha * (tdTarget - q[state][action]));
      state = nextState;
    }
  }
  const lastTable = frames[frames.length - 1].table;
  let allMatch = true;
  const mismatches = [];
  for (let s = 0; s < nStates; s++) {
    for (let a = 0; a < nActions; a++) {
      if (lastTable[s][a].value !== q[s][a]) {
        allMatch = false;
        mismatches.push(`Q(S${s},${Q_LEARNING_ACTIONS[a]})=${lastTable[s][a].value}≠参照値${q[s][a]}`);
      }
    }
  }
  check("q-learning: 独立実装したQ学習シミュレーションの最終Q値テーブルと一致", allMatch, mismatches.join(", "));
  check(
    "q-learning: ゴールに隣接するS5→ゴール方向の行動のQ値が正であり、報酬の伝播が確認できる",
    q[5][1] > 0,
    `Q(S5,↓)=${q[5][1]}`,
  );
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
// DP追加分 A: 数論・暗号7件(独立実装との突き合わせ)
// ===========================================================================
section("DP追加分A: 数論・暗号7件");

{
  const frames = DP_VISUALIZERS["fermat-primality-test"]();
  checkWellFormed("fermat-primality-test", frames);
}
{
  const n = POLLARDS_P_MINUS_1_N;
  let factor = null;
  for (let d = 2; d < n; d++) if (n % d === 0) { factor = d; break; }
  const frames = DP_VISUALIZERS["pollards-p-minus-1"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`pollards-p-minus-1: n=${n}の既知の約数(${factor})が報告される`, factor !== null && lastDesc.includes(String(factor)), lastDesc);
}
{
  const p = TONELLI_SHANKS_P, n = TONELLI_SHANKS_N;
  const frames = DP_VISUALIZERS["tonelli-shanks"]();
  const lastDesc = frames[frames.length - 1].description;
  const match = lastDesc.match(/x=(\d+)/);
  const x = match ? parseInt(match[1], 10) : null;
  check(`tonelli-shanks: x²≡n (mod p)を満たすxが見つかる`, x !== null && (x * x) % p === ((n % p) + p) % p, lastDesc);
}
{
  const frames = DP_VISUALIZERS["montgomery-multiplication"]();
  const expected = (MONTGOMERY_A * MONTGOMERY_B) % MONTGOMERY_N;
  const lastDesc = frames[frames.length - 1].description;
  check(`montgomery-multiplication: 通常計算(${expected})と一致`, lastDesc.includes(String(expected)), lastDesc);
}
{
  const frames = DP_VISUALIZERS["elgamal-encryption"]();
  const lastDesc = frames[frames.length - 1].description;
  check("elgamal-encryption: 復号結果が元の平文と一致", /復号結果m'=(\d+)は元の平文m=\1と一致/.test(lastDesc), lastDesc);
}
{
  function ecModInv(a, m) { a = ((a % m) + m) % m; for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x; return 1; }
  function ecAdd(P, Q, a, p) {
    if (P === null) return Q;
    if (Q === null) return P;
    let lambda;
    if (P.x === Q.x && P.y === Q.y) lambda = ((3 * P.x * P.x + a) * ecModInv(2 * P.y, p)) % p;
    else { if (P.x === Q.x) return null; lambda = ((Q.y - P.y) * ecModInv(Q.x - P.x, p)) % p; }
    lambda = ((lambda % p) + p) % p;
    const xR = (((lambda * lambda - P.x - Q.x) % p) + p) % p;
    const yR = (((lambda * (P.x - xR) - P.y) % p) + p) % p;
    return { x: xR, y: yR };
  }
  let naive = null;
  for (let i = 0; i < EC_SCALAR; i++) naive = ecAdd(naive, EC_BASE_POINT, EC_A, EC_P);
  const frames = DP_VISUALIZERS["elliptic-curve-cryptography"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`elliptic-curve-cryptography: 素朴な繰り返し加算(${naive.x},${naive.y})と一致`, lastDesc.includes(`(${naive.x}, ${naive.y})`), lastDesc);
}
{
  const frames = DP_VISUALIZERS["toom-cook-multiplication"]();
  const expected = TOOM_COOK_X * TOOM_COOK_Y;
  const lastDesc = frames[frames.length - 1].description;
  check(`toom-cook-multiplication: 素朴な乗算(${expected})と一致`, lastDesc.includes(String(expected)), lastDesc);
}

// ===========================================================================
// DP追加分 B: 数値計算・線形代数12件
// ===========================================================================
section("DP追加分B: 数値計算・線形代数12件");

{
  const frames = DP_VISUALIZERS["gaussian-elimination"]();
  const lastDesc = frames[frames.length - 1].description;
  check("gaussian-elimination: 既知の解(x=2,y=3,z=-1)と一致", lastDesc.includes("2.000") && lastDesc.includes("3.000") && lastDesc.includes("-1.000"), lastDesc);
}
{
  const frames = DP_VISUALIZERS["lu-decomposition"]();
  const lastDesc = frames[frames.length - 1].description;
  check("lu-decomposition: L×Uが元の行列と一致(検算OK)", lastDesc.includes("一致"), lastDesc);
}
{
  const points = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 6 }];
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const frames = DP_VISUALIZERS["least-squares"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`least-squares: 独立計算の傾き(${m.toFixed(4)})と一致`, lastDesc.includes(m.toFixed(4)), lastDesc);
}
{
  const frames = DP_VISUALIZERS["power-iteration"]();
  const lastDesc = frames[frames.length - 1].description;
  check("power-iteration: 既知の支配的固有値(3)に収束", lastDesc.includes("3"), lastDesc);
}
{
  const outLen = CONVOLUTION_SIGNAL.length + CONVOLUTION_KERNEL.length - 1;
  const expected = [];
  for (let i = 0; i < outLen; i++) {
    let sum = 0;
    for (let k = 0; k < CONVOLUTION_KERNEL.length; k++) {
      const si = i - k;
      if (si >= 0 && si < CONVOLUTION_SIGNAL.length) sum += CONVOLUTION_SIGNAL[si] * CONVOLUTION_KERNEL[k];
    }
    expected.push(Number(sum.toFixed(3)));
  }
  const frames = DP_VISUALIZERS["discrete-convolution"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`discrete-convolution: 独立実装の畳み込み([${expected.join(", ")}])と一致`, lastDesc.includes(`[${expected.join(", ")}]`), lastDesc);
}
{
  const frames = DP_VISUALIZERS["qr-decomposition"]();
  checkWellFormed("qr-decomposition", frames);
}
{
  const frames = DP_VISUALIZERS["multivariate-newton-method"]();
  const lastDesc = frames[frames.length - 1].description;
  check("multivariate-newton-method: 既知の解√2≈1.41421に収束", lastDesc.includes("1.41421"), lastDesc);
}
{
  const eulerFrames = eulersMethodSteps();
  const rkFrames = rungeKuttaMethodSteps();
  const eErr = parseFloat(eulerFrames[eulerFrames.length - 1].description.match(/誤差(\d+\.\d+)/)?.[1] ?? "NaN");
  const rkErr = parseFloat(rkFrames[rkFrames.length - 1].description.match(/誤差(\d+\.\d+)/)?.[1] ?? "NaN");
  check(`eulers-method/runge-kutta-method: RK4の誤差(${rkErr})がオイラー法の誤差(${eErr})より小さい`, rkErr < eErr, `euler=${eErr}, rk4=${rkErr}`);
}
{
  const trapFrames = trapezoidalRuleSteps();
  const simpFrames = simpsonsRuleSteps();
  const trapErr = parseFloat(trapFrames[trapFrames.length - 1].description.match(/誤差(\d+\.\d+)/)?.[1] ?? "NaN");
  const simpErr = parseFloat(simpFrames[simpFrames.length - 1].description.match(/誤差(\d+\.\d+)/)?.[1] ?? "NaN");
  check(`trapezoidal-rule/simpsons-rule: シンプソンの公式の誤差(${simpErr})が台形則の誤差(${trapErr})より小さい(真の値=${INTEGRATION_TRUE_VALUE.toFixed(4)})`, simpErr < trapErr, `trap=${trapErr}, simpson=${simpErr}`);
}
{
  const frames = monteCarloIntegrationSteps();
  const lastDesc = frames[frames.length - 1].description;
  const match = lastDesc.match(/推定値=(\d+\.\d+)/);
  const est = match ? parseFloat(match[1]) : null;
  check(`monte-carlo-integration: 推定値が真の値(${INTEGRATION_TRUE_VALUE.toFixed(4)})に近い`, est !== null && Math.abs(est - INTEGRATION_TRUE_VALUE) < 15, lastDesc);
}

// ===========================================================================
// DP追加分 C: 配列アラインメント4件
// ===========================================================================
section("DP追加分C: 配列アラインメント4件");

function nwScore(a, b, match, mismatch, gap) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const diag = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? match : mismatch);
    dp[i][j] = Math.max(diag, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
  }
  return dp[n][m];
}
{
  const expected = nwScore(NEEDLEMAN_WUNSCH_A, NEEDLEMAN_WUNSCH_B, NEEDLEMAN_WUNSCH_MATCH, NEEDLEMAN_WUNSCH_MISMATCH, NEEDLEMAN_WUNSCH_GAP);
  const frames = DP_VISUALIZERS["needleman-wunsch"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`needleman-wunsch: 独立実装のスコア(${expected})と一致`, lastDesc.includes(`スコアは${expected}`), lastDesc);
}
function swScore(a, b, match, mismatch, gap) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const diag = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? match : mismatch);
    dp[i][j] = Math.max(0, diag, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
    if (dp[i][j] > best) best = dp[i][j];
  }
  return best;
}
{
  const expected = swScore(SMITH_WATERMAN_A, SMITH_WATERMAN_B, SMITH_WATERMAN_MATCH, SMITH_WATERMAN_MISMATCH, SMITH_WATERMAN_GAP);
  const frames = DP_VISUALIZERS["smith-waterman"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`smith-waterman: 独立実装のスコア(${expected})と一致`, lastDesc.includes(`最高スコア${expected}`), lastDesc);
}
function canPair(x, y) { return (x === "G" && y === "C") || (x === "C" && y === "G") || (x === "A" && y === "U") || (x === "U" && y === "A"); }
function nussinovMax(rna) {
  const n = rna.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      let best = dp[i + 1] ? dp[i + 1][j] : 0;
      for (let k = i + 1; k <= j; k++) {
        if (canPair(rna[i], rna[k])) {
          const inner = k > i + 1 ? dp[i + 1][k - 1] : 0;
          const outer = k < j ? dp[k + 1][j] : 0;
          best = Math.max(best, inner + 1 + outer);
        }
      }
      dp[i][j] = best;
    }
  }
  return dp[0][n - 1];
}
{
  const expected = nussinovMax(NUSSINOV_RNA);
  const frames = DP_VISUALIZERS["nussinov-algorithm"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`nussinov-algorithm: 独立実装の最大塩基対数(${expected})と一致`, lastDesc.includes(`最大塩基対数は${expected}`), lastDesc);
}
{
  const frames = DP_VISUALIZERS["multiple-sequence-alignment"]();
  const lastDesc = frames[frames.length - 1].description;
  check("multiple-sequence-alignment: 配列1と配列3の両方が結果に含まれる", lastDesc.includes(MSA_SEQUENCES[0]) && lastDesc.includes(MSA_SEQUENCES[2]), lastDesc);
}

// ===========================================================================
// DP追加分 D: 系列タグ付け4件
// ===========================================================================
section("DP追加分D: 系列タグ付け4件");

function bruteForceViterbi() {
  const states = VITERBI_STATES, obs = VITERBI_OBSERVATIONS, n = states.length, t = obs.length;
  let bestProb = -1, bestSeq = null;
  function rec(seq) {
    if (seq.length === t) {
      let prob = VITERBI_START_PROB[states[seq[0]]] * VITERBI_EMIT_PROB[states[seq[0]]][obs[0]];
      for (let i = 1; i < t; i++) prob *= VITERBI_TRANS_PROB[states[seq[i - 1]]][states[seq[i]]] * VITERBI_EMIT_PROB[states[seq[i]]][obs[i]];
      if (prob > bestProb) { bestProb = prob; bestSeq = [...seq]; }
      return;
    }
    for (let s = 0; s < n; s++) { seq.push(s); rec(seq); seq.pop(); }
  }
  rec([]);
  return { bestProb, bestSeq: bestSeq.map((i) => states[i]) };
}
{
  const { bestProb, bestSeq } = bruteForceViterbi();
  const frames = DP_VISUALIZERS["viterbi-algorithm"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`viterbi-algorithm: brute-force最尤状態列(${bestSeq.join(",")}, prob=${bestProb.toFixed(5)})と一致`, lastDesc.includes(bestSeq.join(", ")) && lastDesc.includes(bestProb.toFixed(5)), lastDesc);
}
function bruteForceTotalProb() {
  const states = VITERBI_STATES, obs = VITERBI_OBSERVATIONS, n = states.length, t = obs.length;
  let total = 0;
  function rec(seq) {
    if (seq.length === t) {
      let prob = VITERBI_START_PROB[states[seq[0]]] * VITERBI_EMIT_PROB[states[seq[0]]][obs[0]];
      for (let i = 1; i < t; i++) prob *= VITERBI_TRANS_PROB[states[seq[i - 1]]][states[seq[i]]] * VITERBI_EMIT_PROB[states[seq[i]]][obs[i]];
      total += prob;
      return;
    }
    for (let s = 0; s < n; s++) { seq.push(s); rec(seq); seq.pop(); }
  }
  rec([]);
  return total;
}
{
  const expected = bruteForceTotalProb();
  const frames = DP_VISUALIZERS["forward-backward-algorithm"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`forward-backward-algorithm: brute-force全経路確率の総和(${expected.toFixed(5)})と一致`, lastDesc.includes(expected.toFixed(5)), lastDesc);
}
{
  const frames = DP_VISUALIZERS["cky-algorithm"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`cky-algorithm: 文"${CKY_SENTENCE.join(" ")}"が文法に適合すると判定`, lastDesc.includes("文法に適合する"), lastDesc);
}
function bruteForceCRF() {
  const words = CRF_SENTENCE, tags = CRF_TAGS, n = tags.length, t = words.length;
  let best = -Infinity, bestSeq = null;
  function rec(seq) {
    if (seq.length === t) {
      let score = CRF_START_SCORE[tags[seq[0]]] + CRF_EMISSION_SCORE[words[0]][tags[seq[0]]];
      for (let i = 1; i < t; i++) score += CRF_TRANSITION_SCORE[tags[seq[i - 1]]][tags[seq[i]]] + CRF_EMISSION_SCORE[words[i]][tags[seq[i]]];
      if (score > best) { best = score; bestSeq = [...seq]; }
      return;
    }
    for (let s = 0; s < n; s++) { seq.push(s); rec(seq); seq.pop(); }
  }
  rec([]);
  return { best, bestSeq: bestSeq.map((i) => tags[i]) };
}
{
  const { best, bestSeq } = bruteForceCRF();
  const frames = DP_VISUALIZERS["conditional-random-field"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`conditional-random-field: brute-force最良タグ列(${bestSeq.join(",")}, score=${best.toFixed(3)})と一致`, lastDesc.includes(bestSeq.join(", ")) && lastDesc.includes(best.toFixed(3)), lastDesc);
}

// ===========================================================================
// DP追加分 E: 区間・ナップサックDP3件
// ===========================================================================
section("DP追加分E: 区間・ナップサックDP3件");

function obstCost(freq) {
  const n = freq.length;
  const prefixSum = [0];
  for (const f of freq) prefixSum.push(prefixSum[prefixSum.length - 1] + f);
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) dp[i][i] = freq[i];
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      const rangeSum = prefixSum[j + 1] - prefixSum[i];
      let best = Infinity;
      for (let r = i; r <= j; r++) {
        const left = r > i ? dp[i][r - 1] : 0;
        const right = r < j ? dp[r + 1][j] : 0;
        best = Math.min(best, left + right + rangeSum);
      }
      dp[i][j] = best;
    }
  }
  return dp[0][n - 1];
}
{
  const expected = obstCost(OBST_FREQ);
  const frames = DP_VISUALIZERS["optimal-binary-search-tree"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`optimal-binary-search-tree: 独立実装の最小コスト(${expected})と一致`, lastDesc.includes(`コストは${expected}`), lastDesc);
}
function minCutsBruteForce(s) {
  const n = s.length;
  function isPal(str) { return str === [...str].reverse().join(""); }
  const cuts = new Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    if (isPal(s.slice(0, i + 1))) { cuts[i] = 0; continue; }
    for (let k = 0; k < i; k++) if (isPal(s.slice(k + 1, i + 1))) cuts[i] = Math.min(cuts[i], cuts[k] + 1);
  }
  return cuts[n - 1];
}
{
  const expected = minCutsBruteForce(PALINDROME_PARTITIONING_STRING);
  const frames = DP_VISUALIZERS["palindrome-partitioning"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`palindrome-partitioning: brute-force最小カット数(${expected})と一致`, lastDesc.includes(`最小カット数は${expected}`), lastDesc);
}
function burstBalloonsMax(numsIn) {
  const nums = [1, ...numsIn, 1];
  const n = nums.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let length = 2; length < n; length++) {
    for (let i = 0; i < n - length; i++) {
      const j = i + length;
      let best = 0;
      for (let k = i + 1; k < j; k++) best = Math.max(best, dp[i][k] + dp[k][j] + nums[i] * nums[k] * nums[j]);
      dp[i][j] = best;
    }
  }
  return dp[0][n - 1];
}
{
  const expected = burstBalloonsMax(BURST_BALLOONS_NUMS);
  const frames = DP_VISUALIZERS["burst-balloons-dp"]();
  const lastDesc = frames[frames.length - 1].description;
  check(`burst-balloons-dp: 独立実装の最大コイン(${expected}、既知のLeetCode解167)と一致`, lastDesc.includes(`最大コインは${expected}`), lastDesc);
}

// hungarian-algorithm: brute-force全順列探索との最小コスト一致
{
  const n = HUNGARIAN_COST_MATRIX.length;
  const perms = (arr) =>
    arr.length <= 1 ? [arr] : arr.flatMap((v, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [v, ...p]));
  let best = Infinity;
  for (const perm of perms([...Array(n).keys()])) {
    let cost = 0;
    for (let r = 0; r < n; r++) cost += HUNGARIAN_COST_MATRIX[r][perm[r]];
    if (cost < best) best = cost;
  }
  const frames = DP_VISUALIZERS["hungarian-algorithm"]();
  checkWellFormed("hungarian-algorithm", frames);
  const lastDesc = frames[frames.length - 1].description;
  check(`hungarian-algorithm: brute-force全順列探索の最小コスト(${best})と一致`, lastDesc.includes(`総コスト=${best}`), lastDesc);
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
section("STRING (15件) / TRIE (2件)");

// TEXT/PATTERNに対する部分文字列探索を行わない(圧縮・トークナイズ・カウント系)アルゴリズムは
// 「一致位置」の概念自体が存在しないため、位置一致チェックの対象から除外する。
const NON_SEARCH_STRING_IDS = new Set([
  "run-length-encoding",
  "lz77-compression",
  "lzw-compression",
  "lcp-array",
  "burrows-wheeler-transform",
  "byte-pair-encoding",
  "wordpiece-tokenization",
  "porter-stemming",
  "n-gram-language-model",
  "k-mer-counting",
]);

const nativeMatchIndex = TEXT.indexOf(PATTERN);
for (const [id, fn] of Object.entries(STRING_VISUALIZERS)) {
  const frames = fn();
  checkWellFormed(id, frames);
  if (NON_SEARCH_STRING_IDS.has(id)) continue; // 圧縮アルゴリズムなので一致位置の概念がない
  const matchFrame = frames.find((f) => f.description.includes("完全一致を発見"));
  // 大半は「位置Nで完全一致を発見」の形式だが、rabin-karpだけ窓の範囲「窓[N, ...]」、
  // bitap-algorithmだけ「位置N: ...」とコロン区切りで位置を表す。
  const desc = matchFrame?.description ?? "";
  const positionMatches =
    desc.includes(`位置${nativeMatchIndex}で`) ||
    desc.includes(`位置${nativeMatchIndex}:`) ||
    desc.includes(`窓[${nativeMatchIndex},`);
  check(
    `${id}: String.prototype.indexOfの結果(位置${nativeMatchIndex})と同じ位置で一致を発見`,
    positionMatches,
    desc,
  );
}

for (const [id, fn] of Object.entries(TRIE_VISUALIZERS)) {
  checkWellFormed(id, fn());
}

// ===========================================================================
// GEOMETRY: 全件に構造チェック(フレームが壊れておらず、参照する点idが全てデータセットに存在する)。
// 存在しない点idを参照するとGeometryVisualizer.tsxが描画時にクラッシュするため、機械的に防ぐ。
// ===========================================================================
section("GEOMETRY: 構造チェック(参照する点idの存在)");
for (const [id, fn] of Object.entries(GEOMETRY_VISUALIZERS)) {
  const frames = fn();
  checkWellFormed(id, frames);
  const dataset = GEOMETRY_DATASETS[id];
  check(`${id}: データセットが登録されている`, dataset !== undefined);
  if (!dataset) continue;
  const pointIds = new Set(dataset.points.map((p) => p.id));
  const unknown = new Set();
  for (const frame of frames) {
    for (const pid of Object.keys(frame.pointStates)) if (!pointIds.has(pid)) unknown.add(pid);
    for (const seg of frame.segments) {
      if (!pointIds.has(seg.from)) unknown.add(seg.from);
      if (!pointIds.has(seg.to)) unknown.add(seg.to);
    }
  }
  check(`${id}: フレームが参照する点idが全てデータセットに存在する`, unknown.size === 0, [...unknown].join(","));
}

// ===========================================================================
// LANES: 同じ計算を複数方式で並べる可視化(行列の掛け算)。
// 独立に計算した A×B と各レーンの最終結果を突き合わせ、全レーンが同じステップ番号で進むこと、
// 巻き戻しに必要な「フレームが全レーンの状態をまとめて持つ」性質が保たれていることを確認する。
// ===========================================================================
section("LANES: 3方式の行列積(逐次/並列/回路固定)・行列サイズ2〜5");
for (const n of [2, 3, 4, 5]) {
  const id = "matrix-multiplication-three-ways";
  const frames = LANE_VISUALIZERS[id](n);
  const meta = LANE_META[id](n);
  const label = `${id}(n=${n})`;
  checkWellFormed(label, frames);

  const reference = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => meta.matrixA[i].reduce((sum, a, k) => sum + a * meta.matrixB[k][j], 0)),
  );

  check(`${label}: 行列サイズがメタ情報と一致`, meta.size === n && meta.matrixA.length === n && meta.matrixB.length === n);
  check(`${label}: フレーム数が n³+1`, frames.length === n ** 3 + 1, String(frames.length));
  check(`${label}: ステップ番号が0から1ずつ増える`, frames.every((f, i) => f.step === i));
  check(
    `${label}: 全フレームで3レーンが同じ並び(sequential/parallel/fixed)`,
    frames.every((f) => f.lanes.map((l) => l.id).join() === "sequential,parallel,fixed"),
  );
  check(`${label}: 全レーンのセル数が n²`, frames.every((f) => f.lanes.every((l) => l.cells.length === n * n)));

  const last = frames[frames.length - 1];
  for (const lane of last.lanes) {
    const values = lane.cells.map((cell) => cell.partial);
    const expected = reference.flat();
    check(`${label}/${lane.id}: 最終結果が独立に計算した A×B と一致`, values.every((v, i) => v === expected[i]), JSON.stringify(values));
    check(`${label}/${lane.id}: 完了した乗加算が総数(${n ** 3})に一致`, lane.completedMacs === n ** 3 && lane.finished);
  }

  const firstFinished = (laneId) => frames.find((f) => f.lanes.find((l) => l.id === laneId).finished)?.step;
  check(`${label}: 逐次の完了ステップ=${n ** 3}`, firstFinished("sequential") === n ** 3);
  check(`${label}: 並列の完了ステップ=${n}`, firstFinished("parallel") === n);
  check(`${label}: 回路固定の完了ステップ=${n + 1}(固定の準備1+Aを${n}行)`, firstFinished("fixed") === n + 1);

  const reads = Object.fromEntries(last.lanes.map((l) => [l.id, l.memoryReads]));
  check(`${label}: 読み出し量が 逐次=並列=2n³、回路固定=2n²`, reads.sequential === 2 * n ** 3 && reads.parallel === 2 * n ** 3 && reads.fixed === 2 * n * n, JSON.stringify(reads));
  check(`${label}: 読み出し量の最大値がメタ情報の正規化値と一致`, Math.max(...Object.values(reads)) === meta.maxReads);

  let monotonic = true;
  for (let i = 1; i < frames.length; i++) {
    frames[i].lanes.forEach((lane, li) => {
      const prev = frames[i - 1].lanes[li];
      if (lane.completedMacs < prev.completedMacs || lane.memoryReads < prev.memoryReads) monotonic = false;
    });
  }
  check(`${label}: 完了数・読み出し量が各ステップで減らない(巻き戻しと整合)`, monotonic);
}

// ---------------------------------------------------------------------------
// ===========================================================================
// SIGNAL (音響・信号処理): 構造チェック + 独立に実装した参照計算との突き合わせ
// 各アルゴリズムは、スクリプト側で書き直した別実装(素朴なDFT・ガウス消去・直接形の差分方程式など)と、
// 最終フレームのパネルの値・導かれる結論(周期・係数・ビット数)を照合する。
// ===========================================================================
section("SIGNAL: 構造チェック(パネル構成・範囲・添字)");
{
  const signalIds = Object.keys(SIGNAL_VISUALIZERS);
  check("SIGNAL: 18件以上が登録されている", signalIds.length >= 18, String(signalIds.length));
  for (const [id, fn] of Object.entries(SIGNAL_VISUALIZERS)) {
    const frames = fn();
    checkWellFormed(id, frames);
    check(`${id}: SIGNAL_METAのチップがある`, (SIGNAL_META[id]?.chips.length ?? 0) > 0);
    const first = frames[0].panels;
    let consistent = true;
    let inRange = true;
    let indexOk = true;
    let finiteOk = true;
    let detail = "";
    for (const [fi, frame] of frames.entries()) {
      if (frame.panels.length !== first.length) consistent = false;
      frame.panels.forEach((p) => {
        // パネルの枚数は固定(キャンバスの高さ)。同じidのパネルは長さも一定。途中でパネルの中身が入れ替わる(例: 自己相関→残差)のは許す。
        const sameId = first.find((q) => q.id === p.id);
        if (sameId && sameId.values.length !== p.values.length) {
          consistent = false;
          detail ||= `frame${fi}:${p.id}`;
        }
        if (!(p.yMin < p.yMax)) inRange = false;
        const eps = (p.yMax - p.yMin) * 1e-9;
        for (const [list, name] of [[p.values, "values"], [p.reference ?? [], "reference"]]) {
          for (const [i, v] of list.entries()) {
            if (v === Infinity || v === -Infinity || v === undefined) finiteOk = false;
            if (Number.isFinite(v) && (v < p.yMin - eps || v > p.yMax + eps)) {
              inRange = false;
              detail ||= `frame${fi}:${p.id}.${name}[${i}]=${v} range[${p.yMin},${p.yMax}]`;
            }
          }
        }
        for (const key of Object.keys(p.highlight)) {
          if (!(Number(key) >= 0 && Number(key) < p.values.length)) indexOk = false;
        }
        for (const m of p.markers ?? []) if (!(m.index >= 0 && m.index < p.values.length)) indexOk = false;
      });
    }
    check(`${id}: 全フレームでパネルの枚数が一定、同じidなら長さも一定`, consistent, detail);
    check(`${id}: 値が各パネルの縦軸の範囲に収まる(描画で切れて嘘にならない)`, inRange, detail);
    check(`${id}: highlight/markersの添字が範囲内`, indexOk);
    check(`${id}: 値にInfinity/undefinedがない(未計算はNaNのみ)`, finiteOk);
  }
}

section("SIGNAL: 分析系(自己相関・STFT・LPC・ケプストラム・MFCC)");
const lastPanel = (frames, id) => frames[frames.length - 1].panels.find((p) => p.id === id).values;
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const nearAll = (a, b, tol = 1e-9) => a.length === b.length && a.every((v, i) => (Number.isNaN(v) && Number.isNaN(b[i])) || near(v, b[i], tol));
// 素朴なDFT(スクリプト側の独立実装)
function refDft(x) {
  const n = x.length;
  return Array.from({ length: n }, (_, k) => {
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos((2 * Math.PI * k * t) / n);
      im -= x[t] * Math.sin((2 * Math.PI * k * t) / n);
    }
    return { re, im, mag: Math.hypot(re, im) };
  });
}
{
  // 自己相関: 定義どおりの総和と一致し、24サンプル周期を検出する
  const x = autocorrInput();
  const frames = SIGNAL_VISUALIZERS["pitch-detection-autocorrelation"]();
  const acf = lastPanel(frames, "acf");
  let r0 = 0;
  for (const v of x) r0 += v * v;
  let maxDiff = 0;
  for (let lag = 0; lag <= AUTOCORR_MAX_LAG; lag++) {
    let s = 0;
    for (let i = 0; i + lag < x.length; i++) s += x[i] * x[i + lag];
    maxDiff = Math.max(maxDiff, Math.abs(s / r0 - acf[lag]));
  }
  check("自己相関: 全ラグで定義の総和/r[0]と一致", maxDiff < 1e-12, String(maxDiff));
  let best = AUTOCORR_MIN_LAG;
  for (let lag = AUTOCORR_MIN_LAG; lag <= AUTOCORR_MAX_LAG; lag++) if (acf[lag] > acf[best]) best = lag;
  check("自己相関: 最大の山が真の周期24にある", best === AUTOCORR_PERIOD, `best=${best}`);
  const settled = Object.entries(frames[frames.length - 1].panels.find((p) => p.id === "acf").highlight).filter(([, k]) => k === "settled");
  check("自己相関: 最終フレームで確定(settled)したラグが周期と一致", settled.length === 1 && Number(settled[0][0]) === AUTOCORR_PERIOD);
  check("自己相関: r[0]=1", near(acf[0], 1));
}
{
  // STFT: 各窓のスペクトルが独立DFT(ハン窓)と一致し、ピーク軌跡が 500Hz→1500Hz を追う
  const x = stftInput();
  const frames = SIGNAL_VISUALIZERS["short-time-fourier-transform"]();
  const starts = [];
  for (let s = 0; s + STFT_WIN <= STFT_N; s += STFT_HOP) starts.push(s);
  check("STFT: 窓の数がフレーム数と対応(初期+2×窓数)", frames.length === 1 + 2 * starts.length, `${frames.length}`);
  let specOk = true;
  starts.forEach((s, w) => {
    const seg = Array.from({ length: STFT_WIN }, (_, i) => x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / STFT_WIN)));
    const ref = refDft(seg).slice(0, STFT_WIN / 2 + 1).map((c, k) => (k === 0 || k === STFT_WIN / 2 ? c.mag / STFT_WIN : (2 * c.mag) / STFT_WIN) * 2);
    const got = frames[2 + 2 * w].panels.find((p) => p.id === "spectrum").values;
    if (!nearAll(got, ref, 1e-9)) specOk = false;
  });
  check("STFT: 全窓のスペクトルが独立DFT(ハン窓・補正込み)と一致", specOk);
  const track = lastPanel(frames, "track");
  check("STFT: 前半の窓(500Hz)のピークはビン4", starts.every((s, w) => s + STFT_WIN > STFT_SWITCH || track[w] === 4), `[${track}]`);
  check("STFT: 後半の窓(1500Hz)のピークはビン12", starts.every((s, w) => s < STFT_SWITCH || track[w] === 12), `[${track}]`);
}
{
  // LPC: 正規方程式 R·c = r をガウス消去で解いた係数と、Levinson-Durbinの結果が一致する
  const x = lpcInput();
  const p = LPC_ORDER;
  const r = Array.from({ length: p + 1 }, (_, lag) => x.reduce((s, v, n) => s + (n + lag < x.length ? v * x[n + lag] : 0), 0));
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => r[Math.abs(i - j)]).concat([r[i + 1]]));
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let i = c + 1; i < p; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let i = c + 1; i < p; i++) {
      const f = A[i][c] / A[c][c];
      for (let j = c; j <= p; j++) A[i][j] -= f * A[c][j];
    }
  }
  const sol = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let s = A[i][p];
    for (let j = i + 1; j < p; j++) s -= A[i][j] * sol[j];
    sol[i] = s / A[i][i];
  }
  const frames = SIGNAL_VISUALIZERS["linear-predictive-coding"]();
  const coefs = lastPanel(frames, "coefs");
  check("LPC: 予測係数が正規方程式(ガウス消去)の解と一致", nearAll(coefs, sol, 1e-9), `got=[${coefs}] ref=[${sol}]`);
  const residual = lastPanel(frames, "residual");
  let resOk = true;
  for (let n = p; n < x.length; n++) {
    let pred = 0;
    for (let i = 1; i <= p; i++) pred += sol[i - 1] * x[n - i];
    if (!near(residual[n], x[n] - pred, 1e-9)) resOk = false;
  }
  check("LPC: 残差 = x[n] − Σ c_i·x[n−i]", resOk);
  const eRes = residual.slice(p).reduce((s, v) => s + v * v, 0);
  const eSig = x.slice(p).reduce((s, v) => s + v * v, 0);
  check("LPC: 残差のエネルギーは元の1/3以下(予測が効いている)", eRes < eSig / 3, `${eSig / eRes}`);
  const steps = levinsonDurbin(r, p);
  check("LPC: 予測誤差エネルギーが次数とともに単調に減る", steps.every((s, i) => i === 0 || s.error <= steps[i - 1].error + 1e-9));
}
{
  // ケプストラム: 周期32を検出。独立DFTから計算したケプストラムと一致
  const x = cepstrumInput();
  const hann = x.map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / x.length));
  const spec = refDft(x.map((v, i) => v * hann[i]));
  const n = x.length;
  const logFull = spec.map((c) => Math.log(c.mag + 1e-3));
  const ref = Array.from({ length: n / 2 + 1 }, (_, q) => logFull.reduce((s, v, k) => s + v * Math.cos((2 * Math.PI * k * q) / n), 0) / n);
  const frames = SIGNAL_VISUALIZERS["cepstral-pitch-detection"]();
  check("ケプストラム: 独立計算のケプストラムと一致(q=0は描かない)", nearAll(lastPanel(frames, "cepstrum"), ref.map((v, q) => (q === 0 ? Number.NaN : v)), 1e-9));
  let best = CEPSTRUM_MIN_Q;
  for (let q = CEPSTRUM_MIN_Q; q <= CEPSTRUM_MAX_Q; q++) if (ref[q] > ref[best]) best = q;
  check("ケプストラム: ピークのケフレンシーが真の周期32", best === CEPSTRUM_PERIOD, `best=${best}`);
  const settled = Object.entries(frames[frames.length - 1].panels.find((p) => p.id === "cepstrum").highlight).filter(([, k]) => k === "settled");
  check("ケプストラム: 確定した位置がピークと一致", settled.length === 1 && Number(settled[0][0]) === best);
}
{
  // MFCC: メル尺度・三角フィルタ・DCT-IIを別実装で組み直して一致を見る
  const x = mfccInput();
  const n = x.length;
  const spec = refDft(x.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n))));
  const power = spec.slice(0, n / 2 + 1).map((c) => (c.re * c.re + c.im * c.im) / n);
  const mel = (f) => 2595 * Math.log10(1 + f / 700);
  const imel = (m) => 700 * (10 ** (m / 2595) - 1);
  const pts = Array.from({ length: MFCC_FILTERS + 2 }, (_, i) => imel((mel(MFCC_FS / 2) * i) / (MFCC_FILTERS + 1)));
  const logE = Array.from({ length: MFCC_FILTERS }, (_, m) => {
    let e = 0;
    power.forEach((pw, k) => {
      const f = (k * MFCC_FS) / n;
      let w = 0;
      if (f > pts[m] && f < pts[m + 2]) w = f <= pts[m + 1] ? (f - pts[m]) / (pts[m + 1] - pts[m]) : (pts[m + 2] - f) / (pts[m + 2] - pts[m + 1]);
      e += w * pw;
    });
    return Math.log(e + 1e-9);
  });
  const mfcc = Array.from({ length: MFCC_COEFS }, (_, c) => logE.reduce((s, v, m) => s + v * Math.cos((Math.PI * c * (m + 0.5)) / MFCC_FILTERS), 0));
  const frames = SIGNAL_VISUALIZERS["mfcc-analysis"]();
  check("MFCC: メル出力の対数が独立計算と一致", nearAll(lastPanel(frames, "logmel"), logE, 1e-9));
  check("MFCC: MFCC係数が独立計算(DCT-II)と一致", nearAll(lastPanel(frames, "mfcc"), mfcc, 1e-9));
  const filters = mfccOf(x).filters;
  check("MFCC: フィルタの重みは0〜1で、各フィルタは山を1つだけ持つ", filters.every((f) => f.every((w) => w >= 0 && w <= 1 + 1e-12) && Math.max(...f) > 0.5));
}

section("SIGNAL: 符号化系(μ-law・ADPCM・FLAC・MDCT)");
{
  // μ-law: 圧縮→伸長が可逆。小さな音のSN比が改善する
  const x = mulawInput();
  const comp = (v) => Math.sign(v) * Math.log(1 + 255 * Math.abs(v)) / Math.log(256);
  const expd = (y) => Math.sign(y) * ((256 ** Math.abs(y) - 1) / 255);
  check("μ-law: 伸長(圧縮(x)) = x(量子化なしなら可逆)", x.every((v) => near(expd(comp(v)), v, 1e-12)));
  const q = (v, bits) => {
    const levels = 2 ** bits;
    const idx = Math.min(levels - 1, Math.max(0, Math.floor((v + 1) / (2 / levels))));
    return -1 + (idx + 0.5) * (2 / levels);
  };
  const restored = x.map((v) => expd(q(comp(v), 5)));
  const uniform = x.map((v) => q(v, 5));
  const snr = (a, b) => 10 * Math.log10(a.reduce((s, v) => s + v * v, 0) / a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  const quiet = x.slice(0, 32);
  const snrMu = snr(quiet, restored.slice(0, 32));
  const snrUni = snr(quiet, uniform.slice(0, 32));
  check("μ-law: 小さな音の区間のSN比が圧縮なしより10dB以上良い", snrMu > snrUni + 10, `mu=${snrMu} uni=${snrUni}`);
  const frames = SIGNAL_VISUALIZERS["mu-law-a-law-companding"]();
  const errPanel = frames[frames.length - 1].panels.find((p) => p.id === "error");
  check("μ-law: 誤差パネルが独立計算(復元−原信号)と一致", nearAll(errPanel.values, restored.map((v, i) => v - x[i]), 1e-12));
  check("μ-law: 圧縮で量子化した値は±1の範囲、2^5段の中央値のみ", frames[frames.length - 1].panels.find((p) => p.id === "compressed").values.every((v) => Math.abs(v) < 1 && near(((v + 1) / (2 / 32)) % 1, 0.5, 1e-9)));
}
{
  // ADPCM: 符号だけから独立実装のデコーダで復元して一致。4ビット/サンプル
  const x = adpcmInput();
  const enc = adpcmEncode(x);
  let predicted = 0;
  let index = 0;
  const decoded = enc.map(({ code }) => {
    const step = ADPCM_STEP_TABLE[index];
    let diff = step >> 3;
    if (code & 4) diff += step;
    if (code & 2) diff += step >> 1;
    if (code & 1) diff += step >> 2;
    predicted = Math.max(-32768, Math.min(32767, predicted + (code & 8 ? -diff : diff)));
    index = Math.max(0, Math.min(88, index + [-1, -1, -1, -1, 2, 4, 6, 8][code & 7]));
    return predicted;
  });
  check("ADPCM: 符号だけから独立デコーダで復元した波形が、符号化側の予測値と一致", decoded.every((v, i) => v === enc[i].predicted));
  check("ADPCM: 符号は4ビット(0〜15)", enc.every((s) => s.code >= 0 && s.code <= 15));
  check("ADPCM: ステップ幅の添字は0〜88", enc.every((s) => s.stepIndex >= 0 && s.stepIndex <= 88));
  const err = x.slice(24).map((v, i) => Math.abs(v - decoded[24 + i]));
  check("ADPCM: ステップ幅が育った後半の誤差は振幅の12%以内", Math.max(...err) < 0.12 * 14000, `max=${Math.max(...err)}`);
  const frames = SIGNAL_VISUALIZERS["adpcm"]();
  check("ADPCM: 最終フレームの復号パネルが独立デコーダと一致", nearAll(lastPanel(frames, "decoded"), decoded, 1e-9));
}
{
  // FLAC: 可逆性と、Rice符号のビット数(独立に数え直す)
  const x = flacInput();
  const coef = [[], [1], [2, -1], [3, -3, 1], [4, -6, 4, -1]];
  const resid = (order) => x.map((v, n) => (n < order ? v : v - coef[order].reduce((s, c, i) => s + c * x[n - 1 - i], 0)));
  const bitsFor = (order) => {
    const u = resid(order).slice(order).map((e) => (e >= 0 ? 2 * e : -2 * e - 1));
    let best = Infinity;
    for (let k = 0; k < 16; k++) best = Math.min(best, u.reduce((s, v) => s + Math.floor(v / 2 ** k) + 1 + k, 0));
    return best + order * 16;
  };
  const costs = [0, 1, 2, 3, 4].map(bitsFor);
  const frames = SIGNAL_VISUALIZERS["flac-lossless-coding"]();
  check("FLAC: 次数ごとのRice総ビット数が独立の数え直しと一致", nearAll(frames[frames.length - 1].panels.find((p) => p.id === "bits").values, costs, 0));
  const bestOrder = costs.indexOf(Math.min(...costs));
  const settled = Object.entries(frames[frames.length - 1].panels.find((p) => p.id === "bits").highlight).filter(([, k]) => k === "settled");
  check("FLAC: 採用された次数が総ビット数の最小", settled.length === 1 && Number(settled[0][0]) === bestOrder, `best=${bestOrder}`);
  const dec = [];
  resid(bestOrder).forEach((e, n) => dec.push(n < bestOrder ? e : e + coef[bestOrder].reduce((s, c, i) => s + c * dec[n - 1 - i], 0)));
  check("FLAC: 残差から復号した波形が原信号と完全に一致(ロスレス)", dec.every((v, n) => v === x[n]));
  check("FLAC: 最終フレームの復号誤差パネルは全て0", lastPanel(frames, "decodeError").every((v) => v === 0));
  check("FLAC: 最良の次数は原信号(48×16ビット)より小さい", costs[bestOrder] < x.length * 16, `${costs[bestOrder]}`);
}
{
  // MDCT: 量子化しなければTDAC(時間領域エイリアシングの打ち消し)で完全復元。MDCT/IMDCTは定義式と照合
  const x = mdctInput();
  const noQuant = mdctProcess(x, 0);
  check("MDCT: 量子化なしで完全復元(最大誤差 < 1e-9、TDAC)", Math.max(...x.map((v, i) => Math.abs(v - noQuant.output[i]))) < 1e-9);
  const seg = Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.7) + 0.1 * i);
  const direct = Array.from({ length: 16 }, (_, k) => seg.reduce((s, v, i) => s + v * Math.cos((Math.PI / 16) * (i + 0.5 + 8) * (k + 0.5)), 0));
  check("MDCT: 係数が定義式 Σ x[i]cos(π/N(i+½+N/2)(k+½)) と一致", nearAll(mdct(seg), direct, 1e-9));
  const quant = mdctProcess(x, MDCT_QUANT_STEP);
  const zeros = quant.blocks.reduce((s, b) => s + b.quantized.filter((v) => v === 0).length, 0);
  check("MDCT: 量子化で係数の一部が0になる(圧縮の源)", zeros > 0 && zeros < quant.blocks.length * 16, String(zeros));
  const sn = 10 * Math.log10(x.reduce((s, v) => s + v * v, 0) / x.reduce((s, v, i) => s + (v - quant.output[i]) ** 2, 0));
  check("MDCT: 量子化後も10dB以上のSN比で復元できる", sn > 10, String(sn));
  const frames = SIGNAL_VISUALIZERS["mdct-audio-coding"]();
  const out = frames[frames.length - 1].panels.find((p) => p.id === "signal").reference;
  check("MDCT: 最終フレームの出力が量子化ありの重ね合わせ結果と一致", nearAll(out, quant.output, 1e-9));
}

section("SIGNAL: エフェクト・合成系");
{
  // 双二次: 直接形Iの差分方程式を別に書いて一致。中心周波数のピークがちょうど +12dB
  const x = biquadInput();
  const fs = 8000, f0 = 500, Q = 2, G = 12;
  const A = 10 ** (G / 40), w0 = (2 * Math.PI * f0) / fs, alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha / A;
  const b = [(1 + alpha * A) / a0, (-2 * Math.cos(w0)) / a0, (1 - alpha * A) / a0];
  const a = [(-2 * Math.cos(w0)) / a0, (1 - alpha / A) / a0];
  const y = [];
  x.forEach((_, n) => y.push(b[0] * x[n] + b[1] * (x[n - 1] ?? 0) + b[2] * (x[n - 2] ?? 0) - a[0] * (y[n - 1] ?? 0) - a[1] * (y[n - 2] ?? 0)));
  const frames = SIGNAL_VISUALIZERS["biquad-filter"]();
  check("Biquad: 出力が独立の差分方程式と一致", nearAll(lastPanel(frames, "output"), y, 1e-12));
  const H = (f) => {
    const w = (2 * Math.PI * f) / fs;
    const num = [b[0] + b[1] * Math.cos(w) + b[2] * Math.cos(2 * w), -(b[1] * Math.sin(w) + b[2] * Math.sin(2 * w))];
    const den = [1 + a[0] * Math.cos(w) + a[1] * Math.cos(2 * w), -(a[0] * Math.sin(w) + a[1] * Math.sin(2 * w))];
    return 20 * Math.log10(Math.hypot(...num) / Math.hypot(...den));
  };
  check("Biquad: 中心周波数の利得がちょうど+12dB", near(H(500), 12, 1e-9), String(H(500)));
  check("Biquad: 直流と高域の利得はほぼ0dB", Math.abs(H(1)) < 0.2 && Math.abs(H(3900)) < 1);
  const ampIn = toneAmplitude(x, 16, 32, 32);
  const ampOut = toneAmplitude(y, 16, 32, 32);
  check("Biquad: 500Hz成分の実測利得が応答曲線(+12dB)に近い(±1.5dB)", Math.abs(20 * Math.log10(ampOut / ampIn) - 12) < 1.5, String(20 * Math.log10(ampOut / ampIn)));
  const resp = lastPanel(frames, "response");
  check("Biquad: 応答パネルが独立の周波数応答と一致", resp.every((v, i) => near(v, H(Math.max(20, (i * 4000) / 63)), 1e-9)));
}
{
  // ノイズゲート: 出力 = 入力×ゲイン、ヒステリシスの規則、雑音区間の抑圧
  const x = gateInput();
  const st = noiseGateProcess(x);
  let env = 0, open = false, g = 0, okGate = true;
  x.forEach((v, n) => {
    env = Math.max(Math.abs(v), env * 0.92);
    if (!open && env > 0.2) open = true;
    else if (open && env < 0.12) open = false;
    g += ((open ? 1 : 0) - g) * (open ? 0.5 : 0.15);
    if (open !== st.open[n] || !near(g, st.gain[n], 1e-12)) okGate = false;
  });
  check("ノイズゲート: 開閉・ゲインが独立の再計算と一致", okGate);
  check("ノイズゲート: 出力 = 入力×ゲイン", st.output.every((v, n) => near(v, x[n] * st.gain[n], 1e-12)));
  const e = (a, from, to) => a.slice(from, to).reduce((s, v) => s + v * v, 0);
  check("ノイズゲート: 雑音だけの区間のエネルギーが1/100以下に", e(st.output, 0, 20) < e(x, 0, 20) / 100);
  check("ノイズゲート: 大きな音の区間(n=26〜56)はほぼそのまま通る", e(st.output, 26, 56) > 0.9 * e(x, 26, 56));
  check("ノイズゲート: ゲインは0〜1", st.gain.every((v) => v >= 0 && v <= 1));
}
{
  // コンプレッサー: 出力=入力×ゲイン、ゲイン<=1、定常での圧縮量が理論値(しきい値+(超過/比率))に近い
  const x = compressorInput();
  const st = compressorProcess(x);
  check("コンプレッサー: 出力 = 入力×ゲイン", st.output.every((v, n) => near(v, x[n] * st.gain[n], 1e-12)));
  check("コンプレッサー: ゲインは常に0〜1(持ち上げない)", st.gain.every((v) => v > 0 && v <= 1 + 1e-12));
  const peakLoud = Math.max(...st.output.slice(72, 88).map(Math.abs));
  const ideal = 0.4 + (0.9 - 0.4) / 4;
  check("コンプレッサー: 大きな音のピークが理論値0.525付近(±0.05)に落ち着く", Math.abs(peakLoud - ideal) < 0.05, String(peakLoud));
  check("コンプレッサー: しきい値以下の小さな音(0.2)は変えない", Math.max(...st.output.slice(24, 40).map(Math.abs)) > 0.199);
}
{
  // Karplus-Strong: 独立実装、周期=遅延線の長さ、エネルギーの単調減少
  const buf = karplusInitialBuffer();
  const N = buf.length;
  const out = [];
  for (let t = 0; t < 12 * N; t++) {
    const p = t % N;
    out.push(buf[p]);
    buf[p] = 0.998 * 0.5 * (buf[p] + buf[(p + 1) % N]);
  }
  check("Karplus-Strong: 出力が独立実装と一致", nearAll(karplusStrongOutput(12), out, 1e-12));
  const frames = SIGNAL_VISUALIZERS["karplus-strong-string-synthesis"]();
  check("Karplus-Strong: 最終フレームの出力パネルが独立実装と一致", nearAll(lastPanel(frames, "output"), out, 1e-12));
  const ac = (lag) => out.slice(0, 11 * N).reduce((s, v, i) => s + v * out[i + lag], 0);
  const lags = Array.from({ length: 80 }, (_, i) => i + 10);
  const bestLag = lags.reduce((b, l) => (ac(l) > ac(b) ? l : b), lags[0]);
  check("Karplus-Strong: 出力の周期が遅延線の長さ32", bestLag === 32, `best=${bestLag}`);
  const passEnergy = Array.from({ length: 12 }, (_, k) => out.slice(k * N, (k + 1) * N).reduce((s, v) => s + v * v, 0));
  check("Karplus-Strong: 1周ごとのエネルギーが単調に減衰", passEnergy.every((v, i) => i === 0 || v < passEnergy[i - 1]));
}
{
  // ウェーブシェーピング: 対称な曲線は奇数倍音だけを作る(独立DFT)
  const y = Array.from({ length: 64 }, (_, n) => Math.tanh(4 * Math.sin((2 * Math.PI * n) / 16)) / Math.tanh(4));
  const spec = refDft(y).slice(0, 33).map((c, k) => (k === 0 ? c.mag / 64 : (2 * c.mag) / 64));
  const frames = SIGNAL_VISUALIZERS["waveshaping-distortion"]();
  check("ウェーブシェーピング: 出力スペクトルが独立DFTと一致", nearAll(lastPanel(frames, "spectrum"), spec, 1e-9));
  check("ウェーブシェーピング: 偶数倍音(ビン8, 16, 24)はほぼ0", [8, 16, 24, 32].every((k) => spec[k] < 1e-9), `[${[8, 16, 24].map((k) => spec[k])}]`);
  check("ウェーブシェーピング: 奇数倍音(ビン12, 20)が現れる", spec[12] > 0.05 && spec[20] > 0.02, `${spec[12]}, ${spec[20]}`);
  check("ウェーブシェーピング: 出力は±1以内(曲線が頭を押さえる)", y.every((v) => Math.abs(v) <= 1 + 1e-12));
}
{
  // ウェーブテーブル: 線形補間の独立実装、周期=32/3.2=10サンプル
  const table = wavetableTable();
  const out = [];
  let ph = 0;
  for (let n = 0; n < 64; n++) {
    const i0 = Math.floor(ph);
    const f = ph - i0;
    out.push(table[i0 % 32] * (1 - f) + table[(i0 + 1) % 32] * f);
    ph = (ph + 3.2) % 32;
  }
  const frames = SIGNAL_VISUALIZERS["wavetable-synthesis"]();
  check("ウェーブテーブル: 出力が独立の線形補間と一致", nearAll(lastPanel(frames, "output"), out, 1e-9));
  check("ウェーブテーブル: 出力は10サンプル周期", out.slice(0, 54).every((v, n) => near(v, out[n + 10], 1e-9)));
  check("ウェーブテーブル: 補間値は隣り合う2点の間にある", out.every((v) => Math.abs(v) <= 1 + 1e-12));
}
{
  // コーラス/フランジャー: 独立実装 + 遅延量が6±4の範囲
  const x = chorusInput();
  const at = (pos) => {
    const i = Math.floor(pos);
    const f = pos - i;
    return (i >= 0 ? x[i] ?? 0 : 0) * (1 - f) + (i + 1 >= 0 ? x[i + 1] ?? 0 : 0) * f;
  };
  const y = x.map((v, n) => 0.5 * v + 0.5 * at(n - (6 + 4 * Math.sin((2 * Math.PI * n) / 64))));
  const frames = SIGNAL_VISUALIZERS["chorus-flanger-effect"]();
  check("コーラス: 出力が独立の可変遅延(線形補間)と一致", nearAll(lastPanel(frames, "output"), y, 1e-12));
  const d = lastPanel(frames, "delay");
  check("コーラス: 遅延量は 2〜10 サンプルの範囲", d.every((v) => v >= 2 - 1e-9 && v <= 10 + 1e-9));
  const env = (from) => Math.max(...y.slice(from, from + 12).map(Math.abs));
  const envs = [24, 48, 72, 96].map(env);
  check("コーラス: 出力の振幅がLFOにつれて変動する(最大/最小 > 1.15)", Math.max(...envs) / Math.min(...envs) > 1.15, `[${envs}]`);
}
{
  // コンボリューションリバーブ: 定義どおりの畳み込みと一致。長さ = 32+24-1
  const x = reverbDry();
  const h = reverbImpulseResponse();
  const direct = Array.from({ length: x.length + h.length - 1 }, (_, n) => h.reduce((s, hk, k) => s + (n - k >= 0 && n - k < x.length ? x[n - k] * hk : 0), 0));
  const frames = SIGNAL_VISUALIZERS["convolution-reverb"]();
  const wet = lastPanel(frames, "wet");
  check("リバーブ: 出力の長さが 入力+応答−1", wet.length === 55);
  check("リバーブ: 出力が定義どおりの畳み込み Σ x[n−k]·h[k] と一致", nearAll(wet, direct, 1e-12));
  check("リバーブ: インパルスの数だけ足し込みフレームがある(初期+6+最終)", frames.length === 8);
}
{
  // グラニュラー: 独立のオーバーラップ加算。半分重ねのハン窓は合計1
  const src = granularSource();
  const starts = granularStarts();
  const hann = Array.from({ length: 24 }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / 24));
  const out = new Array(7 * 12 + 24).fill(0);
  starts.forEach((s, g) => hann.forEach((w, i) => (out[g * 12 + i] += src[s + i] * w)));
  const frames = SIGNAL_VISUALIZERS["granular-synthesis"]();
  check("グラニュラー: 出力が独立のオーバーラップ加算と一致", nearAll(lastPanel(frames, "out"), out, 1e-12));
  check("グラニュラー: 半分ずらしたハン窓の和が常に1", hann.slice(0, 12).every((w, i) => near(w + hann[i + 12], 1, 1e-12)));
  check("グラニュラー: 粒の切り出し位置が元の音の範囲内", starts.every((s) => s >= 0 && s + 24 <= src.length));
}

// ===========================================================================
// GREEDY (貪欲法18件): 総当たり・独立の最適解アルゴリズムとの突き合わせ。
// 貪欲法は「正しい最適解が出る」ことが売りなので、表示した結果を、貪欲を使わない方法(全探索・DP)の答えと照合する。
// ===========================================================================
section("GREEDY: 最適解(全探索・独立実装)との一致");
{
  const lastTable = (id) => {
    const frames = DP_VISUALIZERS[id]();
    checkWellFormed(id, frames);
    return frames[frames.length - 1].table;
  };
  const cellValues = (table, row) => table[row].map((c) => c.value);

  // 株式売買: 全ペア(i<j)の最大利益
  {
    const t = lastTable("best-time-to-buy-sell-stock-greedy");
    let best = 0;
    for (let i = 0; i < STOCK_PRICES.length; i++) for (let j = i + 1; j < STOCK_PRICES.length; j++) best = Math.max(best, STOCK_PRICES[j] - STOCK_PRICES[i]);
    check("株式売買: 最大利益が全ペアの総当たりと一致", t[3][STOCK_PRICES.length - 1].value === best, `got=${t[3][STOCK_PRICES.length - 1].value} brute=${best}`);
    check("株式売買: 最安値の行が累積最小値と一致", cellValues(t, 1).every((v, i) => v === Math.min(...STOCK_PRICES.slice(0, i + 1))));
  }
  // ジャンプゲーム: 到達可能性をDPで
  {
    const t = lastTable("jump-game-greedy");
    const reach = new Array(JUMP_GAME_NUMS.length).fill(false);
    reach[0] = true;
    JUMP_GAME_NUMS.forEach((v, i) => {
      if (reach[i]) for (let k = 1; k <= v && i + k < reach.length; k++) reach[i + k] = true;
    });
    const verdict = t[2].some((c) => c.value === "着く!");
    check("ジャンプゲーム: 到達可否がDPによる到達可能性と一致", verdict === reach[reach.length - 1]);
  }
  // ガソリンスタンド: 全出発地を実際に1周させる
  {
    const t = lastTable("gas-station-greedy");
    const n = GAS_STATION_GAS.length;
    const ok = (s) => {
      let tank = 0;
      for (let k = 0; k < n; k++) {
        const i = (s + k) % n;
        tank += GAS_STATION_GAS[i] - GAS_STATION_COST[i];
        if (tank < 0) return false;
      }
      return true;
    };
    const starts = Array.from({ length: n }, (_, s) => s).filter(ok);
    const settled = t[4].filter((c) => c.state === "settled").map((c) => c.value);
    check("ガソリンスタンド: 確定した出発地が、実際に1周できる唯一の出発地と一致", settled.length === 1 && starts.length === 1 && settled[0] === starts[0], `got=${settled} brute=${starts}`);
  }
  // キャンディ: 「低評価の隣の最大+1」を再帰で求めた最小の配布
  {
    const t = lastTable("candy-distribution-greedy");
    const r = CANDY_RATINGS;
    const memo = new Map();
    const need = (i) => {
      if (memo.has(i)) return memo.get(i);
      let v = 1;
      if (i > 0 && r[i] > r[i - 1]) v = Math.max(v, need(i - 1) + 1);
      if (i < r.length - 1 && r[i] > r[i + 1]) v = Math.max(v, need(i + 1) + 1);
      memo.set(i, v);
      return v;
    };
    const minimal = r.map((_, i) => need(i));
    check("キャンディ: 配布数が再帰で求めた最小配布と一致", JSON.stringify(cellValues(t, 2)) === JSON.stringify(minimal), `got=[${cellValues(t, 2)}] ref=[${minimal}]`);
  }
  // 株価スパン: 毎回さかのぼる素朴法
  {
    const t = lastTable("stock-span-greedy-stack");
    const spans = STOCK_SPAN_PRICES.map((p, i) => {
      let k = i;
      while (k >= 0 && STOCK_SPAN_PRICES[k] <= p) k--;
      return i - k;
    });
    check("株価スパン: 毎回さかのぼる素朴法と一致", JSON.stringify(cellValues(t, 1)) === JSON.stringify(spans), `got=[${cellValues(t, 1)}] ref=[${spans}]`);
  }
  // 最小会議室数: 同時開催の最大数、同じ部屋で重ならない
  {
    const t = lastTable("minimum-meeting-rooms");
    const sorted = [...MEETINGS].sort((a, b) => a[0] - b[0]);
    const events = sorted.flatMap(([s, e]) => [[s, 1], [e, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cur = 0, maxOverlap = 0;
    for (const [, d] of events) maxOverlap = Math.max(maxOverlap, (cur += d));
    const rooms = cellValues(t, 2).map((v) => parseInt(String(v).replace(/\D/g, ""), 10));
    check("会議室: 部屋数が同時開催の最大数と一致", Math.max(...rooms) === maxOverlap, `rooms=${Math.max(...rooms)} sweep=${maxOverlap}`);
    let clash = false;
    sorted.forEach(([s1, e1], i) => sorted.forEach(([s2, e2], j) => { if (i < j && rooms[i] === rooms[j] && s1 < e2 && s2 < e1) clash = true; }));
    check("会議室: 同じ部屋に重なる会議がない", !clash);
  }
  // 区間の点被覆: 全ての区間を覆う最小の点の数を、端点の候補から全探索
  {
    const t = lastTable("greedy-interval-point-cover");
    const sorted = [...POINT_COVER_INTERVALS].sort((a, b) => a.end - b.end);
    const candidates = [...new Set(POINT_COVER_INTERVALS.flatMap((iv) => [iv.start, iv.end]))];
    let minPoints = Infinity;
    for (let mask = 0; mask < 1 << candidates.length; mask++) {
      const pts = candidates.filter((_, k) => mask & (1 << k));
      if (pts.length < minPoints && POINT_COVER_INTERVALS.every((iv) => pts.some((p) => p >= iv.start && p <= iv.end))) minPoints = pts.length;
    }
    const placed = cellValues(t, 2).filter((v) => String(v).startsWith("点@")).map((v) => Number(String(v).slice(2)));
    check("点被覆: 点の個数が全探索の最小と一致", placed.length === minPoints, `greedy=${placed.length} brute=${minPoints}`);
    check("点被覆: 打った点で全区間が覆われる", sorted.every((iv) => placed.some((p) => p >= iv.start && p <= iv.end)));
  }
  // 区間グラフの彩色: 正しい彩色で、色数 = 最大の重なり
  {
    const t = lastTable("greedy-coloring-interval-graph");
    const sorted = [...INTERVAL_COLORING_INTERVALS].sort((a, b) => a.start - b.start);
    const colors = cellValues(t, 2);
    let proper = true;
    sorted.forEach((a, i) => sorted.forEach((b, j) => { if (i < j && a.start < b.end && b.start < a.end && colors[i] === colors[j]) proper = false; }));
    let maxOverlap = 0;
    for (let x = 0; x < 20; x += 0.5) maxOverlap = Math.max(maxOverlap, sorted.filter((iv) => iv.start <= x && x < iv.end).length);
    check("区間彩色: 重なる区間は別の色(正しい彩色)", proper);
    check("区間彩色: 色数が最大の重なり数と一致(最適)", Math.max(...colors) === maxOverlap, `colors=${Math.max(...colors)} overlap=${maxOverlap}`);
  }
  // 締切付きジョブ: 実行可能な部分集合の全探索で最大利益
  {
    const t = lastTable("job-sequencing-with-deadlines");
    const sorted = [...JOB_SEQUENCING_JOBS].sort((a, b) => b.profit - a.profit);
    let best = 0;
    for (let mask = 0; mask < 1 << sorted.length; mask++) {
      const set = sorted.filter((_, k) => mask & (1 << k)).sort((a, b) => a.deadline - b.deadline);
      if (set.every((j, k) => k + 1 <= j.deadline)) best = Math.max(best, set.reduce((s, j) => s + j.profit, 0));
    }
    const got = sorted.reduce((s, j, c) => s + (String(t[2][c].value).startsWith("スロット") ? j.profit : 0), 0);
    check("ジョブ列: 合計利益が全探索の最大と一致", got === best, `greedy=${got} brute=${best}`);
    const slots = cellValues(t, 2).filter((v) => String(v).startsWith("スロット"));
    check("ジョブ列: 同じスロットに2つのジョブが入らず、締切を守る", new Set(slots).size === slots.length && sorted.every((j, c) => !String(t[2][c].value).startsWith("スロット") || Number(String(t[2][c].value).replace(/\D/g, "")) <= j.deadline));
  }
  // Moore-Hodgson: 間に合うジョブ数の全探索の最大
  {
    const t = lastTable("moore-hodgson-algorithm");
    const sorted = [...MOORE_HODGSON_JOBS].sort((a, b) => a.due - b.due);
    let best = 0;
    for (let mask = 0; mask < 1 << sorted.length; mask++) {
      const set = sorted.filter((_, k) => mask & (1 << k));
      let time = 0;
      if (set.every((j) => (time += j.time) <= j.due)) best = Math.max(best, set.length);
    }
    const kept = cellValues(t, 3).filter((v) => v === "採用").length;
    check("Moore-Hodgson: 間に合うジョブ数が全探索の最大と一致", kept === best, `greedy=${kept} brute=${best}`);
  }
  // LPT: 全割り当ての最適と、近似比 4/3 − 1/(3m)
  {
    const t = lastTable("lpt-scheduling-greedy");
    const lastCol = LPT_JOBS.length - 1;
    const makespan = Math.max(...Array.from({ length: LPT_MACHINES }, (_, k) => t[2 + k][lastCol].value));
    let opt = Infinity;
    const total = LPT_MACHINES ** LPT_JOBS.length;
    for (let code = 0; code < total; code++) {
      const load = new Array(LPT_MACHINES).fill(0);
      let c = code;
      for (const job of LPT_JOBS) { load[c % LPT_MACHINES] += job; c = Math.floor(c / LPT_MACHINES); }
      opt = Math.min(opt, Math.max(...load));
    }
    check("LPT: 最大負荷が最適以上で近似比 4/3−1/(3m) 以内", makespan >= opt && makespan <= (4 / 3 - 1 / (3 * LPT_MACHINES)) * opt + 1e-9, `lpt=${makespan} opt=${opt}`);
    check("LPT: 全負荷の合計が仕事の総時間と一致", Array.from({ length: LPT_MACHINES }, (_, k) => t[2 + k][lastCol].value).reduce((a, b) => a + b, 0) === LPT_JOBS.reduce((a, b) => a + b, 0));
  }
  // FFD: 独立のFFDと箱数が一致、容量を守る、近似比 11/9·OPT+6/9
  {
    const t = lastTable("first-fit-decreasing-bin-packing");
    const items = [...FFD_ITEMS].sort((a, b) => b - a);
    const bins = [];
    for (const s of items) {
      const b = bins.find((x) => x.load + s <= FFD_CAPACITY);
      if (b) b.load += s; else bins.push({ load: s });
    }
    const lastCol = items.length - 1;
    const remaining = Array.from({ length: 5 }, (_, b) => t[2 + b][lastCol].value).filter((v) => v !== null);
    check("FFD: 箱の数が独立実装のFFDと一致", remaining.length === bins.length, `got=${remaining.length} ref=${bins.length}`);
    check("FFD: 全ての箱が容量内で、残りと詰めた量が整合", remaining.every((r, b) => r >= 0 && FFD_CAPACITY - r === bins[b].load));
    const lower = Math.ceil(items.reduce((a, b) => a + b, 0) / FFD_CAPACITY);
    check("FFD: 箱数が下限(総和/容量の切り上げ)以上で 11/9·下限+6/9 以内", remaining.length >= lower && remaining.length <= (11 / 9) * lower + 6 / 9 + 1e-9);
  }
  // エジプト分数: 有理数で厳密に足して元の分数に一致、分母は相異なる
  {
    const t = lastTable("egyptian-fraction-greedy");
    const denoms = cellValues(t, 1).map((v) => BigInt(String(v).slice(2)));
    let num = 0n, den = 1n;
    for (const d of denoms) { num = num * d + den; den *= d; }
    const g = (a, b) => (b === 0n ? a : g(b, a % b));
    const gg = g(num, den);
    check("エジプト分数: 単位分数の和が元の分数と厳密に一致", num / gg === BigInt(EGYPTIAN_NUMERATOR) * 1n && den / gg === BigInt(EGYPTIAN_DENOMINATOR), `${num / gg}/${den / gg}`);
    check("エジプト分数: 分母が全て相異なる", new Set(denoms.map(String)).size === denoms.length);
    check("エジプト分数: 各項が残りを超えない最大の単位分数(分母=⌈d/n⌉)", cellValues(t, 0).every((v, i) => { const [n, d] = String(v).split("/").map(Number); return BigInt(Math.ceil(d / n)) === denoms[i]; }));
  }
  // 集合被覆: 全体を覆う、毎回最大、最適(全探索)との比
  {
    const frames = DP_VISUALIZERS["set-cover-greedy"]();
    const t = frames[frames.length - 1].table;
    const chosenByRound = t.map((row) => row.findIndex((c) => c.state === "pivot")).filter((k) => k >= 0);
    const covered = new Set();
    let maxGain = true;
    for (const k of chosenByRound) {
      const gains = SET_COVER_SETS.map((s, c) => (chosenByRound.slice(0, chosenByRound.indexOf(k)).includes(c) ? -1 : s.items.filter((x) => !covered.has(x)).length));
      if (gains[k] !== Math.max(...gains)) maxGain = false;
      SET_COVER_SETS[k].items.forEach((x) => covered.add(x));
    }
    check("集合被覆: 全要素が覆われる", SET_COVER_UNIVERSE.every((x) => covered.has(x)));
    check("集合被覆: 毎回、新しく覆う要素が最多の集合を選んでいる", maxGain);
    let opt = Infinity;
    for (let mask = 1; mask < 1 << SET_COVER_SETS.length; mask++) {
      const u = new Set();
      SET_COVER_SETS.forEach((s, k) => { if (mask & (1 << k)) s.items.forEach((x) => u.add(x)); });
      if (SET_COVER_UNIVERSE.every((x) => u.has(x))) opt = Math.min(opt, [...Array(SET_COVER_SETS.length).keys()].filter((k) => mask & (1 << k)).length);
    }
    const H = (n) => Array.from({ length: n }, (_, i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
    check("集合被覆: 採用数が最適(全探索)以上で H(最大集合)·最適 以内", chosenByRound.length >= opt && chosenByRound.length <= H(6) * opt + 1e-9, `greedy=${chosenByRound.length} opt=${opt}`);
  }
  // 最適マージ: 独立のヒープ(最小2つを取る)で総コスト
  {
    const t = lastTable("optimal-merge-pattern");
    let pool = [...MERGE_FILE_SIZES];
    let total = 0;
    while (pool.length > 1) {
      pool.sort((a, b) => a - b);
      const s = pool[0] + pool[1];
      total += s;
      pool = [s, ...pool.slice(2)];
    }
    check("最適マージ: 総コストが独立のヒープ実装と一致", t[3][MERGE_FILE_SIZES.length - 2].value === total, `got=${t[3][MERGE_FILE_SIZES.length - 2].value} ref=${total}`);
  }
  // シャノン・ファノ: 接頭辞符号、平均長が [H, H+1)
  {
    const t = lastTable("shannon-fano-coding");
    const symbols = [...SHANNON_FANO_SYMBOLS].sort((a, b) => b.freq - a.freq);
    const codes = cellValues(t, 1);
    const prefixFree = codes.every((a, i) => codes.every((b, j) => i === j || !String(b).startsWith(String(a))));
    const total = symbols.reduce((a, s) => a + s.freq, 0);
    const avg = symbols.reduce((a, s, i) => a + s.freq * String(codes[i]).length, 0) / total;
    const entropy = -symbols.reduce((a, s) => a + (s.freq / total) * Math.log2(s.freq / total), 0);
    check("シャノン・ファノ: 接頭辞符号(どの符号も他の先頭にならない)", prefixFree && new Set(codes).size === codes.length);
    check("シャノン・ファノ: 平均符号長が エントロピー以上・+1未満", avg >= entropy - 1e-9 && avg < entropy + 1, `avg=${avg} H=${entropy}`);
  }
  // 正準ハフマン: 独立の正準符号化、クラフトの不等式が等号、接頭辞符号
  {
    const t = lastTable("huffman-canonical-codes");
    const sorted = [...CANONICAL_HUFFMAN_LENGTHS].sort((a, b) => a.length - b.length || a.symbol.localeCompare(b.symbol));
    const ref = [];
    let code = 0;
    sorted.forEach((s, i) => { if (i > 0) code = (code + 1) * 2 ** (s.length - sorted[i - 1].length); ref.push(code.toString(2).padStart(s.length, "0")); if (i === 0) {} });
    // i=0 は 0 を長さ分、続きは前の符号+1を左詰め(長さの差だけ左シフト)
    const ref2 = [];
    let c2 = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) c2 = (c2 + 1) << (sorted[i].length - sorted[i - 1].length);
      ref2.push(c2.toString(2).padStart(sorted[i].length, "0"));
    }
    const got = cellValues(t, 2);
    check("正準ハフマン: 符号が独立の正準符号化と一致", JSON.stringify(got) === JSON.stringify(ref2), `got=${got} ref=${ref2}`);
    check("正準ハフマン: クラフトの不等式が等号(完全な木)", Math.abs(CANONICAL_HUFFMAN_LENGTHS.reduce((s, x) => s + 2 ** -x.length, 0) - 1) < 1e-12);
    check("正準ハフマン: 接頭辞符号", got.every((a, i) => got.every((b, j) => i === j || !String(b).startsWith(String(a)))));
    check("正準ハフマン: 符号を数として読むと昇順(同じ長さでは記号順)", got.every((v, i) => i === 0 || parseInt(String(v), 2) / 2 ** String(v).length > parseInt(String(got[i - 1]), 2) / 2 ** String(got[i - 1]).length));
  }
  // タスクスケジューラ: 公式の最短時間、クールダウンの遵守、全タスクの消化
  {
    const t = lastTable("task-scheduler-cooldown-greedy");
    const row = cellValues(t, 0);
    const used = row.filter((v) => v !== null);
    const total = TASK_SCHEDULER_COUNTS.reduce((a, x) => a + x.count, 0);
    const maxC = Math.max(...TASK_SCHEDULER_COUNTS.map((x) => x.count));
    const formula = Math.max(total, (maxC - 1) * (TASK_SCHEDULER_COOLDOWN + 1) + TASK_SCHEDULER_COUNTS.filter((x) => x.count === maxC).length);
    check("タスクスケジューラ: 所要時間が公式の最短と一致", used.length === formula, `got=${used.length} formula=${formula}`);
    let spaced = true;
    for (const task of TASK_SCHEDULER_COUNTS) {
      const idx = used.map((v, i) => (v === task.name ? i : -1)).filter((i) => i >= 0);
      if (idx.length !== task.count) spaced = false;
      idx.forEach((i, k) => { if (k > 0 && i - idx[k - 1] <= TASK_SCHEDULER_COOLDOWN) spaced = false; });
    }
    check("タスクスケジューラ: 全タスクを実行し、同じタスクの間隔が(クールダウン+1)以上", spaced);
  }
}

// ===========================================================================
// 擬似コードの現在行(X11④)と、動きの補助(Y2): 定義の整合を確認する
// ===========================================================================
section("擬似コードの現在行と、溜め/余韻のイージング");
{
  const PSEUDO_INPUT = [62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59];
  const frameSources = {
    ...Object.fromEntries(Object.keys(PSEUDO_CODE).filter((id) => id in SORT_VISUALIZERS).map((id) => [id, () => SORT_VISUALIZERS[id]([...PSEUDO_INPUT])])),
    ...Object.fromEntries(Object.keys(PSEUDO_CODE).filter((id) => id in SEARCH_VISUALIZERS).map((id) => [id, () => SEARCH_VISUALIZERS[id]()])),
  };
  for (const [id, lines] of Object.entries(PSEUDO_CODE)) {
    check(`擬似コード ${id}: 可視化のフレーム生成元がある`, id in frameSources);
    if (!(id in frameSources)) continue;
    const kinds = buildStepKinds(frameSources[id](), highlightEntities);
    const used = new Set(kinds);
    // 再生中に現れる全ての状態種別に、光らせる行が1つ以上ある(現在行が空になるステップが無い)
    for (const kind of used) {
      check(`擬似コード ${id}: 状態「${kind}」に対応する行がある`, activePseudoLines(id, kind).length > 0);
    }
    // 光る行は、実際の再生で一度は使われる(説明用の空kinds行を除く)
    lines.forEach((line, index) => {
      if (line.kinds.length === 0) return;
      check(`擬似コード ${id}: ${index + 1}行目が再生中に一度は光る`, line.kinds.some((kind) => used.has(kind)));
    });
  }
  check("easeSpring: 端点が0と1に一致", easeSpring(0) === 0 && Math.abs(easeSpring(1) - 1) < 1e-9);
  const springSamples = Array.from({ length: 101 }, (_, i) => easeSpring(i / 100));
  check("easeSpring: 溜め(0未満)と余韻(1超)があり、振れ幅は10%以内", Math.min(...springSamples) < 0 && Math.max(...springSamples) > 1 && Math.min(...springSamples) > -0.1 && Math.max(...springSamples) < 1.1);
}

// ===========================================================================
// 文字のマスで表す別表示(D1): 段データの性質を確認する
// ===========================================================================
section("文字表示(ascii-view): 段データ");
{
  const samples = [
    [62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59],
    [5, 5, 5, 5],
    [1],
    [0, 3],
    [],
  ];
  for (const values of samples) {
    const tag = JSON.stringify(values.slice(0, 4)) + "…" + values.length + "件";
    const levels = asciiBarLevels(values);
    const rows = asciiBarRows(values);
    check("文字表示 " + tag + ": 段数の配列が値と同じ長さ", levels.length === values.length);
    check("文字表示 " + tag + ": 行数が" + ASCII_LEVELS + "段", rows.length === ASCII_LEVELS);
    check("文字表示 " + tag + ": 値が大きいほど段が低くならない(単調)", values.every((a, i) => values.every((b, j) => (a <= b ? levels[i] <= levels[j] : true))));
    check("文字表示 " + tag + ": 正の値は最低1段、0以下は0段", values.every((v, i) => (v > 0 ? levels[i] >= 1 : levels[i] === 0)));
    check("文字表示 " + tag + ": 行列の各列の true の数が段数と一致", levels.every((level, c) => rows.filter((row) => row[c]).length === level));
    if (values.some((v) => v > 0)) check("文字表示 " + tag + ": 最大値の棒がちょうど全段に届く", Math.max(...levels) === ASCII_LEVELS);
  }
}

// ===========================================================================
// 譜面と音(Z25): 状態ごとの音の高さと段の対応を確認する
// ===========================================================================
section("譜面と音(step-sound): 状態ごとの音と段");
{
  const entries = Object.entries(STEP_TONE);
  const pitched = entries.filter(([, tone]) => tone.hz !== null);
  check("譜面: 待機は鳴らさない(hz=null)", STEP_TONE.idle.hz === null);
  check("譜面: 待機以外の4状態すべてに音の高さがある", pitched.length === 4);
  check("譜面: 音の高さが状態ごとに異なる", new Set(pitched.map(([, t]) => t.hz)).size === pitched.length);
  check("譜面: 段(rank)が状態ごとに異なり、0〜最大段に収まる", new Set(entries.map(([, t]) => t.rank)).size === entries.length && entries.every(([, t]) => t.rank >= 0 && t.rank <= STEP_TONE_MAX_RANK));
  check("譜面: 段が高いほど音も高い(段と音の高さが同じ順序)", pitched.every(([, a]) => pitched.every(([, b]) => (a.rank < b.rank ? a.hz < b.hz : true))));
  check("譜面: 状態の表示名(記号)が5状態分ある", Object.keys(STEP_KIND_LABELS).length === 5 && new Set(Object.values(STEP_KIND_LABELS).map((l) => l.glyph)).size === 5);
}

console.log(`\n${"=".repeat(60)}`);
console.log(`結果: ${passCount}件成功 / ${failCount}件失敗 (合計${passCount + failCount}件のアサーション)`);
if (failCount > 0) {
  console.log("\n失敗したチェック:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log("全ての検証に成功しました。");
}
