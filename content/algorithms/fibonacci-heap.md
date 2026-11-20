---
name: フィボナッチヒープ
category: データ構造
subcategory: 木構造
complexity: 挿入・最小参照・decrease-key が償却 O(1)、最小の取り出しが償却 O(log n)
summary: 要素の挿入や優先度の引き下げを「後回し」にして、取り出しのときにまとめて整理する遅延型のヒープ。ダイクストラ法を理論上 O(E + V log V) にした。
---

## 概要

[二分ヒープ](/algorithms/binary-heap)は挿入も取り出しも O(log n) だが、ダイクストラ法や[Prim法](/algorithms/prim)のように「すでに入っている要素の優先度を下げる(decrease-key)」操作が辺の数だけ繰り返される場面では、この O(log n) が効いてくる。辺が頂点よりずっと多い密なグラフでは、decrease-key のほうを軽くできれば全体が速くなる。

フィボナッチヒープ(Fredman と Tarjan、1984年)は、**整理を後回しにする**ことでこれを実現した。挿入や decrease-key では木をほとんど整えず、ただ「根のリスト」に付け足すだけにする。取り出しのときになって初めて、溜まった木をまとめて整理する。その結果、decrease-key も挿入も償却 O(1) になり、ダイクストラ法は O(E + V log V) になる。名前は、木の大きさの下限の解析にフィボナッチ数が現れることに由来する。

## 仕組み

ヒープは、最小ヒープの性質を満たす木の集合(根が円環状の双方向リストになっている)と、最小の根へのポインタを持つ。

- **挿入**: 1要素だけの木を根のリストに加え、最小ポインタを更新する。O(1)
- **併合(union)**: 2つの根リストを連結して、最小ポインタを小さい方にする。O(1)
- **最小の取り出し**: 最小の根を取り除き、その子をすべて根のリストへ移す。次に**統合(consolidate)**する。次数(子の数)が同じ根どうしを、値の大きい方を小さい方の子にして1つの木にまとめる操作を、同じ次数の根が残らなくなるまで繰り返す。最後に最小ポインタを根のリストから探し直す
- **decrease-key**: 値を下げ、親より小さくなったら切り離して根のリストへ移す。さらに親が「すでに子を1つ失っている」(印が付いている)なら親も切り離す、を上へ連鎖(cascading cut)させる。これで木が細長くなりすぎるのを防ぎ、次数 `k` の木の大きさが少なくともフィボナッチ数程度であることを保つ

## 特性・トレードオフ

- **償却計算量が優秀**: decrease-key が O(1)。ただし償却なので、1回の取り出しが遅い(木が溜まっている)ことはありうる。リアルタイム性が要る処理には向かない
- **実装が重く、定数が大きい**: ポインタだらけのデータ構造で、キャッシュ効率が悪い。実際には二分ヒープや、より単純な4分ヒープ・ペアリングヒープのほうが速いことが多い
- **理論上の道具**: 最小全域木や最短路などの漸近計算量の上界を示すための道具として重要。実運用では「decrease-key が非常に多い大規模な密グラフ」でようやく効くかどうか、というところ
- **削除**: 値を負の無限大へ decrease-key してから最小を取り出す。O(log n) 償却
- **使いどころ**: 計算量の理論解析、大規模な密グラフでの最短路・最小全域木の実験、ヒープの教科書的な比較

## 実装例

```python
class Node:
    def __init__(self, key):
        self.key = key
        self.degree = 0
        self.children = []


class FibonacciHeap:
    """挿入と最小の取り出しだけを示す簡略版(decrease-key は省略)。"""

    def __init__(self):
        self.roots = []
        self.size = 0

    def insert(self, key):
        self.roots.append(Node(key))   # 整理は後回し
        self.size += 1

    def extract_min(self):
        m = min(self.roots, key=lambda node: node.key)
        self.roots.remove(m)
        self.roots.extend(m.children)  # 子はすべて根へ
        self.size -= 1
        self._consolidate()
        return m.key

    def _consolidate(self):
        by_degree = {}
        for node in self.roots:
            while node.degree in by_degree:
                other = by_degree.pop(node.degree)
                if other.key < node.key:
                    node, other = other, node
                node.children.append(other)   # 大きい方を子にする
                node.degree += 1
            by_degree[node.degree] = node
        self.roots = list(by_degree.values())


h = FibonacciHeap()
for x in [7, 3, 9, 1, 5, 2]:
    h.insert(x)
print([h.extract_min() for _ in range(6)])  # [1, 2, 3, 5, 7, 9]
```

```typescript
class FNode {
  degree = 0;
  children: FNode[] = [];
  key: number;
  constructor(key: number) {
    this.key = key;
  }
}

class FibonacciHeap {
  private roots: FNode[] = [];

  insert(key: number): void {
    this.roots.push(new FNode(key)); // 整理は後回し
  }

  extractMin(): number {
    let mi = 0;
    this.roots.forEach((n, i) => {
      if (n.key < this.roots[mi].key) mi = i;
    });
    const [m] = this.roots.splice(mi, 1);
    this.roots.push(...m.children);
    this.consolidate();
    return m.key;
  }

  private consolidate(): void {
    const byDegree = new Map<number, FNode>();
    for (let node of this.roots) {
      while (byDegree.has(node.degree)) {
        let other = byDegree.get(node.degree)!;
        byDegree.delete(node.degree);
        if (other.key < node.key) [node, other] = [other, node];
        node.children.push(other);
        node.degree++;
      }
      byDegree.set(node.degree, node);
    }
    this.roots = [...byDegree.values()];
  }
}

const h = new FibonacciHeap();
for (const x of [7, 3, 9, 1, 5, 2]) h.insert(x);
console.log([0, 1, 2, 3, 4, 5].map(() => h.extractMin())); // [1, 2, 3, 5, 7, 9]
```
