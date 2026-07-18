---
name: TextRank
category: 自然言語処理
subcategory: 要約・訂正
complexity: O(反復回数 × E)(Eは単語・文のグラフの辺数)
summary: 単語や文を頂点、共起や類似度を辺とするグラフを作り、PageRankと同じ考え方で重要な単語・文を発見する教師なしの要約・キーワード抽出手法。
---

## 概要

文書の中から重要なキーワードや要約に使うべき文を選び出すには、機械学習のための大量のラベル付きデータが必要になりがちだが、そうしたデータが手に入らない場面も多い。2004年に提案されたTextRankは、Webページの重要度を計算する[PageRank](/algorithms/pagerank)の考え方をテキストにそのまま応用する——単語(または文)を頂点とし、単語同士の共起関係(または文同士の類似度)を辺とするグラフを作り、「重要な単語・文とたくさん繋がっている単語・文はそれ自身も重要である」という再帰的な考え方で重要度スコアを計算する、ラベル付きデータを一切必要としない教師なし手法である。

## 仕組み

1. **キーワード抽出の場合**: 文書中の単語(名詞・形容詞など)を頂点とし、一定の窓幅内で共起する(近くに出現する)単語同士を辺で結んだグラフを作る
2. **文の要約の場合**: 文書中の各文を頂点とし、文同士の類似度([TF-IDF](/algorithms/tf-idf)ベクトルのコサイン類似度など)を辺の重みとした、全結合に近いグラフを作る
3. [PageRank](/algorithms/pagerank)と全く同じ更新式`スコア(頂点i) = (1-d) + d × Σ(隣接頂点jからの重み付きスコアの合計)`を、全頂点のスコアが収束するまで反復計算する(`d`はダンピングファクタ、通常0.85)
4. スコアが収束したら、キーワード抽出の場合はスコアの高い単語の上位いくつかを、文の要約の場合はスコアの高い文の上位いくつかを、元の文書中の出現順に並べて出力する

## 特性・トレードオフ

- **計算量**: グラフの辺数`E`に対して1反復あたり`O(E)`、収束までの反復回数を掛けた計算量。[PageRank](/algorithms/pagerank)と全く同じ計算コストの構造を持つ
- **教師なしで言語・ドメインを問わない**: ラベル付きの訓練データを必要としないため、特定の言語やドメインに特化した訓練を経ずに、任意のテキストにすぐ適用できる。専門用語の多い技術文書から日常的な文章まで、幅広く動作する
- **[PageRank](/algorithms/pagerank)との関係**: グラフの構造(リンクか共起か)と頂点が表すもの(Webページか単語・文か)が異なるだけで、重要度を計算するアルゴリズムの核となる考え方は全く同一——「グラフ構造から再帰的に重要度を定義する」というアイデアの汎用性の高さを示す好例になっている
- **使いどころ**: ニュース記事や論文の自動要約(抽出型要約: 元の文をそのまま抜き出す方式)、キーワード抽出による文書のタグ付け・索引作成、検索結果のスニペット生成。深層学習ベースの生成型要約(元の文をそのまま使わず新しい文を生成する方式)が普及した今でも、軽量で解釈しやすい抽出型要約のベースラインとして使われ続けている

## 実装例

```python
def text_rank(similarity: list[list[float]], damping: float = 0.85,
               iterations: int = 100, tol: float = 1e-8) -> list[float]:
    """similarity[j][i]は頂点jから頂点iへの類似度(重み)。"""
    n = len(similarity)
    out_sum = [sum(similarity[i]) for i in range(n)]
    score = [1.0 / n] * n

    for _ in range(iterations):
        new_score = [0.0] * n
        for i in range(n):
            total = 0.0
            for j in range(n):
                if i != j and similarity[j][i] > 0 and out_sum[j] > 0:
                    total += (similarity[j][i] / out_sum[j]) * score[j]
            new_score[i] = (1 - damping) + damping * total
        diff = sum(abs(new_score[i] - score[i]) for i in range(n))
        score = new_score
        if diff < tol:
            break

    return score
```

```typescript
function textRank(
  similarity: number[][],
  damping = 0.85,
  iterations = 100,
  tol = 1e-8
): number[] {
  const n = similarity.length;
  const outSum = similarity.map((row) => row.reduce((s, x) => s + x, 0));
  let score = new Array(n).fill(1 / n);

  for (let it = 0; it < iterations; it++) {
    const newScore = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let total = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && similarity[j][i] > 0 && outSum[j] > 0) {
          total += (similarity[j][i] / outSum[j]) * score[j];
        }
      }
      newScore[i] = (1 - damping) + damping * total;
    }
    const diff = newScore.reduce((s, v, i) => s + Math.abs(v - score[i]), 0);
    score = newScore;
    if (diff < tol) break;
  }

  return score;
}
```

```cpp
#include <vector>
#include <cmath>
#include <numeric>

std::vector<double> textRank(const std::vector<std::vector<double>>& similarity,
                              double damping = 0.85, int iterations = 100, double tol = 1e-8) {
    int n = static_cast<int>(similarity.size());
    std::vector<double> outSum(n, 0.0);
    for (int i = 0; i < n; i++) {
        outSum[i] = std::accumulate(similarity[i].begin(), similarity[i].end(), 0.0);
    }
    std::vector<double> score(n, 1.0 / n);

    for (int it = 0; it < iterations; it++) {
        std::vector<double> newScore(n, 0.0);
        for (int i = 0; i < n; i++) {
            double total = 0.0;
            for (int j = 0; j < n; j++) {
                if (i != j && similarity[j][i] > 0 && outSum[j] > 0) {
                    total += (similarity[j][i] / outSum[j]) * score[j];
                }
            }
            newScore[i] = (1 - damping) + damping * total;
        }
        double diff = 0.0;
        for (int i = 0; i < n; i++) diff += std::abs(newScore[i] - score[i]);
        score = newScore;
        if (diff < tol) break;
    }

    return score;
}
```

```rust
fn text_rank(similarity: &[Vec<f64>], damping: f64, iterations: usize, tol: f64) -> Vec<f64> {
    let n = similarity.len();
    let out_sum: Vec<f64> = similarity.iter().map(|row| row.iter().sum()).collect();
    let mut score = vec![1.0 / n as f64; n];

    for _ in 0..iterations {
        let mut new_score = vec![0.0; n];
        for i in 0..n {
            let mut total = 0.0;
            for j in 0..n {
                if i != j && similarity[j][i] > 0.0 && out_sum[j] > 0.0 {
                    total += (similarity[j][i] / out_sum[j]) * score[j];
                }
            }
            new_score[i] = (1.0 - damping) + damping * total;
        }
        let diff: f64 = (0..n).map(|i| (new_score[i] - score[i]).abs()).sum();
        score = new_score;
        if diff < tol {
            break;
        }
    }

    score
}
```

```csharp
static double[] TextRank(double[][] similarity, double damping = 0.85, int iterations = 100, double tol = 1e-8)
{
    int n = similarity.Length;
    var outSum = similarity.Select(row => row.Sum()).ToArray();
    var score = Enumerable.Repeat(1.0 / n, n).ToArray();

    for (int it = 0; it < iterations; it++)
    {
        var newScore = new double[n];
        for (int i = 0; i < n; i++)
        {
            double total = 0.0;
            for (int j = 0; j < n; j++)
            {
                if (i != j && similarity[j][i] > 0 && outSum[j] > 0)
                {
                    total += (similarity[j][i] / outSum[j]) * score[j];
                }
            }
            newScore[i] = (1 - damping) + damping * total;
        }
        double diff = 0.0;
        for (int i = 0; i < n; i++) diff += Math.Abs(newScore[i] - score[i]);
        score = newScore;
        if (diff < tol) break;
    }

    return score;
}
```
