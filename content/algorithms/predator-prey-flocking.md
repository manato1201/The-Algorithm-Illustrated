---
name: 捕食者ー被食者群れモデル
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n・m)(単純実装、nは被食者数、mは捕食者数)
summary: Boidsの分離・整列・結合の3ルールに、捕食者から逃げる回避力を加えることで、群れが襲撃者を包み込むように分裂・再結合する実際の魚群の逃避行動に近い挙動が再現される。
---

## 概要

[Boidsアルゴリズム](/algorithms/boids)は分離・整列・結合という3つの力だけで群れらしい動きを生み出したが、現実の群れ行動の多くは「捕食者から逃げる」という切実な動機によって形作られている。イワシの群れがサメやイルカに襲われたとき、群れは一様に散り散りになるのではなく、**捕食者を避けるように波打つ形で分裂し、危険が去るとまた再結合する**——こうした「噴水効果(fountain effect)」や「分裂・融合(split-and-merge)」と呼ばれる逃避パターンが観察されている。捕食者ー被食者群れモデルは、Boidsの3ルールに「捕食者からの回避力」という第4のルールを加えることで、この現実的な逃避行動を再現する群れシミュレーションである。

## 仕組み

被食者(prey)は、[Boids](/algorithms/boids)と同じ3つの近傍ルールに加えて、捕食者からの回避力を毎ステップ計算する。

1. **分離**: 近すぎる仲間の被食者から離れる方向に力がかかる(衝突回避)
2. **整列**: 近傍の仲間の被食者の平均進行方向に自分の向きを合わせる
3. **結合**: 近傍の仲間の被食者の重心に向かって引き寄せられる
4. **捕食者回避**: 一定の警戒半径以内に捕食者がいれば、その捕食者から遠ざかる方向に、距離が近いほど強い力がかかる。この力は通常、他の3つのルールよりも大きな重みを持たせる(命に関わる行動は群れの結束より優先される)

捕食者(predator)は、被食者よりも単純な規則で動く——**最も近い被食者(または被食者群の重心)に向かって追跡する**だけでよい。捕食者の追跡と被食者の回避力が拮抗することで、被食者の群れは捕食者が接近すると分裂して左右に避け(噴水効果)、捕食者が通り過ぎると再び1つの群れに融合する、という動的なパターンが自然に生まれる。

| 個体             | 主な力                           | 効果                                                 |
| ---------------- | -------------------------------- | ---------------------------------------------------- |
| 被食者(prey)     | 分離・整列・結合(Boidsの3ルール) | 群れとしてのまとまりを維持する                       |
| 被食者(prey)     | 捕食者回避(最も強い重み)         | 捕食者から逃げ、群れが分裂・再結合するきっかけになる |
| 捕食者(predator) | 追跡(最も近い被食者または重心へ) | 群れを崩し、個体を群れから孤立させようとする         |

## 特性・トレードオフ

- **計算量**: 素朴な実装では、被食者`n`匹それぞれが仲間`n`匹・捕食者`m`匹の両方との距離を計算するためO(n・(n+m))。[Boids](/algorithms/boids)と同様、空間分割(グリッドや四分木)による近傍探索の高速化が有効
- **群れの分裂・再結合という創発的パターン**: 個々の被食者は「捕食者から逃げる」という単純な反応をしているだけなのに、群れ全体としては捕食者を避けて渦を巻くように分裂し、危険が去ると再結合する——実際のイワシ・ニシンの群れで観察される回避パターンに近い挙動が、中央集権的な制御なしに現れる
- **捕食者側の戦略との相互作用**: 捕食者が「群れの重心」を狙うか「最も近い個体(=孤立しやすい個体)」を狙うかによって、被食者側の群れがどう分裂するかが変わる。捕食者の追跡戦略と被食者の群れ形成則を組み合わせることで、生態学における「群れることによる希釈効果(dilution effect、群れが大きいほど個体が襲われる確率が下がる)」のような現象も再現・検証できる
- **[Boids](/algorithms/boids)・[Vicsekモデル](/algorithms/vicsek-model)との対比**: Boidsが群れの内部力学(分離・整列・結合)だけに注目し、Vicsekモデルが整列だけに単純化した統計物理学的なモデルであるのに対し、捕食者ー被食者群れモデルは「群れの外からの脅威」という外的要因を導入することで、群れ形成の**適応的な意味**(捕食を逃れるための戦略としての群れ)を扱えるようにした発展形といえる
- **使いどころ**: 魚群・鳥群の捕食回避行動の生態学的なシミュレーション、ゲーム・映像作品における「襲われて逃げ惑う群衆」のCG表現、群知能に基づくロボット群の危険回避アルゴリズムの着想元、進化シミュレーションにおける群れサイズと生存率の関係の分析

## 実装例

被食者は`(x, y, vx, vy)`、捕食者は`(x, y, vx, vy)`のタプルで表す。

```python
import math


def limit(vx: float, vy: float, max_val: float) -> tuple[float, float]:
    mag = math.hypot(vx, vy)
    if mag > max_val and mag > 0:
        return vx / mag * max_val, vy / mag * max_val
    return vx, vy


def predator_prey_step(
    prey: list[tuple[float, float, float, float]],
    predators: list[tuple[float, float, float, float]],
    perception: float = 50.0, sep_dist: float = 25.0,
    danger_radius: float = 80.0, predator_speed: float = 3.0,
    max_speed: float = 4.0, max_force: float = 0.15,
    w_sep: float = 1.5, w_ali: float = 1.0, w_coh: float = 1.0, w_flee: float = 3.0,
) -> tuple[list[tuple[float, float, float, float]], list[tuple[float, float, float, float]]]:
    n = len(prey)

    new_prey = []
    for i in range(n):
        xi, yi, vxi, vyi = prey[i]
        sep_x = sep_y = ali_x = ali_y = coh_x = coh_y = flee_x = flee_y = 0.0
        sep_count = neighbor_count = 0

        for j in range(n):
            if i == j:
                continue
            xj, yj, vxj, vyj = prey[j]
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

        # 捕食者回避: 警戒半径内の捕食者から離れる方向に、距離が近いほど強い力
        for px, py, _, _ in predators:
            dx, dy = xi - px, yi - py
            d = math.hypot(dx, dy)
            if 0 < d < danger_radius:
                strength = (danger_radius - d) / danger_radius
                flee_x += (dx / d) * strength
                flee_y += (dy / d) * strength

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
        ax += flee_x * w_flee
        ay += flee_y * w_flee

        nvx, nvy = limit(vxi + ax, vyi + ay, max_speed)
        new_prey.append((xi + nvx, yi + nvy, nvx, nvy))

    # 捕食者: 最も近い被食者へ向かって単純に追跡する
    new_predators = []
    for px, py, pvx, pvy in predators:
        nearest = min(prey, key=lambda p: math.hypot(p[0] - px, p[1] - py))
        dx, dy = nearest[0] - px, nearest[1] - py
        d = math.hypot(dx, dy)
        if d > 0:
            tvx, tvy = dx / d * predator_speed, dy / d * predator_speed
        else:
            tvx, tvy = pvx, pvy
        new_predators.append((px + tvx, py + tvy, tvx, tvy))

    return new_prey, new_predators
```

```typescript
type Agent = [number, number, number, number]; // x, y, vx, vy

function limit(vx: number, vy: number, maxVal: number): [number, number] {
  const mag = Math.hypot(vx, vy);
  if (mag > maxVal && mag > 0) {
    return [(vx / mag) * maxVal, (vy / mag) * maxVal];
  }
  return [vx, vy];
}

function predatorPreyStep(
  prey: Agent[],
  predators: Agent[],
  perception = 50.0,
  sepDist = 25.0,
  dangerRadius = 80.0,
  predatorSpeed = 3.0,
  maxSpeed = 4.0,
  maxForce = 0.15,
  wSep = 1.5,
  wAli = 1.0,
  wCoh = 1.0,
  wFlee = 3.0,
): { prey: Agent[]; predators: Agent[] } {
  const n = prey.length;
  const newPrey: Agent[] = [];

  for (let i = 0; i < n; i++) {
    const [xi, yi, vxi, vyi] = prey[i];
    let sepX = 0,
      sepY = 0,
      aliX = 0,
      aliY = 0,
      cohX = 0,
      cohY = 0,
      fleeX = 0,
      fleeY = 0;
    let sepCount = 0,
      neighborCount = 0;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const [xj, yj, vxj, vyj] = prey[j];
      const dx = xi - xj,
        dy = yi - yj;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < perception) {
        neighborCount++;
        aliX += vxj;
        aliY += vyj;
        cohX += xj;
        cohY += yj;
        if (d < sepDist) {
          sepX += dx / d;
          sepY += dy / d;
          sepCount++;
        }
      }
    }

    for (const [px, py] of predators) {
      const dx = xi - px,
        dy = yi - py;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < dangerRadius) {
        const strength = (dangerRadius - d) / dangerRadius;
        fleeX += (dx / d) * strength;
        fleeY += (dy / d) * strength;
      }
    }

    let ax = 0,
      ay = 0;
    if (sepCount > 0) {
      ax += (sepX / sepCount) * wSep;
      ay += (sepY / sepCount) * wSep;
    }
    if (neighborCount > 0) {
      const [aliXn, aliYn] = limit(
        aliX / neighborCount,
        aliY / neighborCount,
        maxForce,
      );
      ax += aliXn * wAli;
      ay += aliYn * wAli;
      const [cx, cy] = limit(
        cohX / neighborCount - xi,
        cohY / neighborCount - yi,
        maxForce,
      );
      ax += cx * wCoh;
      ay += cy * wCoh;
    }
    ax += fleeX * wFlee;
    ay += fleeY * wFlee;

    const [nvx, nvy] = limit(vxi + ax, vyi + ay, maxSpeed);
    newPrey.push([xi + nvx, yi + nvy, nvx, nvy]);
  }

  const newPredators: Agent[] = predators.map(([px, py, pvx, pvy]) => {
    let nearest = prey[0];
    let nearestDist = Infinity;
    for (const p of prey) {
      const d = Math.hypot(p[0] - px, p[1] - py);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    const dx = nearest[0] - px,
      dy = nearest[1] - py;
    const d = Math.hypot(dx, dy);
    const [tvx, tvy] =
      d > 0 ? [(dx / d) * predatorSpeed, (dy / d) * predatorSpeed] : [pvx, pvy];
    return [px + tvx, py + tvy, tvx, tvy];
  });

  return { prey: newPrey, predators: newPredators };
}
```
