---
name: 階層型有限状態機械(HFSM)
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(深さ)(1回の状態遷移判定あたり、階層の深さに比例)
summary: 状態機械の各状態の中に、さらに独立した子状態機械を入れ子にすることで、共通の遷移ルールを親状態にまとめ、通常のFSMが陥りがちな遷移の組み合わせ爆発を階層構造で整理する。
---

## 概要

通常の有限状態機械(FSM)でキャラクターAIを組むと、「攻撃中」「移動中」「待機中」のような状態が増えるたびに、それぞれから「気絶する」「死亡する」といった共通のイベントへの遷移を**個別に**書く必要があり、状態数の増加とともに遷移の記述量が急激に膨らんでいく。階層型有限状態機械(HFSM: Hierarchical FSM)は、状態を**入れ子構造**にすることでこの問題を解決する。例えば「戦闘中」という親状態の中に「攻撃」「防御」「回避」という子状態機械を持たせれば、「気絶する」という遷移は親の「戦闘中」状態に1回だけ書けばよく、子状態のどこにいても自動的にその遷移が有効になる(スーパーステート/サブステートという用語で呼ばれる、オブジェクト指向の継承に似た関係)。[ビヘイビアツリー](/algorithms/behavior-tree)が登場する以前から使われてきた、状態機械ベースのAI設計における古典的な整理手法である。

## 仕組み

1. 状態を木構造として定義する。各状態は「子状態を持たない葉状態」または「複数の子状態を持つ複合状態(スーパーステート)」のいずれかである
2. 複合状態には、その状態がアクティブになったときに最初にどの子状態から始めるかという「初期子状態」を指定する
3. **イベント処理**: あるイベント(入力、条件の変化)が発生すると、現在アクティブな葉状態から**親方向へ**遷移条件を探索する。現在の状態がそのイベントに対する遷移を定義していなければ、1つ上の親状態を確認し、さらに上へと辿っていく(最初に見つかった遷移が採用される)
4. 遷移が見つかったら、現在アクティブな状態(および、その状態を含む全ての祖先で、遷移先の状態と共通しない部分)を「退出(Exit)」し、遷移先の状態(および、その祖先で新たに入る部分)に「進入(Enter)」する。子状態機械を持つ状態に入ると、その初期子状態も連動してアクティブになる
5. 通常のフレーム更新では、現在アクティブな葉状態(および、その全ての祖先の複合状態)それぞれの`Update`処理が、木の根から葉に向かって順に呼ばれる

## 特性・トレードオフ

- **共通の遷移ルールを1箇所にまとめられる**: 「気絶する」「アイテムを拾う」のような、多くの状態から共通して発生しうる遷移を親状態に1回だけ記述すればよく、状態数が増えても遷移の記述量が組み合わせ爆発しない。フラットなFSMが持つ最大の弱点を構造的に解消する
- **[ビヘイビアツリー](/algorithms/behavior-tree)との使い分け**: ビヘイビアツリーは「毎フレーム木全体を評価し直す」という宣言的なスタイルだが、HFSMは「現在の状態」という明示的な記憶を持ち、イベント駆動で遷移する。状態間の遷移条件が複雑に絡み合う対話的なゲームプレイ(格闘ゲームのコマンド入力状態など)ではHFSMの明示的な状態管理が扱いやすい場面もある
- **設計の複雑さと視覚化のしやすさのバランス**: フラットなFSMに比べて設計時に階層構造を考える手間は増えるが、多くのゲームエンジンのステートマシンエディタ(UnityのAnimator、Unreal EngineのState Tree)がHFSMをビジュアルに編集できる機能を提供しており、実務での採用ハードルは低い
- **使いどころ**: 格闘ゲームのキャラクター状態管理(通常状態→攻撃中→ヒットストップ→硬直、のような入れ子の遷移)、UIのモーダル状態管理、ロボット制御の階層的なモード管理、アニメーションステートマシン

## 実装例

```python
from typing import Callable, Optional

class State:
    def __init__(self, name: str, parent: "State | None" = None):
        self.name = name
        self.parent = parent
        self.children: dict[str, "State"] = {}
        self.initial_child: str | None = None
        self.transitions: dict[str, str] = {}  # event名 -> 遷移先stateの完全パス
        if parent:
            parent.children[name] = self

    def full_path(self) -> str:
        return f"{self.parent.full_path()}.{self.name}" if self.parent else self.name

class HierarchicalFsm:
    def __init__(self, root: State):
        self.root = root
        self.current = root
        while self.current.initial_child:
            self.current = self.current.children[self.current.initial_child]

    def handle_event(self, event: str) -> bool:
        """現在の葉状態から親方向へ、eventに対応する遷移が見つかるまで探索する。"""
        node: Optional[State] = self.current
        while node is not None:
            if event in node.transitions:
                target_path = node.transitions[event]
                self._transition_to(target_path)
                return True
            node = node.parent
        return False

    def _transition_to(self, path: str) -> None:
        node = self.root
        for name in path.split(".")[1:]:
            node = node.children[name]
        while node.initial_child:
            node = node.children[node.initial_child]
        self.current = node
```

```typescript
class State {
  parent: State | null;
  children: Map<string, State> = new Map();
  initialChild: string | null = null;
  transitions: Map<string, string> = new Map();

  constructor(public name: string, parent: State | null = null) {
    this.parent = parent;
    if (parent) parent.children.set(name, this);
  }

  fullPath(): string {
    return this.parent ? `${this.parent.fullPath()}.${this.name}` : this.name;
  }
}

class HierarchicalFsm {
  current: State;
  constructor(private root: State) {
    let node = root;
    while (node.initialChild) node = node.children.get(node.initialChild)!;
    this.current = node;
  }

  handleEvent(event: string): boolean {
    let node: State | null = this.current;
    while (node !== null) {
      if (node.transitions.has(event)) {
        this.transitionTo(node.transitions.get(event)!);
        return true;
      }
      node = node.parent;
    }
    return false;
  }

  private transitionTo(path: string): void {
    let node = this.root;
    for (const name of path.split(".").slice(1)) node = node.children.get(name)!;
    while (node.initialChild) node = node.children.get(node.initialChild)!;
    this.current = node;
  }
}
```

```cpp
#include <string>
#include <unordered_map>
#include <sstream>

struct State {
    std::string name;
    State* parent;
    std::unordered_map<std::string, State*> children;
    std::string initialChild;
    std::unordered_map<std::string, std::string> transitions;

    State(std::string name_, State* parent_ = nullptr) : name(std::move(name_)), parent(parent_) {
        if (parent) parent->children[name] = this;
    }
};

class HierarchicalFsm {
    State* root;
    State* current;

    void transitionTo(const std::string& path) {
        State* node = root;
        std::stringstream ss(path);
        std::string segment;
        std::getline(ss, segment, '.'); // ルート自身を読み飛ばす
        while (std::getline(ss, segment, '.')) node = node->children[segment];
        while (!node->initialChild.empty()) node = node->children[node->initialChild];
        current = node;
    }

public:
    explicit HierarchicalFsm(State* root_) : root(root_) {
        current = root;
        while (!current->initialChild.empty()) current = current->children[current->initialChild];
    }

    bool handleEvent(const std::string& event) {
        State* node = current;
        while (node != nullptr) {
            auto it = node->transitions.find(event);
            if (it != node->transitions.end()) {
                transitionTo(it->second);
                return true;
            }
            node = node->parent;
        }
        return false;
    }
};
```

```rust
use std::collections::HashMap;

struct State {
    name: String,
    parent: Option<usize>,
    children: HashMap<String, usize>,
    initial_child: Option<String>,
    transitions: HashMap<String, String>,
}

struct HierarchicalFsm {
    states: Vec<State>,
    current: usize,
}

impl HierarchicalFsm {
    fn resolve_leaf(&self, mut idx: usize) -> usize {
        while let Some(child_name) = &self.states[idx].initial_child {
            idx = self.states[idx].children[child_name];
        }
        idx
    }

    fn handle_event(&mut self, event: &str) -> bool {
        let mut node = Some(self.current);
        while let Some(idx) = node {
            if let Some(target_path) = self.states[idx].transitions.get(event).cloned() {
                self.transition_to(&target_path);
                return true;
            }
            node = self.states[idx].parent;
        }
        false
    }

    fn transition_to(&mut self, path: &str) {
        let mut idx = 0usize; // root
        for segment in path.split('.').skip(1) {
            idx = self.states[idx].children[segment];
        }
        self.current = self.resolve_leaf(idx);
    }
}
```

```csharp
class State
{
    public string Name;
    public State? Parent;
    public Dictionary<string, State> Children = new();
    public string? InitialChild;
    public Dictionary<string, string> Transitions = new();

    public State(string name, State? parent = null)
    {
        Name = name;
        Parent = parent;
        parent?.Children.Add(name, this);
    }
}

class HierarchicalFsm
{
    State root;
    State current;

    public HierarchicalFsm(State root)
    {
        this.root = root;
        current = root;
        while (current.InitialChild != null) current = current.Children[current.InitialChild];
    }

    public bool HandleEvent(string ev)
    {
        State? node = current;
        while (node != null)
        {
            if (node.Transitions.TryGetValue(ev, out var targetPath))
            {
                TransitionTo(targetPath);
                return true;
            }
            node = node.Parent;
        }
        return false;
    }

    void TransitionTo(string path)
    {
        var node = root;
        foreach (var name in path.Split('.').Skip(1)) node = node.Children[name];
        while (node.InitialChild != null) node = node.Children[node.InitialChild];
        current = node;
    }
}
```
