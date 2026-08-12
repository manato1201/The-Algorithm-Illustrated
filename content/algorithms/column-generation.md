---
name: 列生成法(Column Generation)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(反復回数 × (線形計画法1回 + 部分問題1回))
summary: 変数(列)の数が膨大な線形計画問題を、実際に必要になりそうな有望な列だけを部分問題から動的に生成しながら解くことで、全ての列を最初から列挙することなく厳密な最適解に到達する分割統治的な大規模最適化技法。
---

## 概要

線形計画問題の中には、変数(列)の数が組合せ的に爆発してしまうものがある——例えば「乗務員のシフトパターン全体」や「切断パターンの組み合わせ全体」を1つの変数として扱うと、実行可能なパターンの総数は指数的に増え、全ての列を最初から列挙して[シンプレックス法](/algorithms/simplex-method)に渡すことは現実的でなくなる。列生成法は、この問題を「**最初は少数の列(変数)だけで線形計画問題を解き、その双対情報を使って『追加する価値のある列』を部分問題として求め、見つかれば追加してまた解き直す**」という反復によって回避する。全ての列を列挙する代わりに**必要になる可能性が高い列だけを動的に生成する**という発想は、[切除平面法](/algorithms/cutting-plane-method)が「制約(行)」を動的に追加するのと双対的な関係にあり、ジョージ・ダンツィクらが1960年代に提案した。ビンパッキング・乗務員スケジューリング・切断在庫問題など、列挙不可能なほど巨大な組合せ構造を持つ問題に対する厳密解法の柱となっている。

## 仕組み

1. 全ての可能な列のうち、ごく一部だけを含む**制限マスター問題(RMP: Restricted Master Problem)**を用意する(初期解が存在することを保証する、自明だが非効率な列をいくつか含めておくことが多い)
2. RMPを[シンプレックス法](/algorithms/simplex-method)などの線形計画法で解き、最適解とともに各制約に対応する**双対価格**(その制約を1単位緩めたときに目的関数がどれだけ改善するかを表す値)を得る
3. 双対価格を使って、**部分問題(価格付け問題、pricing problem)** を解く——「今の双対価格のもとで、RMPに追加すればさらに目的関数を改善できる列が存在するか」を判定する問題であり、多くの場合、列全体を数え上げるのではなく、専用のアルゴリズム(最短路問題やナップサック問題など、元の問題構造に応じた効率的な解法)で解ける
4. 部分問題によって「改善に寄与する列(**被約費用が負になる列**)」が見つかれば、その列をRMPに追加し、2に戻って解き直す
5. 部分問題を解いても改善に寄与する列が1つも見つからなければ、現在のRMPの解が(暗黙に列挙された全ての列を含めた)元の線形計画問題全体の最適解であることが保証され、終了する
6. 整数解が必要な場合は、列生成を各ノードで実行しながら分枝を進める「**分枝価格法(Branch and Price)**」に拡張する

## 特性・トレードオフ

- **全列挙を回避しながら厳密解を保証する**: 列生成法の核心は、「実際にRMPへ追加されなかった列は、たとえ最初から候補に含めていたとしても最適解には一切影響しない」ことが双対理論から保証されている点にある。これにより、理論上は指数個存在する列を一切列挙することなく、線形計画問題としての厳密な最適解に到達できる
- **部分問題の設計が実用性を左右する**: 列生成法が実際に機能するかどうかは、価格付け問題(部分問題)を効率的に解けるかにかかっている。部分問題が元の問題と同程度に難しければ列生成のメリットは薄れるため、多くの応用では部分問題が最短路問題やナップサック問題のような多項式時間(あるいは擬多項式時間)で解ける構造を持つように問題を定式化する工夫が重要になる
- **[切除平面法](/algorithms/cutting-plane-method)との双対的な関係**: 切除平面法が「制約(行)を後から追加して実行可能領域を狭める」のに対し、列生成法は「変数(列)を後から追加して実行可能領域を広げる」という、線形計画法の双対性の観点で鏡写しの関係にある。両者を整数計画問題に組み合わせ、分枝限定法の各ノードで切除平面と列生成の両方を使う「分枝価格カット法」も研究されている
- **収束後の整数性の扱い**: 列生成法自体は線形緩和問題を解く技法であり、得られる解がそのまま整数解になるとは限らない。実務では前述の分枝価格法によって、列生成を分枝限定法の各ノードに埋め込み、整数計画問題としての厳密解を求めることが多い
- **使いどころ**: 航空会社・鉄道の乗務員スケジューリング、ビンパッキング問題・カッティングストック問題(材料の切断パターン最適化)、車両配送計画(VRP)の厳密解法、大規模なネットワークフロー問題における多品目輸送計画など、実行可能な「パターン」の総数が組合せ的に膨大になる大規模最適化問題

## 実装例

カッティングストック問題(与えられた長さの原反から、指定された長さの部品を指定本数切り出す際に、使用する原反の本数を最小化する問題)を題材に、簡略化した列生成法を実装する。部分問題(価格付け問題)は、双対価格のもとで最も価値の高い切断パターンを求めるナップサック問題として解く。

```python
from dataclasses import dataclass


@dataclass
class CuttingStockProblem:
    roll_length: float
    piece_lengths: list[float]
    demands: list[int]


def solve_lp_relaxation(problem: CuttingStockProblem, patterns: list[list[int]]) -> tuple[list[float], list[float]]:
    """制限マスター問題(RMP)を簡易的な等式制約LPとして解き、各パターンの使用量と双対価格を返す。
    実務ではシンプレックス法を使うが、ここでは説明のため単純な最小二乗的近似で代用する。"""
    n = len(problem.piece_lengths)
    usage = [0.0] * len(patterns)
    # 需要を満たす最小限の非負使用量を貪欲に割り当てる簡易版
    remaining = list(problem.demands)
    for i, pattern in enumerate(patterns):
        needed = max(
            (remaining[j] / pattern[j] for j in range(n) if pattern[j] > 0),
            default=0.0,
        )
        usage[i] = needed
        for j in range(n):
            remaining[j] -= usage[i] * pattern[j]
    # 双対価格は「各部品1本を追加で満たすことの限界コスト」の近似として1.0で初期化する
    duals = [1.0] * n
    return usage, duals


def pricing_problem(problem: CuttingStockProblem, duals: list[float]) -> list[int] | None:
    """双対価格のもとで最も価値の高い切断パターンをナップサック問題として求める(被約費用が負なら採用)。"""
    n = len(problem.piece_lengths)
    capacity = int(problem.roll_length)
    weights = [int(length) for length in problem.piece_lengths]

    # 0-1ナップサックではなく個数制限なしナップサック(各部品は原反が許す限り何個でも使える)
    dp = [0.0] * (capacity + 1)
    choice = [[0] * n for _ in range(capacity + 1)]
    for cap in range(1, capacity + 1):
        dp[cap] = dp[cap - 1]
        choice[cap] = list(choice[cap - 1])
        for j in range(n):
            if weights[j] <= cap:
                candidate = dp[cap - weights[j]] + duals[j]
                if candidate > dp[cap]:
                    dp[cap] = candidate
                    choice[cap] = list(choice[cap - weights[j]])
                    choice[cap][j] += 1

    best_value = dp[capacity]
    reduced_cost = 1.0 - best_value  # マスター問題の目的(原反1本のコスト)からパターンの価値を引く
    if reduced_cost < -1e-9:
        return choice[capacity]
    return None  # 改善に寄与する列が見つからなければ終了


def column_generation(problem: CuttingStockProblem, max_iterations: int = 50) -> list[list[int]]:
    n = len(problem.piece_lengths)
    # 初期パターン集合: 各部品だけを1本ずつ切り出す自明なパターンで開始する
    patterns = []
    for j in range(n):
        pattern = [0] * n
        pattern[j] = int(problem.roll_length // problem.piece_lengths[j])
        patterns.append(pattern)

    for _ in range(max_iterations):
        _, duals = solve_lp_relaxation(problem, patterns)
        new_pattern = pricing_problem(problem, duals)
        if new_pattern is None:
            break
        patterns.append(new_pattern)

    return patterns
```

```typescript
type CuttingStockProblem = {
  rollLength: number;
  pieceLengths: number[];
  demands: number[];
};

function solveLpRelaxation(
  problem: CuttingStockProblem,
  patterns: number[][],
): { usage: number[]; duals: number[] } {
  // 制限マスター問題(RMP)を簡易的に解き、各パターンの使用量と双対価格を返す(説明用の簡略版)
  const n = problem.pieceLengths.length;
  const usage = new Array(patterns.length).fill(0);
  const remaining = [...problem.demands];

  patterns.forEach((pattern, i) => {
    let needed = 0;
    for (let j = 0; j < n; j++) {
      if (pattern[j] > 0) needed = Math.max(needed, remaining[j] / pattern[j]);
    }
    usage[i] = needed;
    for (let j = 0; j < n; j++) remaining[j] -= usage[i] * pattern[j];
  });

  const duals = new Array(n).fill(1.0);
  return { usage, duals };
}

function pricingProblem(problem: CuttingStockProblem, duals: number[]): number[] | null {
  // 双対価格のもとで最も価値の高い切断パターンを個数制限なしナップサックとして求める
  const n = problem.pieceLengths.length;
  const capacity = Math.floor(problem.rollLength);
  const weights = problem.pieceLengths.map((l) => Math.floor(l));

  const dp = new Array(capacity + 1).fill(0);
  const choice: number[][] = Array.from({ length: capacity + 1 }, () => new Array(n).fill(0));

  for (let cap = 1; cap <= capacity; cap++) {
    dp[cap] = dp[cap - 1];
    choice[cap] = [...choice[cap - 1]];
    for (let j = 0; j < n; j++) {
      if (weights[j] <= cap) {
        const candidate = dp[cap - weights[j]] + duals[j];
        if (candidate > dp[cap]) {
          dp[cap] = candidate;
          choice[cap] = [...choice[cap - weights[j]]];
          choice[cap][j] += 1;
        }
      }
    }
  }

  const bestValue = dp[capacity];
  const reducedCost = 1.0 - bestValue; // 原反1本のコストからパターンの価値を引く
  return reducedCost < -1e-9 ? choice[capacity] : null;
}

function columnGeneration(problem: CuttingStockProblem, maxIterations = 50): number[][] {
  const n = problem.pieceLengths.length;
  // 初期パターン集合: 各部品だけを1本ずつ切り出す自明なパターンで開始する
  const patterns: number[][] = [];
  for (let j = 0; j < n; j++) {
    const pattern = new Array(n).fill(0);
    pattern[j] = Math.floor(problem.rollLength / problem.pieceLengths[j]);
    patterns.push(pattern);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const { duals } = solveLpRelaxation(problem, patterns);
    const newPattern = pricingProblem(problem, duals);
    if (newPattern === null) break;
    patterns.push(newPattern);
  }

  return patterns;
}
```
