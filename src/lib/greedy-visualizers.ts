import type { StateColorKey } from "./design-tokens";
import type { SearchFrame } from "./search-visualizers";

/**
 * 貪欲法の可視化(配列の棒グラフ+状態色の kind。SearchVisualizer が描画する)。
 * 「その時点で最善に見える選択」を1つずつ確定させていく様子を、実際の貪欲な計算どおりに追う。
 * 棒の意味はアルゴリズムごとに違う(各関数の説明を参照)。色の意味は共通:
 *   pivot=いま注目している選択 / comparing=候補・進行中 / swapping=却下・やり直し / settled=確定
 */

type Highlight = Partial<Record<number, StateColorKey>>;

function frame(array: number[], highlight: Highlight, description: string): SearchFrame {
  return { array: [...array], highlight, description };
}

// ===========================================================================
// ジャンプゲーム: 棒=各マスの最大ジャンプ距離。「いちばん遠くまで届く位置」だけを覚える
// ===========================================================================

export const JUMP_GAME_NUMS = [3, 1, 0, 2, 0, 3, 1, 2];

export function jumpGameGreedySteps(): SearchFrame[] {
  const nums = JUMP_GAME_NUMS;
  const last = nums.length - 1;
  const frames = [frame(nums, { 0: "pivot" }, `各マスの数字は「そこから最大何マス進めるか」。末尾(マス${last})に着けるかを調べる`)];
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) {
      frames.push(frame(nums, { [i]: "swapping" }, `マス${i}は届く範囲(〜${farthest})の外。ここには着けないので、末尾へは到達できない`));
      return frames;
    }
    farthest = Math.max(farthest, i + nums[i]);
    const highlight: Highlight = {};
    for (let k = 0; k <= Math.min(farthest, last); k++) highlight[k] = "comparing";
    highlight[i] = "pivot";
    frames.push(frame(nums, highlight, `マス${i}から最大${nums[i]}マス → いちばん遠い到達位置は マス${Math.min(farthest, last)}${farthest >= last ? "(末尾に届く)" : ""}`));
    if (farthest >= last) {
      frames.push(frame(nums, { [last]: "settled" }, `末尾(マス${last})に到達できる`));
      return frames;
    }
  }
  return frames;
}

// ===========================================================================
// 株式売買: 棒=日ごとの価格。「ここまでの最安値」だけを覚えて、毎日の利益を更新する
// ===========================================================================

export const STOCK_PRICES = [7, 3, 5, 1, 6, 4, 8, 2];

export function bestTimeToBuySellStockSteps(): SearchFrame[] {
  const prices = STOCK_PRICES;
  const frames = [frame(prices, {}, "1回だけ買って1回だけ売る。最大の利益になる日を探す")];
  let minIndex = 0;
  let best = 0;
  let buy = 0;
  let sell = 0;
  frames.push(frame(prices, { 0: "pivot" }, `1日目(価格${prices[0]})を最安値の候補にする`));
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < prices[minIndex]) {
      minIndex = i;
      frames.push(frame(prices, { [minIndex]: "pivot", ...(best > 0 ? { [buy]: "settled", [sell]: "settled" } : {}) }, `${i + 1}日目(価格${prices[i]})が最安値を更新。買う候補を${i + 1}日目に移す`));
      continue;
    }
    const profit = prices[i] - prices[minIndex];
    const improved = profit > best;
    if (improved) {
      best = profit;
      buy = minIndex;
      sell = i;
    }
    const highlight: Highlight = { [minIndex]: "pivot", [i]: "comparing" };
    if (best > 0) {
      highlight[buy] = "settled";
      if (sell !== i) highlight[sell] = "settled";
      else highlight[i] = "settled";
    }
    frames.push(
      frame(prices, highlight, `${i + 1}日目(価格${prices[i]})に売ると利益${profit}。${improved ? `これまでの最大${best}を更新(${buy + 1}日目に買い、${sell + 1}日目に売る)` : `最大${best}は超えない`}`),
    );
  }
  frames.push(frame(prices, { [buy]: "settled", [sell]: "settled" }, `最大利益は${best}(${buy + 1}日目に価格${prices[buy]}で買い、${sell + 1}日目に価格${prices[sell]}で売る)`));
  return frames;
}

// ===========================================================================
// ガソリンスタンド: 棒=各スタンドでの「入れられる量 − 次のスタンドまでの消費量」(負なら減る)
// ===========================================================================

export const GAS_STATION_GAS = [1, 2, 3, 4, 5];
export const GAS_STATION_COST = [3, 4, 5, 1, 2];

export function gasStationGreedySteps(): SearchFrame[] {
  const net = GAS_STATION_GAS.map((g, i) => g - GAS_STATION_COST[i]);
  const frames = [frame(net, {}, `棒は各スタンドの「入れる量 − 次までの消費量」。円環を1周できる出発点を探す`)];
  let total = 0;
  let tank = 0;
  let start = 0;
  for (let i = 0; i < net.length; i++) {
    total += net[i];
    tank += net[i];
    if (tank < 0) {
      const highlight: Highlight = {};
      for (let k = start; k <= i; k++) highlight[k] = "swapping";
      frames.push(frame(net, highlight, `スタンド${i}でタンクが${tank}(負)。出発点${start}〜${i}のどこからでも、ここまでは辿り着けない → 出発点を${i + 1}に変えて、タンクを空にやり直す`));
      start = i + 1;
      tank = 0;
    } else {
      const highlight: Highlight = {};
      for (let k = start; k <= i; k++) highlight[k] = "comparing";
      highlight[start] = "pivot";
      frames.push(frame(net, highlight, `スタンド${i}まで進んでタンク${tank}(0以上)。出発点${start}の候補を維持する`));
    }
  }
  if (total >= 0 && start < net.length) {
    frames.push(frame(net, { [start]: "settled" }, `全体の収支は${total}(0以上)なので、出発点${start}から1周できる`));
  } else {
    frames.push(frame(net, {}, `全体の収支は${total}(負)なので、どこから出発しても1周できない`));
  }
  return frames;
}

// ===========================================================================
// LPT法: 棒=各機械の現在の負荷。長いジョブから順に、いちばん空いている機械へ
// ===========================================================================

export const LPT_JOBS = [7, 6, 5, 4, 3, 3, 2];
export const LPT_MACHINES = 3;

export function lptSchedulingSteps(): SearchFrame[] {
  const loads = Array<number>(LPT_MACHINES).fill(0);
  const frames = [frame(loads, {}, `ジョブ(処理時間)${LPT_JOBS.join("・")} を、機械${LPT_MACHINES}台に長い順に割り当てる。棒は各機械の負荷`)];
  for (const job of LPT_JOBS) {
    let target = 0;
    for (let m = 1; m < loads.length; m++) if (loads[m] < loads[target]) target = m;
    const before: Highlight = {};
    loads.forEach((_, m) => {
      before[m] = m === target ? "pivot" : "comparing";
    });
    frames.push(frame(loads, before, `処理時間${job}のジョブ。いちばん空いている機械${target + 1}(負荷${loads[target]})に割り当てる`));
    loads[target] += job;
    frames.push(frame(loads, { [target]: "swapping" }, `機械${target + 1}の負荷が${loads[target]}になった`));
  }
  const all: Highlight = {};
  loads.forEach((_, m) => {
    all[m] = "settled";
  });
  const total = LPT_JOBS.reduce((sum, job) => sum + job, 0);
  frames.push(frame(loads, all, `完了: 全体の終了時刻は${Math.max(...loads)}(最適でも少なくとも ${total}÷${LPT_MACHINES} = ${total / LPT_MACHINES} 以上)`));
  return frames;
}

// ===========================================================================
// First-Fit Decreasing: 棒=各ビンの使用量。大きい品物から、入る最初のビンへ
// ===========================================================================

export const BIN_ITEMS = [7, 6, 5, 5, 4, 3, 2, 2];
export const BIN_CAPACITY = 10;
export const BIN_SLOTS = 5;

export function firstFitDecreasingSteps(): SearchFrame[] {
  const bins = Array<number>(BIN_SLOTS).fill(0);
  let used = 0;
  const frames = [frame(bins, {}, `品物${BIN_ITEMS.join("・")} を、容量${BIN_CAPACITY}のビンに大きい順に詰める。棒は各ビンの使用量`)];
  for (const item of BIN_ITEMS) {
    const rejected: Highlight = {};
    let placed = -1;
    for (let b = 0; b <= used; b++) {
      if (bins[b] + item <= BIN_CAPACITY) {
        placed = b;
        break;
      }
      rejected[b] = "swapping";
    }
    if (placed === used) used++;
    const scanning = { ...rejected, [placed]: "comparing" as StateColorKey };
    const newBin = placed === used - 1 && bins[placed] === 0;
    frames.push(
      frame(
        bins,
        scanning,
        `品物${item}: ${Object.keys(rejected).length > 0 ? `ビン${Object.keys(rejected).map((k) => Number(k) + 1).join("・")}は入らない。` : ""}${newBin ? `新しいビン${placed + 1}を開く` : `ビン${placed + 1}(使用${bins[placed]})に入る`}`,
      ),
    );
    bins[placed] += item;
    frames.push(frame(bins, { [placed]: "pivot" }, `ビン${placed + 1}の使用量が${bins[placed]}になった`));
  }
  const all: Highlight = {};
  for (let b = 0; b < used; b++) all[b] = "settled";
  const total = BIN_ITEMS.reduce((sum, item) => sum + item, 0);
  frames.push(frame(bins, all, `完了: ビンは${used}個(品物の合計${total}÷容量${BIN_CAPACITY}から、最適でも少なくとも${Math.ceil(total / BIN_CAPACITY)}個必要)`));
  return frames;
}

export const GREEDY_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  "jump-game-greedy": jumpGameGreedySteps,
  "best-time-to-buy-sell-stock-greedy": bestTimeToBuySellStockSteps,
  "gas-station-greedy": gasStationGreedySteps,
  "lpt-scheduling-greedy": lptSchedulingSteps,
  "first-fit-decreasing-bin-packing": firstFitDecreasingSteps,
};
