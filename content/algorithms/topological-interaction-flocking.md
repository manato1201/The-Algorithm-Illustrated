---
name: トポロジカル近傍による群れ形成モデル
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n log n)(k近傍探索に空間分割・k-d木を使う場合、nは個体数)
summary: 固定の相互作用半径ではなく「常に一定数(約6〜7羽)の最近傍個体」と相互作用するというムクドリの実証研究に基づく規則で、群れの密度に依存しない頑健な結束を再現する。
---

## 概要

[Vicsekモデル](/algorithms/vicsek-model)や[Boidsアルゴリズム](/algorithms/boids)は、いずれも「半径`r`以内にいる個体を近傍とみなす」という**距離ベース(メトリック)**の相互作用則を採用している。しかし2008年、物理学者アンドレア・バレリーニらのグループが、ステレオ写真測量を用いて実際のムクドリの大群(数千羽規模)を3次元的に解析したところ、驚くべき事実が判明した——個体が相互作用する相手の数は、群れの密度が変化してもほぼ一定(**約6〜7羽**)に保たれていたのである。距離ベースのモデルが予測する「密度が上がれば近傍個体数も増える」という振る舞いとは異なり、実際のムクドリは**近傍の「個体数」を一定に保つ**という、いわば**トポロジカル(位相的)**な相互作用則に従っていた。この発見は、群れモデルを「何メートル以内にいるか」ではなく「近い順に何羽までか」という基準で再設計する必要性を示し、捕食者からの襲撃のような群れの急激な密度変化に対しても結束が崩れにくい理由を説明する理論的な土台になった。

## 仕組み

1. `n`羽の個体を3次元(または2次元)空間に配置し、それぞれに位置と速度ベクトルを持たせる
2. 各時間ステップで、各個体`i`について、**距離に基づいてではなく、近い順に`k`羽(バレリーニらの実測ではk≈6.5)を近傍として選ぶ**。これには各個体から他の全個体までの距離を計算し、近い順にソートして上位`k`個を取る(あるいは効率化のためk-d木のような空間分割構造でk近傍探索を行う)
3. 選ばれた`k`羽の近傍individuals の平均進行方向(または平均速度ベクトル)を計算する
4. 個体`i`の新しい進行方向を、この近傍平均方向に向けて緩やかに補正する(Vicsekモデルと同様、ノイズを加えることもある)。多くの実装では[Boids](/algorithms/boids)同様、分離(近すぎる個体からの反発)と組み合わせて、近傍数`k`に基づく整列則が働くのは「整列」の部分だけ、というハイブリッド構成を取る
5. 各個体の位置を、更新された進行方向と一定(または個体ごとに緩やかに変動する)速さで1ステップ分移動させる
6. 2〜5を全個体について繰り返し、時間発展させる

近傍探索を毎ステップ全個体対で行うと`O(n²)`かかるため、大規模な群れをシミュレーションする場合はk-d木やグリッド分割を使ってk近傍探索を`O(log n)`程度に高速化するのが実用上重要になる。

## 特性・トレードオフ

- **[Vicsekモデル](/algorithms/vicsek-model)との違い**: Vicsekモデルは「半径`r`以内の個体全てを近傍とする」距離ベースの規則であり、群れの密度が上がれば1個体あたりの近傍数は増加し、密度が下がれば近傍数は減少する(密度に依存した相互作用)。トポロジカル近傍モデルはこれとは逆に、**近傍の「個体数」を密度によらず一定に保つ**——距離の閾値ではなく「近い順に何羽まで」という順位で近傍を決める。この違いにより、群れが局所的に疎になった領域でも、個体は依然として一定数の仲間と相互作用し続け、結束が途切れにくい
- **捕食者からの襲撃に対する頑健性**: 実際のムクドリの群れは、猛禽類に襲われると局所的に密度が急変する(群れが割れたり圧縮されたりする)。距離ベースのモデルでは、密度が急減した領域の個体は近傍を失い群れから孤立しやすいが、トポロジカルモデルでは近傍数が常に一定に保たれるため、密度変化に対して群れ全体の結束・情報伝播が崩れにくいことが、バレリーニらの研究以降のシミュレーションで示されている
- **情報伝播速度の観点**: 近傍数を一定に保つ規則は、群れ内の「方向転換」のような情報が、個体密度に依存せず一定の速さで(隣接関係のグラフ構造を伝って)群れ全体に伝播することを可能にする。これは、密度が疎な部分で情報伝播が滞る距離ベースモデルにはない性質である
- **計算コストの増加**: 距離ベースモデルは半径内かどうかの単純な判定で済むが、トポロジカルモデルは「近い順にk番目まで」を求めるためのソートないし部分選択が必要になり、素朴な実装では距離ベースモデルよりオーバーヘッドが大きい。大規模シミュレーションではk-d木などの空間分割構造による高速化が事実上必須
- **使いどころ**: 鳥・魚の大群のより生物学的に忠実な集団運動シミュレーション、捕食者襲撃時の群れの崩壊・再結束のモデリング、密度変化に頑健な分散ロボット群のフォーメーション制御、群知能アルゴリズムにおける近傍定義の設計指針

## 実装例

```python
import math


def k_nearest_indices(positions: list[tuple[float, float]], i: int, k: int) -> list[int]:
    others = [(j, math.dist(positions[i], positions[j])) for j in range(len(positions)) if j != i]
    others.sort(key=lambda pair: pair[1])
    return [j for j, _ in others[:k]]


def topological_flocking_step(
    positions: list[tuple[float, float]],
    velocities: list[tuple[float, float]],
    k: int = 7,
    speed: float = 0.05,
    align_strength: float = 0.1,
) -> tuple[list[tuple[float, float]], list[tuple[float, float]]]:
    n = len(positions)
    new_velocities = []

    for i in range(n):
        neighbors = k_nearest_indices(positions, i, k)
        avg_vx = sum(velocities[j][0] for j in neighbors) / len(neighbors)
        avg_vy = sum(velocities[j][1] for j in neighbors) / len(neighbors)

        vx, vy = velocities[i]
        # 現在の速度方向を、近傍k羽の平均方向へ緩やかに補正する
        nvx = vx + align_strength * (avg_vx - vx)
        nvy = vy + align_strength * (avg_vy - vy)

        mag = math.hypot(nvx, nvy)
        if mag > 0:
            nvx, nvy = nvx / mag * speed, nvy / mag * speed
        new_velocities.append((nvx, nvy))

    new_positions = [
        (positions[i][0] + new_velocities[i][0], positions[i][1] + new_velocities[i][1])
        for i in range(n)
    ]
    return new_positions, new_velocities
```

```typescript
type Vec2 = [number, number];

function kNearestIndices(positions: Vec2[], i: number, k: number): number[] {
  const others: [number, number][] = [];
  for (let j = 0; j < positions.length; j++) {
    if (j === i) continue;
    const dx = positions[i][0] - positions[j][0];
    const dy = positions[i][1] - positions[j][1];
    others.push([j, Math.hypot(dx, dy)]);
  }
  others.sort((a, b) => a[1] - b[1]);
  return others.slice(0, k).map(([j]) => j);
}

function topologicalFlockingStep(
  positions: Vec2[],
  velocities: Vec2[],
  k = 7,
  speed = 0.05,
  alignStrength = 0.1,
): { positions: Vec2[]; velocities: Vec2[] } {
  const n = positions.length;
  const newVelocities: Vec2[] = [];

  for (let i = 0; i < n; i++) {
    const neighbors = kNearestIndices(positions, i, k);
    const avgVx =
      neighbors.reduce((s, j) => s + velocities[j][0], 0) / neighbors.length;
    const avgVy =
      neighbors.reduce((s, j) => s + velocities[j][1], 0) / neighbors.length;

    const [vx, vy] = velocities[i];
    let nvx = vx + alignStrength * (avgVx - vx);
    let nvy = vy + alignStrength * (avgVy - vy);

    const mag = Math.hypot(nvx, nvy);
    if (mag > 0) {
      nvx = (nvx / mag) * speed;
      nvy = (nvy / mag) * speed;
    }
    newVelocities.push([nvx, nvy]);
  }

  const newPositions: Vec2[] = positions.map((p, i) => [
    p[0] + newVelocities[i][0],
    p[1] + newVelocities[i][1],
  ]);

  return { positions: newPositions, velocities: newVelocities };
}
```
