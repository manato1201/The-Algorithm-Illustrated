---
name: 追尾の3方式の比較(単純な追尾・エルミート曲線・螺旋)
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: 1歩あたり O(1)
summary: 動く標的を追う3つのやり方(今の位置へ向かう・会合点へ曲線で行く・角度をずらして近づく)を同じ速さで並べ、軌跡の違いを比べる。
---

## 概要

敵が主人公を追う、ミサイルが標的を追う、ロボットが動く物体に近づく——「動く標的を追う」場面は多く、**どう進路を決めるか**で軌跡が変わります。この項目は、同じ速さの追跡者が3つの方式で等速の標的を追う様子を、一つの画面に並べて比べるためのものです。

- **単純な追尾**(純粋追尾): 毎ステップ、標的の「今いる位置」へ真っすぐ向かう。
- **エルミート曲線**: 数歩先の標的の位置(会合点)を先に決め、最初の向きと着くときの向きを守るなめらかな曲線で向かう。
- **螺旋**: 標的の方向から少しずらした向きに進み、そのずれを少しずつ小さくしながら近づく。名前の付いた標準的な誘導則ではなく、角度のずれを調整して近づく一例として載せている。

生まれた目的は、「追う」という一つの要求に対して、予測の要・不要、軌跡のなめらかさ、実装の手間という**選択肢のトレードオフ**を見えるようにすることです。

## 仕組み

可視化では、追跡者の速さを3方式で同じにします(エルミート曲線の長さを歩数で割った値)。速さの違いで優劣がついて見えないようにするためです。標的は一定の速さで上へ進みます。

1. **単純な追尾**: 各ステップで、標的の現在位置への向きに速さ分だけ進む。予測は要らない。標的が動いていると、標的の「過去の位置」に向かう形になり、軌跡は後ろから回り込むように曲がる。
2. **エルミート曲線**: 追跡者の最初の向きと、K歩後の標的の位置・向きを端点と接線として、エルミート曲線を引く。会合点を先に決めるので、標的の動きの予測が要る。曲線の上を一定の速さで進む。
3. **螺旋**: 標的方向から一定の角度だけずらした向きに進み、そのずれを歩数に応じて小さくしていく。ずれの大きさと減らし方しだいで、届くかどうかが変わる。

## 特性・トレードオフ

- **計算量**: 1歩あたり、方向の計算が数回なので O(1)。エルミート曲線は曲線の長さを測る前処理が要るが、これも小さい。
- **予測の要・不要**: 単純な追尾は予測が要らず最も単純。エルミート曲線は標的の動きを予測して会合点を決める必要があり、予測が外れれば会合しない。
- **軌跡の性質**: エルミート曲線は最初の向きと着くときの向きを守れるので、乗り物の旋回などの制約と相性がよい。単純な追尾は急に曲がる場面が出やすい。
- **角度の調整は設計が要る**: 螺旋のように角度をずらす方式は、ずれの大きさや減らし方を決める必要があり、決め方で結果が変わる。
- **使いどころ**: 敵AIの追跡、飛翔体の誘導の考え方の入門、ロボットが動く対象に近づく経路の設計。

## 実装例

```python
import math

Vec2 = tuple[float, float]


def move_toward(pos: Vec2, aim: Vec2, speed: float, rotate_rad: float = 0.0) -> Vec2:
    dx, dy = aim[0] - pos[0], aim[1] - pos[1]
    if math.hypot(dx, dy) <= speed and rotate_rad == 0.0:
        return aim  # 届く距離なら標的に到達
    angle = math.atan2(dy, dx) + rotate_rad
    return (pos[0] + math.cos(angle) * speed, pos[1] + math.sin(angle) * speed)


def pure_pursuit(start: Vec2, targets: list[Vec2], speed: float) -> list[Vec2]:
    """単純な追尾: 毎ステップ、標的の現在位置へ向かう。"""
    path = [start]
    for target in targets[1:]:
        path.append(move_toward(path[-1], target, speed))
    return path


def spiral_approach(start: Vec2, targets: list[Vec2], speed: float, offset_rad: float) -> list[Vec2]:
    """螺旋: 標的方向からずらした向きに進み、ずれを歩数に応じて小さくする。"""
    steps = len(targets) - 1
    path = [start]
    for k, target in enumerate(targets[1:]):
        rotate = offset_rad * (1 - k / steps)
        path.append(move_toward(path[-1], target, speed, rotate))
    return path
```

```typescript
type Vec2 = { x: number; y: number };

function moveToward(pos: Vec2, aim: Vec2, speed: number, rotateRad = 0): Vec2 {
  const dx = aim.x - pos.x;
  const dy = aim.y - pos.y;
  if (Math.hypot(dx, dy) <= speed && rotateRad === 0) return aim; // 届く距離なら標的に到達
  const angle = Math.atan2(dy, dx) + rotateRad;
  return { x: pos.x + Math.cos(angle) * speed, y: pos.y + Math.sin(angle) * speed };
}

/** 単純な追尾: 毎ステップ、標的の現在位置へ向かう。 */
function purePursuit(start: Vec2, targets: Vec2[], speed: number): Vec2[] {
  const path: Vec2[] = [start];
  for (const target of targets.slice(1)) {
    path.push(moveToward(path[path.length - 1], target, speed));
  }
  return path;
}

/** 螺旋: 標的方向からずらした向きに進み、ずれを歩数に応じて小さくする。 */
function spiralApproach(start: Vec2, targets: Vec2[], speed: number, offsetRad: number): Vec2[] {
  const steps = targets.length - 1;
  const path: Vec2[] = [start];
  targets.slice(1).forEach((target, k) => {
    const rotate = offsetRad * (1 - k / steps);
    path.push(moveToward(path[path.length - 1], target, speed, rotate));
  });
  return path;
}
```
