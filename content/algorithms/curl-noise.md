---
name: カールノイズ(Curl Noise)
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: 1点あたり O(1)(ノイズ評価の定数倍)
summary: スカラーのノイズの「回転」を取って、渦を巻くようにうねる(発散しない)流れの場を作り、粒子を自然に動かす手法。
---

## 概要

煙や炎、魔法のエフェクトの粒子を動かすとき、乱数で速度を決めると粒子がバラバラに散ってしまい、流れらしく見えません。かといって、ノイズの値をそのまま速度に使うと、粒子が一か所に集まったり、逆に湧き出したりしてしまいます。

**カールノイズ**は、ノイズの値そのものではなく**ノイズの勾配を90度回した向き**(2次元では「回転(カール)」)を速度にすることで、**渦を巻くようにうねりつつ、粒子が一点に溜まらない流れの場**を作ります。2007年に Bridson らが、手続き的な流体の流れを安く作る方法として提案しました(R. Bridson, J. Hourihan, M. Nordenstam, "Curl-noise for procedural fluid flow", ACM SIGGRAPH 2007)。

生まれた目的は、流体シミュレーションを回さずに、**流体らしい動き**をリアルタイムで作ることです。

## 仕組み

2次元では、スカラーのポテンシャル(なめらかなノイズ)ψ(x, y) を用意し、その偏微分から速度を作ります。

v(x, y) = ( ∂ψ/∂y , −∂ψ/∂x )

1. ポテンシャル ψ をノイズ(パーリンノイズなど)で決める。
2. 各位置で ψ の偏微分を差分で求める(小さな h だけずらして (ψ(x, y+h) − ψ(x, y−h)) / 2h など)。
3. 勾配を90度回した (∂ψ/∂y, −∂ψ/∂x) を速度とする。
4. 粒子はこの速度に沿って少しずつ動かす。

この速度は**発散がゼロ**(∂vx/∂x + ∂vy/∂y = 0)になります。これは非圧縮の流体と同じ性質で、粒子が特定の場所に集まったり湧き出したりしないので、流れらしく見えます。

## 特性・トレードオフ

- **計算量**: 1点あたり、ノイズの評価を数回(差分の分)行うだけで O(1)。流体シミュレーションより桁違いに軽い。
- **発散しない流れ**: 粒子が一点に溜まらない。見た目が自然で、エフェクトに向く。
- **物理的に正しいわけではない**: 本物の流体の方程式を解いているのではなく、流体らしい性質(発散ゼロ)を持つ流れを作っているだけ。障害物との相互作用は、ポテンシャルを壁の近くで抑える工夫が要る。
- **時間変化を足せる**: ノイズに時間の軸を加えると、流れそのものがゆっくり変化する。
- **使いどころ**: ゲームの煙・火花・魔法のパーティクル、背景の漂う粒子、群れの動きに揺らぎを足す演出。

## 実装例

```python
import math

H = 1e-3  # 偏微分を差分で求めるときの刻み幅


def potential(x: float, y: float) -> float:
    # 説明用に、なめらかなsinの和をポテンシャルの代わりに使う
    # (実際の制作ではパーリンノイズなどのなめらかなノイズを使う)
    return math.sin(1.3 * x + 0.7 * y) + 0.5 * math.sin(2.1 * y - 1.1 * x + 1.0)


def curl_velocity(x: float, y: float) -> tuple[float, float]:
    dpsi_dy = (potential(x, y + H) - potential(x, y - H)) / (2 * H)
    dpsi_dx = (potential(x + H, y) - potential(x - H, y)) / (2 * H)
    return (dpsi_dy, -dpsi_dx)  # 勾配を90度回した向き


def advect(p: tuple[float, float], dt: float, steps: int) -> list[tuple[float, float]]:
    path = [p]
    for _ in range(steps):
        vx, vy = curl_velocity(*path[-1])
        path.append((path[-1][0] + vx * dt, path[-1][1] + vy * dt))
    return path
```

```typescript
const H = 1e-3; // 偏微分を差分で求めるときの刻み幅

function potential(x: number, y: number): number {
  // 説明用に、なめらかなsinの和をポテンシャルの代わりに使う
  // (実際の制作ではパーリンノイズなどのなめらかなノイズを使う)
  return Math.sin(1.3 * x + 0.7 * y) + 0.5 * Math.sin(2.1 * y - 1.1 * x + 1.0);
}

function curlVelocity(x: number, y: number): { vx: number; vy: number } {
  const dpsiDy = (potential(x, y + H) - potential(x, y - H)) / (2 * H);
  const dpsiDx = (potential(x + H, y) - potential(x - H, y)) / (2 * H);
  return { vx: dpsiDy, vy: -dpsiDx }; // 勾配を90度回した向き
}

function advect(
  start: { x: number; y: number },
  dt: number,
  steps: number,
): { x: number; y: number }[] {
  const path = [start];
  for (let i = 0; i < steps; i++) {
    const last = path[path.length - 1];
    const { vx, vy } = curlVelocity(last.x, last.y);
    path.push({ x: last.x + vx * dt, y: last.y + vy * dt });
  }
  return path;
}
```
