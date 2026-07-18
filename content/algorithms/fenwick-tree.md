---
name: フェニック木(Binary Indexed Tree)
category: データ構造
subcategory: 区間・累積クエリ構造
complexity: O(log n)
summary: 累積和の更新・照会を、セグメント木よりも省メモリ・省コードで実現する。
---

## 概要

「配列の先頭からある位置までの累積和」を高速に照会しつつ、「ある1要素の値を更新」も高速に行いたい、という**区間和に特化した**用途において、セグメント木よりもさらに省メモリ・省コードで実現できるデータ構造。1994年にPeter Fenwickが考案したことからこの名がつき、内部でビット演算を巧みに使うことから「Binary Indexed Tree(BIT)」とも呼ばれる。

## 仕組み

フェニック木の各インデックスiは、**「iを2進数で表したときの、最下位の1のビットが表す幅」の区間の和**を保持する、という一見トリッキーな設計になっている。

- **更新**: あるインデックスiの値を変更したら、`i += i & (-i)`(最下位ビットを足す)という操作を繰り返しながら、影響を受ける全ての祖先インデックスの値を更新していく
- **累積和の照会**: あるインデックスiまでの累積和を求めたければ、`i -= i & (-i)`(最下位ビットを引く)という操作を繰り返しながら、関係するインデックスの値を足し合わせていく

`i & (-i)` という1つのビット演算だけで「次に更新・照会すべきインデックス」を求められるのが最大の特徴で、木構造を明示的なポインタで表現する必要がなく、**配列1本だけ**で実装できる。

## 特性・トレードオフ

- **計算量**: 更新・累積和照会ともにO(log n)。セグメント木と同じオーダーだが、定数倍が軽く、コード量も大幅に少なくて済む
- **セグメント木との違い**: フェニック木が扱えるのは基本的に「足し算・引き算で元に戻せる」演算(和や差分)に限られる。最小値・最大値のように「一度失われた情報を引き算で復元できない」演算には、セグメント木ほど自然には対応できない
- **実装のコンパクトさ**: 木構造を明示的に持たず配列だけで完結するため、競技プログラミングのように短時間で正確に実装したい場面で特に重宝される
- **使いどころ**: 転倒数(数列の乱れ具合)のカウント、頻度分布の累積和の高速な更新・照会、ランキングシステムにおける「自分より上位の人数」のリアルタイム集計など

## 実装例

```python
class FenwickTree:
    def __init__(self, arr: list[int]):
        self.n = len(arr)
        self.tree = [0] * (self.n + 1)
        for i, value in enumerate(arr):
            self.add(i, value)

    def add(self, index: int, delta: int) -> None:
        i = index + 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)

    def prefix_sum(self, index: int) -> int:
        i = index + 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)
        return total

    def range_sum(self, left: int, right: int) -> int:
        if left == 0:
            return self.prefix_sum(right)
        return self.prefix_sum(right) - self.prefix_sum(left - 1)
```

```typescript
class FenwickTree {
  private n: number;
  private tree: number[];

  constructor(arr: number[]) {
    this.n = arr.length;
    this.tree = new Array(this.n + 1).fill(0);
    for (let i = 0; i < arr.length; i++) {
      this.add(i, arr[i]);
    }
  }

  add(index: number, delta: number): void {
    let i = index + 1;
    while (i <= this.n) {
      this.tree[i] += delta;
      i += i & -i;
    }
  }

  prefixSum(index: number): number {
    let i = index + 1;
    let total = 0;
    while (i > 0) {
      total += this.tree[i];
      i -= i & -i;
    }
    return total;
  }

  rangeSum(left: number, right: number): number {
    if (left === 0) return this.prefixSum(right);
    return this.prefixSum(right) - this.prefixSum(left - 1);
  }
}
```

```cpp
#include <vector>

class FenwickTree {
public:
    explicit FenwickTree(const std::vector<int>& arr)
        : n(static_cast<int>(arr.size())), tree(n + 1, 0) {
        for (int i = 0; i < n; i++) {
            add(i, arr[i]);
        }
    }

    void add(int index, int delta) {
        for (int i = index + 1; i <= n; i += i & (-i)) {
            tree[i] += delta;
        }
    }

    int prefixSum(int index) const {
        int total = 0;
        for (int i = index + 1; i > 0; i -= i & (-i)) {
            total += tree[i];
        }
        return total;
    }

    int rangeSum(int left, int right) const {
        if (left == 0) return prefixSum(right);
        return prefixSum(right) - prefixSum(left - 1);
    }

private:
    int n;
    std::vector<int> tree;
};
```

```rust
struct FenwickTree {
    n: usize,
    tree: Vec<i64>,
}

impl FenwickTree {
    fn new(arr: &[i64]) -> Self {
        let n = arr.len();
        let mut ft = FenwickTree { n, tree: vec![0; n + 1] };
        for (i, &value) in arr.iter().enumerate() {
            ft.add(i, value);
        }
        ft
    }

    fn add(&mut self, index: usize, delta: i64) {
        let mut i = index + 1;
        while i <= self.n {
            self.tree[i] += delta;
            i += i & i.wrapping_neg();
        }
    }

    fn prefix_sum(&self, index: usize) -> i64 {
        let mut i = index + 1;
        let mut total = 0;
        while i > 0 {
            total += self.tree[i];
            i -= i & i.wrapping_neg();
        }
        total
    }

    fn range_sum(&self, left: usize, right: usize) -> i64 {
        if left == 0 {
            self.prefix_sum(right)
        } else {
            self.prefix_sum(right) - self.prefix_sum(left - 1)
        }
    }
}
```

```csharp
class FenwickTree
{
    private readonly int n;
    private readonly int[] tree;

    public FenwickTree(int[] arr)
    {
        n = arr.Length;
        tree = new int[n + 1];
        for (int i = 0; i < arr.Length; i++)
        {
            Add(i, arr[i]);
        }
    }

    public void Add(int index, int delta)
    {
        int i = index + 1;
        while (i <= n)
        {
            tree[i] += delta;
            i += i & (-i);
        }
    }

    public int PrefixSum(int index)
    {
        int i = index + 1;
        int total = 0;
        while (i > 0)
        {
            total += tree[i];
            i -= i & (-i);
        }
        return total;
    }

    public int RangeSum(int left, int right)
    {
        if (left == 0) return PrefixSum(right);
        return PrefixSum(right) - PrefixSum(left - 1);
    }
}
```
