---
name: 交通流のセルオートマトンモデル(Nagel-Schreckenbergモデル)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(n)(1ステップあたり、nは車両数)
summary: 道路を離散的なセルに区切り、各車両が「加速・減速・ランダムなブレーキ・移動」という4つの単純なルールに従うだけで、実際の高速道路で観測される自然渋滞(原因不明の渋滞)の発生を再現するセルオートマトンモデル。
---

## 概要

高速道路では、事故や合流のような明確な原因がないのに、突然渋滞が発生して消えていく「自然渋滞(ファントム渋滞)」という現象がしばしば観測される。1992年にカイ・ナーゲルとミヒャエル・シュレッケンベルクが提案したモデル(Nagel-Schreckenbergモデル)は、道路を離散的なセルに区切り、各車両を単純な確率的ルールに従って動かすだけの[セルオートマトン](/algorithms/conways-game-of-life)でありながら、この自然渋滞の発生を統計的にリアルに再現することで知られる。[森林火災モデル](/algorithms/forest-fire-model)がべき乗則という統計的な創発現象を示したように、このモデルは「わずかな速度のランダムなゆらぎが、後続車に連鎖的に増幅されて渋滞が生まれる」という、交通流に特有の集団現象を、驚くほどシンプルなルールから説明する。

## 仕組み

1. 道路を一列のセルとして離散化し、各セルは「空き」または「ある速度で走る車両が1台」のいずれかの状態を持つ
2. 各時間ステップで、全車両に以下の4つのルールを**同時に**適用する:
   - **加速**: 車両の現在速度`v`が最大速度`v_max`より小さければ、`v ← v + 1`(まだ余裕があれば加速する)
   - **減速(車間距離の確認)**: 前方の車両までの空きセル数`d`が現在の速度`v`より小さければ、`v ← d`(前の車に追突しないよう、進める距離までに速度を落とす)
   - **ランダムなブレーキ**: 確率`p`で、`v ← max(v-1, 0)`(運転手の反応の遅れや注意散漫を模した、確率的な減速)
   - **移動**: 各車両を、更新された速度`v`の分だけ前方のセルへ移動させる
3. これを毎ステップ繰り返すことで、道路上の車両群が時間発展する

## 特性・トレードオフ

- **原因不明の渋滞の再現**: このモデルの最大の特徴は、事故や合流のような明示的な渋滞の原因を一切組み込まなくても、**確率的なブレーキ(ルール3)** だけから、走行中の車列の中に「渋滞の波」が自然発生し、後方に伝播しながら移動していく現象が再現される点にある。1台のわずかな減速が、後続車の反応の遅れの蓄積によって増幅され、やがて完全な停止に至る、という実際の高速道路の渋滞メカニズムを驚くほど単純なモデルで説明する
- **交通流の基本図(密度と流量の関係)の再現**: このモデルをシミュレーションすると、「車両密度が低いうちは流量(単位時間あたりの通過台数)が密度とともに増加するが、ある密度を超えると流量が急激に低下する」という、実際の交通工学で観測される基本図(Fundamental Diagram)と定性的に一致する振る舞いが得られる
- **パラメータの意味が直感的**: 最大速度`v_max`は道路の法定速度に、ランダムブレーキの確率`p`は運転手の注意力のばらつきに対応しており、いずれも現実の交通状況と対応づけて解釈しやすい。`p`を大きくするほど、より低い密度でも渋滞が発生しやすくなる
- **使いどころ**: 交通工学における渋滞発生メカニズムの研究、道路設計・信号制御の効果のシミュレーション評価、自動運転車の導入が交通流に与える影響の予測(反応の遅れがない自動運転車の混入率を変えてシミュレーションする)、[群衆・マルチエージェント](/algorithms/cellular-automaton-crowd)モデルとの比較対象としての1次元版セルオートマトン

## 実装例

```python
import random

def nagel_schreckenberg_step(
    positions: list[int], velocities: list[int], road_length: int, v_max: int = 5, p_brake: float = 0.3,
) -> tuple[list[int], list[int]]:
    n = len(positions)
    # 車両を位置順にソートしてインデックスを扱いやすくする
    order = sorted(range(n), key=lambda i: positions[i])
    sorted_positions = [positions[i] for i in order]
    sorted_velocities = [velocities[i] for i in order]

    new_velocities = []
    for i in range(n):
        v = sorted_velocities[i]
        # 1. 加速
        v = min(v + 1, v_max)
        # 2. 減速(車間距離の確認)
        next_pos = sorted_positions[(i + 1) % n]
        gap = (next_pos - sorted_positions[i] - 1) % road_length
        v = min(v, gap)
        # 3. ランダムなブレーキ
        if random.random() < p_brake:
            v = max(v - 1, 0)
        new_velocities.append(v)

    new_positions = [(sorted_positions[i] + new_velocities[i]) % road_length for i in range(n)]
    return new_positions, new_velocities
```

```typescript
function nagelSchreckenbergStep(
  positions: number[],
  velocities: number[],
  roadLength: number,
  vMax = 5,
  pBrake = 0.3,
  rand: () => number = Math.random,
): { positions: number[]; velocities: number[] } {
  const n = positions.length;
  const order = [...positions.keys()].sort(
    (a, b) => positions[a] - positions[b],
  );
  const sortedPositions = order.map((i) => positions[i]);
  const sortedVelocities = order.map((i) => velocities[i]);

  const newVelocities: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = sortedVelocities[i];
    v = Math.min(v + 1, vMax);
    const nextPos = sortedPositions[(i + 1) % n];
    const gap =
      (((nextPos - sortedPositions[i] - 1) % roadLength) + roadLength) %
      roadLength;
    v = Math.min(v, gap);
    if (rand() < pBrake) v = Math.max(v - 1, 0);
    newVelocities.push(v);
  }

  const newPositions = sortedPositions.map(
    (p, i) => (p + newVelocities[i]) % roadLength,
  );
  return { positions: newPositions, velocities: newVelocities };
}
```

```cpp
#include <vector>
#include <algorithm>
#include <numeric>
#include <random>

std::pair<std::vector<int>, std::vector<int>> nagelSchreckenbergStep(
    const std::vector<int>& positions, const std::vector<int>& velocities, int roadLength,
    int vMax, double pBrake, std::mt19937& rng) {
    int n = static_cast<int>(positions.size());
    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int a, int b) { return positions[a] < positions[b]; });

    std::vector<int> sortedPositions(n), sortedVelocities(n);
    for (int i = 0; i < n; i++) {
        sortedPositions[i] = positions[order[i]];
        sortedVelocities[i] = velocities[order[i]];
    }

    std::uniform_real_distribution<double> uni(0.0, 1.0);
    std::vector<int> newVelocities(n);
    for (int i = 0; i < n; i++) {
        int v = std::min(sortedVelocities[i] + 1, vMax);
        int nextPos = sortedPositions[(i + 1) % n];
        int gap = ((nextPos - sortedPositions[i] - 1) % roadLength + roadLength) % roadLength;
        v = std::min(v, gap);
        if (uni(rng) < pBrake) v = std::max(v - 1, 0);
        newVelocities[i] = v;
    }

    std::vector<int> newPositions(n);
    for (int i = 0; i < n; i++) newPositions[i] = (sortedPositions[i] + newVelocities[i]) % roadLength;

    return {newPositions, newVelocities};
}
```

```rust
use rand::Rng;

fn nagel_schreckenberg_step(
    positions: &[i32], velocities: &[i32], road_length: i32, v_max: i32, p_brake: f64, rng: &mut impl Rng,
) -> (Vec<i32>, Vec<i32>) {
    let n = positions.len();
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by_key(|&i| positions[i]);

    let sorted_positions: Vec<i32> = order.iter().map(|&i| positions[i]).collect();
    let sorted_velocities: Vec<i32> = order.iter().map(|&i| velocities[i]).collect();

    let mut new_velocities = Vec::with_capacity(n);
    for i in 0..n {
        let mut v = (sorted_velocities[i] + 1).min(v_max);
        let next_pos = sorted_positions[(i + 1) % n];
        let gap = ((next_pos - sorted_positions[i] - 1) % road_length + road_length) % road_length;
        v = v.min(gap);
        if rng.gen::<f64>() < p_brake {
            v = (v - 1).max(0);
        }
        new_velocities.push(v);
    }

    let new_positions: Vec<i32> = (0..n).map(|i| (sorted_positions[i] + new_velocities[i]) % road_length).collect();
    (new_positions, new_velocities)
}
```

```csharp
static (List<int> Positions, List<int> Velocities) NagelSchreckenbergStep(
    List<int> positions, List<int> velocities, int roadLength, int vMax, double pBrake, Random rand)
{
    int n = positions.Count;
    var order = Enumerable.Range(0, n).OrderBy(i => positions[i]).ToList();
    var sortedPositions = order.Select(i => positions[i]).ToList();
    var sortedVelocities = order.Select(i => velocities[i]).ToList();

    var newVelocities = new List<int>();
    for (int i = 0; i < n; i++)
    {
        int v = Math.Min(sortedVelocities[i] + 1, vMax);
        int nextPos = sortedPositions[(i + 1) % n];
        int gap = ((nextPos - sortedPositions[i] - 1) % roadLength + roadLength) % roadLength;
        v = Math.Min(v, gap);
        if (rand.NextDouble() < pBrake) v = Math.Max(v - 1, 0);
        newVelocities.Add(v);
    }

    var newPositions = sortedPositions.Select((p, i) => (p + newVelocities[i]) % roadLength).ToList();
    return (newPositions, newVelocities);
}
```
