---
name: Stanleyコントローラ(横方向経路追従制御)
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(n)(nは経路上の点数、最近傍点の探索)
summary: 経路への横方向誤差と車両の方位誤差の両方を非線形にフィードバックする自動運転向けの経路追従制御則で、前方注視点を使う[Pure Pursuit](/algorithms/pure-pursuit-path-tracking)とは異なり現在の横偏差を直接操舵角に反映する。
---

## 概要

[Pure Pursuit(純追跡法)](/algorithms/pure-pursuit-path-tracking)は、経路上に先読み距離だけ離れた「目標点」を置き、そこへ向かう円弧を計算するという幾何学的な発想で経路追従を実現する。一方、2005年のDARPA Grand Challengeで優勝したスタンフォード大学の自動運転車「Stanley」のために開発されたStanleyコントローラは、全く異なる発想を取る——前方の目標点を使わず、**車両の現在位置が経路からどれだけ横にずれているか(横方向誤差)**と、**車両の向きが経路の接線方向からどれだけずれているか(方位誤差)**の2つの誤差を、それぞれ独立に、しかし同時に操舵角へフィードバックする。前輪の向きを直接制御対象として扱うこの制御則は、低速から中速での正確な軌道追従に優れ、Pure Pursuitと並んで自動運転・ロボティクス分野で広く使われる経路追従制御の代表格となった。

## 仕組み

1. 車両の前輪(操舵輪)の現在位置と向き、および追従したい経路(連続する点の並びと各点での接線方向)を用意する
2. 経路上で前輪位置に最も近い点を見つけ、そこまでの符号付き横方向距離`e`(経路の左右どちら側にどれだけずれているか)を計算する
3. 車両の向きと、最近傍点における経路の接線方向との角度差`θ_e`(方位誤差)を計算する
4. **Stanleyの制御則**で操舵角`δ`を決定する: `δ = θ_e + atan2(k・e, v)`。ここで`k`はゲイン、`v`は車両の速度。第1項`θ_e`は「経路の向きに車両の向きを合わせよう」という方位誤差の是正、第2項`atan2(k・e, v)`は「横にずれている分を、速度に応じた滑らかさで是正しよう」という横方向誤差の是正であり、この2つの非線形な項の和として操舵角が決まる
5. 車両が動いて位置・向きが更新されるたびに、手順2〜4を繰り返す

速度`v`が分母に入る`atan2(k・e, v)`の項により、低速では横方向誤差に対して操舵角が敏感に(大きく)反応し、高速では穏やかに反応するという速度依存の挙動が自然に組み込まれている。

## 特性・トレードオフ

- **計算量**: 各制御サイクルでの最近傍点の探索は経路上の点数`n`に対して`O(n)`([Pure Pursuit](/algorithms/pure-pursuit-path-tracking)と同様、前回の位置付近から探索することで効率化できる)——操舵角自体の計算は三角関数のみで`O(1)`
- **[Pure Pursuit](/algorithms/pure-pursuit-path-tracking)との制御則の違い**: Pure Pursuitは「前方の先読み点へ向かう円弧」という幾何学的な考え方に基づき、先読み距離という1つのパラメータで挙動が決まる。Stanleyコントローラは前方注視点を一切使わず、**現在の**横方向誤差と方位誤差という2つの誤差量を直接、同時にフィードバックする点が本質的に異なる——この違いにより、Stanleyは低速走行時に経路への収束が速く正確になりやすい一方、Pure Pursuitは先読みによって滑らかで振動の少ない軌道を描きやすいという傾向がある
- **低速域での挙動と高速域での限界**: 速度`v`が0に近づくと`atan2(k・e, v)`の項が急激に大きくなり、停止直前や低速走行時に横方向誤差を積極的に(時には過敏に)補正しようとする——これは駐車や低速の精密な軌道追従には有利に働くが、高速走行では横方向誤差フィードバックの効きが弱まり、他の制御則([LQR](/algorithms/lqr-control)ベースの経路追従など)の方が適する場合もある
- **前輪中心のモデルという前提**: Stanleyコントローラは自転車モデル(前輪の操舵で進行方向が決まる車両モデル)における前輪の位置と向きを基準に定式化されており、後輪駆動車のリアアクスル中心で定式化される制御則とは誤差の計算基準点が異なる点に注意が必要
- **使いどころ**: 自動運転車の車線追従・経路追従(DARPA Grand Challengeでの実績以来、業界標準的な手法の一つ)、低速での正確な軌道追従が求められる駐車支援システム、倉庫内搬送ロボット(AGV)の精密な経路追従、[LQR](/algorithms/lqr-control)や[Pure Pursuit](/algorithms/pure-pursuit-path-tracking)と比較検証されることの多いベンチマーク的な経路追従制御則

## 実装例

経路上の最近傍点との符号付き横方向誤差と方位誤差から、Stanleyの制御則`δ = θ_e + atan2(k・e, v)`で操舵角を求め、自転車モデルで姿勢を更新するシミュレーション。

```python
import math

Pt = tuple[float, float]


def nearest_point_and_heading(path: list[Pt], pos: Pt) -> tuple[int, float]:
    """posに最も近い経路上の点のインデックスと、その点での接線方向(進行方向)を返す。"""
    idx = min(range(len(path)), key=lambda i: math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]))
    next_idx = min(idx + 1, len(path) - 1)
    prev_idx = max(idx - 1, 0)
    dx = path[next_idx][0] - path[prev_idx][0]
    dy = path[next_idx][1] - path[prev_idx][1]
    return idx, math.atan2(dy, dx)


def signed_cross_track_error(path: list[Pt], idx: int, path_heading: float, pos: Pt) -> float:
    """前輪位置posから経路への符号付き横方向誤差(左が正など、進行方向基準)を計算する。"""
    px, py = path[idx]
    dx, dy = pos[0] - px, pos[1] - py
    # 経路接線方向に垂直な方向への射影が横方向誤差
    return -dx * math.sin(path_heading) + dy * math.cos(path_heading)


def stanley_steering(path: list[Pt], pos: Pt, heading: float, speed: float, k: float = 1.0) -> float:
    idx, path_heading = nearest_point_and_heading(path, pos)
    heading_error = math.atan2(math.sin(path_heading - heading), math.cos(path_heading - heading))
    cross_track_error = signed_cross_track_error(path, idx, path_heading, pos)
    return heading_error + math.atan2(k * cross_track_error, max(speed, 1e-3))


def simulate(path: list[Pt], start_pos: Pt, start_heading: float, speed: float = 2.0,
             wheelbase: float = 1.0, dt: float = 0.05, k: float = 1.0,
             max_steps: int = 3000, goal_tol: float = 0.3) -> list[Pt]:
    pos, heading = start_pos, start_heading
    trace = [pos]
    goal = path[-1]
    for _ in range(max_steps):
        delta = stanley_steering(path, pos, heading, speed, k)
        heading += (speed / wheelbase) * math.tan(delta) * dt
        pos = (pos[0] + speed * math.cos(heading) * dt, pos[1] + speed * math.sin(heading) * dt)
        trace.append(pos)
        if math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goal_tol:
            break
    return trace
```

```typescript
type Pt = [number, number];

function nearestPointAndHeading(path: Pt[], pos: Pt): [number, number] {
  let idx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - pos[0], path[i][1] - pos[1]);
    if (d < closestDist) {
      closestDist = d;
      idx = i;
    }
  }
  const nextIdx = Math.min(idx + 1, path.length - 1);
  const prevIdx = Math.max(idx - 1, 0);
  const dx = path[nextIdx][0] - path[prevIdx][0];
  const dy = path[nextIdx][1] - path[prevIdx][1];
  return [idx, Math.atan2(dy, dx)];
}

function signedCrossTrackError(path: Pt[], idx: number, pathHeading: number, pos: Pt): number {
  const [px, py] = path[idx];
  const dx = pos[0] - px;
  const dy = pos[1] - py;
  return -dx * Math.sin(pathHeading) + dy * Math.cos(pathHeading);
}

function stanleySteering(path: Pt[], pos: Pt, heading: number, speed: number, k = 1.0): number {
  const [idx, pathHeading] = nearestPointAndHeading(path, pos);
  const headingError = Math.atan2(Math.sin(pathHeading - heading), Math.cos(pathHeading - heading));
  const crossTrackError = signedCrossTrackError(path, idx, pathHeading, pos);
  return headingError + Math.atan2(k * crossTrackError, Math.max(speed, 1e-3));
}

function simulate(
  path: Pt[], startPos: Pt, startHeading: number, speed = 2.0, wheelbase = 1.0,
  dt = 0.05, k = 1.0, maxSteps = 3000, goalTol = 0.3
): Pt[] {
  let pos = startPos;
  let heading = startHeading;
  const trace: Pt[] = [pos];
  const goal = path[path.length - 1];
  for (let i = 0; i < maxSteps; i++) {
    const delta = stanleySteering(path, pos, heading, speed, k);
    heading += (speed / wheelbase) * Math.tan(delta) * dt;
    pos = [pos[0] + speed * Math.cos(heading) * dt, pos[1] + speed * Math.sin(heading) * dt];
    trace.push(pos);
    if (Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < goalTol) break;
  }
  return trace;
}
```
