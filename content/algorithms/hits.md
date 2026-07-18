---
name: HITS(Hyperlink-Induced Topic Search)
category: 情報検索・ランキング
subcategory: グラフベースランキング
complexity: O(V + E)(反復1回あたり)
summary: ハブ(良いリンク集)とオーソリティ(良い被リンク先)を相互に強化しながらスコアリングする。
---

## 概要

PageRankとほぼ同時期の1998年、Jon Kleinbergが考案した、リンク構造を使ったもうひとつのランキング手法。PageRankが各ページに1つのスコア(重要度)だけを与えるのに対し、HITSは各ページに**「ハブ値」**(良質なリンク集としての価値)と**「オーソリティ値」**(信頼できる情報源としての価値)という**2つの異なるスコア**を与える。「良いリンク集は良い情報源にリンクしている」「良い情報源は良いリンク集からリンクされている」という、互いを高め合う関係性を数式化している。

## 仕組み

1. 全ページに、ハブ値・オーソリティ値の初期値を均等に割り当てる
2. **オーソリティ値の更新**: 各ページのオーソリティ値を、「自分にリンクしている全ページのハブ値の合計」で更新する(良いハブからリンクされているページほど、良いオーソリティとみなす)
3. **ハブ値の更新**: 各ページのハブ値を、「自分がリンクしている全ページのオーソリティ値の合計」で更新する(良いオーソリティにリンクしているページほど、良いハブとみなす)
4. 2〜3を交互に繰り返し、値を正規化しながら収束させる
5. 最終的に、高いオーソリティ値を持つページが「信頼できる情報源」、高いハブ値を持つページが「良いリンク集」として特定される

PageRankが「Web全体」に対して1つのグローバルなスコアを計算するのに対し、HITSは検索クエリに関連する**特定のトピックに絞った小さなページ集合**の中で相互スコアリングを行う設計になっている点も対照的。

## 特性・トレードオフ

- **計算量**: PageRankと同様、1回の反復がO(V + E)
- **PageRankとの違い**: PageRankは検索とは独立にWeb全体の静的な重要度を事前計算しておけるのに対し、HITSは**クエリごとに関連ページの部分グラフを構築してから**計算する、よりクエリに特化した設計。この違いから、計算コストや実運用のしやすさでPageRankの方が広く普及した
- **トピックドリフトという課題**: 関連ページの部分グラフの構築の仕方次第で、本来のクエリの意図から外れた話題にスコアが引っ張られてしまう(トピックドリフト)ことがあり、これがHITSの実用上の弱点として指摘されている
- **使いどころ**: 検索結果のリランキング(初期の検索結果に対して、ハブ・オーソリティの観点で並べ直す)、あるトピックにおける「権威あるページ」と「まとめページ」を同時に発見したい分析タスク、ソーシャルネットワークにおけるインフルエンサーとキュレーターの識別など

## 実装例

```python
import math


def hits(
    adj: dict[int, list[int]], n: int, iterations: int = 100, tol: float = 1e-12
) -> tuple[dict[int, float], dict[int, float]]:
    rev: dict[int, list[int]] = {i: [] for i in range(n)}
    for u in range(n):
        for v in adj.get(u, []):
            rev[v].append(u)

    hub = {i: 1.0 for i in range(n)}
    auth = {i: 1.0 for i in range(n)}

    for _ in range(iterations):
        # オーソリティ値の更新: 自分にリンクしている全ページのハブ値の合計
        new_auth = {i: sum(hub[u] for u in rev[i]) for i in range(n)}
        norm = math.sqrt(sum(v * v for v in new_auth.values())) or 1.0
        new_auth = {i: v / norm for i, v in new_auth.items()}

        # ハブ値の更新: 自分がリンクしている全ページのオーソリティ値の合計
        new_hub = {i: sum(new_auth[v] for v in adj.get(i, [])) for i in range(n)}
        norm2 = math.sqrt(sum(v * v for v in new_hub.values())) or 1.0
        new_hub = {i: v / norm2 for i, v in new_hub.items()}

        diff = sum(abs(new_auth[i] - auth[i]) for i in range(n)) + sum(
            abs(new_hub[i] - hub[i]) for i in range(n)
        )
        auth, hub = new_auth, new_hub
        if diff < tol:
            break
    return hub, auth
```

```typescript
function hits(
  adj: Map<number, number[]>,
  n: number,
  iterations = 100,
  tol = 1e-12
): { hub: Map<number, number>; auth: Map<number, number> } {
  const rev = new Map<number, number[]>();
  for (let i = 0; i < n; i++) rev.set(i, []);
  for (let u = 0; u < n; u++) for (const v of adj.get(u) ?? []) rev.get(v)!.push(u);

  let hub = new Map<number, number>();
  let auth = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    hub.set(i, 1);
    auth.set(i, 1);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const newAuth = new Map<number, number>();
    for (let i = 0; i < n; i++) newAuth.set(i, (rev.get(i) ?? []).reduce((s, u) => s + hub.get(u)!, 0));
    const norm = Math.sqrt([...newAuth.values()].reduce((s, v) => s + v * v, 0)) || 1;
    for (const [k, v] of newAuth) newAuth.set(k, v / norm);

    const newHub = new Map<number, number>();
    for (let i = 0; i < n; i++) newHub.set(i, (adj.get(i) ?? []).reduce((s, v) => s + newAuth.get(v)!, 0));
    const norm2 = Math.sqrt([...newHub.values()].reduce((s, v) => s + v * v, 0)) || 1;
    for (const [k, v] of newHub) newHub.set(k, v / norm2);

    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(newAuth.get(i)! - auth.get(i)!) + Math.abs(newHub.get(i)! - hub.get(i)!);
    auth = newAuth;
    hub = newHub;
    if (diff < tol) break;
  }
  return { hub, auth };
}
```

```cpp
#include <vector>
#include <cmath>

struct HitsResult {
    std::vector<double> hub;
    std::vector<double> auth;
};

HitsResult hits(const std::vector<std::vector<int>>& adj, int n, int iterations = 100, double tol = 1e-12) {
    std::vector<std::vector<int>> rev(n);
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) rev[v].push_back(u);

    std::vector<double> hub(n, 1.0), auth(n, 1.0);

    for (int it = 0; it < iterations; it++) {
        std::vector<double> newAuth(n, 0.0);
        for (int i = 0; i < n; i++)
            for (int u : rev[i]) newAuth[i] += hub[u];
        double norm = 0;
        for (double v : newAuth) norm += v * v;
        norm = std::sqrt(norm);
        if (norm == 0) norm = 1;
        for (double& v : newAuth) v /= norm;

        std::vector<double> newHub(n, 0.0);
        for (int i = 0; i < n; i++)
            for (int v : adj[i]) newHub[i] += newAuth[v];
        double norm2 = 0;
        for (double v : newHub) norm2 += v * v;
        norm2 = std::sqrt(norm2);
        if (norm2 == 0) norm2 = 1;
        for (double& v : newHub) v /= norm2;

        double diff = 0;
        for (int i = 0; i < n; i++) diff += std::abs(newAuth[i] - auth[i]) + std::abs(newHub[i] - hub[i]);
        auth = newAuth;
        hub = newHub;
        if (diff < tol) break;
    }
    return {hub, auth};
}
```

```rust
fn hits(adj: &[Vec<usize>], n: usize, iterations: usize, tol: f64) -> (Vec<f64>, Vec<f64>) {
    let mut rev: Vec<Vec<usize>> = vec![Vec::new(); n];
    for u in 0..n {
        for &v in &adj[u] {
            rev[v].push(u);
        }
    }

    let mut hub = vec![1.0f64; n];
    let mut auth = vec![1.0f64; n];

    for _ in 0..iterations {
        let mut new_auth: Vec<f64> = (0..n).map(|i| rev[i].iter().map(|&u| hub[u]).sum()).collect();
        let norm = new_auth.iter().map(|v| v * v).sum::<f64>().sqrt();
        let norm = if norm == 0.0 { 1.0 } else { norm };
        for v in new_auth.iter_mut() {
            *v /= norm;
        }

        let mut new_hub: Vec<f64> = (0..n).map(|i| adj[i].iter().map(|&v| new_auth[v]).sum()).collect();
        let norm2 = new_hub.iter().map(|v| v * v).sum::<f64>().sqrt();
        let norm2 = if norm2 == 0.0 { 1.0 } else { norm2 };
        for v in new_hub.iter_mut() {
            *v /= norm2;
        }

        let diff: f64 = (0..n)
            .map(|i| (new_auth[i] - auth[i]).abs() + (new_hub[i] - hub[i]).abs())
            .sum();
        auth = new_auth;
        hub = new_hub;
        if diff < tol {
            break;
        }
    }
    (hub, auth)
}
```

```csharp
static (Dictionary<int, double> hub, Dictionary<int, double> auth) Hits(
    Dictionary<int, List<int>> adj, int n, int iterations = 100, double tol = 1e-12)
{
    var rev = Enumerable.Range(0, n).ToDictionary(i => i, i => new List<int>());
    for (int u = 0; u < n; u++)
        foreach (var v in adj.GetValueOrDefault(u, new())) rev[v].Add(u);

    var hub = Enumerable.Range(0, n).ToDictionary(i => i, i => 1.0);
    var auth = Enumerable.Range(0, n).ToDictionary(i => i, i => 1.0);

    for (int it = 0; it < iterations; it++)
    {
        var newAuth = Enumerable.Range(0, n).ToDictionary(i => i, i => rev[i].Sum(u => hub[u]));
        double norm = Math.Sqrt(newAuth.Values.Sum(v => v * v));
        if (norm == 0) norm = 1;
        foreach (var k in newAuth.Keys.ToList()) newAuth[k] /= norm;

        var newHub = Enumerable.Range(0, n).ToDictionary(i => i, i => adj.GetValueOrDefault(i, new()).Sum(v => newAuth[v]));
        double norm2 = Math.Sqrt(newHub.Values.Sum(v => v * v));
        if (norm2 == 0) norm2 = 1;
        foreach (var k in newHub.Keys.ToList()) newHub[k] /= norm2;

        double diff = Enumerable.Range(0, n).Sum(i => Math.Abs(newAuth[i] - auth[i]) + Math.Abs(newHub[i] - hub[i]));
        auth = newAuth;
        hub = newHub;
        if (diff < tol) break;
    }
    return (hub, auth);
}
```
