---
name: 山登り法(Hill Climbing)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(問題依存)
summary: 近傍の中で改善する方向にだけ移動し続ける、最も単純な局所探索法。局所最適に陥りやすい。
---

## 概要

霧の中で山頂を目指すとき、「今いる場所より一歩でも高くなる方向に、ひたすら進み続ける」という、最も直感的で単純な最適化戦略。局所探索法(Local Search)の最も基本的な形であり、焼きなまし法・タブーサーチなど、より洗練された近似解法の多くは、この山登り法の弱点を克服するための工夫として発展してきた。

## 仕組み

1. 適当な初期解から出発する
2. 現在の解の「近傍」(少しだけ変化させた解の集合)を調べる
3. 近傍の中に、現在の解より良いものがあれば、その中で最も良いもの(あるいは最初に見つけた改善案)に移動する
4. 近傍の中に、現在より良い解が1つもなければ、そこで探索を終了する

「悪くなる方向には絶対に進まない」という一貫した方針だけで動くため、実装は非常にシンプルだが、これが最大の弱点にもなる。

## 特性・トレードオフ

- **計算量**: 問題依存。1回の近傍探索のコストと、改善が止まるまでの反復回数で決まる
- **局所最適への陥りやすさ**: 「今いる場所の近くではこれ以上良くならない」だけで探索を止めてしまうため、**真に最適な解(大域最適)ではなく、途中の小さな丘(局所最適)で満足してしまう**ことが最大の弱点。霧の中で最初に見つけた小さな丘を「山頂」だと勘違いして止まってしまうイメージ
- **改良版との関係**: 焼きなまし法は「悪化する移動も確率的に受け入れる」ことで、タブーサーチは「直近の移動を禁止する」ことで、それぞれこの局所最適の罠を回避する工夫を加えている。山登り法はこれら発展形の出発点であり、比較の基準線としての価値も大きい
- **使いどころ**: 単純な問題やごく短時間での近似解が必要な場面、あるいはより洗練されたアルゴリズムの「仕上げ」段階(焼きなまし法などで大まかな良い解の近くまで来たら、最後は山登り法で細部を詰める、という組み合わせ)。単体で複雑な最適化問題に使うことは少ない

## 実装例

地形(目的関数)として `f(x) = -(x-3)^2 + 10`(x=3で最大値10をとる単純な二次関数)を最大化する例で実装する。

```python
def objective(x: float) -> float:
    return -((x - 3) ** 2) + 10


def hill_climbing(start_x: float, step_size: float = 0.1, max_iterations: int = 1000) -> float:
    current_x = start_x
    current_value = objective(current_x)
    for _ in range(max_iterations):
        neighbors = [current_x - step_size, current_x + step_size]
        best_neighbor = max(neighbors, key=objective)
        best_value = objective(best_neighbor)
        if best_value <= current_value:
            break
        current_x = best_neighbor
        current_value = best_value
    return current_x
```

```typescript
function objective(x: number): number {
  return -((x - 3) ** 2) + 10;
}

function hillClimbing(startX: number, stepSize: number = 0.1, maxIterations: number = 1000): number {
  let currentX = startX;
  let currentValue = objective(currentX);
  for (let i = 0; i < maxIterations; i++) {
    const neighbors = [currentX - stepSize, currentX + stepSize];
    const bestNeighbor = neighbors.reduce((best, n) => (objective(n) > objective(best) ? n : best));
    const bestValue = objective(bestNeighbor);
    if (bestValue <= currentValue) break;
    currentX = bestNeighbor;
    currentValue = bestValue;
  }
  return currentX;
}
```

```cpp
double objective(double x) {
    return -((x - 3) * (x - 3)) + 10;
}

double hillClimbing(double startX, double stepSize = 0.1, int maxIterations = 1000) {
    double currentX = startX;
    double currentValue = objective(currentX);
    for (int i = 0; i < maxIterations; i++) {
        double left = currentX - stepSize;
        double right = currentX + stepSize;
        double bestNeighbor = (objective(left) > objective(right)) ? left : right;
        double bestValue = objective(bestNeighbor);
        if (bestValue <= currentValue) break;
        currentX = bestNeighbor;
        currentValue = bestValue;
    }
    return currentX;
}
```

```rust
fn objective(x: f64) -> f64 {
    -((x - 3.0).powi(2)) + 10.0
}

fn hill_climbing(start_x: f64, step_size: f64, max_iterations: u32) -> f64 {
    let mut current_x = start_x;
    let mut current_value = objective(current_x);
    for _ in 0..max_iterations {
        let left = current_x - step_size;
        let right = current_x + step_size;
        let best_neighbor = if objective(left) > objective(right) { left } else { right };
        let best_value = objective(best_neighbor);
        if best_value <= current_value {
            break;
        }
        current_x = best_neighbor;
        current_value = best_value;
    }
    current_x
}
```

```csharp
static double Objective(double x)
{
    return -Math.Pow(x - 3, 2) + 10;
}

static double HillClimbing(double startX, double stepSize = 0.1, int maxIterations = 1000)
{
    double currentX = startX;
    double currentValue = Objective(currentX);
    for (int i = 0; i < maxIterations; i++)
    {
        double left = currentX - stepSize;
        double right = currentX + stepSize;
        double bestNeighbor = Objective(left) > Objective(right) ? left : right;
        double bestValue = Objective(bestNeighbor);
        if (bestValue <= currentValue) break;
        currentX = bestNeighbor;
        currentValue = bestValue;
    }
    return currentX;
}
```
