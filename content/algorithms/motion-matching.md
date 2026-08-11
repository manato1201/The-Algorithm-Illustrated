---
name: モーションマッチング(Motion Matching)
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: O(n)(nはモーションデータベース中のフレーム数、1回の検索あたり)
summary: 「次にどのアニメーションを再生するか」を手作業のステートマシンで決めるのではなく、大量のモーションキャプチャデータから現在の状況と最も近い未来の動きを毎フレーム検索して再生する、データ駆動型のキャラクターアニメーション技法。
---

## 概要

[球面線形補間によるスケルタルアニメーションブレンディング](/algorithms/skeletal-animation-slerp-blending)は「歩行」「走行」といった個別のアニメーションクリップ間をSlerpで滑らかにつなぐ技術だが、つなぐべきクリップの選択自体は、開発者が事前に設計したステートマシンやブレンドツリーに委ねられていた。モーションマッチング(Motion Matching)は発想を転換し、**数百時間分ものモーションキャプチャデータをそのままデータベースとして持ち、現在のキャラクターの状態(体の姿勢・速度)と、プレイヤーが入力した目標(進みたい方向)に最も近い未来の動きを、毎フレーム検索して再生する**。ステートマシンによる明示的な遷移設計が不要になり、遷移がより自然になる利点から、『For Honor』『The Last of Us Part II』のような高品質なキャラクターアニメーションを持つゲームで採用が広がっている。

## 仕組み

1. **モーションデータベースの構築(オフライン)**: 大量のモーションキャプチャデータを、短いフレーム単位(またはポーズ単位)に分割し、それぞれのフレームについて「現在の関節の姿勢・速度」「これから数十〜数百ミリ秒後の軌跡(未来の移動方向・速度の予測)」を特徴ベクトルとして記録しておく
2. **クエリの構築(実行時)**: 現在のキャラクターの姿勢・速度と、プレイヤーの入力(スティックの傾き、目標移動方向)から予測される「これから望む軌跡」を組み合わせ、モーションデータベースの特徴ベクトルと同じ形式のクエリベクトルを作る
3. **最近傍検索**: モーションデータベース中の全フレーム(または効率化のためインデックス化された候補)について、現在のクエリベクトルとの距離(姿勢の近さ+望む軌跡の近さを重み付けした距離)を計算し、**最も距離が近いフレーム**を選ぶ
4. 選ばれたフレームから、そのフレームが含まれる元のモーションクリップの再生を開始する。現在再生中のアニメーションとの間には、[球面線形補間](/algorithms/skeletal-animation-slerp-blending)のようなブレンディングを短時間かけることで、切り替えの継ぎ目を目立たなくする
5. 毎フレーム(または一定間隔で)1〜4を繰り返し、常に「今の状態と入力に最もふさわしい」モーションを探し続ける。多くの場合、同じクリップの再生を継続する方が距離が近いと判定され続けるため、不必要に頻繁な切り替えは起こらない

## 特性・トレードオフ

- **手作業のステートマシン設計が不要になる**: 従来のアニメーションシステムは「歩行から走行への遷移」のような組み合わせを開発者が[階層型有限状態機械(HFSM)](/algorithms/hierarchical-fsm)やブレンドツリーとして明示的に設計する必要があったが、モーションマッチングはデータベースの検索だけでこれを代替する。モーションデータが豊富であるほど、より多様で自然な状況に対応できる
- **大量のモーションデータと検索コストが必要**: 高品質な結果を得るには数百時間規模のモーションキャプチャデータが必要になることが多く、そのデータの収集・クリーニングにはコストがかかる。また検索自体もフレーム数に比例するため、KD-treeやVPツリーのような空間分割構造で最近傍検索を高速化する工夫が実務では重要になる
- **物理的な制約や環境との整合性**: 純粋なデータ駆動の検索だけでは、地形の凹凸や障害物との接触といった物理的な制約を完全には考慮できないことがあり、IK([FABRIK法](/algorithms/fabrik-ik)のような逆運動学)による足の接地補正など、他の技術と組み合わせて使われることが多い
- **使いどころ**: 高品質な人型キャラクターのロコモーション(歩行・走行・方向転換)アニメーション、格闘ゲーム・アクションゲームの自然な動作遷移、モーションキャプチャデータが豊富に用意できるAAAゲームタイトルの制作パイプライン

## 実装例

簡略化した特徴ベクトル(現在速度+目標速度)によるモーションデータベースの最近傍検索を示す。

```python
from dataclasses import dataclass

@dataclass
class MotionFrame:
    clip_id: str
    frame_index: int
    current_velocity: tuple[float, float]
    future_trajectory: tuple[float, float]  # 予測される未来の速度・方向

def feature_distance(a: MotionFrame, b_velocity: tuple[float, float], b_trajectory: tuple[float, float], trajectory_weight: float = 1.5) -> float:
    vel_dist = (a.current_velocity[0] - b_velocity[0]) ** 2 + (a.current_velocity[1] - b_velocity[1]) ** 2
    traj_dist = (a.future_trajectory[0] - b_trajectory[0]) ** 2 + (a.future_trajectory[1] - b_trajectory[1]) ** 2
    return vel_dist + trajectory_weight * traj_dist

def find_best_matching_frame(
    database: list[MotionFrame], current_velocity: tuple[float, float], desired_trajectory: tuple[float, float],
) -> MotionFrame:
    return min(database, key=lambda f: feature_distance(f, current_velocity, desired_trajectory))
```

```typescript
type MotionFrame = {
  clipId: string;
  frameIndex: number;
  currentVelocity: [number, number];
  futureTrajectory: [number, number];
};

function featureDistance(
  a: MotionFrame,
  bVelocity: [number, number],
  bTrajectory: [number, number],
  trajectoryWeight = 1.5,
): number {
  const velDist =
    (a.currentVelocity[0] - bVelocity[0]) ** 2 +
    (a.currentVelocity[1] - bVelocity[1]) ** 2;
  const trajDist =
    (a.futureTrajectory[0] - bTrajectory[0]) ** 2 +
    (a.futureTrajectory[1] - bTrajectory[1]) ** 2;
  return velDist + trajectoryWeight * trajDist;
}

function findBestMatchingFrame(
  database: MotionFrame[],
  currentVelocity: [number, number],
  desiredTrajectory: [number, number],
): MotionFrame {
  return database.reduce((best, f) =>
    featureDistance(f, currentVelocity, desiredTrajectory) <
    featureDistance(best, currentVelocity, desiredTrajectory)
      ? f
      : best,
  );
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <limits>

struct MotionFrame {
    std::string clipId;
    int frameIndex;
    std::pair<double, double> currentVelocity;
    std::pair<double, double> futureTrajectory;
};

double featureDistance(const MotionFrame& a, std::pair<double, double> bVel, std::pair<double, double> bTraj, double trajectoryWeight = 1.5) {
    double velDist = std::pow(a.currentVelocity.first - bVel.first, 2) + std::pow(a.currentVelocity.second - bVel.second, 2);
    double trajDist = std::pow(a.futureTrajectory.first - bTraj.first, 2) + std::pow(a.futureTrajectory.second - bTraj.second, 2);
    return velDist + trajectoryWeight * trajDist;
}

const MotionFrame& findBestMatchingFrame(
    const std::vector<MotionFrame>& database, std::pair<double, double> currentVelocity, std::pair<double, double> desiredTrajectory) {
    return *std::min_element(database.begin(), database.end(), [&](const MotionFrame& a, const MotionFrame& b) {
        return featureDistance(a, currentVelocity, desiredTrajectory) < featureDistance(b, currentVelocity, desiredTrajectory);
    });
}
```

```rust
struct MotionFrame {
    clip_id: String,
    frame_index: usize,
    current_velocity: (f64, f64),
    future_trajectory: (f64, f64),
}

fn feature_distance(a: &MotionFrame, b_vel: (f64, f64), b_traj: (f64, f64), trajectory_weight: f64) -> f64 {
    let vel_dist = (a.current_velocity.0 - b_vel.0).powi(2) + (a.current_velocity.1 - b_vel.1).powi(2);
    let traj_dist = (a.future_trajectory.0 - b_traj.0).powi(2) + (a.future_trajectory.1 - b_traj.1).powi(2);
    vel_dist + trajectory_weight * traj_dist
}

fn find_best_matching_frame<'a>(
    database: &'a [MotionFrame], current_velocity: (f64, f64), desired_trajectory: (f64, f64),
) -> &'a MotionFrame {
    database
        .iter()
        .min_by(|a, b| {
            feature_distance(a, current_velocity, desired_trajectory, 1.5)
                .partial_cmp(&feature_distance(b, current_velocity, desired_trajectory, 1.5))
                .unwrap()
        })
        .unwrap()
}
```

```csharp
class MotionFrame
{
    public string ClipId = "";
    public int FrameIndex;
    public (double x, double y) CurrentVelocity;
    public (double x, double y) FutureTrajectory;
}

static double FeatureDistance(MotionFrame a, (double x, double y) bVel, (double x, double y) bTraj, double trajectoryWeight = 1.5)
{
    double velDist = Math.Pow(a.CurrentVelocity.x - bVel.x, 2) + Math.Pow(a.CurrentVelocity.y - bVel.y, 2);
    double trajDist = Math.Pow(a.FutureTrajectory.x - bTraj.x, 2) + Math.Pow(a.FutureTrajectory.y - bTraj.y, 2);
    return velDist + trajectoryWeight * trajDist;
}

static MotionFrame FindBestMatchingFrame(List<MotionFrame> database, (double, double) currentVelocity, (double, double) desiredTrajectory)
{
    return database.OrderBy(f => FeatureDistance(f, currentVelocity, desiredTrajectory)).First();
}
```
