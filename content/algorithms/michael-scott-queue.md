---
name: Michael-Scottキュー(ロックフリーキュー)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(1)(償却、1回のenqueue/dequeue操作)
summary: "[CASを使ったロックフリースタック](/algorithms/lock-free-stack-cas)と同じCompare-And-Swap操作を、先頭と末尾の両方を扱うキュー(FIFO)に応用したデータ構造で、番兵ノードとダミー要素という2つの工夫によって、複数スレッドが同時にenqueue/dequeueしても安全に動作することを保証する。"
---

## 概要

[CASを使ったロックフリースタック](/algorithms/lock-free-stack-cas)は、先頭ポインタ1つだけを操作すればよいため比較的単純だが、キュー(先入れ先出し)は先頭(dequeue側)と末尾(enqueue側)という2つの独立したポインタを同時に安全に更新する必要があり、ロックなしでの実装ははるかに難しい。1996年にマーレド・マイケル(Michael)とマイケル・スコット(Scott)が発表したこのアルゴリズムは、単方向連結リストに「番兵となるダミーノード」を導入し、末尾ポインタの更新を「実際のノード追加」と「末尾ポインタの前進」という2段階の独立したCAS操作に分解することで、複数スレッドが同時にenqueue・dequeueしてもロックを一切使わずに正しく動作する、実務で広く使われるロックフリーキューの標準的な実装となった。

## 仕組み

1. キューを単方向連結リストとして表現し、常に1つの「ダミーノード」を先頭に持たせる(実際のデータを保持しない番兵)。`head`ポインタはこのダミーノードを指し、`tail`ポインタは最後の実ノード(またはダミーノード自身、キューが空の場合)を指す
2. **enqueue(追加)**: 新しいノードを作り、現在の`tail`が指すノードの`next`ポインタを、CAS操作でnull(何もない状態)から新しいノードへ更新する。この更新が成功したら、続けて`tail`ポインタ自体をCASで新しいノードへ進める(この2段階目が他のスレッドの割り込みで一時的に遅れても、後述の「協調」によって正しさが保たれる)
3. **dequeue(取り出し)**: `head`が指すダミーノードの`next`(つまり実際に取り出すべき先頭要素)を読み取り、それが存在すれば、`head`ポインタをCASでその`next`ノードへ進める(取り出した要素は新しいダミーノードとして扱われる)
4. **他のスレッドとの「協調」という工夫**: あるスレッドがenqueueの2段階目(`tail`ポインタの前進)を完了する前に別のスレッドが動き出した場合、その別のスレッドが代わりに`tail`を正しい位置まで進めてあげる——「自分の仕事を途中まで見た他者が、代わりに仕上げてくれる」という協調的な設計が、ロックなしでも一貫性を保てる理由になっている
5. 各ステップはCAS(Compare-And-Swap: 期待した値であれば新しい値に置き換える、アトミックなハードウェア命令)による楽観的な更新で行われ、他のスレッドと競合して失敗した場合は最新の状態を読み直してリトライする

## 特性・トレードオフ

- **計算量**: 通常のenqueue/dequeue操作は償却`O(1)`——競合が発生してCASが失敗しリトライすることはあるが、リトライは「他のスレッドの操作が成功した」ことを意味するため、システム全体で見れば進行が保証される(ロックフリー性、ある1つのスレッドが永久に待たされることはあっても全体としては必ず誰かが進む)
- **[CASを使ったロックフリースタック](/algorithms/lock-free-stack-cas)との構造的な違い**: スタックは1つのポインタ(先頭)だけを操作すればよいのに対し、キューは`head`と`tail`という独立した2つのポインタを同時に安全に扱う必要があり、実装の複雑さが本質的に増す——ダミーノードによって「キューが空のときの`head`と`tail`の一致」という特殊ケースを統一的に扱えるようにする工夫が、この複雑さを緩和する鍵になっている
- **ABA問題への対処**: ロックフリーデータ構造に共通する落とし穴として、ポインタの値が「A→B→A」と変化した場合、CASだけでは変化がなかったと誤認してしまう「ABA問題」がある。実務の実装では、ポインタにバージョン番号を付加する(タグ付きポインタ)ことでこの問題を回避している
- **使いどころ**: Javaの`ConcurrentLinkedQueue`(実際にMichael-Scottアルゴリズムをベースに実装されている)、高性能なメッセージキュー・タスクキューの実装、ロック競合を避けたい高スループットなマルチスレッドシステムのバッファリング機構、[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)の基盤技術として使われる並行キューの一種

## 実装例

CASを`AtomicRef`として明示的にモデル化し、単一スレッド上で決定論的に実行することで、番兵ノードと2段階更新によるenqueue/dequeueのロジックそのものを検証する。

```python
class AtomicRef:
    """Compare-And-Swapを模した参照。実際のハードウェアではアトミック命令1つで行われる。"""
    def __init__(self, value):
        self.value = value

    def compare_and_swap(self, expected, new) -> bool:
        if self.value is expected:
            self.value = new
            return True
        return False


class Node:
    def __init__(self, value=None):
        self.value = value
        self.next = AtomicRef(None)


class MSQueue:
    def __init__(self):
        dummy = Node()  # 番兵ノード: 実データを持たない
        self.head = AtomicRef(dummy)
        self.tail = AtomicRef(dummy)

    def enqueue(self, value) -> None:
        node = Node(value)
        while True:
            tail = self.tail.value
            next_node = tail.next.value
            if next_node is None:
                # 1段階目: tailの次をCASで新ノードにする
                if tail.next.compare_and_swap(None, node):
                    # 2段階目: tailポインタ自体を新ノードへ進める
                    self.tail.compare_and_swap(tail, node)
                    return
            else:
                # 他スレッドが1段階目まで終えている: 代わりにtailを進めてあげる(協調)
                self.tail.compare_and_swap(tail, next_node)

    def dequeue(self):
        while True:
            head = self.head.value
            tail = self.tail.value
            next_node = head.next.value
            if head is tail:
                if next_node is None:
                    return None  # キューは空
                self.tail.compare_and_swap(tail, next_node)  # tailが遅れている場合の協調
                continue
            value = next_node.value
            if self.head.compare_and_swap(head, next_node):
                return value
```

```typescript
class AtomicRef<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
  compareAndSwap(expected: T, next: T): boolean {
    if (this.value === expected) {
      this.value = next;
      return true;
    }
    return false;
  }
}

class Node<T> {
  value: T | null;
  next: AtomicRef<Node<T> | null> = new AtomicRef<Node<T> | null>(null);
  constructor(value: T | null = null) {
    this.value = value;
  }
}

class MSQueue<T> {
  head: AtomicRef<Node<T>>;
  tail: AtomicRef<Node<T>>;
  constructor() {
    const dummy = new Node<T>();
    this.head = new AtomicRef(dummy);
    this.tail = new AtomicRef(dummy);
  }

  enqueue(value: T): void {
    const node = new Node<T>(value);
    for (;;) {
      const tail = this.tail.value;
      const nextNode = tail.next.value;
      if (nextNode === null) {
        if (tail.next.compareAndSwap(null, node)) {
          this.tail.compareAndSwap(tail, node);
          return;
        }
      } else {
        this.tail.compareAndSwap(tail, nextNode);
      }
    }
  }

  dequeue(): T | null {
    for (;;) {
      const head = this.head.value;
      const tail = this.tail.value;
      const nextNode = head.next.value;
      if (head === tail) {
        if (nextNode === null) return null;
        this.tail.compareAndSwap(tail, nextNode);
        continue;
      }
      const value = nextNode!.value;
      if (this.head.compareAndSwap(head, nextNode!)) {
        return value;
      }
    }
  }
}
```

```cpp
#include <memory>
#include <optional>

template <typename T>
struct AtomicRef {
    std::shared_ptr<T> value;
    explicit AtomicRef(std::shared_ptr<T> v) : value(std::move(v)) {}
    bool compareAndSwap(const std::shared_ptr<T>& expected, const std::shared_ptr<T>& next) {
        if (value == expected) {
            value = next;
            return true;
        }
        return false;
    }
};

template <typename T>
struct Node {
    std::optional<T> value;
    AtomicRef<Node<T>> next{nullptr};
    Node() : next(nullptr) {}
    explicit Node(T v) : value(v), next(nullptr) {}
};

template <typename T>
class MSQueue {
public:
    MSQueue() : head(std::make_shared<Node<T>>()), tail(head.value) {}

    void enqueue(T value) {
        auto node = std::make_shared<Node<T>>(value);
        while (true) {
            auto t = tail.value;
            auto nextNode = t->next.value;
            if (nextNode == nullptr) {
                if (t->next.compareAndSwap(nullptr, node)) {
                    tail.compareAndSwap(t, node);
                    return;
                }
            } else {
                tail.compareAndSwap(t, nextNode);
            }
        }
    }

    std::optional<T> dequeue() {
        while (true) {
            auto h = head.value;
            auto t = tail.value;
            auto nextNode = h->next.value;
            if (h == t) {
                if (nextNode == nullptr) return std::nullopt;
                tail.compareAndSwap(t, nextNode);
                continue;
            }
            T value = *nextNode->value;
            if (head.compareAndSwap(h, nextNode)) {
                return value;
            }
        }
    }

private:
    AtomicRef<Node<T>> head;
    AtomicRef<Node<T>> tail;
};
```

```rust
use std::cell::RefCell;
use std::rc::Rc;

struct Node<T> {
    value: Option<T>,
    next: RefCell<Option<Rc<Node<T>>>>,
}

struct MSQueue<T> {
    head: RefCell<Rc<Node<T>>>,
    tail: RefCell<Rc<Node<T>>>,
}

impl<T: Clone> MSQueue<T> {
    fn new() -> Self {
        let dummy = Rc::new(Node { value: None, next: RefCell::new(None) });
        MSQueue { head: RefCell::new(dummy.clone()), tail: RefCell::new(dummy) }
    }

    fn enqueue(&self, value: T) {
        let node = Rc::new(Node { value: Some(value), next: RefCell::new(None) });
        loop {
            let tail = self.tail.borrow().clone();
            let next_node = tail.next.borrow().clone();
            match next_node {
                None => {
                    // 1段階目: tailのnextをCAS相当の操作で新ノードにする
                    *tail.next.borrow_mut() = Some(node.clone());
                    // 2段階目: tailポインタ自体を新ノードへ進める
                    *self.tail.borrow_mut() = node;
                    return;
                }
                Some(n) => {
                    // 他スレッドが1段階目まで終えている: 代わりにtailを進めてあげる(協調)
                    *self.tail.borrow_mut() = n;
                }
            }
        }
    }

    fn dequeue(&self) -> Option<T> {
        loop {
            let head = self.head.borrow().clone();
            let tail = self.tail.borrow().clone();
            let next_node = head.next.borrow().clone();
            if Rc::ptr_eq(&head, &tail) {
                match next_node {
                    None => return None, // キューは空
                    Some(n) => {
                        *self.tail.borrow_mut() = n; // tailが遅れている場合の協調
                        continue;
                    }
                }
            }
            let n = next_node.unwrap();
            let value = n.value.clone();
            *self.head.borrow_mut() = n;
            return value;
        }
    }
}
```

```csharp
class AtomicRef<T>
{
    public T Value;
    public AtomicRef(T value) { Value = value; }
    public bool CompareAndSwap(T expected, T next)
    {
        if (ReferenceEquals(Value, expected) || Equals(Value, expected))
        {
            Value = next;
            return true;
        }
        return false;
    }
}

class MsNode<T>
{
    public T? Value;
    public AtomicRef<MsNode<T>?> Next = new(null);
    public MsNode(T? value = default) { Value = value; }
}

class MsQueue<T>
{
    public AtomicRef<MsNode<T>> Head;
    public AtomicRef<MsNode<T>> Tail;

    public MsQueue()
    {
        var dummy = new MsNode<T>();
        Head = new AtomicRef<MsNode<T>>(dummy);
        Tail = new AtomicRef<MsNode<T>>(dummy);
    }

    public void Enqueue(T value)
    {
        var node = new MsNode<T>(value);
        while (true)
        {
            var tail = Tail.Value;
            var nextNode = tail.Next.Value;
            if (nextNode == null)
            {
                if (tail.Next.CompareAndSwap(null, node))
                {
                    Tail.CompareAndSwap(tail, node);
                    return;
                }
            }
            else
            {
                Tail.CompareAndSwap(tail, nextNode);
            }
        }
    }

    public (bool found, T? value) Dequeue()
    {
        while (true)
        {
            var head = Head.Value;
            var tail = Tail.Value;
            var nextNode = head.Next.Value;
            if (ReferenceEquals(head, tail))
            {
                if (nextNode == null) return (false, default);
                Tail.CompareAndSwap(tail, nextNode);
                continue;
            }
            var value = nextNode!.Value;
            if (Head.CompareAndSwap(head, nextNode))
            {
                return (true, value);
            }
        }
    }
}
```
