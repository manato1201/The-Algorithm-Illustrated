---
name: セルオートマトン群衆モデル
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(n)(1ステップあたり、nはエージェント数)
summary: 空間を離散的なセルのグリッドに区切り、各歩行者が1ステップごとに隣接セルへ確率的に移動するというセルオートマトンのルールだけで、群衆の流れや渋滞を再現する離散モデル。
---

## 概要

[ソーシャルフォースモデル](/algorithms/social-force-model)が連続的な力の合成によって歩行者の動きを滑らかにシミュレーションするのに対し、セルオートマトン群衆モデルは空間そのものを**離散的なセルのグリッド**に区切り、各歩行者を「1つのセルを占有する存在」として扱う、より単純で計算コストの低いアプローチを取る。各歩行者は1ステップ(離散時間)ごとに、あらかじめ定義された確率的なルール(目的地方向のセルへの遷移確率、他の歩行者がいるセルには移動できない、といった規則)に従って隣接セルへ移動するかどうかを決める。単純な規則の繰り返しから、実際の群衆で見られる渋滞・レーン形成・出口でのボトルネックといった現象が創発する点は[セルオートマトン](/algorithms/conways-game-of-life)([ライフゲーム](/algorithms/conways-game-of-life)など)と共通する魅力であり、大規模な群衆を低コストでシミュレーションしたい場合に選ばれる。

## 仕組み

1. シミュレーション空間を正方形または六角形のセルのグリッドとして離散化する。各セルは「空」か「1人の歩行者が占有」かのいずれかの状態を持つ(1セルに複数人は入れない、という排他制約が群衆の密集による渋滞を自然に表現する)
2. 各歩行者について、目的地への「望ましい移動方向」を、フロアフィールド(目的地までの距離に基づく[フローフィールド](/algorithms/flow-field-pathfinding)に似た誘導場)から求める
3. 各ステップで、各歩行者は現在のセルから隣接する空きセルへ移動する**遷移確率**を計算する。確率は「目的地方向に近いセルほど高い」「既に他の歩行者に占有されているセルには移動できない(確率0)」というルールで決まる
4. 複数の歩行者が同じ空きセルへ同時に移動しようとする場合(コンフリクト)は、ランダムに1人を選んで移動させる、またはその場に留まらせるといった衝突解決ルールを適用する
5. 全歩行者について3〜4を1ステップ分同時に(または疑似同時に)適用し、これを時間発展させて繰り返す

## 特性・トレードオフ

- **計算コストの低さとスケーラビリティ**: セルの占有状態という単純な離散表現のため、[ソーシャルフォースモデル](/algorithms/social-force-model)のような力の連続計算に比べて1ステップあたりの計算が軽く、非常に大規模な群衆(数千〜数万人規模)のシミュレーションにも適用しやすい
- **離散化による表現力の限界**: セルのサイズより細かい位置の違いや、斜め方向の滑らかな動きは表現できず、グリッドの解像度が粗いと不自然なカクついた動きになる。解像度を上げれば表現力は増すが、その分計算コストも上がるというトレードオフがある
- **創発現象の再現**: 単純な「空きセルへの移動確率」というルールだけから、出入口での詰まり、対向流のレーン形成といった、[ソーシャルフォースモデル](/algorithms/social-force-model)と同様の現象が創発的に現れることが知られており、モデルとしての妥当性の根拠になっている
- **使いどころ**: 大規模な避難シミュレーション(スタジアム・駅の避難計画)、群衆の統計的な流動解析、ゲームにおける大量NPCの低コストな移動シミュレーション、都市計画における歩行者流動のマクロなモデリング

## 実装例

```python
import random

def transition_probabilities(
    pos: tuple[int, int], goal_distance: list[list[float]], occupied: set[tuple[int, int]],
) -> dict[tuple[int, int], float]:
    y, x = pos
    candidates = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if not (dy == 0 and dx == 0)]
    probs = {}
    total = 0.0
    for ny, nx in candidates:
        if 0 <= ny < len(goal_distance) and 0 <= nx < len(goal_distance[0]) and (ny, nx) not in occupied:
            # 目的地までの距離が短くなるセルほど高い重みを与える
            weight = max(0.0, goal_distance[y][x] - goal_distance[ny][nx] + 1.0)
            probs[(ny, nx)] = weight
            total += weight
    if total == 0:
        return {}
    return {k: v / total for k, v in probs.items()}

def step_crowd(
    positions: list[tuple[int, int]], goal_distance: list[list[float]],
) -> list[tuple[int, int]]:
    occupied = set(positions)
    proposals: dict[tuple[int, int], list[int]] = {}

    for i, pos in enumerate(positions):
        probs = transition_probabilities(pos, goal_distance, occupied - {pos})
        if not probs:
            proposals.setdefault(pos, []).append(i)
            continue
        cells, weights = list(probs.keys()), list(probs.values())
        chosen = random.choices(cells, weights=weights, k=1)[0]
        proposals.setdefault(chosen, []).append(i)

    new_positions = list(positions)
    for cell, agents in proposals.items():
        winner = random.choice(agents)  # 複数希望者がいれば1人だけ移動できる
        new_positions[winner] = cell
    return new_positions
```

```typescript
type Cell = [number, number];

function transitionProbabilities(
  pos: Cell,
  goalDistance: number[][],
  occupied: Set<string>,
): Map<string, number> {
  const [y, x] = pos;
  const candidates: Cell[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dy === 0 && dx === 0) continue;
      candidates.push([y + dy, x + dx]);
    }
  }
  const probs = new Map<string, number>();
  let total = 0;
  for (const [ny, nx] of candidates) {
    const key = `${ny},${nx}`;
    if (
      ny >= 0 &&
      ny < goalDistance.length &&
      nx >= 0 &&
      nx < goalDistance[0].length &&
      !occupied.has(key)
    ) {
      const weight = Math.max(
        0,
        goalDistance[y][x] - goalDistance[ny][nx] + 1.0,
      );
      probs.set(key, weight);
      total += weight;
    }
  }
  if (total === 0) return new Map();
  for (const [k, v] of probs) probs.set(k, v / total);
  return probs;
}
```

```cpp
#include <vector>
#include <set>
#include <map>
#include <utility>
#include <algorithm>

std::map<std::pair<int, int>, double> transitionProbabilities(
    std::pair<int, int> pos, const std::vector<std::vector<double>>& goalDistance,
    const std::set<std::pair<int, int>>& occupied) {
    auto [y, x] = pos;
    std::vector<std::pair<int, int>> candidates;
    for (int dy = -1; dy <= 1; dy++)
        for (int dx = -1; dx <= 1; dx++)
            if (!(dy == 0 && dx == 0)) candidates.push_back({y + dy, x + dx});

    std::map<std::pair<int, int>, double> probs;
    double total = 0.0;
    for (auto& [ny, nx] : candidates) {
        if (ny >= 0 && ny < static_cast<int>(goalDistance.size()) && nx >= 0 && nx < static_cast<int>(goalDistance[0].size())
            && !occupied.count({ny, nx})) {
            double weight = std::max(0.0, goalDistance[y][x] - goalDistance[ny][nx] + 1.0);
            probs[{ny, nx}] = weight;
            total += weight;
        }
    }
    if (total == 0.0) return {};
    for (auto& [k, v] : probs) v /= total;
    return probs;
}
```

```rust
use std::collections::{HashMap, HashSet};

fn transition_probabilities(
    pos: (i32, i32), goal_distance: &[Vec<f64>], occupied: &HashSet<(i32, i32)>,
) -> HashMap<(i32, i32), f64> {
    let (y, x) = pos;
    let mut candidates = Vec::new();
    for dy in -1..=1 {
        for dx in -1..=1 {
            if dy != 0 || dx != 0 {
                candidates.push((y + dy, x + dx));
            }
        }
    }

    let mut probs = HashMap::new();
    let mut total = 0.0;
    let rows = goal_distance.len() as i32;
    let cols = goal_distance[0].len() as i32;
    for (ny, nx) in candidates {
        if ny >= 0 && ny < rows && nx >= 0 && nx < cols && !occupied.contains(&(ny, nx)) {
            let weight = (goal_distance[y as usize][x as usize] - goal_distance[ny as usize][nx as usize] + 1.0).max(0.0);
            probs.insert((ny, nx), weight);
            total += weight;
        }
    }
    if total == 0.0 {
        return HashMap::new();
    }
    for v in probs.values_mut() {
        *v /= total;
    }
    probs
}
```

```csharp
static Dictionary<(int, int), double> TransitionProbabilities(
    (int y, int x) pos, double[][] goalDistance, HashSet<(int, int)> occupied)
{
    var candidates = new List<(int, int)>();
    for (int dy = -1; dy <= 1; dy++)
        for (int dx = -1; dx <= 1; dx++)
            if (!(dy == 0 && dx == 0)) candidates.Add((pos.y + dy, pos.x + dx));

    var probs = new Dictionary<(int, int), double>();
    double total = 0;
    foreach (var (ny, nx) in candidates)
    {
        if (ny >= 0 && ny < goalDistance.Length && nx >= 0 && nx < goalDistance[0].Length && !occupied.Contains((ny, nx)))
        {
            double weight = Math.Max(0, goalDistance[pos.y][pos.x] - goalDistance[ny][nx] + 1.0);
            probs[(ny, nx)] = weight;
            total += weight;
        }
    }
    if (total == 0) return new Dictionary<(int, int), double>();
    foreach (var key in probs.Keys.ToList()) probs[key] /= total;
    return probs;
}
```
