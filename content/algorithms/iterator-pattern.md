---
name: Iterator(イテレーター)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: 集合の内部構造を隠したまま、要素へ順番にアクセスする手段を提供する。
---
## 概要

配列・連結リスト・木構造・ハッシュマップなど、**内部実装が全く異なるコレクションに対して、統一された方法で要素を順番に走査する**手段を提供するふるまいパターン。呼び出し側はコレクションの内部構造(インデックスでアクセスするのか、ポインタをたどるのか、木を再帰的に辿るのか)を一切知らなくても、「次の要素があるか」「次の要素を取得する」という共通の操作だけで走査できる。現代の多くの言語では`for...of`や`foreach`といった言語構文そのものにこのパターンが組み込まれている。

## 仕組み

1. 「次の要素があるか」(`hasNext()`)と「次の要素を取得する」(`next()`)を持つイテレーターインターフェースを定義する
2. コレクション側に「自分に対応するイテレーターを生成する」メソッド(`createIterator()`)を持たせる(このコレクション側のインターフェースは「集約可能(Iterable)」と呼ばれることが多い)
3. 具体的なコレクションクラス(配列ベース、連結リストベース、木構造ベースなど)ごとに、その内部構造に応じた具体的なイテレータークラスを実装する。各イテレーターは「現在どこまで走査したか」というカーソル状態を内部に保持する
4. 呼び出し側は`collection.createIterator()`でイテレーターを取得し、`while (it.hasNext()) { it.next() }`のようなループで走査する。この間、コレクションの内部実装を一切参照しない
5. 同じコレクションに対して複数のイテレーターを同時に(独立したカーソル状態で)生成することも可能

## 特性・トレードオフ

- **内部構造の隠蔽**: コレクションの内部実装(配列か連結リストか木か)を走査ロジックから完全に切り離せるため、後からコレクションの内部実装を変更しても、走査する側のコードには影響しない
- **統一的な走査インターフェース**: 異なる種類のコレクションであっても、同じループ構文・同じインターフェースで走査できるため、ジェネリックなアルゴリズム(フィルタ・マップ・畳み込みなど)をコレクションの種類に依存せず書ける
- **複数の走査方法への対応**: 木構造のように「深さ優先」「幅優先」など複数の走査順序がありうる場合、それぞれに対応する別のイテレータークラスを用意することで、同じコレクションに対して複数の走査戦略を提供できる
- **使いどころ**: カスタムコレクションクラスの実装(多くの言語ではIterableインターフェースの実装がこれに相当)、木構造やグラフの複数の走査順序の提供、ページネーションやストリーミングデータの逐次取得(全件を一度にメモリに載せず、必要な分だけ都度取得する遅延評価的な使い方)など

## 実装例

配列ベースの独自コレクション`NameCollection`が`createIterator()`でイテレーターを生成し、呼び出し側は`hasNext()`/`next()`だけで内部実装を意識せず走査する最小構成。

```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")

class Iterator(ABC, Generic[T]):
    @abstractmethod
    def has_next(self) -> bool: ...
    @abstractmethod
    def next(self) -> T: ...

class NameCollection:
    def __init__(self):
        self._items: list[str] = []
    def add(self, item: str) -> None:
        self._items.append(item)
    def create_iterator(self) -> "NameIterator":
        return NameIterator(self._items)

class NameIterator(Iterator[str]):
    def __init__(self, items: list[str]):
        self._items = items
        self._cursor = 0
    def has_next(self) -> bool:
        return self._cursor < len(self._items)
    def next(self) -> str:
        item = self._items[self._cursor]
        self._cursor += 1
        return item

def demo() -> list[str]:
    collection = NameCollection()
    for name in ["Alice", "Bob", "Carol"]:
        collection.add(name)
    it = collection.create_iterator()
    result = []
    while it.has_next():
        result.append(it.next())
    return result
```

```typescript
interface CustomIterator<T> {
  hasNext(): boolean;
  next(): T;
}

class NameCollection {
  private items: string[] = [];
  add(item: string): void {
    this.items.push(item);
  }
  createIterator(): CustomIterator<string> {
    return new NameIterator(this.items);
  }
}

class NameIterator implements CustomIterator<string> {
  private cursor = 0;
  private items: string[];
  constructor(items: string[]) {
    this.items = items;
  }
  hasNext(): boolean {
    return this.cursor < this.items.length;
  }
  next(): string {
    return this.items[this.cursor++];
  }
}

function demo(): string[] {
  const collection = new NameCollection();
  for (const name of ["Alice", "Bob", "Carol"]) collection.add(name);
  const it = collection.createIterator();
  const result: string[] = [];
  while (it.hasNext()) result.push(it.next());
  return result;
}
```

```cpp
#include <vector>
#include <string>
#include <memory>

class NameIterator {
public:
    explicit NameIterator(const std::vector<std::string>& items) : items_(items), cursor_(0) {}
    bool hasNext() const { return cursor_ < items_.size(); }
    std::string next() { return items_[cursor_++]; }
private:
    const std::vector<std::string>& items_;
    size_t cursor_;
};

class NameCollection {
public:
    void add(const std::string& item) { items_.push_back(item); }
    NameIterator createIterator() const { return NameIterator(items_); }
private:
    std::vector<std::string> items_;
};

std::vector<std::string> demo() {
    NameCollection collection;
    for (const auto& name : {"Alice", "Bob", "Carol"}) collection.add(name);
    auto it = collection.createIterator();
    std::vector<std::string> result;
    while (it.hasNext()) result.push_back(it.next());
    return result;
}
```

```rust
struct NameCollection {
    items: Vec<String>,
}

impl NameCollection {
    fn new() -> Self {
        NameCollection { items: Vec::new() }
    }
    fn add(&mut self, item: &str) {
        self.items.push(item.to_string());
    }
    fn create_iterator(&self) -> NameIterator {
        NameIterator { items: &self.items, cursor: 0 }
    }
}

struct NameIterator<'a> {
    items: &'a [String],
    cursor: usize,
}

impl<'a> NameIterator<'a> {
    fn has_next(&self) -> bool {
        self.cursor < self.items.len()
    }
    fn next_item(&mut self) -> String {
        let item = self.items[self.cursor].clone();
        self.cursor += 1;
        item
    }
}

fn demo() -> Vec<String> {
    let mut collection = NameCollection::new();
    for name in ["Alice", "Bob", "Carol"] {
        collection.add(name);
    }
    let mut it = collection.create_iterator();
    let mut result = Vec::new();
    while it.has_next() {
        result.push(it.next_item());
    }
    result
}
```

```csharp
interface ICustomIterator<T> { bool HasNext(); T Next(); }

class NameCollection
{
    private readonly List<string> items = new();
    public void Add(string item) => items.Add(item);
    public ICustomIterator<string> CreateIterator() => new NameIterator(items);
}

class NameIterator : ICustomIterator<string>
{
    private readonly List<string> items;
    private int cursor = 0;
    public NameIterator(List<string> items) { this.items = items; }
    public bool HasNext() => cursor < items.Count;
    public string Next() => items[cursor++];
}

static List<string> Demo()
{
    var collection = new NameCollection();
    foreach (var name in new[] { "Alice", "Bob", "Carol" }) collection.Add(name);
    var it = collection.CreateIterator();
    var result = new List<string>();
    while (it.HasNext()) result.Add(it.Next());
    return result;
}
```
