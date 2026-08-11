---
name: 貪欲集合被覆(Greedy Set Cover)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n・m)(nは要素数、mは候補集合の数)
summary: 「まだ被覆されていない要素を最も多く含む集合」を毎回選び続けるだけの単純な貪欲法だが、最適解のln n倍以内という近似精度が理論的に保証されている、近似アルゴリズムの代表例。
---

## 概要

「ある要素の集合`U`を、与えられたいくつかの部分集合の中から選んだものだけで、全て覆いたい(被覆したい)。使う部分集合の数をできるだけ少なくせよ」という集合被覆問題(Set Cover)は、NP困難な問題として知られ、厳密な最適解を求めるには指数時間かかりうる。しかし「**まだ覆われていない要素を最も多く新たに覆える集合を、毎回貪欲に選ぶ**」という単純な戦略だけで、驚くほど良い解が得られることが知られている。この貪欲法が選ぶ集合の数は、最適解の要素数の`ln n + 1`倍を超えないことが数学的に証明されており、NP困難な問題に対する近似アルゴリズムの威力を示す代表例として、アルゴリズム論の教科書で頻繁に取り上げられる。

## 仕組み

1. 被覆したい全要素の集合`U`と、候補となる部分集合`S_1, S_2, ..., S_m`(それぞれ`U`の部分集合)を用意する
2. まだ選んでいない集合の中から、**「まだ被覆されていない要素」を最も多く含む集合**を1つ選ぶ
3. 選んだ集合を解に追加し、その集合に含まれる要素を全て「被覆済み」としてマークする
4. `U`の全要素が被覆されるまで、2〜3を繰り返す
5. 選んだ集合のリストが、貪欲法による被覆の解となる

## 特性・トレードオフ

- **NP困難な問題への理論的に保証された近似**: 集合被覆問題そのものは厳密に解くのが困難だが、この単純な貪欲法は最適解のサイズ(必要な最小集合数)を`k`としたとき、`k・(ln n + 1)`個以内の集合で必ず被覆できることが証明されている。近似アルゴリズムの分野で「貪欲法がどこまで良い保証を持てるか」を示す基本的な結果としてよく引用される
- **実装の単純さと実用上の良好な性能**: 理論的な最悪ケースの保証だけでなく、実際の多くの問題例では貪欲法はさらに最適解に近い結果を出すことが経験的に知られている。実装も「毎回一番良い集合を選ぶ」という単純なループだけで済む
- **重み付き集合被覆への拡張**: 各集合にコスト(重み)がある場合(コストあたりの被覆要素数が最大の集合を選ぶ、というように評価基準を「コスト効率」に変える)にも同様の貪欲法とほぼ同じ近似保証が拡張できる。この考え数え方は他の被覆問題(頂点被覆、彩色問題の一部)にも応用される
- **使いどころ**: テストケースの選定(できるだけ少ないテストで全ての要件をカバーする)、センサー配置問題(できるだけ少ないセンサーで全域を監視する)、クーポン・広告配信の対象選定(できるだけ少ない配信先で全顧客層をカバーする)、レコメンドシステムでの多様性確保

## 実装例

```python
def greedy_set_cover(universe: set[int], subsets: list[set[int]]) -> list[set[int]]:
    covered: set[int] = set()
    remaining_subsets = list(subsets)
    chosen: list[set[int]] = []

    while covered != universe and remaining_subsets:
        best_subset = max(remaining_subsets, key=lambda s: len(s - covered))
        new_elements = best_subset - covered
        if not new_elements:
            break  # これ以上被覆を進められる集合がない
        chosen.append(best_subset)
        covered |= best_subset
        remaining_subsets.remove(best_subset)

    return chosen
```

```typescript
function greedySetCover(
  universe: Set<number>,
  subsets: Set<number>[],
): Set<number>[] {
  const covered = new Set<number>();
  const remaining = [...subsets];
  const chosen: Set<number>[] = [];

  const newElementsCount = (s: Set<number>) =>
    [...s].filter((x) => !covered.has(x)).length;

  while (covered.size < universe.size && remaining.length > 0) {
    let bestIdx = 0;
    let bestCount = newElementsCount(remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const count = newElementsCount(remaining[i]);
      if (count > bestCount) {
        bestCount = count;
        bestIdx = i;
      }
    }
    if (bestCount === 0) break;

    const best = remaining[bestIdx];
    chosen.push(best);
    for (const x of best) covered.add(x);
    remaining.splice(bestIdx, 1);
  }

  return chosen;
}
```

```cpp
#include <vector>
#include <set>
#include <algorithm>

std::vector<std::set<int>> greedySetCover(const std::set<int>& universe, std::vector<std::set<int>> subsets) {
    std::set<int> covered;
    std::vector<std::set<int>> chosen;

    while (covered.size() < universe.size() && !subsets.empty()) {
        int bestIdx = -1, bestCount = -1;
        for (size_t i = 0; i < subsets.size(); i++) {
            int count = 0;
            for (int x : subsets[i]) if (!covered.count(x)) count++;
            if (count > bestCount) { bestCount = count; bestIdx = static_cast<int>(i); }
        }
        if (bestCount <= 0) break;

        chosen.push_back(subsets[bestIdx]);
        for (int x : subsets[bestIdx]) covered.insert(x);
        subsets.erase(subsets.begin() + bestIdx);
    }

    return chosen;
}
```

```rust
use std::collections::HashSet;

fn greedy_set_cover(universe: &HashSet<i32>, subsets: &[HashSet<i32>]) -> Vec<HashSet<i32>> {
    let mut covered: HashSet<i32> = HashSet::new();
    let mut remaining: Vec<HashSet<i32>> = subsets.to_vec();
    let mut chosen = Vec::new();

    while covered.len() < universe.len() && !remaining.is_empty() {
        let mut best_idx = 0;
        let mut best_count = 0;
        for (i, s) in remaining.iter().enumerate() {
            let count = s.iter().filter(|x| !covered.contains(x)).count();
            if count > best_count {
                best_count = count;
                best_idx = i;
            }
        }
        if best_count == 0 {
            break;
        }

        let best = remaining.remove(best_idx);
        for &x in &best {
            covered.insert(x);
        }
        chosen.push(best);
    }

    chosen
}
```

```csharp
static List<HashSet<int>> GreedySetCover(HashSet<int> universe, List<HashSet<int>> subsets)
{
    var covered = new HashSet<int>();
    var remaining = new List<HashSet<int>>(subsets);
    var chosen = new List<HashSet<int>>();

    while (covered.Count < universe.Count && remaining.Count > 0)
    {
        int bestIdx = 0, bestCount = -1;
        for (int i = 0; i < remaining.Count; i++)
        {
            int count = remaining[i].Count(x => !covered.Contains(x));
            if (count > bestCount) { bestCount = count; bestIdx = i; }
        }
        if (bestCount <= 0) break;

        var best = remaining[bestIdx];
        chosen.Add(best);
        foreach (var x in best) covered.Add(x);
        remaining.RemoveAt(bestIdx);
    }

    return chosen;
}
```
