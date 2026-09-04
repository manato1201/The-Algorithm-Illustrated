---
name: ディリクレ平滑化言語モデル(Dirichlet Smoothing)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(検索語数)
summary: 文書の言語モデルにディリクレ事前分布を導入し、文書長に応じて平滑化の強さを自動調整する検索スコアリング手法。
---

## 概要

クエリ尤度言語モデルにおけるゼロ頻度問題を解決する平滑化手法の一つで、Zhai & Laffertyが2001年に体系的な比較研究の中で最良の性能を示した手法として広く知られるようになった。ベイズ統計における**ディリクレ事前分布**を単語の出現確率に導入し、文書自身の単語分布と、コーパス全体の単語分布とを、**文書長に応じた重みで混合する**。短い文書ほどコーパス全体の分布に強く依存し、長い文書ほど自身の分布を信頼するという、直感的にも妥当な振る舞いをする。

## 仕組み

1. コーパス全体における各単語wの出現確率 P(w|C) を事前に集計しておく
2. 文書dにおける単語wの平滑化後確率を、次の式で計算する: P(w|d) = (tf(w,d) + μ・P(w|C)) / (|d| + μ)
   - tf(w,d): 文書d中での単語wの出現回数
   - |d|: 文書dの長さ(総単語数)
   - μ: ディリクレの事前分布の強さを表すハイパーパラメータ(典型的に1000〜2000程度)
3. μが大きいほどコーパス全体の分布への依存が強くなり(平滑化が強い)、μが小さいほど文書自身の分布を信頼する
4. 分母に文書長|d|が入っているため、**文書が長いほど自動的に平滑化の影響が相対的に小さくなる**という、Jelinek-Mercer平滑化にはない自己調整的な性質を持つ
5. クエリ全体のスコアは、各検索語についての log P(qi|d) の総和として計算する

## 特性・トレードオフ

- **計算量**: O(検索語数)(コーパス全体の単語分布は事前計算済みが前提)
- **Jelinek-Mercer平滑化との違い**: Jelinek-Mercerは固定の混合比λで線形補間するのに対し、Dirichlet平滑化は文書長に応じて平滑化の強さが自動で変わる。短いクエリ・キーワード検索ではDirichlet、長い自然文クエリではJelinek-Mercerが優位という経験則が知られている
- **パラメータ感度**: μの選択が結果に大きく影響するため、検証データでの調整が推奨される。ただしμ=1000〜2000あたりで安定した性能が出ることが多い
- **使いどころ**: TREC系の検索精度評価タスクにおける強力なベースライン、短いキーワードクエリを主とする検索システム、言語モデルベースの検索エンジンの実装

## 実装例

```python
import math


def dirichlet_smoothed_score(
    query: list[str],
    doc: list[str],
    corpus_word_freq: dict[str, int],
    corpus_total_words: int,
    mu: float = 1500.0,
) -> float:
    doc_len = len(doc)
    log_prob = 0.0
    for term in query:
        tf = doc.count(term)
        p_corpus = corpus_word_freq.get(term, 0) / corpus_total_words
        if p_corpus == 0:
            continue
        prob = (tf + mu * p_corpus) / (doc_len + mu)
        log_prob += math.log(prob) if prob > 0 else float("-inf")
    return log_prob
```

```typescript
function dirichletSmoothedScore(
  query: string[],
  doc: string[],
  corpusWordFreq: Map<string, number>,
  corpusTotalWords: number,
  mu = 1500.0,
): number {
  const docLen = doc.length;
  let logProb = 0;
  for (const term of query) {
    const tf = doc.filter((w) => w === term).length;
    const pCorpus = (corpusWordFreq.get(term) ?? 0) / corpusTotalWords;
    if (pCorpus === 0) continue;
    const prob = (tf + mu * pCorpus) / (docLen + mu);
    logProb += prob > 0 ? Math.log(prob) : -Infinity;
  }
  return logProb;
}
```
