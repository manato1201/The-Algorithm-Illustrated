---
name: ステアリング行動(Steering Behaviors)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(1)(1エージェント・1ステップあたり。近傍探索を伴う行動はO(k)、kは近傍数)
summary: seek(追跡)・flee(逃避)・arrive(減速停止)・wander(徘徊)など、個々のエージェントが自身の位置・速度・周囲の情報だけから次の一歩の操舵力を決める基本移動則の集合で、群れの創発的な動きもこれらの組み合わせの上に成り立つ。
---

## 概要

ゲームキャラクターやNPCを「目的地に向かって自然に動かす」というのは、一見単純に見えて実装が難しい問題である。目的地の座標へ直線的に瞬間移動させるのは論外としても、単純に「毎フレーム目的地方向へ一定速度で進める」だけでは、急停止・急旋回だらけのぎこちない動きになる。ステアリング行動は、1987年のBoidsで知られるクレイグ・レイノルズが1999年の論文「Steering Behaviors For Autonomous Characters」で体系化した考え方で、キャラクターの移動を**位置に対する力ではなく、加速度(操舵力)に対する合成**として扱う。seek(目標へ向かう)・flee(目標から逃げる)・arrive(近づくにつれ減速して止まる)・wander(ランダムに徘徊する)・pursue(動く目標を予測して追う)といった、個々のエージェントが自分の状態と周囲の局所的な情報だけから計算できる小さな「操舵則」の集合として整理されており、これらを重み付けして合成することで、複雑で自然な移動パターンを組み立てられる。[Boids](/algorithms/boids)による群れの創発的な振る舞いも、内部的には個々のエージェントがseek・separate(分離)といったステアリング行動を組み合わせて動いているにすぎず、ステアリング行動は群れシミュレーションを含む個体ベースの移動制御全般の共通基盤になっている。

## 仕組み

ステアリング行動の核心は「望ましい速度(desired velocity)と現在の速度の差を操舵力として使う」という統一的な計算パターンにある。

1. **seek(追跡)**: 目標地点への望ましい速度を「目標方向への最大速度のベクトル」として求め、`steering = desired_velocity - current_velocity` を操舵力とする。これを毎フレーム現在の速度に加算し、最大操舵力・最大速度でクランプすることで滑らかな加速旋回になる
2. **flee(逃避)**: seekの望ましい速度を反転させるだけで得られる。「目標から遠ざかる方向への最大速度」を望ましい速度とする
3. **arrive(減速停止)**: seekと似ているが、目標までの距離が減速半径`R`を下回ると、望ましい速度の大きさを`距離/R`に比例して小さくする。これにより目標に近づくほど自然に減速し、行き過ぎずに停止できる。減速半径がないseekは目標到達時にも最大速度で向かい続け、通り過ぎては戻る「振動」を起こしやすい
4. **wander(徘徊)**: キャラクターの前方に仮想的な円を置き、円周上のある一点をランダムウォークさせ、その点への方向を望ましい速度とする。円を前方に固定することで急激な方向転換を避けつつ、緩やかにランダムな探索的移動を作れる
5. **pursue/evade(予測追跡・回避)**: 目標の現在位置ではなく「目標が今の速度で進み続けた場合の将来位置」を予測してseek/fleeを適用する。単純な追跡より自然な「先回り」「先読み回避」の動きになる
6. **複数の操舵行動の合成**: 実際のキャラクターは複数の行動(例: 目的地へseekしつつ障害物からflee的に離れる)を同時に必要とすることが多く、各行動の操舵力を重み付き和で合成する、あるいは優先度順に累積加算して最大操舵力に達したら打ち切る、といった合成戦略が使われる

## 特性・トレードオフ

- **モジュール性と組み合わせやすさ**: 各行動は「現在の位置・速度」と「局所的な目標や障害物の情報」だけから独立に計算できる小さな関数であり、疎結合な部品として自由に組み合わせられる。複雑な移動パターンを一枚岩のロジックで書くより、保守性・再利用性が高い
- **力ベースゆえの滑らかさと引き換えの精度**: 加速度(操舵力)を合成して積分するため、瞬間移動や急な進行方向の反転がなく、物理的に自然な動きになる。一方で最大速度・最大操舵力の制約により、狭い通路での正確な位置合わせのような精度が求められる用途にはそのままでは向かない
- **局所的視野の限界**: 各行動は基本的に自分の周辺の情報しか見ないため、[ポテンシャルフィールド法](/algorithms/potential-field-navigation)と同様に、複雑な地形での大域的な最短経路は保証されない。実運用では[ナビゲーションメッシュ](/algorithms/navmesh-generation)や[ウェイポイントグラフ](/algorithms/waypoint-graph-navigation)による大域経路計画で大まかなルートを決め、ルート上の各区間をステアリング行動(特にseek/arrive)で実際に移動する、という二層構成が一般的
- **群れ行動の構成要素としての役割**: [Boids](/algorithms/boids)のseparate(近すぎる仲間から離れる)・align(仲間と速度を揃える)・cohesion(仲間の中心へ寄る)は、いずれもステアリング行動の枠組みで書ける操舵則であり、Boidsはこれらとseek/wanderを合成した特殊ケースと見なせる
- **使いどころ**: NPCの単体移動制御全般、群れ・群衆シミュレーションの個体レベルの動き、レースゲームのAIカーの追従・回避、tps/アクションゲームの敵の接近・後退行動

## 実装例

```python
import math
import random

Vec2 = tuple[float, float]

def _sub(a: Vec2, b: Vec2) -> Vec2:
    return (a[0] - b[0], a[1] - b[1])

def _len(v: Vec2) -> float:
    return math.hypot(v[0], v[1])

def _scale_to(v: Vec2, length: float) -> Vec2:
    mag = _len(v) or 1e-6
    return (v[0] / mag * length, v[1] / mag * length)

def _clamp(v: Vec2, max_len: float) -> Vec2:
    mag = _len(v)
    if mag <= max_len or mag < 1e-6:
        return v
    return _scale_to(v, max_len)


class SteeringAgent:
    def __init__(self, pos: Vec2, max_speed: float = 4.0, max_force: float = 0.5):
        self.pos = pos
        self.vel: Vec2 = (0.0, 0.0)
        self.max_speed = max_speed
        self.max_force = max_force
        self._wander_angle = 0.0

    def seek(self, target: Vec2) -> Vec2:
        desired = _scale_to(_sub(target, self.pos), self.max_speed)
        return _clamp(_sub(desired, self.vel), self.max_force)

    def flee(self, target: Vec2) -> Vec2:
        desired = _scale_to(_sub(self.pos, target), self.max_speed)
        return _clamp(_sub(desired, self.vel), self.max_force)

    def arrive(self, target: Vec2, slow_radius: float = 3.0) -> Vec2:
        offset = _sub(target, self.pos)
        dist = _len(offset)
        speed = self.max_speed * min(dist / slow_radius, 1.0) if dist > 0 else 0.0
        desired = _scale_to(offset, speed) if dist > 1e-6 else (0.0, 0.0)
        return _clamp(_sub(desired, self.vel), self.max_force)

    def wander(self, circle_dist: float = 3.0, circle_radius: float = 1.5, jitter: float = 0.3) -> Vec2:
        self._wander_angle += random.uniform(-jitter, jitter)
        heading = math.atan2(self.vel[1], self.vel[0]) if _len(self.vel) > 1e-6 else 0.0
        center = (self.pos[0] + math.cos(heading) * circle_dist, self.pos[1] + math.sin(heading) * circle_dist)
        target = (
            center[0] + math.cos(self._wander_angle) * circle_radius,
            center[1] + math.sin(self._wander_angle) * circle_radius,
        )
        return self.seek(target)

    def update(self, steering: Vec2, dt: float = 1.0) -> None:
        self.vel = _clamp((self.vel[0] + steering[0] * dt, self.vel[1] + steering[1] * dt), self.max_speed)
        self.pos = (self.pos[0] + self.vel[0] * dt, self.pos[1] + self.vel[1] * dt)
```

```typescript
type Vec2 = [number, number];

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const len = (v: Vec2): number => Math.hypot(v[0], v[1]);
const scaleTo = (v: Vec2, length: number): Vec2 => {
  const mag = len(v) || 1e-6;
  return [(v[0] / mag) * length, (v[1] / mag) * length];
};
const clamp = (v: Vec2, maxLen: number): Vec2 => {
  const mag = len(v);
  if (mag <= maxLen || mag < 1e-6) return v;
  return scaleTo(v, maxLen);
};

class SteeringAgent {
  vel: Vec2 = [0, 0];
  private wanderAngle = 0;

  constructor(
    public pos: Vec2,
    private maxSpeed = 4.0,
    private maxForce = 0.5,
  ) {}

  seek(target: Vec2): Vec2 {
    const desired = scaleTo(sub(target, this.pos), this.maxSpeed);
    return clamp(sub(desired, this.vel), this.maxForce);
  }

  flee(target: Vec2): Vec2 {
    const desired = scaleTo(sub(this.pos, target), this.maxSpeed);
    return clamp(sub(desired, this.vel), this.maxForce);
  }

  arrive(target: Vec2, slowRadius = 3.0): Vec2 {
    const offset = sub(target, this.pos);
    const dist = len(offset);
    const speed =
      dist > 0 ? this.maxSpeed * Math.min(dist / slowRadius, 1.0) : 0;
    const desired: Vec2 = dist > 1e-6 ? scaleTo(offset, speed) : [0, 0];
    return clamp(sub(desired, this.vel), this.maxForce);
  }

  wander(circleDist = 3.0, circleRadius = 1.5, jitter = 0.3): Vec2 {
    this.wanderAngle += (Math.random() * 2 - 1) * jitter;
    const heading =
      len(this.vel) > 1e-6 ? Math.atan2(this.vel[1], this.vel[0]) : 0;
    const center: Vec2 = [
      this.pos[0] + Math.cos(heading) * circleDist,
      this.pos[1] + Math.sin(heading) * circleDist,
    ];
    const target: Vec2 = [
      center[0] + Math.cos(this.wanderAngle) * circleRadius,
      center[1] + Math.sin(this.wanderAngle) * circleRadius,
    ];
    return this.seek(target);
  }

  update(steering: Vec2, dt = 1.0): void {
    this.vel = clamp(
      [this.vel[0] + steering[0] * dt, this.vel[1] + steering[1] * dt],
      this.maxSpeed,
    );
    this.pos = [this.pos[0] + this.vel[0] * dt, this.pos[1] + this.vel[1] * dt];
  }
}
```
