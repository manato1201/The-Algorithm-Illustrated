---
name: 動的難易度調整(DDA)
category: キャラクターAI・空間AI
subcategory: メタAI・ペーシング制御
complexity: O(1)(1回の調整あたり)
summary: プレイヤーのパフォーマンス(死亡回数・クリア時間など)を継続的に観測し、難易度パラメータを指数移動平均などで滑らかに追従させ、退屈でも理不尽でもない体験を保つ。
---

## 概要

固定難易度のゲームは、上手いプレイヤーには物足りなく、苦手なプレイヤーには理不尽に感じられやすい。動的難易度調整(DDA: Dynamic Difficulty Adjustment)は、プレイヤーのプレイ状況(直近の死亡回数、クリアタイム、命中率など)をゲームプレイ中にリアルタイムで観測し、敵の強さやリソースの供給量といった難易度パラメータを**プレイヤーに気づかれにくい程度に滑らかに**調整することで、「フロー理論」でいう「簡単すぎず難しすぎない没入状態」を維持しようとする設計手法である。『Left 4 Dead』のAIディレクターや『Resident Evil 4』の隠し難易度調整(通称「動的難易度」)などで知られる。

## 仕組み

1. プレイヤーのパフォーマンスを表す指標(直近N回の死亡有無、クリアタイム、命中率、被ダメージ量など)を継続的に記録する
2. 素の指標は瞬間的なブレが大きいため、そのまま反映すると難易度が急激に上下してプレイヤーに違和感を与える。そこで**指数移動平均(EMA)**などの平滑化フィルタを通し、`skillEstimate = α・newSample + (1-α)・skillEstimate`という形で、緩やかに追従する「実力の推定値」を保持する
3. 実力の推定値と、狙っている目標難易度(例: 「7割の確率でクリアできる強さ」)との差から、敵の体力・攻撃頻度・アイテムのドロップ率といった難易度パラメータを調整する
4. 調整の幅には上限・下限(クランプ)を設け、極端な易化・難化を防ぐ。また調整を離散段階(易・普通・難)にマッピングして急激な変化を避ける設計も多い
5. 1〜4をプレイ中継続的に繰り返し、プレイヤーの実力の変化(上達・疲労)に追従し続ける

## 特性・トレードオフ

- **プレイヤーに気づかれない調整が理想**: 難易度調整が露骨だと「サボると急に敵が弱くなる」ことにプレイヤーが気づき、達成感を損ないやすい。指数移動平均で緩やかに追従させたり、見た目の変化が小さいパラメータ(敵の反応速度・弾のばらつきなど)を優先的に調整したりする設計上の工夫が重要になる
- **透明な調整と隠れた調整の設計判断**: 『マリオカート』シリーズのようにアイテム抽選に明示的な調整(下位のプレイヤーほど強力なアイテムが出やすい)を組み込む設計と、『バイオハザード4』のように調整の存在自体を明かさない設計があり、ゲームジャンルやプレイヤー層に応じてどちらを選ぶかが分かれる
- **上達を正しく評価する難しさ**: 単純な死亡回数だけを見ると「あえて低リスクな戦法を選ぶ上手いプレイヤー」を「下手」と誤判定しかねない。命中率・被弾パターン・クリアタイムなど複数指標を組み合わせて実力を推定する設計が求められる
- **使いどころ**: シングルプレイのアクション/ホラーゲームの敵の強さ調整、パズルゲームのヒント表示タイミング調整、レースゲームのCPU車両の速度調整、教育アプリの問題難易度調整

## 実装例

```python
class DifficultyAdjuster:
    def __init__(self, target_skill: float = 0.7, alpha: float = 0.15, min_mult: float = 0.6, max_mult: float = 1.4):
        self.skill_estimate = target_skill
        self.target_skill = target_skill
        self.alpha = alpha
        self.min_mult = min_mult
        self.max_mult = max_mult

    def record_outcome(self, performance: float) -> float:
        """performance: 0(全滅・失敗)〜1(完璧なクリア)の実力サンプル。難易度倍率を返す。"""
        self.skill_estimate = self.alpha * performance + (1 - self.alpha) * self.skill_estimate
        # 実力が目標を上回るほど難易度を上げ、下回るほど下げる
        error = self.skill_estimate - self.target_skill
        difficulty_mult = 1.0 + error
        return max(self.min_mult, min(self.max_mult, difficulty_mult))
```

```typescript
class DifficultyAdjuster {
  private skillEstimate: number;
  constructor(
    private targetSkill = 0.7,
    private alpha = 0.15,
    private minMult = 0.6,
    private maxMult = 1.4,
  ) {
    this.skillEstimate = targetSkill;
  }

  recordOutcome(performance: number): number {
    this.skillEstimate = this.alpha * performance + (1 - this.alpha) * this.skillEstimate;
    const error = this.skillEstimate - this.targetSkill;
    const difficultyMult = 1.0 + error;
    return Math.max(this.minMult, Math.min(this.maxMult, difficultyMult));
  }
}
```

```cpp
class DifficultyAdjuster {
    double skillEstimate;
    double targetSkill, alpha, minMult, maxMult;

public:
    DifficultyAdjuster(double targetSkill = 0.7, double alpha = 0.15, double minMult = 0.6, double maxMult = 1.4)
        : skillEstimate(targetSkill), targetSkill(targetSkill), alpha(alpha), minMult(minMult), maxMult(maxMult) {}

    double recordOutcome(double performance) {
        skillEstimate = alpha * performance + (1 - alpha) * skillEstimate;
        double error = skillEstimate - targetSkill;
        double difficultyMult = 1.0 + error;
        return std::max(minMult, std::min(maxMult, difficultyMult));
    }
};
```

```rust
struct DifficultyAdjuster {
    skill_estimate: f64,
    target_skill: f64,
    alpha: f64,
    min_mult: f64,
    max_mult: f64,
}

impl DifficultyAdjuster {
    fn new(target_skill: f64, alpha: f64, min_mult: f64, max_mult: f64) -> Self {
        DifficultyAdjuster { skill_estimate: target_skill, target_skill, alpha, min_mult, max_mult }
    }

    fn record_outcome(&mut self, performance: f64) -> f64 {
        self.skill_estimate = self.alpha * performance + (1.0 - self.alpha) * self.skill_estimate;
        let error = self.skill_estimate - self.target_skill;
        let difficulty_mult = 1.0 + error;
        difficulty_mult.clamp(self.min_mult, self.max_mult)
    }
}
```

```csharp
class DifficultyAdjuster
{
    double skillEstimate;
    readonly double targetSkill, alpha, minMult, maxMult;

    public DifficultyAdjuster(double targetSkill = 0.7, double alpha = 0.15, double minMult = 0.6, double maxMult = 1.4)
    {
        skillEstimate = targetSkill;
        this.targetSkill = targetSkill;
        this.alpha = alpha;
        this.minMult = minMult;
        this.maxMult = maxMult;
    }

    public double RecordOutcome(double performance)
    {
        skillEstimate = alpha * performance + (1 - alpha) * skillEstimate;
        double error = skillEstimate - targetSkill;
        double difficultyMult = 1.0 + error;
        return Math.Max(minMult, Math.Min(maxMult, difficultyMult));
    }
}
```
