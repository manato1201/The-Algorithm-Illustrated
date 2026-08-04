---
name: シャープレイ値(Shapley Value)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(n!)(素朴な全順列計算)、O(2^n)(部分集合の総和による計算)
summary: 複数のプレイヤーが協力して得た利益を、各プレイヤーが「あらゆる参加順序」において平均的にどれだけの追加価値をもたらしたかに基づいて公平に配分する、協力ゲーム理論における唯一の公理的に正当化された分配ルール。
---

## 概要

[ナッシュ均衡](/algorithms/nash-equilibrium)がプレイヤー同士が競合する非協力ゲームの安定状態を扱うのに対し、複数のプレイヤーが協力して共同の利益(提携価値)を生み出す「協力ゲーム」では、全く異なる問題——「生み出した利益を、各プレイヤーにどう公平に配分するか」——が中心になる。1953年にロイド・シャープレイ(Shapley、後にノーベル経済学賞を受賞)が発表したシャープレイ値は、「各プレイヤーが提携に加わる順番をランダムに変えたとき、そのプレイヤーが加わることで提携全体の価値がどれだけ増えるか」を全ての可能な参加順序について平均する、という発想で分配額を決める。この配分ルールは、後述する4つの直感的な公平性の公理を同時に満たす「唯一の」分配方法であることが数学的に証明されており、公平性の理論的な黄金基準として経済学・機械学習の両方で使われている。

## 仕組み

1. `n`人のプレイヤーの集合`N`と、任意の部分集合(提携)`S⊆N`がどれだけの価値`v(S)`を生み出せるかを定める特性関数`v`が与えられているとする
2. プレイヤーが提携に参加する順序を1つ考える(`n`人なら`n!`通りの順序がある)。ある順序において、プレイヤー`i`の「限界貢献度」を、「`i`が参加する直前までの提携の価値」と「`i`が参加した後の提携の価値」の差として計算する
3. プレイヤー`i`のシャープレイ値は、全ての`n!`通りの参加順序における`i`の限界貢献度を平均した値として定義される——同じプレイヤーでも、参加する順番によって限界貢献度は変わりうるため、あらゆる順番を平等に扱って平均を取ることで「そのプレイヤー本来の貢献度」を抽出する
4. 実務上は`n!`通りの順列を全て列挙する代わりに、各部分集合`S`について「`i`を含む`S`の価値」と「`i`を除いた`S\{i}`の価値」の差に、その部分集合が実際に出現する確率(順列の中でその大きさの部分集合が現れる割合)を重みとして掛けて合計する、`O(2^n)`の等価な計算式を使うことが多い

## 特性・トレードオフ

- **計算量**: 定義通りの計算は`n!`通りの順列を数え上げる必要があり`O(n!)`、部分集合ベースの等価な公式を使っても`O(2^n)`——どちらもプレイヤー数`n`が大きくなると指数的に高コストになる。実務上は`n`が数十を超えるとモンテカルロ法による順列のランダムサンプリング近似が使われる
- **4つの公平性の公理を同時に満たす唯一の解**という理論的な強さ: (1)効率性(配分額の合計が提携全体の価値`v(N)`と一致する)、(2)対称性(同じ貢献をする2人には同じ配分をする)、(3)ヌルプレイヤー性(何も貢献しないプレイヤーへの配分は0)、(4)加法性(2つのゲームを合成した場合の配分は個別のゲームの配分の和に等しい)——この4条件を全て満たす分配方法はシャープレイ値ただ1つであることが証明されている
- **[ナッシュ均衡](/algorithms/nash-equilibrium)との対比**: [ナッシュ均衡](/algorithms/nash-equilibrium)は「互いに裏切る動機がない」という非協力ゲームの安定性を扱うのに対し、シャープレイ値は「協力して得た利益をどう公平に分けるか」という協力ゲームの分配問題を扱う——ゲーム理論の2つの異なる問題領域(競争の均衡 vs 協力の分配)を代表する対照的な概念になっている
- **機械学習における意外な応用(SHAP値)**: 「予測モデルの各特徴量が、予測結果にどれだけ貢献したか」を説明する機械学習の解釈可能性手法SHAP(SHapley Additive exPlanations)は、特徴量を「協力するプレイヤー」、モデルの予測値を「提携の価値」とみなすことで、シャープレイ値をそのまま機械学習モデルの説明に転用している
- **使いどころ**: 複数企業の共同事業における利益配分の公平な決定、コスト分担問題(複数の自治体で共有するインフラのコスト配分)、電力網における発電コストの配分、機械学習モデルの予測根拠説明(SHAP値)、投票力指数(議会における各政党の実質的な影響力の測定)

## 実装例

全順列を平均する定義通りの方法と、部分集合の重み付き和による等価な`O(2^n)`の方法の両方を示す。

```python
import itertools
import math


def shapley_values_by_permutation(players: list[int], v) -> dict[int, float]:
    totals = {p: 0.0 for p in players}
    perms = list(itertools.permutations(players))
    for perm in perms:
        coalition: frozenset = frozenset()
        prev_value = v(coalition)
        for p in perm:
            coalition = coalition | {p}
            value = v(coalition)
            totals[p] += value - prev_value  # pの限界貢献度
            prev_value = value
    return {p: totals[p] / len(perms) for p in players}


def shapley_values_by_subsets(players: list[int], v) -> dict[int, float]:
    n = len(players)
    result = {}
    for p in players:
        others = [q for q in players if q != p]
        total = 0.0
        for r in range(len(others) + 1):
            for subset in itertools.combinations(others, r):
                s = frozenset(subset)
                weight = math.factorial(len(s)) * math.factorial(n - len(s) - 1) / math.factorial(n)
                marginal = v(s | {p}) - v(s)
                total += weight * marginal
        result[p] = total
    return result
```

```typescript
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  arr.forEach((item, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([item, ...perm]);
  });
  return result;
}

function shapleyByPermutation(players: number[], v: (coalition: number[]) => number): Map<number, number> {
  const totals = new Map(players.map((p) => [p, 0]));
  const perms = permutations(players);
  for (const perm of perms) {
    let coalition: number[] = [];
    let prevValue = v(coalition);
    for (const p of perm) {
      coalition = [...coalition, p];
      const value = v(coalition);
      totals.set(p, totals.get(p)! + (value - prevValue));
      prevValue = value;
    }
  }
  const result = new Map<number, number>();
  for (const p of players) result.set(p, totals.get(p)! / perms.length);
  return result;
}

function combinations<T>(arr: T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (arr.length < r) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, r - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, r);
  return [...withFirst, ...withoutFirst];
}
function factorial(n: number): number { return n <= 1 ? 1 : n * factorial(n - 1); }

function shapleyBySubsets(players: number[], v: (coalition: number[]) => number): Map<number, number> {
  const n = players.length;
  const result = new Map<number, number>();
  for (const p of players) {
    const others = players.filter((q) => q !== p);
    let total = 0;
    for (let r = 0; r <= others.length; r++) {
      for (const subset of combinations(others, r)) {
        const weight = (factorial(subset.length) * factorial(n - subset.length - 1)) / factorial(n);
        const marginal = v([...subset, p]) - v(subset);
        total += weight * marginal;
      }
    }
    result.set(p, total);
  }
  return result;
}
```

```cpp
#include <vector>
#include <map>
#include <algorithm>
#include <numeric>
#include <functional>

double factorial(int n) {
    double result = 1;
    for (int i = 2; i <= n; i++) result *= i;
    return result;
}

double shapleyForPlayer(int player, const std::vector<int>& allPlayers,
                         const std::function<double(const std::vector<int>&)>& v) {
    std::vector<int> others;
    for (int q : allPlayers) if (q != player) others.push_back(q);
    int n = static_cast<int>(allPlayers.size());
    double total = 0;

    int m = static_cast<int>(others.size());
    for (int mask = 0; mask < (1 << m); mask++) {
        std::vector<int> subset;
        for (int i = 0; i < m; i++) if (mask & (1 << i)) subset.push_back(others[i]);
        double weight = factorial(static_cast<int>(subset.size())) * factorial(n - static_cast<int>(subset.size()) - 1) / factorial(n);
        auto withPlayer = subset;
        withPlayer.push_back(player);
        double marginal = v(withPlayer) - v(subset);
        total += weight * marginal;
    }
    return total;
}

std::map<int, double> shapleyValuesBySubsets(const std::vector<int>& players,
                                              const std::function<double(const std::vector<int>&)>& v) {
    std::map<int, double> result;
    for (int p : players) result[p] = shapleyForPlayer(p, players, v);
    return result;
}
```

```rust
use std::collections::HashMap;

fn factorial(n: u64) -> f64 {
    (1..=n).map(|x| x as f64).product::<f64>().max(1.0)
}

fn shapley_for_player(player: i32, all_players: &[i32], v: &dyn Fn(&[i32]) -> f64) -> f64 {
    let others: Vec<i32> = all_players.iter().copied().filter(|&q| q != player).collect();
    let n = all_players.len() as u64;
    let m = others.len();
    let mut total = 0.0;

    for mask in 0..(1u32 << m) {
        let subset: Vec<i32> = (0..m).filter(|i| mask & (1 << i) != 0).map(|i| others[i]).collect();
        let weight = factorial(subset.len() as u64) * factorial(n - subset.len() as u64 - 1) / factorial(n);
        let mut with_player = subset.clone();
        with_player.push(player);
        let marginal = v(&with_player) - v(&subset);
        total += weight * marginal;
    }
    total
}

fn shapley_values_by_subsets(players: &[i32], v: &dyn Fn(&[i32]) -> f64) -> HashMap<i32, f64> {
    players.iter().map(|&p| (p, shapley_for_player(p, players, v))).collect()
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class Shapley
{
    static long Factorial(int n) => n <= 1 ? 1 : n * Factorial(n - 1);

    static IEnumerable<List<int>> Combinations(List<int> arr, int r)
    {
        if (r == 0) { yield return new List<int>(); yield break; }
        if (arr.Count < r) yield break;
        var first = arr[0];
        var rest = arr.Skip(1).ToList();
        foreach (var c in Combinations(rest, r - 1)) { var l = new List<int> { first }; l.AddRange(c); yield return l; }
        foreach (var c in Combinations(rest, r)) yield return c;
    }

    public static Dictionary<int, double> ValuesBySubsets(List<int> players, Func<List<int>, double> v)
    {
        int n = players.Count;
        var result = new Dictionary<int, double>();
        foreach (var p in players)
        {
            var others = players.Where(q => q != p).ToList();
            double total = 0;
            for (int r = 0; r <= others.Count; r++)
            {
                foreach (var subset in Combinations(others, r))
                {
                    double weight = (double)(Factorial(subset.Count) * Factorial(n - subset.Count - 1)) / Factorial(n);
                    var withPlayer = new List<int>(subset) { p };
                    double marginal = v(withPlayer) - v(subset);
                    total += weight * marginal;
                }
            }
            result[p] = total;
        }
        return result;
    }
}
```
