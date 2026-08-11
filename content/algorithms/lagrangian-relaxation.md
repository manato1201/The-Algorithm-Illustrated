---
name: ラグランジュ緩和法(Lagrangian Relaxation)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(反復回数 × 緩和問題1回分のコスト)
summary: 解きにくい制約をペナルティ項として目的関数に移し、ペナルティの強さ(ラグランジュ乗数)を勾配法で調整しながら反復することで、扱いやすい部分問題の繰り返しから元の最適値の強い下界(または上界)を得る。
---

## 概要

組合せ最適化問題の中には、「制約さえなければ簡単に解けるのに、特定の1つ、あるいは少数の制約が問題を難しくしている」という構造を持つものが多い(例えばナップサック問題に似た容量制約が、それ以外は単純なネットワーク問題に組み合わさっている場合など)。ラグランジュ緩和法は、こうした**「厄介な制約」をペナルティ項として目的関数に移し、制約自体を取り除いてしまう**という発想に立つ。制約`g(x) ≤ 0`を目的関数に`+ λ・g(x)`という形で組み込み(`λ`はラグランジュ乗数、ペナルティの強さを表す)、この緩和した問題(元の制約なしで解ける、扱いやすい問題)を解くことで、元の問題の最適値に対する**強い下界(最小化問題の場合)**が得られる。この乗数`λ`を反復的に調整しながら緩和問題を解き続けることで、下界をどんどんタイトにしていき、最終的に[分枝限定法](/algorithms/branch-and-bound)のような厳密解法の枝刈りを強力にする道具として使われる。

## 仕組み

1. 元の最適化問題`min f(x) subject to g(x) ≤ 0, x ∈ X`(`X`は扱いやすい制約の集合、`g(x) ≤ 0`が厄介な制約)を考える
2. 厄介な制約`g(x) ≤ 0`を目的関数に組み込んだ**ラグランジュ緩和問題**`L(λ) = min_{x ∈ X} f(x) + λ・g(x)`(`λ ≥ 0`)を定義する。この緩和問題は`X`という扱いやすい制約だけを持つため、元の問題より簡単に解ける
3. 任意の`λ ≥ 0`について、`L(λ)`の最適値は元の問題の最適値の**下界**になることが理論的に保証される(弱双対性)。つまりどんな`λ`を選んでも、緩和問題を解くだけで元の問題の答えがどれだけ良くなり得るかの目安が得られる
4. **ラグランジュ双対問題**`max_{λ≥0} L(λ)`を解くことで、得られる下界を可能な限りタイトにする最良の`λ`を探す。この最大化は、劣勾配法(サブグラディエント法)という反復的な更新則で行われることが多い:`λ ← max(0, λ + step・g(x*))`(`x*`は現在の`λ`での緩和問題の最適解)
5. `λ`の更新と緩和問題の再求解を、下界の改善が収束するまで(またはステップサイズが十分小さくなるまで)繰り返す

## 特性・トレードオフ

- **[分枝限定法](/algorithms/branch-and-bound)の枝刈り精度を高める強力な下界**: 線形計画緩和(整数制約だけを外す単純な緩和)よりも、問題構造に応じてラグランジュ緩和で得られる下界の方がタイトになることが多く、[分枝限定法](/algorithms/branch-and-bound)や[切除平面法](/algorithms/cutting-plane-method)と組み合わせることで、探索空間を大きく削減できる
- **緩和問題が「解きやすい」ことが前提**: ラグランジュ緩和法の威力は、「厄介な制約さえ外せば、残りの制約`X`のもとでの最適化は簡単に解ける」という問題の構造に強く依存する。緩和後も問題が難しいままであれば、この手法の利点は薄れる
- **双対ギャップという理論的な限界**: ラグランジュ双対問題の最適値は、必ずしも元の問題(主問題)の最適値と厳密に一致するとは限らない(双対ギャップが生じることがある、特に整数計画問題では)。この場合、ラグランジュ緩和だけでは厳密解には到達できず、得られた強い下界を使って[分枝限定法](/algorithms/branch-and-bound)による探索を補助する、という使い方が実務上一般的である
- **使いどころ**: 大規模な整数計画問題(施設配置問題、一般化割当問題)の下界計算、ネットワークフロー問題における容量制約の緩和、スケジューリング問題における資源制約の緩和、機械学習におけるSVM(サポートベクターマシン)の双対問題の定式化(ラグランジュ双対性の応用例として)

## 実装例

容量制約付きの割当問題を例に、劣勾配法によるラグランジュ乗数の更新を示す。

```python
def lagrangian_relaxation_step(
    costs: list[list[float]], capacities: list[float], lambdas: list[float], demand_per_item: list[float],
) -> tuple[list[int], list[float], float]:
    n_facilities = len(costs)
    n_items = len(costs[0])

    # 緩和問題: 容量制約を除き、各アイテムを最も「実質コスト(元コスト+ペナルティ)」が低い施設へ割り当てる
    assignment = []
    for item in range(n_items):
        adjusted_costs = [costs[f][item] + lambdas[f] * demand_per_item[item] for f in range(n_facilities)]
        best_facility = min(range(n_facilities), key=lambda f: adjusted_costs[f])
        assignment.append(best_facility)

    lower_bound = sum(costs[assignment[i]][i] for i in range(n_items)) + sum(
        lambdas[f] * (sum(demand_per_item[i] for i in range(n_items) if assignment[i] == f) - capacities[f])
        for f in range(n_facilities)
    )

    # 劣勾配法によるlambdaの更新(容量超過している施設はペナルティを強める)
    step_size = 0.1
    new_lambdas = []
    for f in range(n_facilities):
        usage = sum(demand_per_item[i] for i in range(n_items) if assignment[i] == f)
        violation = usage - capacities[f]
        new_lambdas.append(max(0.0, lambdas[f] + step_size * violation))

    return assignment, new_lambdas, lower_bound
```

```typescript
function lagrangianRelaxationStep(
  costs: number[][],
  capacities: number[],
  lambdas: number[],
  demandPerItem: number[],
): { assignment: number[]; newLambdas: number[]; lowerBound: number } {
  const nFacilities = costs.length;
  const nItems = costs[0].length;

  const assignment: number[] = [];
  for (let item = 0; item < nItems; item++) {
    const adjustedCosts = costs.map(
      (row, f) => row[item] + lambdas[f] * demandPerItem[item],
    );
    let best = 0;
    for (let f = 1; f < nFacilities; f++)
      if (adjustedCosts[f] < adjustedCosts[best]) best = f;
    assignment.push(best);
  }

  let lowerBound = assignment.reduce((sum, f, i) => sum + costs[f][i], 0);
  for (let f = 0; f < nFacilities; f++) {
    const usage = assignment.reduce(
      (s, af, i) => (af === f ? s + demandPerItem[i] : s),
      0,
    );
    lowerBound += lambdas[f] * (usage - capacities[f]);
  }

  const stepSize = 0.1;
  const newLambdas = lambdas.map((lam, f) => {
    const usage = assignment.reduce(
      (s, af, i) => (af === f ? s + demandPerItem[i] : s),
      0,
    );
    const violation = usage - capacities[f];
    return Math.max(0, lam + stepSize * violation);
  });

  return { assignment, newLambdas, lowerBound };
}
```

```cpp
#include <vector>
#include <algorithm>

struct LagrangianResult {
    std::vector<int> assignment;
    std::vector<double> newLambdas;
    double lowerBound;
};

LagrangianResult lagrangianRelaxationStep(
    const std::vector<std::vector<double>>& costs, const std::vector<double>& capacities,
    const std::vector<double>& lambdas, const std::vector<double>& demandPerItem) {
    int nFacilities = static_cast<int>(costs.size());
    int nItems = static_cast<int>(costs[0].size());

    std::vector<int> assignment(nItems);
    for (int item = 0; item < nItems; item++) {
        int best = 0;
        double bestCost = costs[0][item] + lambdas[0] * demandPerItem[item];
        for (int f = 1; f < nFacilities; f++) {
            double c = costs[f][item] + lambdas[f] * demandPerItem[item];
            if (c < bestCost) { bestCost = c; best = f; }
        }
        assignment[item] = best;
    }

    double lowerBound = 0.0;
    for (int i = 0; i < nItems; i++) lowerBound += costs[assignment[i]][i];
    std::vector<double> newLambdas(nFacilities);
    double stepSize = 0.1;
    for (int f = 0; f < nFacilities; f++) {
        double usage = 0.0;
        for (int i = 0; i < nItems; i++) if (assignment[i] == f) usage += demandPerItem[i];
        lowerBound += lambdas[f] * (usage - capacities[f]);
        double violation = usage - capacities[f];
        newLambdas[f] = std::max(0.0, lambdas[f] + stepSize * violation);
    }

    return {assignment, newLambdas, lowerBound};
}
```

```rust
fn lagrangian_relaxation_step(
    costs: &[Vec<f64>], capacities: &[f64], lambdas: &[f64], demand_per_item: &[f64],
) -> (Vec<usize>, Vec<f64>, f64) {
    let n_facilities = costs.len();
    let n_items = costs[0].len();

    let mut assignment = vec![0usize; n_items];
    for item in 0..n_items {
        let mut best = 0;
        let mut best_cost = costs[0][item] + lambdas[0] * demand_per_item[item];
        for f in 1..n_facilities {
            let c = costs[f][item] + lambdas[f] * demand_per_item[item];
            if c < best_cost {
                best_cost = c;
                best = f;
            }
        }
        assignment[item] = best;
    }

    let mut lower_bound: f64 = (0..n_items).map(|i| costs[assignment[i]][i]).sum();
    let step_size = 0.1;
    let mut new_lambdas = vec![0.0; n_facilities];
    for f in 0..n_facilities {
        let usage: f64 = (0..n_items).filter(|&i| assignment[i] == f).map(|i| demand_per_item[i]).sum();
        lower_bound += lambdas[f] * (usage - capacities[f]);
        let violation = usage - capacities[f];
        new_lambdas[f] = (lambdas[f] + step_size * violation).max(0.0);
    }

    (assignment, new_lambdas, lower_bound)
}
```

```csharp
static (int[] assignment, double[] newLambdas, double lowerBound) LagrangianRelaxationStep(
    double[][] costs, double[] capacities, double[] lambdas, double[] demandPerItem)
{
    int nFacilities = costs.Length, nItems = costs[0].Length;

    var assignment = new int[nItems];
    for (int item = 0; item < nItems; item++)
    {
        int best = 0;
        double bestCost = costs[0][item] + lambdas[0] * demandPerItem[item];
        for (int f = 1; f < nFacilities; f++)
        {
            double c = costs[f][item] + lambdas[f] * demandPerItem[item];
            if (c < bestCost) { bestCost = c; best = f; }
        }
        assignment[item] = best;
    }

    double lowerBound = 0;
    for (int i = 0; i < nItems; i++) lowerBound += costs[assignment[i]][i];

    double stepSize = 0.1;
    var newLambdas = new double[nFacilities];
    for (int f = 0; f < nFacilities; f++)
    {
        double usage = Enumerable.Range(0, nItems).Where(i => assignment[i] == f).Sum(i => demandPerItem[i]);
        lowerBound += lambdas[f] * (usage - capacities[f]);
        double violation = usage - capacities[f];
        newLambdas[f] = Math.Max(0, lambdas[f] + stepSize * violation);
    }

    return (assignment, newLambdas, lowerBound);
}
```
