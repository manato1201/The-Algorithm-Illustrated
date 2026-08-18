---
name: Andrewのモノトーンチェイン法(凸包)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n log n)
summary: 点をx座標でソートしてから上側と下側の凸包を1回ずつの走査で構築する、角度計算を必要としない凸包アルゴリズム。
---

## 概要

[グラハムスキャン](/algorithms/graham-scan)は「基準点からの角度順」に点をソートしてから凸包を構築するが、A. M. Andrewが1979年に発表したモノトーンチェイン法(Monotone Chain, Andrew's Algorithm とも呼ばれる)は、**点をx座標(単純な数値)でソートするだけ**で同じO(n log n)の凸包を構築できる。凸包の輪郭を「x座標に対して単調に上昇/下降する2本の鎖(チェイン)」——**上側の鎖**と**下側の鎖**——に分けて別々に構築し、最後につなぎ合わせるという発想から「モノトーンチェイン」と呼ばれる。三角関数を一切使わずに実装できるため、数値誤差に強く実装もシンプルになる、実務でよく使われる凸包アルゴリズムのひとつ。

## 仕組み

1. 全ての点をx座標の昇順(同じx座標ならy座標の昇順)でソートする
2. **下側の凸包(lower hull)を構築する**: ソート済みの点を先頭から順に見ていき、スタックに積む。新しい点を追加する前に、スタックの末尾2点と新しい点でできる曲がりが**右回り(時計回り)でない(=左に曲がるか直線)**なら、末尾の点をスタックから取り除く。これをグラハムスキャンと同様の要領で繰り返しながら全点を処理する
3. **上側の凸包(upper hull)を構築する**: 今度はソート済みの点を**末尾から先頭へ**(逆順に)見ていき、手順2と全く同じロジックでスタックに積んでいく
4. 下側の鎖と上側の鎖(それぞれ両端の重複点を除く)をつなぎ合わせると、反時計回りに並んだ凸包の全頂点が得られる

グラハムスキャンとの決定的な違いは、**「どちら向きに曲がっているか」を判定する外積計算だけで済み、`atan2`のような角度計算(三角関数)を一切必要としない**点にある。x座標でのソートは`(x, y)`のペアを直接比較するだけでよく、基準点からの偏角を計算する必要がないため、実装が単純になり浮動小数点の角度計算に起因する誤差も避けられる。

## 特性・トレードオフ

- **計算量**: O(n log n)。x座標によるソートが支配的で、上下の鎖の構築はそれぞれO(n)(各点は高々1回積まれ、高々1回取り除かれる、いわゆる amortized O(1) の操作)
- **グラハムスキャンとの実装上の違い**: グラハムスキャンは基準点からの角度でソートするため`atan2`の呼び出しと同一角度上の点の距離比較が必要になるが、モノトーンチェイン法は座標の辞書式順序で並べるだけでよい。ソート自体の考え方がシンプルなため、実務のライブラリやコンテストプログラミングでは好んでこちらが使われることが多い
- **数値的な安定性**: 角度計算を避けられる分、浮動小数点誤差の発生源が外積の符号判定のみに絞られ、誤差対策(許容誤差`ε`の導入など)がしやすい
- **使いどころ**: 幾何ライブラリの標準的な凸包実装、他の走査線アルゴリズムの前処理、コンテストプログラミングでの凸包構築。[Chanのアルゴリズム](/algorithms/chan-algorithm)における小グループごとの部分凸包の構築にも、グラハムスキャンの代わりにこの手法を使うことができる

## 実装例

```python
Point = tuple[float, float]


def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def monotone_chain(points: list[Point]) -> list[Point]:
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    # 下側の鎖: 先頭から順に走査
    lower: list[Point] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    # 上側の鎖: 末尾から逆順に走査
    upper: list[Point] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    # 両端の重複点(各鎖の始点・終点)を除いて連結する
    return lower[:-1] + upper[:-1]
```

```typescript
type Point = [number, number];

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function monotoneChain(pointsIn: Point[]): Point[] {
  const seen = new Set<string>();
  const pts: Point[] = [];
  for (const p of pointsIn) {
    const key = `${p[0]},${p[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      pts.push(p);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;

  // 下側の鎖: 先頭から順に走査
  const lower: Point[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  // 上側の鎖: 末尾から逆順に走査
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // 両端の重複点(各鎖の始点・終点)を除いて連結する
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
```
