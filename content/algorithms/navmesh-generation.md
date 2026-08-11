---
name: ナビゲーションメッシュ生成(NavMesh Generation)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(n log n)(nは元となる幾何情報のポリゴン数、三角形分割が支配的)
summary: 3Dシーンの歩行可能な床面を、キャラクターが実際に移動できる領域だけの凸多角形の集合(ナビゲーションメッシュ)に変換し、高速な経路探索の土台を作る。
---

## 概要

3Dゲームのキャラクターが目的地まで自然に移動するには、「どこが歩けて、どこが歩けないか」を表す空間表現が必要になる。[レイキャストによる視線判定](/algorithms/line-of-sight-raycasting)のようなグリッドベースの表現は実装が単純だが、グリッドの解像度によっては斜めの壁際で不自然な経路になったり、逆に細かすぎるグリッドはメモリと探索コストを圧迫したりする。ナビゲーションメッシュ(NavMesh)は、3Dシーンの床・地形を**キャラクターが実際に移動できる領域だけの凸多角形(通常は三角形)の集合**として表現する手法で、地形の形状に沿った可変解像度の空間表現により、グリッドより少ないポリゴン数で正確な移動可能領域を表せる。生成には複数の手法があるが、ボクセル化してから輪郭を抽出する「Recast」方式が事実上の業界標準になっている。

## 仕組み

Recast方式を例にした典型的な生成パイプライン:

1. **ボクセル化**: シーン中の衝突判定用メッシュ(壁・床・障害物)を、キャラクターのサイズに応じた解像度の3Dボクセルグリッドに変換する
2. **歩行可能領域の抽出**: 各ボクセル列について、キャラクターの身長(またぐことができない高さ)・キャラクターの最大登坂角度(歩ける傾斜の上限)をもとに、「立っていられる床面」に該当するボクセルを判定する
3. **領域分割(リージョン生成)**: 歩行可能なボクセルの集合を、ウォーターシェッド法(集水域分割に似た手法)などでいくつかの連結領域(リージョン)に分割する
4. **輪郭抽出とポリゴン化**: 各リージョンの境界(輪郭)を抽出し、それを可能な限り少ない数の**凸多角形**に分割する(凸多角形なら「多角形内部の任意の2点を直線で結んでも障害物にぶつからない」ことが保証され、経路探索が単純になる)
5. 隣接する多角形同士を辺で接続したグラフ構造として最終的なナビゲーションメッシュを構築する。実行時はこのグラフ上でA*などの[経路探索アルゴリズム](/algorithms/a-star)を実行し、通過する多角形の列を求めてから、各多角形内をまっすぐ移動する具体的な経路(パス)に変換する(Funnel Algorithmなどでこの変換を行う)

## 特性・トレードオフ

- **地形形状に適応した可変解像度**: 開けた広場は少数の大きな多角形で、複雑に入り組んだ通路は多数の小さな多角形で表現される。均一なグリッドに比べてポリゴン数を抑えながら地形の複雑さに応じた精度を保てる
- **凸多角形内は障害物なしの直線移動が保証される**: 経路探索で「どの多角形を通るか」さえ決まれば、各多角形内部は自由に直線移動できることが幾何学的に保証されるため、グリッドベースの経路よりも自然でショートカットの少ない移動になる
- **生成コストと動的な変化への弱さ**: ナビゲーションメッシュの生成自体はオフライン(レベル読み込み時など)に行うのが一般的で、実行時に地形が破壊される・障害物が動くといった動的な変化への追従には、部分的な再生成やオフメッシュリンク(ジャンプ地点などを手動で追加する仕組み)といった追加の工夫が必要になる
- **使いどころ**: 3Dアクション/オープンワールドゲームのNPC移動、群衆シミュレーションの土台(生成したナビゲーションメッシュ上で[RVO](/algorithms/reciprocal-velocity-obstacles)による局所的な衝突回避と組み合わせる)、ロボティクスの屋内経路計画。Unity・Unreal Engineの両方が標準機能としてNavMesh生成を搭載している

## 実装例

簡略化した2Dの例として、障害物を避けた歩行可能領域をグリッドから抽出し、隣接する矩形セルを併合して少数の矩形(凸多角形の代わり)にまとめる処理を示す(実際のRecastは3Dボクセル+三角形分割を行うが、ここでは「グリッドから少数の凸領域へ縮約する」という核心のアイデアを2Dで表現する)。

```python
def extract_walkable_rectangles(walkable: list[list[bool]]) -> list[tuple[int, int, int, int]]:
    """walkable[y][x]=Trueのセルを、貪欲に最大の矩形へ併合していく(グリッド→少数の凸領域への縮約)。"""
    rows, cols = len(walkable), len(walkable[0])
    used = [[False] * cols for _ in range(rows)]
    rectangles = []

    for y in range(rows):
        for x in range(cols):
            if not walkable[y][x] or used[y][x]:
                continue
            # 右方向に最大幅を求める
            width = 0
            while x + width < cols and walkable[y][x + width] and not used[y][x + width]:
                width += 1
            # 下方向に、同じ幅を維持できる限り高さを伸ばす
            height = 1
            while y + height < rows and all(
                walkable[y + height][x + w] and not used[y + height][x + w] for w in range(width)
            ):
                height += 1
            for dy in range(height):
                for dx in range(width):
                    used[y + dy][x + dx] = True
            rectangles.append((x, y, width, height))
    return rectangles
```

```typescript
function extractWalkableRectangles(walkable: boolean[][]): [number, number, number, number][] {
  const rows = walkable.length;
  const cols = walkable[0].length;
  const used: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const rectangles: [number, number, number, number][] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!walkable[y][x] || used[y][x]) continue;
      let width = 0;
      while (x + width < cols && walkable[y][x + width] && !used[y][x + width]) width++;
      let height = 1;
      while (
        y + height < rows &&
        Array.from({ length: width }, (_, w) => w).every(
          (w) => walkable[y + height][x + w] && !used[y + height][x + w],
        )
      ) {
        height++;
      }
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) used[y + dy][x + dx] = true;
      }
      rectangles.push([x, y, width, height]);
    }
  }
  return rectangles;
}
```

```cpp
#include <vector>
#include <tuple>

std::vector<std::tuple<int, int, int, int>> extractWalkableRectangles(const std::vector<std::vector<bool>>& walkable) {
    int rows = static_cast<int>(walkable.size());
    int cols = static_cast<int>(walkable[0].size());
    std::vector<std::vector<bool>> used(rows, std::vector<bool>(cols, false));
    std::vector<std::tuple<int, int, int, int>> rectangles;

    for (int y = 0; y < rows; y++) {
        for (int x = 0; x < cols; x++) {
            if (!walkable[y][x] || used[y][x]) continue;
            int width = 0;
            while (x + width < cols && walkable[y][x + width] && !used[y][x + width]) width++;
            int height = 1;
            bool canExtend = true;
            while (canExtend && y + height < rows) {
                for (int w = 0; w < width; w++) {
                    if (!walkable[y + height][x + w] || used[y + height][x + w]) { canExtend = false; break; }
                }
                if (canExtend) height++;
            }
            for (int dy = 0; dy < height; dy++)
                for (int dx = 0; dx < width; dx++)
                    used[y + dy][x + dx] = true;
            rectangles.emplace_back(x, y, width, height);
        }
    }
    return rectangles;
}
```

```rust
fn extract_walkable_rectangles(walkable: &[Vec<bool>]) -> Vec<(usize, usize, usize, usize)> {
    let rows = walkable.len();
    let cols = walkable[0].len();
    let mut used = vec![vec![false; cols]; rows];
    let mut rectangles = Vec::new();

    for y in 0..rows {
        for x in 0..cols {
            if !walkable[y][x] || used[y][x] {
                continue;
            }
            let mut width = 0;
            while x + width < cols && walkable[y][x + width] && !used[y][x + width] {
                width += 1;
            }
            let mut height = 1;
            while y + height < rows
                && (0..width).all(|w| walkable[y + height][x + w] && !used[y + height][x + w])
            {
                height += 1;
            }
            for dy in 0..height {
                for dx in 0..width {
                    used[y + dy][x + dx] = true;
                }
            }
            rectangles.push((x, y, width, height));
        }
    }
    rectangles
}
```

```csharp
static List<(int x, int y, int w, int h)> ExtractWalkableRectangles(bool[][] walkable)
{
    int rows = walkable.Length, cols = walkable[0].Length;
    var used = new bool[rows][];
    for (int i = 0; i < rows; i++) used[i] = new bool[cols];
    var rectangles = new List<(int, int, int, int)>();

    for (int y = 0; y < rows; y++)
    {
        for (int x = 0; x < cols; x++)
        {
            if (!walkable[y][x] || used[y][x]) continue;
            int width = 0;
            while (x + width < cols && walkable[y][x + width] && !used[y][x + width]) width++;
            int height = 1;
            bool canExtend = true;
            while (canExtend && y + height < rows)
            {
                for (int w = 0; w < width; w++)
                {
                    if (!walkable[y + height][x + w] || used[y + height][x + w]) { canExtend = false; break; }
                }
                if (canExtend) height++;
            }
            for (int dy = 0; dy < height; dy++)
                for (int dx = 0; dx < width; dx++)
                    used[y + dy][x + dx] = true;
            rectangles.Add((x, y, width, height));
        }
    }
    return rectangles;
}
```
