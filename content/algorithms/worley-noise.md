---
name: ウォーリーノイズ (Worley Noise / セルラーノイズ)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(1)(1点あたり、近傍セル数に依存)
summary: 空間にランダムな特徴点を散布し最近傍点までの距離から模様を作る、石畳や生物組織に似た模様を生む点ベースのノイズ。
---

## 概要

[パーリンノイズ](/algorithms/perlin-noise)が格子点の勾配ベクトルを補間して「滑らかな起伏」を作るのに対し、1996年にSteven Worleyが考案したウォーリーノイズ(セルラーノイズ、ボロノイノイズとも呼ばれる)は全く異なるアプローチを取る。空間中にランダムな「特徴点」をばらまき、任意の点についてその点から最も近い(あるいはn番目に近い)特徴点までの距離を計算することでノイズ値を得る。この距離ベースの構造は石畳・ひび割れ・生物の細胞組織・爬虫類の鱗模様のような、なめらかな起伏ではなく「セル(区画)」で区切られた模様を自然に生み出す。ゲームやCGでは岩肌や水面の反射模様、有機的なテクスチャの生成に頻繁に使われている。

## 仕組み

1. 空間を格子状のセルに分割し、各セルに1個(または複数個)のランダムな特徴点を、決定論的なハッシュ関数でセルの座標から生成する(同じセルには常に同じ特徴点が対応する)
2. ノイズ値を求めたい点`P`について、`P`が属するセルとその周囲の隣接セル(2次元なら3x3=9セル)に含まれる特徴点だけを候補として調べる。特徴点は各セルに1個しか置かれないため、これで最近傍点を見逃さずに済む
3. 候補となる特徴点それぞれについて`P`との距離(ユークリッド距離、マンハッタン距離、チェビシェフ距離など距離関数は用途で選べる)を計算する
4. 最も近い特徴点までの距離(F1)、あるいは2番目に近い特徴点までの距離(F2)や`F2 - F1`などを最終的なノイズ値として採用する。F1は丸みを帯びたセル模様、F2-F1はセルの境界線(ひび割れのような細い線)を強調した模様になる
5. 用途に応じて距離関数や採用する順位(F1, F2, ...)、特徴点の分布密度を調整することで、石畳・ひび割れ・生体組織など多様な模様を作り分ける

## 特性・トレードオフ

- **計算量**: 1点あたり近傍セル内の特徴点数(通常一桁)との距離計算のみで済むため`O(1)`とみなせる。パーリンノイズと同様にリアルタイム生成に向く
- **視覚的な特徴**: パーリンノイズの滑らかな起伏と異なり、境界がはっきりした「区画」を作る。地形の起伏よりも岩・鉱物・生物の表面テクスチャ、氷のひび割れなどの表現に適する
- **距離関数による多様性**: ユークリッド距離は丸いセル、マンハッタン距離は菱形のセル、チェビシェフ距離は正方形のセルになるなど、距離関数を変えるだけで模様の印象を大きく変えられる
- **使いどころ**: 岩肌・水たまりの模様・爬虫類の鱗・細胞状のダメージテクスチャなど。地形の高さマップには連続的な起伏を生む[パーリンノイズ](/algorithms/perlin-noise)の方が適することが多く、目的に応じて使い分ける

## 実装例

3x3の隣接セルだけを走査してF1(最近傍距離)を計算する2次元ウォーリーノイズを実装する。

```python
import math


def _hash_to_point(cell_x: int, cell_y: int, seed: int) -> tuple[float, float]:
    """セル座標から決定論的にセル内の特徴点の相対位置(0〜1)を生成する"""
    h1 = (cell_x * 374761393 + cell_y * 668265263 + seed * 69069) & 0xFFFFFFFF
    h2 = (h1 ^ (h1 >> 13)) * 1274126177 & 0xFFFFFFFF
    fx = ((h1 & 0xFFFF) / 0xFFFF)
    fy = ((h2 & 0xFFFF) / 0xFFFF)
    return fx, fy


def worley_f1(x: float, y: float, seed: int = 0) -> float:
    """点(x, y)から最も近い特徴点までの距離(F1)を返す"""
    cell_x, cell_y = math.floor(x), math.floor(y)
    min_dist = math.inf

    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            neighbor_x, neighbor_y = cell_x + dx, cell_y + dy
            fx, fy = _hash_to_point(neighbor_x, neighbor_y, seed)
            point_x = neighbor_x + fx
            point_y = neighbor_y + fy
            dist = math.hypot(x - point_x, y - point_y)
            min_dist = min(min_dist, dist)

    return min_dist
```

```typescript
function hashToPoint(cellX: number, cellY: number, seed: number): [number, number] {
  // セル座標から決定論的にセル内の特徴点の相対位置(0〜1)を生成する
  const h1 = (cellX * 374761393 + cellY * 668265263 + seed * 69069) >>> 0;
  const h2 = ((h1 ^ (h1 >>> 13)) * 1274126177) >>> 0;
  const fx = (h1 & 0xffff) / 0xffff;
  const fy = (h2 & 0xffff) / 0xffff;
  return [fx, fy];
}

function worleyF1(x: number, y: number, seed = 0): number {
  // 点(x, y)から最も近い特徴点までの距離(F1)を返す
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  let minDist = Infinity;

  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      const neighborX = cellX + dx;
      const neighborY = cellY + dy;
      const [fx, fy] = hashToPoint(neighborX, neighborY, seed);
      const pointX = neighborX + fx;
      const pointY = neighborY + fy;
      const dist = Math.hypot(x - pointX, y - pointY);
      minDist = Math.min(minDist, dist);
    }
  }

  return minDist;
}
```
