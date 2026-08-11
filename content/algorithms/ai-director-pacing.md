---
name: AIディレクター(テンションカーブに基づくペーシング制御)
category: キャラクターAI・空間AI
subcategory: メタAI・ペーシング制御
complexity: O(1)(1回の評価あたり)
summary: プレイヤーの緊張度を数値化した「テンション値」を継続的に推定し、盛り上がり(敵の増加)と緩和(小休止)の波を自動生成することで、一本道でも単調にならない起伏のある体験を作る「メタAI」の設計手法。
---

## 概要

[動的難易度調整(DDA)](/algorithms/dynamic-difficulty-adjustment)がプレイヤーの「上手さ」に応じて難易度を調整するのに対し、AIディレクターはプレイヤーの**体験のリズム(緊張と緩和の波)**そのものを設計・制御する、より上位のメタAIである。『Left 4 Dead』(2008年)で初めて広く知られたこの手法は、映画や小説の脚本術における「起承転結」「緊張と緩和」の概念をゲームプレイ中にリアルタイムで生成しようとする——固定的にスクリプトされた演出ではなく、プレイヤーの状態(体力、戦闘の激しさ、直前の緊張が続いた時間)を継続的に観測し、「今は緊張を高めるべきか、休憩を与えるべきか」を判断して、敵の出現数やアイテムの配置を動的に調整する。

## 仕組み

1. プレイヤー(またはチーム)の現在の**緊張度(テンション値)**を、体力の減少・被弾・敵との交戦状況などから継続的に推定する
2. あらかじめ理想的な「テンションカーブ」(時間経過に対する望ましい緊張度の推移、例えば緊張の山と谷を交互に繰り返す波形)を設計しておく
3. 現在の実際のテンション値と、理想のテンションカーブが示す目標値を比較する
4. 実際のテンションが目標より低ければ、敵の出現数を増やす・強い敵を配置するなどして緊張を高める方向に介入する。逆に、プレイヤーが緊張状態を続けて疲弊していると判断されれば(テンションが高い状態が一定時間続いた場合)、意図的に敵の出現を抑え、アイテムを配置するなどして「小休止(ブレス)」の区間を作る
5. 1〜4をプレイ中継続的に繰り返すことで、固定シナリオでありながら毎回異なる敵の配置・タイミングで、緊張と緩和のリズムを持つ体験を生成する。『Left 4 Dead』ではこの機構が、雑魚の量を調整する「Population Director」と、特殊敵の出現を管理する「Boss Director」など複数のサブシステムに分かれて協調動作する

## 特性・トレードオフ

- **固定シナリオに動的なリズムを与える**: レベルデザイン自体は事前に作られた固定のマップであっても、敵の出現数・タイミング・強さをAIディレクターが動的に調整することで、プレイするたびに緊張と緩和のパターンが変わり、周回プレイでも新鮮さを保ちやすい
- **「疲弊させないこと」への配慮**: 単に敵を増やし続けるのではなく、意図的に緊張を緩める区間を作る点がこの手法の核心。緊張が続きすぎるとプレイヤーが疲弊してストレスに変わるため、テンションカーブの「谷」の設計が体験の質を大きく左右する
- **[DDA](/algorithms/dynamic-difficulty-adjustment)との役割分担**: DDAが「プレイヤーの実力に対して難易度が適切か」を扱うのに対し、AIディレクターは「体験のリズムが単調になっていないか」を扱う、直交する軸の調整である。実際のゲームでは両者を組み合わせて使うことも多い(実力が高いプレイヤーには、テンションの山をより高く設定するなど)
- **使いどころ**: 協力型サバイバルホラー/シューティングゲームの敵配置制御(『Left 4 Dead』シリーズが代表例)、ローグライクゲームの階層難易度・イベント頻度の動的調整、音楽・BGMの盛り上がりをゲーム内の緊張度に同期させる演出システム

## 実装例

```python
import math

class AiDirector:
    def __init__(self, cycle_length: float = 120.0, base_intensity: float = 5.0):
        self.cycle_length = cycle_length  # 1つの緊張の山〜谷のサイクル長(秒)
        self.base_intensity = base_intensity
        self.elapsed = 0.0
        self.tension = 0.0

    def target_tension(self) -> float:
        """理想のテンションカーブ: サイン波で緊張と緩和を周期的に繰り返す。"""
        phase = (self.elapsed % self.cycle_length) / self.cycle_length
        return self.base_intensity * (0.5 + 0.5 * math.sin(2 * math.pi * phase - math.pi / 2))

    def update(self, dt: float, observed_tension: float) -> float:
        """observed_tension: プレイヤーの体力減少・被弾などから推定した現在の緊張度。
        戻り値: 敵の出現率などに使う強度係数。"""
        self.elapsed += dt
        self.tension = observed_tension
        target = self.target_tension()
        error = target - self.tension
        # プレイヤーが疲弊していれば(テンションが高い状態が続いていれば)介入を弱める
        spawn_intensity = max(0.0, min(1.0, 0.5 + error / (2 * self.base_intensity)))
        return spawn_intensity
```

```typescript
class AiDirector {
  private elapsed = 0;
  private tension = 0;
  constructor(private cycleLength = 120.0, private baseIntensity = 5.0) {}

  targetTension(): number {
    const phase = (this.elapsed % this.cycleLength) / this.cycleLength;
    return this.baseIntensity * (0.5 + 0.5 * Math.sin(2 * Math.PI * phase - Math.PI / 2));
  }

  update(dt: number, observedTension: number): number {
    this.elapsed += dt;
    this.tension = observedTension;
    const target = this.targetTension();
    const error = target - this.tension;
    const spawnIntensity = Math.max(0, Math.min(1, 0.5 + error / (2 * this.baseIntensity)));
    return spawnIntensity;
  }
}
```

```cpp
#include <cmath>
#include <algorithm>

class AiDirector {
    double cycleLength, baseIntensity;
    double elapsed = 0.0, tension = 0.0;

public:
    AiDirector(double cycleLength_ = 120.0, double baseIntensity_ = 5.0)
        : cycleLength(cycleLength_), baseIntensity(baseIntensity_) {}

    double targetTension() const {
        double phase = std::fmod(elapsed, cycleLength) / cycleLength;
        return baseIntensity * (0.5 + 0.5 * std::sin(2 * M_PI * phase - M_PI / 2));
    }

    double update(double dt, double observedTension) {
        elapsed += dt;
        tension = observedTension;
        double target = targetTension();
        double error = target - tension;
        return std::max(0.0, std::min(1.0, 0.5 + error / (2 * baseIntensity)));
    }
};
```

```rust
struct AiDirector {
    cycle_length: f64,
    base_intensity: f64,
    elapsed: f64,
    tension: f64,
}

impl AiDirector {
    fn new(cycle_length: f64, base_intensity: f64) -> Self {
        AiDirector { cycle_length, base_intensity, elapsed: 0.0, tension: 0.0 }
    }

    fn target_tension(&self) -> f64 {
        let phase = (self.elapsed % self.cycle_length) / self.cycle_length;
        self.base_intensity * (0.5 + 0.5 * (2.0 * std::f64::consts::PI * phase - std::f64::consts::PI / 2.0).sin())
    }

    fn update(&mut self, dt: f64, observed_tension: f64) -> f64 {
        self.elapsed += dt;
        self.tension = observed_tension;
        let target = self.target_tension();
        let error = target - self.tension;
        (0.5 + error / (2.0 * self.base_intensity)).clamp(0.0, 1.0)
    }
}
```

```csharp
class AiDirector
{
    readonly double cycleLength, baseIntensity;
    double elapsed = 0, tension = 0;

    public AiDirector(double cycleLength = 120.0, double baseIntensity = 5.0)
    {
        this.cycleLength = cycleLength;
        this.baseIntensity = baseIntensity;
    }

    public double TargetTension()
    {
        double phase = (elapsed % cycleLength) / cycleLength;
        return baseIntensity * (0.5 + 0.5 * Math.Sin(2 * Math.PI * phase - Math.PI / 2));
    }

    public double Update(double dt, double observedTension)
    {
        elapsed += dt;
        tension = observedTension;
        double target = TargetTension();
        double error = target - tension;
        return Math.Max(0.0, Math.Min(1.0, 0.5 + error / (2 * baseIntensity)));
    }
}
```
