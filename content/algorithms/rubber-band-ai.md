---
name: ラバーバンドAI
category: キャラクターAI・空間AI
subcategory: メタAI・ペーシング制御
complexity: O(1)(1回の速度調整あたり)
summary: プレイヤーとCPUの順位差をゴムひも(ラバーバンド)のように見立て、差が開くほど強く引き戻す力を働かせることで、レースゲームなどで常に僅差の白熱した競り合いを演出する。
---

## 概要

[動的難易度調整(DDA)](/algorithms/dynamic-difficulty-adjustment)がプレイヤーの実力全般に応じて難易度を調整するのに対し、ラバーバンドAIはレースゲームやチェイスシーンに特化した、より即時的な調整手法である。プレイヤーとCPU(または敵)との間に見えないゴムひも(ラバーバンド)が張られているかのように、**両者の距離が開くほど強く引き戻す力**が働く——プレイヤーが独走すればCPUの速度を上げ、逆にプレイヤーが遅れれば追いつきやすくCPUを減速させる。『マリオカート』シリーズがこの手法を大胆に使うことで知られており、常に僅差の接戦を演出し続けることで、レースを最後まで緊張感のあるものに保つ。

## 仕組み

1. プレイヤーとCPUの間の「差」(コース上の距離、順位、経過タイムなど)を継続的に計測する
2. 差が0(拮抗)のときの基準速度に対して、差が開くほど速度を補正する量を大きくする**補正関数**を定義する。単純な線形補正なら`speed_adjustment = k・(distance_behind - distance_ahead)`のような形で、プレイヤーとの差に比例した補正がかかる
3. CPUがプレイヤーより大きく先行している場合は減速方向、大きく遅れている場合は加速方向に補正をかける
4. 補正量には上限・下限(クランプ)を設け、極端な減速・加速でプレイヤーに違和感を与えすぎないようにする。また補正を瞬間的に反映するのではなく、緩やかに(数フレームかけて)適用することで自然さを保つ
5. 毎フレーム(またはコース上の一定間隔ごとに)1〜4を繰り返し、レース中を通して両者の差が一定範囲に収まるよう調整し続ける

## 特性・トレードオフ

- **常に接戦を演出できる**: プレイヤーの実力に関わらず、レースの終盤まで僅差の展開が保たれやすく、「勝てるかもしれない」という緊張感を維持できる。特にカジュアル層向けのレースゲームでは、上級者の独走・初心者の惨敗という両極端を避け、誰でも楽しめる体験を作る効果がある
- **「理不尽さ」との紙一重の設計**: プレイヤーが上手く走っているのに追いつかれる、逆に下手なのに簡単に勝ててしまうといった調整が露骨すぎると、「実力が反映されない」という不満につながりやすい。差を縮める手段を「速度そのもの」ではなく「アイテムの強さ」(下位ほど強力なアイテムが出やすい、[エイリアス法](/algorithms/alias-method)による重み付き抽選と組み合わせられる)に限定するなど、露骨さを抑える工夫が実務では重要になる
- **[DDA](/algorithms/dynamic-difficulty-adjustment)との違い**: DDAがプレイヤーの実力を長期的に推定して難易度全体を調整するのに対し、ラバーバンドAIはレース中の瞬間的な位置関係にのみ反応する、より局所的でリアルタイムな調整である
- **使いどころ**: レースゲームのCPU速度調整(『マリオカート』シリーズが代表例)、追跡・逃走型のアクションゲームの敵の移動速度制御、協力プレイでのプレイヤー間の進行度合わせ(離れすぎたプレイヤーをテレポートさせず自然に追いつかせる)

## 実装例

```python
def rubber_band_adjustment(
    player_progress: float, cpu_progress: float, k: float = 0.1, max_adjustment: float = 0.3,
) -> float:
    """progress: コース上の進行度(0〜1)。戻り値はCPUの基準速度への倍率補正(正なら加速)。"""
    gap = player_progress - cpu_progress  # 正ならプレイヤーが先行
    adjustment = k * gap
    return max(-max_adjustment, min(max_adjustment, adjustment))

def smoothed_rubber_band(
    current_adjustment: float, target_adjustment: float, smoothing: float = 0.1,
) -> float:
    """急激な速度変化を避けるため、目標値へ緩やかに近づける。"""
    return current_adjustment + (target_adjustment - current_adjustment) * smoothing
```

```typescript
function rubberBandAdjustment(
  playerProgress: number, cpuProgress: number, k = 0.1, maxAdjustment = 0.3,
): number {
  const gap = playerProgress - cpuProgress;
  const adjustment = k * gap;
  return Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));
}

function smoothedRubberBand(currentAdjustment: number, targetAdjustment: number, smoothing = 0.1): number {
  return currentAdjustment + (targetAdjustment - currentAdjustment) * smoothing;
}
```

```cpp
#include <algorithm>

double rubberBandAdjustment(double playerProgress, double cpuProgress, double k = 0.1, double maxAdjustment = 0.3) {
    double gap = playerProgress - cpuProgress;
    double adjustment = k * gap;
    return std::max(-maxAdjustment, std::min(maxAdjustment, adjustment));
}

double smoothedRubberBand(double currentAdjustment, double targetAdjustment, double smoothing = 0.1) {
    return currentAdjustment + (targetAdjustment - currentAdjustment) * smoothing;
}
```

```rust
fn rubber_band_adjustment(player_progress: f64, cpu_progress: f64, k: f64, max_adjustment: f64) -> f64 {
    let gap = player_progress - cpu_progress;
    let adjustment = k * gap;
    adjustment.clamp(-max_adjustment, max_adjustment)
}

fn smoothed_rubber_band(current_adjustment: f64, target_adjustment: f64, smoothing: f64) -> f64 {
    current_adjustment + (target_adjustment - current_adjustment) * smoothing
}
```

```csharp
static double RubberBandAdjustment(double playerProgress, double cpuProgress, double k = 0.1, double maxAdjustment = 0.3)
{
    double gap = playerProgress - cpuProgress;
    double adjustment = k * gap;
    return Math.Max(-maxAdjustment, Math.Min(maxAdjustment, adjustment));
}

static double SmoothedRubberBand(double currentAdjustment, double targetAdjustment, double smoothing = 0.1)
{
    return currentAdjustment + (targetAdjustment - currentAdjustment) * smoothing;
}
```
