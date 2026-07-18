---
name: スキップリスト
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(log n)(期待値)
summary: 複数階層のリンクリストで、平衡木に近い性能を乱数だけで実現する。
---

## 概要

赤黒木やAVL木のような平衡二分探索木は、O(log n)の性能を保証する代わりに、回転などの複雑な調整ロジックを必要とする。スキップリストは、**乱数の力を借りることで、複雑な回転操作なしに同等の性能を確率的に実現する**、連結リストの拡張版。1989年にWilliam Pughが考案し、実装のシンプルさから、Redisのソート済み集合(Sorted Set)など実際のプロダクトで採用されている。

## 仕組み

通常の連結リストは先頭から1つずつしかたどれずO(n)かかるが、スキップリストは**複数階層のリンク**を持たせることで、大きく飛び越えながら探索できるようにする。

1. 最下層は全ての要素を含む、通常のソート済み連結リスト
2. 要素を追加するとき、**コイン投げのような確率的な判定**で、その要素をどこまで上の階層にも含めるかを決める(例えば1/2の確率で1段上へ、さらに1/2の確率でもう1段上へ...)
3. 探索するときは、最も高い階層から始め、目的の値を超えない範囲で右へ進み、それ以上進めなくなったら1つ下の階層に降りる、を繰り返す。これにより、下層まで降りずに大きくジャンプしながら目的の位置に近づける

上層に行くほど含まれる要素が指数的に少なくなるため、平均的な階層数はO(log n)になり、これが探索速度の理論的な根拠になっている。

## 特性・トレードオフ

- **計算量**: 期待値でO(log n)。乱数に依存するため最悪ケースの理論上の保証はO(n)だが、確率的に非常に稀にしか起こらない
- **実装の単純さ**: 平衡二分探索木のような回転操作が不要で、リンクリストの延長として実装できるため、正しく実装するハードルが低い
- **並行処理との相性**: 木構造の回転操作は複数スレッドから同時にアクセスする際のロック管理が複雑になりがちだが、スキップリストは局所的な変更で済むため、並行アクセスの多いシステムで有利になることがある
- **使いどころ**: Redisのソート済み集合(ZSET)の内部実装、LevelDB/RocksDBのようなキーバリューストアのメモリ内インデックス構造など、シンプルさと十分な性能を両立させたい実務のシステムで採用例が多い

## 実装例

```python
import random


class SkipNode:
    def __init__(self, value: int | None, level: int):
        self.value = value
        self.forward: list["SkipNode | None"] = [None] * (level + 1)


class SkipList:
    def __init__(self, max_level: int = 16, p: float = 0.5):
        self.max_level = max_level
        self.p = p
        self.level = 0
        self.head = SkipNode(None, max_level)

    def _random_level(self) -> int:
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def insert(self, value: int) -> None:
        update: list[SkipNode] = [self.head] * (self.max_level + 1)
        cur = self.head
        for i in range(self.level, -1, -1):
            while cur.forward[i] is not None and cur.forward[i].value < value:
                cur = cur.forward[i]
            update[i] = cur
        lvl = self._random_level()
        if lvl > self.level:
            for i in range(self.level + 1, lvl + 1):
                update[i] = self.head
            self.level = lvl
        new_node = SkipNode(value, lvl)
        for i in range(lvl + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

    def search(self, value: int) -> bool:
        cur = self.head
        for i in range(self.level, -1, -1):
            while cur.forward[i] is not None and cur.forward[i].value < value:
                cur = cur.forward[i]
        cur = cur.forward[0]
        return cur is not None and cur.value == value
```

```typescript
class SkipNode {
  value: number | null;
  forward: (SkipNode | null)[];
  constructor(value: number | null, level: number) {
    this.value = value;
    this.forward = new Array(level + 1).fill(null);
  }
}

class SkipList {
  maxLevel: number;
  p: number;
  level: number;
  head: SkipNode;
  constructor(maxLevel = 16, p = 0.5) {
    this.maxLevel = maxLevel;
    this.p = p;
    this.level = 0;
    this.head = new SkipNode(null, maxLevel);
  }
  private randomLevel(): number {
    let lvl = 0;
    while (Math.random() < this.p && lvl < this.maxLevel) lvl++;
    return lvl;
  }
  insert(value: number): void {
    const update: SkipNode[] = new Array(this.maxLevel + 1);
    let cur = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (cur.forward[i] !== null && cur.forward[i]!.value! < value)
        cur = cur.forward[i]!;
      update[i] = cur;
    }
    const lvl = this.randomLevel();
    if (lvl > this.level) {
      for (let i = this.level + 1; i <= lvl; i++) update[i] = this.head;
      this.level = lvl;
    }
    const newNode = new SkipNode(value, lvl);
    for (let i = 0; i <= lvl; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }
  }
  search(value: number): boolean {
    let cur = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (cur.forward[i] !== null && cur.forward[i]!.value! < value)
        cur = cur.forward[i]!;
    }
    const next = cur.forward[0];
    return next !== null && next.value === value;
  }
}
```

```cpp
#include <vector>
#include <cstdlib>
#include <optional>

class SkipList {
public:
    explicit SkipList(int maxLevel = 16, double p = 0.5)
        : maxLevel(maxLevel), p(p), level(0), head(new Node(std::nullopt, maxLevel)) {}

    void insert(int value) {
        std::vector<Node*> update(maxLevel + 1, head);
        Node* cur = head;
        for (int i = level; i >= 0; i--) {
            while (cur->forward[i] != nullptr && cur->forward[i]->value < value) cur = cur->forward[i];
            update[i] = cur;
        }
        int lvl = randomLevel();
        if (lvl > level) {
            for (int i = level + 1; i <= lvl; i++) update[i] = head;
            level = lvl;
        }
        Node* newNode = new Node(value, lvl);
        for (int i = 0; i <= lvl; i++) {
            newNode->forward[i] = update[i]->forward[i];
            update[i]->forward[i] = newNode;
        }
    }

    bool search(int value) const {
        Node* cur = head;
        for (int i = level; i >= 0; i--) {
            while (cur->forward[i] != nullptr && cur->forward[i]->value < value) cur = cur->forward[i];
        }
        Node* next = cur->forward[0];
        return next != nullptr && next->value == value;
    }

private:
    struct Node {
        std::optional<int> value;
        std::vector<Node*> forward;
        Node(std::optional<int> v, int lvl) : value(v), forward(lvl + 1, nullptr) {}
    };

    int randomLevel() const {
        int lvl = 0;
        while (static_cast<double>(std::rand()) / RAND_MAX < p && lvl < maxLevel) lvl++;
        return lvl;
    }

    int maxLevel;
    double p;
    int level;
    Node* head;
};
```

```rust
// Cargo.toml に rand クレートへの依存が必要 (rand = "0.8")
use rand::Rng;

struct SkipNode {
    value: Option<i32>,
    forward: Vec<usize>, // インデックス。0は「終端」を表す番兵として扱う
}

struct SkipList {
    max_level: usize,
    p: f64,
    level: usize,
    nodes: Vec<SkipNode>, // nodes[0] が先頭センチネル
}

impl SkipList {
    fn new(max_level: usize, p: f64) -> Self {
        let head = SkipNode { value: None, forward: vec![0; max_level + 1] };
        SkipList { max_level, p, level: 0, nodes: vec![head] }
    }

    fn random_level(&self) -> usize {
        let mut rng = rand::thread_rng();
        let mut lvl = 0;
        while rng.gen::<f64>() < self.p && lvl < self.max_level {
            lvl += 1;
        }
        lvl
    }

    fn insert(&mut self, value: i32) {
        let mut update = vec![0usize; self.max_level + 1];
        let mut cur = 0usize;
        for i in (0..=self.level).rev() {
            while self.nodes[cur].forward[i] != 0
                && self.nodes[self.nodes[cur].forward[i]].value.unwrap() < value
            {
                cur = self.nodes[cur].forward[i];
            }
            update[i] = cur;
        }
        let lvl = self.random_level();
        if lvl > self.level {
            for i in self.level + 1..=lvl {
                update[i] = 0;
            }
            self.level = lvl;
        }
        let mut new_node = SkipNode { value: Some(value), forward: vec![0; lvl + 1] };
        for i in 0..=lvl {
            new_node.forward[i] = self.nodes[update[i]].forward[i];
        }
        self.nodes.push(new_node);
        let new_index = self.nodes.len() - 1;
        for i in 0..=lvl {
            self.nodes[update[i]].forward[i] = new_index;
        }
    }

    fn search(&self, value: i32) -> bool {
        let mut cur = 0usize;
        for i in (0..=self.level).rev() {
            while self.nodes[cur].forward[i] != 0
                && self.nodes[self.nodes[cur].forward[i]].value.unwrap() < value
            {
                cur = self.nodes[cur].forward[i];
            }
        }
        let next = self.nodes[cur].forward[0];
        next != 0 && self.nodes[next].value == Some(value)
    }
}
```

```csharp
class SkipNode
{
    public int? Value;
    public SkipNode?[] Forward;
    public SkipNode(int? value, int level) { Value = value; Forward = new SkipNode?[level + 1]; }
}

class SkipList
{
    private readonly int maxLevel;
    private readonly double p;
    private int level;
    private readonly SkipNode head;
    private readonly Random rnd = new();

    public SkipList(int maxLevel = 16, double p = 0.5)
    {
        this.maxLevel = maxLevel;
        this.p = p;
        level = 0;
        head = new SkipNode(null, maxLevel);
    }

    private int RandomLevel()
    {
        int lvl = 0;
        while (rnd.NextDouble() < p && lvl < maxLevel) lvl++;
        return lvl;
    }

    public void Insert(int value)
    {
        var update = new SkipNode[maxLevel + 1];
        var cur = head;
        for (int i = level; i >= 0; i--)
        {
            while (cur.Forward[i] != null && cur.Forward[i]!.Value < value) cur = cur.Forward[i]!;
            update[i] = cur;
        }
        int lvl = RandomLevel();
        if (lvl > level)
        {
            for (int i = level + 1; i <= lvl; i++) update[i] = head;
            level = lvl;
        }
        var newNode = new SkipNode(value, lvl);
        for (int i = 0; i <= lvl; i++)
        {
            newNode.Forward[i] = update[i].Forward[i];
            update[i].Forward[i] = newNode;
        }
    }

    public bool Search(int value)
    {
        var cur = head;
        for (int i = level; i >= 0; i--)
            while (cur.Forward[i] != null && cur.Forward[i]!.Value < value) cur = cur.Forward[i]!;
        var next = cur.Forward[0];
        return next != null && next.Value == value;
    }
}
```
