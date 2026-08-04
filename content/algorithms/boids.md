---
name: Boidsアルゴリズム
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n²)(単純実装)
summary: 分離・整列・結合という3つの単純な局所ルールだけから、鳥の群れのような複雑な創発的挙動が生まれる。
---

## 概要

鳥の群れや魚の大群のような、統率者がいないのに全体として滑らかにまとまって動く集団行動を、コンピュータグラフィックスの世界でシミュレーションするために1986年にクレイグ・レイノルズが考案した。各個体(boid、"bird-oid"の略)は**近くの仲間の情報しか見ていない**にもかかわらず、群れ全体としては驚くほど自然でまとまりのある動きが「創発」する——中央集権的な制御を一切使わない、分散システムの美しい成功例でもある。

## 仕組み

各boidは、近傍にいる仲間だけを観察し、次の3つのルールから受ける力を合成して自分の速度を決める。

1. **分離(Separation)**: 近すぎる仲間からは離れる方向に力がかかる(衝突を避ける)
2. **整列(Alignment)**: 近傍の仲間の平均的な進行方向に自分の向きを合わせようとする
3. **結合(Cohesion)**: 近傍の仲間の重心に向かって引き寄せられる(群れからはぐれないようにする)

各boidはこの3つの力を毎フレーム計算し、合成した結果に基づいて自分の位置と速度を更新する。**どのboidも「群れ全体をどう動かすか」という視点は一切持たず、あくまで自分の近くの仲間だけを見て反応している**にもかかわらず、それを大量のboidで同時に行うと、まるで指揮者がいるかのような統一された群れの動きが画面全体に現れる。

## 特性・トレードオフ

- **計算量**: 素朴な実装では、各boidが他の全boidとの距離を毎フレーム計算するためO(n²)。空間分割(グリッドや四分木)を使って近傍探索を絞り込めば、より大きな群れでも高速に扱える
- **創発(Emergence)という現象の好例**: 個々の単純なルールの総和以上の複雑な振る舞いが全体として現れる「創発」という概念を、目に見える形で体感できる代表的なシミュレーション。セル・オートマトンやアリのコロニーの行動とも共通するテーマ
- **パラメータ調整の面白さ**: 3つの力それぞれの強さのバランスを変えるだけで、群れがまとまりやすくなったり、散らばりやすくなったり、大きく見た目の挙動が変わる。パラメータ空間を探る楽しさもこのアルゴリズムの魅力の一部
- **使いどころ**: 映画・ゲームにおける群衆・鳥・魚群のCG表現(『バットマン リターンズ』のコウモリの群れが実用化の最初期の例として知られる)、群れ行動の生物学的シミュレーション、ロボット群の分散制御アルゴリズムの着想元

## 実装例

```python
import math

def limit(vx: float, vy: float, max_val: float) -> tuple[float, float]:
    mag = math.hypot(vx, vy)
    if mag > max_val and mag > 0:
        return vx / mag * max_val, vy / mag * max_val
    return vx, vy

def boids_step(
    boids: list[tuple[float, float, float, float]],
    perception: float = 50.0, sep_dist: float = 25.0,
    max_speed: float = 4.0, max_force: float = 0.1,
    w_sep: float = 1.5, w_ali: float = 1.0, w_coh: float = 1.0,
) -> list[tuple[float, float, float, float]]:
    n = len(boids)
    new_boids = []
    for i in range(n):
        xi, yi, vxi, vyi = boids[i]
        sep_x = sep_y = ali_x = ali_y = coh_x = coh_y = 0.0
        sep_count = neighbor_count = 0
        for j in range(n):
            if i == j:
                continue
            xj, yj, vxj, vyj = boids[j]
            dx, dy = xi - xj, yi - yj
            d = math.hypot(dx, dy)
            if 0 < d < perception:
                neighbor_count += 1
                ali_x += vxj
                ali_y += vyj
                coh_x += xj
                coh_y += yj
                if d < sep_dist:
                    sep_x += dx / d
                    sep_y += dy / d
                    sep_count += 1
        ax = ay = 0.0
        if sep_count > 0:
            ax += sep_x / sep_count * w_sep
            ay += sep_y / sep_count * w_sep
        if neighbor_count > 0:
            ax_ali, ay_ali = limit(ali_x / neighbor_count, ali_y / neighbor_count, max_force)
            ax += ax_ali * w_ali
            ay += ay_ali * w_ali
            cx, cy = limit(coh_x / neighbor_count - xi, coh_y / neighbor_count - yi, max_force)
            ax += cx * w_coh
            ay += cy * w_coh
        nvx, nvy = limit(vxi + ax, vyi + ay, max_speed)
        new_boids.append((xi + nvx, yi + nvy, nvx, nvy))
    return new_boids
```

```typescript
type Boid = [number, number, number, number]; // x, y, vx, vy

function limit(vx: number, vy: number, maxVal: number): [number, number] {
  const mag = Math.hypot(vx, vy);
  if (mag > maxVal && mag > 0) {
    return [(vx / mag) * maxVal, (vy / mag) * maxVal];
  }
  return [vx, vy];
}

function boidsStep(
  boids: Boid[],
  perception = 50.0, sepDist = 25.0, maxSpeed = 4.0, maxForce = 0.1,
  wSep = 1.5, wAli = 1.0, wCoh = 1.0
): Boid[] {
  const n = boids.length;
  const result: Boid[] = [];
  for (let i = 0; i < n; i++) {
    const [xi, yi, vxi, vyi] = boids[i];
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
    let sepCount = 0, neighborCount = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const [xj, yj, vxj, vyj] = boids[j];
      const dx = xi - xj, dy = yi - yj;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < perception) {
        neighborCount++;
        aliX += vxj; aliY += vyj;
        cohX += xj; cohY += yj;
        if (d < sepDist) {
          sepX += dx / d; sepY += dy / d;
          sepCount++;
        }
      }
    }
    let ax = 0, ay = 0;
    if (sepCount > 0) {
      ax += (sepX / sepCount) * wSep;
      ay += (sepY / sepCount) * wSep;
    }
    if (neighborCount > 0) {
      let [aliXn, aliYn] = limit(aliX / neighborCount, aliY / neighborCount, maxForce);
      ax += aliXn * wAli; ay += aliYn * wAli;
      const [cx, cy] = limit(cohX / neighborCount - xi, cohY / neighborCount - yi, maxForce);
      ax += cx * wCoh; ay += cy * wCoh;
    }
    const [nvx, nvy] = limit(vxi + ax, vyi + ay, maxSpeed);
    result.push([xi + nvx, yi + nvy, nvx, nvy]);
  }
  return result;
}
```

```cpp
#include <vector>
#include <cmath>
#include <tuple>

struct Boid { double x, y, vx, vy; };

std::pair<double, double> limitVector(double vx, double vy, double maxVal) {
    double mag = std::sqrt(vx * vx + vy * vy);
    if (mag > maxVal && mag > 0.0) {
        return {vx / mag * maxVal, vy / mag * maxVal};
    }
    return {vx, vy};
}

std::vector<Boid> boidsStep(
    const std::vector<Boid>& boids,
    double perception = 50.0, double sepDist = 25.0,
    double maxSpeed = 4.0, double maxForce = 0.1,
    double wSep = 1.5, double wAli = 1.0, double wCoh = 1.0) {
    int n = static_cast<int>(boids.size());
    std::vector<Boid> result;
    result.reserve(n);
    for (int i = 0; i < n; i++) {
        const Boid& bi = boids[i];
        double sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
        int sepCount = 0, neighborCount = 0;
        for (int j = 0; j < n; j++) {
            if (i == j) continue;
            const Boid& bj = boids[j];
            double dx = bi.x - bj.x, dy = bi.y - bj.y;
            double d = std::sqrt(dx * dx + dy * dy);
            if (d > 0.0 && d < perception) {
                neighborCount++;
                aliX += bj.vx; aliY += bj.vy;
                cohX += bj.x; cohY += bj.y;
                if (d < sepDist) {
                    sepX += dx / d; sepY += dy / d;
                    sepCount++;
                }
            }
        }
        double ax = 0, ay = 0;
        if (sepCount > 0) {
            ax += sepX / sepCount * wSep;
            ay += sepY / sepCount * wSep;
        }
        if (neighborCount > 0) {
            auto [aliXn, aliYn] = limitVector(aliX / neighborCount, aliY / neighborCount, maxForce);
            ax += aliXn * wAli; ay += aliYn * wAli;
            auto [cx, cy] = limitVector(cohX / neighborCount - bi.x, cohY / neighborCount - bi.y, maxForce);
            ax += cx * wCoh; ay += cy * wCoh;
        }
        auto [nvx, nvy] = limitVector(bi.vx + ax, bi.vy + ay, maxSpeed);
        result.push_back({bi.x + nvx, bi.y + nvy, nvx, nvy});
    }
    return result;
}
```

```rust
#[derive(Clone, Copy)]
struct Boid { x: f64, y: f64, vx: f64, vy: f64 }

fn limit_vector(vx: f64, vy: f64, max_val: f64) -> (f64, f64) {
    let mag = (vx * vx + vy * vy).sqrt();
    if mag > max_val && mag > 0.0 {
        (vx / mag * max_val, vy / mag * max_val)
    } else {
        (vx, vy)
    }
}

fn boids_step(
    boids: &[Boid],
    perception: f64, sep_dist: f64, max_speed: f64, max_force: f64,
    w_sep: f64, w_ali: f64, w_coh: f64,
) -> Vec<Boid> {
    let n = boids.len();
    let mut result = Vec::with_capacity(n);
    for i in 0..n {
        let bi = boids[i];
        let (mut sep_x, mut sep_y) = (0.0, 0.0);
        let (mut ali_x, mut ali_y) = (0.0, 0.0);
        let (mut coh_x, mut coh_y) = (0.0, 0.0);
        let mut sep_count = 0;
        let mut neighbor_count = 0;
        for j in 0..n {
            if i == j { continue; }
            let bj = boids[j];
            let dx = bi.x - bj.x;
            let dy = bi.y - bj.y;
            let d = (dx * dx + dy * dy).sqrt();
            if d > 0.0 && d < perception {
                neighbor_count += 1;
                ali_x += bj.vx; ali_y += bj.vy;
                coh_x += bj.x; coh_y += bj.y;
                if d < sep_dist {
                    sep_x += dx / d; sep_y += dy / d;
                    sep_count += 1;
                }
            }
        }
        let mut ax = 0.0;
        let mut ay = 0.0;
        if sep_count > 0 {
            ax += sep_x / sep_count as f64 * w_sep;
            ay += sep_y / sep_count as f64 * w_sep;
        }
        if neighbor_count > 0 {
            let (lax, lay) = limit_vector(ali_x / neighbor_count as f64, ali_y / neighbor_count as f64, max_force);
            ax += lax * w_ali; ay += lay * w_ali;
            let (cx, cy) = limit_vector(
                coh_x / neighbor_count as f64 - bi.x,
                coh_y / neighbor_count as f64 - bi.y,
                max_force,
            );
            ax += cx * w_coh; ay += cy * w_coh;
        }
        let (nvx, nvy) = limit_vector(bi.vx + ax, bi.vy + ay, max_speed);
        result.push(Boid { x: bi.x + nvx, y: bi.y + nvy, vx: nvx, vy: nvy });
    }
    result
}
```

```csharp
static (double vx, double vy) Limit(double vx, double vy, double maxVal)
{
    double mag = Math.Sqrt(vx * vx + vy * vy);
    if (mag > maxVal && mag > 0)
    {
        return (vx / mag * maxVal, vy / mag * maxVal);
    }
    return (vx, vy);
}

static List<(double x, double y, double vx, double vy)> BoidsStep(
    List<(double x, double y, double vx, double vy)> boids,
    double perception = 50.0, double sepDist = 25.0, double maxSpeed = 4.0, double maxForce = 0.1,
    double wSep = 1.5, double wAli = 1.0, double wCoh = 1.0)
{
    int n = boids.Count;
    var result = new List<(double, double, double, double)>();
    for (int i = 0; i < n; i++)
    {
        var (xi, yi, vxi, vyi) = boids[i];
        double sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
        int sepCount = 0, neighborCount = 0;
        for (int j = 0; j < n; j++)
        {
            if (i == j) continue;
            var (xj, yj, vxj, vyj) = boids[j];
            double dx = xi - xj, dy = yi - yj;
            double d = Math.Sqrt(dx * dx + dy * dy);
            if (d > 0 && d < perception)
            {
                neighborCount++;
                aliX += vxj; aliY += vyj;
                cohX += xj; cohY += yj;
                if (d < sepDist)
                {
                    sepX += dx / d; sepY += dy / d;
                    sepCount++;
                }
            }
        }
        double ax = 0, ay = 0;
        if (sepCount > 0)
        {
            ax += sepX / sepCount * wSep;
            ay += sepY / sepCount * wSep;
        }
        if (neighborCount > 0)
        {
            var (aliXn, aliYn) = Limit(aliX / neighborCount, aliY / neighborCount, maxForce);
            ax += aliXn * wAli; ay += aliYn * wAli;
            var (cx, cy) = Limit(cohX / neighborCount - xi, cohY / neighborCount - yi, maxForce);
            ax += cx * wCoh; ay += cy * wCoh;
        }
        var (nvx, nvy) = Limit(vxi + ax, vyi + ay, maxSpeed);
        result.Add((xi + nvx, yi + nvy, nvx, nvy));
    }
    return result;
}
```
