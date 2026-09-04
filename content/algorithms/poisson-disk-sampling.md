---
name: ポアソンディスクサンプリング (Poisson Disk Sampling)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(n)(nは生成する点数、空間分割グリッド利用時)
summary: 「互いに最小距離以上離れている」点群をランダムかつ均質に生成する、木や草の自動配置に使われるサンプリング手法。
---

## 概要

森の木や草原の草を単純な一様乱数で配置すると、確率的に点が偏って密集する場所と何もない場所が不自然に混在してしまう。一方、格子状に等間隔で配置すると今度は機械的な規則性が目立ってしまい自然さが失われる。ポアソンディスクサンプリングは、この2つの欠点を避けるため「どの2点間の距離も指定した最小距離`r`以上離れている」という制約を満たしながら空間をできるだけ均一かつランダムに埋め尽くす点群を生成する手法である。Robert Bridsonが2007年に発表した「高速ポアソンディスクサンプリング」アルゴリズムはO(n)時間で実用的にこれを実現し、木・草・岩などの自然物の自動配置や、スターフィールドの星の分布、テクスチャのブルーノイズディザリングなど、幅広い用途で使われている。

## 仕組み(Bridsonのアルゴリズム)

1. 空間を一辺`r/√2`のセルからなる背景グリッドに分割する(このセルサイズなら各セルに最大1点しか入らないことが保証される)
2. 最初の点をランダムに1つ選び、「アクティブリスト」に加えるとともにグリッドに登録する
3. アクティブリストからランダムに1点を選び、その点を中心とする半径`r`〜`2r`の環状領域に候補点を`k`個(通常30個程度)ランダムに生成する
4. 各候補点について、背景グリッドを使って近傍セルだけを調べ、既存のどの点とも距離`r`以上離れているかを検証する。条件を満たす候補が見つかればそれを新しい点として採用し、アクティブリストとグリッドに追加する
5. 選んだアクティブ点から`k`回試して有効な候補が1つも見つからなければ、その点をアクティブリストから除外する(もう新しい点の起点として使えないと判断する)
6. アクティブリストが空になるまで3〜5を繰り返す。これにより空間が最小距離制約を満たしたまま均一に点で埋め尽くされる

## 特性・トレードオフ

- **計算量**: 背景グリッドによる近傍検索の効果で、点の総数`n`に対して期待`O(n)`時間で生成できる(Bridsonのアルゴリズムの主な貢献)
- **均一性とランダム性の両立**: 単純な乱数配置(クラスタが生じる)と格子配置(規則的すぎる)の中間的な性質を持ち、自然物の分布として最も「それらしく」見える
- **最小距離の調整可能性**: `r`を場所ごとに変えることで密度分布を制御でき、密林と疎林が入り混じった地形など、より複雑な自然さの表現にも応用できる
- **使いどころ**: 木・草・岩・群衆キャラクターなど自然物やモブの自動配置、ブルーノイズテクスチャの生成、モンテカルロレンダリングでのサンプリング点分布の改善など

## 実装例

Bridsonのアルゴリズムを2次元平面上に実装する。背景グリッドで近傍点のみを効率的に検証する点が要点。

```python
import math
import random


def poisson_disk_sampling(
    width: float, height: float, min_dist: float, k: int = 30
) -> list[tuple[float, float]]:
    cell_size = min_dist / math.sqrt(2)
    grid_w = int(width / cell_size) + 1
    grid_h = int(height / cell_size) + 1
    grid: list[list[tuple[float, float] | None]] = [[None] * grid_h for _ in range(grid_w)]

    def grid_coords(p: tuple[float, float]) -> tuple[int, int]:
        return int(p[0] / cell_size), int(p[1] / cell_size)

    def is_valid(p: tuple[float, float]) -> bool:
        if not (0 <= p[0] < width and 0 <= p[1] < height):
            return False
        gx, gy = grid_coords(p)
        for nx in range(max(gx - 2, 0), min(gx + 3, grid_w)):
            for ny in range(max(gy - 2, 0), min(gy + 3, grid_h)):
                neighbor = grid[nx][ny]
                if neighbor is not None:
                    if math.hypot(p[0] - neighbor[0], p[1] - neighbor[1]) < min_dist:
                        return False
        return True

    first = (random.uniform(0, width), random.uniform(0, height))
    points = [first]
    active = [first]
    gx, gy = grid_coords(first)
    grid[gx][gy] = first

    while active:
        idx = random.randrange(len(active))
        origin = active[idx]
        found = False

        for _ in range(k):
            angle = random.uniform(0, 2 * math.pi)
            radius = random.uniform(min_dist, 2 * min_dist)
            candidate = (origin[0] + radius * math.cos(angle), origin[1] + radius * math.sin(angle))
            if is_valid(candidate):
                points.append(candidate)
                active.append(candidate)
                cx, cy = grid_coords(candidate)
                grid[cx][cy] = candidate
                found = True
                break

        if not found:
            active.pop(idx)  # このアクティブ点からはもう有効な候補が見つからない

    return points
```

```typescript
function poissonDiskSampling(
  width: number,
  height: number,
  minDist: number,
  k = 30,
): Array<[number, number]> {
  const cellSize = minDist / Math.SQRT2;
  const gridW = Math.floor(width / cellSize) + 1;
  const gridH = Math.floor(height / cellSize) + 1;
  const grid: Array<Array<[number, number] | null>> = Array.from(
    { length: gridW },
    () => new Array(gridH).fill(null),
  );

  const gridCoords = (p: [number, number]): [number, number] => [
    Math.floor(p[0] / cellSize),
    Math.floor(p[1] / cellSize),
  ];

  const isValid = (p: [number, number]): boolean => {
    if (!(p[0] >= 0 && p[0] < width && p[1] >= 0 && p[1] < height))
      return false;
    const [gx, gy] = gridCoords(p);
    for (let nx = Math.max(gx - 2, 0); nx < Math.min(gx + 3, gridW); nx++) {
      for (let ny = Math.max(gy - 2, 0); ny < Math.min(gy + 3, gridH); ny++) {
        const neighbor = grid[nx][ny];
        if (
          neighbor &&
          Math.hypot(p[0] - neighbor[0], p[1] - neighbor[1]) < minDist
        )
          return false;
      }
    }
    return true;
  };

  const first: [number, number] = [
    Math.random() * width,
    Math.random() * height,
  ];
  const points: Array<[number, number]> = [first];
  const active: Array<[number, number]> = [first];
  const [fx, fy] = gridCoords(first);
  grid[fx][fy] = first;

  while (active.length > 0) {
    const idx = Math.floor(Math.random() * active.length);
    const origin = active[idx];
    let found = false;

    for (let i = 0; i < k; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = minDist + Math.random() * minDist;
      const candidate: [number, number] = [
        origin[0] + radius * Math.cos(angle),
        origin[1] + radius * Math.sin(angle),
      ];
      if (isValid(candidate)) {
        points.push(candidate);
        active.push(candidate);
        const [cx, cy] = gridCoords(candidate);
        grid[cx][cy] = candidate;
        found = true;
        break;
      }
    }

    if (!found) active.splice(idx, 1); // このアクティブ点からはもう有効な候補が見つからない
  }

  return points;
}
```
