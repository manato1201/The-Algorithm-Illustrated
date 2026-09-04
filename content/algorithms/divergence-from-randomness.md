---
name: DFRモデル(Divergence From Randomness)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(検索語数)
summary: 単語の出現パターンが「ランダムに出現した場合」からどれだけ乖離しているかを測ることで情報量を定量化する検索スコアリングの枠組み。
---

## 概要

2002年にAmatiとVan Rijsbergenが提案した、確率論的な観点から検索スコアを設計する枠組み。基本となる発想は、「もし単語がランダムに(確率的に)文書中に散らばっているだけなら、その出現は情報を持たない。逆に、ある単語がランダムな期待値から大きく外れて特定の文書に集中して出現しているなら、その単語はその文書にとって重要な情報を持っている」というものである。TF-IDFやBM25のような個別のヒューリスティックではなく、複数の基礎モデル(ランダム性モデル)と正規化手法を自由に組み合わせられる**モデルの枠組み(フレームワーク)**である点が特徴で、Terrierなどの検索エンジン実装で採用されている。

## 仕組み

DFRのスコアは、大きく3つの要素の組み合わせとして構成される。

1. **基礎的なランダム性モデル**: 単語の出現がランダムであった場合の確率分布(二項分布やポアソン分布の近似であるBose-Einstein統計など)を仮定し、観測された出現頻度がその分布からどれだけ「意外」かを情報量(-log P)として計算する
2. **頻度正規化(第一正規化)**: 文書中でその単語が実際に持つ「情報利得」を、残りの出現回数に応じて調整する(BM25のTF飽和に相当する役割)
3. **文書長正規化(第二正規化)**: 文書長に応じてTFを正規化し、長い文書が不当に有利にならないようにする(BM25の文書長正規化パラメータbに相当)

これらの要素を組み合わせることで、例えば「Bose-Einstein統計 + 第二正規化」といった具体的なモデル(BE-L2やPL2など)を構成でき、BM25と同等かそれ以上の検索精度を達成することが知られている。

## 特性・トレードオフ

- **計算量**: 各検索語についてO(1)でスコアを計算できるため、実質O(検索語数)(転置インデックス前提)
- **BM25との関係**: 理論的な出自は異なるが、実際の数式やパラメータの役割はBM25と類似する部分が多く、精度も同等クラス。DFRの利点は、複数の確率モデルを組み合わせて新しいスコアリング関数を体系的に導出できる柔軟性にある
- **パラメータの少なさ**: BM25のk1・bのような経験的パラメータへの依存が比較的少なく、理論的な裏付けからパラメータが自然に定まるモデル(PL2など)も存在する
- **使いどころ**: Terrier検索エンジンなどDFRフレームワークを実装した検索基盤、TF-IDF/BM25以外のスコアリングモデルを比較・研究する情報検索の学術研究

## 実装例

```python
import math


def dfr_pl2_score(
    query: list[str],
    doc: list[str],
    corpus: list[list[str]],
    c: float = 1.0,
) -> float:
    """PL2(ポアソン過程 + Laplace正規化)に基づくシンプルなDFRスコア。"""
    n = len(corpus)
    avgdl = sum(len(d) for d in corpus) / n
    doc_len = len(doc)

    score = 0.0
    for term in query:
        tf = doc.count(term)
        if tf == 0:
            continue
        df = sum(1 for d in corpus if term in d)
        # 文書長正規化されたTF(第二正規化)
        tfn = tf * math.log2(1 + (c * avgdl) / doc_len)
        lam = df / n  # コーパス全体での出現率(ポアソン過程の期待値)

        # ポアソン分布からの乖離度を情報量として計算(第一正規化込み)
        info = tfn * math.log2(tfn / lam) + (lam - tfn) * math.log2(math.e) + 0.5 * math.log2(2 * math.pi * tfn)
        score += info / (tfn + 1)
    return score
```

```typescript
function dfrPl2Score(
  query: string[],
  doc: string[],
  corpus: string[][],
  c = 1.0,
): number {
  const n = corpus.length;
  const avgdl = corpus.reduce((sum, d) => sum + d.length, 0) / n;
  const docLen = doc.length;

  let score = 0;
  for (const term of query) {
    const tf = doc.filter((w) => w === term).length;
    if (tf === 0) continue;
    const df = corpus.filter((d) => d.includes(term)).length;
    const tfn = tf * Math.log2(1 + (c * avgdl) / docLen);
    const lam = df / n;

    const info =
      tfn * Math.log2(tfn / lam) +
      (lam - tfn) * Math.log2(Math.E) +
      0.5 * Math.log2(2 * Math.PI * tfn);
    score += info / (tfn + 1);
  }
  return score;
}
```
