---
name: RRF(Reciprocal Rank Fusion)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(kΣ結果数)
summary: 複数の検索結果(キーワード検索とベクトル検索など)の順位の逆数を足し合わせるだけで、スコアの単位を揃えずに統合できるハイブリッド検索の定番手法。
---

## 概要

BM25(キーワード検索)とベクトル検索(意味的な類似度検索)のように、**スコアの尺度がまったく異なる複数の検索結果**を1つのランキングに統合したいとき、単純にスコアを足し合わせようとしても単位が違いすぎてうまくいかない。RRF(Reciprocal Rank Fusion)は、**スコアの値そのものを一切使わず、順位(何位か)だけ**に注目することで、この問題を驚くほどシンプルに解決する。近年のハイブリッド検索(キーワード検索+ベクトル検索の組み合わせ)を実現する上で、事実上の定番手法になっている。

## 仕組み

1. 統合したい複数の検索結果リスト(例: BM25による検索結果、ベクトル検索による検索結果)をそれぞれ用意する
2. 各リストにおいて、各文書の**順位**(1位、2位、3位…)を確認する
3. 各文書について、`スコア = Σ 1 / (k + 順位)` という式で、全リストにおける順位の逆数を足し合わせる(kは順位の影響を緩やかにする定数、通常60程度が使われる)
4. この合成スコアで降順に並べ替えれば、複数の検索結果を統合した最終的なランキングが得られる

例えばある文書がBM25検索で3位、ベクトル検索で1位だったなら、`1/(60+3) + 1/(60+1)` がそのスコアになる。**「1位に近いほど急激にスコアが上がる」逆数の性質**により、複数の検索方式で上位に来る文書ほど、合成ランキングでも自然に上位に押し上げられる。

## 特性・トレードオフ

- **計算量**: 統合する検索結果の総数に比例する軽量な計算(O(kΣ結果数))で、実装も数行で済むほどシンプル
- **スコアの正規化が不要**: BM25のスコアとコサイン類似度のスコアのように、値の範囲も分布も全く異なる指標同士を、**そのままの値を一切使わず順位だけで**公平に統合できるのが最大の強み。値を正規化する手間や、その正規化方法の是非を議論する必要がない
- **パラメータkの役割**: kを大きくすると、上位と下位の順位の差の影響が緩やかになる(全体的に均され気味になる)。小さくすると、上位の順位がより強く優遇される
- **使いどころ**: RAG(Retrieval-Augmented Generation)システムにおけるキーワード検索とベクトル検索のハイブリッド統合、複数の検索エンジン・複数のランキングモデルの結果を1つに統合したい検索システム全般。実装の手軽さから、近年の検索システム構築で最初に検討される統合手法になっている

## 実装例

```python
def reciprocal_rank_fusion(
    rankings: list[list[str]], k: int = 60
) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

```typescript
function reciprocalRankFusion(rankings: string[][], k = 60): [string, number][] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((docId, idx) => {
      const rank = idx + 1;
      scores.set(docId, (scores.get(docId) ?? 0) + 1 / (k + rank));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>

std::vector<std::pair<std::string, double>> reciprocalRankFusion(
    const std::vector<std::vector<std::string>>& rankings, int k = 60) {
    std::unordered_map<std::string, double> scores;
    for (const auto& ranking : rankings) {
        for (size_t idx = 0; idx < ranking.size(); idx++) {
            int rank = static_cast<int>(idx) + 1;
            scores[ranking[idx]] += 1.0 / (k + rank);
        }
    }
    std::vector<std::pair<std::string, double>> result(scores.begin(), scores.end());
    std::sort(result.begin(), result.end(),
              [](const auto& a, const auto& b) { return a.second > b.second; });
    return result;
}
```

```rust
use std::collections::HashMap;

fn reciprocal_rank_fusion(rankings: &[Vec<String>], k: f64) -> Vec<(String, f64)> {
    let mut scores: HashMap<String, f64> = HashMap::new();
    for ranking in rankings {
        for (idx, doc_id) in ranking.iter().enumerate() {
            let rank = (idx + 1) as f64;
            *scores.entry(doc_id.clone()).or_insert(0.0) += 1.0 / (k + rank);
        }
    }
    let mut result: Vec<(String, f64)> = scores.into_iter().collect();
    result.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    result
}
```

```csharp
using System.Collections.Generic;
using System.Linq;

static List<(string DocId, double Score)> ReciprocalRankFusion(
    List<List<string>> rankings, int k = 60)
{
    var scores = new Dictionary<string, double>();
    foreach (var ranking in rankings)
    {
        for (int idx = 0; idx < ranking.Count; idx++)
        {
            int rank = idx + 1;
            scores[ranking[idx]] = scores.GetValueOrDefault(ranking[idx]) + 1.0 / (k + rank);
        }
    }
    return scores.Select(kv => (kv.Key, kv.Value)).OrderByDescending(x => x.Value).ToList();
}
```
