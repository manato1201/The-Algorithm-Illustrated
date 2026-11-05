import type { DPFrame, DPTableMeta } from "./dp-visualizers.ts";
import { makeGrid, range } from "./table-grid.ts";

/**
 * 情報検索・ランキングの可視化(DPテーブル型の属性表を再利用する)。
 * 列 = 文書(または順位・候補)、行 = スコア計算の中間量(語頻度・長さ補正・各語の寄与・合計・順位)。
 * 検索スコアは「語ごとの寄与を足す」計算なので、どの語がどの文書をどれだけ押し上げたかが表で追える。
 * 値は小数第3位に丸めて表示する(検証は丸め前の独立計算と照合する)。
 */

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** 値の大きい順の順位(1始まり)。同点は同順位。 */
export function ranksDescending(values: readonly number[]): number[] {
  return values.map((v) => 1 + values.filter((w) => w > v + 1e-12).length);
}

// ---------------------------------------------------------------------------
// 共通のコーパス
// ---------------------------------------------------------------------------

export const IR_DOCS: string[][] = [
  "cat cat cat sat mat".split(" "),
  "dog sat on the mat".split(" "),
  "cat dog bird fish tree hill road".split(" "),
  "the cat sat on the mat with a hat and a bat".split(" "),
  "mat mat mat mat".split(" "),
];
export const IR_QUERY = ["cat", "mat"];
const docNames = IR_DOCS.map((_, i) => `文書${i + 1}`);

export const tf = (doc: readonly string[], term: string) => doc.filter((w) => w === term).length;
export const docFreq = (docs: readonly (readonly string[])[], term: string) => docs.filter((d) => d.includes(term)).length;
export const avgDocLength = (docs: readonly (readonly string[])[]) => docs.reduce((s, d) => s + d.length, 0) / docs.length;
/** BM25系のidf(負にならない形)。 */
export const bm25Idf = (n: number, df: number) => Math.log((n - df + 0.5) / (df + 0.5) + 1);

// ---------------------------------------------------------------------------
// ベクトル空間モデル(TF-IDF + コサイン類似度)
// ---------------------------------------------------------------------------

export function tfidfWeight(count: number, idf: number): number {
  return count > 0 ? (1 + Math.log(count)) * idf : 0;
}

export function vectorSpaceScores(): { dot: number[]; norm: number[]; cosine: number[]; queryNorm: number } {
  const n = IR_DOCS.length;
  const idf = (t: string) => Math.log(n / docFreq(IR_DOCS, t));
  const queryWeights = Object.fromEntries(IR_QUERY.map((t) => [t, idf(t)]));
  const queryNorm = Math.sqrt(IR_QUERY.reduce((s, t) => s + queryWeights[t] ** 2, 0));
  const dot: number[] = [];
  const norm: number[] = [];
  const cosine: number[] = [];
  for (const doc of IR_DOCS) {
    const vocabulary = [...new Set(doc)];
    const dn = Math.sqrt(vocabulary.reduce((s, t) => s + tfidfWeight(tf(doc, t), idf(t)) ** 2, 0));
    const d = IR_QUERY.reduce((s, t) => s + queryWeights[t] * tfidfWeight(tf(doc, t), idf(t)), 0);
    dot.push(d);
    norm.push(dn);
    cosine.push(dn === 0 ? 0 : d / (dn * queryNorm));
  }
  return { dot, norm, cosine, queryNorm };
}

export function vectorSpaceModelSteps(): DPFrame[] {
  const { dot, norm, cosine, queryNorm } = vectorSpaceScores();
  const g = makeGrid(4, IR_DOCS.length);
  const frames = [
    g.snap(`初期状態: 文書とクエリ「${IR_QUERY.join(" ")}」を、語ごとの重み tf-idf = (1+ln tf)×ln(N/df) のベクトルにし、向きの近さ(コサイン類似度)で並べる。長い文書が有利にならないよう、長さ(ノルム)で割る`),
  ];
  IR_DOCS.forEach((doc, c) => {
    g.put(0, c, r3(dot[c]), "comparing");
    frames.push(g.snap(`${docNames[c]}: クエリのベクトルとの内積 = ${IR_QUERY.map((t) => `${t}(tf=${tf(doc, t)})`).join(" + ")} の重みの積の和 = ${r3(dot[c])}`));
    g.put(1, c, r3(norm[c]), "comparing");
    frames.push(g.snap(`${docNames[c]}: 文書ベクトルの長さ(全ての語の重みの二乗和の平方根) = ${r3(norm[c])}`));
    g.put(2, c, r3(cosine[c]), "pivot");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(g.snap(`${docNames[c]}: コサイン類似度 = 内積 ÷ (文書の長さ ${r3(norm[c])} × クエリの長さ ${r3(queryNorm)}) = ${r3(cosine[c])}`));
  });
  const ranks = ranksDescending(cosine);
  ranks.forEach((rank, c) => g.put(3, c, rank, rank === 1 ? "settled" : "idle"));
  const order = ranks.map((rank, c) => [rank, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const longest = IR_DOCS.reduce((best, d, c) => (d.length > IR_DOCS[best].length ? c : best), 0);
  frames.push(g.snap(`類似度の高い順: ${order.map((c) => docNames[c]).join(" > ")}。1位の${docNames[order[0]]}は両方の語を含み短い。最も長い${docNames[longest]}(${IR_DOCS[longest].length}語)は両方の語を含むのにベクトルの長さ ${r3(norm[longest])} で割られ、類似度 ${r3(cosine[longest])}(${ranks[longest]}位)に下がる`));
  return frames;
}

// ---------------------------------------------------------------------------
// BM25+
// ---------------------------------------------------------------------------

export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const BM25_PLUS_DELTA = 1;

export function bm25PlusScores(): { norm: number[]; terms: number[][]; total: number[]; idf: number[] } {
  const n = IR_DOCS.length;
  const avg = avgDocLength(IR_DOCS);
  const idf = IR_QUERY.map((t) => bm25Idf(n, docFreq(IR_DOCS, t)));
  const norm = IR_DOCS.map((d) => BM25_K1 * (1 - BM25_B + (BM25_B * d.length) / avg));
  const terms = IR_QUERY.map((t, k) =>
    IR_DOCS.map((d, c) => {
      const f = tf(d, t);
      return f > 0 ? idf[k] * ((f * (BM25_K1 + 1)) / (f + norm[c]) + BM25_PLUS_DELTA) : 0;
    }),
  );
  const total = IR_DOCS.map((_, c) => terms.reduce((s, row) => s + row[c], 0));
  return { norm, terms, total, idf };
}

export function bm25PlusSteps(): DPFrame[] {
  const { norm, terms, total, idf } = bm25PlusScores();
  // 行: tf×語数、長さ補正K、各語の寄与×語数、合計、順位
  const g = makeGrid(2 * IR_QUERY.length + 3, IR_DOCS.length);
  IR_DOCS.forEach((d, c) => IR_QUERY.forEach((t, k) => g.put(k, c, tf(d, t), "settled")));
  const frames = [
    g.snap(`初期状態: BM25は、語の出現回数の効果に頭打ち(飽和)を設け、長い文書を割り引く検索スコア。BM25+は、クエリの語を含む文書に定数 δ=${BM25_PLUS_DELTA} を足し、長い文書が「含んでいるのに」不当に低く扱われるのを防ぐ。idf: ${IR_QUERY.map((t, k) => `${t}=${r3(idf[k])}`).join("、")}`),
  ];
  IR_DOCS.forEach((d, c) => {
    const row = IR_QUERY.length;
    g.put(row, c, r3(norm[c]), "comparing");
    frames.push(g.snap(`${docNames[c]}(長さ${d.length}、平均${r3(avgDocLength(IR_DOCS))}): 長さ補正 K = k1×(1−b+b×長さ/平均) = ${BM25_K1}×(1−${BM25_B}+${BM25_B}×${d.length}/${r3(avgDocLength(IR_DOCS))}) = ${r3(norm[c])}`));
    IR_QUERY.forEach((t, k) => {
      const f = tf(d, t);
      g.put(row + 1 + k, c, r3(terms[k][c]), f > 0 ? "pivot" : "idle");
    });
    g.mark(row, c, "settled");
    frames.push(g.snap(`${docNames[c]}: ${IR_QUERY.map((t, k) => (tf(d, t) > 0 ? `${t}の寄与 = idf×(tf×(k1+1)/(tf+K)+δ) = ${r3(terms[k][c])}` : `${t}は含まないので寄与0(δも足さない)`)).join("、")}`));
    g.put(row + 1 + IR_QUERY.length, c, r3(total[c]), "pivot");
    frames.push(g.snap(`${docNames[c]}: 合計スコア = ${r3(total[c])}`));
  });
  const ranks = ranksDescending(total);
  ranks.forEach((rank, c) => g.put(2 * IR_QUERY.length + 2, c, rank, rank === 1 ? "settled" : "idle"));
  const matIndex = IR_QUERY.indexOf("mat");
  frames.push(g.snap(`スコアの高い順: ${ranks.map((rank, c) => [rank, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => docNames[c]).join(" > ")}。mat を4回含む文書5の寄与は ${r3(terms[matIndex][4])}、1回だけの文書2は ${r3(terms[matIndex][1])}(出現回数は4倍でも寄与は${r3(terms[matIndex][4] / terms[matIndex][1])}倍にしかならない=頭打ち)`));
  return frames;
}

// ---------------------------------------------------------------------------
// BM25F(フィールド重み付き)
// ---------------------------------------------------------------------------

export type FieldDoc = { title: string[]; body: string[] };
export const BM25F_DOCS: FieldDoc[] = [
  { title: ["cat"], body: ["sat", "on", "mat", "mat"] },
  { title: ["dog", "mat"], body: ["dog", "sat", "sat", "sat"] },
  { title: ["bird"], body: ["cat", "dog", "bird", "fish", "tree", "hill", "road"] },
  { title: ["cat", "mat"], body: ["sat", "sat", "sat", "sat"] },
];
export const BM25F_WEIGHTS = { title: 3, body: 1 };
export const BM25F_B = { title: 0.5, body: 0.75 };

export function bm25fScores(): { pseudoTf: number[][]; terms: number[][]; total: number[]; idf: number[] } {
  const n = BM25F_DOCS.length;
  const avgTitle = BM25F_DOCS.reduce((s, d) => s + d.title.length, 0) / n;
  const avgBody = BM25F_DOCS.reduce((s, d) => s + d.body.length, 0) / n;
  const df = (t: string) => BM25F_DOCS.filter((d) => d.title.includes(t) || d.body.includes(t)).length;
  const idf = IR_QUERY.map((t) => bm25Idf(n, df(t)));
  const pseudoTf = IR_QUERY.map((t) =>
    BM25F_DOCS.map(
      (d) =>
        (BM25F_WEIGHTS.title * tf(d.title, t)) / (1 - BM25F_B.title + (BM25F_B.title * d.title.length) / avgTitle) +
        (BM25F_WEIGHTS.body * tf(d.body, t)) / (1 - BM25F_B.body + (BM25F_B.body * d.body.length) / avgBody),
    ),
  );
  const terms = IR_QUERY.map((_, k) => BM25F_DOCS.map((_, c) => (idf[k] * pseudoTf[k][c]) / (BM25_K1 + pseudoTf[k][c])));
  const total = BM25F_DOCS.map((_, c) => terms.reduce((s, row) => s + row[c], 0));
  return { pseudoTf, terms, total, idf };
}

export function bm25fSteps(): DPFrame[] {
  const { pseudoTf, terms, total, idf } = bm25fScores();
  const q = IR_QUERY.length;
  const g = makeGrid(q + q + 2, BM25F_DOCS.length);
  const frames = [
    g.snap(`初期状態: 文書にタイトルと本文の2つのフィールドがある。BM25Fは、フィールドごとに長さ補正した語頻度を重み(タイトル×${BM25F_WEIGHTS.title}、本文×${BM25F_WEIGHTS.body})付きで合算して「擬似tf」を作り、それからBM25の飽和を1回だけかける(フィールドごとに別々に飽和させるより、語の重複に強い)。idf: ${IR_QUERY.map((t, k) => `${t}=${r3(idf[k])}`).join("、")}`),
  ];
  BM25F_DOCS.forEach((d, c) => {
    IR_QUERY.forEach((t, k) => g.put(k, c, r3(pseudoTf[k][c]), "comparing"));
    frames.push(g.snap(`文書${c + 1}(タイトル「${d.title.join(" ")}」/本文「${d.body.join(" ")}」): 擬似tf = ${IR_QUERY.map((t, k) => `${t}: ${r3(pseudoTf[k][c])}(タイトルに${tf(d.title, t)}回・本文に${tf(d.body, t)}回)`).join("、")}`));
    IR_QUERY.forEach((t, k) => {
      g.mark(k, c, "settled");
      g.put(q + k, c, r3(terms[k][c]), pseudoTf[k][c] > 0 ? "pivot" : "idle");
    });
    g.put(2 * q, c, r3(total[c]), "pivot");
    frames.push(g.snap(`文書${c + 1}: ${IR_QUERY.map((t, k) => `${t}の寄与 = idf×擬似tf/(k1+擬似tf) = ${r3(terms[k][c])}`).join("、")}。合計 ${r3(total[c])}`));
  });
  const ranks = ranksDescending(total);
  ranks.forEach((rank, c) => g.put(2 * q + 1, c, rank, rank === 1 ? "settled" : "idle"));
  frames.push(g.snap(`スコアの高い順: ${ranks.map((rank, c) => [rank, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => `文書${c + 1}`).join(" > ")}。タイトルに語を持つ文書(1・2・4)は、cat が本文にしかない文書3より上に来る(タイトルの重み×${BM25F_WEIGHTS.title})`));
  return frames;
}

// ---------------------------------------------------------------------------
// クエリ尤度言語モデル(Jelinek-Mercer平滑化)
// ---------------------------------------------------------------------------

export const LM_LAMBDA = 0.5;
export const collectionLength = () => IR_DOCS.reduce((s, d) => s + d.length, 0);
export const collectionProb = (term: string) => IR_DOCS.reduce((s, d) => s + tf(d, term), 0) / collectionLength();

export function queryLikelihoodScores(): { mle: number[][]; mleProduct: number[]; smoothed: number[][]; logLikelihood: number[] } {
  const mle = IR_QUERY.map((t) => IR_DOCS.map((d) => tf(d, t) / d.length));
  const mleProduct = IR_DOCS.map((_, c) => mle.reduce((p, row) => p * row[c], 1));
  const smoothed = IR_QUERY.map((t, k) => IR_DOCS.map((_, c) => LM_LAMBDA * mle[k][c] + (1 - LM_LAMBDA) * collectionProb(t)));
  const logLikelihood = IR_DOCS.map((_, c) => smoothed.reduce((s, row) => s + Math.log(row[c]), 0));
  return { mle, mleProduct, smoothed, logLikelihood };
}

export function languageModelIrSteps(): DPFrame[] {
  const { mle, mleProduct, smoothed, logLikelihood } = queryLikelihoodScores();
  const q = IR_QUERY.length;
  const g = makeGrid(q + 1 + q + 2, IR_DOCS.length);
  const frames = [
    g.snap(`初期状態: 「各文書から、クエリ「${IR_QUERY.join(" ")}」が生成される確率」が高い順に並べる。語の確率を文書内の頻度(最尤推定)で求めると、含まない語が1つあるだけで積が0になってしまう。そこで全文書の語の確率を λ=${LM_LAMBDA} の割合で混ぜる(平滑化)`),
  ];
  IR_DOCS.forEach((d, c) => {
    IR_QUERY.forEach((t, k) => g.put(k, c, r3(mle[k][c]), "comparing"));
    g.put(q, c, r3(mleProduct[c]), mleProduct[c] === 0 ? "idle" : "comparing");
    frames.push(g.snap(`${docNames[c]}: 文書内の頻度 ${IR_QUERY.map((t, k) => `p(${t})=${tf(d, t)}/${d.length}=${r3(mle[k][c])}`).join("、")}。積は ${r3(mleProduct[c])}${mleProduct[c] === 0 ? "(含まない語があり、0になって順位がつかない)" : ""}`));
    IR_QUERY.forEach((t, k) => g.put(q + 1 + k, c, r3(smoothed[k][c]), "pivot"));
    g.put(2 * q + 1, c, r3(logLikelihood[c]), "pivot");
    IR_QUERY.forEach((_, k) => g.mark(k, c, "settled"));
    frames.push(g.snap(`${docNames[c]}: 平滑化 p(t|d) = ${LM_LAMBDA}×文書内の頻度 + ${1 - LM_LAMBDA}×全体の頻度 = ${IR_QUERY.map((t, k) => `${t}:${r3(smoothed[k][c])}`).join("、")}。対数尤度の和 = ${r3(logLikelihood[c])}`));
  });
  const ranks = ranksDescending(logLikelihood);
  ranks.forEach((rank, c) => g.put(2 * q + 2, c, rank, rank === 1 ? "settled" : "idle"));
  frames.push(g.snap(`対数尤度の高い順: ${ranks.map((rank, c) => [rank, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => docNames[c]).join(" > ")}。平滑化のおかげで、片方の語しか含まない文書も0点にならず、比べられる`));
  return frames;
}

// ---------------------------------------------------------------------------
// ディリクレ平滑化言語モデル
// ---------------------------------------------------------------------------

export const DIRICHLET_MU = 5;

export function dirichletScores(): { prob: number[][]; logLikelihood: number[] } {
  const prob = IR_QUERY.map((t) => IR_DOCS.map((d) => (tf(d, t) + DIRICHLET_MU * collectionProb(t)) / (d.length + DIRICHLET_MU)));
  const logLikelihood = IR_DOCS.map((_, c) => prob.reduce((s, row) => s + Math.log(row[c]), 0));
  return { prob, logLikelihood };
}

export function dirichletSmoothingLmSteps(): DPFrame[] {
  const { prob, logLikelihood } = dirichletScores();
  const q = IR_QUERY.length;
  const g = makeGrid(q + q + 2, IR_DOCS.length);
  const frames = [
    g.snap(`初期状態: ディリクレ平滑化は、文書に μ=${DIRICHLET_MU} 語ぶんの「全体の語の分布」を仮想的に足して推定する。p(t|d) = (tf + μ×p(t|全体)) ÷ (文書の長さ + μ)。短い文書ほど全体の分布の影響が強く、長い文書ほど自分の頻度を信じる(Jelinek-Mercerは混ぜる割合が一定)。全体の確率: ${IR_QUERY.map((t) => `p(${t})=${r3(collectionProb(t))}`).join("、")}`),
  ];
  IR_DOCS.forEach((d, c) => {
    IR_QUERY.forEach((t, k) => g.put(k, c, tf(d, t), "settled"));
    IR_QUERY.forEach((t, k) => g.put(q + k, c, r3(prob[k][c]), "pivot"));
    g.put(2 * q, c, r3(logLikelihood[c]), "pivot");
    frames.push(g.snap(`${docNames[c]}(長さ${d.length}): ${IR_QUERY.map((t, k) => `p(${t}|d) = (${tf(d, t)} + ${DIRICHLET_MU}×${r3(collectionProb(t))}) ÷ (${d.length}+${DIRICHLET_MU}) = ${r3(prob[k][c])}`).join("、")}。対数尤度 = ${r3(logLikelihood[c])}`));
  });
  const ranks = ranksDescending(logLikelihood);
  ranks.forEach((rank, c) => g.put(2 * q + 1, c, rank, rank === 1 ? "settled" : "idle"));
  frames.push(g.snap(`対数尤度の高い順: ${ranks.map((rank, c) => [rank, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => docNames[c]).join(" > ")}`));
  return frames;
}

// ---------------------------------------------------------------------------
// NDCG(正規化割引累積利得)
// ---------------------------------------------------------------------------

export const NDCG_RELEVANCE = [3, 2, 3, 0, 1, 2];

export const dcgTerm = (rel: number, rank: number) => (2 ** rel - 1) / Math.log2(rank + 1);

export function ndcgValues(rels: readonly number[]): { dcg: number[]; ideal: number[]; idcg: number[]; ndcg: number[] } {
  const ideal = [...rels].sort((a, b) => b - a);
  const cumulative = (list: readonly number[]) => {
    let sum = 0;
    return list.map((rel, i) => (sum += dcgTerm(rel, i + 1)));
  };
  const dcg = cumulative(rels);
  const idcg = cumulative(ideal);
  return { dcg, ideal, idcg, ndcg: dcg.map((v, i) => v / idcg[i]) };
}

export function ndcgEvaluationSteps(): DPFrame[] {
  const rels = NDCG_RELEVANCE;
  const { dcg, ideal, idcg, ndcg } = ndcgValues(rels);
  const g = makeGrid(7, rels.length);
  const frames = [
    g.snap(`初期状態: 検索結果の並びが ${rels.join(", ")}(数字は人が付けた関連度、大きいほど良い)。上位に関連度の高いものがあるほど高評価。順位が下がるほど価値を割り引き(1/log₂(順位+1))、理想の並びのスコアで割って 0〜1 にそろえる`),
  ];
  rels.forEach((rel, c) => {
    g.put(0, c, rel, "comparing");
    frames.push(g.snap(`${c + 1}位の関連度 ${rel}`));
    g.put(1, c, 2 ** rel - 1, "comparing");
    g.put(2, c, r3(1 / Math.log2(c + 2)), "comparing");
    frames.push(g.snap(`利得 2^${rel}−1 = ${2 ** rel - 1}(関連度が高いほど急に価値が上がる)、割引 1/log₂(${c + 2}) = ${r3(1 / Math.log2(c + 2))}`));
    g.put(3, c, r3(dcg[c]), "pivot");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    g.mark(2, c, "settled");
    frames.push(g.snap(`${c + 1}位までのDCG = ${c === 0 ? "" : `${r3(dcg[c - 1])} + `}${r3(dcgTerm(rel, c + 1))} = ${r3(dcg[c])}`));
  });
  rels.forEach((_, c) => {
    g.put(4, c, ideal[c], "comparing");
    g.put(5, c, r3(idcg[c]), "comparing");
  });
  frames.push(g.snap(`理想の並び(関連度の降順 ${ideal.join(", ")})のDCG(IDCG)を同じ式で求める`));
  rels.forEach((_, c) => g.put(6, c, r3(ndcg[c]), c === rels.length - 1 ? "settled" : "pivot"));
  frames.push(g.snap(`nDCG@k = DCG ÷ IDCG。全体(k=${rels.length})では ${r3(dcg[rels.length - 1])} ÷ ${r3(idcg[rels.length - 1])} = ${r3(ndcg[rels.length - 1])}。1に近いほど理想の並びに近い(関連度3のものが3位、関連度2のものが6位にあり、少し損している)`));
  return frames;
}

// ---------------------------------------------------------------------------
// MMR(Maximal Marginal Relevance)による多様性再ランキング
// ---------------------------------------------------------------------------

export const MMR_RELEVANCE = [0.9, 0.85, 0.8, 0.6, 0.5, 0.4];
export const MMR_LAMBDA = 0.6;
const MMR_PAIRS: Record<string, number> = {
  "0-1": 0.9, "0-2": 0.2, "0-3": 0.3, "0-4": 0.1, "0-5": 0.2,
  "1-2": 0.25, "1-3": 0.35, "1-4": 0.1, "1-5": 0.15,
  "2-3": 0.8, "2-4": 0.3, "2-5": 0.2,
  "3-4": 0.2, "3-5": 0.3,
  "4-5": 0.7,
};
export const mmrSimilarity = (a: number, b: number) => (a === b ? 1 : MMR_PAIRS[`${Math.min(a, b)}-${Math.max(a, b)}`]);

export function mmrSelect(): { order: number[]; scores: (number | null)[][] } {
  const n = MMR_RELEVANCE.length;
  const chosen: number[] = [];
  const scores: (number | null)[][] = [];
  while (chosen.length < Math.min(4, n)) {
    const row: (number | null)[] = [];
    let best = -1;
    let bestScore = -Infinity;
    for (let c = 0; c < n; c++) {
      if (chosen.includes(c)) {
        row.push(null);
        continue;
      }
      const redundancy = chosen.length === 0 ? 0 : Math.max(...chosen.map((s) => mmrSimilarity(c, s)));
      const score = MMR_LAMBDA * MMR_RELEVANCE[c] - (1 - MMR_LAMBDA) * redundancy;
      row.push(score);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    scores.push(row);
    chosen.push(best);
  }
  return { order: chosen, scores };
}

export function mmrDiversityRerankingSteps(): DPFrame[] {
  const { order, scores } = mmrSelect();
  const n = MMR_RELEVANCE.length;
  const g = makeGrid(scores.length + 1, n);
  MMR_RELEVANCE.forEach((rel, c) => g.put(0, c, rel, "settled"));
  const frames = [
    g.snap(`初期状態: 関連度の高い順に並べると、似た結果(文書1と2は類似度0.9、文書3と4は0.8)が並んでしまう。MMRは、次に選ぶ候補を「λ×関連度 − (1−λ)×すでに選んだものとの最大類似度」で決める。λ=${MMR_LAMBDA}`),
  ];
  order.forEach((pick, round) => {
    const chosenBefore = order.slice(0, round);
    for (let c = 0; c < n; c++) {
      const v = scores[round][c];
      if (v === null) g.put(round + 1, c, "選択済", "settled");
      else g.put(round + 1, c, r3(v), "comparing");
    }
    frames.push(
      g.snap(
        round === 0
          ? `第1回: まだ何も選んでいないので、重複はなし。スコア = λ×関連度。最大は文書${pick + 1}`
          : `第${round + 1}回: 選択済み ${chosenBefore.map((s) => `文書${s + 1}`).join("、")} との最大類似度を引いてスコアを計算する(例: 文書${chosenBefore[0] === 0 ? 2 : 1}は文書1に似ているので大きく減点)`,
      ),
    );
    for (let c = 0; c < n; c++) if (scores[round][c] !== null) g.mark(round + 1, c, "idle");
    g.mark(round + 1, pick, "pivot");
    frames.push(g.snap(`文書${pick + 1}を選ぶ(スコア ${r3(scores[round][pick] as number)})`));
  });
  frames.push(g.snap(`選んだ順: ${order.map((c) => `文書${c + 1}`).join(" → ")}。関連度の降順(1,2,3,4)なら文書2が2番目だが、文書1とほぼ同じ内容なので後回しになり、多様な結果が上位に並ぶ`));
  return frames;
}

// ---------------------------------------------------------------------------
// レジストリと表のメタ情報
// ---------------------------------------------------------------------------

export const IR_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "vector-space-model": vectorSpaceModelSteps,
  "bm25-plus": bm25PlusSteps,
  bm25f: bm25fSteps,
  "language-model-ir": languageModelIrSteps,
  "dirichlet-smoothing-lm": dirichletSmoothingLmSteps,
  "ndcg-evaluation": ndcgEvaluationSteps,
  "mmr-diversity-reranking": mmrDiversityRerankingSteps,
};

const corpusChips = [
  ...IR_DOCS.map((d, i) => `文書${i + 1}: ${d.join(" ")}`),
  `クエリ: ${IR_QUERY.join(" ")}`,
];

export const IR_TABLE_META: Record<string, DPTableMeta> = {
  "vector-space-model": {
    chips: corpusChips,
    cornerLabel: "項目 \\ 文書",
    rowHeaders: ["クエリとの内積(tf-idf)", "文書ベクトルの長さ", "コサイン類似度", "順位"],
    colHeaders: docNames,
  },
  "bm25-plus": {
    chips: [...corpusChips, `k1=${BM25_K1}、b=${BM25_B}、δ=${BM25_PLUS_DELTA}`],
    cornerLabel: "項目 \\ 文書",
    rowHeaders: [...IR_QUERY.map((t) => `tf(${t})`), "長さ補正 K", ...IR_QUERY.map((t) => `${t}の寄与`), "合計スコア", "順位"],
    colHeaders: docNames,
  },
  bm25f: {
    chips: [
      ...BM25F_DOCS.map((d, i) => `文書${i + 1} [題] ${d.title.join(" ")} [本] ${d.body.join(" ")}`),
      `重み: タイトル×${BM25F_WEIGHTS.title}・本文×${BM25F_WEIGHTS.body}、b: ${BM25F_B.title}/${BM25F_B.body}、k1=${BM25_K1}`,
    ],
    cornerLabel: "項目 \\ 文書",
    rowHeaders: [...IR_QUERY.map((t) => `擬似tf(${t})`), ...IR_QUERY.map((t) => `${t}の寄与`), "合計スコア", "順位"],
    colHeaders: BM25F_DOCS.map((_, i) => `文書${i + 1}`),
  },
  "language-model-ir": {
    chips: [...corpusChips, `λ=${LM_LAMBDA}(文書:全体 = ${LM_LAMBDA}:${1 - LM_LAMBDA})`],
    cornerLabel: "項目 \\ 文書",
    rowHeaders: [
      ...IR_QUERY.map((t) => `文書内の頻度 p(${t})`),
      "頻度の積(平滑化なし)",
      ...IR_QUERY.map((t) => `平滑化後 p(${t}|d)`),
      "対数尤度",
      "順位",
    ],
    colHeaders: docNames,
  },
  "dirichlet-smoothing-lm": {
    chips: [...corpusChips, `μ=${DIRICHLET_MU}`],
    cornerLabel: "項目 \\ 文書",
    rowHeaders: [...IR_QUERY.map((t) => `tf(${t})`), ...IR_QUERY.map((t) => `p(${t}|d)`), "対数尤度", "順位"],
    colHeaders: docNames,
  },
  "ndcg-evaluation": {
    chips: [`検索結果の関連度(上位から): ${NDCG_RELEVANCE.join(", ")}`],
    cornerLabel: "項目 \\ 順位",
    rowHeaders: ["関連度", "利得 2^関連度−1", "割引 1/log₂(順位+1)", "DCG(累積)", "理想の並びの関連度", "IDCG(累積)", "nDCG@k"],
    colHeaders: NDCG_RELEVANCE.map((_, i) => `${i + 1}位`),
  },
  "mmr-diversity-reranking": {
    chips: [`関連度: ${MMR_RELEVANCE.join(", ")}`, `λ=${MMR_LAMBDA}`, "類似な組: 文書1-2(0.9)、文書3-4(0.8)、文書5-6(0.7)"],
    cornerLabel: "回 \\ 候補",
    rowHeaders: ["関連度", ...range(mmrSelect().scores.length).map((r) => `第${r + 1}回のMMRスコア`)],
    colHeaders: MMR_RELEVANCE.map((_, i) => `文書${i + 1}`),
  },
};
