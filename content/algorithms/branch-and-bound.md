---
name: 分枝限定法
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(問題依存、最悪指数)
summary: 解空間を分割しながら、限界値で見込みのない枝を刈り取ることで全探索を高速化する。
---

## 概要

組み合わせ最適化問題を、力任せに全ての可能性を試す(全探索)のではなく、**「この先どう頑張っても今の最良解を超えられない」と判明した時点で、その先の探索を丸ごと打ち切る**ことで、実用的な速度で**厳密な最適解**を求める手法。近似解ではなく、正確な最適解にこだわりたい場合の代表的な戦略で、ナップサック問題や巡回セールスマン問題など、多くのNP困難な問題に応用されている。

## 仕組み

解の候補を、木構造(分枝)として整理しながら探索する。

1. 問題全体を1つの根ノードとし、ある基準(例えば「ある品物を入れるか入れないか」)で問題をいくつかの小さな部分問題(枝)に分割する(**分枝**)
2. 各部分問題について、「この枝の中で理論上どこまで良くなりうるか」という**楽観的な上限(または下限)を見積もる**(限界値の計算)
3. その限界値が、既に見つかっている最良の解より**悪ければ**、その枝の中にそれ以上良い解は絶対に存在しないと確定できるため、**その枝全体を探索せずに切り捨てる**(**限定**、または「枝刈り」)
4. 切り捨てられなかった枝だけを、さらに再帰的に分枝・限定していく
5. 全ての枝が探索されるか切り捨てられるまで続けると、残った中の最良解が、全体の厳密な最適解になる

「見込みのない可能性を、実際に調べ尽くさなくても理論値だけで切り捨てられる」という枝刈りの発想が、全探索の組み合わせ爆発を実用的な範囲まで抑え込む鍵になる。

## 特性・トレードオフ

- **計算量**: 最悪ケースでは全探索と同じ指数時間になりうるが、**限界値の見積もりが的確であればあるほど**、実際に調べる枝の数を劇的に減らせる。限界値の質がアルゴリズム全体の実用性を左右する
- **厳密解を保証する**: 焼きなまし法や遺伝的アルゴリズムのような近似解法と異なり、十分な時間をかければ確実に最適解にたどり着くことが保証される
- **動的計画法との使い分け**: 部分問題に重複があり、それを表に記録して再利用できる構造ならDPが有利。分枝限定法は、そのような重複構造がない、あるいは状態数が膨大すぎてDPの表を持てない問題に向く
- **使いどころ**: 0-1ナップサック問題の厳密解、巡回セールスマン問題の厳密解(小〜中規模)、整数計画問題(ILP)のソルバーの内部アルゴリズム、スケジューリング問題における最適解の探索など

## 実装例

```python
from dataclasses import dataclass


@dataclass
class Item:
    weight: float
    value: float


def bound(items: list[Item], capacity: float, index: int, current_weight: float, current_value: float) -> float:
    """index番目以降を、価値密度順(降順ソート済み前提)に詰め込めるだけ詰めた場合の楽観的な上限値"""
    remaining = capacity - current_weight
    result = current_value
    i = index
    while i < len(items) and items[i].weight <= remaining:
        remaining -= items[i].weight
        result += items[i].value
        i += 1
    if i < len(items) and remaining > 0:
        result += items[i].value * (remaining / items[i].weight)  # 端数は分数として見積もる
    return result


def knapsack_branch_and_bound(items: list[Item], capacity: float) -> float:
    # 価値密度(value/weight)の降順にソートしておくと上限の見積もりが正確になる
    sorted_items = sorted(items, key=lambda it: it.value / it.weight, reverse=True)
    best_value = 0.0

    def dfs(index: int, current_weight: float, current_value: float) -> None:
        nonlocal best_value
        if current_weight > capacity:
            return
        best_value = max(best_value, current_value)
        if index >= len(sorted_items):
            return
        # 限定: この枝の上限が現在の最良解を超えられないなら探索を打ち切る
        if bound(sorted_items, capacity, index, current_weight, current_value) <= best_value:
            return
        item = sorted_items[index]
        dfs(index + 1, current_weight + item.weight, current_value + item.value)  # 分枝: 入れる
        dfs(index + 1, current_weight, current_value)  # 分枝: 入れない

    dfs(0, 0.0, 0.0)
    return best_value
```

```typescript
type Item = { weight: number; value: number };

// index番目以降を、価値密度順(降順ソート済み前提)に詰め込めるだけ詰めた場合の楽観的な上限値
function bound(items: Item[], capacity: number, index: number, currentWeight: number, currentValue: number): number {
  let remaining = capacity - currentWeight;
  let result = currentValue;
  let i = index;
  while (i < items.length && items[i].weight <= remaining) {
    remaining -= items[i].weight;
    result += items[i].value;
    i++;
  }
  if (i < items.length && remaining > 0) {
    result += items[i].value * (remaining / items[i].weight); // 端数は分数として見積もる
  }
  return result;
}

function knapsackBranchAndBound(items: Item[], capacity: number): number {
  // 価値密度(value/weight)の降順にソートしておくと上限の見積もりが正確になる
  const sortedItems = [...items].sort((a, b) => b.value / b.weight - a.value / a.weight);
  let bestValue = 0;

  function dfs(index: number, currentWeight: number, currentValue: number): void {
    if (currentWeight > capacity) return;
    bestValue = Math.max(bestValue, currentValue);
    if (index >= sortedItems.length) return;
    // 限定: この枝の上限が現在の最良解を超えられないなら探索を打ち切る
    if (bound(sortedItems, capacity, index, currentWeight, currentValue) <= bestValue) return;

    const item = sortedItems[index];
    dfs(index + 1, currentWeight + item.weight, currentValue + item.value); // 分枝: 入れる
    dfs(index + 1, currentWeight, currentValue); // 分枝: 入れない
  }

  dfs(0, 0, 0);
  return bestValue;
}
```

```cpp
#include <vector>
#include <algorithm>

struct Item { double weight; double value; };

// index番目以降を、価値密度順(降順ソート済み前提)に詰め込めるだけ詰めた場合の楽観的な上限値
double bound(const std::vector<Item>& items, double capacity, size_t index, double currentWeight, double currentValue) {
    double remaining = capacity - currentWeight;
    double result = currentValue;
    size_t i = index;
    while (i < items.size() && items[i].weight <= remaining) {
        remaining -= items[i].weight;
        result += items[i].value;
        i++;
    }
    if (i < items.size() && remaining > 0) {
        result += items[i].value * (remaining / items[i].weight);
    }
    return result;
}

double knapsackBranchAndBound(std::vector<Item> items, double capacity) {
    std::sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        return a.value / a.weight > b.value / b.weight;
    });

    double bestValue = 0.0;

    std::function<void(size_t, double, double)> dfs = [&](size_t index, double currentWeight, double currentValue) {
        if (currentWeight > capacity) return;
        bestValue = std::max(bestValue, currentValue);
        if (index >= items.size()) return;
        if (bound(items, capacity, index, currentWeight, currentValue) <= bestValue) return;

        const Item& item = items[index];
        dfs(index + 1, currentWeight + item.weight, currentValue + item.value); // 入れる
        dfs(index + 1, currentWeight, currentValue); // 入れない
    };

    dfs(0, 0.0, 0.0);
    return bestValue;
}
```

```rust
struct Item {
    weight: f64,
    value: f64,
}

// index番目以降を、価値密度順(降順ソート済み前提)に詰め込めるだけ詰めた場合の楽観的な上限値
fn bound(items: &[Item], capacity: f64, index: usize, current_weight: f64, current_value: f64) -> f64 {
    let mut remaining = capacity - current_weight;
    let mut result = current_value;
    let mut i = index;
    while i < items.len() && items[i].weight <= remaining {
        remaining -= items[i].weight;
        result += items[i].value;
        i += 1;
    }
    if i < items.len() && remaining > 0.0 {
        result += items[i].value * (remaining / items[i].weight);
    }
    result
}

fn knapsack_branch_and_bound(items: Vec<Item>, capacity: f64) -> f64 {
    let mut sorted_items = items;
    sorted_items.sort_by(|a, b| (b.value / b.weight).partial_cmp(&(a.value / a.weight)).unwrap());

    let mut best_value = 0.0_f64;

    fn dfs(items: &[Item], capacity: f64, index: usize, current_weight: f64, current_value: f64, best_value: &mut f64) {
        if current_weight > capacity {
            return;
        }
        *best_value = best_value.max(current_value);
        if index >= items.len() {
            return;
        }
        if bound(items, capacity, index, current_weight, current_value) <= *best_value {
            return;
        }

        let item = &items[index];
        dfs(items, capacity, index + 1, current_weight + item.weight, current_value + item.value, best_value); // 入れる
        dfs(items, capacity, index + 1, current_weight, current_value, best_value); // 入れない
    }

    dfs(&sorted_items, capacity, 0, 0.0, 0.0, &mut best_value);
    best_value
}
```

```csharp
record Item(double Weight, double Value);

static class Knapsack
{
    // index番目以降を、価値密度順(降順ソート済み前提)に詰め込めるだけ詰めた場合の楽観的な上限値
    static double Bound(List<Item> items, double capacity, int index, double currentWeight, double currentValue)
    {
        double remaining = capacity - currentWeight;
        double result = currentValue;
        int i = index;
        while (i < items.Count && items[i].Weight <= remaining)
        {
            remaining -= items[i].Weight;
            result += items[i].Value;
            i++;
        }
        if (i < items.Count && remaining > 0)
        {
            result += items[i].Value * (remaining / items[i].Weight);
        }
        return result;
    }

    public static double Solve(List<Item> items, double capacity)
    {
        var sorted = items.OrderByDescending(it => it.Value / it.Weight).ToList();
        double bestValue = 0;

        void Dfs(int index, double currentWeight, double currentValue)
        {
            if (currentWeight > capacity) return;
            bestValue = Math.Max(bestValue, currentValue);
            if (index >= sorted.Count) return;
            if (Bound(sorted, capacity, index, currentWeight, currentValue) <= bestValue) return;

            var item = sorted[index];
            Dfs(index + 1, currentWeight + item.Weight, currentValue + item.Value); // 入れる
            Dfs(index + 1, currentWeight, currentValue); // 入れない
        }

        Dfs(0, 0, 0);
        return bestValue;
    }
}
```
