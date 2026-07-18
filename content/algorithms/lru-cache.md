---
name: LRUキャッシュ
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(1)
summary: ハッシュマップと双方向リストを組み合わせ、最も使われていないデータを定数時間で追い出す。
---

## 概要

キャッシュの容量には限りがあるため、いっぱいになったら何かを追い出さなければならない。LRU(Least Recently Used、最も最近使われていない)キャッシュは、「一番長い間アクセスされていないデータ」を追い出す、という直感的でよく効く戦略を、**取得・追加・追い出しの全てを定数時間O(1)で行える**形で実装したデータ構造。CPUのキャッシュメモリからWebブラウザ、データベースのバッファプールまで、あらゆる階層のキャッシュ機構の基本戦略になっている。

## 仕組み

O(1)を実現する鍵は、**ハッシュマップと双方向連結リストの組み合わせ**にある。

1. **双方向連結リスト**: 全てのキャッシュエントリを、「最近使われた順」に並べて保持する。リストの先頭が最も新しく使われたもの、末尾が最も長く使われていないもの
2. **ハッシュマップ**: キーから「そのキーが連結リストのどのノードにあるか」への参照を保持する

- **取得(get)**: ハッシュマップでノードを一瞬で見つけ、そのノードを連結リストの先頭に移動する(双方向リストなので、そのノードの前後のリンクを繋ぎ直すだけでO(1)で移動できる)
- **追加(put)**: 新しいエントリを連結リストの先頭に追加し、ハッシュマップにも登録する。容量を超えていたら、連結リストの**末尾**(=最も長く使われていない)のノードを削除する

ハッシュマップが「どこにあるか」を即座に教え、双方向リストが「順序の並べ替え」をO(1)で可能にする——この役割分担がLRUキャッシュのO(1)性能を支えている。

## 特性・トレードオフ

- **計算量**: 取得・追加・追い出しの全てがO(1)
- **他のキャッシュ戦略との比較**: LFU(最も使用頻度が低いものを追い出す)、FIFO(最初に入れたものを追い出す)など、追い出しの基準が異なる戦略も存在する。LRUは実装のシンプルさと、実務での「直近のアクセス傾向が今後も続きやすい」という経験則(局所性)にうまく合致することから広く使われる
- **メモリオーバーヘッド**: 双方向リストのポインタ分だけ、単純な配列やハッシュマップ単体よりメモリを多く使う
- **使いどころ**: Webブラウザのキャッシュ、CDN、データベースのバッファプール、CPUのキャッシュ置換ポリシー、アプリケーションレベルのメモ化キャッシュなど、「限られた容量で頻繁にアクセスされるデータを高速に保持したい」あらゆる場面

## 実装例

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev: "Node | None" = None
        self.next: "Node | None" = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.map: dict[int, Node] = {}
        self.head = Node()  # 番兵: 先頭側(最新)
        self.tail = Node()  # 番兵: 末尾側(最古)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node: Node) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._add_front(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]
```

```typescript
class LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null = null;
  next: LRUNode<K, V> | null = null;
  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache<K, V> {
  private capacity: number;
  private map = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V>;
  private tail: LRUNode<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head = new LRUNode<K, V>(null as unknown as K, null as unknown as V);
    this.tail = new LRUNode<K, V>(null as unknown as K, null as unknown as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private remove(node: LRUNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private addFront(node: LRUNode<K, V>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  get(key: K): V | -1 {
    const node = this.map.get(key);
    if (!node) return -1;
    this.remove(node);
    this.addFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) this.remove(existing);
    const node = new LRUNode(key, value);
    this.map.set(key, node);
    this.addFront(node);
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev!;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

```cpp
#include <unordered_map>

template <typename K, typename V>
class LRUCache {
public:
    explicit LRUCache(int capacity) : capacity_(capacity) {
        head_ = new Node();
        tail_ = new Node();
        head_->next = tail_;
        tail_->prev = head_;
    }

    ~LRUCache() {
        Node* cur = head_;
        while (cur) {
            Node* next = cur->next;
            delete cur;
            cur = next;
        }
    }

    bool get(const K& key, V& outValue) {
        auto it = map_.find(key);
        if (it == map_.end()) return false;
        Node* node = it->second;
        remove(node);
        addFront(node);
        outValue = node->value;
        return true;
    }

    void put(const K& key, const V& value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            remove(it->second);
            delete it->second;
        }
        Node* node = new Node{key, value, nullptr, nullptr};
        map_[key] = node;
        addFront(node);
        if (static_cast<int>(map_.size()) > capacity_) {
            Node* lru = tail_->prev;
            remove(lru);
            map_.erase(lru->key);
            delete lru;
        }
    }

private:
    struct Node {
        K key{};
        V value{};
        Node* prev = nullptr;
        Node* next = nullptr;
    };

    void remove(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }

    void addFront(Node* node) {
        node->next = head_->next;
        node->prev = head_;
        head_->next->prev = node;
        head_->next = node;
    }

    int capacity_;
    std::unordered_map<K, Node*> map_;
    Node* head_;
    Node* tail_;
};
```

```rust
use std::collections::HashMap;

struct Node<K, V> {
    key: K,
    value: V,
    prev: Option<usize>,
    next: Option<usize>,
}

// 生ポインタを避けるため、ノードをVecに格納しインデックスで前後を参照する
// アリーナ方式で双方向リストを表現する(unsafeなしで実装できる)。
// 簡略化のため、追い出されたスロットは再利用せずNoneのまま残す。
pub struct LruCache<K, V> {
    capacity: usize,
    map: HashMap<K, usize>,
    nodes: Vec<Option<Node<K, V>>>,
    head: Option<usize>, // 最新
    tail: Option<usize>, // 最古
}

impl<K, V> LruCache<K, V>
where
    K: std::hash::Hash + Eq + Clone,
{
    pub fn new(capacity: usize) -> Self {
        LruCache {
            capacity,
            map: HashMap::new(),
            nodes: Vec::new(),
            head: None,
            tail: None,
        }
    }

    fn detach(&mut self, idx: usize) {
        let (prev, next) = {
            let node = self.nodes[idx].as_ref().unwrap();
            (node.prev, node.next)
        };
        match prev {
            Some(p) => self.nodes[p].as_mut().unwrap().next = next,
            None => self.head = next,
        }
        match next {
            Some(n) => self.nodes[n].as_mut().unwrap().prev = prev,
            None => self.tail = prev,
        }
    }

    fn attach_front(&mut self, idx: usize) {
        {
            let node = self.nodes[idx].as_mut().unwrap();
            node.prev = None;
            node.next = self.head;
        }
        if let Some(h) = self.head {
            self.nodes[h].as_mut().unwrap().prev = Some(idx);
        }
        self.head = Some(idx);
        if self.tail.is_none() {
            self.tail = Some(idx);
        }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        let idx = *self.map.get(key)?;
        self.detach(idx);
        self.attach_front(idx);
        self.nodes[idx].as_ref().map(|n| &n.value)
    }

    pub fn put(&mut self, key: K, value: V) {
        if let Some(&idx) = self.map.get(&key) {
            self.detach(idx);
            self.nodes[idx] = Some(Node { key: key.clone(), value, prev: None, next: None });
            self.attach_front(idx);
            return;
        }

        let idx = self.nodes.len();
        self.nodes.push(Some(Node { key: key.clone(), value, prev: None, next: None }));
        self.map.insert(key, idx);
        self.attach_front(idx);

        if self.map.len() > self.capacity {
            if let Some(lru_idx) = self.tail {
                self.detach(lru_idx);
                let lru_key = self.nodes[lru_idx].take().unwrap().key;
                self.map.remove(&lru_key);
            }
        }
    }
}
```

```csharp
using System.Collections.Generic;

class LruCache
{
    private class Node
    {
        public int Key;
        public int Value;
        public Node? Prev;
        public Node? Next;
        public Node(int key = 0, int value = 0) { Key = key; Value = value; }
    }

    private readonly int _capacity;
    private readonly Dictionary<int, Node> _map = new();
    private readonly Node _head = new();
    private readonly Node _tail = new();

    public LruCache(int capacity)
    {
        _capacity = capacity;
        _head.Next = _tail;
        _tail.Prev = _head;
    }

    private void Remove(Node node)
    {
        node.Prev!.Next = node.Next;
        node.Next!.Prev = node.Prev;
    }

    private void AddFront(Node node)
    {
        node.Next = _head.Next;
        node.Prev = _head;
        _head.Next!.Prev = node;
        _head.Next = node;
    }

    public int Get(int key)
    {
        if (!_map.TryGetValue(key, out var node)) return -1;
        Remove(node);
        AddFront(node);
        return node.Value;
    }

    public void Put(int key, int value)
    {
        if (_map.TryGetValue(key, out var existing)) Remove(existing);
        var node = new Node(key, value);
        _map[key] = node;
        AddFront(node);
        if (_map.Count > _capacity)
        {
            var lru = _tail.Prev!;
            Remove(lru);
            _map.Remove(lru.Key);
        }
    }
}
```
