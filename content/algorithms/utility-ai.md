---
name: 効用ベースAI(Utility AI)
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(A・C)(Aは候補行動数、Cは1行動あたりの評価カーブ数)
summary: 各行動候補に「この状況でどれだけ望ましいか」を表すスコア(効用値)を複数の評価カーブの積で計算し、最もスコアの高い行動を選ぶことで、条件分岐の組み合わせ爆発を避けながら滑らかな意思決定を実現する。
---

## 概要

[ビヘイビアツリー](/algorithms/behavior-tree)は「シーケンス」「セレクタ」といった構造化された分岐でAIの意思決定を組み立てるが、行動の優先順位はノードの並び順という**離散的な形**で決まる。しかし現実のゲームAIでは、「体力が減っているほど回復したい」「敵との距離が近いほど攻撃したい」のように、複数の連続的な要因を総合的に比較して最も合理的な行動を選びたい場面が多い。効用ベースAI(Utility AI)は、各行動候補に対して「今この状況でどれだけ望ましいか」を表す**効用値(スコア)を0〜1の連続値で計算し、最もスコアの高い行動を選ぶ**という設計手法である。条件分岐をどれだけ深く組んでもカバーしきれない「複数要因のバランス」を、スコアの掛け合わせという単純な演算で自然に表現できる。『The Sims』シリーズや多くの近年のオープンワールドゲームのNPC行動選択で採用されている。

## 仕組み

1. 各行動候補(攻撃する、逃げる、回復する、待機するなど)について、判断材料となる複数の入力(体力の割合、敵との距離、弾薬の残量など)を用意する
2. 各入力を、**評価カーブ(Response Curve)** と呼ばれる関数で0〜1のスコアに変換する。例えば「体力が減っているほど回復の効用が上がる」なら、体力割合を反比例に近い形で0〜1にマッピングする曲線を使う
3. 1つの行動に複数の評価カーブがある場合(例: 回復行動は「体力の少なさ」と「安全な場所にいるか」の両方を考慮する)、それぞれのスコアを**掛け合わせる**ことで最終的な効用値を求める。掛け算にすることで、どれか1つの要因が0(その行動が完全に不適切)なら全体のスコアも0になり、「その要因だけは満たしているが他は全くダメ」という行動が選ばれるのを防げる
4. 全ての行動候補について効用値を計算し、最もスコアが高い行動を選択する(または、上位いくつかの行動を確率的な重みとして扱い、多少のランダム性を加えて予測可能すぎる動きを避けることもある)
5. 毎フレーム(または一定間隔)でこの評価を繰り返し、状況の変化に応じて選ばれる行動が滑らかに切り替わっていく

## 特性・トレードオフ

- **条件分岐の組み合わせ爆発を回避できる**: ビヘイビアツリーやFSMで「体力低下×敵接近×弾薬切れ」のような複数条件の組み合わせを網羅しようとすると分岐が指数的に増えるが、効用ベースAIでは各要因を独立した評価カーブとして足し引き・掛け算するだけで済み、要因を追加してもコードの複雑さが線形にしか増えない
- **滑らかで自然な行動遷移**: スコアが連続値であるため、状況が少しずつ変化するにつれて選ばれる行動も滑らかに移り変わる。ビヘイビアツリーの離散的な条件分岐のような「閾値をまたいだ瞬間に行動が急に切り替わる」不自然さが出にくい
- **デバッグ・チューニングの難しさ**: なぜその行動が選ばれたかを説明するには、複数の評価カーブのスコアを全て確認する必要があり、ビヘイビアツリーの木構造のような視覚的な追いやすさは失われがちである。評価カーブのパラメータ調整もデザイナーの試行錯誤に依存する部分が大きい
- **使いどころ**: オープンワールドゲームのNPC行動選択、シミュレーションゲームのキャラクター欲求管理(『The Sims』シリーズ)、複数の戦術的選択肢を持つ戦闘AI、[ビヘイビアツリー](/algorithms/behavior-tree)と組み合わせて「木の各ノードでどの子を選ぶか」を効用値で決める併用パターンも一般的

## 実装例

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class ActionOption:
    name: str
    curves: list[Callable[[dict], float]]  # 各評価カーブは状況(context)からスコア0〜1を返す

def evaluate_utility(action: ActionOption, context: dict) -> float:
    score = 1.0
    for curve in action.curves:
        score *= max(0.0, min(1.0, curve(context)))
    return score

def choose_best_action(actions: list[ActionOption], context: dict) -> ActionOption:
    return max(actions, key=lambda a: evaluate_utility(a, context))

# 評価カーブの例: 体力が低いほど回復行動のスコアが上がる
def low_health_curve(context: dict) -> float:
    return 1.0 - context["health_ratio"]

def is_safe_curve(context: dict) -> float:
    return 1.0 if context["under_attack"] is False else 0.2

heal_action = ActionOption("heal", [low_health_curve, is_safe_curve])
```

```typescript
type Context = Record<string, number | boolean>;
type Curve = (context: Context) => number;

type ActionOption = { name: string; curves: Curve[] };

function evaluateUtility(action: ActionOption, context: Context): number {
  let score = 1.0;
  for (const curve of action.curves) {
    score *= Math.max(0, Math.min(1, curve(context)));
  }
  return score;
}

function chooseBestAction(
  actions: ActionOption[],
  context: Context,
): ActionOption {
  return actions.reduce((best, a) =>
    evaluateUtility(a, context) > evaluateUtility(best, context) ? a : best,
  );
}

const lowHealthCurve: Curve = (ctx) => 1.0 - (ctx.healthRatio as number);
const isSafeCurve: Curve = (ctx) => (ctx.underAttack ? 0.2 : 1.0);
const healAction: ActionOption = {
  name: "heal",
  curves: [lowHealthCurve, isSafeCurve],
};
```

```cpp
#include <vector>
#include <functional>
#include <string>
#include <unordered_map>
#include <algorithm>

using Context = std::unordered_map<std::string, double>;
using Curve = std::function<double(const Context&)>;

struct ActionOption {
    std::string name;
    std::vector<Curve> curves;
};

double evaluateUtility(const ActionOption& action, const Context& context) {
    double score = 1.0;
    for (const auto& curve : action.curves) {
        score *= std::max(0.0, std::min(1.0, curve(context)));
    }
    return score;
}

const ActionOption& chooseBestAction(const std::vector<ActionOption>& actions, const Context& context) {
    return *std::max_element(actions.begin(), actions.end(), [&](const ActionOption& a, const ActionOption& b) {
        return evaluateUtility(a, context) < evaluateUtility(b, context);
    });
}
```

```rust
use std::collections::HashMap;

type Context = HashMap<String, f64>;

struct ActionOption {
    name: String,
    curves: Vec<Box<dyn Fn(&Context) -> f64>>,
}

fn evaluate_utility(action: &ActionOption, context: &Context) -> f64 {
    let mut score = 1.0;
    for curve in &action.curves {
        score *= curve(context).clamp(0.0, 1.0);
    }
    score
}

fn choose_best_action<'a>(actions: &'a [ActionOption], context: &Context) -> &'a ActionOption {
    actions
        .iter()
        .max_by(|a, b| evaluate_utility(a, context).partial_cmp(&evaluate_utility(b, context)).unwrap())
        .unwrap()
}
```

```csharp
using Context = System.Collections.Generic.Dictionary<string, double>;

class ActionOption
{
    public string Name;
    public List<Func<Context, double>> Curves;
}

static double EvaluateUtility(ActionOption action, Context context)
{
    double score = 1.0;
    foreach (var curve in action.Curves)
    {
        score *= Math.Clamp(curve(context), 0.0, 1.0);
    }
    return score;
}

static ActionOption ChooseBestAction(List<ActionOption> actions, Context context)
{
    return actions.OrderByDescending(a => EvaluateUtility(a, context)).First();
}
```
