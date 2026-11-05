import type { DPFrame, DPTableMeta } from "./dp-visualizers.ts";
import { makeGrid, range } from "./table-grid.ts";

/**
 * 数理ゲーム理論の可視化(DPテーブル型の属性表を再利用する)。
 * 列 = プレイヤー・戦略・ラウンド・世代、行 = 利得や判定の中間量。
 * ゲーム理論の概念(均衡・安定性・公平な分配)は「定義を満たすか」の判定なので、
 * 判定の各段階を表に出し、検証では全探索(逸脱の総当たり)で定義どおりか確かめる。
 */

const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------------------
// シャープレイ値
// ---------------------------------------------------------------------------

export const SHAPLEY_PLAYERS = ["A", "B", "C"];
/** 特性関数 v(S): 提携Sが単独で生み出せる価値。キーは提携のプレイヤーをABC順に連結した文字列。 */
export const SHAPLEY_VALUE: Record<string, number> = { "": 0, A: 10, B: 20, C: 30, AB: 50, AC: 60, BC: 70, ABC: 100 };

const coalition = (members: readonly string[]) => [...members].sort().join("");

export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

/** 各並びで、先頭から順に加わったときの限界貢献 v(S∪{i}) − v(S)。 */
export function shapleyContributions(): { order: string[]; contribution: Record<string, number> }[] {
  return permutations(SHAPLEY_PLAYERS).map((order) => {
    const contribution: Record<string, number> = {};
    const present: string[] = [];
    for (const player of order) {
      contribution[player] = SHAPLEY_VALUE[coalition([...present, player])] - SHAPLEY_VALUE[coalition(present)];
      present.push(player);
    }
    return { order, contribution };
  });
}

export function shapleyValueSteps(): DPFrame[] {
  const rows = shapleyContributions();
  const n = rows.length;
  const g = makeGrid(SHAPLEY_PLAYERS.length + 1, n + 1);
  const frames = [
    g.snap(`初期状態: 3人が協力して価値 ${SHAPLEY_VALUE.ABC} を生む。各人の取り分を公平に決めたい。「全員がランダムな順に1人ずつ加わる」と考え、加わった瞬間に増えた価値(限界貢献)を、全ての順番で平均する`),
  ];
  rows.forEach((row, c) => {
    SHAPLEY_PLAYERS.forEach((p, k) => g.put(k, c, row.contribution[p], "comparing"));
    const steps = row.order.map((p, i) => `${p}が加わって ${SHAPLEY_VALUE[coalition(row.order.slice(0, i))]}→${SHAPLEY_VALUE[coalition(row.order.slice(0, i + 1))]}(+${row.contribution[p]})`);
    frames.push(g.snap(`順番 ${row.order.join("→")}: ${steps.join("、")}`));
    const total = SHAPLEY_PLAYERS.reduce((s, p) => s + row.contribution[p], 0);
    g.put(SHAPLEY_PLAYERS.length, c, total, "pivot");
    SHAPLEY_PLAYERS.forEach((_, k) => g.mark(k, c, "settled"));
    frames.push(g.snap(`順番 ${row.order.join("→")} の限界貢献の合計は ${total} = 全体の価値(どの順番でも必ず全体の価値になる)`));
  });
  const averages = SHAPLEY_PLAYERS.map((p) => rows.reduce((s, r) => s + r.contribution[p], 0) / n);
  averages.forEach((avg, k) => g.put(k, n, r2(avg), "pivot"));
  g.put(SHAPLEY_PLAYERS.length, n, r2(averages.reduce((a, b) => a + b, 0)), "settled");
  frames.push(g.snap(`全${n}通りの平均がシャープレイ値: ${SHAPLEY_PLAYERS.map((p, k) => `${p}=${r2(averages[k])}`).join("、")}。合計は ${r2(averages.reduce((a, b) => a + b, 0))} で全体の価値に一致(効率性)。単独の価値が大きいCほど取り分が多いが、他との組み合わせの貢献も反映される`));
  return frames;
}

// ---------------------------------------------------------------------------
// ヴィッカリーオークション(第二価格封印入札)
// ---------------------------------------------------------------------------

export const VICKREY_BIDDERS = ["A", "B", "C", "D", "E"];
export const VICKREY_VALUES = [60, 85, 70, 95, 40];

/** 正直な入札の下での結果: 最高額の人が、2番目に高い額を払って落札する。 */
export function vickreyOutcome(bids: readonly number[]): { winner: number; price: number } {
  const order = bids.map((b, i) => [b, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return { winner: order[0][1], price: order[1][0] };
}

export function vickreyAuctionSteps(): DPFrame[] {
  const bids = VICKREY_VALUES;
  const n = bids.length;
  const g = makeGrid(5, n);
  VICKREY_VALUES.forEach((v, c) => {
    g.put(0, c, v, "settled");
    g.put(1, c, v, "settled");
  });
  const frames = [
    g.snap("初期状態: 各人が自分にとっての価値(評価額)を持ち、入札額を封筒に入れる。最高額の人が落札するが、払うのは「2番目に高い入札額」。これだと、自分の評価額をそのまま入札するのが最善になる(嘘をついても得をしない)"),
  ];
  const { winner, price } = vickreyOutcome(bids);
  const ranks = bids.map((b) => 1 + bids.filter((x) => x > b).length);
  ranks.forEach((rank, c) => {
    g.mark(1, c, "comparing");
    g.put(2, c, rank, "comparing");
    frames.push(g.snap(`${VICKREY_BIDDERS[c]}の入札 ${bids[c]} は${rank}位`));
    g.mark(1, c, "settled");
  });
  g.put(3, winner, "落札", "settled");
  g.put(4, winner, VICKREY_VALUES[winner] - price, "settled");
  VICKREY_BIDDERS.forEach((_, c) => {
    if (c !== winner) {
      g.put(3, c, "落選", "idle");
      g.put(4, c, 0, "idle");
    }
  });
  frames.push(g.snap(`${VICKREY_BIDDERS[winner]}が最高額 ${bids[winner]} で落札。払う額は2番目に高い入札 ${price}。利得 = 評価額 ${VICKREY_VALUES[winner]} − 支払額 ${price} = ${VICKREY_VALUES[winner] - price}。自分の入札額は支払額に影響しない`));
  const lowerBid = price - 1;
  frames.push(g.snap(`もし${VICKREY_BIDDERS[winner]}が本当の評価額より低く(例: ${lowerBid})入札すると、落札できず利得は0に下がる。逆に高く入札しても、落札して払う額は同じ ${price} のまま。どちらも得にならないので、正直な入札が最善戦略`));
  return frames;
}

// ---------------------------------------------------------------------------
// しっぺ返し戦略(繰り返し囚人のジレンマ)
// ---------------------------------------------------------------------------

export const PD_PAYOFF = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] } as const;
/** 相手(B)の手の列。C=協力、D=裏切り。 */
export const TFT_OPPONENT = "CCDCDDDCDD".split("");

export function playTitForTat(opponent: readonly string[]): { a: string[]; scoreA: number[]; scoreB: number[] } {
  const a: string[] = [];
  const scoreA: number[] = [];
  const scoreB: number[] = [];
  opponent.forEach((b, t) => {
    const move = t === 0 ? "C" : opponent[t - 1];
    a.push(move);
    const [pa, pb] = PD_PAYOFF[`${move}${b}` as keyof typeof PD_PAYOFF];
    scoreA.push(pa);
    scoreB.push(pb);
  });
  return { a, scoreA, scoreB };
}

export function titForTatIteratedPrisonersDilemmaSteps(): DPFrame[] {
  const opponent = TFT_OPPONENT;
  const { a, scoreA, scoreB } = playTitForTat(opponent);
  const n = opponent.length;
  const g = makeGrid(6, n);
  const frames = [
    g.snap("初期状態: 毎回「協力(C)」か「裏切り(D)」を同時に出す。得点は 互いに協力 3-3、片方だけ裏切ると裏切った側5・協力した側0、互いに裏切り 1-1。しっぺ返し(TFT)は「最初は協力、以降は相手の直前の手をそのまま返す」"),
  ];
  let cumA = 0;
  let cumB = 0;
  opponent.forEach((b, t) => {
    g.put(0, t, a[t], "comparing");
    g.put(1, t, b, "comparing");
    frames.push(g.snap(t === 0 ? "第1回: TFTは最初なので協力(C)" : `第${t + 1}回: TFTは相手の前回の手 ${opponent[t - 1]} を返して ${a[t]}。相手は ${b}`));
    cumA += scoreA[t];
    cumB += scoreB[t];
    g.put(2, t, scoreA[t], "pivot");
    g.put(3, t, scoreB[t], "pivot");
    g.put(4, t, cumA, "idle");
    g.put(5, t, cumB, "idle");
    g.mark(0, t, "settled");
    g.mark(1, t, "settled");
    frames.push(g.snap(`${a[t]} と ${b} で TFT ${scoreA[t]}点・相手 ${scoreB[t]}点。累計は TFT ${cumA}・相手 ${cumB}`));
  });
  g.mark(4, n - 1, "settled");
  g.mark(5, n - 1, "settled");
  frames.push(g.snap(`${n}回の累計: TFT ${cumA}点、相手 ${cumB}点。TFT は自分から裏切ることがなく、裏切りには1回遅れて報復し、協力にはすぐ協力に戻る。直接対決では${cumA < cumB ? "今回も相手に点数で及ばない" : cumA > cumB ? "今回は相手を上回った" : "今回は同点"}が、決して搾取され続けず、協力的な相手とは互いに高得点を積める。この性質で、多数の戦略を総当たりさせた大会で好成績を収めた`));
  return frames;
}

// ---------------------------------------------------------------------------
// タカハトゲーム(レプリケーター動学)
// ---------------------------------------------------------------------------

export const HD_V = 4;
export const HD_C = 6;
export const HD_ETA = 0.8;
export const HD_START = 0.1;
export const HD_GENERATIONS = 12;

export const hdPayoffHawk = (p: number) => p * ((HD_V - HD_C) / 2) + (1 - p) * HD_V;
export const hdPayoffDove = (p: number) => p * 0 + (1 - p) * (HD_V / 2);

export function hawkDoveTrajectory(): number[] {
  const path = [HD_START];
  for (let t = 1; t < HD_GENERATIONS; t++) {
    const p = path[t - 1];
    path.push(p + HD_ETA * p * (1 - p) * (hdPayoffHawk(p) - hdPayoffDove(p)));
  }
  return path;
}

export function hawkDoveGameSteps(): DPFrame[] {
  const path = hawkDoveTrajectory();
  const g = makeGrid(4, HD_GENERATIONS);
  const frames = [
    g.snap(`初期状態: 資源の価値 V=${HD_V}、戦いのコスト C=${HD_C}。タカ(戦う)同士は平均 (V−C)/2=${(HD_V - HD_C) / 2}、タカ対ハトはタカが V=${HD_V}・ハトが0、ハト同士は V/2=${HD_V / 2}。利得の高い戦略ほど割合が増える(レプリケーター動学)。最初のタカの割合は ${HD_START}`),
  ];
  path.forEach((p, t) => {
    const fh = hdPayoffHawk(p);
    const fd = hdPayoffDove(p);
    const mean = p * fh + (1 - p) * fd;
    g.put(0, t, r3(p), "comparing");
    frames.push(g.snap(`第${t}世代: タカの割合 p=${r3(p)}`));
    g.put(1, t, r3(fh), "pivot");
    g.put(2, t, r3(fd), "pivot");
    g.put(3, t, r3(mean), "idle");
    g.mark(0, t, "settled");
    frames.push(g.snap(`タカの平均利得 ${r3(fh)}、ハトの平均利得 ${r3(fd)}。${fh > fd ? "タカのほうが得なので次の世代でタカが増える" : fh < fd ? "ハトのほうが得なので次の世代でタカが減る" : "同じなので割合は変わらない(均衡)"}`));
  });
  const equilibrium = HD_V / HD_C;
  g.mark(0, HD_GENERATIONS - 1, "settled");
  frames.push(g.snap(`タカの割合は ${r3(path[path.length - 1])} に近づく。両者の利得が等しくなる割合 V/C = ${HD_V}/${HD_C} = ${r3(equilibrium)} が進化的に安定な状態。そこを超えるとタカ同士の戦いのコストでタカが損をして減り、下回ると得をして増える`));
  return frames;
}

// ---------------------------------------------------------------------------
// 進化的に安定な戦略(ESS)の判定
// ---------------------------------------------------------------------------

/** 戦略 x(タカを出す確率)が戦略 y に対して得る期待利得(タカハトゲーム)。 */
export function hdExpected(x: number, y: number): number {
  return x * y * ((HD_V - HD_C) / 2) + x * (1 - y) * HD_V + (1 - x) * y * 0 + (1 - x) * (1 - y) * (HD_V / 2);
}

export const ESS_CANDIDATES: { label: string; p: number }[] = [
  { label: "タカだけ", p: 1 },
  { label: "ハトだけ", p: 0 },
  { label: `混合(タカ ${HD_V}/${HD_C})`, p: HD_V / HD_C },
];
const ESS_TOLERANCE = 1e-9;

export type EssResult = { own: number; bestInvader: number; invaderGain: number; strictlySafe: boolean; tieOk: boolean | null; ess: boolean };

export function essCheck(p: number): EssResult {
  const own = hdExpected(p, p);
  let bestInvader = -1;
  let bestGain = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const q = i / 100;
    if (Math.abs(q - p) < 1e-12) continue;
    const gain = hdExpected(q, p);
    if (gain > bestGain) {
      bestGain = gain;
      bestInvader = q;
    }
  }
  const strictlySafe = bestGain < own - ESS_TOLERANCE;
  const ties = bestGain >= own - ESS_TOLERANCE && bestGain <= own + ESS_TOLERANCE;
  let tieOk: boolean | null = null;
  if (ties) {
    tieOk = true;
    for (let i = 0; i <= 100; i++) {
      const q = i / 100;
      if (Math.abs(q - p) < 1e-12) continue;
      if (Math.abs(hdExpected(q, p) - own) <= ESS_TOLERANCE && !(hdExpected(p, q) > hdExpected(q, q) + ESS_TOLERANCE)) tieOk = false;
    }
  }
  return { own, bestInvader, invaderGain: bestGain, strictlySafe, tieOk, ess: strictlySafe || tieOk === true };
}

export function evolutionaryStableStrategySteps(): DPFrame[] {
  const g = makeGrid(5, ESS_CANDIDATES.length);
  const frames = [
    g.snap(`初期状態: 集団の全員が戦略Sをとっているところへ、少数の侵入者が別の戦略Iで入ってきても増えられなければ、Sは進化的に安定(ESS)。条件: ① S同士の利得 E(S,S) が、侵入者の利得 E(I,S) より大きい。② 同点なら、Sが侵入者から得る E(S,I) が、侵入者同士の E(I,I) より大きい`),
  ];
  ESS_CANDIDATES.forEach((cand, c) => {
    const res = essCheck(cand.p);
    g.put(0, c, r3(res.own), "comparing");
    frames.push(g.snap(`${cand.label}: 全員がこの戦略のときの利得 E(S,S) = ${r3(res.own)}`));
    g.put(1, c, r3(res.invaderGain), "comparing");
    g.put(2, c, `タカ${r2(res.bestInvader)}`, "comparing");
    g.mark(0, c, "settled");
    frames.push(g.snap(`タカの割合を0〜1で試した侵入者のうち最も得をするのは「タカ${r2(res.bestInvader)}」で、利得 E(I,S) = ${r3(res.invaderGain)}`));
    g.put(3, c, res.strictlySafe ? "成立" : res.tieOk !== null ? (res.tieOk ? "同点→②成立" : "同点→②不成立") : "不成立", "pivot");
    g.put(4, c, res.ess ? "ESS" : "ESSではない", res.ess ? "settled" : "idle");
    frames.push(g.snap(res.ess ? `${cand.label}は侵入されても増えられない → ESS` : `${cand.label}は侵入者に利得で負けるため、侵入者が増えてしまう → ESSではない`));
  });
  frames.push(g.snap(`判定: タカだけ・ハトだけはどちらも相手の侵入を許す。確率 V/C = ${r3(HD_V / HD_C)} でタカを出す混合戦略だけが安定。どの侵入者に対しても利得が同点になり(無差別)、②の条件で侵入者同士の利得より大きくなる`));
  return frames;
}

// ---------------------------------------------------------------------------
// ナッシュ均衡(純粋戦略)
// ---------------------------------------------------------------------------

export const NASH_ROW_PAYOFF = [
  [3, 0, 1],
  [0, 2, 1],
  [1, 1, 0],
];
export const NASH_COL_PAYOFF = [
  [2, 0, 1],
  [0, 3, 0],
  [0, 2, 1],
];

export function pureNashEquilibria(rowPay: readonly (readonly number[])[], colPay: readonly (readonly number[])[]): [number, number][] {
  const result: [number, number][] = [];
  rowPay.forEach((row, i) =>
    row.forEach((_, j) => {
      const rowBest = rowPay.every((r) => r[j] <= rowPay[i][j]);
      const colBest = colPay[i].every((v) => v <= colPay[i][j]);
      if (rowBest && colBest) result.push([i, j]);
    }),
  );
  return result;
}

export function nashEquilibriumSteps(): DPFrame[] {
  const size = NASH_ROW_PAYOFF.length;
  const cells = size * size;
  const g = makeGrid(5, cells);
  const at = (i: number, j: number) => i * size + j;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      g.put(0, at(i, j), NASH_ROW_PAYOFF[i][j], "settled");
      g.put(1, at(i, j), NASH_COL_PAYOFF[i][j], "settled");
    }
  const frames = [
    g.snap("初期状態: 行の人(R)と列の人(C)が同時に選ぶ。各マスの利得は (Rの利得, Cの利得)。ナッシュ均衡は、誰も自分だけ戦略を変えても得をしないマス = お互いが相手の選択への最適反応になっている組み合わせ"),
  ];
  const rowBest: boolean[] = new Array(cells).fill(false);
  const colBest: boolean[] = new Array(cells).fill(false);
  for (let j = 0; j < size; j++) {
    const best = Math.max(...NASH_ROW_PAYOFF.map((r) => r[j]));
    for (let i = 0; i < size; i++) {
      g.mark(0, at(i, j), "comparing");
      if (NASH_ROW_PAYOFF[i][j] === best) {
        rowBest[at(i, j)] = true;
        g.put(2, at(i, j), "✓", "pivot");
      } else g.put(2, at(i, j), "−", "idle");
    }
    frames.push(g.snap(`Cが列${j + 1}を選んだとき、Rの最適反応は利得 ${best} の行${NASH_ROW_PAYOFF.map((r, i) => (r[j] === best ? i + 1 : 0)).filter(Boolean).join("・")}(同じ列の中で最大のマスに✓)`));
    for (let i = 0; i < size; i++) g.mark(0, at(i, j), "settled");
  }
  for (let i = 0; i < size; i++) {
    const best = Math.max(...NASH_COL_PAYOFF[i]);
    for (let j = 0; j < size; j++) {
      g.mark(1, at(i, j), "comparing");
      if (NASH_COL_PAYOFF[i][j] === best) {
        colBest[at(i, j)] = true;
        g.put(3, at(i, j), "✓", "pivot");
      } else g.put(3, at(i, j), "−", "idle");
    }
    frames.push(g.snap(`Rが行${i + 1}を選んだとき、Cの最適反応は利得 ${best} の列${NASH_COL_PAYOFF[i].map((v, j) => (v === best ? j + 1 : 0)).filter(Boolean).join("・")}(同じ行の中で最大のマスに✓)`));
    for (let j = 0; j < size; j++) g.mark(1, at(i, j), "settled");
  }
  const equilibria = pureNashEquilibria(NASH_ROW_PAYOFF, NASH_COL_PAYOFF);
  for (let k = 0; k < cells; k++) {
    const isNash = rowBest[k] && colBest[k];
    g.put(4, k, isNash ? "均衡" : "−", isNash ? "settled" : "idle");
  }
  frames.push(g.snap(`両方の最適反応が重なるマスがナッシュ均衡: ${equilibria.map(([i, j]) => `(R${i + 1}, C${j + 1}) 利得(${NASH_ROW_PAYOFF[i][j]}, ${NASH_COL_PAYOFF[i][j]})`).join("、")}。均衡は複数あることも、純粋戦略では存在しないこともある`));
  return frames;
}

// ---------------------------------------------------------------------------
// ミニマックス定理(鞍点)
// ---------------------------------------------------------------------------

export const MINIMAX_MATRIX = [
  [3, 2, 4],
  [1, 0, 6],
  [5, 1, 2],
];

export function saddlePoints(matrix: readonly (readonly number[])[]): { maximin: number; minimax: number; points: [number, number][] } {
  const rowMins = matrix.map((r) => Math.min(...r));
  const colMaxs = matrix[0].map((_, j) => Math.max(...matrix.map((r) => r[j])));
  const maximin = Math.max(...rowMins);
  const minimax = Math.min(...colMaxs);
  const points: [number, number][] = [];
  matrix.forEach((r, i) => r.forEach((v, j) => { if (v === rowMins[i] && v === colMaxs[j]) points.push([i, j]); }));
  return { maximin, minimax, points };
}

export function minimaxTheoremSteps(): DPFrame[] {
  const m = MINIMAX_MATRIX;
  const n = m.length;
  const g = makeGrid(n + 1, n + 1);
  m.forEach((row, i) => row.forEach((v, j) => g.put(i, j, v, "settled")));
  const frames = [
    g.snap("初期状態: ゼロ和ゲーム。表の数字は行の人の得点(列の人の損失)。行の人は得点を大きく、列の人は小さくしたい。行は「各行の最悪(最小)」のうち最良を、列は「各列の最悪(最大)」のうち最良を選ぶ慎重な戦略をとる"),
  ];
  const rowMins = m.map((r) => Math.min(...r));
  m.forEach((_, i) => {
    m[i].forEach((_, j) => g.mark(i, j, "comparing"));
    g.put(i, n, rowMins[i], "pivot");
    frames.push(g.snap(`行${i + 1}の最悪(最小) = ${rowMins[i]}。この行を選ぶと、列の人にどう返されても ${rowMins[i]} は確保できる`));
    m[i].forEach((_, j) => g.mark(i, j, "settled"));
  });
  const colMaxs = m[0].map((_, j) => Math.max(...m.map((r) => r[j])));
  m[0].forEach((_, j) => {
    m.forEach((_, i) => g.mark(i, j, "comparing"));
    g.put(n, j, colMaxs[j], "pivot");
    frames.push(g.snap(`列${j + 1}の最悪(最大) = ${colMaxs[j]}。この列を選ぶと、行の人にどう返されても ${colMaxs[j]} 以上は取られない`));
    m.forEach((_, i) => g.mark(i, j, "settled"));
  });
  const { maximin, minimax, points } = saddlePoints(m);
  frames.push(g.snap(`行の最小のうち最大 maximin = ${maximin}、列の最大のうち最小 minimax = ${minimax}。${maximin === minimax ? "一致した → 値" + maximin + "がこのゲームの値で、互いに慎重な戦略をとると行き着く" : "一致しない(純粋戦略では決まらず、混合戦略が必要)"}`));
  points.forEach(([i, j]) => {
    g.mark(i, j, "pivot");
    g.mark(i, n, "settled");
    g.mark(n, j, "settled");
  });
  if (points.length > 0) {
    frames.push(g.snap(`鞍点: 行${points[0][0] + 1}・列${points[0][1] + 1} のマス(値 ${m[points[0][0]][points[0][1]]})。その行では最小、その列では最大 → どちらも戦略を変えても得をしない(ナッシュ均衡)。一致しない場合は混合戦略でminimax定理が一致を保証する`));
  }
  return frames;
}

// ---------------------------------------------------------------------------
// シュタッケルベルク競争
// ---------------------------------------------------------------------------

export const STACKELBERG_A = 100;
export const STACKELBERG_COST = 10;
export const STACKELBERG_QUANTITIES = [0, 15, 30, 45, 60, 75, 90];

export function stackelbergOutcome(q1: number): { q2: number; price: number; profit1: number; profit2: number } {
  const q2 = Math.max(0, (STACKELBERG_A - STACKELBERG_COST - q1) / 2);
  const price = STACKELBERG_A - q1 - q2;
  return { q2, price, profit1: (price - STACKELBERG_COST) * q1, profit2: (price - STACKELBERG_COST) * q2 };
}

export function stackelbergCompetitionSteps(): DPFrame[] {
  const quantities = STACKELBERG_QUANTITIES;
  const g = makeGrid(4, quantities.length);
  const frames = [
    g.snap(`初期状態: 2社が同じ商品を作る。価格は P=${STACKELBERG_A}−(合計生産量)、費用は1個${STACKELBERG_COST}。先導者が先に生産量 q₁ を決め、追随者はそれを見てから自分の利益が最大になる q₂ を決める。先導者は追随者の反応を読み込んで q₁ を選ぶ(同時に決めるクールノー競争では各社 ${(STACKELBERG_A - STACKELBERG_COST) / 3} 個)`),
  ];
  const outcomes = quantities.map(stackelbergOutcome);
  quantities.forEach((q1, c) => {
    const o = outcomes[c];
    g.put(0, c, r2(o.q2), "comparing");
    frames.push(g.snap(`q₁=${q1}: 追随者は利益を最大にする q₂ = (${STACKELBERG_A}−${STACKELBERG_COST}−${q1})÷2 = ${r2(o.q2)} を選ぶ(反応関数)`));
    g.put(1, c, r2(o.price), "comparing");
    g.put(2, c, r2(o.profit1), "pivot");
    g.put(3, c, r2(o.profit2), "idle");
    g.mark(0, c, "settled");
    frames.push(g.snap(`価格 P=${STACKELBERG_A}−${q1}−${r2(o.q2)} = ${r2(o.price)}。先導者の利益 ${r2(o.profit1)}、追随者の利益 ${r2(o.profit2)}`));
  });
  const best = outcomes.reduce((b, o, c) => (o.profit1 > outcomes[b].profit1 ? c : b), 0);
  g.mark(2, best, "settled");
  const cournot = (STACKELBERG_A - STACKELBERG_COST) / 3;
  const cournotProfit = (STACKELBERG_A - 2 * cournot - STACKELBERG_COST) * cournot;
  frames.push(g.snap(`先導者の利益が最大なのは q₁=${quantities[best]}(利益 ${r2(outcomes[best].profit1)})。同時に決めるクールノー競争の利益 ${r2(cournotProfit)} より、先に決めた先導者は多く(${r2(outcomes[best].profit1)})、追随者は少なく(${r2(outcomes[best].profit2)})なる。先手がコミットメントとして働く`));
  return frames;
}

// ---------------------------------------------------------------------------
// レジストリと表のメタ情報
// ---------------------------------------------------------------------------

export const GAME_THEORY_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "shapley-value": shapleyValueSteps,
  "auction-theory-vickrey": vickreyAuctionSteps,
  "tit-for-tat-iterated-prisoners-dilemma": titForTatIteratedPrisonersDilemmaSteps,
  "hawk-dove-game": hawkDoveGameSteps,
  "evolutionary-stable-strategy": evolutionaryStableStrategySteps,
  "nash-equilibrium": nashEquilibriumSteps,
  "minimax-theorem": minimaxTheoremSteps,
  "stackelberg-competition": stackelbergCompetitionSteps,
};

export const GAME_THEORY_TABLE_META: Record<string, DPTableMeta> = {
  "shapley-value": {
    chips: ["v(A)=10, v(B)=20, v(C)=30", "v(AB)=50, v(AC)=60, v(BC)=70", "v(ABC)=100"],
    cornerLabel: "プレイヤー \\ 加わる順番",
    rowHeaders: [...SHAPLEY_PLAYERS.map((p) => `${p}の限界貢献`), "合計"],
    colHeaders: [...shapleyContributions().map((r) => r.order.join("→")), "平均(シャープレイ値)"],
  },
  "auction-theory-vickrey": {
    chips: [`評価額: ${VICKREY_BIDDERS.map((b, i) => `${b}=${VICKREY_VALUES[i]}`).join(", ")}`, "第二価格封印入札"],
    cornerLabel: "項目 \\ 入札者",
    rowHeaders: ["本当の評価額", "入札額", "順位", "結果", "利得(評価額−支払額)"],
    colHeaders: VICKREY_BIDDERS,
  },
  "tit-for-tat-iterated-prisoners-dilemma": {
    chips: ["相互協力 3-3 / 片方裏切り 5-0 / 相互裏切り 1-1", `相手の手: ${TFT_OPPONENT.join(" ")}`],
    cornerLabel: "項目 \\ 回",
    rowHeaders: ["TFTの手", "相手の手", "TFTの得点", "相手の得点", "TFTの累計", "相手の累計"],
    colHeaders: TFT_OPPONENT.map((_, i) => `第${i + 1}回`),
  },
  "hawk-dove-game": {
    chips: [`V=${HD_V}、C=${HD_C}`, `最初のタカの割合 ${HD_START}`, `学習率 ${HD_ETA}`],
    cornerLabel: "項目 \\ 世代",
    rowHeaders: ["タカの割合 p", "タカの平均利得", "ハトの平均利得", "集団の平均利得"],
    colHeaders: range(HD_GENERATIONS).map((i) => `第${i}世代`),
  },
  "evolutionary-stable-strategy": {
    chips: [`V=${HD_V}、C=${HD_C}`, "タカ同士 (V−C)/2、タカ対ハト V と 0、ハト同士 V/2", "侵入者はタカの割合0〜1を0.01刻みで試す"],
    cornerLabel: "項目 \\ 集団の戦略S",
    rowHeaders: ["E(S,S)", "侵入者の最大利得 E(I,S)", "最も得をする侵入者", "条件(S同士が上回るか)", "判定"],
    colHeaders: ESS_CANDIDATES.map((c) => c.label),
  },
  "nash-equilibrium": {
    chips: ["各マスは (Rの利得, Cの利得)", `行Rの利得: ${NASH_ROW_PAYOFF.map((r) => `[${r.join(",")}]`).join(" ")}`, `列Cの利得: ${NASH_COL_PAYOFF.map((r) => `[${r.join(",")}]`).join(" ")}`],
    cornerLabel: "項目 \\ マス(行,列)",
    rowHeaders: ["Rの利得", "Cの利得", "Rの最適反応?", "Cの最適反応?", "ナッシュ均衡?"],
    colHeaders: NASH_ROW_PAYOFF.flatMap((r, i) => r.map((_, j) => `(R${i + 1},C${j + 1})`)),
  },
  "minimax-theorem": {
    chips: ["ゼロ和ゲーム(行の人の得点)", "右端=行ごとの最小、下端=列ごとの最大"],
    cornerLabel: "行 \\ 列",
    rowHeaders: ["行1", "行2", "行3", "列ごとの最大"],
    colHeaders: ["列1", "列2", "列3", "行ごとの最小"],
  },
  "stackelberg-competition": {
    chips: [`P=${STACKELBERG_A}−Q、費用${STACKELBERG_COST}/個`, "先導者が q₁ を先に決める", "追随者は q₂ = (a−c−q₁)/2"],
    cornerLabel: "項目 \\ 先導者の生産量 q₁",
    rowHeaders: ["追随者の最適反応 q₂", "価格 P", "先導者の利益", "追随者の利益"],
    colHeaders: STACKELBERG_QUANTITIES.map((q) => `q₁=${q}`),
  },
};
