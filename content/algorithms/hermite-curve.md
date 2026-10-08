---
name: エルミート曲線(Hermite Curve)
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: 1点あたり O(1)(n点の描画は O(n))
summary: 両端の位置と、そこでの向き(接線)だけから、なめらかな3次曲線を決める補間法。
---

## 概要

エルミート曲線は、**始点と終点の位置**と、**そこでの向き(接線ベクトル)**の4つを与えると、その4つを必ず守る3次曲線が一つに決まる補間法です。名前はフランスの数学者シャルル・エルミートに由来します。

生まれた目的は、点を結ぶだけの折れ線では「途中でいきなり向きが変わる」ことを避け、**位置だけでなく向きもなめらかにつなぐ**ことです。ロボットの軌道、キャラクターの移動経路、アニメーションのキー補間など、「ここを、この向きで通過してほしい」という要求がある場面でよく使われます。

## 仕組み

パラメータ t を 0 から 1 まで動かし、4つの値を重みを付けて混ぜます。

h(t) = h00(t)·P0 + h10(t)·m0 + h01(t)·P1 + h11(t)·m1

- P0, P1: 始点と終点の位置
- m0, m1: 始点と終点での接線(進む向きと勢い)
- 重み(基底関数): h00 = 2t³−3t²+1、h10 = t³−2t²+t、h01 = −2t³+3t²、h11 = t³−t²

t=0 のとき h00 だけが 1 になって P0 を通り、t=1 のとき h01 だけが 1 になって P1 を通ります。接線の長さを大きくすると、その向きに長く引っ張られて曲線が大きく膨らみます。

複数の区間をつなぐときは、つなぎ目で接線を共有すると、位置と向きがどちらも連続したなめらかな曲線になります。

## 特性・トレードオフ

- **計算量**: 1点の評価は掛け算と足し算だけで O(1)。n点を描くなら O(n)。
- **向きを直接指定できる**: ベジェ曲線は制御点で間接的に向きを決めるのに対し、エルミート曲線は接線そのものを与える。端点での向きがはっきりしている場面に向く(エルミート曲線の接線 m は、ベジェの制御点で言えば 3×(制御点−端点) に対応する)。
- **接線の決め方が仕事になる**: 接線をどう与えるかで曲線の見た目が変わる。長すぎると膨らみすぎ、短すぎると折れ線に近くなる。
- **通過点を守る**: 端点は必ず通る。途中の点を通したいときは、区間を分けて、つなぎ目の接線を共有する。
- **使いどころ**: ロボットや車両の軌道生成、キャラクターの経路、アニメーションのキー補間、追尾の会合点へ向かう経路の滑らかな表現。

## 実装例

```python
def hermite_point(
    t: float,
    p0: tuple[float, float],
    m0: tuple[float, float],
    p1: tuple[float, float],
    m1: tuple[float, float],
) -> tuple[float, float]:
    t2, t3 = t * t, t * t * t
    h00 = 2 * t3 - 3 * t2 + 1
    h10 = t3 - 2 * t2 + t
    h01 = -2 * t3 + 3 * t2
    h11 = t3 - t2
    return (
        h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
        h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
    )


def hermite_curve(
    p0: tuple[float, float],
    m0: tuple[float, float],
    p1: tuple[float, float],
    m1: tuple[float, float],
    samples: int = 20,
) -> list[tuple[float, float]]:
    return [hermite_point(i / samples, p0, m0, p1, m1) for i in range(samples + 1)]


# 始点(1,1)から上向きに出て、終点(9,2)に下向きに着く曲線
curve = hermite_curve((1, 1), (0, 8), (9, 2), (0, -8))
```

```typescript
type Vec2 = { x: number; y: number };

function hermitePoint(t: number, p0: Vec2, m0: Vec2, p1: Vec2, m1: Vec2): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    x: h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
    y: h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
  };
}

function hermiteCurve(
  p0: Vec2,
  m0: Vec2,
  p1: Vec2,
  m1: Vec2,
  samples = 20,
): Vec2[] {
  return Array.from({ length: samples + 1 }, (_, i) =>
    hermitePoint(i / samples, p0, m0, p1, m1),
  );
}

// 始点(1,1)から上向きに出て、終点(9,2)に下向きに着く曲線
const curve = hermiteCurve(
  { x: 1, y: 1 },
  { x: 0, y: 8 },
  { x: 9, y: 2 },
  { x: 0, y: -8 },
);
```
