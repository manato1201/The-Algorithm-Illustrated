---
name: ピティシステム(天井保証付き重み付き抽選)
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1回の抽選あたり)
summary: レアアイテムの排出確率を、外れが続くほど段階的に引き上げる(ソフトピティ)か一定回数で確定させる(ハードピティ)ことで、体感的な「ハズレ運の悪さ」を保証つきで軽減するガチャ設計手法。
---

## 概要

低確率(例: 1%)のレアアイテム抽選を毎回独立に行うと、確率的には正しくても、運が悪いプレイヤーは何百回試行してもレアアイテムを引けない事態が起こりうる(幾何分布の裾の長さ)。これは統計的には自然な現象だが、プレイヤー体験としては「運ゲーに理不尽に負け続けている」という強いストレスを生む。ピティシステム(pity、「哀れみ」の意)は、**外れが続くほど次の当たり確率を段階的に引き上げる(ソフトピティ)**、または**一定回数外れが続いたら次の抽選を強制的に当たりにする(ハードピティ/天井)**という仕組みを組み込むことで、確率的な公平さと「一定回数以内には必ず報われる」という体験上の安心感を両立させる。『Fate/Grand Order』『原神』などのガチャ実装で広く知られるようになった設計パターン。

## 仕組み

**ハードピティ(天井)**:
1. 連続で外れた回数(カウンタ)を記録しておく
2. カウンタが天井回数`N`(例: 90回)に達したら、その回の抽選は確率計算をせず強制的に当たりとする
3. 当たりが出たらカウンタを0にリセットする

**ソフトピティ(段階的な確率引き上げ)**:
1. 基本確率`p_base`と、確率の引き上げが始まる閾値回数`T`、引き上げ幅`Δp`を用意する
2. 連続外れ回数が`T`回を超えたら、それ以降1回外れるごとに今回の当たり確率を`p_base + Δp・(連続外れ回数 - T)`のように引き上げていく
3. 実際の抽選では、この動的に計算した確率を使って乱数と比較し、当たり/外れを判定する
4. 当たりが出たらカウンタをリセットし、確率も基本確率`p_base`に戻す

多くの実運用ではソフトピティとハードピティを併用し、「T回目あたりから確率が徐々に上がっていき、N回目には確率100%(天井)に達する」という設計にすることで、確率のなだらかな上昇と最終的な保証を両立させる。

## 特性・トレードオフ

- **体感的な公平さと数学的な確率の両立**: 純粋な独立試行では「運が悪いと際限なくハズレ続ける」ことが理論上あり得るが、天井を設けることで最大でも`N`回以内に当たりが保証され、プレイヤーの期待値管理・課金額の見積もりがしやすくなる
- **平均消費量の設計がしやすい**: ソフトピティ付きの確率上昇曲線を設計すれば、当たりを引くまでの平均試行回数を、基本確率だけの場合よりも精密にコントロールできる(マーケティング上・収益設計上の指標として重要)
- **確率の透明性への規制対応**: 多くの地域でガチャの確率表示が法規制の対象になっており、ピティシステムを導入する場合は「基本確率」「天井回数」「確率上昇の開始タイミング」を明示する必要がある。実装のロジック自体がユーザーへの説明責任と直結する
- **使いどころ**: スマートフォンゲームのガチャ・抽選システム、収集要素のあるゲームのレアドロップ保証、トレーディングカードゲームのパック開封確率設計

## 実装例

```python
class PitySystem:
    def __init__(self, base_prob: float, soft_pity_start: int, hard_pity: int, prob_step: float):
        self.base_prob = base_prob
        self.soft_pity_start = soft_pity_start
        self.hard_pity = hard_pity
        self.prob_step = prob_step
        self.miss_streak = 0

    def current_probability(self) -> float:
        if self.miss_streak >= self.hard_pity - 1:
            return 1.0  # 天井: 次回は確定当たり
        if self.miss_streak >= self.soft_pity_start:
            extra = self.miss_streak - self.soft_pity_start + 1
            return min(1.0, self.base_prob + self.prob_step * extra)
        return self.base_prob

    def roll(self, random_value: float) -> bool:
        """random_valueは呼び出し側が生成した[0,1)の乱数。当たりならTrueを返す。"""
        prob = self.current_probability()
        is_hit = random_value < prob
        self.miss_streak = 0 if is_hit else self.miss_streak + 1
        return is_hit
```

```typescript
class PitySystem {
  private missStreak = 0;
  constructor(
    private baseProb: number,
    private softPityStart: number,
    private hardPity: number,
    private probStep: number,
  ) {}

  currentProbability(): number {
    if (this.missStreak >= this.hardPity - 1) return 1.0;
    if (this.missStreak >= this.softPityStart) {
      const extra = this.missStreak - this.softPityStart + 1;
      return Math.min(1.0, this.baseProb + this.probStep * extra);
    }
    return this.baseProb;
  }

  roll(randomValue: number): boolean {
    const prob = this.currentProbability();
    const isHit = randomValue < prob;
    this.missStreak = isHit ? 0 : this.missStreak + 1;
    return isHit;
  }
}
```

```cpp
class PitySystem {
    double baseProb, probStep;
    int softPityStart, hardPity;
    int missStreak = 0;

public:
    PitySystem(double baseProb_, int softPityStart_, int hardPity_, double probStep_)
        : baseProb(baseProb_), probStep(probStep_), softPityStart(softPityStart_), hardPity(hardPity_) {}

    double currentProbability() const {
        if (missStreak >= hardPity - 1) return 1.0;
        if (missStreak >= softPityStart) {
            int extra = missStreak - softPityStart + 1;
            return std::min(1.0, baseProb + probStep * extra);
        }
        return baseProb;
    }

    bool roll(double randomValue) {
        double prob = currentProbability();
        bool isHit = randomValue < prob;
        missStreak = isHit ? 0 : missStreak + 1;
        return isHit;
    }
};
```

```rust
struct PitySystem {
    base_prob: f64,
    soft_pity_start: i32,
    hard_pity: i32,
    prob_step: f64,
    miss_streak: i32,
}

impl PitySystem {
    fn new(base_prob: f64, soft_pity_start: i32, hard_pity: i32, prob_step: f64) -> Self {
        PitySystem { base_prob, soft_pity_start, hard_pity, prob_step, miss_streak: 0 }
    }

    fn current_probability(&self) -> f64 {
        if self.miss_streak >= self.hard_pity - 1 {
            return 1.0;
        }
        if self.miss_streak >= self.soft_pity_start {
            let extra = (self.miss_streak - self.soft_pity_start + 1) as f64;
            return (self.base_prob + self.prob_step * extra).min(1.0);
        }
        self.base_prob
    }

    fn roll(&mut self, random_value: f64) -> bool {
        let prob = self.current_probability();
        let is_hit = random_value < prob;
        self.miss_streak = if is_hit { 0 } else { self.miss_streak + 1 };
        is_hit
    }
}
```

```csharp
class PitySystem
{
    readonly double baseProb, probStep;
    readonly int softPityStart, hardPity;
    int missStreak = 0;

    public PitySystem(double baseProb, int softPityStart, int hardPity, double probStep)
    {
        this.baseProb = baseProb;
        this.softPityStart = softPityStart;
        this.hardPity = hardPity;
        this.probStep = probStep;
    }

    public double CurrentProbability()
    {
        if (missStreak >= hardPity - 1) return 1.0;
        if (missStreak >= softPityStart)
        {
            int extra = missStreak - softPityStart + 1;
            return Math.Min(1.0, baseProb + probStep * extra);
        }
        return baseProb;
    }

    public bool Roll(double randomValue)
    {
        double prob = CurrentProbability();
        bool isHit = randomValue < prob;
        missStreak = isHit ? 0 : missStreak + 1;
        return isHit;
    }
}
```
