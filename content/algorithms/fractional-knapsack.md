---
name: 分数ナップサック問題(Fractional Knapsack)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)(価値密度でのソートが支配的)
summary: 品物を分割して一部だけ詰めることが許される場合、価値密度(価値÷重さ)の高い順に貪欲に詰めていくだけで最適解が保証される、0-1ナップサック問題とは対照的に貪欲法が正しく機能する好例。
---

## 概要

[0-1ナップサック問題](/algorithms/knapsack-dp)は「各品物を丸ごと選ぶか選ばないか」の二択であり、貪欲法(価値の高い順や価値密度の高い順に選ぶ)では最適解が得られないことが知られている。ところが同じナップサック問題でも、品物を好きな割合だけ分割して詰めることが許される「分数ナップサック問題」になると事情が一変する——価値密度(価値÷重さ)が最も高い品物から順に、容量が許す限り詰め、容量が尽きたところで最後の品物だけを端数として詰めれば、それが常に最適解になることが証明できる。同じ「ナップサックに品物を詰める」という問題設定でありながら、「分割を許すかどうか」というたった1つの制約の違いが、貪欲法が通用するかどうかを分ける分水嶺になっている、貪欲法の適用条件を理解する上で非常に教育的な対比を提供してくれる問題である。

## 仕組み

1. 各品物について、価値密度`density[i] = value[i] / weight[i]`を計算する
2. 全品物を価値密度の降順にソートする
3. 価値密度の高い品物から順に、ナップサックの残り容量が許す限り丸ごと詰めていく
4. ある品物を丸ごと詰めるとナップサックの容量を超えてしまう場合、その品物だけを「残り容量分の割合」だけ詰めて打ち切る(例えば残り容量が品物の重さの60%なら、その品物の60%分の重さと価値を詰める)
5. ナップサックが満杯になるか全品物を処理し終えたら終了、詰めた品物の価値の合計が最大値になる

## 特性・トレードオフ

- **計算量**: 価値密度によるソートが`O(n log n)`で支配的、その後の詰め込み処理自体は`O(n)`なので全体で`O(n log n)`
- **貪欲法選択が正当化される理由(交換論法)**: もし最適解が価値密度の低い品物を先に(多く)含んでいたとすると、その分を価値密度のより高い未使用の品物と交換すれば、総重量を変えずに総価値を増やせてしまう——これは元の解が最適だったという仮定に矛盾するため、常に価値密度の高い順に詰めるのが最適だと証明できる(貪欲法の正当性を示す典型的な交換論法)
- **[0-1ナップサック問題](/algorithms/knapsack-dp)との対比が示す教訓**: 分割を許さない0-1版では、価値密度の高い品物を先に選ぶと後で容量が余っても中途半端な品物しか残らず全体最適を逃すケースがある(反例が構成できる)。分割を許すことで「端数調整」ができるようになり、この機会損失が消えるため貪欲法が正しくなる——「問題のどの制約が貪欲法の正当性を支えているか」を見極める重要性を教えてくれる
- **使いどころ**: 液体・穀物のような連続的に分割可能な資源の積み込み最適化、予算配分における投資対効果(ROI)順の資金配分、帯域幅や計算資源のような分割可能なリソースのスケジューリング

## 実装例

```python
def fractional_knapsack(values: list[float], weights: list[float], capacity: float) -> float:
    items = sorted(zip(values, weights), key=lambda vw: vw[0] / vw[1], reverse=True)
    total, remaining = 0.0, capacity
    for value, weight in items:
        if remaining <= 0:
            break
        take = min(weight, remaining)
        total += value * (take / weight)
        remaining -= take
    return total
```

```typescript
function fractionalKnapsack(values: number[], weights: number[], capacity: number): number {
  const items = values.map((v, i) => [v, weights[i]] as [number, number]);
  items.sort((p, q) => q[0] / q[1] - p[0] / p[1]);
  let total = 0;
  let remaining = capacity;
  for (const [value, weight] of items) {
    if (remaining <= 0) break;
    const take = Math.min(weight, remaining);
    total += value * (take / weight);
    remaining -= take;
  }
  return total;
}
```

```cpp
#include <algorithm>
#include <numeric>
#include <vector>

double fractionalKnapsack(const std::vector<double>& values, const std::vector<double>& weights, double capacity) {
    std::vector<int> order(values.size());
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int i, int j) {
        return values[i] / weights[i] > values[j] / weights[j];
    });
    double total = 0.0, remaining = capacity;
    for (int i : order) {
        if (remaining <= 0) break;
        double take = std::min(weights[i], remaining);
        total += values[i] * (take / weights[i]);
        remaining -= take;
    }
    return total;
}
```

```rust
fn fractional_knapsack(values: &[f64], weights: &[f64], capacity: f64) -> f64 {
    let mut order: Vec<usize> = (0..values.len()).collect();
    order.sort_by(|&i, &j| {
        (values[j] / weights[j])
            .partial_cmp(&(values[i] / weights[i]))
            .unwrap()
    });

    let mut total = 0.0;
    let mut remaining = capacity;
    for i in order {
        if remaining <= 0.0 {
            break;
        }
        let take = weights[i].min(remaining);
        total += values[i] * (take / weights[i]);
        remaining -= take;
    }
    total
}
```

```csharp
using System;
using System.Linq;

static double FractionalKnapsack(double[] values, double[] weights, double capacity)
{
    var items = values.Select((v, i) => (value: v, weight: weights[i]))
                       .OrderByDescending(it => it.value / it.weight)
                       .ToList();
    double total = 0, remaining = capacity;
    foreach (var (value, weight) in items)
    {
        if (remaining <= 0) break;
        double take = Math.Min(weight, remaining);
        total += value * (take / weight);
        remaining -= take;
    }
    return total;
}
```
