---
name: Harrisのロックフリー連結リスト(Harris's Lock-Free Linked List)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(n)(探索・挿入・削除とも、リストの長さに比例)
summary: 削除対象のノードを物理的に取り除く前に「削除マーク」を次ポインタへアトミックに埋め込むことで、複数スレッドが同時に挿入・削除・探索を行っても整合性を保てる、順序付き単方向連結リストのロックフリー実装。
---

## 概要

[CASを使ったロックフリースタック](/algorithms/lock-free-stack-cas)や[Michael-Scottキュー](/algorithms/michael-scott-queue)は先頭・末尾という限定された位置だけを操作すればよいが、順序付きの連結リスト(集合やマップの内部実装として使われる)は、リストの任意の位置にあるノードを削除する必要がある。削除するノードの「直前のノードのnextポインタ」を安全に張り替える操作は、ある削除が完了する直前に別のスレッドがそのノードの直後へ新しいノードを挿入してしまうと削除が失われる、という競合を起こしやすく、ロックなしでは著しく難しい。2001年にティム・ハリスが発表したこのアルゴリズムは、削除を「論理削除(マーク付け)」と「物理削除(実際のポインタ張り替え)」の2段階に分けることでこの問題を解決する。ノードの`next`ポインタに1ビットの「削除マーク」を組み込んだ「マーク付きポインタ」を使い、ポインタの値とマークを1回のCASでアトミックに更新できるようにする。

## 仕組み

1. リストはキーの昇順に並んだ単方向連結リストとして表現される。各ノードの`next`は、通常のポインタ値と1ビットの削除マークをセットで持つ「マーク付きポインタ」であり、両方を1回のCASでアトミックに更新できる
2. **探索**: 先頭から順にノードを辿り、削除マークが付いたノードに出会ったら、その場で物理的に取り除く(直前のノードのnextを、マーク付きノードを飛ばして次のノードへCASで張り替える)。これにより探索のたびに副作用としてマーク済みノードが片付けられていく(遅延削除の掃除)
3. **挿入**: 挿入位置の直前ノードのnextを、CASで新しいノードに置き換える。CASの期待値には「削除マークが付いていないこと」も含めるため、他スレッドが同じ場所を削除しようとしていた場合は失敗し、探索からやり直す
4. **論理削除**: 削除対象ノードのnextポインタに削除マークを立てる(ポインタの値自体は変えず、マークビットだけをCASで1にする)。このCASが成功した時点で、そのノードは論理的には削除済みとみなされる(以降の探索では読み飛ばされる)
5. **物理削除**: 論理削除されたノードを、直前ノードのnextを張り替えて実際にリストから取り除く。この物理削除は、探索処理のついでに(または削除操作自身が続けて)行われる

## 特性・トレードオフ

- **計算量**: 探索・挿入・削除ともO(n)(リストの長さに比例)。ハッシュテーブルのバケットのように短いリストの集まりとして使えば、実質的な計算量は改善される
- **論理削除・物理削除の分離という着想**: この2段階分離が、[epoch-based-reclamation](/algorithms/epoch-based-reclamation)や[hazard-pointers](/algorithms/hazard-pointers)と組み合わせて安全にメモリを解放するための土台にもなる——論理削除された直後のノードは、まだ他スレッドが参照している可能性があるため、即座にメモリを解放してはならない
- **マーク付きポインタの実装コスト**: ポインタの下位ビットを流用する、あるいはポインタとマークを1つの構造体としてCASする、といった実装上の工夫が必要になる。Javaの`AtomicMarkableReference`はこの要求に応えるための専用クラスである
- **使いどころ**: Javaの`ConcurrentSkipListMap`やロックフリーハッシュテーブルの内部実装、順序付き集合(Set)のロックフリー実装、[skip-list-lock-free](/algorithms/skip-list-lock-free)の各層のリストの基礎的な構成要素

## 実装例

```python
class AtomicRef:
    def __init__(self, value):
        self.value = value

    def compare_and_swap(self, expected, new) -> bool:
        if self.value == expected:
            self.value = new
            return True
        return False


class Node:
    def __init__(self, key):
        self.key = key
        # (next_node, marked) のペアを1つの単位としてCASする(マーク付きポインタを模す)
        self.next = AtomicRef((None, False))


class LockFreeSortedList:
    def __init__(self) -> None:
        tail = Node(float("inf"))
        self.head = Node(float("-inf"))
        self.head.next = AtomicRef((tail, False))

    def _find(self, key):
        while True:  # 競合時はここに戻ってやり直す(retry)
            prev = self.head
            curr, _ = prev.next.value
            restart = False
            while True:
                succ, marked = curr.next.value
                while marked:
                    # 物理削除: prevのnextをcurrを飛ばしてsuccへ張り替える
                    if not prev.next.compare_and_swap((curr, False), (succ, False)):
                        restart = True
                        break
                    curr = succ
                    succ, marked = curr.next.value
                if restart:
                    break
                if curr.key >= key:
                    return prev, curr
                prev = curr
                curr = succ
            if restart:
                continue

    def insert(self, key) -> bool:
        new_node = Node(key)
        while True:
            prev, curr = self._find(key)
            if curr.key == key:
                return False  # 既に存在する
            new_node.next = AtomicRef((curr, False))
            if prev.next.compare_and_swap((curr, False), (new_node, False)):
                return True

    def delete(self, key) -> bool:
        while True:
            prev, curr = self._find(key)
            if curr.key != key:
                return False  # 存在しない
            succ, marked = curr.next.value
            if marked:
                return False
            # 論理削除: マークだけを立てる(ポインタ自体は変えない)
            if curr.next.compare_and_swap((succ, False), (succ, True)):
                prev.next.compare_and_swap((curr, False), (succ, False))  # 物理削除も試みる
                return True

    def contains(self, key) -> bool:
        _, curr = self._find(key)
        return curr.key == key
```

```typescript
type MarkablePointer<T> = { node: Node<T> | null; marked: boolean };

class AtomicRef<T> {
  constructor(public value: MarkablePointer<T>) {}
  compareAndSwap(
    expected: MarkablePointer<T>,
    next: MarkablePointer<T>,
  ): boolean {
    if (
      this.value.node === expected.node &&
      this.value.marked === expected.marked
    ) {
      this.value = next;
      return true;
    }
    return false;
  }
}

class Node<T> {
  next: AtomicRef<T>;
  constructor(public key: number) {
    this.next = new AtomicRef<T>({ node: null, marked: false });
  }
}

class LockFreeSortedList {
  private head: Node<number>;

  constructor() {
    const tail = new Node<number>(Infinity);
    this.head = new Node<number>(-Infinity);
    this.head.next = new AtomicRef<number>({ node: tail, marked: false });
  }

  private find(key: number): [Node<number>, Node<number>] {
    for (;;) {
      let prev = this.head;
      let curr = prev.next.value.node!;
      let restart = false;
      for (;;) {
        let { node: succ, marked } = curr.next.value;
        while (marked) {
          // 物理削除: prevのnextをcurrを飛ばしてsuccへ張り替える
          if (
            !prev.next.compareAndSwap(
              { node: curr, marked: false },
              { node: succ, marked: false },
            )
          ) {
            restart = true;
            break;
          }
          curr = succ!;
          ({ node: succ, marked } = curr.next.value);
        }
        if (restart) break;
        if (curr.key >= key) return [prev, curr];
        prev = curr;
        curr = succ!;
      }
      if (restart) continue;
    }
  }

  insert(key: number): boolean {
    const newNode = new Node<number>(key);
    for (;;) {
      const [prev, curr] = this.find(key);
      if (curr.key === key) return false;
      newNode.next = new AtomicRef<number>({ node: curr, marked: false });
      if (
        prev.next.compareAndSwap(
          { node: curr, marked: false },
          { node: newNode, marked: false },
        )
      ) {
        return true;
      }
    }
  }

  delete(key: number): boolean {
    for (;;) {
      const [prev, curr] = this.find(key);
      if (curr.key !== key) return false;
      const { node: succ, marked } = curr.next.value;
      if (marked) return false;
      if (
        curr.next.compareAndSwap(
          { node: succ, marked: false },
          { node: succ, marked: true },
        )
      ) {
        prev.next.compareAndSwap(
          { node: curr, marked: false },
          { node: succ, marked: false },
        );
        return true;
      }
    }
  }

  contains(key: number): boolean {
    const [, curr] = this.find(key);
    return curr.key === key;
  }
}
```
