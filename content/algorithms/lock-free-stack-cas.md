---
name: Compare-and-Swap(CAS)によるロックフリースタック
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(1)(平均、競合が少ない場合。最悪ケースは競合に応じて増加)
summary: 「読んだ値が変わっていなければ新しい値に置き換える」というハードウェアのアトミック命令だけを使い、ロック(排他制御)を一切使わずに複数スレッドから安全に操作できるスタックを実現する。
---

## 概要

[セマフォによる生産者消費者問題](/algorithms/producer-consumer-semaphore)のようなロックベースの同期は、ロックを保持したスレッドが(OSにスケジュールされずに)長時間止まってしまうと、そのロックを待つ他の全スレッドも道連れで止まってしまうリスクを持つ。ロックフリーなデータ構造は、ロックを一切使わず、CPUが提供するCompare-and-Swap(CAS: 「メモリのある場所の値が期待した値のままであれば、新しい値に置き換える。そうでなければ何もしない」という単一のアトミック(不可分)操作)だけを使って、複数のスレッドから安全に共有データ構造を操作できるようにする設計手法である。1990年代以降、マルチコアCPUの普及とともに実務での重要性が高まった。

## 仕組み

1. スタックを、各要素が次の要素へのポインタを持つ単方向の連結リストとして実装し、先頭要素を指す共有ポインタ`top`を用意する
2. **プッシュ(要素の追加)操作**: (a) 現在の`top`の値を`oldTop`として読み取る、(b) 新しいノードの`next`ポインタを`oldTop`に設定する、(c) `CAS(top, oldTop, 新しいノード)`を試みる——これは「`top`がまだ`oldTop`のままなら、`top`を新しいノードに更新する」という意味。もし他のスレッドが自分の読み取りと書き込みの間に`top`を変更していたら(`oldTop`と現在の`top`が食い違っていたら)、CASは失敗するので、失敗した場合は最初からやり直す(この再試行のループを「CASループ」と呼ぶ)
3. **ポップ(要素の取り出し)操作**: (a) 現在の`top`を`oldTop`として読み取る(スタックが空ならエラーまたは特別な値を返す)、(b) `oldTop`の`next`ポインタを`newTop`として読み取る、(c) `CAS(top, oldTop, newTop)`を試みる。成功すれば`oldTop`が取り出した要素、失敗すれば最初からやり直す
4. ロックを一切使わないため、「あるスレッドがロックを保持したまま停止しても、他のスレッド全体が止まる」という事態が原理的に起こらない——常にどれか1つのCASは成功して処理が進むことが保証される(**ロックフリー性**の保証)

## 特性・トレードオフ

- **計算量**: 競合(複数スレッドが同時に同じ操作を試みること)が少ない状況では、CASが1回で成功することが多く`O(1)`に近い性能が出る。競合が激しい場合は、CASループの再試行回数が増え、性能が低下することがある
- **ABA問題という落とし穴**: CASは「値が変わっていないこと」を確認するが、「`top`がAだったのが、別のスレッドによって一旦Bに変わり、その後また偶然Aに戻っていた」場合、CASの単純な値比較ではこの変化を検出できず、リストの構造が壊れることがある(これを**ABA問題**と呼ぶ)。実用の実装では、ポインタにバージョン番号(タグ)を付加して、値だけでなく「変更が何回起きたか」も一緒に比較することでこの問題を回避する
- **メモリ管理の難しさ**: ロックフリーなデータ構造では、あるスレッドがまだ参照しているかもしれないメモリを、いつ安全に解放してよいかの判断が難しい([ハザードポインタ](/algorithms/hazard-pointers)やエポックベース回収のような専用の技法が必要になることが多い)——ロックベースの実装と比べて、正しく実装すること自体の難易度が格段に高い
- **使いどころ**: 高いスループットが要求される並行データ構造(ロックフリーキュー・スタック・ハッシュマップ)、リアルタイムシステムにおける優先度逆転(ロック保持中の低優先度スレッドが高優先度スレッドをブロックする問題)の回避、OS・言語ランタイムの並行処理ライブラリの内部実装

## 実装例

実際のスレッドの代わりに、各プッシュ/ポップ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械として表現し、複数の操作をランダムな順序で1ステップずつ進める決定論的シミュレータで検証する。CASが失敗すれば読み取りフェーズからやり直す(CASループ)——これにより、他の操作が割り込んだ(プリエンプションされた)場合の再試行が、シード固定の乱数で毎回同じように再現できる。

```python
class Node:
    __slots__ = ("value", "next")
    def __init__(self, value, next_node):
        self.value = value
        self.next = next_node


class CasStack:
    """compare_and_swapは「topがexpectedのままなら、new_valueに置き換えてTrueを返す。
    そうでなければ何もせずFalseを返す」という単一のアトミック操作を表す。"""
    def __init__(self):
        self.top = None

    def compare_and_swap(self, expected, new_value) -> bool:
        if self.top is expected:
            self.top = new_value
            return True
        return False


class PushOp:
    """プッシュ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械。
    stepを1回呼ぶたびに1フェーズだけ進む。CASが失敗すれば読み取りフェーズからやり直す。"""
    def __init__(self, stack: CasStack, value):
        self.stack, self.value = stack, value
        self.phase = "read"
        self.old_top = None
        self.new_node = None
        self.done = False

    def step(self) -> None:
        if self.done:
            return
        if self.phase == "read":
            self.old_top = self.stack.top
            self.new_node = Node(self.value, self.old_top)
            self.phase = "cas"
        elif self.stack.compare_and_swap(self.old_top, self.new_node):
            self.done = True
        else:
            self.phase = "read"  # CAS失敗: 最初からやり直す


class PopOp:
    """ポップ操作を同様に2フェーズへ分解した状態機械。結果はresultに格納される。"""
    def __init__(self, stack: CasStack):
        self.stack = stack
        self.phase = "read"
        self.old_top = None
        self.new_top = None
        self.done = False
        self.result = None

    def step(self) -> None:
        if self.done:
            return
        if self.phase == "read":
            self.old_top = self.stack.top
            if self.old_top is None:
                self.result, self.done = None, True
                return
            self.new_top = self.old_top.next
            self.phase = "cas"
        elif self.stack.compare_and_swap(self.old_top, self.new_top):
            self.result = self.old_top.value
            self.done = True
        else:
            self.phase = "read"


def run_interleaved(ops: list, rng) -> None:
    """未完了の操作からランダムに1つ選んで1ステップずつ進める、決定論的な並行実行シミュレータ。"""
    pending = list(ops)
    while pending:
        op = rng.choice(pending)
        op.step()
        if op.done:
            pending.remove(op)
```

```typescript
class Node<T> {
  value: T;
  next: Node<T> | null;
  constructor(value: T, next: Node<T> | null) {
    this.value = value;
    this.next = next;
  }
}

class CasStack<T> {
  top: Node<T> | null = null;

  // topがexpectedのままなら、newValueに置き換えてtrueを返す。そうでなければ何もせずfalseを返す
  compareAndSwap(expected: Node<T> | null, newValue: Node<T> | null): boolean {
    if (this.top === expected) {
      this.top = newValue;
      return true;
    }
    return false;
  }
}

interface Op {
  done: boolean;
  step(): void;
}

// プッシュ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械
class PushOp<T> implements Op {
  phase: "read" | "cas" = "read";
  oldTop: Node<T> | null = null;
  newNode: Node<T> | null = null;
  done = false;
  private stack: CasStack<T>;
  private value: T;

  constructor(stack: CasStack<T>, value: T) {
    this.stack = stack;
    this.value = value;
  }

  step(): void {
    if (this.done) return;
    if (this.phase === "read") {
      this.oldTop = this.stack.top;
      this.newNode = new Node(this.value, this.oldTop);
      this.phase = "cas";
    } else if (this.stack.compareAndSwap(this.oldTop, this.newNode)) {
      this.done = true;
    } else {
      this.phase = "read"; // CAS失敗: 最初からやり直す
    }
  }
}

// ポップ操作を同様に2フェーズへ分解した状態機械。結果はresultに格納される
class PopOp<T> implements Op {
  phase: "read" | "cas" = "read";
  oldTop: Node<T> | null = null;
  newTop: Node<T> | null = null;
  done = false;
  result: T | null = null;
  private stack: CasStack<T>;

  constructor(stack: CasStack<T>) {
    this.stack = stack;
  }

  step(): void {
    if (this.done) return;
    if (this.phase === "read") {
      this.oldTop = this.stack.top;
      if (this.oldTop === null) {
        this.result = null;
        this.done = true;
        return;
      }
      this.newTop = this.oldTop.next;
      this.phase = "cas";
    } else if (this.stack.compareAndSwap(this.oldTop, this.newTop)) {
      this.result = this.oldTop!.value;
      this.done = true;
    } else {
      this.phase = "read";
    }
  }
}

// 未完了の操作からランダムに1つ選んで1ステップずつ進める、決定論的な並行実行シミュレータ
function runInterleaved(ops: Op[], rng: () => number): void {
  const pending = [...ops];
  while (pending.length > 0) {
    const idx = Math.floor(rng() * pending.length);
    const op = pending[idx];
    op.step();
    if (op.done) pending.splice(idx, 1);
  }
}
```

```cpp
#include <memory>
#include <optional>
#include <vector>
#include <random>

template <typename T>
struct Node {
    T value;
    std::shared_ptr<Node<T>> next;
};

template <typename T>
class CasStack {
public:
    std::shared_ptr<Node<T>> top;

    // topがexpectedのままなら、newValueに置き換えてtrueを返す。そうでなければ何もせずfalseを返す
    bool compareAndSwap(const std::shared_ptr<Node<T>>& expected, std::shared_ptr<Node<T>> newValue) {
        if (top == expected) {
            top = std::move(newValue);
            return true;
        }
        return false;
    }
};

class Op {
public:
    bool done = false;
    virtual void step() = 0;
    virtual ~Op() = default;
};

// プッシュ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械
template <typename T>
class PushOp : public Op {
    CasStack<T>& stack_;
    T value_;
    enum class Phase { Read, Cas } phase_ = Phase::Read;
    std::shared_ptr<Node<T>> oldTop_;
    std::shared_ptr<Node<T>> newNode_;

public:
    PushOp(CasStack<T>& stack, T value) : stack_(stack), value_(std::move(value)) {}

    void step() override {
        if (done) return;
        if (phase_ == Phase::Read) {
            oldTop_ = stack_.top;
            newNode_ = std::make_shared<Node<T>>(Node<T>{value_, oldTop_});
            phase_ = Phase::Cas;
        } else if (stack_.compareAndSwap(oldTop_, newNode_)) {
            done = true;
        } else {
            phase_ = Phase::Read; // CAS失敗: 最初からやり直す
        }
    }
};

// ポップ操作を同様に2フェーズへ分解した状態機械。結果はresultに格納される
template <typename T>
class PopOp : public Op {
    CasStack<T>& stack_;
    enum class Phase { Read, Cas } phase_ = Phase::Read;
    std::shared_ptr<Node<T>> oldTop_;
    std::shared_ptr<Node<T>> newTop_;

public:
    std::optional<T> result;

    explicit PopOp(CasStack<T>& stack) : stack_(stack) {}

    void step() override {
        if (done) return;
        if (phase_ == Phase::Read) {
            oldTop_ = stack_.top;
            if (!oldTop_) {
                result = std::nullopt;
                done = true;
                return;
            }
            newTop_ = oldTop_->next;
            phase_ = Phase::Cas;
        } else if (stack_.compareAndSwap(oldTop_, newTop_)) {
            result = oldTop_->value;
            done = true;
        } else {
            phase_ = Phase::Read;
        }
    }
};

// 未完了の操作からランダムに1つ選んで1ステップずつ進める、決定論的な並行実行シミュレータ
void runInterleaved(std::vector<Op*>& ops, std::mt19937& rng) {
    std::vector<Op*> pending = ops;
    while (!pending.empty()) {
        std::uniform_int_distribution<size_t> dist(0, pending.size() - 1);
        size_t idx = dist(rng);
        pending[idx]->step();
        if (pending[idx]->done) {
            pending.erase(pending.begin() + idx);
        }
    }
}
```

```rust
use std::cell::RefCell;
use std::rc::Rc;

struct Node {
    value: i32,
    next: Option<Rc<Node>>,
}

struct CasStack {
    top: RefCell<Option<Rc<Node>>>,
}

impl CasStack {
    fn new() -> Self {
        CasStack { top: RefCell::new(None) }
    }

    // topがexpectedのままなら、new_valueに置き換えてtrueを返す。そうでなければ何もせずfalseを返す
    fn compare_and_swap(&self, expected: &Option<Rc<Node>>, new_value: Option<Rc<Node>>) -> bool {
        let matches = match (&*self.top.borrow(), expected) {
            (None, None) => true,
            (Some(a), Some(b)) => Rc::ptr_eq(a, b),
            _ => false,
        };
        if matches {
            *self.top.borrow_mut() = new_value;
        }
        matches
    }
}

enum Phase {
    Read,
    Cas,
}

// プッシュ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械
struct PushOp<'a> {
    stack: &'a CasStack,
    value: i32,
    phase: Phase,
    old_top: Option<Rc<Node>>,
    new_node: Option<Rc<Node>>,
    done: bool,
}

impl<'a> PushOp<'a> {
    fn new(stack: &'a CasStack, value: i32) -> Self {
        PushOp { stack, value, phase: Phase::Read, old_top: None, new_node: None, done: false }
    }

    fn step(&mut self) {
        if self.done {
            return;
        }
        match self.phase {
            Phase::Read => {
                self.old_top = self.stack.top.borrow().clone();
                self.new_node = Some(Rc::new(Node { value: self.value, next: self.old_top.clone() }));
                self.phase = Phase::Cas;
            }
            Phase::Cas => {
                if self.stack.compare_and_swap(&self.old_top, self.new_node.clone()) {
                    self.done = true;
                } else {
                    self.phase = Phase::Read; // CAS失敗: 最初からやり直す
                }
            }
        }
    }
}

// ポップ操作を同様に2フェーズへ分解した状態機械。結果はresultに格納される
struct PopOp<'a> {
    stack: &'a CasStack,
    phase: Phase,
    old_top: Option<Rc<Node>>,
    new_top: Option<Rc<Node>>,
    done: bool,
    result: Option<i32>,
}

impl<'a> PopOp<'a> {
    fn new(stack: &'a CasStack) -> Self {
        PopOp { stack, phase: Phase::Read, old_top: None, new_top: None, done: false, result: None }
    }

    fn step(&mut self) {
        if self.done {
            return;
        }
        match self.phase {
            Phase::Read => {
                self.old_top = self.stack.top.borrow().clone();
                match &self.old_top {
                    None => {
                        self.result = None;
                        self.done = true;
                    }
                    Some(node) => {
                        self.new_top = node.next.clone();
                        self.phase = Phase::Cas;
                    }
                }
            }
            Phase::Cas => {
                if self.stack.compare_and_swap(&self.old_top, self.new_top.clone()) {
                    self.result = self.old_top.as_ref().map(|n| n.value);
                    self.done = true;
                } else {
                    self.phase = Phase::Read;
                }
            }
        }
    }
}

enum AnyOp<'a> {
    Push(PushOp<'a>),
    Pop(PopOp<'a>),
}

impl<'a> AnyOp<'a> {
    fn step(&mut self) {
        match self {
            AnyOp::Push(op) => op.step(),
            AnyOp::Pop(op) => op.step(),
        }
    }
    fn is_done(&self) -> bool {
        match self {
            AnyOp::Push(op) => op.done,
            AnyOp::Pop(op) => op.done,
        }
    }
}

// 未完了の操作からランダムに1つ選んで1ステップずつ進める、決定論的な並行実行シミュレータ
fn run_interleaved(ops: &mut [AnyOp], mut next_index: impl FnMut(usize) -> usize) {
    let mut pending: Vec<usize> = (0..ops.len()).collect();
    while !pending.is_empty() {
        let pick = next_index(pending.len());
        let op_idx = pending[pick];
        ops[op_idx].step();
        if ops[op_idx].is_done() {
            pending.remove(pick);
        }
    }
}
```

```csharp
using System;
using System.Collections.Generic;

class Node<T>
{
    public T Value;
    public Node<T>? Next;
    public Node(T value, Node<T>? next) { Value = value; Next = next; }
}

class CasStack<T>
{
    public Node<T>? Top;

    // TopがexpectedのままならnewValueに置き換えてtrueを返す。そうでなければ何もせずfalseを返す
    public bool CompareAndSwap(Node<T>? expected, Node<T>? newValue)
    {
        if (ReferenceEquals(Top, expected))
        {
            Top = newValue;
            return true;
        }
        return false;
    }
}

interface IOp
{
    bool Done { get; }
    void Step();
}

// プッシュ操作を「読み取り」「CAS試行」の2フェーズに分解した状態機械
class PushOp<T> : IOp
{
    enum Phase { Read, Cas }
    readonly CasStack<T> _stack;
    readonly T _value;
    Phase _phase = Phase.Read;
    Node<T>? _oldTop;
    Node<T>? _newNode;
    public bool Done { get; private set; }

    public PushOp(CasStack<T> stack, T value) { _stack = stack; _value = value; }

    public void Step()
    {
        if (Done) return;
        if (_phase == Phase.Read)
        {
            _oldTop = _stack.Top;
            _newNode = new Node<T>(_value, _oldTop);
            _phase = Phase.Cas;
        }
        else if (_stack.CompareAndSwap(_oldTop, _newNode))
        {
            Done = true;
        }
        else
        {
            _phase = Phase.Read; // CAS失敗: 最初からやり直す
        }
    }
}

// ポップ操作を同様に2フェーズへ分解した状態機械。成功可否はSuccess、値はResultに格納される
class PopOp<T> : IOp
{
    enum Phase { Read, Cas }
    readonly CasStack<T> _stack;
    Phase _phase = Phase.Read;
    Node<T>? _oldTop;
    Node<T>? _newTop;
    public bool Done { get; private set; }
    public bool Success { get; private set; }
    public T? Result;

    public PopOp(CasStack<T> stack) { _stack = stack; }

    public void Step()
    {
        if (Done) return;
        if (_phase == Phase.Read)
        {
            _oldTop = _stack.Top;
            if (_oldTop == null) { Success = false; Done = true; return; }
            _newTop = _oldTop.Next;
            _phase = Phase.Cas;
        }
        else if (_stack.CompareAndSwap(_oldTop, _newTop))
        {
            Result = _oldTop!.Value;
            Success = true;
            Done = true;
        }
        else
        {
            _phase = Phase.Read;
        }
    }
}

static class Scheduler
{
    // 未完了の操作からランダムに1つ選んで1ステップずつ進める、決定論的な並行実行シミュレータ
    public static void RunInterleaved(List<IOp> ops, Random rng)
    {
        var pending = new List<IOp>(ops);
        while (pending.Count > 0)
        {
            int idx = rng.Next(pending.Count);
            pending[idx].Step();
            if (pending[idx].Done) pending.RemoveAt(idx);
        }
    }
}
```
