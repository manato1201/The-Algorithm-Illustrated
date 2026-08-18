---
name: ダイヤモンド・スクエア法(地形生成)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(n^2)(n×nグリッド全体に対して)
summary: 正方形の四隅から中点を再帰的に変位させ、格子を細かく再分割しながら高さを確定していくことでフラクタル的な起伏の高度マップを生成する手法。
---

## 概要

ダイヤモンド・スクエア法は、フラクタル幾何学における「中点変位法(midpoint displacement)」を2次元の高度マップ生成に拡張した手法で、1980年代初頭にAlain Fournier・Don Fussell・Loren Carpenterによって考案された。`(2^k + 1) × (2^k + 1)`の正方形グリッドの四隅にランダムな高さを与え、そこから「正方形の中心を四隅の平均から変位させる(スクエアステップ)」「ひし形の中心を周囲の平均から変位させる(ダイヤモンドステップ)」という2種類の操作を交互に繰り返しながらグリッドを再帰的に細分化していくことで、山や谷が自己相似的に入れ子になった自然な地形の高度マップを生成する。[パーリンノイズ](/algorithms/perlin-noise)がどの座標に対しても独立に値を計算できる連続関数として設計されているのに対し、ダイヤモンド・スクエア法はグリッド全体を再帰的に分割しながら埋めていく手続きであり、任意の1点だけを他の点と無関係に評価することはできない点が対照的である。

## 仕組み

1. サイズ`(2^k + 1) × (2^k + 1)`のグリッドを用意し、四隅にランダムな高さを割り当てる
2. **スクエアステップ**: 現在の分割単位(正方形)ごとに、その中心点の高さを、四隅の高さの平均に、変位幅の範囲でランダムなオフセットを加えた値として確定する
3. **ダイヤモンドステップ**: スクエアステップで新しく生まれた中心点群が作るひし形ごとに、その中心点の高さを、周囲4点(グリッド境界では利用可能な点のみ)の高さの平均に、同様のランダムなオフセットを加えた値として確定する(境界上の点は平均を取る近傍が3点になる)
4. 変位幅の範囲を、粗さパラメータ(ラフネス)に応じて毎回縮小しながら(通常は半分程度に)、分割単位を半分のサイズにして2〜3を繰り返す
5. 分割単位が1マスになるまで繰り返すと、グリッド上の全ての点の高さが確定し、大きなうねりの上に小さな起伏が重なった、フラクタル的な高度マップが完成する

## 特性・トレードオフ

- **計算量**: 各反復で処理する点の数は前の反復のおよそ4分の1になるが、反復回数は`log n`のオーダーで増えるため、全体では等比級数の和として`O(n^2)`(グリッドの総マス数と同オーダー)に収まる
- **格子アーティファクト**: 中点変位を軸に沿って繰り返すため、生成結果に格子軸に沿った筋状の不自然さ(クリース)が現れやすいという古典的な弱点がある。乱数のシードやオフセットの分布を工夫しても完全には解消しにくく、より高品質な地形にはパーリンノイズなど連続ノイズ関数ベースの手法や、複数手法の合成が使われる
- **[パーリンノイズ](/algorithms/perlin-noise)との違い**: パーリンノイズは「任意の座標を独立に、格子点の勾配ベクトルから補間して」計算できる連続関数であるのに対し、ダイヤモンド・スクエア法は「正方形を再帰的に半分ずつ分割していく」手続きそのものが本質であり、グリッド全体(またはその点に至る分割の経路)を生成しないと特定の1点の値を得られない。逆に言えば、ダイヤモンド・スクエア法は「四隅の値を起点に、閉じた領域全体を一括で自然に埋める」用途に強い
- **決定論性**: 同じ乱数シードと四隅の初期値からは常に同じ地形が再現されるため、シード値だけを保存すればマップ全体を保存せずに再生成できる
- **使いどころ**: フライトシミュレータやオープンワールドゲームの地形高度マップ生成、山岳地形の初期プロシージャル生成、[Wave Function Collapse](/algorithms/wave-function-collapse)のようなタイルベース生成とは異なる「連続的な起伏」を持つ地形が必要な場面

## 実装例

```python
import random


def diamond_square(size_power: int, roughness: float = 0.5, seed: int = 0) -> list[list[float]]:
    """size_power: グリッドは(2^size_power + 1)四方になる。roughnessが大きいほど起伏が滑らかになる"""
    size = (1 << size_power) + 1
    grid = [[0.0] * size for _ in range(size)]
    rng = random.Random(seed)

    grid[0][0] = rng.uniform(-1, 1)
    grid[0][size - 1] = rng.uniform(-1, 1)
    grid[size - 1][0] = rng.uniform(-1, 1)
    grid[size - 1][size - 1] = rng.uniform(-1, 1)

    step = size - 1
    scale = 1.0
    while step > 1:
        half = step // 2

        # スクエアステップ: 各正方形の中心を四隅の平均+乱数オフセットで確定する
        for y in range(half, size, step):
            for x in range(half, size, step):
                avg = (
                    grid[y - half][x - half]
                    + grid[y - half][x + half]
                    + grid[y + half][x - half]
                    + grid[y + half][x + half]
                ) / 4.0
                grid[y][x] = avg + rng.uniform(-1, 1) * scale

        # ダイヤモンドステップ: 各ひし形の中心を周囲(境界では利用可能な近傍のみ)の平均+乱数オフセットで確定する
        for y in range(0, size, half):
            for x in range((y // half + 1) % 2 * half, size, step):
                total, count = 0.0, 0
                for dy, dx in ((-half, 0), (half, 0), (0, -half), (0, half)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < size and 0 <= nx < size:
                        total += grid[ny][nx]
                        count += 1
                grid[y][x] = total / count + rng.uniform(-1, 1) * scale

        step = half
        scale *= 2 ** (-roughness)

    return grid


# 検証: 同じシードなら常に同じ地形が再現され、四隅の値は初期化した値のまま変わらない
terrain_a = diamond_square(size_power=3, seed=42)
terrain_b = diamond_square(size_power=3, seed=42)
assert terrain_a == terrain_b
```

```typescript
class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  private nextU32(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }
  uniform(min: number, max: number): number {
    const t = this.nextU32() / 4294967296.0;
    return min + t * (max - min);
  }
}

function diamondSquare(sizePower: number, roughness = 0.5, seed = 0): number[][] {
  const size = (1 << sizePower) + 1;
  const grid: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const rng = new Rng(seed);

  grid[0][0] = rng.uniform(-1, 1);
  grid[0][size - 1] = rng.uniform(-1, 1);
  grid[size - 1][0] = rng.uniform(-1, 1);
  grid[size - 1][size - 1] = rng.uniform(-1, 1);

  let step = size - 1;
  let scale = 1.0;

  while (step > 1) {
    const half = Math.floor(step / 2);

    // スクエアステップ: 各正方形の中心を四隅の平均+乱数オフセットで確定する
    for (let y = half; y < size; y += step) {
      for (let x = half; x < size; x += step) {
        const avg =
          (grid[y - half][x - half] +
            grid[y - half][x + half] +
            grid[y + half][x - half] +
            grid[y + half][x + half]) /
          4.0;
        grid[y][x] = avg + rng.uniform(-1, 1) * scale;
      }
    }

    // ダイヤモンドステップ: 各ひし形の中心を周囲(境界では利用可能な近傍のみ)の平均+乱数オフセットで確定する
    for (let y = 0; y < size; y += half) {
      const xOffset = ((Math.floor(y / half) + 1) % 2) * half;
      for (let x = xOffset; x < size; x += step) {
        let total = 0;
        let count = 0;
        for (const [dy, dx] of [
          [-half, 0],
          [half, 0],
          [0, -half],
          [0, half],
        ]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
            total += grid[ny][nx];
            count += 1;
          }
        }
        grid[y][x] = total / count + rng.uniform(-1, 1) * scale;
      }
    }

    step = half;
    scale *= Math.pow(2, -roughness);
  }

  return grid;
}
```
