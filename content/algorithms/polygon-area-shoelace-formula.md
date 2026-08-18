---
name: 靴ひも公式(Shoelace Formula)による多角形面積計算
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n)
summary: 多角形の頂点座標を隣接ペアごとの外積の総和にまとめることで、単純多角形の符号付き面積をO(n)で直接求める公式。
---

## 概要

単純多角形(自己交差のない多角形、凸でも凹でもよい)の頂点座標が反時計回りまたは時計回りの順に与えられているとき、その面積を求めたい場面は非常に多い(GISにおける区画面積の算出、CGでの図形描画、多角形の向き判定など)。靴ひも公式(Shoelace Formula、ガウスの面積公式とも呼ばれる)は、**頂点座標を斜めに掛け合わせて足し合わせる**という単純な計算だけで、多角形を三角形に分割することなく、O(n)で面積を直接求められる公式である。頂点を順に線でつなぎ、対角に掛け算の線を引く様子が靴ひもを交差させて結ぶように見えることからこの名がついた。

## 仕組み

頂点が`(x_0, y_0), (x_1, y_1), ..., (x_{n-1}, y_{n-1})`と順番に(反時計回りまたは時計回りに)与えられているとき、符号付き面積`A`は次の式で求まる。

`A = (1/2) * Σ_{i=0}^{n-1} (x_i * y_{i+1} - x_{i+1} * y_i)`

(添字は`n`で割った余りとして扱い、最後の頂点`n-1`の次は最初の頂点`0`に戻る)

**この式が成り立つ理屈**: `x_i * y_{i+1} - x_{i+1} * y_i`は、原点と頂点`i`、頂点`i+1`が作る三角形の**符号付き面積の2倍**(外積に相当)にあたる。多角形の全ての辺についてこの「原点からの符号付き三角形」を足し合わせると、多角形の外側にある余分な部分同士がちょうど正負で打ち消し合い、多角形自体の面積だけが残る、というのがこの公式の背後にある幾何学的な仕組みである。原点をどこに取っても(多角形の内部・外部いずれでも)結果は変わらない。

1. 総和`S = 0`で初期化する
2. 各頂点`i`(0から`n-1`まで)について、`S += x_i * y_{i+1} - x_{i+1} * y_i`を計算する(`i = n-1`のときは`y_{i+1}`は`y_0`)
3. 面積は`|S| / 2`。符号付き面積そのものが必要な場合は`S / 2`をそのまま使う

## 特性・トレードオフ

- **頂点の回転方向と符号の関係**: 頂点が**反時計回り**に並んでいれば符号付き面積`A`は正、**時計回り**に並んでいれば負になる。この性質を逆手に取ると、「符号付き面積の符号を見るだけで、多角形の頂点列が反時計回りか時計回りかを判定できる」という実務上非常に便利な副産物が得られる。[グラハムスキャン](/algorithms/graham-scan)や[サザーランド・ホッジマン法](/algorithms/polygon-clipping-sutherland-hodgman)など、頂点の回転方向を前提とするアルゴリズムの前処理・検証にもよく使われる
- **計算量**: O(n)。頂点列を1回走査するだけで済み、三角形分割のような追加の前処理を必要としない、非常に軽量な公式
- **単純多角形が前提**: 自己交差する多角形に対して靴ひも公式を適用すると、交差によって生じる重なり合った領域の符号が相殺してしまい、直感的な「面積」とは異なる値になる。正しい面積を得るには入力が単純多角形であることが前提になる
- **使いどころ**: GISにおける土地区画・行政区域の面積計算、CGでのポリゴンの向き(表裏)判定、多角形の重心計算(靴ひも公式の各項を重み付き平均する形で拡張できる)、[ドロネー三角形分割](/algorithms/delaunay-triangulation)や凸包アルゴリズムにおける三角形の符号付き面積判定(向き判定)の基礎

## 実装例

```python
Point = tuple[float, float]


def shoelace_area(polygon: list[Point]) -> float:
    """単純多角形(反時計回りなら正、時計回りなら負)の符号付き面積を求める。"""
    n = len(polygon)
    total = 0.0
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return total / 2.0


def polygon_area(polygon: list[Point]) -> float:
    """絶対値の面積(符号を問わない)を返す。"""
    return abs(shoelace_area(polygon))


def is_counterclockwise(polygon: list[Point]) -> bool:
    """符号付き面積が正なら反時計回り、負なら時計回りと判定する。"""
    return shoelace_area(polygon) > 0
```

```typescript
type Point = [number, number];

// 単純多角形(反時計回りなら正、時計回りなら負)の符号付き面積を求める
function shoelaceArea(polygon: Point[]): number {
  const n = polygon.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % n];
    total += x1 * y2 - x2 * y1;
  }
  return total / 2;
}

// 絶対値の面積(符号を問わない)を返す
function polygonArea(polygon: Point[]): number {
  return Math.abs(shoelaceArea(polygon));
}

// 符号付き面積が正なら反時計回り、負なら時計回りと判定する
function isCounterclockwise(polygon: Point[]): boolean {
  return shoelaceArea(polygon) > 0;
}
```
