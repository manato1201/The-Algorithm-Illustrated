---
name: ファジィ論理によるAI意思決定
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(ルール数 × 変数数)(1回の推論あたり)
summary: 「体力が低い」「敵が近い」といった曖昧な概念を0〜1のメンバーシップ度で数値化し、「もし体力が低く、かつ敵が近ければ、強く逃げたい」というIF-THENルール群を並列に評価して統合することで、閾値による硬い分岐なしに滑らかな意思決定を行う。
---

## 概要

[ユーティリティAI](/algorithms/utility-ai)は複数の評価カーブの積で行動のスコアを計算するが、ファジィ論理によるAI意思決定は、より古典的で解釈しやすい**「もし〜ならば〜」というルールベース**の形で、同様の滑らかな意思決定を実現する。1965年にロトフィ・ザデーが提案したファジィ集合論に基づき、「体力が低い」「敵が近い」のような、白黒はっきり決められない曖昧な概念を、**0(全く当てはまらない)から1(完全に当てはまる)までの連続的な「メンバーシップ度(所属度)」** として数値化する。人間の専門家が自然言語で書くような直感的なIF-THENルール(「もし体力が低く、かつ敵が近ければ、逃げたい度合いを高くする」)を複数用意し、それらを同時に評価・統合することで、条件分岐の閾値をまたいだ瞬間に行動が不自然に切り替わることのない、滑らかな意思決定ロジックを構築できる。

## 仕組み

1. **ファジィ化(Fuzzification)**: 入力となる各変数(体力、敵との距離など)について、「低い」「中くらい」「高い」のような言語的なラベルそれぞれに対応する**メンバーシップ関数**(三角形や台形の形をした関数が一般的)を定義する。ある実際の値(例えば体力30%)を各ラベルのメンバーシップ関数に当てはめることで、「低い度合い0.7、中くらいの度合い0.3、高い度合い0」のような、複数のラベルへの所属度が同時に得られる
2. **ルール評価**: 「もし体力が低く(AND)敵が近ければ、逃げたい度合いは高い」のような、専門家が書いた複数のIF-THENルールを用意する。各ルールの前提部分(IF節)の真偽度は、関係する変数のメンバーシップ度を**AND(最小値を取る)** や**OR(最大値を取る)** のようなファジィ演算で組み合わせて計算する
3. 各ルールの前提部分の真偽度が、そのルールの結論部分(THEN節、例えば「逃げたい度合い」の出力側メンバーシップ関数)の**高さを制限する**(前提の真偽度が0.7なら、結論の出力メンバーシップ関数を高さ0.7で頭打ちにする)
4. **統合(Aggregation)**: 全てのルールから得られた(頭打ちにされた)出力メンバーシップ関数を重ね合わせ、1つの統合された出力ファジィ集合を作る
5. **非ファジィ化(Defuzzification)**: 統合された出力ファジィ集合から、実際に使う単一の数値(例えば「逃げたい度合い0.72」)を取り出す。代表的な方法に、集合の**重心(Centroid)を計算する**方法があり、これにより最終的な行動の強さや選択が決まる

## 特性・トレードオフ

- **人間の直感に近いルールの書きやすさ**: 「体力が低く、敵が近ければ逃げたい」というルールは、専門家(ゲームデザイナー)がそのまま自然言語に近い形で記述でき、[ユーティリティAI](/algorithms/utility-ai)の評価カーブの数式設計に比べて直感的に理解・調整しやすいという利点がある
- **閾値をまたいだ不自然な切り替えを避けられる**: 通常の条件分岐(`if 体力 < 30: 逃げる`)では、体力が29%と31%の間でAIの行動が急に切り替わってしまうが、ファジィ論理はメンバーシップ関数の重なりにより、この境界付近でも滑らかに行動の強さが変化する
- **ルール数の組み合わせ爆発**: 考慮したい変数の数が増えるほど、それら全ての組み合わせをカバーするルールの数が急激に増加する(変数ごとに3段階のラベルがあるとして、変数が4つなら`3^4=81`通りの組み合わせ)。[ユーティリティAI](/algorithms/utility-ai)が評価カーブの掛け算だけで多数の要因を統合できるのに対し、ファジィ論理は要因が増えるとルールの管理が煩雑になりやすい
- **使いどころ**: レースゲームのCPU車両の運転判断(「コーナーがきつく、かつ速度が速ければ、ブレーキを強くかける」)、格闘ゲームのAIの間合い調整、家電製品の制御ロジック(エアコンの温度調整など、ファジィ論理はゲーム以外の制御工学分野で特に広く実用化されている)、複数の曖昧な状況判断を統合する必要があるルールベースAI設計全般

## 実装例

```python
def triangular_membership(x: float, low: float, peak: float, high: float) -> float:
    if x <= low or x >= high:
        return 0.0
    if x == peak:
        return 1.0
    if x < peak:
        return (x - low) / (peak - low)
    return (high - x) / (high - peak)

def fuzzy_and(*values: float) -> float:
    return min(values)

def evaluate_flee_desire(health_pct: float, enemy_distance: float) -> float:
    health_low = triangular_membership(health_pct, -10, 0, 40)
    distance_near = triangular_membership(enemy_distance, -5, 0, 15)

    # ルール: もし体力が低く、かつ敵が近ければ、逃げたい度合いは高い
    rule_strength = fuzzy_and(health_low, distance_near)

    # 非ファジィ化(簡略版: ルール強度をそのまま出力の重みとして使う)
    return rule_strength
```

```typescript
function triangularMembership(
  x: number,
  low: number,
  peak: number,
  high: number,
): number {
  if (x <= low || x >= high) return 0;
  if (x === peak) return 1;
  if (x < peak) return (x - low) / (peak - low);
  return (high - x) / (high - peak);
}

function fuzzyAnd(...values: number[]): number {
  return Math.min(...values);
}

function evaluateFleeDesire(healthPct: number, enemyDistance: number): number {
  const healthLow = triangularMembership(healthPct, -10, 0, 40);
  const distanceNear = triangularMembership(enemyDistance, -5, 0, 15);

  const ruleStrength = fuzzyAnd(healthLow, distanceNear);
  return ruleStrength;
}
```

```cpp
#include <algorithm>

double triangularMembership(double x, double low, double peak, double high) {
    if (x <= low || x >= high) return 0.0;
    if (x == peak) return 1.0;
    if (x < peak) return (x - low) / (peak - low);
    return (high - x) / (high - peak);
}

double fuzzyAnd(double a, double b) {
    return std::min(a, b);
}

double evaluateFleeDesire(double healthPct, double enemyDistance) {
    double healthLow = triangularMembership(healthPct, -10, 0, 40);
    double distanceNear = triangularMembership(enemyDistance, -5, 0, 15);

    return fuzzyAnd(healthLow, distanceNear);
}
```

```rust
fn triangular_membership(x: f64, low: f64, peak: f64, high: f64) -> f64 {
    if x <= low || x >= high {
        return 0.0;
    }
    if (x - peak).abs() < f64::EPSILON {
        return 1.0;
    }
    if x < peak {
        (x - low) / (peak - low)
    } else {
        (high - x) / (high - peak)
    }
}

fn fuzzy_and(values: &[f64]) -> f64 {
    values.iter().cloned().fold(f64::INFINITY, f64::min)
}

fn evaluate_flee_desire(health_pct: f64, enemy_distance: f64) -> f64 {
    let health_low = triangular_membership(health_pct, -10.0, 0.0, 40.0);
    let distance_near = triangular_membership(enemy_distance, -5.0, 0.0, 15.0);

    fuzzy_and(&[health_low, distance_near])
}
```

```csharp
static double TriangularMembership(double x, double low, double peak, double high)
{
    if (x <= low || x >= high) return 0.0;
    if (x == peak) return 1.0;
    if (x < peak) return (x - low) / (peak - low);
    return (high - x) / (high - peak);
}

static double FuzzyAnd(params double[] values) => values.Min();

static double EvaluateFleeDesire(double healthPct, double enemyDistance)
{
    double healthLow = TriangularMembership(healthPct, -10, 0, 40);
    double distanceNear = TriangularMembership(enemyDistance, -5, 0, 15);

    return FuzzyAnd(healthLow, distanceNear);
}
```
