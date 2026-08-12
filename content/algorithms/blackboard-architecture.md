---
name: ブラックボードアーキテクチャ
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(k)(1回の更新サイクルあたり、kは知識源の数)
summary: 複数の専門AIモジュール(知識源)が、共有の黒板(ブラックボード)に書かれた現在の状況を読み取り、自分の専門分野で貢献できると判断したときだけ黒板に情報を書き足すという疎結合な協調を繰り返すことで、複雑な意思決定を段階的に組み立てる。
---

## 概要

[ビヘイビアツリー](/algorithms/behavior-tree)や[GOAP](/algorithms/goap)は、単一の意思決定ロジックが行動の選択全体を統括する構造を持つが、キャラクターAIが「索敵」「戦術判断」「発話生成」のように**性質の異なる複数の専門分野**にまたがる判断を必要とする場合、1つの巨大なロジックに全てを詰め込むと管理が難しくなる。ブラックボードアーキテクチャは、1970年代に音声認識システム(HEARSAY-II)の設計で生まれた、人間の専門家会議になぞらえた協調パターンである——**「黒板(ブラックボード)」という共有の作業領域**に現在分かっている情報を書き出し、**複数の独立した「知識源(専門家モジュール)」** がそれぞれ黒板を監視し、自分の専門分野で貢献できる新しい情報や結論があれば黒板に書き加える、という緩やかな協調を繰り返しながら、全体として複雑な意思決定を段階的に組み立てていく。

## 仕組み

1. **ブラックボード**: 現在の状況・仮説・既に確定した情報を保持する共有のデータ構造(キーと値の集合、または階層的な構造)を用意する
2. **知識源(Knowledge Source)**: それぞれ独立した専門分野を担当する複数のモジュールを用意する。各知識源は「黒板の現在の内容に対して、自分が貢献できる条件(前提条件)」と「実際に貢献する処理(黒板への書き込み)」を持つ
3. **制御ループ**: 各サイクルで、全ての知識源に対して「今、自分は貢献できる状態か(前提条件を満たすか)」を確認する
4. 貢献できる知識源が複数あれば、何らかの優先順位付け(スケジューラ)に従って1つ(または複数)を選んで実行する。選ばれた知識源は、黒板の内容を読み取り、自分の専門知識に基づいた新しい情報・部分的な結論を黒板に書き加える
5. 黒板の内容が更新されたことで、次のサイクルでは別の知識源が新たに貢献できる状態になっているかもしれない。この「黒板の更新→新しい知識源の起動→さらなる更新」というサイクルを、最終的な結論(行動の決定)に到達するまで繰り返す

## 特性・トレードオフ

- **専門モジュール間の疎結合な協調**: 各知識源は他の知識源の内部実装を一切知る必要がなく、共有の黒板を介してのみ間接的にやり取りする。これにより、新しい専門知識源を追加・削除しても、既存の知識源への影響を最小限に抑えられる。[ビヘイビアツリー](/algorithms/behavior-tree)や[GOAP](/algorithms/goap)が単一の意思決定フレームワーク内で完結するのに対し、ブラックボードは「性質の異なる複数のAI技術を組み合わせる」ためのメタ的な統合パターンとして機能する
- **段階的な問題の絞り込み**: 音声認識のような、不確実な部分的手がかりから徐々に確度の高い結論へと絞り込んでいく問題に、ブラックボードのモデルは自然にフィットする。ゲームAIでも、「敵らしき音を検知した(低確度の仮説)」→「視認できた(確度が上がる)」→「敵と確定、戦闘態勢へ移行」というように、複数の知識源が段階的に状況認識を確定させていく設計に応用できる
- **実行順序の制御が複雑になりうる**: どの知識源をどの順序で実行するかを決めるスケジューラの設計は、知識源の数が増えるほど複雑になりやすい。単純な優先順位だけでなく、「今どの情報が最も不足しているか」を判断してその情報を提供できる知識源を優先するような、メタレベルの制御が必要になることもある
- **使いどころ**: 複数の専門AIモジュール(索敵、戦術判断、発話生成、経路計画)を統合する必要がある複雑なゲームAI、音声認識・自然言語理解のような不確実性を段階的に解消していくシステム、複数の専門家の意見を統合する診断・意思決定支援システム、[ユーティリティAI](/algorithms/utility-ai)や[GOAP](/algorithms/goap)のような個別の意思決定手法を「知識源」として束ねる上位のフレームワーク

## 実装例

```python
from dataclasses import dataclass, field
from typing import Callable

@dataclass
class KnowledgeSource:
    name: str
    can_contribute: Callable[[dict], bool]
    contribute: Callable[[dict], None]
    priority: int = 0

def run_blackboard_cycle(blackboard: dict, knowledge_sources: list[KnowledgeSource], max_cycles: int = 20) -> dict:
    for _ in range(max_cycles):
        eligible = [ks for ks in knowledge_sources if ks.can_contribute(blackboard)]
        if not eligible:
            break
        eligible.sort(key=lambda ks: ks.priority, reverse=True)
        chosen = eligible[0]
        chosen.contribute(blackboard)
    return blackboard

# 使用例: 索敵・戦術判断・発話生成という3つの知識源
sighting_ks = KnowledgeSource(
    "sighting",
    can_contribute=lambda bb: bb.get("enemy_visible") and "threat_level" not in bb,
    contribute=lambda bb: bb.update({"threat_level": "high" if bb.get("distance", 100) < 10 else "medium"}),
)
tactic_ks = KnowledgeSource(
    "tactic",
    can_contribute=lambda bb: "threat_level" in bb and "action" not in bb,
    contribute=lambda bb: bb.update({"action": "attack" if bb["threat_level"] == "high" else "approach"}),
)
```

```typescript
type Blackboard = Record<string, unknown>;

type KnowledgeSource = {
  name: string;
  canContribute: (bb: Blackboard) => boolean;
  contribute: (bb: Blackboard) => void;
  priority: number;
};

function runBlackboardCycle(
  blackboard: Blackboard,
  knowledgeSources: KnowledgeSource[],
  maxCycles = 20,
): Blackboard {
  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const eligible = knowledgeSources.filter((ks) =>
      ks.canContribute(blackboard),
    );
    if (eligible.length === 0) break;
    eligible.sort((a, b) => b.priority - a.priority);
    eligible[0].contribute(blackboard);
  }
  return blackboard;
}
```

```cpp
#include <vector>
#include <string>
#include <functional>
#include <unordered_map>
#include <algorithm>
#include <any>

using Blackboard = std::unordered_map<std::string, std::any>;

struct KnowledgeSource {
    std::string name;
    std::function<bool(const Blackboard&)> canContribute;
    std::function<void(Blackboard&)> contribute;
    int priority = 0;
};

Blackboard runBlackboardCycle(Blackboard blackboard, std::vector<KnowledgeSource> knowledgeSources, int maxCycles = 20) {
    for (int cycle = 0; cycle < maxCycles; cycle++) {
        std::vector<KnowledgeSource*> eligible;
        for (auto& ks : knowledgeSources) if (ks.canContribute(blackboard)) eligible.push_back(&ks);
        if (eligible.empty()) break;
        std::sort(eligible.begin(), eligible.end(), [](auto* a, auto* b) { return a->priority > b->priority; });
        eligible[0]->contribute(blackboard);
    }
    return blackboard;
}
```

```rust
use std::collections::HashMap;

type Blackboard = HashMap<String, String>;

struct KnowledgeSource {
    name: String,
    can_contribute: Box<dyn Fn(&Blackboard) -> bool>,
    contribute: Box<dyn Fn(&mut Blackboard)>,
    priority: i32,
}

fn run_blackboard_cycle(mut blackboard: Blackboard, knowledge_sources: &[KnowledgeSource], max_cycles: usize) -> Blackboard {
    for _ in 0..max_cycles {
        let mut eligible: Vec<&KnowledgeSource> =
            knowledge_sources.iter().filter(|ks| (ks.can_contribute)(&blackboard)).collect();
        if eligible.is_empty() {
            break;
        }
        eligible.sort_by(|a, b| b.priority.cmp(&a.priority));
        (eligible[0].contribute)(&mut blackboard);
    }
    blackboard
}
```

```csharp
using Blackboard = System.Collections.Generic.Dictionary<string, object>;

class KnowledgeSource
{
    public string Name = "";
    public Func<Blackboard, bool> CanContribute = _ => false;
    public Action<Blackboard> Contribute = _ => { };
    public int Priority;
}

static class BlackboardSystem
{
    public static Blackboard RunCycle(Blackboard blackboard, List<KnowledgeSource> knowledgeSources, int maxCycles = 20)
    {
        for (int cycle = 0; cycle < maxCycles; cycle++)
        {
            var eligible = knowledgeSources.Where(ks => ks.CanContribute(blackboard)).OrderByDescending(ks => ks.Priority).ToList();
            if (eligible.Count == 0) break;
            eligible[0].Contribute(blackboard);
        }
        return blackboard;
    }
}
```
