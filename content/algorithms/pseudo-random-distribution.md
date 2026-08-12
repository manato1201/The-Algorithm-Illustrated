---
name: 疑似乱数分布(PRD)システム
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1回の判定あたり)
summary: クリティカルヒットなどの確率イベントを、外れが続くほど当たりやすく・当たった直後は当たりにくくなるよう調整することで、独立試行の「連続外れ」「連続当たり」がもたらす理不尽な体感を和らげる乱数制御手法。
---

## 概要

「クリティカル率25%」という数値をそのまま毎回独立なベルヌーイ試行(単純な`random() < 0.25`)で判定すると、確率的には正しくても、プレイヤーは4連続で外れたり、逆に3連続で当たったりする現象を頻繁に目撃することになる。二項分布の分散はプレイヤーの直感より大きく、「25%のはずなのに全然当たらない」という体感的な不満が生まれやすい。疑似乱数分布(Pseudo-Random Distribution、PRD)は、`Dota 2`や`League of Legends`で採用されている手法で、**外れが続くほど次の当たり確率を引き上げ、当たった直後は確率をリセットする**ことで、長期的な当選率は指定値(例えば25%)に収束させつつ、プレイヤーが体感する「連続外れ」「連続当たり」の頻度を独立試行より大幅に減らす。[ピティシステム](/algorithms/pity-system)と同じく「外れが続くと当たりやすくなる」という発想を持つが、目的とパラメータ設計が異なる——PRDは天井(hard pity)を設けず、あくまで**単発の判定における体感のばらつきを抑える**ことに主眼を置く。

## 仕組み

PRDの核心は、「連続失敗回数`n`に応じて当たり確率`P(n)`を増加させる関数」の設計にある。Dota 2で使われる方式は次の通り。

1. 目標とする長期的な当選率`C`(例: 25%)を決める
2. 増加係数`ΔC`を、`C`と「1回だけ試行を許した場合の理想的な確率カーブ」から逆算する(Dota 2のGDCの発表資料に基づく近似式や、数値的な探索で求める)。一般に`ΔC`は`C`に依存し、`C`が低いほど`ΔC`は小さくなる
3. 連続失敗回数`n`(直近の成功以降に外れた回数)を保持する
4. 今回の判定確率を`P(n) = min(1, ΔC × n)`(初期値`P(0)`もこの式から得られる小さな値になる、あるいは実装によっては`P(1) = ΔC`から開始する)として計算する
5. 乱数と`P(n)`を比較し、当たりなら`n`を0にリセットし、外れなら`n`を1増やす
6. これを繰り返すと、確率が線形(またはそれに近いカーブ)で増加していき、外れが続くほど次の当たりが濃厚になる。同時に、当たった直後は確率が最小値に戻るため、連続で当たり続ける確率も独立試行より低く抑えられる

`ΔC`の値は「長期的な当選率の期待値が`C`に一致する」という制約から数値的に求めるのが一般的で、閉じた式では簡単に書けないため、ゲーム開発では事前にシミュレーションして`ΔC`をテーブル化しておくことが多い。

## 特性・トレードオフ

- **長期の期待値は変えず、分散だけを抑える**: PRDの狙いは当選率の平均を変えることではなく、**当選率のばらつき(分散)を小さくすること**にある。100回試行した場合の当たり回数の期待値は独立試行と同じ`C×100`に近いが、「10連続外れ」のような極端な事象が起きる確率は独立試行より大きく下がる
- **[ピティシステム](/algorithms/pity-system)との違い**: ピティシステムは「N回外れたら強制的に当たり」という**天井(ハードキャップ)による保証**を主目的とし、ガチャのような高額課金と結びつくレアリティ設計に使われることが多い。PRDは天井を設けず、**毎回の判定そのものの体感を滑らかにする**ことが目的で、クリティカルヒットや状態異常付与のような、対戦バランスに直結する高頻度の判定に向く。両者は「外れが続くと当たりやすくなる」という表面的な仕組みは似ているが、設計思想(保証 vs 体感の平滑化)が異なる
- **乱数生成自体への要求は変わらない**: PRDはあくまで「確率をどう時系列で変化させるか」という制御ロジックであり、個々の乱数値そのものの生成には[XorShift法](/algorithms/xorshift)のような高速な擬似乱数生成器をそのまま使える。PRDは乱数生成器の上に被せる確率調整レイヤーである
- **パラメータ調整の難しさ**: `ΔC`を数値的に求める必要があり、`C`を変更するたびに再計算が必要になる。また、増加関数を線形以外(例えば指数的)にすることもでき、カーブの形状によってプレイヤーが感じる「当たりやすさの上昇」の体感が変わるため、実際のゲームバランス調整では入念なプレイテストが必要
- **使いどころ**: MOBA・アクションゲームにおけるクリティカルヒット判定、状態異常(スタン・ミスなど)の発生判定、対戦ゲームでの確率依存スキルの発動判定など、独立試行の分散がプレイヤー体験に直接影響する高頻度の確率イベント全般

## 実装例

```python
class PseudoRandomDistribution:
    def __init__(self, target_chance: float, delta_c: float):
        """target_chance: 長期的に収束させたい当選率(0〜1)。
        delta_c: 1回外れるごとの確率増分。事前にシミュレーションで求めておく値。"""
        self.target_chance = target_chance
        self.delta_c = delta_c
        self.miss_streak = 0

    def current_probability(self) -> float:
        return min(1.0, self.delta_c * (self.miss_streak + 1))

    def roll(self, random_value: float) -> bool:
        """random_valueは呼び出し側が生成した[0,1)の乱数。当たりならTrueを返す。"""
        prob = self.current_probability()
        is_hit = random_value < prob
        self.miss_streak = 0 if is_hit else self.miss_streak + 1
        return is_hit


def estimate_delta_c(target_chance: float, trials: int = 200_000) -> float:
    """目標当選率target_chanceに対して、長期平均が一致するdelta_cを二分探索で近似する。"""
    import random

    def simulate(delta_c: float) -> float:
        prd = PseudoRandomDistribution(target_chance, delta_c)
        hits = sum(1 for _ in range(trials) if prd.roll(random.random()))
        return hits / trials

    lo, hi = 0.0, 1.0
    for _ in range(30):
        mid = (lo + hi) / 2
        rate = simulate(mid)
        if rate < target_chance:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
```

```typescript
class PseudoRandomDistribution {
  private missStreak = 0;
  constructor(
    private targetChance: number,
    private deltaC: number,
  ) {}

  currentProbability(): number {
    return Math.min(1.0, this.deltaC * (this.missStreak + 1));
  }

  roll(randomValue: number): boolean {
    const prob = this.currentProbability();
    const isHit = randomValue < prob;
    this.missStreak = isHit ? 0 : this.missStreak + 1;
    return isHit;
  }
}

function estimateDeltaC(targetChance: number, trials = 200_000): number {
  const simulate = (deltaC: number): number => {
    const prd = new PseudoRandomDistribution(targetChance, deltaC);
    let hits = 0;
    for (let i = 0; i < trials; i++) {
      if (prd.roll(Math.random())) hits++;
    }
    return hits / trials;
  };

  let lo = 0.0;
  let hi = 1.0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const rate = simulate(mid);
    if (rate < targetChance) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
```
