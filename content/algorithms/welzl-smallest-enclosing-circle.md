---
name: ウェルツル法(最小包含円)
category: 計算幾何
subcategory: 分割統治・走査
complexity: 期待 O(n)(点をランダムな順に並べた場合)
summary: 平面上の点をすべて含む最小の円を、点を1つずつ加えながら「円の周上に必ず来る点」を絞り込んで求める。期待線形時間のランダム化アルゴリズム。
---

## 概要

点の集合を覆う最小の円(最小包含円)は、衝突判定のための境界円、配置の中心の決定、施設の最適な立地(どこに置けば最遠の顧客までの距離が最小か)、ゲームのバウンディングスフィアなどに使われる。素朴には「周上に来る2点または3点のすべての組」を試せば求まるが、O(n⁴) かかる。

ウェルツル(Emo Welzl、1991年)は、次の観察で期待線形時間のアルゴリズムを示した。**点 `p` が、他の点で作った最小包含円の外にあるなら、全体の最小包含円の周上には必ず `p` が乗る**。この性質で、周上に乗ることが確定した点の集合を増やしながら、問題を小さく分解していける。点の処理順をランダムにしておけば、「円を作り直す」ことが起きる回数の期待値が小さくなり、全体で期待 O(n) になる。

## 仕組み

点を乱順にして、次の入れ子のループで円 `C` を更新する(周上の点を2個まで確定させる反復版)。

1. 点 `p₁, p₂, ..., pₙ` を順に見る。`pᵢ` が現在の円の内側(境界を含む)なら何もしない
2. `pᵢ` が外側なら、`pᵢ` は最小円の周上にある。`C` を「`pᵢ` だけの円(半径0)」にして、`p₁..pᵢ₋₁` を見直す
   - `pⱼ`(`j < i`)が `C` の外なら、`pᵢ` と `pⱼ` は両方とも周上にある。`C` を「`pᵢ` と `pⱼ` を直径とする円」にして、`p₁..pⱼ₋₁` を見直す
     - `pₖ`(`k < j`)が `C` の外なら、3点 `pᵢ, pⱼ, pₖ` が周上にある。`C` を「3点を通る円(外接円)」にする
3. 最後に得られた `C` が全点を含む最小の円

3点が一直線上にあるときは外接円が定義できないので、この場合は3点のうち最も離れた2点を直径とする円を使う。

## 特性・トレードオフ

- **期待線形時間**: 最悪は O(n³) 相当だが、ランダムに並べ直せば、円の更新が起きる確率が `3/i` 程度に抑えられ、期待で O(n)。並べ替えを省くと、整列された入力などで性能が崩れる
- **一意性**: 最小包含円は常にただ1つ。2点または3点が周上で決まる
- **次元の一般化**: 同じ発想が、d 次元の最小包含球に拡張できる(周上の点は最大 d+1 個)。実装は円より複雑になる
- **浮動小数点の注意**: 「円の内側」の判定に許容誤差(epsilon)が要る。外接円の中心の計算は、3点が一直線に近いと数値的に不安定になる
- **使いどころ**: バウンディングサークル・スフィアの生成、配置問題(1-センター問題)、データの外れ値を含む範囲の可視化

## 実装例

```python
import random
from math import dist, hypot


def circle_from_two(a, b):
    c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    return c, dist(a, b) / 2


def circle_from_three(a, b, c):
    bx, by = b[0] - a[0], b[1] - a[1]
    cx, cy = c[0] - a[0], c[1] - a[1]
    d = 2 * (bx * cy - by * cx)
    if abs(d) < 1e-12:  # ほぼ一直線: 最も離れた2点を直径にする
        return max((circle_from_two(a, b), circle_from_two(a, c), circle_from_two(b, c)), key=lambda t: t[1])
    ux = (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / d
    uy = (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / d
    return (a[0] + ux, a[1] + uy), hypot(ux, uy)


def inside(circle, p, eps=1e-9):
    return dist(circle[0], p) <= circle[1] + eps


def smallest_enclosing_circle(points, seed=0):
    pts = list(points)
    random.Random(seed).shuffle(pts)
    c = None
    for i, p in enumerate(pts):
        if c is None or not inside(c, p):
            c = (p, 0.0)
            for j in range(i):
                if not inside(c, pts[j]):
                    c = circle_from_two(p, pts[j])
                    for k in range(j):
                        if not inside(c, pts[k]):
                            c = circle_from_three(p, pts[j], pts[k])
    return c


center, radius = smallest_enclosing_circle([(0, 0), (4, 0), (0, 3), (1, 1), (2, 2)])
print(center, radius)  # (2.0, 1.5) 2.5
```

```typescript
type Pt = [number, number];
type Circle = { c: Pt; r: number };

const d2 = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fromTwo = (a: Pt, b: Pt): Circle => ({
  c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  r: d2(a, b) / 2,
});

function fromThree(a: Pt, b: Pt, c: Pt): Circle {
  const bx = b[0] - a[0],
    by = b[1] - a[1];
  const cx = c[0] - a[0],
    cy = c[1] - a[1];
  const d = 2 * (bx * cy - by * cx);
  if (Math.abs(d) < 1e-12) {
    return [fromTwo(a, b), fromTwo(a, c), fromTwo(b, c)].reduce((x, y) =>
      y.r > x.r ? y : x,
    );
  }
  const ux = (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / d;
  const uy = (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / d;
  return { c: [a[0] + ux, a[1] + uy], r: Math.hypot(ux, uy) };
}

const inside = (c: Circle, p: Pt): boolean => d2(c.c, p) <= c.r + 1e-9;

function smallestEnclosingCircle(points: Pt[]): Circle {
  const pts = [...points];
  let seed = 12345; // 固定シードの簡易乱数で並べ替える
  for (let i = pts.length - 1; i > 0; i--) {
    seed = (Math.imul(1103515245, seed) + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  let c: Circle | null = null;
  for (let i = 0; i < pts.length; i++) {
    if (c === null || !inside(c, pts[i])) {
      c = { c: pts[i], r: 0 };
      for (let j = 0; j < i; j++) {
        if (!inside(c, pts[j])) {
          c = fromTwo(pts[i], pts[j]);
          for (let k = 0; k < j; k++) {
            if (!inside(c, pts[k])) c = fromThree(pts[i], pts[j], pts[k]);
          }
        }
      }
    }
  }
  return c!;
}

console.log(
  smallestEnclosingCircle([
    [0, 0],
    [4, 0],
    [0, 3],
    [1, 1],
    [2, 2],
  ]),
); // { c: [2, 1.5], r: 2.5 }
```
