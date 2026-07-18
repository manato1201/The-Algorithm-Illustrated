---
name: ラングトンのアリ
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(ステップ数)
summary: 「白マスなら右折して色を反転、黒マスなら左折して色を反転」という2ルールだけから、無秩序を経てやがて規則的な「道」を作り出す。
---

## 概要

グリッド上を歩く仮想の「アリ」が、たった2つのルールだけに従って歩き続けるという、1986年にクリストファー・ラングトンが考案したシンプルなセル・オートマトン。最初の数百ステップは一見ランダムで無秩序な軌跡を描くが、**約1万ステップを過ぎたあたりから突然、規則正しく斜めに伸びていく「ハイウェイ」と呼ばれるパターンに収束する**という、予測不能から秩序への劇的な転換を見せる、複雑系の代表的な題材。

## 仕組み

グリッドの各マスは白か黒の2状態で、アリは常にどこかのマスの上にいて、東西南北いずれかの方向を向いている。

1. アリが今いるマスが**白**なら、その場で**右に90度回転**し、そのマスの色を黒に反転させ、1マス前進する
2. アリが今いるマスが**黒**なら、その場で**左に90度回転**し、そのマスの色を白に反転させ、1マス前進する
3. これを何度も繰り返す

規則はたったこれだけ。最初は真っ白なグリッドから始めても、アリの軌跡は数百〜1万ステップほどの間、複雑で予測のつかない模様を描き続ける(このカオス的な段階を「混沌期」と呼ぶ)。ところが、ある時点を境に、アリは決まった14ステップの周期パターンを繰り返しながら、盤面の隅に向かって一直線に「道(ハイウェイ)」を作り始める——この転換がいつ、なぜ起こるのかは、初期条件から解析的に予測することが極めて難しいとされている。

## 特性・トレードオフ

- **計算量**: O(ステップ数)。1ステップごとの処理は非常に軽量(現在地の色を見て回転・反転・前進するだけ)
- **予測不可能性と決定性の同居**: ルール自体は完全に決定的(同じ状態からは必ず同じ結果になる)であるにもかかわらず、最終的にハイウェイパターンへ収束するかどうかを、シミュレーションを実行せずに事前に予測する一般的な方法は知られていない——単純な規則が生み出す複雑さの好例
- **チューリング完全性**: 複数のアリを使った拡張版では、ライフゲームと同様にチューリング完全であることが示されており、単純なルールの計算能力の高さを裏付けている
- **使いどころ**: 直接の実務応用よりも、複雑系科学・創発現象・カオス理論の教育的なデモンストレーション、生成アートの素材、単純な規則から複雑な挙動が生まれる仕組みを考察する題材として使われる

## 実装例

盤面は「黒く塗られたマスの座標だけ」を持つ疎な集合として表現し、アリの向きは`0=北,1=東,2=南,3=西`の4方向で管理する。

```python
DX = {0: 0, 1: 1, 2: 0, 3: -1}
DY = {0: -1, 1: 0, 2: 1, 3: 0}


def ant_step(grid: dict[tuple[int, int], int], x: int, y: int, direction: int):
    cell = grid.get((x, y), 0)
    if cell == 0:
        direction = (direction + 1) % 4  # 白マス: 右に90度回転
        grid[(x, y)] = 1
    else:
        direction = (direction - 1) % 4  # 黒マス: 左に90度回転
        grid[(x, y)] = 0
    x += DX[direction]
    y += DY[direction]
    return grid, x, y, direction
```

```typescript
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function antStep(
  grid: Map<string, number>,
  x: number,
  y: number,
  direction: number
): { grid: Map<string, number>; x: number; y: number; direction: number } {
  const key = `${x},${y}`;
  const cell = grid.get(key) ?? 0;
  if (cell === 0) {
    direction = (direction + 1) % 4;
    grid.set(key, 1);
  } else {
    direction = (direction + 3) % 4;
    grid.set(key, 0);
  }
  x += DX[direction];
  y += DY[direction];
  return { grid, x, y, direction };
}
```

```cpp
#include <unordered_map>
#include <tuple>
#include <functional>

struct PairHash {
    std::size_t operator()(const std::pair<int, int>& p) const {
        return std::hash<long long>()((static_cast<long long>(p.first) << 32) ^ (unsigned int)p.second);
    }
};

using AntGrid = std::unordered_map<std::pair<int, int>, int, PairHash>;

void antStep(AntGrid& grid, int& x, int& y, int& direction) {
    static const int dx[4] = {0, 1, 0, -1};
    static const int dy[4] = {-1, 0, 1, 0};
    auto key = std::make_pair(x, y);
    int cell = grid.count(key) ? grid[key] : 0;
    if (cell == 0) {
        direction = (direction + 1) % 4;
        grid[key] = 1;
    } else {
        direction = (direction + 3) % 4;
        grid[key] = 0;
    }
    x += dx[direction];
    y += dy[direction];
}
```

```rust
use std::collections::HashMap;

const DX: [i32; 4] = [0, 1, 0, -1];
const DY: [i32; 4] = [-1, 0, 1, 0];

fn ant_step(grid: &mut HashMap<(i32, i32), u8>, x: i32, y: i32, direction: i32) -> (i32, i32, i32) {
    let cell = *grid.get(&(x, y)).unwrap_or(&0);
    let new_direction;
    if cell == 0 {
        new_direction = (direction + 1).rem_euclid(4);
        grid.insert((x, y), 1);
    } else {
        new_direction = (direction + 3).rem_euclid(4);
        grid.insert((x, y), 0);
    }
    let nx = x + DX[new_direction as usize];
    let ny = y + DY[new_direction as usize];
    (nx, ny, new_direction)
}
```

```csharp
static readonly int[] Dx = { 0, 1, 0, -1 };
static readonly int[] Dy = { -1, 0, 1, 0 };

static (int x, int y, int direction) AntStep(Dictionary<(int, int), int> grid, int x, int y, int direction)
{
    var key = (x, y);
    int cell = grid.TryGetValue(key, out var v) ? v : 0;
    if (cell == 0)
    {
        direction = (direction + 1) % 4;
        grid[key] = 1;
    }
    else
    {
        direction = (direction + 3) % 4;
        grid[key] = 0;
    }
    x += Dx[direction];
    y += Dy[direction];
    return (x, y, direction);
}
```
