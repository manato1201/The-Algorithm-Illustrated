---
name: CAMShift法(適応的物体追跡)
category: コンピュータビジョン
subcategory: セグメンテーション・追跡
complexity: O(反復回数 × ウィンドウ内画素数)(1フレームあたり)
summary: Mean-Shift法による物体追跡に、追跡対象のサイズと向きの変化に応じて探索ウィンドウを毎フレーム自動調整する仕組みを加えた連続適応型の拡張手法。
---

## 概要

[Mean-Shift法](/algorithms/mean-shift-tracking)は色ヒストグラムの密度ピークへ探索ウィンドウを収束させることで物体を追跡できるが、ウィンドウのサイズと向きを固定したまま動かすという弱点を持つ。現実の映像では、対象物体はカメラに近づいたり遠ざかったりしてサイズが変わり、回転すれば見た目の向きも変わる——固定サイズのウィンドウでは、物体が小さくなればウィンドウ内に背景のノイズが混入し、大きくなればウィンドウが物体の一部しか覆えなくなる。CAMShift(Continuously Adaptive Mean Shift)は、1998年にGary Bradskiが提案した手法で、各フレームでMean-Shiftによる収束を行った直後に、収束先の色分布の統計量(モーメント)からウィンドウの大きさと向きを再計算し、次のフレームのために更新する。この「収束→サイズ・向きの再推定→次フレームへ」というループを繰り返すことで、対象のスケール変化や回転に追従し続けられる。

## 仕組み

1. **初期化**: 追跡したい物体の初期領域を選び、その色相(Hueなど、照明変化に強い成分)のヒストグラムを「対象モデル」として記録する
2. **逆投影画像の作成**: 各フレームで、画素ごとに「対象モデルのヒストグラムにどれだけ一致するか」を表す確率値を割り当てた画像(逆投影画像、back-projection image)を作る——この確率値が高い画素ほど、追跡対象の色に近いことを意味する
3. **Mean-Shiftによる収束**: 現在のウィンドウ位置から出発し、[Mean-Shift法](/algorithms/mean-shift-tracking)と同様に逆投影画像上の重心へウィンドウを繰り返し移動させ、収束させる
4. **ゼロ次・1次・2次モーメントの計算**: 収束したウィンドウ内の逆投影確率値から、画素数に相当するゼロ次モーメント`M₀₀`、重心位置を決める1次モーメント`M₁₀`・`M₀₁`、分布の広がりと向きを決める2次モーメント`M₂₀`・`M₀₂`・`M₁₁`を計算する
5. **ウィンドウのサイズと向きの再推定**: ゼロ次モーメントからウィンドウの新しい大きさ(面積)を、2次モーメントの共分散行列の固有値・固有ベクトルから楕円の長軸・短軸の比率と傾き(向き)を計算し、次のフレームで使うウィンドウの形状として更新する
6. **次フレームへ**: 更新されたウィンドウを次のフレームの初期位置として、手順2〜5を繰り返す

## 特性・トレードオフ

- **[Mean-Shift法](/algorithms/mean-shift-tracking)との違い**: 素のMean-Shift法はウィンドウのサイズ・向きを追跡中ずっと固定するのに対し、CAMShiftはフレームごとにサイズと向き(楕円の傾き)を再計算して更新する点が核心的な拡張であり、対象が近づく・遠ざかる・回転するような映像でも追跡窓が対象にフィットし続ける
- **計算量**: 各フレームの処理はMean-Shiftの反復収束にモーメント計算(定数個の総和)を加えた程度で、計算コストの増加はわずかであり、リアルタイム性を保ったまま適応性を獲得できる
- **色ヒストグラムへの依存**: 対象モデルの品質が色分布の識別性に依存する点はMean-Shift法と共通する弱点であり、背景と対象の色が似ている場面や、対象の色が急激に変化する場面(照明の大きな変化など)では追跡精度が落ちる
- **急な動き・オクルージョンへの弱さ**: Mean-Shiftベースの追跡全般に言えることだが、対象が前フレームのウィンドウの探索範囲外まで一気に移動したり、他の物体に完全に隠れたりすると追跡を見失いやすい。カルマンフィルタなどの予測モデルと組み合わせて探索開始位置を予測する手法が併用されることも多い
- **使いどころ**: 顔・手のジェスチャー追跡、監視カメラでの人物追跡、古くはOpenCVの標準追跡アルゴリズムの一つとして、対象のサイズ変化が想定される映像でのリアルタイム物体追跡に広く使われてきた

## 実装例

ガウス風の重み付き重心へウィンドウ中心を収束させた後、ウィンドウ内の点群のゼロ次・1次・2次モーメントから新しい半径(スケール)と主軸の向き(角度)を再計算し、次フレームのウィンドウとして返す。

```python
import math


def compute_moments(points: list[tuple[float, float]], center: tuple[float, float], radius: float):
    """center を中心に radius 以内の点だけを対象にモーメントを計算する"""
    m00 = m10 = m01 = m20 = m02 = m11 = 0.0
    for px, py in points:
        if math.hypot(px - center[0], py - center[1]) > radius:
            continue
        m00 += 1
        m10 += px
        m01 += py
        m20 += px * px
        m02 += py * py
        m11 += px * py
    return m00, m10, m01, m20, m02, m11


def mean_shift_step(center: tuple[float, float], points: list[tuple[float, float]], radius: float) -> tuple[float, float]:
    wx = wy = wsum = 0.0
    for px, py in points:
        if math.hypot(px - center[0], py - center[1]) > radius:
            continue
        wx += px
        wy += py
        wsum += 1
    if wsum == 0:
        return center
    return (wx / wsum, wy / wsum)


def camshift_step(
    center: tuple[float, float], points: list[tuple[float, float]], radius: float, max_iter: int = 20
) -> tuple[tuple[float, float], float, float]:
    """1フレーム分のCAMShift更新: 収束後の中心・新しい半径・新しい向き(ラジアン)を返す"""
    for _ in range(max_iter):
        new_center = mean_shift_step(center, points, radius)
        if math.hypot(new_center[0] - center[0], new_center[1] - center[1]) < 1e-4:
            center = new_center
            break
        center = new_center

    m00, m10, m01, m20, m02, m11 = compute_moments(points, center, radius)
    if m00 == 0:
        return center, radius, 0.0

    xc, yc = m10 / m00, m01 / m00
    mu20 = m20 / m00 - xc * xc
    mu02 = m02 / m00 - yc * yc
    mu11 = m11 / m00 - xc * yc

    theta = 0.5 * math.atan2(2 * mu11, mu20 - mu02)
    new_radius = max(math.sqrt(m00 / math.pi), 1.0)
    return center, new_radius, theta
```

```typescript
function computeMoments(
  points: [number, number][],
  center: [number, number],
  radius: number
): [number, number, number, number, number, number] {
  let m00 = 0, m10 = 0, m01 = 0, m20 = 0, m02 = 0, m11 = 0;
  for (const [px, py] of points) {
    if (Math.hypot(px - center[0], py - center[1]) > radius) continue;
    m00 += 1;
    m10 += px;
    m01 += py;
    m20 += px * px;
    m02 += py * py;
    m11 += px * py;
  }
  return [m00, m10, m01, m20, m02, m11];
}

function meanShiftStep(center: [number, number], points: [number, number][], radius: number): [number, number] {
  let wx = 0, wy = 0, wsum = 0;
  for (const [px, py] of points) {
    if (Math.hypot(px - center[0], py - center[1]) > radius) continue;
    wx += px;
    wy += py;
    wsum += 1;
  }
  if (wsum === 0) return center;
  return [wx / wsum, wy / wsum];
}

interface CamshiftResult {
  center: [number, number];
  radius: number;
  theta: number;
}

function camshiftStep(
  start: [number, number],
  points: [number, number][],
  radius: number,
  maxIter = 20
): CamshiftResult {
  let center = start;
  for (let i = 0; i < maxIter; i++) {
    const newCenter = meanShiftStep(center, points, radius);
    const dist = Math.hypot(newCenter[0] - center[0], newCenter[1] - center[1]);
    center = newCenter;
    if (dist < 1e-4) break;
  }

  const [m00, m10, m01, m20, m02, m11] = computeMoments(points, center, radius);
  if (m00 === 0) return { center, radius, theta: 0 };

  const xc = m10 / m00;
  const yc = m01 / m00;
  const mu20 = m20 / m00 - xc * xc;
  const mu02 = m02 / m00 - yc * yc;
  const mu11 = m11 / m00 - xc * yc;

  const theta = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
  const newRadius = Math.max(Math.sqrt(m00 / Math.PI), 1);
  return { center, radius: newRadius, theta };
}
```
