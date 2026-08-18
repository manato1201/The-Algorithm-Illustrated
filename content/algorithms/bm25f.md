---
name: BM25F(フィールド重み付きBM25)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(検索語数 × フィールド数)
summary: 文書をタイトル・本文などの複数フィールドに分割し、フィールドごとに正規化した出現頻度を重み付き合算してから1回だけ飽和処理をかけることで、構造化文書に対応させた[BM25](/algorithms/bm25)の拡張版。
---

## 概要

[BM25](/algorithms/bm25)は文書全体を単一のバッグオブワーズとみなしてスコアを計算するが、実際のWebページや構造化文書は「タイトル」「見出し」「本文」「アンカーテキスト」のように複数のフィールドから成り、フィールドによって単語の重要度は大きく異なる——タイトルに出現する単語は、本文中の同じ単語より強い関連シグナルであることが多い。BM25F(BM25 with Fields)は、この構造化文書に対応するため[BM25](/algorithms/bm25)を拡張した手法で、Microsoft ResearchのStephen Robertsonらによって2004年前後に定式化された。単純に「フィールドごとに[BM25](/algorithms/bm25)を計算してから重み付き合計する」のではなく、**フィールドごとに正規化した出現頻度を先に重み付き合算し、その統合済みの値に対して出現頻度の飽和処理を1回だけかける**という点が設計の核心であり、この順序を守ることでフィールドをまたいだ出現頻度の二重評価を防いでいる。

## 仕組み

1. 文書を複数のフィールド(タイトル、見出し、本文、アンカーテキストなど)に分割し、フィールドごとにあらかじめ重要度を表す重み`w_field`(タイトルは高め、本文は基準の1.0など)を人手または学習で決めておく
2. 各フィールドについて、そのフィールド内での単語の出現回数`tf_field`と、そのフィールドの平均的な長さに対する相対的な長さ`len_field / avglen_field`を求め、[BM25](/algorithms/bm25)と同様のフィールド長正規化パラメータ`b_field`を使って正規化する:
   `norm_tf_field = tf_field / (1 - b_field + b_field・len_field/avglen_field)`
3. 単語ごとに、正規化されたフィールド出現頻度をフィールド重みで加重し、全フィールドにわたって合算する。これが「疑似的な統合出現頻度」`tildeTF`になる:
   `tildeTF(t, d) = Σ_field w_field・norm_tf_field(t, d)`
4. この統合出現頻度に対して、[BM25](/algorithms/bm25)と同じ形の飽和関数を**1回だけ**適用する:
   `weight(t, d) = tildeTF(t, d)・(k1 + 1) / (tildeTF(t, d) + k1)`
5. 最終スコアは、クエリに含まれる各単語について、コーパス全体での希少性を表すIDF(フィールドをまたいだ文書頻度から計算するのが一般的)と上記の重みを掛けて合計する:
   `score(q, d) = Σ_{t∈q} idf(t)・weight(t, d)`

## 特性・トレードオフ

- **計算量**: クエリの検索語数とフィールド数の積に比例するO(検索語数×フィールド数)——[BM25](/algorithms/bm25)よりわずかに増えるが、フィールドごとに転置インデックスを保持すれば実務上は十分高速に計算できる
- **「フィールドごとにBM25を計算して合計する」素朴な代替案との違い**: 各フィールドで独立に飽和処理をかけてから合計する方式は、同じ単語が複数フィールドに分散して出現するケースでスコアが不自然に膨らみやすい。BM25Fは出現頻度を統合した後に飽和処理を1回だけ適用するため、この二重評価を避け、より理論的に一貫したモデルになっている
- **ハイパーパラメータの増加**: フィールド重み`w_field`とフィールド長正規化`b_field`という新たな調整項が加わり、チューニングの負荷は[BM25](/algorithms/bm25)単体より高くなる。検索ログのクリックデータを教師信号として、[ペアワイズ・ランク学習](/algorithms/pairwise-learning-to-rank)のような手法でこれらの重みを自動学習することも多い
- **使いどころ**: タイトル・本文・アンカーテキストを区別して検索するWeb検索エンジン(Elasticsearch/SolrのBM25Fクエリ機能)、製品名・説明文・レビューを別フィールドとして持つECサイトの商品検索、メタデータが豊富な社内文書・メール検索システム

## 実装例

```python
import math


def bm25f_score(
    query: list[str],
    doc_fields: dict[str, list[str]],
    corpus_fields: list[dict[str, list[str]]],
    field_weights: dict[str, float],
    field_b: dict[str, float],
    k1: float = 1.5,
) -> float:
    n = len(corpus_fields)
    field_names = list(field_weights.keys())

    avg_len = {
        f: sum(len(doc.get(f, [])) for doc in corpus_fields) / n
        for f in field_names
    }

    def doc_freq(term: str) -> int:
        return sum(
            1
            for doc in corpus_fields
            if any(term in doc.get(f, []) for f in field_names)
        )

    score = 0.0
    for term in query:
        df = doc_freq(term)
        if df == 0:
            continue
        idf = math.log((n - df + 0.5) / (df + 0.5) + 1)

        tilde_tf = 0.0
        for f in field_names:
            tokens = doc_fields.get(f, [])
            if not tokens or avg_len[f] == 0:
                continue
            tf = tokens.count(term)
            if tf == 0:
                continue
            b = field_b[f]
            norm_tf = tf / (1 - b + b * len(tokens) / avg_len[f])
            tilde_tf += field_weights[f] * norm_tf

        if tilde_tf == 0:
            continue
        weight = tilde_tf * (k1 + 1) / (tilde_tf + k1)
        score += idf * weight
    return score


# タイトルを本文より重視する重み付けの例
doc = {
    "title": ["python", "tutorial"],
    "body": ["learn", "python", "programming", "step", "by", "step"],
}
corpus = [
    doc,
    {"title": ["java", "guide"], "body": ["java", "programming", "basics"]},
]
weights = {"title": 3.0, "body": 1.0}
b_params = {"title": 0.0, "body": 0.75}
print(bm25f_score(["python"], doc, corpus, weights, b_params))
```

```typescript
type FieldDoc = Record<string, string[]>;

function bm25fScore(
  query: string[],
  docFields: FieldDoc,
  corpusFields: FieldDoc[],
  fieldWeights: Record<string, number>,
  fieldB: Record<string, number>,
  k1 = 1.5,
): number {
  const n = corpusFields.length;
  const fieldNames = Object.keys(fieldWeights);

  const avgLen: Record<string, number> = {};
  for (const f of fieldNames) {
    avgLen[f] =
      corpusFields.reduce((sum, doc) => sum + (doc[f]?.length ?? 0), 0) / n;
  }

  const docFreq = (term: string): number =>
    corpusFields.filter((doc) =>
      fieldNames.some((f) => (doc[f] ?? []).includes(term)),
    ).length;

  let score = 0;
  for (const term of query) {
    const df = docFreq(term);
    if (df === 0) continue;
    const idf = Math.log((n - df + 0.5) / (df + 0.5) + 1);

    let tildeTf = 0;
    for (const f of fieldNames) {
      const tokens = docFields[f] ?? [];
      if (tokens.length === 0 || avgLen[f] === 0) continue;
      const tf = tokens.filter((w) => w === term).length;
      if (tf === 0) continue;
      const b = fieldB[f];
      const normTf = tf / (1 - b + (b * tokens.length) / avgLen[f]);
      tildeTf += fieldWeights[f] * normTf;
    }

    if (tildeTf === 0) continue;
    const weight = (tildeTf * (k1 + 1)) / (tildeTf + k1);
    score += idf * weight;
  }
  return score;
}

// タイトルを本文より重視する重み付けの例
const doc: FieldDoc = {
  title: ["python", "tutorial"],
  body: ["learn", "python", "programming", "step", "by", "step"],
};
const corpus: FieldDoc[] = [
  doc,
  { title: ["java", "guide"], body: ["java", "programming", "basics"] },
];
const weights = { title: 3.0, body: 1.0 };
const bParams = { title: 0.0, body: 0.75 };
console.log(bm25fScore(["python"], doc, corpus, weights, bParams));
```
