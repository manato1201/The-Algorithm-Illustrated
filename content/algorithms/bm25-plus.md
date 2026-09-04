---
name: BM25+
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(検索語数)
summary: BM25が長い文書の稀な一致を過小評価しがちな欠点を、下限補正項の追加で緩和したスコアリング関数。
---

## 概要

BM25は出現頻度の飽和と文書長の正規化によって実務的な検索精度を大きく向上させたが、2011年にLv & Zhaiが指摘したように、**非常に長い文書で検索語が1回だけ出現するケース**では、文書長の正規化が効きすぎてスコアがほぼゼロに近づいてしまう問題があった。BM25+は、この「長い文書に対する不当なペナルティ」を補正するために、各検索語のスコアに小さな下限値δを加算するシンプルな改良版である。

## 仕組み

BM25+のスコアは、通常のBM25の項に定数δ(典型的には1.0前後)を加えた形で定義される。

1. 各検索語について、通常のBM25と同様にTF(出現頻度飽和)・IDF(逆文書頻度)・文書長正規化を計算する
2. その値に、文書長にかかわらず一定の下限を保証する加算項 δ・IDF(t) を追加する
3. これにより、たとえ文書が非常に長くて正規化項が0に近づいても、検索語が1回でも出現していれば一定以上のスコアが必ず加算される
4. δ=0とすると通常のBM25に一致するため、BM25の厳密な一般化になっている

この補正は「長文書中の1回の一致」と「一致なし」を明確に区別できるようにする効果があり、長文書が多いコーパス(学術論文・書籍など)で特に有効性が確認されている。

## 特性・トレードオフ

- **計算量**: BM25と同じくO(検索語数)(転置インデックス前提)。追加のδ項は定数時間で計算できるためオーバーヘッドはほぼない
- **BM25との違い**: パラメータが1つ(δ)増えるだけで、長文書における関連文書の見逃し(false negative)を抑制できる。短い文書が中心のコーパスでは通常のBM25とほぼ同じ挙動になる
- **パラメータ調整**: δの値が大きすぎると、無関係な長文書のスコアまで底上げしてしまうため、検証データでのチューニングが望ましい(δ=1.0が経験的によく使われる初期値)
- **使いどころ**: 学術論文データベース、法律文書検索、長文コンテンツを多く含む企業内検索など、文書長のばらつきが大きいコーパスでの全文検索

## 実装例

```python
import math


def bm25_plus_score(
    query: list[str],
    doc: list[str],
    corpus: list[list[str]],
    k1: float = 1.5,
    b: float = 0.75,
    delta: float = 1.0,
) -> float:
    n = len(corpus)
    avgdl = sum(len(d) for d in corpus) / n
    doc_len = len(doc)

    score = 0.0
    for term in query:
        df = sum(1 for d in corpus if term in d)
        if df == 0:
            continue
        idf = math.log((n + 1) / df)
        f = doc.count(term)
        if f == 0:
            continue
        normalized_tf = (f * (k1 + 1)) / (f + k1 * (1 - b + b * doc_len / avgdl))
        score += idf * (normalized_tf + delta)
    return score
```

```typescript
function bm25PlusScore(
  query: string[],
  doc: string[],
  corpus: string[][],
  k1 = 1.5,
  b = 0.75,
  delta = 1.0,
): number {
  const n = corpus.length;
  const avgdl = corpus.reduce((sum, d) => sum + d.length, 0) / n;
  const docLen = doc.length;

  let score = 0;
  for (const term of query) {
    const df = corpus.filter((d) => d.includes(term)).length;
    if (df === 0) continue;
    const idf = Math.log((n + 1) / df);
    const f = doc.filter((w) => w === term).length;
    if (f === 0) continue;
    const normalizedTf =
      (f * (k1 + 1)) / (f + k1 * (1 - b + (b * docLen) / avgdl));
    score += idf * (normalizedTf + delta);
  }
  return score;
}
```
