---
name: PageRank
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V + E)(反復1回あたり)
summary: 「重要なページからリンクされているページは重要」という考えを固有ベクトル計算に落とし込む、Googleの創業技術。
---

## 概要

1998年、当時スタンフォード大学の学生だったLarry PageとSergey Brinが、それまでの検索エンジンがキーワードの一致度だけで結果を並べていたのに対し、**「多くの重要なページからリンクされているページは、それ自体も重要である」**という、リンク構造そのものを手がかりにする画期的な発想でランキングを行う手法を考案した。この技術がGoogleという会社の創業技術になった。

## 仕組み

Webページを頂点、リンクを有向辺としたグラフとみなし、各ページの「重要度」を再帰的に定義する。

1. 全ページに、初期値として均等な重要度(スコア)を割り当てる
2. 各ページは、自分の重要度を、**自分がリンクしている先のページたちに均等に分配する**(リンク先が10個あれば、それぞれに自分の重要度の1/10ずつを渡す)
3. 各ページは、他のページから渡された分配分を全て合計し、それを新しい自分の重要度とする
4. この「分配→合計」を何度も繰り返すと、スコアは徐々に収束し、最終的な安定したランキングが得られる
5. リンクが一切ないページ(行き止まり)や、リンクの循環に全ての重要度が吸い込まれてしまう問題を防ぐため、一定確率でランダムに別のページへジャンプする「ダンピングファクター」という仕組みが加えられている

数学的には、この反復計算は「Webのリンク構造を表す行列の、最大固有値に対応する固有ベクトルを求める」問題と等価であることが示されており、線形代数の理論がそのまま検索エンジンのランキングに応用されている点が興味深い。

## 特性・トレードオフ

- **計算量**: 1回の反復がO(V + E)(V=ページ数、E=リンク数)で、収束するまで複数回繰り返す。Web全体という巨大なグラフに対しては、大規模な分散計算基盤(MapReduceなど)が必要になる
- **コンテンツと無関係な"権威性"の指標**: PageRankはページの内容(キーワード)を一切見ず、リンク構造だけから重要度を測る。実際の検索結果は、このPageRankと、TF-IDF/BM25のようなコンテンツベースのスコアを組み合わせて決定される
- **リンクスパムとの戦い**: 「重要度の高いページからリンクされると自分の評価が上がる」という性質は、意図的にリンクを操作してランキングを不正に上げようとする「リンクファーム」のような攻撃を誘発し、検索エンジン側はこれに対抗する仕組みを絶えず発展させてきた
- **使いどころ**: Web検索エンジンのランキング(その原点)、SNSにおける影響力の大きいアカウントの特定、論文の引用関係から重要な研究を見つける学術分析、ソーシャルネットワーク分析全般

## 実装例

```python
def pagerank(
    adj: dict[int, list[int]], n: int, damping: float = 0.85, iterations: int = 100, tol: float = 1e-10
) -> dict[int, float]:
    scores = {i: 1.0 / n for i in range(n)}
    out_degree = {i: len(adj.get(i, [])) for i in range(n)}

    for _ in range(iterations):
        new_scores = {i: (1 - damping) / n for i in range(n)}

        # 行き止まり(リンクなし)ページの重要度を全ページに均等に再分配する
        dangling_sum = sum(scores[i] for i in range(n) if out_degree[i] == 0)
        for i in range(n):
            new_scores[i] += damping * dangling_sum / n

        for u in range(n):
            if out_degree[u] == 0:
                continue
            share = scores[u] / out_degree[u]
            for v in adj[u]:
                new_scores[v] += damping * share

        diff = sum(abs(new_scores[i] - scores[i]) for i in range(n))
        scores = new_scores
        if diff < tol:
            break
    return scores
```

```typescript
function pagerank(
  adj: Map<number, number[]>,
  n: number,
  damping = 0.85,
  iterations = 100,
  tol = 1e-10
): Map<number, number> {
  let scores = new Map<number, number>();
  for (let i = 0; i < n; i++) scores.set(i, 1 / n);
  const outDegree = new Map<number, number>();
  for (let i = 0; i < n; i++) outDegree.set(i, (adj.get(i) ?? []).length);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map<number, number>();
    for (let i = 0; i < n; i++) newScores.set(i, (1 - damping) / n);

    let danglingSum = 0;
    for (let i = 0; i < n; i++) if (outDegree.get(i) === 0) danglingSum += scores.get(i)!;
    for (let i = 0; i < n; i++) newScores.set(i, newScores.get(i)! + (damping * danglingSum) / n);

    for (let u = 0; u < n; u++) {
      const deg = outDegree.get(u)!;
      if (deg === 0) continue;
      const share = scores.get(u)! / deg;
      for (const v of adj.get(u) ?? []) newScores.set(v, newScores.get(v)! + damping * share);
    }

    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(newScores.get(i)! - scores.get(i)!);
    scores = newScores;
    if (diff < tol) break;
  }
  return scores;
}
```

```cpp
#include <vector>
#include <cmath>

std::vector<double> pagerank(const std::vector<std::vector<int>>& adj, int n,
                              double damping = 0.85, int iterations = 100, double tol = 1e-10) {
    std::vector<double> scores(n, 1.0 / n);
    std::vector<int> outDegree(n);
    for (int i = 0; i < n; i++) outDegree[i] = static_cast<int>(adj[i].size());

    for (int it = 0; it < iterations; it++) {
        std::vector<double> newScores(n, (1 - damping) / n);

        double danglingSum = 0;
        for (int i = 0; i < n; i++) if (outDegree[i] == 0) danglingSum += scores[i];
        for (int i = 0; i < n; i++) newScores[i] += damping * danglingSum / n;

        for (int u = 0; u < n; u++) {
            if (outDegree[u] == 0) continue;
            double share = scores[u] / outDegree[u];
            for (int v : adj[u]) newScores[v] += damping * share;
        }

        double diff = 0;
        for (int i = 0; i < n; i++) diff += std::abs(newScores[i] - scores[i]);
        scores = newScores;
        if (diff < tol) break;
    }
    return scores;
}
```

```rust
fn pagerank(adj: &[Vec<usize>], n: usize, damping: f64, iterations: usize, tol: f64) -> Vec<f64> {
    let mut scores = vec![1.0 / n as f64; n];
    let out_degree: Vec<usize> = adj.iter().map(|v| v.len()).collect();

    for _ in 0..iterations {
        let mut new_scores = vec![(1.0 - damping) / n as f64; n];

        let dangling_sum: f64 = (0..n).filter(|&i| out_degree[i] == 0).map(|i| scores[i]).sum();
        for s in new_scores.iter_mut() {
            *s += damping * dangling_sum / n as f64;
        }

        for u in 0..n {
            if out_degree[u] == 0 {
                continue;
            }
            let share = scores[u] / out_degree[u] as f64;
            for &v in &adj[u] {
                new_scores[v] += damping * share;
            }
        }

        let diff: f64 = (0..n).map(|i| (new_scores[i] - scores[i]).abs()).sum();
        scores = new_scores;
        if diff < tol {
            break;
        }
    }
    scores
}
```

```csharp
static Dictionary<int, double> PageRank(
    Dictionary<int, List<int>> adj, int n, double damping = 0.85, int iterations = 100, double tol = 1e-10)
{
    var scores = Enumerable.Range(0, n).ToDictionary(i => i, i => 1.0 / n);
    var outDeg = Enumerable.Range(0, n).ToDictionary(i => i, i => adj.GetValueOrDefault(i, new()).Count);

    for (int it = 0; it < iterations; it++)
    {
        var newScores = Enumerable.Range(0, n).ToDictionary(i => i, i => (1 - damping) / n);

        double danglingSum = Enumerable.Range(0, n).Where(i => outDeg[i] == 0).Sum(i => scores[i]);
        for (int i = 0; i < n; i++) newScores[i] += damping * danglingSum / n;

        for (int u = 0; u < n; u++)
        {
            if (outDeg[u] == 0) continue;
            double share = scores[u] / outDeg[u];
            foreach (var v in adj[u]) newScores[v] += damping * share;
        }

        double diff = Enumerable.Range(0, n).Sum(i => Math.Abs(newScores[i] - scores[i]));
        scores = newScores;
        if (diff < tol) break;
    }
    return scores;
}
```
