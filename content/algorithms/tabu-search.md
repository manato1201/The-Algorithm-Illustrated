---
name: タブーサーチ
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(問題依存)
summary: 直近の移動履歴を禁止リストとして持つことで、山登り法が陥る同じ場所への逆戻りを防ぐ。
---

## 概要

山登り法は「悪化する移動を一切許さない」ために局所最適で立ち往生してしまう。タブーサーチは、局所最適から抜け出すために**あえて一時的に悪化する移動も許容する**が、その代わりに「**直近に訪れた状態・操作には、しばらくの間戻れない**」という禁止リスト(タブーリスト)を導入することで、同じ場所をぐるぐる回り続ける(サイクリング)ことを防ぐ。1986年にフレッド・グローバーが考案した。

## 仕組み

1. 現在の解の近傍を調べ、**タブーリストに載っていない**移動の中から最良のものを選ぶ(たとえそれが現在の解より悪化する移動であっても)
2. 選んだ移動を実行し、その移動(あるいはその逆操作)を一定期間、タブーリストに追加する
3. タブーリストは一定サイズを保つように、古いものから期限切れにしていく(先入れ先出しのキューのように管理されることが多い)
4. これを繰り返しながら探索を進め、これまでに見つけた中で最良の解を別途記録しておく(タブーによって一時的に悪化しても、過去の最良解は失われないようにする)

「悪化する移動を許すが、直前に来た道への逆戻りだけは禁じる」という、山登り法とは逆の発想の禁止ルールを加えることで、局所最適の"谷"を越えて別の(より良いかもしれない)領域へ移動する余地を作っている。

## 特性・トレードオフ

- **計算量**: 問題依存。タブーリストの管理コストは通常軽微
- **アスピレーション基準という例外規則**: タブーリストに載っている移動でも、その移動が「これまで見つけた最良解を上回る」ほど良い結果をもたらすなら、例外的に許可する、という規則(アスピレーション基準)を設けることが多く、これにより過度に探索の自由度を狭めることを防いでいる
- **焼きなまし法との違い**: 焼きなまし法が「確率的に」悪化を受け入れるのに対し、タブーサーチは「決定的に」(禁止されていない中で最良のものを選ぶという明確なルールで)悪化を受け入れる点が対照的。両者は局所探索法の改良という同じ目的を、異なるアプローチで達成している
- **使いどころ**: スケジューリング問題、巡回セールスマン問題、車両配送計画(VRP)、生産計画の最適化など、組み合わせ最適化問題全般で、焼きなまし法や遺伝的アルゴリズムと並ぶ有力な近似解法の選択肢として使われる

## 実装例

山登り法・焼きなまし法と同じ地形 `f(x) = -(x-3)^2 + 10` を対象に、整数の近傍(x±1)を動き、直近に訪れた解をタブーリストで一定期間禁止する例で実装する。

```python
def objective(x: int) -> float:
    return -((x - 3) ** 2) + 10


def tabu_search(
    start_x: int,
    neighborhood_range: int = 1,
    tabu_tenure: int = 5,
    max_iterations: int = 100,
) -> int:
    current_x = start_x
    best_x = current_x
    best_value = objective(best_x)
    tabu_list: list[int] = []

    for _ in range(max_iterations):
        neighbors = [
            current_x + delta
            for delta in range(-neighborhood_range, neighborhood_range + 1)
            if delta != 0
        ]
        candidates = [x for x in neighbors if x not in tabu_list]
        if not candidates:
            break
        next_x = max(candidates, key=objective)
        current_x = next_x
        tabu_list.append(next_x)
        if len(tabu_list) > tabu_tenure:
            tabu_list.pop(0)
        if objective(current_x) > best_value:
            best_x = current_x
            best_value = objective(current_x)

    return best_x
```

```typescript
function objective(x: number): number {
  return -((x - 3) ** 2) + 10;
}

function tabuSearch(
  startX: number,
  neighborhoodRange: number = 1,
  tabuTenure: number = 5,
  maxIterations: number = 100
): number {
  let currentX = startX;
  let bestX = currentX;
  let bestValue = objective(bestX);
  const tabuList: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const neighbors: number[] = [];
    for (let delta = -neighborhoodRange; delta <= neighborhoodRange; delta++) {
      if (delta !== 0) neighbors.push(currentX + delta);
    }
    const candidates = neighbors.filter((x) => !tabuList.includes(x));
    if (candidates.length === 0) break;
    let nextX = candidates[0];
    for (const c of candidates) {
      if (objective(c) > objective(nextX)) nextX = c;
    }
    currentX = nextX;
    tabuList.push(nextX);
    if (tabuList.length > tabuTenure) tabuList.shift();
    if (objective(currentX) > bestValue) {
      bestX = currentX;
      bestValue = objective(currentX);
    }
  }

  return bestX;
}
```

```cpp
#include <vector>
#include <algorithm>

double objective(int x) {
    return -((x - 3) * (x - 3)) + 10;
}

int tabuSearch(int startX, int neighborhoodRange = 1, int tabuTenure = 5, int maxIterations = 100) {
    int currentX = startX;
    int bestX = currentX;
    double bestValue = objective(bestX);
    std::vector<int> tabuList;

    for (int iter = 0; iter < maxIterations; iter++) {
        std::vector<int> candidates;
        for (int delta = -neighborhoodRange; delta <= neighborhoodRange; delta++) {
            if (delta == 0) continue;
            int candidate = currentX + delta;
            if (std::find(tabuList.begin(), tabuList.end(), candidate) == tabuList.end()) {
                candidates.push_back(candidate);
            }
        }
        if (candidates.empty()) break;

        int nextX = candidates[0];
        for (int c : candidates) {
            if (objective(c) > objective(nextX)) nextX = c;
        }

        currentX = nextX;
        tabuList.push_back(nextX);
        if (static_cast<int>(tabuList.size()) > tabuTenure) {
            tabuList.erase(tabuList.begin());
        }
        if (objective(currentX) > bestValue) {
            bestX = currentX;
            bestValue = objective(currentX);
        }
    }

    return bestX;
}
```

```rust
fn objective(x: i32) -> f64 {
    let diff = (x - 3) as f64;
    -(diff * diff) + 10.0
}

fn tabu_search(start_x: i32, neighborhood_range: i32, tabu_tenure: usize, max_iterations: u32) -> i32 {
    let mut current_x = start_x;
    let mut best_x = current_x;
    let mut best_value = objective(best_x);
    let mut tabu_list: Vec<i32> = Vec::new();

    for _ in 0..max_iterations {
        let candidates: Vec<i32> = (-neighborhood_range..=neighborhood_range)
            .filter(|&delta| delta != 0)
            .map(|delta| current_x + delta)
            .filter(|c| !tabu_list.contains(c))
            .collect();

        if candidates.is_empty() {
            break;
        }

        let next_x = candidates
            .iter()
            .copied()
            .max_by(|&a, &b| objective(a).partial_cmp(&objective(b)).unwrap())
            .unwrap();

        current_x = next_x;
        tabu_list.push(next_x);
        if tabu_list.len() > tabu_tenure {
            tabu_list.remove(0);
        }
        if objective(current_x) > best_value {
            best_x = current_x;
            best_value = objective(current_x);
        }
    }

    best_x
}
```

```csharp
static double Objective(int x)
{
    return -Math.Pow(x - 3, 2) + 10;
}

static int TabuSearch(int startX, int neighborhoodRange = 1, int tabuTenure = 5, int maxIterations = 100)
{
    int currentX = startX;
    int bestX = currentX;
    double bestValue = Objective(bestX);
    var tabuList = new List<int>();

    for (int iter = 0; iter < maxIterations; iter++)
    {
        var candidates = new List<int>();
        for (int delta = -neighborhoodRange; delta <= neighborhoodRange; delta++)
        {
            if (delta == 0) continue;
            int candidate = currentX + delta;
            if (!tabuList.Contains(candidate)) candidates.Add(candidate);
        }
        if (candidates.Count == 0) break;

        int nextX = candidates[0];
        foreach (var c in candidates)
        {
            if (Objective(c) > Objective(nextX)) nextX = c;
        }

        currentX = nextX;
        tabuList.Add(nextX);
        if (tabuList.Count > tabuTenure) tabuList.RemoveAt(0);
        if (Objective(currentX) > bestValue)
        {
            bestX = currentX;
            bestValue = Objective(currentX);
        }
    }

    return bestX;
}
```
