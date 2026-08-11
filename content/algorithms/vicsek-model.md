---
name: Vicsekモデル(自己駆動粒子群の同期的整列現象)
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n²)(単純実装、nは粒子数)
summary: 各粒子が一定速度で動きながら、近傍の平均進行方向にノイズを加えて追従するだけの単純な規則から、ある密度・ノイズ量を境に集団全体が突然同じ方向を向く「相転移」が起きる、物理学発の群れモデル。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)は分離・整列・結合という3つの力を組み合わせて視覚的に自然な群れを作る、CG向けに設計されたモデルだが、Vicsekモデルは1995年に物理学者タマーシュ・ヴィチェクらが**自己駆動粒子系の統計物理学**として提案した、より単純で理論解析に向いたモデルである。各粒子(自己駆動粒子)は一定の速さで移動し続けながら、進行方向だけを**近傍粒子の平均進行方向にノイズを加えて更新する**という、Boidsの「整列」ルールに相当する要素だけを取り出した極めてシンプルな規則に従う。この単純さにもかかわらず、ノイズの強さや粒子密度を変化させると、集団がバラバラに動く「無秩序相」から、全体が同じ方向へ揃って動く「秩序相」へと**相転移**が起きることが示され、群れ行動を統計物理学の言葉で理解する土台を作った歴史的に重要なモデルである。

## 仕組み

1. `n`個の粒子を平面上にランダムに配置し、それぞれにランダムな進行方向(角度)`θ_i`と、共通の一定速さ`v`を与える
2. 各時間ステップで、各粒子`i`について、**半径`r`以内にいる近傍粒子(自分自身を含む)の進行方向の平均角度**`⟨θ⟩_r(i)`を計算する(角度の平均は、各方向の単位ベクトルを足し合わせてから角度を取り直すことで求める)
3. 粒子`i`の新しい進行方向を、この平均角度に**ノイズ**`η`(`[-η/2, η/2)`の一様乱数)を加えたものとして更新する:`θ_i(t+1) = ⟨θ⟩_r(i) + noise`
4. 各粒子の位置を、更新前の進行方向`θ_i(t)`(または更新後の方向、実装によって異なる)と速さ`v`に従って1ステップ分移動させる
5. 2〜4を全粒子について繰り返し、時間発展させる

## 特性・トレードオフ

- **相転移という物理学的な現象の再現**: ノイズ`η`が小さい(または粒子密度が高い)と、時間とともに全粒子の進行方向が1つの方向へ揃っていく秩序状態に収束する。逆にノイズが大きい(または密度が低い)と、方向は揃わずバラバラに動き続ける無秩序状態にとどまる。この秩序-無秩序の切り替わりが、まるで磁性体の相転移のように急激に起こることが、Vicsekモデルが物理学で注目された最大の理由である
- **[Boids](/algorithms/boids)との比較**: Boidsが「分離・整列・結合」という3つの力を組み合わせて視覚的なリアルさを追求するCG・ゲーム向けのモデルであるのに対し、Vicsekモデルは「整列」だけに絞った最小限の規則で、統計物理学的な解析(秩序変数の測定、相転移の臨界指数の計算など)がしやすいように設計されている。群れの見た目の自然さより、集団運動の普遍的な性質の理解に主眼が置かれている
- **モデルの単純さと理論的な汎用性**: 速さが一定・進行方向だけが更新される、という単純化のおかげで、統計物理学の枠組み(平均場近似、臨界現象の理論)をそのまま適用しやすく、鳥や魚の大群だけでなく、細菌のコロニー、ロボット群、歩行者密集流など、幅広い「自己駆動粒子系」の普遍的な振る舞いを説明するモデルとして応用されている
- **使いどころ**: 群れ行動の統計物理学的な研究、細菌コロニーや細胞集団の集団運動の解析、ロボット群制御における同期・整列アルゴリズムの理論的基盤、群知能アルゴリズムの理論的な収束性解析の題材

## 実装例

```python
import math
import random

def vicsek_step(
    positions: list[tuple[float, float]], angles: list[float],
    speed: float = 0.03, radius: float = 1.0, noise: float = 0.1, box_size: float = 10.0,
) -> tuple[list[tuple[float, float]], list[float]]:
    n = len(positions)
    new_angles = []
    for i in range(n):
        sum_sin, sum_cos = 0.0, 0.0
        for j in range(n):
            dx = positions[i][0] - positions[j][0]
            dy = positions[i][1] - positions[j][1]
            if dx * dx + dy * dy <= radius * radius:
                sum_sin += math.sin(angles[j])
                sum_cos += math.cos(angles[j])
        avg_angle = math.atan2(sum_sin, sum_cos)
        new_angles.append(avg_angle + (random.random() - 0.5) * noise)

    new_positions = []
    for i in range(n):
        x = (positions[i][0] + speed * math.cos(angles[i])) % box_size
        y = (positions[i][1] + speed * math.sin(angles[i])) % box_size
        new_positions.append((x, y))

    return new_positions, new_angles
```

```typescript
function vicsekStep(
  positions: [number, number][],
  angles: number[],
  speed = 0.03,
  radius = 1.0,
  noise = 0.1,
  boxSize = 10.0,
): { positions: [number, number][]; angles: number[] } {
  const n = positions.length;
  const newAngles: number[] = [];
  for (let i = 0; i < n; i++) {
    let sumSin = 0,
      sumCos = 0;
    for (let j = 0; j < n; j++) {
      const dx = positions[i][0] - positions[j][0];
      const dy = positions[i][1] - positions[j][1];
      if (dx * dx + dy * dy <= radius * radius) {
        sumSin += Math.sin(angles[j]);
        sumCos += Math.cos(angles[j]);
      }
    }
    const avgAngle = Math.atan2(sumSin, sumCos);
    newAngles.push(avgAngle + (Math.random() - 0.5) * noise);
  }

  const newPositions: [number, number][] = positions.map(([x, y], i) => [
    (x + speed * Math.cos(angles[i]) + boxSize) % boxSize,
    (y + speed * Math.sin(angles[i]) + boxSize) % boxSize,
  ]);

  return { positions: newPositions, angles: newAngles };
}
```

```cpp
#include <vector>
#include <cmath>
#include <random>

struct VicsekResult {
    std::vector<std::pair<double, double>> positions;
    std::vector<double> angles;
};

VicsekResult vicsekStep(
    const std::vector<std::pair<double, double>>& positions, const std::vector<double>& angles,
    double speed, double radius, double noise, double boxSize, std::mt19937& rng) {
    int n = static_cast<int>(positions.size());
    std::vector<double> newAngles(n);
    std::uniform_real_distribution<double> noiseDist(-0.5, 0.5);

    for (int i = 0; i < n; i++) {
        double sumSin = 0.0, sumCos = 0.0;
        for (int j = 0; j < n; j++) {
            double dx = positions[i].first - positions[j].first;
            double dy = positions[i].second - positions[j].second;
            if (dx * dx + dy * dy <= radius * radius) {
                sumSin += std::sin(angles[j]);
                sumCos += std::cos(angles[j]);
            }
        }
        double avgAngle = std::atan2(sumSin, sumCos);
        newAngles[i] = avgAngle + noiseDist(rng) * noise;
    }

    std::vector<std::pair<double, double>> newPositions(n);
    for (int i = 0; i < n; i++) {
        double x = std::fmod(positions[i].first + speed * std::cos(angles[i]) + boxSize, boxSize);
        double y = std::fmod(positions[i].second + speed * std::sin(angles[i]) + boxSize, boxSize);
        newPositions[i] = {x, y};
    }

    return {newPositions, newAngles};
}
```

```rust
fn vicsek_step(
    positions: &[(f64, f64)], angles: &[f64],
    speed: f64, radius: f64, noise: f64, box_size: f64, rand_noise: &[f64],
) -> (Vec<(f64, f64)>, Vec<f64>) {
    let n = positions.len();
    let mut new_angles = vec![0.0; n];

    for i in 0..n {
        let mut sum_sin = 0.0;
        let mut sum_cos = 0.0;
        for j in 0..n {
            let dx = positions[i].0 - positions[j].0;
            let dy = positions[i].1 - positions[j].1;
            if dx * dx + dy * dy <= radius * radius {
                sum_sin += angles[j].sin();
                sum_cos += angles[j].cos();
            }
        }
        let avg_angle = sum_sin.atan2(sum_cos);
        new_angles[i] = avg_angle + (rand_noise[i] - 0.5) * noise;
    }

    let new_positions: Vec<(f64, f64)> = (0..n)
        .map(|i| {
            let x = (positions[i].0 + speed * angles[i].cos() + box_size) % box_size;
            let y = (positions[i].1 + speed * angles[i].sin() + box_size) % box_size;
            (x, y)
        })
        .collect();

    (new_positions, new_angles)
}
```

```csharp
static (List<(double x, double y)> positions, List<double> angles) VicsekStep(
    List<(double x, double y)> positions, List<double> angles,
    double speed, double radius, double noise, double boxSize, Random rand)
{
    int n = positions.Count;
    var newAngles = new List<double>(new double[n]);

    for (int i = 0; i < n; i++)
    {
        double sumSin = 0, sumCos = 0;
        for (int j = 0; j < n; j++)
        {
            double dx = positions[i].x - positions[j].x;
            double dy = positions[i].y - positions[j].y;
            if (dx * dx + dy * dy <= radius * radius)
            {
                sumSin += Math.Sin(angles[j]);
                sumCos += Math.Cos(angles[j]);
            }
        }
        double avgAngle = Math.Atan2(sumSin, sumCos);
        newAngles[i] = avgAngle + (rand.NextDouble() - 0.5) * noise;
    }

    var newPositions = new List<(double, double)>();
    for (int i = 0; i < n; i++)
    {
        double x = (positions[i].x + speed * Math.Cos(angles[i]) + boxSize) % boxSize;
        double y = (positions[i].y + speed * Math.Sin(angles[i]) + boxSize) % boxSize;
        newPositions.Add((x, y));
    }

    return (newPositions, newAngles);
}
```
