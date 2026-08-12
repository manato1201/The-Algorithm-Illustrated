---
name: 分枝カット法(Branch and Cut)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(問題依存、最悪指数)
summary: 分枝限定法の探索木の各ノードで有効不等式(カット)を追加してLP緩和を締め上げてから分枝することで探索木を大幅に小さくする、[分枝限定法](/algorithms/branch-and-bound)と[切除平面法](/algorithms/cutting-plane-method)を組み合わせた商用ソルバーの標準的な厳密解法。
---

## 概要

整数計画問題の2つの代表的な厳密解法——[分枝限定法](/algorithms/branch-and-bound)と[切除平面法](/algorithms/cutting-plane-method)——は、それぞれ単独では実務上の弱点を抱えている。分枝限定法は変数を分岐させて場合分けするが、線形緩和の上限(下限)が緩いと探索木が指数的に爆発しやすい。切除平面法はカット(有効不等式)を追加してLP緩和を整数解の凸包に近づけるが、単独では収束が遅く実用速度に欠けることが多い。分枝カット法は、この2つを**組み合わせる**ことで互いの弱点を補う——探索木の**各ノード**で、そのノードのLP緩和を解いた後、分枝する前にまず**カットを追加してLP緩和自体を締め上げ**、それでも整数解が得られなければそこで初めて分枝する。カットによってLP緩和が整数解の凸包に近づくほど上下限の見積もりが正確になり、分枝限定法だけでは避けられない無駄な枝を大幅に刈り取れる。現代の商用整数計画ソルバー(CPLEX、Gurobiなど)は、いずれもこの分枝カット法を中核アルゴリズムとして実装している。

## 仕組み

1. 探索木の根ノードとして、整数制約を無視した元の問題の**線形緩和問題**を[シンプレックス法](/algorithms/simplex-method)などの線形計画法で解く
2. 得られたLP最適解が整数条件を満たしていれば、そのノードでの最良解として記録して終了する
3. 満たしていなければ、その分数解を切り落とす**有効不等式(カット)**を([切除平面法](/algorithms/cutting-plane-method)と同じ要領で)導出し、現在のノードの制約に追加してLP緩和を解き直す。これを、新たなカットが見つからなくなるか、一定回数に達するまで繰り返す(**カットループ**)
4. カットを追加してもなお整数解が得られない場合、[分枝限定法](/algorithms/branch-and-bound)と同様に、分数値を取る変数を1つ選んで問題を2つ(あるいはそれ以上)の部分問題に**分枝**する(例えば`x ≤ ⌊v⌋`と`x ≥ ⌈v⌉`の2つ)
5. 生成された各子ノードについて、そのノードのLP緩和の目的関数値(限界値)が、既に見つかっている最良の整数解を超えられないと判明した時点でその枝を**限定**(枝刈り)する
6. 限定されなかった子ノードそれぞれについて、1〜5を再帰的に繰り返す。各ノードで有効なカット(そのノード固有の局所カットや、木全体で共有できるグローバルカット)を追加できる点が、単純な分枝限定法との違いである
7. 全ての枝が限定されるか探索し尽くされた時点で、記録されている最良の整数解が厳密な最適解として確定する

## 特性・トレードオフ

- **[分枝限定法](/algorithms/branch-and-bound)と[切除平面法](/algorithms/cutting-plane-method)の正しい組み合わせ方**: 切除平面法単体は収束が遅く、分枝限定法単体は緩い上下限のせいで探索木が爆発しやすいという、互いの弱点を補い合う設計になっている。「木構造の分岐による場合分け」と「不等式制約による実行可能領域の締め上げ」という異なる原理を同じ探索プロセスに統合している点が本質である
- **LP緩和が締まるほど枝刈りが効く**: カットによってLP緩和の最適値が真の整数最適値に近づくほど、各ノードでの限界値(bound)の見積もりが正確になり、分枝限定法の枝刈り(限定)が効きやすくなる。カットの追加は「分枝せずに済む可能性を高める投資」と捉えられる
- **カットの種類と追加のタイミングが実務上の要**: ゴモリー切除平面のような汎用カットに加え、問題の構造に応じたカバー不等式・クリーク不等式・フローカバー不等式のような強いカットを組み合わせることが実用上重要になる。また、カットを追加しすぎるとLP緩和自体のサイズが膨らみ解く時間が増えるため、「どのカットを、どのノードで、何本まで追加するか」の管理(カットマネジメント)がソルバー設計の腕の見せ所になる
- **[分枝限定法](/algorithms/branch-and-bound)単体との使い分け**: 問題によっては強力なカットが存在せず(あるいは導出コストが高く)、単純な分枝限定法の方が有利な場合もある。多くの商用ソルバーはヒューリスティックや発見的な変数選択規則(擬コスト分枝など)とカット生成を状況に応じて動的に切り替えている
- **使いどころ**: 商用整数計画ソルバー(CPLEX、Gurobi、SCIPなど)の中核アルゴリズム、乗務員・車両スケジューリングの厳密解、施設配置問題・ネットワーク設計問題の最適化、[列生成法](/algorithms/column-generation)と組み合わせた分枝価格カット法による超大規模な整数計画問題

## 実装例

0-1ナップサック問題を題材に、分枝限定法の各ノードでカバー不等式(簡易版のカット)を追加してからLP緩和的な上限を計算する、簡略化した分枝カット法を示す。

```python
from dataclasses import dataclass


@dataclass
class Item:
    weight: float
    value: float


def lp_bound(items: list[Item], capacity: float, fixed_in: set[int], fixed_out: set[int]) -> float:
    """固定済みの変数を考慮したうえで、価値密度順に詰め込む分数緩和の上限値を計算する。"""
    remaining = capacity - sum(items[i].weight for i in fixed_in)
    if remaining < 0:
        return -1  # 容量超過なので実行不可能
    result = sum(items[i].value for i in fixed_in)
    free_indices = sorted(
        (i for i in range(len(items)) if i not in fixed_in and i not in fixed_out),
        key=lambda i: items[i].value / items[i].weight,
        reverse=True,
    )
    for i in free_indices:
        if items[i].weight <= remaining:
            remaining -= items[i].weight
            result += items[i].value
        else:
            result += items[i].value * (remaining / items[i].weight)
            break
    return result


def find_cover_cut(items: list[Item], capacity: float, fixed_in: set[int]) -> set[int] | None:
    """容量を超える最小限のアイテム集合(カバー)を見つける。これが「同時には全部選べない」というカットになる。"""
    total_weight = sum(items[i].weight for i in fixed_in)
    if total_weight > capacity:
        return set(fixed_in)  # 既に固定された選択自体が容量超過(=カバー)になっている
    return None


def branch_and_cut_knapsack(items: list[Item], capacity: float) -> float:
    best_value = 0.0
    n = len(items)

    def dfs(fixed_in: set[int], fixed_out: set[int]) -> None:
        nonlocal best_value

        # カットループ: 容量を超えるカバーが見つかれば、それ以上そのノードを掘る意味はない
        cover = find_cover_cut(items, capacity, fixed_in)
        if cover is not None:
            return

        bound = lp_bound(items, capacity, fixed_in, fixed_out)
        if bound <= best_value:
            return  # 限定: この枝はこれ以上良くなり得ない

        remaining_free = [i for i in range(n) if i not in fixed_in and i not in fixed_out]
        if not remaining_free:
            weight = sum(items[i].weight for i in fixed_in)
            if weight <= capacity:
                best_value = max(best_value, sum(items[i].value for i in fixed_in))
            return

        branch_var = remaining_free[0]
        dfs(fixed_in | {branch_var}, fixed_out)  # 分枝: 入れる
        dfs(fixed_in, fixed_out | {branch_var})  # 分枝: 入れない

    dfs(set(), set())
    return best_value
```

```typescript
type Item = { weight: number; value: number };

function lpBound(
  items: Item[],
  capacity: number,
  fixedIn: Set<number>,
  fixedOut: Set<number>,
): number {
  // 固定済みの変数を考慮したうえで、価値密度順に詰め込む分数緩和の上限値を計算する
  let remaining = capacity - [...fixedIn].reduce((s, i) => s + items[i].weight, 0);
  if (remaining < 0) return -1; // 容量超過なので実行不可能

  let result = [...fixedIn].reduce((s, i) => s + items[i].value, 0);
  const freeIndices = items
    .map((_, i) => i)
    .filter((i) => !fixedIn.has(i) && !fixedOut.has(i))
    .sort((a, b) => items[b].value / items[b].weight - items[a].value / items[a].weight);

  for (const i of freeIndices) {
    if (items[i].weight <= remaining) {
      remaining -= items[i].weight;
      result += items[i].value;
    } else {
      result += items[i].value * (remaining / items[i].weight);
      break;
    }
  }
  return result;
}

function findCoverCut(items: Item[], capacity: number, fixedIn: Set<number>): Set<number> | null {
  // 容量を超える最小限のアイテム集合(カバー)を見つける。これが「同時には全部選べない」というカットになる
  const totalWeight = [...fixedIn].reduce((s, i) => s + items[i].weight, 0);
  return totalWeight > capacity ? new Set(fixedIn) : null;
}

function branchAndCutKnapsack(items: Item[], capacity: number): number {
  let bestValue = 0;
  const n = items.length;

  function dfs(fixedIn: Set<number>, fixedOut: Set<number>): void {
    // カットループ: 容量を超えるカバーが見つかれば、それ以上そのノードを掘る意味はない
    const cover = findCoverCut(items, capacity, fixedIn);
    if (cover !== null) return;

    const bound = lpBound(items, capacity, fixedIn, fixedOut);
    if (bound <= bestValue) return; // 限定: この枝はこれ以上良くなり得ない

    const remainingFree = items.map((_, i) => i).filter((i) => !fixedIn.has(i) && !fixedOut.has(i));
    if (remainingFree.length === 0) {
      const weight = [...fixedIn].reduce((s, i) => s + items[i].weight, 0);
      if (weight <= capacity) {
        const value = [...fixedIn].reduce((s, i) => s + items[i].value, 0);
        bestValue = Math.max(bestValue, value);
      }
      return;
    }

    const branchVar = remainingFree[0];
    dfs(new Set([...fixedIn, branchVar]), fixedOut); // 分枝: 入れる
    dfs(fixedIn, new Set([...fixedOut, branchVar])); // 分枝: 入れない
  }

  dfs(new Set(), new Set());
  return bestValue;
}
```
