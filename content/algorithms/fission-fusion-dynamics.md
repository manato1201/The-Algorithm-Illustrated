---
name: 群れの分裂統合動態(フィッション・フュージョン)
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n²)(1ステップあたり、nは個体数)
summary: 個体ごとの活動状態(採食・休息・移動)の違いに応じて群れが自然に小集団へ分裂し、状態が揃うと再び統合するというルールをシミュレーションし、霊長類や象の群れで観察される流動的な群れサイズの変化を再現する。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)や[Vicsekモデル](/algorithms/vicsek-model)は「1つの群れがまとまって動く」ことを前提とするが、チンパンジーや象、一部の魚群のような社会性動物では、**群れ全体のメンバー構成が時間とともに変化し、大きな集団が小集団に分裂(フィッション)したり、複数の小集団が再び合流(フュージョン)したりする**という、より流動的な群れの動態が観察される。フィッション・フュージョン動態のシミュレーションは、各個体が持つ「今どの活動をしたいか(採食、休息、移動など)」という内部状態に着目し、**近くにいる個体との活動状態の一致度**に応じて、一緒に行動し続けるか、離れて別の小集団に加わるかを決めるモデルとして構成される。動物行動学の知見をアルゴリズム化した、群れシミュレーションの中でも社会構造の変化そのものを扱う発展的なモデルである。

## 仕組み

1. 各個体に、位置・速度に加えて「現在の活動状態」(例: 採食中、休息中、移動中)を持たせる。活動状態は一定の確率(または内部的な欲求パラメータ)に従って時間とともに自発的に変化する
2. 各個体は、近傍にいる個体の中から**自分と同じ活動状態の個体**を探す。同じ活動状態の個体が近くにいれば、[Boidsアルゴリズム](/algorithms/boids)に似た結合・整列の力でその個体に引き寄せられる
3. 逆に、近傍の個体の活動状態が自分と大きく異なる場合(自分は休みたいのに周囲は移動している、など)、その個体からは引き寄せられる力が弱まる、あるいは反発する力が働く
4. この結果、活動状態が揃った個体同士が自然に小集団(サブグループ)を形成し(**フィッション**)、逆に多くの個体の活動状態が偶然揃うタイミングでは、複数の小集団が合流して大きな群れに戻る(**フュージョン**)という現象が創発する
5. 1〜4を時間発展させ、群れの構成(どの個体がどの小集団に属するか)が時間とともにどう変化するかを観察する

## 特性・トレードオフ

- **社会的な柔軟性のモデル化**: 常に一定の群れサイズを保つ[Boidsアルゴリズム](/algorithms/boids)のような単純な群れモデルでは表現できない、「状況に応じて群れの構成員が入れ替わる」という、より高次の社会的な柔軟性を表現できる。霊長類学・動物行動学の分野で、実際の観察データ(群れサイズの分布、個体間の関係の持続時間)とモデルの出力を比較する研究に使われている
- **内部状態という新しい次元の導入**: 位置・速度という物理的な状態だけでなく、「今何をしたいか」という個体ごとの内部状態(欲求・活動状態)を追加で管理する必要があり、[Boidsアルゴリズム](/algorithms/boids)や[ソーシャルフォースモデル](/algorithms/social-force-model)よりもモデルの複雑さは増す。しかしこの追加によって、より現実の動物社会に近い群れの流動性を再現できる
- **群れサイズの分布という創発的な指標**: フィッション・フュージョン動態のシミュレーションでは、個々の軌跡だけでなく「観察されるサブグループのサイズがどのような分布になるか」(実際の動物群れ研究では、べき乗則に近い分布がしばしば報告される)が、モデルの妥当性を検証する重要な指標になる
- **使いどころ**: 動物行動学における群れ社会構造の理論モデリング、生態系シミュレーションにおける個体群の空間分布予測、群衆・組織における「サブグループの形成と解散」という社会的ダイナミクスのアナロジーとしての応用、マルチエージェントシステムにおける動的な役割分担・チーム編成のモデル化

## 実装例

```python
import random

def fission_fusion_step(
    positions: list[tuple[float, float]], activities: list[str],
    activity_change_prob: float = 0.05, cohesion_radius: float = 10.0, step_size: float = 0.5,
) -> tuple[list[tuple[float, float]], list[str]]:
    n = len(positions)
    activity_options = ["foraging", "resting", "moving"]

    new_activities = []
    for a in activities:
        if random.random() < activity_change_prob:
            new_activities.append(random.choice(activity_options))
        else:
            new_activities.append(a)

    new_positions = []
    for i in range(n):
        pull_x, pull_y, count = 0.0, 0.0, 0
        for j in range(n):
            if i == j or new_activities[i] != new_activities[j]:
                continue
            dx, dy = positions[j][0] - positions[i][0], positions[j][1] - positions[i][1]
            dist = (dx ** 2 + dy ** 2) ** 0.5
            if 0 < dist < cohesion_radius:
                pull_x += dx / dist
                pull_y += dy / dist
                count += 1

        if count > 0:
            pull_x, pull_y = pull_x / count, pull_y / count
        new_positions.append((positions[i][0] + step_size * pull_x, positions[i][1] + step_size * pull_y))

    return new_positions, new_activities
```

```typescript
type Position = [number, number];

function fissionFusionStep(
  positions: Position[],
  activities: string[],
  activityChangeProb = 0.05,
  cohesionRadius = 10.0,
  stepSize = 0.5,
  rand: () => number = Math.random,
): { positions: Position[]; activities: string[] } {
  const n = positions.length;
  const options = ["foraging", "resting", "moving"];

  const newActivities = activities.map((a) =>
    rand() < activityChangeProb
      ? options[Math.floor(rand() * options.length)]
      : a,
  );

  const newPositions: Position[] = positions.map((pos, i) => {
    let pullX = 0,
      pullY = 0,
      count = 0;
    for (let j = 0; j < n; j++) {
      if (i === j || newActivities[i] !== newActivities[j]) continue;
      const dx = positions[j][0] - pos[0],
        dy = positions[j][1] - pos[1];
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < cohesionRadius) {
        pullX += dx / dist;
        pullY += dy / dist;
        count++;
      }
    }
    if (count > 0) {
      pullX /= count;
      pullY /= count;
    }
    return [pos[0] + stepSize * pullX, pos[1] + stepSize * pullY];
  });

  return { positions: newPositions, activities: newActivities };
}
```

```cpp
#include <vector>
#include <string>
#include <cmath>
#include <random>

struct FissionFusionResult {
    std::vector<std::pair<double, double>> positions;
    std::vector<std::string> activities;
};

FissionFusionResult fissionFusionStep(
    const std::vector<std::pair<double, double>>& positions, const std::vector<std::string>& activities,
    double activityChangeProb, double cohesionRadius, double stepSize, std::mt19937& rng) {
    int n = static_cast<int>(positions.size());
    std::vector<std::string> options = {"foraging", "resting", "moving"};
    std::uniform_real_distribution<double> uni(0.0, 1.0);
    std::uniform_int_distribution<int> optDist(0, 2);

    std::vector<std::string> newActivities(n);
    for (int i = 0; i < n; i++) {
        newActivities[i] = (uni(rng) < activityChangeProb) ? options[optDist(rng)] : activities[i];
    }

    std::vector<std::pair<double, double>> newPositions(n);
    for (int i = 0; i < n; i++) {
        double pullX = 0.0, pullY = 0.0;
        int count = 0;
        for (int j = 0; j < n; j++) {
            if (i == j || newActivities[i] != newActivities[j]) continue;
            double dx = positions[j].first - positions[i].first, dy = positions[j].second - positions[i].second;
            double dist = std::hypot(dx, dy);
            if (dist > 0 && dist < cohesionRadius) { pullX += dx / dist; pullY += dy / dist; count++; }
        }
        if (count > 0) { pullX /= count; pullY /= count; }
        newPositions[i] = {positions[i].first + stepSize * pullX, positions[i].second + stepSize * pullY};
    }

    return {newPositions, newActivities};
}
```

```rust
use rand::Rng;

fn fission_fusion_step(
    positions: &[(f64, f64)], activities: &[String],
    activity_change_prob: f64, cohesion_radius: f64, step_size: f64, rng: &mut impl Rng,
) -> (Vec<(f64, f64)>, Vec<String>) {
    let n = positions.len();
    let options = ["foraging", "resting", "moving"];

    let new_activities: Vec<String> = activities
        .iter()
        .map(|a| {
            if rng.gen::<f64>() < activity_change_prob {
                options[rng.gen_range(0..3)].to_string()
            } else {
                a.clone()
            }
        })
        .collect();

    let mut new_positions = Vec::with_capacity(n);
    for i in 0..n {
        let mut pull_x = 0.0;
        let mut pull_y = 0.0;
        let mut count = 0;
        for j in 0..n {
            if i == j || new_activities[i] != new_activities[j] {
                continue;
            }
            let dx = positions[j].0 - positions[i].0;
            let dy = positions[j].1 - positions[i].1;
            let dist = dx.hypot(dy);
            if dist > 0.0 && dist < cohesion_radius {
                pull_x += dx / dist;
                pull_y += dy / dist;
                count += 1;
            }
        }
        if count > 0 {
            pull_x /= count as f64;
            pull_y /= count as f64;
        }
        new_positions.push((positions[i].0 + step_size * pull_x, positions[i].1 + step_size * pull_y));
    }

    (new_positions, new_activities)
}
```

```csharp
static (List<(double, double)> positions, List<string> activities) FissionFusionStep(
    List<(double x, double y)> positions, List<string> activities,
    double activityChangeProb, double cohesionRadius, double stepSize, Random rand)
{
    int n = positions.Count;
    var options = new[] { "foraging", "resting", "moving" };

    var newActivities = activities.Select(a => rand.NextDouble() < activityChangeProb ? options[rand.Next(3)] : a).ToList();

    var newPositions = new List<(double, double)>();
    for (int i = 0; i < n; i++)
    {
        double pullX = 0, pullY = 0;
        int count = 0;
        for (int j = 0; j < n; j++)
        {
            if (i == j || newActivities[i] != newActivities[j]) continue;
            double dx = positions[j].x - positions[i].x, dy = positions[j].y - positions[i].y;
            double dist = Math.Sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < cohesionRadius) { pullX += dx / dist; pullY += dy / dist; count++; }
        }
        if (count > 0) { pullX /= count; pullY /= count; }
        newPositions.Add((positions[i].x + stepSize * pullX, positions[i].y + stepSize * pullY));
    }

    return (newPositions, newActivities);
}
```
