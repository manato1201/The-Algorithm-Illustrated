---
name: クエリ尤度言語モデル(Query Likelihood Model)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(検索語数)
summary: 各文書から「そのクエリが生成される確率」を推定し、確率の高い文書ほど関連性が高いとみなす確率的検索モデル。
---

## 概要

1998年にPonteとCroftが提案した、統計的言語モデルを情報検索に応用した手法。TF-IDFやBM25が「文書とクエリの類似度」を直接スコア化するのに対し、クエリ尤度言語モデルは発想を転換し、**「この文書が生成した言語モデルから、ユーザーのクエリが生成される確率はどれくらいか」**を計算し、その確率が高い文書ほどクエリに関連していると判定する。確率モデルとしての理論的な裏付けを持ち、Dirichlet平滑化やJelinek-Mercer平滑化などの発展形につながる、確率的検索モデルの基礎をなす手法。

## 仕組み

1. 各文書dについて、その文書に出現する単語の頻度から、その文書固有の「言語モデル」P(w|d)(単語wが生成される確率)を推定する
2. クエリq = (q1, q2, ..., qn)が、この文書の言語モデルから独立に生成される確率を P(q|d) = Π P(qi|d) として計算する
3. 文書中に一度も出現しない検索語があると確率が0になってしまう(ゼロ頻度問題)ため、実務では必ず**平滑化(スムージング)**を適用し、コーパス全体の単語分布で確率を補完する
4. 最終的に、P(q|d)が最大となる文書、あるいは対数を取った log P(q|d) が最大となる文書を上位にランキングする

単純な最尤推定(MLE)のままでは未出現語に弱いため、実用上はJelinek-Mercer平滑化(コーパス全体の分布との線形補間)やDirichlet平滑化(文書長に応じた事前分布)と組み合わせて使われることがほとんどである。

## 特性・トレードオフ

- **計算量**: クエリの各検索語についてO(1)で確率を参照できるため、実質O(検索語数)(事前にコーパス全体の単語分布を集計しておく必要がある)
- **BM25との違い**: BM25がヒューリスティックに調整されたスコアリング関数であるのに対し、言語モデルは確率論に基づく生成モデルとして定式化されており、平滑化手法の選択によって性質が変わる理論的な柔軟性を持つ
- **ゼロ頻度問題**: 平滑化なしでは検索語が1つでも文書に出現しないとスコアが0になってしまうため、実運用では平滑化が必須
- **使いどころ**: 学術的な情報検索研究、TREC等の検索精度評価における基準手法、平滑化パラメータを調整できる高度なランキングシステムの基盤

## 実装例

```python
def query_likelihood_score(
    query: list[str],
    doc: list[str],
    vocab_size: int,
) -> float:
    doc_len = len(doc)
    log_prob = 0.0
    for term in query:
        tf = doc.count(term)
        # ラプラス平滑化(単純なアドワン平滑化)でゼロ頻度問題を回避する
        prob = (tf + 1) / (doc_len + vocab_size)
        log_prob += __import__("math").log(prob)
    return log_prob
```

```typescript
function queryLikelihoodScore(
  query: string[],
  doc: string[],
  vocabSize: number,
): number {
  const docLen = doc.length;
  let logProb = 0;
  for (const term of query) {
    const tf = doc.filter((w) => w === term).length;
    // ラプラス平滑化(単純なアドワン平滑化)でゼロ頻度問題を回避する
    const prob = (tf + 1) / (docLen + vocabSize);
    logProb += Math.log(prob);
  }
  return logProb;
}
```
