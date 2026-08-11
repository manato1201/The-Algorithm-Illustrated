---
name: ビヘイビアツリー(Behavior Tree)
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(木のノード数)(1回のtickあたり、最悪時)
summary: 「セレクタ」「シーケンス」などの少数の合成ノードを木構造に組み合わせ、複雑なキャラクターAIの意思決定ロジックを宣言的かつ再利用可能な形で表現する。
---

## 概要

複雑なキャラクターAIをif-elseの分岐の連なりで書いていくと、条件が増えるほど分岐が絡み合い、デザイナーが調整するのはおろか、開発者自身にも全体の挙動が追いづらくなっていく(いわゆる「スパゲッティFSM」)。ビヘイビアツリーは、AIの意思決定ロジックを**木構造として宣言的に表現**することでこの問題を解決する。各ノードは「成功」「失敗」「実行中」のいずれかを返す小さな部品で、それらを「順番に全部成功させたい(シーケンス)」「どれか1つ成功すればいい(セレクタ)」といった少数の合成ルールで組み合わせるだけで、複雑な意思決定を組み立てられる。『Halo 2』での採用以降、ゲームAIの標準的な設計パターンとして広く普及した。

## 仕組み

木は毎フレーム(または一定間隔)ルートから**tick**され、以下のノード種別の組み合わせで構成される。

1. **リーフノード**: 実際の判定や行動を行う末端。「条件ノード(例: 敵が見えるか)」と「アクションノード(例: 攻撃する)」があり、`成功`/`失敗`/`実行中`のいずれかを返す
2. **シーケンス(Sequence)**: 子を左から順にtickし、**いずれかが失敗した時点で即座に失敗を返す**。全ての子が成功して初めて成功を返す(論理積AND的な合成)
3. **セレクタ(Selector/Fallback)**: 子を左から順にtickし、**いずれかが成功した時点で即座に成功を返す**。全ての子が失敗して初めて失敗を返す(論理和OR的な合成)。優先度の高い行動を左に置くことで「まず攻撃を試し、無理なら追跡、それも無理なら索敵」のような優先順位付き分岐を自然に表現できる
4. **デコレータ(Decorator)**: 子を1つだけ持ち、その結果を加工する(例: `Inverter`は成功/失敗を反転、`Repeat`は一定回数繰り返す)
5. これらを木として組み合わせることで、「敵が見えるならシーケンス(近ければ攻撃、遠ければ追跡)、見えなければパトロール」のような意思決定を、コードの分岐ではなく木の構造そのものとして表現する

## 特性・トレードオフ

- **モジュール性と再利用性**: 各ノードは独立した小さな部品なので、異なるキャラクター間でサブツリーを使い回したり、デザイナーがビジュアルエディタでノードを組み替えたりしやすい。有限状態機械(FSM)が状態数の増加とともに遷移が組み合わせ爆発しやすいのに対し、ビヘイビアツリーは階層的な合成でその問題を緩和する
- **「実行中」状態による複数フレームにまたがる行動の表現**: 移動やアニメーション待ちのような即座に終わらない行動を`実行中`として扱い、次のtickでも同じノードから継続できる。この点がステートレスな条件分岐と大きく異なる
- **デバッグの可視化がしやすい反面、暗黙の優先順位に注意が要る**: 木構造として可視化・エディタ化しやすい一方、セレクタの子の並び順が優先順位そのものになるため、ノード数が増えると「なぜこの行動が選ばれたか」を木全体で追う必要が出てくる
- **使いどころ**: 『Halo』シリーズ以降の多くの3Dアクション/オープンワールドゲームの敵AI、ロボティクスのタスクプランニング(ROS 2のNav2など)、Unreal EngineのAIモジュール(標準機能として搭載)

## 実装例

```python
from enum import Enum, auto
from typing import Callable

class Status(Enum):
    SUCCESS = auto()
    FAILURE = auto()
    RUNNING = auto()

class Node:
    def tick(self, blackboard: dict) -> Status:
        raise NotImplementedError

class Sequence(Node):
    def __init__(self, children: list[Node]):
        self.children = children

    def tick(self, blackboard: dict) -> Status:
        for child in self.children:
            status = child.tick(blackboard)
            if status != Status.SUCCESS:
                return status
        return Status.SUCCESS

class Selector(Node):
    def __init__(self, children: list[Node]):
        self.children = children

    def tick(self, blackboard: dict) -> Status:
        for child in self.children:
            status = child.tick(blackboard)
            if status != Status.FAILURE:
                return status
        return Status.FAILURE

class Condition(Node):
    def __init__(self, predicate: Callable[[dict], bool]):
        self.predicate = predicate

    def tick(self, blackboard: dict) -> Status:
        return Status.SUCCESS if self.predicate(blackboard) else Status.FAILURE

class Action(Node):
    def __init__(self, fn: Callable[[dict], Status]):
        self.fn = fn

    def tick(self, blackboard: dict) -> Status:
        return self.fn(blackboard)

# 敵が見えれば「近ければ攻撃、遠ければ追跡」、見えなければパトロール
enemy_ai = Selector([
    Sequence([
        Condition(lambda bb: bb["enemy_visible"]),
        Selector([
            Sequence([Condition(lambda bb: bb["distance"] < 5), Action(lambda bb: Status.SUCCESS)]),  # 攻撃
            Action(lambda bb: Status.RUNNING),  # 追跡(継続中)
        ]),
    ]),
    Action(lambda bb: Status.RUNNING),  # パトロール
])
```

```typescript
enum Status {
  Success,
  Failure,
  Running,
}
type Blackboard = Record<string, unknown>;
interface Node {
  tick(bb: Blackboard): Status;
}

class Sequence implements Node {
  constructor(private children: Node[]) {}
  tick(bb: Blackboard): Status {
    for (const child of this.children) {
      const status = child.tick(bb);
      if (status !== Status.Success) return status;
    }
    return Status.Success;
  }
}

class Selector implements Node {
  constructor(private children: Node[]) {}
  tick(bb: Blackboard): Status {
    for (const child of this.children) {
      const status = child.tick(bb);
      if (status !== Status.Failure) return status;
    }
    return Status.Failure;
  }
}

class Condition implements Node {
  constructor(private predicate: (bb: Blackboard) => boolean) {}
  tick(bb: Blackboard): Status {
    return this.predicate(bb) ? Status.Success : Status.Failure;
  }
}

class Action implements Node {
  constructor(private fn: (bb: Blackboard) => Status) {}
  tick(bb: Blackboard): Status {
    return this.fn(bb);
  }
}

const enemyAi: Node = new Selector([
  new Sequence([
    new Condition((bb) => bb.enemyVisible === true),
    new Selector([
      new Sequence([
        new Condition((bb) => (bb.distance as number) < 5),
        new Action(() => Status.Success),
      ]),
      new Action(() => Status.Running),
    ]),
  ]),
  new Action(() => Status.Running),
]);
```

```cpp
#include <vector>
#include <functional>
#include <memory>

enum class Status { Success, Failure, Running };
using Blackboard = std::unordered_map<std::string, double>;

struct Node {
    virtual Status tick(Blackboard& bb) = 0;
    virtual ~Node() = default;
};

struct Sequence : Node {
    std::vector<std::unique_ptr<Node>> children;
    Status tick(Blackboard& bb) override {
        for (auto& child : children) {
            Status s = child->tick(bb);
            if (s != Status::Success) return s;
        }
        return Status::Success;
    }
};

struct Selector : Node {
    std::vector<std::unique_ptr<Node>> children;
    Status tick(Blackboard& bb) override {
        for (auto& child : children) {
            Status s = child->tick(bb);
            if (s != Status::Failure) return s;
        }
        return Status::Failure;
    }
};

struct Condition : Node {
    std::function<bool(Blackboard&)> predicate;
    Status tick(Blackboard& bb) override {
        return predicate(bb) ? Status::Success : Status::Failure;
    }
};

struct Action : Node {
    std::function<Status(Blackboard&)> fn;
    Status tick(Blackboard& bb) override { return fn(bb); }
};
```

```rust
enum Status { Success, Failure, Running }
type Blackboard = std::collections::HashMap<String, f64>;

trait Node {
    fn tick(&self, bb: &Blackboard) -> Status;
}

struct Sequence { children: Vec<Box<dyn Node>> }
impl Node for Sequence {
    fn tick(&self, bb: &Blackboard) -> Status {
        for child in &self.children {
            match child.tick(bb) {
                Status::Success => continue,
                other => return other,
            }
        }
        Status::Success
    }
}

struct Selector { children: Vec<Box<dyn Node>> }
impl Node for Selector {
    fn tick(&self, bb: &Blackboard) -> Status {
        for child in &self.children {
            match child.tick(bb) {
                Status::Failure => continue,
                other => return other,
            }
        }
        Status::Failure
    }
}

struct Condition<F: Fn(&Blackboard) -> bool> { predicate: F }
impl<F: Fn(&Blackboard) -> bool> Node for Condition<F> {
    fn tick(&self, bb: &Blackboard) -> Status {
        if (self.predicate)(bb) { Status::Success } else { Status::Failure }
    }
}

struct Action<F: Fn(&Blackboard) -> Status> { func: F }
impl<F: Fn(&Blackboard) -> Status> Node for Action<F> {
    fn tick(&self, bb: &Blackboard) -> Status {
        (self.func)(bb)
    }
}
```

```csharp
using Blackboard = System.Collections.Generic.Dictionary<string, double>;

enum Status { Success, Failure, Running }
interface INode { Status Tick(Blackboard bb); }

class Sequence : INode
{
    List<INode> children;
    public Sequence(List<INode> children) { this.children = children; }
    public Status Tick(Blackboard bb)
    {
        foreach (var child in children)
        {
            var status = child.Tick(bb);
            if (status != Status.Success) return status;
        }
        return Status.Success;
    }
}

class Selector : INode
{
    List<INode> children;
    public Selector(List<INode> children) { this.children = children; }
    public Status Tick(Blackboard bb)
    {
        foreach (var child in children)
        {
            var status = child.Tick(bb);
            if (status != Status.Failure) return status;
        }
        return Status.Failure;
    }
}

class Condition : INode
{
    Func<Blackboard, bool> predicate;
    public Condition(Func<Blackboard, bool> predicate) { this.predicate = predicate; }
    public Status Tick(Blackboard bb) => predicate(bb) ? Status.Success : Status.Failure;
}

class ActionNode : INode
{
    Func<Blackboard, Status> fn;
    public ActionNode(Func<Blackboard, Status> fn) { this.fn = fn; }
    public Status Tick(Blackboard bb) => fn(bb);
}
```
