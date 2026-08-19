---
name: Bendersの分解法(Benders Decomposition)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(反復ごとにマスター問題+部分問題を解くコスト、反復回数は問題依存)
summary: 決定変数を「複雑な変数」と「残りの変数」に分割し、部分問題から得たカットをマスター問題に追加しながら反復して大規模混合整数計画を厳密に解く分解手法。
---

## 概要

大規模な混合整数計画問題では、変数の一部(例えば「どの拠点を開設するか」といった0-1変数)を固定してしまえば、残りの変数(例えば「開設済みの拠点からどう輸送するか」)についての問題は単なる線形計画問題に簡略化できる、という構造を持つケースが多い。Bendersの分解法は1962年にジャック・F・ベンダースが提案した手法で、この構造を利用して問題を2つに分割する——複雑な変数(整数変数を含むことが多い)だけを扱う**マスター問題**と、それ以外の変数(通常は連続変数)を扱う**部分問題**である。部分問題を解くたびに、その結果から「マスター問題の候補解がなぜ良くない(あるいは実行不可能な)のか」を表す不等式(**カット**)を導出し、マスター問題に追加していく。この反復を繰り返すことでマスター問題が徐々に真の問題に近づき、最終的に厳密な最適解に収束する。サプライチェーン設計・電力系統計画・確率計画問題(2段階確率計画)など、「まず大枠を決め、その後で詳細を最適化する」という階層構造を持つ大規模最適化問題で広く使われている。

## 仕組み

1. 元の問題の決定変数を、複雑な変数`y`(マスター問題側、多くは整数変数)と、残りの変数`x`(部分問題側、通常は連続変数)に分割する
2. **マスター問題**を解く: `y`についての(まだ情報が不完全な)緩和問題を解き、候補解`y*`を得る。初回は最も緩い(制約の少ない)マスター問題から始める
3. **部分問題**を解く: `y = y*`に固定した上で、残りの変数`x`についての問題(通常は線形計画問題なので双対も容易に扱える)を解く
4. 部分問題の結果に応じて2種類のカットのどちらかをマスター問題に追加する:
   - 部分問題が**実行可能**だった場合、その目的関数値を使って「`y*`のときの真のコストはこれ以上である」という**最適性カット**を追加する
   - 部分問題が**実行不可能**だった場合、部分問題の双対問題(または実行不可能性を証明する双対射線)を使って「`y`はこの条件を満たさなければならない」という**実行可能性カット**を追加し、同じ実行不可能な`y*`が二度と選ばれないようにする
5. 更新されたマスター問題を再度解いて新しい`y*`を得て、2〜4を繰り返す
6. マスター問題の最適値(下界)と、これまで見つかった実行可能解のうち最良のもの(上界)の差が一定の許容誤差以下になったら停止する。理論的には、この反復は有限回で厳密最適解に収束することが保証されている

「マスター問題を大まかに解いては、部分問題からのフィードバック(カット)で少しずつ制約を追加して正確にしていく」という**遅延制約生成**の一種であり、[列生成法](/algorithms/column-generation)が変数を後から追加していくのとちょうど双対的な関係にある。

## 特性・トレードオフ

- **問題構造の分解による恩恵**: `y`を固定すると`x`についての問題が扱いやすくなる(線形計画問題に分解できる、あるいは各シナリオごとに独立に解けるなど)という構造を持つ問題でこそ威力を発揮する。特に2段階確率計画問題では、シナリオごとに独立した部分問題を並列に解けるため、大規模な意思決定問題に強い
- **マスター問題は反復ごとに大きくなる**: カットを追加するたびにマスター問題の制約が増えていくため、反復回数が多い問題では退化(同じようなカットを繰り返し生成する)が起きやすく、収束を早めるための工夫(複数カットの同時追加、安定化項の導入など)が実務上重要になる
- **[分枝限定法](/algorithms/branch-and-bound)・[分枝カット法](/algorithms/branch-and-cut)との関係**: マスター問題自体が整数計画問題であるため、内部では分枝限定法や分枝カット法で解かれることが多い。Bendersの分解法はこれらの厳密解法の「上位」で問題自体を分割する枠組みであり、組み合わせて使われる
- **[ラグランジュ緩和法](/algorithms/lagrangian-relaxation)との違い**: ラグランジュ緩和法が制約を目的関数にペナルティとして組み込んで緩和するのに対し、Bendersの分解法は変数を分割して段階的に問題を解く。どちらも大規模問題を扱いやすい部分問題に分解するが、分解の軸(制約か変数か)が異なる
- **使いどころ**: サプライチェーン・拠点配置計画(拠点開設の是非を`y`、輸送量を`x`とする)、電力系統の発電計画(発電機の起動停止を`y`、発電量を`x`とする)、2段階確率計画問題(第1段階の意思決定を`y`、シナリオごとの対応を`x`とする)など、階層的な意思決定構造を持つ大規模混合整数計画問題

## 実装例

以下は、拠点開設の可否`y`(0-1変数)と、各拠点から各顧客への輸送量`x`を決める簡易的な施設配置問題を題材にした実装。マスター問題は候補の`y`を列挙する簡略版とし、部分問題は各`y`に対する最小輸送コストの割当を貪欲に計算する(実務では線形計画法や輸送問題専用解法で部分問題を解き、双対値からカットを導出する)。

```python
from dataclasses import dataclass
from itertools import product
import math


@dataclass
class Facility:
    fixed_cost: float
    capacity: float


def subproblem_cost(open_facilities: list[bool], facilities: list[Facility], demands: list[float], transport_cost: list[list[float]]) -> float:
    """y(施設の開設可否)を固定したときの、輸送問題(部分問題)を貪欲法で近似的に解く。"""
    remaining_capacity = [f.capacity if open_facilities[i] else 0.0 for i, f in enumerate(facilities)]
    total_transport = 0.0
    for c, demand in enumerate(demands):
        need = demand
        # コストの低い施設から順に割り当てる
        order = sorted(range(len(facilities)), key=lambda i: transport_cost[i][c])
        for i in order:
            if need <= 0:
                break
            if remaining_capacity[i] <= 0:
                continue
            take = min(need, remaining_capacity[i])
            total_transport += take * transport_cost[i][c]
            remaining_capacity[i] -= take
            need -= take
        if need > 1e-9:
            return math.inf  # 実行不可能(容量不足) -> 実行可能性カットに相当
    return total_transport


def benders_decomposition(
    facilities: list[Facility], demands: list[float], transport_cost: list[list[float]]
) -> tuple[list[bool], float]:
    """マスター問題(開設パターンの候補生成)と部分問題(輸送コスト計算)を反復する簡略版。"""
    n = len(facilities)
    best_pattern: list[bool] = [False] * n
    best_cost = math.inf

    # マスター問題: 本来は反復のたびにカットを追加して絞り込むが、
    # ここでは概念を示すため全開設パターンを候補として部分問題で評価する
    for pattern in product([False, True], repeat=n):
        pattern = list(pattern)
        if not any(pattern):
            continue
        fixed = sum(f.fixed_cost for f, open_ in zip(facilities, pattern) if open_)
        transport = subproblem_cost(pattern, facilities, demands, transport_cost)
        total = fixed + transport
        if total < best_cost:
            best_cost = total
            best_pattern = pattern

    return best_pattern, best_cost
```

```typescript
type Facility = { fixedCost: number; capacity: number };

function subproblemCost(
  openFacilities: boolean[],
  facilities: Facility[],
  demands: number[],
  transportCost: number[][],
): number {
  // y(施設の開設可否)を固定したときの、輸送問題(部分問題)を貪欲法で近似的に解く
  const remainingCapacity = facilities.map((f, i) => (openFacilities[i] ? f.capacity : 0));
  let totalTransport = 0;

  for (let c = 0; c < demands.length; c++) {
    let need = demands[c];
    const order = facilities
      .map((_, i) => i)
      .sort((a, b) => transportCost[a][c] - transportCost[b][c]);

    for (const i of order) {
      if (need <= 0) break;
      if (remainingCapacity[i] <= 0) continue;
      const take = Math.min(need, remainingCapacity[i]);
      totalTransport += take * transportCost[i][c];
      remainingCapacity[i] -= take;
      need -= take;
    }
    if (need > 1e-9) return Infinity; // 実行不可能(容量不足) -> 実行可能性カットに相当
  }
  return totalTransport;
}

function bendersDecomposition(
  facilities: Facility[],
  demands: number[],
  transportCost: number[][],
): [boolean[], number] {
  const n = facilities.length;
  let bestPattern: boolean[] = new Array(n).fill(false);
  let bestCost = Infinity;

  // マスター問題: 本来は反復のたびにカットを追加して絞り込むが、
  // ここでは概念を示すため全開設パターンを候補として部分問題で評価する
  for (let mask = 1; mask < 1 << n; mask++) {
    const pattern = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1);
    const fixed = facilities.reduce((s, f, i) => s + (pattern[i] ? f.fixedCost : 0), 0);
    const transport = subproblemCost(pattern, facilities, demands, transportCost);
    const total = fixed + transport;
    if (total < bestCost) {
      bestCost = total;
      bestPattern = pattern;
    }
  }

  return [bestPattern, bestCost];
}
```
