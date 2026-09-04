---
name: 中点変位法 (Midpoint Displacement / Diamond-Square以前の1次元版)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(n)(nは生成する分割点数)
summary: 線分の中点を親の平均値からランダムにずらし再帰的に分割することで、山の稜線や海岸線のようなフラクタル地形断面を作る手法。
---

## 概要

山脈の稜線や海岸線のシルエットは、遠くから見ても近くから見てもギザギザした自己相似的な形状(フラクタル)を持つ。中点変位法は、1本の線分の両端の高さから出発し、中点を「両端の平均値にランダムなずれを加えた値」として決め、それによってできた2本の線分に対して同じ操作を再帰的に繰り返すことで、こうした自己相似な起伏のある1次元プロファイルを生成する。ずれの振幅は再帰が進む(分割が細かくなる)たびに縮小させることで、大きなうねりの上に細かいギザギザが乗った自然な地形断面が得られる。2次元に拡張したものが[ダイヤモンドスクエア法](/algorithms/diamond-square-terrain)であり、中点変位法はその基礎となる1次元的な考え方を理解するのに適したアルゴリズムである。

## 仕組み

1. 線分の両端の高さ`h[0]`と`h[n]`を初期値として与える(山脈の両端の標高など)
2. 線分の中点のインデックス`mid`について、高さを`(h[0] + h[n]) / 2 + ランダムなずれ`として計算する。ずれは平均0の一様分布や正規分布から、現在の区間の幅に応じたスケールで生成する
3. できた2つの部分区間`[0, mid]`と`[mid, n]`それぞれに対して、ずれの振幅を係数(**粗さパラメータ**、通常0〜1の`roughness`または`H`)倍だけ縮小してから同じ操作を再帰的に適用する
4. 区間の幅が1(それ以上分割できない)になるまで再帰を続ける。粗さパラメータが小さいほど滑らかな地形、大きいほどギザギザした荒々しい地形になる
5. 得られた高さの配列を海岸線・山の稜線・スカイラインのシルエットとしてそのまま描画に使うか、法線を計算してレンダリングする

## 特性・トレードオフ

- **計算量**: 全体の分割点数を`n`とすると`O(n)`。木の再帰呼び出し1回ごとに定数個の演算で済むため軽量
- **フラクタル性の制御**: 粗さパラメータ(振幅の減衰率)を変えるだけで滑らかな丘陵から険しい山岳まで幅広い地形の「質感」を制御できる。パラメータをハースト指数`H`として`2^(-H)`で減衰させると数学的なフラクタルブラウン運動に近づく
- **2次元への拡張の限界**: そのまま2次元グリッドの対角線・辺に単純適用すると格子軸に沿った不自然な縞模様(**クリース、creases**)が現れやすく、これを解消するために交互のパターンで中点を計算する[ダイヤモンドスクエア法](/algorithms/diamond-square-terrain)が考案された
- **使いどころ**: 横スクロールゲームの背景の山脈シルエット、海岸線の形状生成、株価チャート風のランダムウォーク的な起伏の生成など、1次元的なプロファイルが必要な場面

## 実装例

再帰的に中点を変位させ、区間の幅に応じてずれの振幅を縮小する1次元中点変位法を実装する。

```python
import random


def midpoint_displacement(
    left: float, right: float, roughness: float = 0.5, iterations: int = 8, seed: int | None = None
) -> list[float]:
    """left, rightを両端とする2^iterations+1個の高さ配列を生成する"""
    rng = random.Random(seed)
    n = 2**iterations
    heights = [0.0] * (n + 1)
    heights[0], heights[n] = left, right

    def displace(start: int, end: int, amplitude: float) -> None:
        if end - start <= 1:
            return
        mid = (start + end) // 2
        average = (heights[start] + heights[end]) / 2
        heights[mid] = average + rng.uniform(-amplitude, amplitude)
        displace(start, mid, amplitude * roughness)
        displace(mid, end, amplitude * roughness)

    displace(0, n, abs(right - left) / 2 + 1.0)
    return heights
```

```typescript
function midpointDisplacement(
  left: number,
  right: number,
  roughness = 0.5,
  iterations = 8,
  rand: () => number = Math.random,
): number[] {
  // left, rightを両端とする2^iterations+1個の高さ配列を生成する
  const n = 2 ** iterations;
  const heights = new Array<number>(n + 1).fill(0);
  heights[0] = left;
  heights[n] = right;

  const displace = (start: number, end: number, amplitude: number): void => {
    if (end - start <= 1) return;
    const mid = Math.floor((start + end) / 2);
    const average = (heights[start] + heights[end]) / 2;
    heights[mid] = average + (rand() * 2 - 1) * amplitude;
    displace(start, mid, amplitude * roughness);
    displace(mid, end, amplitude * roughness);
  };

  displace(0, n, Math.abs(right - left) / 2 + 1.0);
  return heights;
}
```
