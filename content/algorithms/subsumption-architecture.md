---
name: サブサンプションアーキテクチャ
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(層数)(1回の行動決定あたり)
summary: 「障害物を避ける」のような単純な反射的行動を最下層に置き、「探索する」「目的地へ向かう」のようなより高次の行動を上位層として積み重ね、上位層が下位層の出力を抑制(サブサンプション)できるという一方向の関係だけで、複雑な内部状態やプランニングなしにロボットを動かす。
---

## 概要

[GOAP](/algorithms/goap)や[ビヘイビアツリー](/algorithms/behavior-tree)は「世界の状態を認識し、計画を立ててから行動する」という、中央集権的な情報処理を前提とする設計が多いが、ロボット工学者ロドニー・ブルックスは1986年、この前提そのものに異を唱えた——**「知能は、世界の詳細な内部モデルを持たなくても、単純な反射行動の階層的な組み合わせから創発しうる」**という主張のもと、サブサンプションアーキテクチャを提案した。このアーキテクチャは、「障害物を避ける」のような最も基本的で反射的な行動を担当する層を最下層に置き、「歩き回る」「目的地へ向かう」のようなより高次の目的を担当する層をその上に積み重ねる。上位層は下位層の存在を前提にしながら、必要に応じて**下位層の出力を上書き(サブサンプション、"下に飲み込む")** できるが、下位層は上位層の存在を一切知らない、という非対称な関係だけで全体の行動を構成する。

## 仕組み

1. ロボット(またはキャラクター)の行動を、複数の**層(レイヤー)** に分解する。各層は「センサー入力→単純な処理→アクチュエータへの出力」という、それ自体で完結した独立の反射的な振る舞いを持つ(例: 最下層「障害物を検知したら停止・回避する」、中間層「ランダムに歩き回る」、上位層「目的地の方向へ向かう」)
2. 全ての層は**常に並行して動作**し、それぞれが自分の入力に基づいて出力を計算し続ける
3. 層同士は、**抑制(Inhibition)** と**乗っ取り(Suppression)** という2種類の単純な接続だけで関係づけられる——上位層は、自分が「今、口を出したい」と判断したときだけ、下位層からアクチュエータへ向かう信号を自分の信号で**置き換える(サブサンプトする)**。上位層が何も言わなければ、下位層の信号がそのまま素通りする
4. この結果、通常は下位層の単純な反射行動(障害物回避など)がベースラインとして機能し続け、上位層の目的(目的地へ向かうなど)は、それを妨げない範囲でベースラインの上に「乗っかる」形で実現される
5. 各層は独立した単純な有限状態機械やルールベースの処理で実装され、中央で全体を統括する「世界モデル」や「プランナー」は存在しない

## 特性・トレードオフ

- **プランニングなしで頑健な行動が実現できる**: [GOAP](/algorithms/goap)のような明示的な計画立案を必要とせず、各層が自分の担当範囲だけに集中した単純な反応を返すだけで、全体として障害物を避けながら目的地に向かう、といった複雑に見える行動が創発する。中央の世界モデルに依存しないため、センサーの不完全さやノイズにも比較的頑健である
- **層の追加による段階的な能力拡張**: 新しい能力を追加したい場合、既存の層を変更せずに、新しい上位層を追加するだけで済むことが多い(ブルックス自身が提唱した「知能の漸進的な構築」という設計思想の核心)。ただし層の数が増えるにつれて、層同士の抑制関係が複雑に絡み合い、デバッグが難しくなることもある
- **複雑な目標達成・長期計画には不向き**: サブサンプションアーキテクチャは反射的な行動の組み合わせに強みがある一方、[GOAP](/algorithms/goap)が扱うような「複数の行動を順序立てて組み合わせて遠い目標を達成する」といった明示的な計画立案は苦手とする。実際のロボット・ゲームAI設計では、低レベルの反射行動にはサブサンプション的な階層構造を使い、高レベルの目標選択には[ユーティリティAI](/algorithms/utility-ai)や[GOAP](/algorithms/goap)を組み合わせる、というハイブリッドな設計もよく見られる
- **使いどころ**: 自律移動ロボットの基本的なナビゲーション制御(初期のロボット掃除機や探査ロボットの設計思想に強い影響を与えた)、ゲームにおける単純な生物的NPC(昆虫・動物のような反射行動主体のキャラクター)、群衆・群れの個体レベルの反応行動、リアルタイム性が重視され複雑なプランニングのオーバーヘッドを避けたい組み込みロボティクス

## 実装例

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class Layer:
    name: str
    wants_to_act: Callable[[dict], bool]
    compute_output: Callable[[dict], str]

def subsumption_decide(sensors: dict, layers_low_to_high: list[Layer]) -> str:
    """層は下位(低優先度)から上位(高優先度)の順に並んでいるとする。上位が下位を上書きする。"""
    output = "idle"
    for layer in layers_low_to_high:  # 下から順に処理し、上位が出力を上書きしていく
        if layer.wants_to_act(sensors):
            output = layer.compute_output(sensors)
    return output

# 使用例: 最下層(障害物回避)、中間層(歩き回る)、最上層(目的地へ向かう)
avoid_obstacle = Layer(
    "avoid_obstacle",
    wants_to_act=lambda s: s.get("obstacle_distance", 100) < 5,
    compute_output=lambda s: "turn_away",
)
wander = Layer("wander", wants_to_act=lambda s: True, compute_output=lambda s: "random_walk")
seek_goal = Layer(
    "seek_goal",
    wants_to_act=lambda s: s.get("goal_visible", False) and s.get("obstacle_distance", 100) >= 5,
    compute_output=lambda s: "move_toward_goal",
)
```

```typescript
type Sensors = Record<string, unknown>;

type Layer = {
  name: string;
  wantsToAct: (s: Sensors) => boolean;
  computeOutput: (s: Sensors) => string;
};

function subsumptionDecide(sensors: Sensors, layersLowToHigh: Layer[]): string {
  let output = "idle";
  for (const layer of layersLowToHigh) {
    if (layer.wantsToAct(sensors)) output = layer.computeOutput(sensors);
  }
  return output;
}
```

```cpp
#include <vector>
#include <string>
#include <functional>
#include <unordered_map>
#include <any>

using Sensors = std::unordered_map<std::string, std::any>;

struct Layer {
    std::string name;
    std::function<bool(const Sensors&)> wantsToAct;
    std::function<std::string(const Sensors&)> computeOutput;
};

std::string subsumptionDecide(const Sensors& sensors, const std::vector<Layer>& layersLowToHigh) {
    std::string output = "idle";
    for (auto& layer : layersLowToHigh) {
        if (layer.wantsToAct(sensors)) output = layer.computeOutput(sensors);
    }
    return output;
}
```

```rust
use std::collections::HashMap;

type Sensors = HashMap<String, f64>;

struct Layer {
    name: String,
    wants_to_act: Box<dyn Fn(&Sensors) -> bool>,
    compute_output: Box<dyn Fn(&Sensors) -> String>,
}

fn subsumption_decide(sensors: &Sensors, layers_low_to_high: &[Layer]) -> String {
    let mut output = "idle".to_string();
    for layer in layers_low_to_high {
        if (layer.wants_to_act)(sensors) {
            output = (layer.compute_output)(sensors);
        }
    }
    output
}
```

```csharp
using Sensors = System.Collections.Generic.Dictionary<string, object>;

class Layer
{
    public string Name = "";
    public Func<Sensors, bool> WantsToAct = _ => false;
    public Func<Sensors, string> ComputeOutput = _ => "idle";
}

static class SubsumptionSystem
{
    public static string Decide(Sensors sensors, List<Layer> layersLowToHigh)
    {
        string output = "idle";
        foreach (var layer in layersLowToHigh)
        {
            if (layer.WantsToAct(sensors)) output = layer.ComputeOutput(sensors);
        }
        return output;
    }
}
```
