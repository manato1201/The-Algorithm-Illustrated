---
name: ロックフリースキップリスト(Lock-Free Skip List)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(log n)(期待値。探索・挿入・削除とも)
summary: 高さの異なる連結リストを複数重ねた確率的なデータ構造であるスキップリストに、各層で「マーク付きポインタによる論理削除」を適用することで、ロックなしで期待O(log n)の探索・挿入・削除を実現する並行データ構造。
---

## 概要

通常のスキップリスト(確率的な多層連結リストで、平衡木に匹敵する期待O(log n)の性能を持つ)を複数スレッドで安全に共有するには、ロックによる保護が最も簡単な方法だが、ロックの粒度をノード単位に細かくしても、レベルの高いノードほど多くのスレッドから競合されやすくボトルネックになりやすい。ロックフリースキップリストは、[Harrisのロックフリー連結リスト](/algorithms/lock-free-linked-list-harris)の「論理削除(マーク付けCAS)→物理削除」という手法を、スキップリストの各層の連結リストにそのまま適用することで、ロックなしの並行アクセスを実現する。最下層(レベル0)のリストが正しい順序で保たれている限り探索の正しさは保証され、上位層はあくまで探索を高速化するための「近道」として、多少の不整合(まだ物理的に消えていないポインタが残っているなど)を許容しながら緩やかに整合させていく設計になっている。

## 仕組み

1. 各ノードはランダムに決定される「レベル(高さ)」を持ち、レベルkのノードはレベル0からレベルkまでの各層に、それぞれ独立した(マーク付き)nextポインタを持つ
2. **探索**: 最上層から開始し、各層で「目的のキー以上のノードに出会うまで」右へ進み、それ以上進めなくなったら1つ下の層に降りる、という操作を最下層まで繰り返す。各層の移動は[Harrisのロックフリー連結リスト](/algorithms/lock-free-linked-list-harris)の探索と同様に、削除マーク済みノードを読み飛ばしながら進む
3. **挿入**: まず新しいノードのレベルをランダムに決定する。最下層(レベル0)から順に、各層で対応する位置にノードをCASで挿入していく——最下層への挿入が完了した時点で、そのノードは論理的にリストに存在するとみなしてよい(上位層への挿入がまだ途中でも、最下層を辿れば正しく見つかる)
4. **削除**: 最上層から最下層に向かって、各層のノードに削除マークを立てていく。最下層の削除マークが立った時点で、そのノードは論理的に削除済みとなる
5. 物理的な後片付け(実際にポインタを張り替えてノードをリストから除去する)は、探索処理が削除マーク済みノードに出会うたびに副作用として行われる(Harrisのアルゴリズムと同じ遅延削除の考え方)

## 特性・トレードオフ

- **計算量**: 期待O(log n)(通常のスキップリストと同じ確率的な性能。レベルの決定にランダム性を使うため最悪ケースでは劣化しうるが、期待値としては対数時間が保証される)
- **最下層優先の正しさの保証**: 「最下層のリストさえ正しく保たれていれば全体として正しい」という設計により、上位層の更新が多少遅れても、探索は必ず正しい答えにたどり着ける。この「下から作り、上を後回しにする(挿入)/上から消し、下を最後に消す(削除)」という非対称な順序が並行性を高める鍵になっている
- **[Harrisのロックフリー連結リスト](/algorithms/lock-free-linked-list-harris)との関係**: 各層の実装そのものはHarrisのアルゴリズムの直接的な応用であり、スキップリストは「複数のHarrisリストを高さ方向に重ねた構造」と捉えることができる
- **平衡木との比較**: 赤黒木のような平衡二分探索木をロックフリーで実装するのは回転操作の複雑さから著しく難しいが、スキップリストは各層が独立した連結リストであるため、ロックフリー化がはるかに現実的である。この実装容易性の高さが、並行マップ・セットの実装でスキップリストが好まれる大きな理由になっている
- **使いどころ**: Javaの`ConcurrentSkipListMap`/`ConcurrentSkipListSet`(標準ライブラリで実際にロックフリースキップリストが使われている)、順序付きの並行集合・辞書が必要な高並行度システム、範囲検索(レンジクエリ)を伴う並行データ構造

## 実装例

```python
import random

MAX_LEVEL = 16
P = 0.5


def _random_level() -> int:
    level = 0
    while random.random() < P and level < MAX_LEVEL - 1:
        level += 1
    return level


class SLNode:
    def __init__(self, key, level: int) -> None:
        self.key = key
        self.level = level
        # 各層ごとに (next_node, marked) のペアをCAS単位として持つ
        self.next = [(None, False) for _ in range(level + 1)]


class LockFreeSkipList:
    def __init__(self) -> None:
        self.head = SLNode(float("-inf"), MAX_LEVEL - 1)
        tail = SLNode(float("inf"), MAX_LEVEL - 1)
        self.head.next = [(tail, False) for _ in range(MAX_LEVEL)]

    def _cas(self, node: SLNode, level: int, expected_next, expected_marked, new_next, new_marked) -> bool:
        if node.next[level] == (expected_next, expected_marked):
            node.next[level] = (new_next, new_marked)
            return True
        return False

    def _find(self, key):
        """各層の(prev, curr)を求めつつ、削除マーク済みノードを物理的に取り除く"""
        preds: list = [None] * MAX_LEVEL
        succs: list = [None] * MAX_LEVEL
        pred = self.head
        for level in range(MAX_LEVEL - 1, -1, -1):
            curr, _ = pred.next[level]
            while True:
                nxt, marked = curr.next[level]
                while marked:
                    # 物理削除(この層だけ): predのnextをcurrを飛ばしてnxtへ張り替える
                    if not self._cas(pred, level, curr, False, nxt, False):
                        curr, _ = pred.next[level]
                    else:
                        curr = nxt
                    nxt, marked = curr.next[level]
                if curr.key < key:
                    pred = curr
                    curr = nxt
                else:
                    break
            preds[level] = pred
            succs[level] = curr
        return preds, succs

    def insert(self, key) -> bool:
        top_level = _random_level()
        while True:
            preds, succs = self._find(key)
            if succs[0].key == key:
                return False  # 既に存在する
            new_node = SLNode(key, top_level)
            new_node.next = [(succs[i], False) for i in range(top_level + 1)]
            # 最下層への挿入が成功した時点で、論理的にリストへ追加されたとみなせる
            if not self._cas(preds[0], 0, succs[0], False, new_node, False):
                continue
            for level in range(1, top_level + 1):
                while not self._cas(preds[level], level, succs[level], False, new_node, False):
                    preds, succs = self._find(key)
            return True

    def delete(self, key) -> bool:
        _, succs = self._find(key)
        if succs[0].key != key:
            return False
        target = succs[0]
        # 上位層から順にマークを立てる(最下層のマークが「論理削除の確定」)
        for level in range(target.level, 0, -1):
            nxt, marked = target.next[level]
            while not marked:
                self._cas(target, level, nxt, False, nxt, True)
                nxt, marked = target.next[level]
        while True:
            nxt, marked = target.next[0]
            if marked:
                return False
            if self._cas(target, 0, nxt, False, nxt, True):
                self._find(key)  # 物理削除を促す(副作用での後片付け)
                return True

    def contains(self, key) -> bool:
        _, succs = self._find(key)
        return succs[0].key == key
```

```typescript
const MAX_LEVEL = 16;
const P = 0.5;

function randomLevel(): number {
  let level = 0;
  while (Math.random() < P && level < MAX_LEVEL - 1) level++;
  return level;
}

type Link<T> = { next: SLNode<T> | null; marked: boolean };

class SLNode<T> {
  next: Link<T>[];
  constructor(
    public key: number,
    public level: number,
  ) {
    this.next = new Array(level + 1).fill(null).map(() => ({ next: null, marked: false }));
  }
}

class LockFreeSkipList {
  private head: SLNode<number>;

  constructor() {
    const tail = new SLNode<number>(Infinity, MAX_LEVEL - 1);
    this.head = new SLNode<number>(-Infinity, MAX_LEVEL - 1);
    for (let i = 0; i < MAX_LEVEL; i++) {
      this.head.next[i] = { next: tail, marked: false };
    }
  }

  private cas(node: SLNode<number>, level: number, expected: Link<number>, next: Link<number>): boolean {
    const cur = node.next[level];
    if (cur.next === expected.next && cur.marked === expected.marked) {
      node.next[level] = next;
      return true;
    }
    return false;
  }

  // 各層の(prev, curr)を求めつつ、削除マーク済みノードを物理的に取り除く
  private find(key: number): { preds: SLNode<number>[]; succs: SLNode<number>[] } {
    const preds: SLNode<number>[] = new Array(MAX_LEVEL);
    const succs: SLNode<number>[] = new Array(MAX_LEVEL);
    let pred = this.head;
    for (let level = MAX_LEVEL - 1; level >= 0; level--) {
      let curr = pred.next[level].next!;
      for (;;) {
        let { next: nxt, marked } = curr.next[level];
        while (marked) {
          // 物理削除(この層だけ): predのnextをcurrを飛ばしてnxtへ張り替える
          if (!this.cas(pred, level, { next: curr, marked: false }, { next: nxt, marked: false })) {
            curr = pred.next[level].next!;
          } else {
            curr = nxt!;
          }
          ({ next: nxt, marked } = curr.next[level]);
        }
        if (curr.key < key) {
          pred = curr;
          curr = nxt!;
        } else {
          break;
        }
      }
      preds[level] = pred;
      succs[level] = curr;
    }
    return { preds, succs };
  }

  insert(key: number): boolean {
    const topLevel = randomLevel();
    for (;;) {
      let { preds, succs } = this.find(key);
      if (succs[0].key === key) return false;
      const newNode = new SLNode<number>(key, topLevel);
      for (let i = 0; i <= topLevel; i++) {
        newNode.next[i] = { next: succs[i], marked: false };
      }
      // 最下層への挿入が成功した時点で、論理的にリストへ追加されたとみなせる
      if (!this.cas(preds[0], 0, { next: succs[0], marked: false }, { next: newNode, marked: false })) {
        continue;
      }
      for (let level = 1; level <= topLevel; level++) {
        while (
          !this.cas(preds[level], level, { next: succs[level], marked: false }, { next: newNode, marked: false })
        ) {
          ({ preds, succs } = this.find(key));
        }
      }
      return true;
    }
  }

  delete(key: number): boolean {
    const { succs } = this.find(key);
    if (succs[0].key !== key) return false;
    const target = succs[0];
    // 上位層から順にマークを立てる(最下層のマークが「論理削除の確定」)
    for (let level = target.level; level >= 1; level--) {
      let { next: nxt, marked } = target.next[level];
      while (!marked) {
        this.cas(target, level, { next: nxt, marked: false }, { next: nxt, marked: true });
        ({ next: nxt, marked } = target.next[level]);
      }
    }
    for (;;) {
      const { next: nxt, marked } = target.next[0];
      if (marked) return false;
      if (this.cas(target, 0, { next: nxt, marked: false }, { next: nxt, marked: true })) {
        this.find(key); // 物理削除を促す(副作用での後片付け)
        return true;
      }
    }
  }

  contains(key: number): boolean {
    const { succs } = this.find(key);
    return succs[0].key === key;
  }
}
```
