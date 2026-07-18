---
name: 区間スケジューリング問題
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 終了時刻の早い順に選ぶ貪欲法で、両立可能な区間の最大数を求められることを証明できる好例。
---

## 概要

会議室が1つしかないとき、複数の会議希望(開始時刻と終了時刻の組)の中から、**時間が重ならないように**できるだけ多くの会議を選んで開催したい——という問題。「開始時刻が早い順」「所要時間が短い順」など、一見もっともらしい選び方はいくつも思いつくが、実は**「終了時刻が早い順」に選ぶ**という一見単純な戦略だけが、常に最大数を実現することが証明できる。貪欲法が最適解を導く理由を厳密に理解するための、教科書的な入門問題。

## 仕組み

1. 全ての区間を、**終了時刻の早い順**にソートする
2. ソート順に区間を見ていき、直前に選んだ区間と重ならなければ(開始時刻が、直前に選んだ区間の終了時刻以降であれば)、その区間を採用する
3. 重なる場合はスキップし、次の区間に進む
4. 全ての区間を見終えたら、採用した区間の集合が答えになる

**なぜ終了時刻順が正しいのか**(交換論法による直感): 最初に終わる会議を採用しないという選択肢を考えても、それを別の会議に置き換えたところで、少なくとも同じ数以上の会議を後から選べる余地は狭まらない。つまり「最も早く終わるものを選んでおいて損はしない」ということが、帰納的に証明できる。

## 特性・トレードオフ

- **計算量**: O(n log n)(ソートが支配的)。貪欲法一発で解けるため、DPのような複雑な状態管理が不要
- **貪欲法が"証明付きで"最適になる稀有な例**: 多くの貪欲法は直感的には正しそうでも実際には最適解を保証しない(コインチェンジ問題などがその例)。区間スケジューリング問題は、貪欲法の正しさを交換論法や帰納法で厳密に証明できる数少ない良問として、アルゴリズム教育で頻繁に取り上げられる
- **類似問題との違い**: 「区間の重み(価値)付きで、総価値を最大化したい」という重み付き版になると、単純な貪欲法では解けなくなり動的計画法が必要になる。「制約なしの数」を最大化する場合にだけ、この単純な貪欲法が有効という点に注意
- **使いどころ**: 会議室・設備の予約スケジューリング、CPUのジョブスケジューリング、放送・広告枠の割り当てなど、「重ならないように、できるだけ多くの予定を詰め込みたい」実務上のリソース割り当て問題全般

## 実装例

```python
def interval_scheduling(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    sorted_intervals = sorted(intervals, key=lambda p: p[1])
    selected: list[tuple[int, int]] = []
    last_end = float("-inf")
    for start, end in sorted_intervals:
        if start >= last_end:
            selected.append((start, end))
            last_end = end
    return selected
```

```typescript
type Interval = [number, number];

function intervalScheduling(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  const selected: Interval[] = [];
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {
      selected.push([start, end]);
      lastEnd = end;
    }
  }
  return selected;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <utility>
#include <limits>

std::vector<std::pair<int, int>> intervalScheduling(std::vector<std::pair<int, int>> intervals) {
    std::sort(intervals.begin(), intervals.end(),
              [](const auto& a, const auto& b) { return a.second < b.second; });
    std::vector<std::pair<int, int>> selected;
    int lastEnd = std::numeric_limits<int>::min();
    for (const auto& [start, end] : intervals) {
        if (start >= lastEnd) {
            selected.emplace_back(start, end);
            lastEnd = end;
        }
    }
    return selected;
}
```

```rust
fn interval_scheduling(intervals: &[(i32, i32)]) -> Vec<(i32, i32)> {
    let mut sorted: Vec<(i32, i32)> = intervals.to_vec();
    sorted.sort_by_key(|&(_, end)| end);
    let mut selected = Vec::new();
    let mut last_end = i32::MIN;
    for (start, end) in sorted {
        if start >= last_end {
            selected.push((start, end));
            last_end = end;
        }
    }
    selected
}
```

```csharp
static List<(int start, int end)> IntervalScheduling(List<(int start, int end)> intervals)
{
    var sorted = intervals.OrderBy(p => p.end).ToList();
    var selected = new List<(int, int)>();
    int lastEnd = int.MinValue;
    foreach (var (start, end) in sorted)
    {
        if (start >= lastEnd)
        {
            selected.Add((start, end));
            lastEnd = end;
        }
    }
    return selected;
}
```
