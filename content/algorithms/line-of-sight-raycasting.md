---
name: レイキャストによる視線判定(Line of Sight)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(格子上のセル数)(グリッドDDAの場合、視線の長さに比例)
summary: 観測者から対象へ向かう直線上に障害物があるかを、格子(グリッド)を効率的に走査するDDA法で判定し、ゲームAIの「見える/見えない」の知覚を実現する。
---

## 概要

「敵プレイヤーが物陰に隠れたら見失う」「NPCが壁越しにこちらを索敵しない」といった挙動は、キャラクターAIの知覚(Perception)システムの土台であり、その核となるのが2点間に障害物がないかを判定する視線判定(Line of Sight)である。3Dゲームでは物理エンジンのレイキャストを直接使うことも多いが、タイルベースのマップやナビゲーション用の簡略化されたグリッド上では、**格子を1マスずつ正確に、かつ余計なセルを飛ばさずに走査するDDA(Digital Differential Analyzer)法**が広く使われる。ブレゼンハムの直線描画アルゴリズムと同じ発想の源流を持ち、格子上での視線判定・射線判定・簡易な光の伝播計算などに応用される。

## 仕組み

1. 観測者のセル座標`(x0, y0)`と対象のセル座標`(x1, y1)`を結ぶ直線を考える
2. 直線の方向`(dx, dy)`から、x方向・y方向にそれぞれ1マス分格子線を跨ぐのに必要な距離`deltaDistX`・`deltaDistY`を求める
3. 現在位置から次のx方向格子線・y方向格子線までの距離`sideDistX`・`sideDistY`を初期化する
4. **DDAステップ**: `sideDistX`と`sideDistY`のうち小さい方を選び、その方向に1マス進める(選んだ方の`sideDist`に`deltaDist`を加算する)。これを対象セルに到達するまで繰り返すと、始点から終点まで**格子を過不足なく辿る**セル列が得られる
5. 辿った各セルについて「障害物か」を調べ、途中に1つでも障害物があれば視線は遮られている(`見えない`)と判定する。障害物が1つもなければ視線は通っている(`見える`)

## 特性・トレードオフ

- **正確な格子走査**: 単純に直線の傾きを浮動小数点で追って四捨五入する方法では、格子の交差判定を1マス飛ばして見落とすことがあるが、DDA法は「常にどちらかの軸方向に1マスずつ」進むため、通過するセルを取りこぼさない
- **視線の長さに比例した計算量**: 判定は視線上のセル数に比例するO(視線の長さ)で軽量。多数のNPCが毎フレーム視線判定を行うゲームAIでも実用的な速度を保てる
- **3D空間ではレイキャスト(物理エンジン)に置き換わることが多い**: フル3D環境では衝突判定用のBVH(バウンディングボリューム階層)などを使った物理エンジンのレイキャストが使われることが多いが、発想(始点から終点まで空間を効率的に走査し、最初の交差を検出する)は共通している
- **使いどころ**: タイルベース・グリッドベースのゲームAIの索敵、ローグライクのFOV(視界範囲)計算の下地、簡易な射線チェック、A*などの経路探索結果を間引く「視線が通るなら中間のウェイポイントを省略する」パス平滑化

## 実装例

```python
def has_line_of_sight(grid: list[list[bool]], x0: int, y0: int, x1: int, y1: int) -> bool:
    """grid[y][x] が True のセルは障害物。始点・終点自身は障害物判定に含めない。"""
    dx, dy = x1 - x0, y1 - y0
    steps = max(abs(dx), abs(dy))
    if steps == 0:
        return True

    x_inc, y_inc = dx / steps, dy / steps
    x, y = float(x0), float(y0)
    for _ in range(steps + 1):
        cx, cy = round(x), round(y)
        if (cx, cy) != (x0, y0) and (cx, cy) != (x1, y1):
            if grid[cy][cx]:
                return False
        x += x_inc
        y += y_inc
    return True
```

```typescript
function hasLineOfSight(grid: boolean[][], x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;

  const xInc = dx / steps;
  const yInc = dy / steps;
  let x = x0;
  let y = y0;
  for (let i = 0; i <= steps; i++) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (!(cx === x0 && cy === y0) && !(cx === x1 && cy === y1)) {
      if (grid[cy][cx]) return false;
    }
    x += xInc;
    y += yInc;
  }
  return true;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

bool hasLineOfSight(const std::vector<std::vector<bool>>& grid, int x0, int y0, int x1, int y1) {
    int dx = x1 - x0, dy = y1 - y0;
    int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) return true;

    double xInc = static_cast<double>(dx) / steps;
    double yInc = static_cast<double>(dy) / steps;
    double x = x0, y = y0;
    for (int i = 0; i <= steps; i++) {
        int cx = static_cast<int>(std::lround(x));
        int cy = static_cast<int>(std::lround(y));
        if (!(cx == x0 && cy == y0) && !(cx == x1 && cy == y1)) {
            if (grid[cy][cx]) return false;
        }
        x += xInc;
        y += yInc;
    }
    return true;
}
```

```rust
fn has_line_of_sight(grid: &[Vec<bool>], x0: i32, y0: i32, x1: i32, y1: i32) -> bool {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let steps = dx.abs().max(dy.abs());
    if steps == 0 {
        return true;
    }

    let x_inc = dx as f64 / steps as f64;
    let y_inc = dy as f64 / steps as f64;
    let mut x = x0 as f64;
    let mut y = y0 as f64;
    for _ in 0..=steps {
        let cx = x.round() as i32;
        let cy = y.round() as i32;
        if !(cx == x0 && cy == y0) && !(cx == x1 && cy == y1) {
            if grid[cy as usize][cx as usize] {
                return false;
            }
        }
        x += x_inc;
        y += y_inc;
    }
    true
}
```

```csharp
static bool HasLineOfSight(bool[][] grid, int x0, int y0, int x1, int y1)
{
    int dx = x1 - x0, dy = y1 - y0;
    int steps = Math.Max(Math.Abs(dx), Math.Abs(dy));
    if (steps == 0) return true;

    double xInc = (double)dx / steps;
    double yInc = (double)dy / steps;
    double x = x0, y = y0;
    for (int i = 0; i <= steps; i++)
    {
        int cx = (int)Math.Round(x);
        int cy = (int)Math.Round(y);
        if (!(cx == x0 && cy == y0) && !(cx == x1 && cy == y1))
        {
            if (grid[cy][cx]) return false;
        }
        x += xInc;
        y += yInc;
    }
    return true;
}
```
