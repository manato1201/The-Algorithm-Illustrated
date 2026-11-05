import type { DPFrame, DPTableMeta } from "./dp-visualizers.ts";
import { makeGrid, range } from "./table-grid.ts";

/**
 * 貪欲法の可視化(DPテーブル型の属性表を再利用する)。
 * 列 = 要素(日・区間・ジョブ・シンボル…)、行 = 属性や「その時点の状態」。貪欲法は
 * 「いま一番よさそうなものを選び、二度と覆さない」ので、1列ずつ左から決めていく様子がそのまま表になる。
 *   comparing = いま検討している / pivot = 採用・更新した / settled = 入力や確定した値 / idle = 未処理・棄却
 * 各アルゴリズムは実際の貪欲な選択を1手ずつ行い、最後に最適解と照合できる値を残す(scripts/verify-visualizations.mjs)。
 */

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// ---------------------------------------------------------------------------
// 株式売買の最適タイミング(1回だけ売買)
// ---------------------------------------------------------------------------
export const STOCK_PRICES = [7, 1, 5, 3, 6, 4, 8, 2, 9];

export function bestTimeToBuySellStockSteps(): DPFrame[] {
  const prices = STOCK_PRICES;
  const g = makeGrid(4, prices.length);
  prices.forEach((p, c) => g.put(0, c, p, "settled"));
  const frames = [
    g.snap("初期状態: 1回だけ売買できるとき、利益が最大になる買う日・売る日を1回の走査で探す。「今日までの最安値」さえ覚えておけば、今日売ったときの最大利益がすぐ分かる"),
  ];
  let min = Infinity;
  let best = 0;
  prices.forEach((p, c) => {
    g.mark(0, c, "comparing");
    frames.push(g.snap(`${c}日目: 株価${p}。これまでの最安値(${min === Infinity ? "まだなし" : min})と比べる`));
    g.mark(0, c, "settled");
    if (p < min) {
      min = p;
      g.put(1, c, min, "pivot");
      g.put(2, c, 0);
      g.put(3, c, best);
      frames.push(g.snap(`最安値を${p}に更新(買う候補の日)。今日売っても利益は0`));
    } else {
      const profit = p - min;
      g.put(1, c, min);
      if (profit > best) {
        best = profit;
        g.put(2, c, profit, "pivot");
        g.put(3, c, best, "pivot");
        frames.push(g.snap(`今日売ると ${p}−${min}=${profit}。これまでの最大利益${best}を更新`));
      } else {
        g.put(2, c, profit);
        g.put(3, c, best);
        frames.push(g.snap(`今日売ると ${p}−${min}=${profit}。最大利益${best}は超えないので据え置き`));
      }
    }
  });
  frames.push(g.snap(`最大利益は ${best}。最安値を更新し続けながら1回走査しただけ(O(n))で、全ての売買の組み合わせを調べたのと同じ答えになる`));
  return frames;
}

// ---------------------------------------------------------------------------
// ジャンプゲーム(到達可能性)
// ---------------------------------------------------------------------------
export const JUMP_GAME_NUMS = [2, 3, 1, 1, 4, 0, 2];

export function jumpGameGreedySteps(): DPFrame[] {
  const nums = JUMP_GAME_NUMS;
  const last = nums.length - 1;
  const g = makeGrid(3, nums.length);
  nums.forEach((v, c) => g.put(0, c, v, "settled"));
  const frames = [
    g.snap(`初期状態: 各マスの数字は「最大その歩数まで進める」の意味。先頭から最終マス(${last})に着けるか。各マスから届く最遠位置だけ覚えて進める`),
  ];
  let farthest = 0;
  for (let i = 0; i <= last; i++) {
    g.mark(0, i, "comparing");
    if (i > farthest) {
      g.put(2, i, "到達不能", "idle");
      frames.push(g.snap(`マス${i}は最遠位置${farthest}より先で、どのマスからも届かない → 最終マスには着けない`));
      return frames;
    }
    const before = farthest;
    farthest = Math.max(farthest, i + nums[i]);
    g.mark(0, i, "settled");
    g.put(1, i, farthest, farthest > before ? "pivot" : "idle");
    if (farthest >= last) {
      g.put(2, i, "着く!", "settled");
      frames.push(g.snap(`マス${i}から最遠位置が ${i}+${nums[i]}=${farthest} ≧ 最終マス${last}。到達可能(残りのマスは調べなくてよい)`));
      return frames;
    }
    frames.push(
      g.snap(
        farthest > before
          ? `マス${i}(数字${nums[i]}): 最遠位置を ${before}→${farthest} に更新`
          : `マス${i}(数字${nums[i]}): ${i}+${nums[i]}=${i + nums[i]} は最遠位置${farthest}を超えないので据え置き`,
      ),
    );
  }
  return frames;
}

// ---------------------------------------------------------------------------
// ガソリンスタンド問題
// ---------------------------------------------------------------------------
export const GAS_STATION_GAS = [1, 2, 3, 4, 5];
export const GAS_STATION_COST = [3, 4, 5, 1, 2];

export function gasStationGreedySteps(): DPFrame[] {
  const gas = GAS_STATION_GAS;
  const cost = GAS_STATION_COST;
  const n = gas.length;
  const g = makeGrid(5, n);
  gas.forEach((v, c) => {
    g.put(0, c, v, "settled");
    g.put(1, c, cost[c], "settled");
  });
  const frames = [
    g.snap("初期状態: 円形の道にスタンドが並ぶ。給油量と次のスタンドまでの消費量が分かっているとき、1周できる出発地はどこか。タンクが負になったら、そこまでの出発地は全て失敗と分かる"),
  ];
  let tank = 0;
  let total = 0;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const diff = gas[i] - cost[i];
    g.mark(0, i, "comparing");
    g.mark(1, i, "comparing");
    g.put(2, i, diff, "comparing");
    frames.push(g.snap(`スタンド${i}: 給油${gas[i]} − 消費${cost[i]} = ${diff}`));
    tank += diff;
    total += diff;
    g.mark(0, i, "settled");
    g.mark(1, i, "settled");
    g.mark(2, i, "settled");
    if (tank < 0) {
      g.put(3, i, tank, "comparing");
      const failedFrom = start;
      start = i + 1;
      g.put(4, i, `→ ${start}`, "pivot");
      frames.push(g.snap(`タンクが ${tank} と負になった。出発地${failedFrom}〜${i}のどこから出発しても、ここで燃料が尽きる → 出発候補を${start}に移し、タンクを空に戻す`));
      tank = 0;
    } else {
      g.put(3, i, tank);
      g.put(4, i, start, "idle");
      frames.push(g.snap(`タンクは ${tank}。出発候補は${start}のまま`));
    }
  }
  const answer = total >= 0 ? start : -1;
  if (answer >= 0) g.put(4, Math.min(start, n - 1), start, "settled");
  frames.push(
    g.snap(
      total >= 0
        ? `全体の収支の合計は ${total} ≧ 0 なので、出発地は ${start}。1周できる出発地は、候補が1つ残れば必ずそれが答え`
        : `全体の収支の合計が ${total} < 0 なので、どこから出発しても1周できない`,
    ),
  );
  return frames;
}

// ---------------------------------------------------------------------------
// キャンディ配布問題(2パス)
// ---------------------------------------------------------------------------
export const CANDY_RATINGS = [1, 0, 2, 3, 3, 1, 2, 1];

export function candyDistributionGreedySteps(): DPFrame[] {
  const ratings = CANDY_RATINGS;
  const n = ratings.length;
  const g = makeGrid(3, n);
  ratings.forEach((r, c) => g.put(0, c, r, "settled"));
  const frames = [
    g.snap("初期状態: 全員に1個以上配り、隣より評価が高い子には隣より多く配る。最小の総数は? 「左隣との関係」と「右隣との関係」を別々に1回ずつ満たす"),
  ];
  const left = new Array<number>(n).fill(1);
  for (let i = 0; i < n; i++) {
    g.mark(0, i, "comparing");
    if (i > 0 && ratings[i] > ratings[i - 1]) {
      left[i] = left[i - 1] + 1;
      g.put(1, i, left[i], "pivot");
      frames.push(g.snap(`左から${i}番目: 評価${ratings[i]} > 左隣${ratings[i - 1]} → 左隣の${left[i - 1]}個より1多い ${left[i]}個`));
    } else {
      g.put(1, i, 1, "idle");
      frames.push(g.snap(`左から${i}番目: ${i === 0 ? "先頭なので" : "左隣より高くないので"}最小の1個`));
    }
    g.mark(0, i, "settled");
  }
  const final = [...left];
  for (let i = 0; i < n; i++) g.put(2, i, null);
  for (let i = n - 1; i >= 0; i--) {
    g.mark(0, i, "comparing");
    if (i < n - 1 && ratings[i] > ratings[i + 1] && final[i] <= final[i + 1]) {
      final[i] = final[i + 1] + 1;
      g.put(2, i, final[i], "pivot");
      frames.push(g.snap(`右から${i}番目: 評価${ratings[i]} > 右隣${ratings[i + 1]} だが配布が足りない → 右隣より1多い ${final[i]}個に引き上げる`));
    } else {
      g.put(2, i, final[i], "settled");
      frames.push(g.snap(`右から${i}番目: 右隣との関係は満たしている(${final[i]}個のまま)`));
    }
    g.mark(0, i, "settled");
  }
  const total = final.reduce((a, b) => a + b, 0);
  frames.push(g.snap(`両方向を満たす最小の配り方 [${final.join(", ")}]、合計 ${total}個。2回の走査で足りるのは、条件が隣との関係だけで互いに矛盾しないから`));
  return frames;
}

// ---------------------------------------------------------------------------
// 株価スパン(単調スタック)
// ---------------------------------------------------------------------------
export const STOCK_SPAN_PRICES = [100, 80, 60, 70, 60, 75, 85];

export function stockSpanGreedyStackSteps(): DPFrame[] {
  const prices = STOCK_SPAN_PRICES;
  const n = prices.length;
  const g = makeGrid(3, n);
  prices.forEach((p, c) => g.put(0, c, p, "settled"));
  const frames = [
    g.snap("初期状態: スパン = 「今日の株価以下が連続している日数(今日を含む)」。毎回さかのぼると遅いので、まだ超えられていない過去の高値だけをスタックに残す"),
  ];
  const stack: number[] = [];
  const spans: number[] = [];
  for (let i = 0; i < n; i++) {
    g.mark(0, i, "comparing");
    const popped: number[] = [];
    while (stack.length > 0 && prices[stack[stack.length - 1]] <= prices[i]) popped.push(prices[stack.pop() as number]);
    const span = stack.length === 0 ? i + 1 : i - stack[stack.length - 1];
    stack.push(i);
    spans.push(span);
    g.mark(0, i, "settled");
    g.put(1, i, span, "pivot");
    g.put(2, i, stack.map((s) => prices[s]).join(" > "), "idle");
    frames.push(
      g.snap(
        `${i}日目(株価${prices[i]}): ${popped.length > 0 ? `今日以下の高値 ${popped.join(", ")} を取り除き` : "取り除く高値はなく"}、${stack.length === 1 ? "今日より高い日が過去にないのでスパン" : `直前の高値は${stack[stack.length - 2]}日目なのでスパン ${i}−${stack[stack.length - 2]} =`} ${span}`,
      ),
    );
  }
  frames.push(g.snap(`スパンは [${spans.join(", ")}]。各日はスタックに1回入り最大1回出るだけなので、全体でO(n)`));
  return frames;
}

// ---------------------------------------------------------------------------
// 最小会議室数
// ---------------------------------------------------------------------------
export const MEETINGS: [number, number][] = [
  [0, 30],
  [5, 10],
  [10, 25],
  [12, 18],
  [15, 20],
  [22, 28],
  [35, 40],
];

export function minimumMeetingRoomsSteps(): DPFrame[] {
  const meetings = [...MEETINGS].sort((a, b) => a[0] - b[0]);
  const n = meetings.length;
  const g = makeGrid(4, n);
  meetings.forEach(([s, e], c) => {
    g.put(0, c, s, "settled");
    g.put(1, c, e, "settled");
  });
  const frames = [
    g.snap("初期状態: 会議を開始時刻順に並べ、1つずつ部屋に割り当てる。空いている部屋(終了時刻が自分の開始以前)があれば使い回し、なければ部屋を増やす"),
  ];
  const ends: number[] = [];
  meetings.forEach(([s, e], c) => {
    g.mark(0, c, "comparing");
    let room = -1;
    for (let r = 0; r < ends.length; r++) if (ends[r] <= s && (room === -1 || ends[r] < ends[room])) room = r;
    if (room === -1) {
      ends.push(e);
      room = ends.length - 1;
      g.put(2, c, `部屋${room + 1}(新設)`, "pivot");
      frames.push(g.snap(`会議(${s}-${e}): 空いている部屋がない(使用中の部屋の終了時刻 ${ends.slice(0, -1).join(", ") || "なし"} は全て${s}より後) → 部屋${room + 1}を新設`));
    } else {
      ends[room] = e;
      g.put(2, c, `部屋${room + 1}`, "pivot");
      frames.push(g.snap(`会議(${s}-${e}): 部屋${room + 1}が${s}までに空く → 使い回す`));
    }
    g.mark(0, c, "settled");
    g.put(3, c, ends.length);
  });
  g.mark(3, n - 1, "settled");
  frames.push(g.snap(`必要な部屋は ${ends.length} 室。同時に開かれている会議の最大数と一致する(それより少ない部屋では足りず、貪欲な割り当てはそれ以上を使わない)`));
  return frames;
}

// ---------------------------------------------------------------------------
// 区間の点被覆
// ---------------------------------------------------------------------------
export const POINT_COVER_INTERVALS: { label: string; start: number; end: number }[] = [
  { label: "A", start: 1, end: 4 },
  { label: "B", start: 2, end: 6 },
  { label: "C", start: 3, end: 5 },
  { label: "D", start: 7, end: 9 },
  { label: "E", start: 8, end: 12 },
  { label: "F", start: 10, end: 13 },
  { label: "G", start: 11, end: 15 },
];

export function greedyIntervalPointCoverSteps(): DPFrame[] {
  const sorted = [...POINT_COVER_INTERVALS].sort((a, b) => a.end - b.end);
  const n = sorted.length;
  const g = makeGrid(3, n);
  sorted.forEach((iv, c) => {
    g.put(0, c, iv.start, "settled");
    g.put(1, c, iv.end, "settled");
  });
  const frames = [
    g.snap("初期状態: 全ての区間に少なくとも1つ点が含まれるよう、点を最小個数だけ打つ。終了時刻の早い順に見て、点がまだ届いていない区間の「終了時刻」に点を打つ"),
  ];
  let lastPoint = -Infinity;
  let points = 0;
  sorted.forEach((iv, c) => {
    g.mark(0, c, "comparing");
    g.mark(1, c, "comparing");
    if (iv.start > lastPoint) {
      const previous = lastPoint === -Infinity ? "まだ点がない" : `直前の点${lastPoint}では覆えない`;
      lastPoint = iv.end;
      points++;
      g.put(2, c, `点@${lastPoint}`, "pivot");
      frames.push(g.snap(`区間${iv.label}(${iv.start}-${iv.end}): ${previous} → 終了時刻${iv.end}に点を打つ(できるだけ右に打つと、後ろの区間も覆いやすい)`));
    } else {
      g.put(2, c, `済(@${lastPoint})`);
      frames.push(g.snap(`区間${iv.label}(${iv.start}-${iv.end}): 点${lastPoint}がすでに含まれている → 打たなくてよい`));
    }
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
  });
  frames.push(g.snap(`点は ${points} 個で全区間を覆えた。終了時刻が最も早い区間は必ずどこかの点で覆う必要があり、その区間の終了時刻に打つのが最も多くを覆えるため、これ以上減らせない`));
  return frames;
}

// ---------------------------------------------------------------------------
// 区間グラフの貪欲彩色
// ---------------------------------------------------------------------------
export const INTERVAL_COLORING_INTERVALS: { label: string; start: number; end: number }[] = [
  { label: "A", start: 1, end: 4 },
  { label: "B", start: 2, end: 5 },
  { label: "C", start: 3, end: 7 },
  { label: "D", start: 5, end: 8 },
  { label: "E", start: 6, end: 9 },
  { label: "F", start: 8, end: 11 },
  { label: "G", start: 9, end: 12 },
];

export function greedyColoringIntervalGraphSteps(): DPFrame[] {
  const sorted = [...INTERVAL_COLORING_INTERVALS].sort((a, b) => a.start - b.start);
  const n = sorted.length;
  const g = makeGrid(3, n);
  sorted.forEach((iv, c) => {
    g.put(0, c, iv.start, "settled");
    g.put(1, c, iv.end, "settled");
  });
  const frames = [
    g.snap("初期状態: 重なる区間には別の色を塗る。開始時刻の順に見て、「いま重なっている区間が使っていない最小の色」を塗る(区間は半開区間[開始,終了)として扱う)"),
  ];
  const colors: number[] = [];
  sorted.forEach((iv, c) => {
    g.mark(0, c, "comparing");
    const used = new Set<number>();
    sorted.forEach((other, o) => {
      if (o < c && other.end > iv.start) used.add(colors[o]);
    });
    let color = 1;
    while (used.has(color)) color++;
    colors[c] = color;
    g.put(2, c, color, "pivot");
    g.mark(0, c, "settled");
    frames.push(g.snap(`区間${iv.label}[${iv.start},${iv.end}): 重なっている既存の区間が使う色は ${used.size > 0 ? [...used].sort().join(", ") : "なし"} → 色${color}`));
  });
  frames.push(g.snap(`使った色は ${Math.max(...colors)} 色。ある時刻に同時に重なる区間の最大数と一致するので、これより少ない色では塗れない(区間グラフでは貪欲彩色が最適)`));
  return frames;
}

// ---------------------------------------------------------------------------
// 締切付きジョブスケジューリング
// ---------------------------------------------------------------------------
export const JOB_SEQUENCING_JOBS: { name: string; profit: number; deadline: number }[] = [
  { name: "J1", profit: 100, deadline: 2 },
  { name: "J2", profit: 19, deadline: 1 },
  { name: "J3", profit: 27, deadline: 2 },
  { name: "J4", profit: 25, deadline: 1 },
  { name: "J5", profit: 15, deadline: 3 },
];
export const JOB_SEQUENCING_SLOTS = 3;

export function jobSequencingWithDeadlinesSteps(): DPFrame[] {
  const sorted = [...JOB_SEQUENCING_JOBS].sort((a, b) => b.profit - a.profit);
  const n = sorted.length;
  const slots = JOB_SEQUENCING_SLOTS;
  const g = makeGrid(3 + slots, n);
  sorted.forEach((job, c) => {
    g.put(0, c, job.profit, "settled");
    g.put(1, c, job.deadline, "settled");
  });
  const frames = [
    g.snap("初期状態: 各ジョブは1単位時間で、締切までに終えないと利益が0。利益の大きい順に見て、締切以前で「一番遅い空きスロット」に入れる(早い枠は後のジョブのために残す)"),
  ];
  const occupant: (string | null)[] = new Array(slots).fill(null);
  let total = 0;
  sorted.forEach((job, c) => {
    g.mark(0, c, "comparing");
    g.mark(1, c, "comparing");
    let slot = Math.min(job.deadline, slots) - 1;
    while (slot >= 0 && occupant[slot] !== null) slot--;
    if (slot >= 0) {
      occupant[slot] = job.name;
      total += job.profit;
      g.put(2, c, `スロット${slot + 1}`, "pivot");
      frames.push(g.snap(`${job.name}(利益${job.profit}・締切${job.deadline}): 締切以前で空いている一番遅いスロット${slot + 1}に入れる`));
    } else {
      g.put(2, c, "入らない");
      frames.push(g.snap(`${job.name}(利益${job.profit}・締切${job.deadline}): 締切以前のスロットが全て埋まっている → 見送る`));
    }
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    occupant.forEach((name, s) => g.put(3 + s, c, name, name === job.name ? "pivot" : "idle"));
  });
  frames.push(g.snap(`採用したジョブ: ${occupant.filter((x) => x).join(", ")}、合計利益 ${total}。利益の大きいものを先に確定し、後から覆さない`));
  return frames;
}

// ---------------------------------------------------------------------------
// Moore-Hodgson(遅れるジョブ数の最小化)
// ---------------------------------------------------------------------------
export const MOORE_HODGSON_JOBS: { name: string; time: number; due: number }[] = [
  { name: "J1", time: 4, due: 6 },
  { name: "J2", time: 3, due: 8 },
  { name: "J3", time: 2, due: 9 },
  { name: "J4", time: 5, due: 11 },
  { name: "J5", time: 4, due: 12 },
  { name: "J6", time: 2, due: 14 },
];

export function mooreHodgsonSteps(): DPFrame[] {
  const jobs = [...MOORE_HODGSON_JOBS].sort((a, b) => a.due - b.due);
  const n = jobs.length;
  const g = makeGrid(4, n);
  jobs.forEach((job, c) => {
    g.put(0, c, job.time, "settled");
    g.put(1, c, job.due, "settled");
  });
  const frames = [
    g.snap("初期状態: 締切に遅れるジョブの数を最小にしたい。締切の早い順に並べて採用していき、合計時間が締切を超えたら「採用中で最も処理時間の長いジョブ」を外す"),
  ];
  const chosen: number[] = [];
  let elapsed = 0;
  jobs.forEach((job, c) => {
    g.mark(0, c, "comparing");
    g.mark(1, c, "comparing");
    chosen.push(c);
    elapsed += job.time;
    g.put(2, c, elapsed, "comparing");
    g.put(3, c, "採用", "pivot");
    if (elapsed <= job.due) {
      frames.push(g.snap(`${job.name}を追加: 累積${elapsed} ≦ 締切${job.due} で間に合う`));
    } else {
      frames.push(g.snap(`${job.name}を追加: 累積${elapsed} > 締切${job.due} で遅れる。採用中で最長のジョブを外す`));
      let longest = chosen[0];
      for (const k of chosen) if (jobs[k].time > jobs[longest].time) longest = k;
      chosen.splice(chosen.indexOf(longest), 1);
      elapsed -= jobs[longest].time;
      g.put(3, longest, "除外", "idle");
      g.put(2, c, elapsed, "pivot");
      frames.push(g.snap(`${jobs[longest].name}(処理時間${jobs[longest].time})を外す → 累積が${elapsed}に戻り、${job.name}は間に合う`));
    }
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
  });
  frames.push(g.snap(`採用 ${chosen.map((k) => jobs[k].name).join(", ")}(${chosen.length}件)が全て締切に間に合う。遅れるのは ${n - chosen.length}件で、これが最小`));
  return frames;
}

// ---------------------------------------------------------------------------
// LPT法
// ---------------------------------------------------------------------------
export const LPT_JOBS = [7, 6, 5, 5, 4, 3, 3, 2];
export const LPT_MACHINES = 3;

export function lptSchedulingGreedySteps(): DPFrame[] {
  const jobs = [...LPT_JOBS].sort((a, b) => b - a);
  const m = LPT_MACHINES;
  const g = makeGrid(2 + m, jobs.length);
  jobs.forEach((t, c) => g.put(0, c, t, "settled"));
  const frames = [
    g.snap(`初期状態: ${jobs.length}個の仕事を${m}台の機械に割り当て、全体の終了時刻(最も遅い機械の負荷)を小さくしたい。長い仕事から順に、いま負荷が最小の機械へ入れる`),
  ];
  const load = new Array<number>(m).fill(0);
  jobs.forEach((t, c) => {
    g.mark(0, c, "comparing");
    let target = 0;
    for (let k = 1; k < m; k++) if (load[k] < load[target]) target = k;
    load[target] += t;
    g.put(1, c, `機械${target + 1}`, "pivot");
    load.forEach((l, k) => g.put(2 + k, c, l, k === target ? "pivot" : "idle"));
    g.mark(0, c, "settled");
    frames.push(g.snap(`仕事${t}: 負荷が最小の機械${target + 1}(${load[target] - t})に入れる → 負荷${load[target]}`));
  });
  frames.push(g.snap(`完了時刻(最大負荷)は ${Math.max(...load)}。LPTは最適解の 4/3−1/(3m) 倍以内に収まることが証明されている(厳密な最適を求めるのはNP困難)`));
  return frames;
}

// ---------------------------------------------------------------------------
// First-Fit Decreasing ビンパッキング
// ---------------------------------------------------------------------------
export const FFD_ITEMS = [5, 7, 5, 2, 4, 2, 5, 1, 6];
export const FFD_CAPACITY = 10;
const FFD_BIN_ROWS = 5;

export function firstFitDecreasingBinPackingSteps(): DPFrame[] {
  const items = [...FFD_ITEMS].sort((a, b) => b - a);
  const g = makeGrid(2 + FFD_BIN_ROWS, items.length);
  items.forEach((s, c) => g.put(0, c, s, "settled"));
  const frames = [
    g.snap(`初期状態: 容量${FFD_CAPACITY}の箱にできるだけ少ない数で詰める。大きい物から順に、入る箱のうち最初のものへ入れる(入らなければ新しい箱)`),
  ];
  const remaining: number[] = [];
  items.forEach((s, c) => {
    g.mark(0, c, "comparing");
    let bin = remaining.findIndex((r) => r >= s);
    if (bin === -1) {
      remaining.push(FFD_CAPACITY);
      bin = remaining.length - 1;
    }
    const fresh = remaining[bin] === FFD_CAPACITY;
    remaining[bin] -= s;
    g.put(1, c, `箱${bin + 1}`, "pivot");
    remaining.forEach((r, b) => g.put(2 + b, c, r, b === bin ? "pivot" : "idle"));
    g.mark(0, c, "settled");
    frames.push(g.snap(fresh ? `サイズ${s}: どの箱にも入らない → 箱${bin + 1}を新しく開ける(残り${remaining[bin]})` : `サイズ${s}: 先頭から調べて最初に入る箱${bin + 1}へ(残り${remaining[bin]})`));
  });
  const lowerBound = Math.ceil(items.reduce((a, b) => a + b, 0) / FFD_CAPACITY);
  frames.push(g.snap(`箱は ${remaining.length} 個。総サイズ${items.reduce((a, b) => a + b, 0)}÷容量${FFD_CAPACITY} の切り上げ ${lowerBound} 個が下限なので、${remaining.length === lowerBound ? "この例は最適" : "最適との差は小さい(FFDは最適の11/9倍+6/9個以内)"}`));
  return frames;
}

// ---------------------------------------------------------------------------
// エジプト分数分解(Fibonacci-Sylvester)
// ---------------------------------------------------------------------------
export const EGYPTIAN_NUMERATOR = 4;
export const EGYPTIAN_DENOMINATOR = 13;

export function egyptianFractionGreedySteps(): DPFrame[] {
  const steps: { n: number; d: number; k: number; nextN: number; nextD: number }[] = [];
  let n = EGYPTIAN_NUMERATOR;
  let d = EGYPTIAN_DENOMINATOR;
  while (n > 0) {
    const k = Math.ceil(d / n);
    const nn = n * k - d;
    const nd = d * k;
    const common = nn === 0 ? 1 : gcd(nn, nd);
    steps.push({ n, d, k, nextN: nn / common, nextD: nn === 0 ? 1 : nd / common });
    n = nn / common;
    d = nn === 0 ? 1 : nd / common;
  }
  const g = makeGrid(3, steps.length);
  const frames = [
    g.snap(`初期状態: ${EGYPTIAN_NUMERATOR}/${EGYPTIAN_DENOMINATOR} を、分子が1で分母が全て異なる分数(単位分数)の和で表す。残りを超えない最大の単位分数を、残りがなくなるまで引き続ける`),
  ];
  steps.forEach((step, c) => {
    g.put(0, c, `${step.n}/${step.d}`, "comparing");
    frames.push(g.snap(`第${c + 1}項: 残りは ${step.n}/${step.d}。これを超えない最大の単位分数の分母は ⌈${step.d}/${step.n}⌉ = ${step.k}`));
    g.put(1, c, `1/${step.k}`, "pivot");
    g.put(2, c, step.nextN === 0 ? "0" : `${step.nextN}/${step.nextD}`, step.nextN === 0 ? "settled" : "idle");
    g.mark(0, c, "settled");
    frames.push(g.snap(`${step.n}/${step.d} − 1/${step.k} = ${step.nextN === 0 ? "0(ぴったり)" : `${step.nextN}/${step.nextD}`}`));
  });
  frames.push(g.snap(`${EGYPTIAN_NUMERATOR}/${EGYPTIAN_DENOMINATOR} = ${steps.map((s) => `1/${s.k}`).join(" + ")}。分母は引くたびに急に大きくなるが、必ず有限回(分子が毎回小さくなるので)で終わる`));
  return frames;
}

// ---------------------------------------------------------------------------
// 貪欲集合被覆
// ---------------------------------------------------------------------------
export const SET_COVER_UNIVERSE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const SET_COVER_SETS: { name: string; items: number[] }[] = [
  { name: "S1", items: [1, 2, 3, 4, 5, 6] },
  { name: "S2", items: [5, 6, 7, 8] },
  { name: "S3", items: [1, 4, 7, 10] },
  { name: "S4", items: [2, 5, 8, 9] },
  { name: "S5", items: [9, 10] },
];
const SET_COVER_ROWS = 4;

export function setCoverGreedySteps(): DPFrame[] {
  const sets = SET_COVER_SETS;
  const g = makeGrid(SET_COVER_ROWS, sets.length);
  const frames = [
    g.snap(`初期状態: 全要素 1〜${SET_COVER_UNIVERSE.length} を覆う集合を少なく選ぶ。毎回「まだ覆われていない要素を最も多く新しく覆う集合」を選ぶ`),
  ];
  const covered = new Set<number>();
  const chosen = new Set<number>();
  for (let round = 0; round < SET_COVER_ROWS && covered.size < SET_COVER_UNIVERSE.length; round++) {
    sets.forEach((s, c) => {
      if (chosen.has(c)) g.put(round, c, "採用済", "settled");
      else g.put(round, c, s.items.filter((x) => !covered.has(x)).length, "comparing");
    });
    frames.push(g.snap(`第${round + 1}回: 各集合が新しく覆える要素数を数える(覆われていない要素: ${SET_COVER_UNIVERSE.filter((x) => !covered.has(x)).join(", ")})`));
    let best = -1;
    let bestGain = 0;
    sets.forEach((s, c) => {
      if (chosen.has(c)) return;
      const gain = s.items.filter((x) => !covered.has(x)).length;
      if (gain > bestGain) {
        bestGain = gain;
        best = c;
      }
    });
    chosen.add(best);
    sets[best].items.forEach((x) => covered.add(x));
    sets.forEach((_, c) => {
      if (!chosen.has(c)) g.mark(round, c, "idle");
    });
    g.mark(round, best, "pivot");
    frames.push(g.snap(`${sets[best].name}を採用(新しく${bestGain}個を覆う)。覆われた要素は計${covered.size}/${SET_COVER_UNIVERSE.length}`));
  }
  frames.push(g.snap(`全要素を覆えた。採用 ${[...chosen].map((c) => sets[c].name).join(", ")}(${chosen.size}個)。貪欲な選び方は最適の ln(n) 倍程度以内に収まる(最適解を厳密に求めるのはNP困難)`));
  return frames;
}

// ---------------------------------------------------------------------------
// 最適マージパターン
// ---------------------------------------------------------------------------
export const MERGE_FILE_SIZES = [20, 30, 10, 5, 30];

export function optimalMergePatternSteps(): DPFrame[] {
  const sizes = [...MERGE_FILE_SIZES];
  const n = sizes.length - 1;
  const g = makeGrid(4, n);
  const frames = [
    g.snap(`初期状態: サイズ ${sizes.join(", ")} のファイルを2つずつ併合して1つにする。併合のコストは「できたファイルのサイズ」。毎回、最も小さい2つを併合するのが最小(ハフマン符号と同じ形)`),
  ];
  let pool = [...sizes];
  let total = 0;
  for (let c = 0; c < n; c++) {
    pool.sort((a, b) => a - b);
    const [a, b] = pool;
    g.put(0, c, a, "comparing");
    g.put(1, c, b, "comparing");
    frames.push(g.snap(`第${c + 1}回: 手元は ${pool.join(", ")}。最小の2つ ${a} と ${b} を選ぶ`));
    total += a + b;
    pool = [a + b, ...pool.slice(2)];
    g.put(2, c, a + b, "pivot");
    g.put(3, c, total, "pivot");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(g.snap(`併合して ${a + b}(コスト${a + b})。累計コスト ${total}。次は ${[...pool].sort((x, y) => x - y).join(", ")}`));
  }
  g.mark(3, n - 1, "settled");
  frames.push(g.snap(`総コストは ${total}。小さいものほど深く(何度も)併合され、大きいものは最後に1回だけ併合されるので、足し込まれる回数が少なく済む`));
  return frames;
}

// ---------------------------------------------------------------------------
// シャノン・ファノ符号
// ---------------------------------------------------------------------------
export const SHANNON_FANO_SYMBOLS: { symbol: string; freq: number }[] = [
  { symbol: "A", freq: 15 },
  { symbol: "B", freq: 7 },
  { symbol: "C", freq: 6 },
  { symbol: "D", freq: 6 },
  { symbol: "E", freq: 5 },
];

/** 頻度の合計がなるべく等しくなる位置で2つに分ける(上から順)。 */
export function shannonFanoSplit(freqs: readonly number[]): number {
  const total = freqs.reduce((a, b) => a + b, 0);
  let best = 1;
  let bestDiff = Infinity;
  let left = 0;
  for (let k = 1; k < freqs.length; k++) {
    left += freqs[k - 1];
    const diff = Math.abs(total - 2 * left);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return best;
}

export function shannonFanoCodingSteps(): DPFrame[] {
  const symbols = [...SHANNON_FANO_SYMBOLS].sort((a, b) => b.freq - a.freq);
  const n = symbols.length;
  const g = makeGrid(2, n);
  const codes = new Array<string>(n).fill("");
  symbols.forEach((s, c) => {
    g.put(0, c, s.freq, "settled");
    g.put(1, c, "", "idle");
  });
  const frames = [
    g.snap("初期状態: 頻度の高い順に並べ、頻度の合計がなるべく等しくなる所で上下2つに分ける。上のグループに0、下に1を付け、1つになるまで分割を繰り返す(上から下へ決める点がハフマンと逆)"),
  ];
  const split = (lo: number, hi: number) => {
    if (hi - lo <= 1) return;
    const k = lo + shannonFanoSplit(symbols.slice(lo, hi).map((s) => s.freq));
    const sumLeft = symbols.slice(lo, k).reduce((a, s) => a + s.freq, 0);
    const sumRight = symbols.slice(k, hi).reduce((a, s) => a + s.freq, 0);
    for (let c = lo; c < hi; c++) g.mark(0, c, "comparing");
    frames.push(
      g.snap(`${symbols.slice(lo, hi).map((s) => s.symbol).join("")} を、頻度の合計の差が最小になる所で分ける: ${symbols.slice(lo, k).map((s) => s.symbol).join("")}(${sumLeft}) | ${symbols.slice(k, hi).map((s) => s.symbol).join("")}(${sumRight})`),
    );
    for (let c = lo; c < hi; c++) {
      codes[c] += c < k ? "0" : "1";
      g.put(1, c, codes[c], "pivot");
      g.mark(0, c, "settled");
    }
    frames.push(g.snap(`上のグループに0、下のグループに1を付ける`));
    split(lo, k);
    split(k, hi);
  };
  split(0, n);
  symbols.forEach((_, c) => g.mark(1, c, "settled"));
  const average = symbols.reduce((a, s, c) => a + s.freq * codes[c].length, 0) / symbols.reduce((a, s) => a + s.freq, 0);
  frames.push(g.snap(`完成: ${symbols.map((s, c) => `${s.symbol}=${codes[c]}`).join(", ")}。平均符号長 ${average.toFixed(3)} ビット。どの符号も他の符号の先頭にならない(接頭辞符号)が、ハフマン符号より長くなる場合がある`));
  return frames;
}

// ---------------------------------------------------------------------------
// 正準ハフマン符号
// ---------------------------------------------------------------------------
export const CANONICAL_HUFFMAN_LENGTHS: { symbol: string; length: number }[] = [
  { symbol: "A", length: 2 },
  { symbol: "B", length: 2 },
  { symbol: "C", length: 2 },
  { symbol: "D", length: 3 },
  { symbol: "E", length: 4 },
  { symbol: "F", length: 4 },
];

export function canonicalCodes(symbols: readonly { symbol: string; length: number }[]): { symbol: string; length: number; code: number }[] {
  const sorted = [...symbols].sort((a, b) => a.length - b.length || a.symbol.localeCompare(b.symbol));
  let code = 0;
  let prevLength = sorted[0].length;
  return sorted.map((s, i) => {
    if (i > 0) code = (code + 1) << (s.length - prevLength);
    prevLength = s.length;
    return { ...s, code };
  });
}

export function huffmanCanonicalCodesSteps(): DPFrame[] {
  const result = canonicalCodes(CANONICAL_HUFFMAN_LENGTHS);
  const n = result.length;
  const g = makeGrid(3, n);
  result.forEach((s, c) => g.put(0, c, s.length, "settled"));
  const frames = [
    g.snap("初期状態: 符号の長さだけが分かっている(木の形は捨ててよい)。符号長の短い順(同じなら記号順)に並べ、「前の符号に1を足し、長くなる分だけ0を右に付ける」規則で符号を決める。長さの表だけで符号表を復元できる"),
  ];
  result.forEach((s, c) => {
    g.mark(0, c, "comparing");
    g.put(1, c, s.code, "pivot");
    g.put(2, c, s.code.toString(2).padStart(s.length, "0"), "pivot");
    g.mark(0, c, "settled");
    frames.push(
      g.snap(
        c === 0
          ? `${s.symbol}(長さ${s.length}): 最初の符号は全て0 → ${s.code.toString(2).padStart(s.length, "0")}`
          : `${s.symbol}(長さ${s.length}): 前の符号 ${result[c - 1].code.toString(2).padStart(result[c - 1].length, "0")} に1を足し、${s.length > result[c - 1].length ? `長さが${s.length - result[c - 1].length}増えるので0を右に付ける` : "同じ長さなのでそのまま"} → ${s.code.toString(2).padStart(s.length, "0")}`,
      ),
    );
  });
  frames.push(g.snap(`完成: ${result.map((s) => `${s.symbol}=${s.code.toString(2).padStart(s.length, "0")}`).join(", ")}。符号は数として昇順に並び、どれも他の符号の先頭にならない。復号の表が小さく済む(DEFLATE/JPEGなどで使われる)`));
  return frames;
}

// ---------------------------------------------------------------------------
// クールダウン付きタスクスケジューラ
// ---------------------------------------------------------------------------
export const TASK_SCHEDULER_COUNTS: { name: string; count: number }[] = [
  { name: "A", count: 3 },
  { name: "B", count: 3 },
  { name: "C", count: 1 },
];
export const TASK_SCHEDULER_COOLDOWN = 2;

export function taskSchedulerCooldownGreedySteps(): DPFrame[] {
  const counts = TASK_SCHEDULER_COUNTS.map((t) => ({ ...t }));
  const n = TASK_SCHEDULER_COOLDOWN;
  const total = counts.reduce((a, t) => a + t.count, 0);
  const maxCount = Math.max(...counts.map((t) => t.count));
  const slots = Math.max(total, (maxCount - 1) * (n + 1) + counts.filter((t) => t.count === maxCount).length);
  const g = makeGrid(1 + counts.length, slots);
  const frames = [
    g.snap(`初期状態: 同じタスクは ${n} 単位時間あけないと再実行できない。毎スロット、「クールダウンが明けているタスクのうち残りが最多のもの」を実行し、なければ待機する(多いものを先に回さないと、最後に待ち時間が残る)`),
  ];
  const lastRun = new Array<number>(counts.length).fill(-Infinity);
  let time = 0;
  while (counts.some((t) => t.count > 0)) {
    let pick = -1;
    counts.forEach((t, k) => {
      if (t.count > 0 && time - lastRun[k] > n && (pick === -1 || t.count > counts[pick].count)) pick = k;
    });
    if (pick === -1) {
      g.put(0, time, "待機", "idle");
      counts.forEach((t, k) => g.put(1 + k, time, t.count));
      frames.push(g.snap(`時刻${time + 1}: 実行できるタスクがない(全てクールダウン中) → 待機`));
    } else {
      counts[pick].count--;
      lastRun[pick] = time;
      g.put(0, time, counts[pick].name, "pivot");
      counts.forEach((t, k) => g.put(1 + k, time, t.count, k === pick ? "pivot" : "idle"));
      frames.push(g.snap(`時刻${time + 1}: 実行可能なタスクのうち残りが最多の ${counts[pick].name} を実行(残り${counts[pick].count})`));
    }
    time++;
  }
  g.mark(0, time - 1, "settled");
  frames.push(g.snap(`全タスクを ${time} 単位時間で完了。最多のタスクの間隔がボトルネックで、公式 max(総数, (最大回数−1)×(n+1)+最大回数のタスク数) = ${slots} と一致する`));
  return frames;
}

// ---------------------------------------------------------------------------
// レジストリと表のメタ情報(DP_VISUALIZERS / DP_TABLE_META に統合される)
// ---------------------------------------------------------------------------

const chipList = (label: string, values: readonly (number | string)[]) => `${label}: ${values.join(", ")}`;

export const GREEDY_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "best-time-to-buy-sell-stock-greedy": bestTimeToBuySellStockSteps,
  "jump-game-greedy": jumpGameGreedySteps,
  "gas-station-greedy": gasStationGreedySteps,
  "candy-distribution-greedy": candyDistributionGreedySteps,
  "stock-span-greedy-stack": stockSpanGreedyStackSteps,
  "minimum-meeting-rooms": minimumMeetingRoomsSteps,
  "greedy-interval-point-cover": greedyIntervalPointCoverSteps,
  "greedy-coloring-interval-graph": greedyColoringIntervalGraphSteps,
  "job-sequencing-with-deadlines": jobSequencingWithDeadlinesSteps,
  "moore-hodgson-algorithm": mooreHodgsonSteps,
  "lpt-scheduling-greedy": lptSchedulingGreedySteps,
  "first-fit-decreasing-bin-packing": firstFitDecreasingBinPackingSteps,
  "egyptian-fraction-greedy": egyptianFractionGreedySteps,
  "set-cover-greedy": setCoverGreedySteps,
  "optimal-merge-pattern": optimalMergePatternSteps,
  "shannon-fano-coding": shannonFanoCodingSteps,
  "huffman-canonical-codes": huffmanCanonicalCodesSteps,
  "task-scheduler-cooldown-greedy": taskSchedulerCooldownGreedySteps,
};

export const GREEDY_TABLE_META: Record<string, DPTableMeta> = {
  "best-time-to-buy-sell-stock-greedy": {
    chips: [chipList("株価", STOCK_PRICES), "1回だけ買って1回だけ売る"],
    cornerLabel: "項目 \\ 日",
    rowHeaders: ["株価", "これまでの最安値", "今日売った利益", "最大利益(ここまで)"],
    colHeaders: STOCK_PRICES.map((_, i) => `${i}日目`),
  },
  "jump-game-greedy": {
    chips: [chipList("各マスの最大歩数", JUMP_GAME_NUMS), `ゴール: マス${JUMP_GAME_NUMS.length - 1}`],
    cornerLabel: "項目 \\ マス",
    rowHeaders: ["最大歩数", "届く最遠位置", "判定"],
    colHeaders: JUMP_GAME_NUMS.map((_, i) => `マス${i}`),
  },
  "gas-station-greedy": {
    chips: [chipList("給油量", GAS_STATION_GAS), chipList("消費量", GAS_STATION_COST), "円形の道を1周"],
    cornerLabel: "項目 \\ スタンド",
    rowHeaders: ["給油量", "消費量", "差(給油−消費)", "走行中のタンク", "出発地の候補"],
    colHeaders: GAS_STATION_GAS.map((_, i) => `スタンド${i}`),
  },
  "candy-distribution-greedy": {
    chips: [chipList("評価", CANDY_RATINGS), "全員1個以上・隣より高評価なら多く"],
    cornerLabel: "項目 \\ 子",
    rowHeaders: ["評価", "左→右の1回目", "右→左の2回目(最終)"],
    colHeaders: CANDY_RATINGS.map((_, i) => `子${i}`),
  },
  "stock-span-greedy-stack": {
    chips: [chipList("株価", STOCK_SPAN_PRICES)],
    cornerLabel: "項目 \\ 日",
    rowHeaders: ["株価", "スパン", "スタックの中身(底→上)"],
    colHeaders: STOCK_SPAN_PRICES.map((_, i) => `${i}日目`),
  },
  "minimum-meeting-rooms": {
    chips: [`会議: ${MEETINGS.map(([s, e]) => `${s}-${e}`).join(", ")}`],
    cornerLabel: "項目 \\ 会議(開始順)",
    rowHeaders: ["開始", "終了", "割り当てた部屋", "ここまでの部屋数"],
    colHeaders: [...MEETINGS].sort((a, b) => a[0] - b[0]).map((_, i) => `会議${i + 1}`),
  },
  "greedy-interval-point-cover": {
    chips: [`区間: ${POINT_COVER_INTERVALS.map((iv) => `${iv.label}[${iv.start},${iv.end}]`).join(", ")}`],
    cornerLabel: "項目 \\ 区間(終了順)",
    rowHeaders: ["開始", "終了", "点の判定"],
    colHeaders: [...POINT_COVER_INTERVALS].sort((a, b) => a.end - b.end).map((iv) => iv.label),
  },
  "greedy-coloring-interval-graph": {
    chips: [`区間: ${INTERVAL_COLORING_INTERVALS.map((iv) => `${iv.label}[${iv.start},${iv.end})`).join(", ")}`],
    cornerLabel: "項目 \\ 区間(開始順)",
    rowHeaders: ["開始", "終了", "塗る色"],
    colHeaders: [...INTERVAL_COLORING_INTERVALS].sort((a, b) => a.start - b.start).map((iv) => iv.label),
  },
  "job-sequencing-with-deadlines": {
    chips: [`ジョブ: ${JOB_SEQUENCING_JOBS.map((j) => `${j.name}(利益${j.profit}・締切${j.deadline})`).join(", ")}`],
    cornerLabel: "項目 \\ ジョブ(利益順)",
    rowHeaders: ["利益", "締切", "割り当て", ...range(JOB_SEQUENCING_SLOTS).map((s) => `スロット${s + 1}の中身`)],
    colHeaders: [...JOB_SEQUENCING_JOBS].sort((a, b) => b.profit - a.profit).map((j) => j.name),
  },
  "moore-hodgson-algorithm": {
    chips: [`ジョブ: ${MOORE_HODGSON_JOBS.map((j) => `${j.name}(時間${j.time}・締切${j.due})`).join(", ")}`],
    cornerLabel: "項目 \\ ジョブ(締切順)",
    rowHeaders: ["処理時間", "締切", "採用中の累積時間", "結果"],
    colHeaders: [...MOORE_HODGSON_JOBS].sort((a, b) => a.due - b.due).map((j) => j.name),
  },
  "lpt-scheduling-greedy": {
    chips: [chipList("処理時間", LPT_JOBS), `機械: ${LPT_MACHINES}台`],
    cornerLabel: "項目 \\ 仕事(長い順)",
    rowHeaders: ["処理時間", "割り当て先", ...range(LPT_MACHINES).map((k) => `機械${k + 1}の負荷`)],
    colHeaders: [...LPT_JOBS].sort((a, b) => b - a).map((_, i) => `仕事${i + 1}`),
  },
  "first-fit-decreasing-bin-packing": {
    chips: [chipList("サイズ", FFD_ITEMS), `箱の容量: ${FFD_CAPACITY}`],
    cornerLabel: "項目 \\ 品物(大きい順)",
    rowHeaders: ["サイズ", "入れた箱", ...range(FFD_BIN_ROWS).map((b) => `箱${b + 1}の残り`)],
    colHeaders: [...FFD_ITEMS].sort((a, b) => b - a).map((_, i) => `品${i + 1}`),
  },
  "egyptian-fraction-greedy": {
    chips: [`分解する分数: ${EGYPTIAN_NUMERATOR}/${EGYPTIAN_DENOMINATOR}`],
    cornerLabel: "項目 \\ 項",
    rowHeaders: ["残り", "引く単位分数", "引いた後の残り"],
    colHeaders: (() => {
      let count = 0;
      let n = EGYPTIAN_NUMERATOR;
      let d = EGYPTIAN_DENOMINATOR;
      while (n > 0) {
        const k = Math.ceil(d / n);
        const nn = n * k - d;
        const nd = d * k;
        const common = nn === 0 ? 1 : gcd(nn, nd);
        n = nn / common;
        d = nn === 0 ? 1 : nd / common;
        count++;
      }
      return range(count).map((i) => `第${i + 1}項`);
    })(),
  },
  "set-cover-greedy": {
    chips: [`全体: 1〜${SET_COVER_UNIVERSE.length}`, ...SET_COVER_SETS.map((s) => `${s.name}={${s.items.join(",")}}`)],
    cornerLabel: "回 \\ 集合",
    rowHeaders: range(SET_COVER_ROWS).map((r) => `第${r + 1}回(新しく覆う数)`),
    colHeaders: SET_COVER_SETS.map((s) => s.name),
  },
  "optimal-merge-pattern": {
    chips: [chipList("ファイルサイズ", MERGE_FILE_SIZES)],
    cornerLabel: "項目 \\ 併合",
    rowHeaders: ["最小の1つ目", "最小の2つ目", "併合後のサイズ(コスト)", "累計コスト"],
    colHeaders: range(MERGE_FILE_SIZES.length - 1).map((i) => `第${i + 1}回`),
  },
  "shannon-fano-coding": {
    chips: [`頻度: ${SHANNON_FANO_SYMBOLS.map((s) => `${s.symbol}=${s.freq}`).join(", ")}`],
    cornerLabel: "項目 \\ 記号(頻度順)",
    rowHeaders: ["頻度", "符号(分割のたびに伸びる)"],
    colHeaders: [...SHANNON_FANO_SYMBOLS].sort((a, b) => b.freq - a.freq).map((s) => s.symbol),
  },
  "huffman-canonical-codes": {
    chips: [`符号長: ${CANONICAL_HUFFMAN_LENGTHS.map((s) => `${s.symbol}=${s.length}`).join(", ")}`],
    cornerLabel: "項目 \\ 記号(長さ順)",
    rowHeaders: ["符号長", "符号(数値)", "正準符号(2進)"],
    colHeaders: canonicalCodes(CANONICAL_HUFFMAN_LENGTHS).map((s) => s.symbol),
  },
  "task-scheduler-cooldown-greedy": {
    chips: [`タスク: ${TASK_SCHEDULER_COUNTS.map((t) => `${t.name}×${t.count}`).join(", ")}`, `クールダウン: ${TASK_SCHEDULER_COOLDOWN}`],
    cornerLabel: "項目 \\ 時刻",
    rowHeaders: ["実行したタスク", ...TASK_SCHEDULER_COUNTS.map((t) => `${t.name}の残り`)],
    colHeaders: (() => {
      const total = TASK_SCHEDULER_COUNTS.reduce((a, t) => a + t.count, 0);
      const maxCount = Math.max(...TASK_SCHEDULER_COUNTS.map((t) => t.count));
      const slots = Math.max(
        total,
        (maxCount - 1) * (TASK_SCHEDULER_COOLDOWN + 1) + TASK_SCHEDULER_COUNTS.filter((t) => t.count === maxCount).length,
      );
      return range(slots).map((i) => `${i + 1}`);
    })(),
  },
};
