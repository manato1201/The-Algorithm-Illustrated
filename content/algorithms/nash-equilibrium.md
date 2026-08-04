---
name: ナッシュ均衡の計算
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(問題依存、一般には計算困難)
summary: 誰も一人だけ戦略を変えても得をしない「均衡点」を求める、非協力ゲーム理論の中心的な解概念とその計算法。
---

## 概要

[ミニマックス法](/algorithms/minimax)は「片方が得すれば片方が損する」二人零和ゲームを扱うが、現実の多くの状況(価格競争、交渉、進化的な生存競争など)は零和ではなく、双方の利害が複雑に絡み合う。ジョン・ナッシュが1950年に定式化したナッシュ均衡は、こうした一般のゲームに対する解の概念で、「全プレイヤーの戦略の組み合わせのうち、どのプレイヤも自分だけ戦略を変えても得をしない状態」を指す。全員が今の戦略に留まる合理的な理由がある、という意味で「安定」した状態であり、有限のゲームには必ず(混合戦略を許せば)少なくとも1つ存在することがナッシュ自身によって証明されている(この功績で1994年にノーベル経済学賞を受賞)。

## 仕組み

1. 各プレイヤーの取りうる戦略の集合と、戦略の組み合わせごとの利得(ペイオフ)を利得行列として定義する
2. ある戦略の組み合わせが均衡かどうかは、「各プレイヤーについて、他のプレイヤーの戦略を固定したとき、自分だけ戦略を変えて利得を改善できないか」を確認することで判定できる(**最適反応**の相互チェック)
3. 純粋戦略(確率を持たず1つの手だけを選ぶ)でこの条件を満たす組み合わせがあれば、それが**純粋戦略ナッシュ均衡**
4. 純粋戦略の均衡が存在しない場合(じゃんけんのように)、各プレイヤーが手を確率的に選ぶ**混合戦略**まで考えることで、均衡が必ず存在する(ナッシュの定理)。2人ゲームの混合戦略均衡は線形計画法や[シンプレックス法](/algorithms/simplex-method)に近い数理最適化の手法で計算できる
5. 実務上は「利得表を全て書き下し、最適反応の組み合わせを探す」ことで小規模なゲームの均衡を求めるのが基本的なアプローチになる

## 特性・トレードオフ

- **計算量**: 一般のゲームでのナッシュ均衡の計算は、プレイヤー数・戦略数が増えると計算量的に非常に困難になることが知られている(2人ゲームでもPPAD完全という計算複雑性クラスに属する)。実用上は特殊な構造(零和、対称ゲーム等)を仮定して計算量を落とすことが多い
- **均衡が最適とは限らない**: ナッシュ均衡は「誰も単独では得をしない」ことを保証するが、「全員がもっと得をする別の組み合わせ」が存在しても均衡になりうる(囚人のジレンマが典型例)。個々の合理性が全体の効率を保証しないという、ゲーム理論の重要な教訓を示す
- **複数均衡の可能性**: 1つのゲームに複数のナッシュ均衡が存在することがあり、「どの均衡が実際に選ばれるか」はゲーム理論だけでは決まらないことも多い(調整ゲーム等)
- **使いどころ**: 経済学の市場競争分析、オークション設計、マルチエージェントAIでの意思決定、対戦ゲームのバランス調整(誰かが一方的に得をする「支配戦略」がないかの検証)など

## 実装例

2人ゲームの利得行列から、純粋戦略ナッシュ均衡を「各セルが両プレイヤーにとって最適反応になっているか」を全探索して求める。囚人のジレンマでは唯一の均衡(相互裏切り)、調整ゲームでは複数均衡が見つかることを確認する。

```python
def find_pure_nash_equilibria(
    payoff_a: list[list[float]], payoff_b: list[list[float]]
) -> list[tuple[int, int]]:
    n_rows = len(payoff_a)
    n_cols = len(payoff_a[0])
    equilibria = []
    for i in range(n_rows):
        for j in range(n_cols):
            # 行プレイヤーは列jを固定したとき行iが最適反応か
            row_best = all(payoff_a[i][j] >= payoff_a[k][j] for k in range(n_rows))
            # 列プレイヤーは行iを固定したとき列jが最適反応か
            col_best = all(payoff_b[i][j] >= payoff_b[i][k] for k in range(n_cols))
            if row_best and col_best:
                equilibria.append((i, j))
    return equilibria


# 囚人のジレンマ: 0=協調, 1=裏切り。唯一の均衡は(裏切り, 裏切り)
payoff_a = [[-1, -3], [0, -2]]
payoff_b = [[-1, 0], [-3, -2]]
print(find_pure_nash_equilibria(payoff_a, payoff_b))  # [(1, 1)]
```

```typescript
function findPureNashEquilibria(payoffA: number[][], payoffB: number[][]): [number, number][] {
  const nRows = payoffA.length;
  const nCols = payoffA[0].length;
  const equilibria: [number, number][] = [];
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      // 行プレイヤーは列jを固定したとき行iが最適反応か
      const rowBest = Array.from({ length: nRows }, (_, k) => k).every((k) => payoffA[i][j] >= payoffA[k][j]);
      // 列プレイヤーは行iを固定したとき列jが最適反応か
      const colBest = Array.from({ length: nCols }, (_, k) => k).every((k) => payoffB[i][j] >= payoffB[i][k]);
      if (rowBest && colBest) equilibria.push([i, j]);
    }
  }
  return equilibria;
}

// 囚人のジレンマ: 0=協調, 1=裏切り。唯一の均衡は(裏切り, 裏切り)
const payoffA = [[-1, -3], [0, -2]];
const payoffB = [[-1, 0], [-3, -2]];
console.log(findPureNashEquilibria(payoffA, payoffB)); // [[1, 1]]
```

```cpp
#include <vector>
#include <utility>

std::vector<std::pair<int, int>> findPureNashEquilibria(
    const std::vector<std::vector<int>>& payoffA,
    const std::vector<std::vector<int>>& payoffB) {
    int nRows = static_cast<int>(payoffA.size());
    int nCols = static_cast<int>(payoffA[0].size());
    std::vector<std::pair<int, int>> equilibria;

    for (int i = 0; i < nRows; i++) {
        for (int j = 0; j < nCols; j++) {
            bool rowBest = true;
            for (int k = 0; k < nRows; k++) {
                if (payoffA[i][j] < payoffA[k][j]) { rowBest = false; break; }
            }
            bool colBest = true;
            for (int k = 0; k < nCols; k++) {
                if (payoffB[i][j] < payoffB[i][k]) { colBest = false; break; }
            }
            if (rowBest && colBest) equilibria.emplace_back(i, j);
        }
    }
    return equilibria;
}
```

```rust
fn find_pure_nash_equilibria(payoff_a: &[Vec<i32>], payoff_b: &[Vec<i32>]) -> Vec<(usize, usize)> {
    let n_rows = payoff_a.len();
    let n_cols = payoff_a[0].len();
    let mut equilibria = Vec::new();

    for i in 0..n_rows {
        for j in 0..n_cols {
            let row_best = (0..n_rows).all(|k| payoff_a[i][j] >= payoff_a[k][j]);
            let col_best = (0..n_cols).all(|k| payoff_b[i][j] >= payoff_b[i][k]);
            if row_best && col_best {
                equilibria.push((i, j));
            }
        }
    }
    equilibria
}
```

```csharp
static List<(int, int)> FindPureNashEquilibria(int[,] payoffA, int[,] payoffB)
{
    int nRows = payoffA.GetLength(0);
    int nCols = payoffA.GetLength(1);
    var equilibria = new List<(int, int)>();

    for (int i = 0; i < nRows; i++)
    {
        for (int j = 0; j < nCols; j++)
        {
            bool rowBest = true;
            for (int k = 0; k < nRows; k++)
                if (payoffA[i, j] < payoffA[k, j]) { rowBest = false; break; }

            bool colBest = true;
            for (int k = 0; k < nCols; k++)
                if (payoffB[i, j] < payoffB[i, k]) { colBest = false; break; }

            if (rowBest && colBest) equilibria.Add((i, j));
        }
    }
    return equilibria;
}
```
