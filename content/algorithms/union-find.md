---
name: Union-Find(素集合データ構造)
category: グラフ
subcategory: 連結性・順序
complexity: O(α(n))(ほぼ定数)
summary: グループの併合と所属判定をほぼ定数時間で行う。クラスカル法の内部でも活躍する。
---

## 概要

「複数の要素をグループ分けし、2つの要素が同じグループに属しているかを判定する」「2つのグループを1つに統合する」という2つの操作を、驚くほど高速に行えるデータ構造。名前の通り「Union(併合)」と「Find(検索)」がその2大操作にあたる。クラスカル法(最小全域木)の閉路判定をはじめ、グラフの連結性を扱う場面の縁の下の力持ち。

## 仕組み

各要素は「木構造」の一部として表現され、木の根(root)がそのグループの代表者になる。

- **Find(検索)**: ある要素の属するグループを知りたければ、親をたどって根にたどり着けばよい。2つの要素のFindの結果(根)が一致すれば、同じグループ
- **Union(併合)**: 2つのグループを統合したければ、片方のグループの根をもう片方の根の子にすればよい

素朴な実装だとこれだけだが、以下の2つの工夫で計算量が劇的に改善する:
1. **経路圧縮(Path Compression)**: Findで根までたどった経路上の全ての要素を、直接根の子にしてしまう。次回以降のFindが一瞬で終わるようになる
2. **ランクによる併合(Union by Rank)**: 常に「木の高さが低い方」を「高い方」の子にすることで、木が縦に伸びすぎるのを防ぐ

この2つを組み合わせると、1回あたりの操作コストがO(α(n))という、実用上ほぼ定数とみなせる速さまで落ちる(αはアッカーマン関数の逆関数で、宇宙に存在する原子の数よりも大きいnに対してすら5を超えない、というほど極めてゆっくり増加する関数)。

## 特性・トレードオフ

- **計算量**: 経路圧縮+ランク併合の両方を使うとO(α(n))、実用上は定数時間とみなしてよい
- **「素集合」であることの意味**: 各要素はちょうど1つのグループにしか属さない(重複がない)という前提が「素集合(disjoint set)」の名前の由来
- **削除・分割はできない**: 併合はできても、一度統合したグループを再び分割する操作はこのデータ構造では効率的にサポートされない
- **使いどころ**: クラスカル法の閉路判定、画像処理の連結成分ラベリング、ネットワークの接続性判定(SNSの友人関係のクラスタなど)、動的な連結性クエリ(要素の追加・グループ化がリアルタイムに発生するシステム)など

## 実装例

経路圧縮とランクによる併合の両方を実装した版。

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 経路圧縮
        return self.parent[x]

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True
```

```typescript
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // 経路圧縮
    }
    return this.parent[x];
  }

  union(a: number, b: number): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}
```

```cpp
#include <vector>
#include <numeric>

class UnionFind {
public:
    explicit UnionFind(int n) : parent(n), rank(n, 0) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]); // 経路圧縮
        }
        return parent[x];
    }

    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) std::swap(ra, rb);
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }

private:
    std::vector<int> parent;
    std::vector<int> rank;
};
```

```rust
struct UnionFind {
    parent: Vec<usize>,
    rank: Vec<u32>,
}

impl UnionFind {
    fn new(n: usize) -> Self {
        UnionFind { parent: (0..n).collect(), rank: vec![0; n] }
    }

    fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x {
            self.parent[x] = self.find(self.parent[x]); // 経路圧縮
        }
        self.parent[x]
    }

    fn union(&mut self, a: usize, b: usize) -> bool {
        let mut ra = self.find(a);
        let mut rb = self.find(b);
        if ra == rb {
            return false;
        }
        if self.rank[ra] < self.rank[rb] {
            std::mem::swap(&mut ra, &mut rb);
        }
        self.parent[rb] = ra;
        if self.rank[ra] == self.rank[rb] {
            self.rank[ra] += 1;
        }
        true
    }
}
```

```csharp
class UnionFind
{
    private readonly int[] parent;
    private readonly int[] rank;

    public UnionFind(int n)
    {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    public int Find(int x)
    {
        if (parent[x] != x) parent[x] = Find(parent[x]); // 経路圧縮
        return parent[x];
    }

    public bool Union(int a, int b)
    {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) (ra, rb) = (rb, ra);
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }
}
```
