---
name: パーソナライズドPageRank
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(E)(1回のべき乗法反復、E=辺数)
summary: 通常のPageRankがランダムサーファーの「ワープ先」を全頂点から一様ランダムに選ぶのに対し、特定の頂点集合(興味の起点)へワープする確率を高くすることで、その起点に近い・関連の深いノードほど高いスコアを得られるようにした個人化ランキング手法。
---

## 概要

[PageRank](/algorithms/pagerank)は「ランダムサーファーがリンクをたどり続け、時々どこかのページへランダムにワープする」という確率モデルに基づき、Web全体で見て重要なページに高いスコアを与える。しかしこのモデルは、ワープ先を全ページから完全に一様ランダムに選ぶため、「誰にとっても同じ」グローバルな重要度しか計算できない。パーソナライズドPageRankは、このワープ先の確率分布を「特定のノード集合(興味の起点、例えばユーザーが過去に訪れたページや、ある単語に関連するノード)」に偏らせることで、その起点から見て構造的に近い・関連性の深いノードに高いスコアを与える——PageRankの数式をほぼそのまま使いながら、たった1つのパラメータ(ワープ先の分布)を変えるだけでグローバルなランキングを「個人化」できる、Googleのパーソナライズ検索やソーシャルネットワークのレコメンデーションで実際に使われる手法である。

## 仕組み

1. [PageRank](/algorithms/pagerank)と同じグラフ構造(Webページ間のリンク、ソーシャルネットワークのフォロー関係など)を用意する
2. 通常のPageRankでは、ランダムワープ時の遷移先分布を「全頂点に対して一様」(`1/N`ずつ)に設定するが、パーソナライズドPageRankでは、これを「興味の起点となる頂点集合`S`に対してのみ確率を割り当てる」分布に置き換える(`S`に含まれる頂点にだけ`1/|S|`、それ以外は0)
3. [PageRank](/algorithms/pagerank)と全く同じ[べき乗法](/algorithms/power-iteration)の反復計算(リンクをたどる確率`d`とワープする確率`1-d`を組み合わせたスコア更新式)を、このパーソナライズされたワープ分布のもとで実行する
4. 反復を収束するまで繰り返すと、起点集合`S`から到達しやすい(かつ多くの経路で到達できる)頂点ほど高いスコアを持つランキングが得られる
5. 起点集合`S`を変えるだけで、同じグラフから全く異なる「視点」のランキングを何度でも計算し直せる

## 特性・トレードオフ

- **計算量**: 通常の[PageRank](/algorithms/pagerank)と全く同じ`O(E)`per反復——アルゴリズムの構造自体は変えず、初期分布とワープ分布のパラメータを変えるだけで個人化を実現している点がこの手法の巧妙さである
- **起点集合を都度変える場合のコスト**: ユーザーごとに異なる起点集合`S`でパーソナライズドPageRankを計算し直す必要がある場合、ユーザー数だけ反復計算を繰り返すコストがかかる。大規模なシステムでは、起点集合をクラスタリングして代表的な「トピック」ごとに事前計算しておく(トピック依存PageRank)などの最適化が使われる
- **[PageRank](/algorithms/pagerank)の一般化としての位置づけ**: 起点集合`S`をグラフの全頂点に設定すれば、通常の[PageRank](/algorithms/pagerank)と完全に一致する——パーソナライズドPageRankは、グローバルなPageRankを特殊ケースとして含む、より一般的な枠組みになっている
- **使いどころ**: 検索エンジンのパーソナライズ検索(ユーザーの閲覧履歴を起点集合として使う)、ソーシャルネットワークにおける「知り合いかも」推薦(特定ユーザーを起点にしたグラフ上のランキング)、推薦システムにおけるアイテム間の関連度計算、グラフ上の異常検知(通常と異なるパーソナライズドPageRank分布を示すノードの検出)

## 実装例

[通常のPageRank](/algorithms/pagerank)との違いは、再起動時の分配先を「全ノードに均等」ではなく「起点集合`seeds`に均等」にした`personalization`ベクトルに置き換えている点だけである。

```python
def personalized_pagerank(
    adj: dict[int, list[int]],
    n: int,
    seeds: list[int],
    damping: float = 0.85,
    iterations: int = 100,
    tol: float = 1e-10,
) -> dict[int, float]:
    # 通常のPageRankは全ノードに1/nずつ配るが、ここでは起点集合seedsにだけ均等に配る
    personalization = {i: 0.0 for i in range(n)}
    for s in seeds:
        personalization[s] = 1.0 / len(seeds)

    scores = {i: 1.0 / n for i in range(n)}
    out_degree = {i: len(adj.get(i, [])) for i in range(n)}

    for _ in range(iterations):
        new_scores = {i: (1 - damping) * personalization[i] for i in range(n)}

        # 行き止まり(リンクなし)ページの重要度も、全ノードではなくpersonalizationに沿って再分配する
        dangling_sum = sum(scores[i] for i in range(n) if out_degree[i] == 0)
        for i in range(n):
            new_scores[i] += damping * dangling_sum * personalization[i]

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
function personalizedPagerank(
  adj: Map<number, number[]>,
  n: number,
  seeds: number[],
  damping = 0.85,
  iterations = 100,
  tol = 1e-10
): Map<number, number> {
  const personalization = new Map<number, number>();
  for (let i = 0; i < n; i++) personalization.set(i, 0);
  for (const s of seeds) personalization.set(s, 1 / seeds.length);

  let scores = new Map<number, number>();
  for (let i = 0; i < n; i++) scores.set(i, 1 / n);
  const outDegree = new Map<number, number>();
  for (let i = 0; i < n; i++) outDegree.set(i, (adj.get(i) ?? []).length);

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map<number, number>();
    for (let i = 0; i < n; i++) newScores.set(i, (1 - damping) * personalization.get(i)!);

    let danglingSum = 0;
    for (let i = 0; i < n; i++) if (outDegree.get(i) === 0) danglingSum += scores.get(i)!;
    for (let i = 0; i < n; i++)
      newScores.set(i, newScores.get(i)! + damping * danglingSum * personalization.get(i)!);

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

std::vector<double> personalizedPagerank(const std::vector<std::vector<int>>& adj, int n,
                                          const std::vector<int>& seeds,
                                          double damping = 0.85, int iterations = 100, double tol = 1e-10) {
    std::vector<double> personalization(n, 0.0);
    for (int s : seeds) personalization[s] = 1.0 / seeds.size();

    std::vector<double> scores(n, 1.0 / n);
    std::vector<int> outDegree(n);
    for (int i = 0; i < n; i++) outDegree[i] = static_cast<int>(adj[i].size());

    for (int it = 0; it < iterations; it++) {
        std::vector<double> newScores(n);
        for (int i = 0; i < n; i++) newScores[i] = (1 - damping) * personalization[i];

        double danglingSum = 0;
        for (int i = 0; i < n; i++) if (outDegree[i] == 0) danglingSum += scores[i];
        for (int i = 0; i < n; i++) newScores[i] += damping * danglingSum * personalization[i];

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
fn personalized_pagerank(
    adj: &[Vec<usize>], n: usize, seeds: &[usize], damping: f64, iterations: usize, tol: f64,
) -> Vec<f64> {
    let mut personalization = vec![0.0; n];
    for &s in seeds {
        personalization[s] = 1.0 / seeds.len() as f64;
    }

    let mut scores = vec![1.0 / n as f64; n];
    let out_degree: Vec<usize> = adj.iter().map(|v| v.len()).collect();

    for _ in 0..iterations {
        let mut new_scores: Vec<f64> = (0..n).map(|i| (1.0 - damping) * personalization[i]).collect();

        let dangling_sum: f64 = (0..n).filter(|&i| out_degree[i] == 0).map(|i| scores[i]).sum();
        for i in 0..n {
            new_scores[i] += damping * dangling_sum * personalization[i];
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
static Dictionary<int, double> PersonalizedPageRank(
    Dictionary<int, List<int>> adj, int n, List<int> seeds,
    double damping = 0.85, int iterations = 100, double tol = 1e-10)
{
    var personalization = Enumerable.Range(0, n).ToDictionary(i => i, i => 0.0);
    foreach (var s in seeds) personalization[s] = 1.0 / seeds.Count;

    var scores = Enumerable.Range(0, n).ToDictionary(i => i, i => 1.0 / n);
    var outDeg = Enumerable.Range(0, n).ToDictionary(i => i, i => adj.GetValueOrDefault(i, new()).Count);

    for (int it = 0; it < iterations; it++)
    {
        var newScores = Enumerable.Range(0, n).ToDictionary(i => i, i => (1 - damping) * personalization[i]);

        double danglingSum = Enumerable.Range(0, n).Where(i => outDeg[i] == 0).Sum(i => scores[i]);
        for (int i = 0; i < n; i++) newScores[i] += damping * danglingSum * personalization[i];

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
