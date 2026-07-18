---
name: セグメント木
category: データ構造
subcategory: 区間・累積クエリ構造
complexity: O(log n)
summary: 区間に対する演算(和・最小値など)を高速に更新・照会できる木構造。
---

## 概要

「配列のある区間の合計(または最小値・最大値など)を知りたい」というクエリと、「配列のある1要素の値を変更したい」という更新の**両方**を、繰り返し何度も高速に処理したいときに使う木構造。素朴にやれば、区間クエリはO(n)(その区間を毎回全部足す)かかるが、セグメント木を使えばクエリも更新もO(log n)まで高速化できる。

## 仕組み

配列全体を「根」とし、区間を半分に分割していく二分木を作る。各ノードは「自分が担当する区間の集約値(和・最小値など)」を保持する。

1. **構築**: 葉は配列の各要素そのもの。親ノードは、2つの子ノードの値を集約演算(和なら足し算、最小値ならmin)で結合した値を持つ
2. **区間クエリ**: 知りたい区間を、木をたどりながら「ちょうどその区間を担当するノードたち」に分解する。分解できるノードの数はO(log n)個で済むため、それらの値を集約するだけで答えが求まる
3. **更新**: ある1要素を変更したら、その葉から根まで、経路上の全ての祖先ノードの値を再計算する(経路の長さはO(log n))

「大きな区間の答えは、半分の区間2つの答えを組み合わせれば求まる」という、区間演算が持つ**結合的な性質**をそのまま木構造に落とし込んでいるのが本質。

## 特性・トレードオフ

- **計算量**: 構築O(n)、区間クエリ・1点更新ともにO(log n)。頻繁な更新とクエリが混在する場面で真価を発揮する
- **フェニック木との比較**: 区間和・1点更新だけならフェニック木の方が実装がシンプルで定数倍も軽いが、セグメント木は**最小値・最大値・最大公約数など、より多様な集約演算に対応できる**汎用性を持つ。「引き算で元に戻せない」演算(minなど)でも扱えるのがセグメント木の強み
- **遅延評価との組み合わせ**: 「区間全体に同じ値を足す」といった**区間更新**にも、遅延伝播(lazy propagation)というテクニックを組み合わせることでO(log n)のまま対応できる
- **使いどころ**: 競技プログラミングでの区間クエリ問題全般、株価の一定期間の最大値をリアルタイムに更新しながら問い合わせるシステム、ゲームの当たり判定における空間分割の一部など

## 実装例

区間和を求めるセグメント木の実装例(配列1本で二分木を表現するボトムアップ方式)。

```python
class SegmentTree:
    def __init__(self, arr: list[int]):
        self.n = len(arr)
        self.tree = [0] * (2 * self.n)
        for i in range(self.n):
            self.tree[self.n + i] = arr[i]
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def update(self, index: int, value: int) -> None:
        i = index + self.n
        self.tree[i] = value
        i //= 2
        while i >= 1:
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]
            i //= 2

    def query(self, left: int, right: int) -> int:
        """[left, right)の区間和を返す"""
        res = 0
        left += self.n
        right += self.n
        while left < right:
            if left % 2 == 1:
                res += self.tree[left]
                left += 1
            if right % 2 == 1:
                right -= 1
                res += self.tree[right]
            left //= 2
            right //= 2
        return res
```

```typescript
class SegmentTree {
  n: number;
  tree: number[];
  constructor(arr: number[]) {
    this.n = arr.length;
    this.tree = new Array(2 * this.n).fill(0);
    for (let i = 0; i < this.n; i++) this.tree[this.n + i] = arr[i];
    for (let i = this.n - 1; i >= 1; i--) this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1];
  }
  update(index: number, value: number): void {
    let i = index + this.n;
    this.tree[i] = value;
    i = Math.floor(i / 2);
    while (i >= 1) {
      this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1];
      i = Math.floor(i / 2);
    }
  }
  query(left: number, right: number): number {
    // [left, right) の区間和を返す
    let res = 0;
    left += this.n;
    right += this.n;
    while (left < right) {
      if (left % 2 === 1) {
        res += this.tree[left];
        left++;
      }
      if (right % 2 === 1) {
        right--;
        res += this.tree[right];
      }
      left = Math.floor(left / 2);
      right = Math.floor(right / 2);
    }
    return res;
  }
}
```

```cpp
#include <vector>

class SegmentTree {
public:
    explicit SegmentTree(const std::vector<long long>& arr) {
        n = static_cast<int>(arr.size());
        tree.assign(2 * n, 0);
        for (int i = 0; i < n; i++) tree[n + i] = arr[i];
        for (int i = n - 1; i >= 1; i--) tree[i] = tree[2 * i] + tree[2 * i + 1];
    }

    void update(int index, long long value) {
        int i = index + n;
        tree[i] = value;
        for (i /= 2; i >= 1; i /= 2) {
            tree[i] = tree[2 * i] + tree[2 * i + 1];
        }
    }

    long long query(int left, int right) const {  // [left, right)
        long long res = 0;
        left += n;
        right += n;
        while (left < right) {
            if (left % 2 == 1) res += tree[left++];
            if (right % 2 == 1) res += tree[--right];
            left /= 2;
            right /= 2;
        }
        return res;
    }

private:
    int n;
    std::vector<long long> tree;
};
```

```rust
struct SegmentTree {
    n: usize,
    tree: Vec<i64>,
}

impl SegmentTree {
    fn new(arr: &[i64]) -> Self {
        let n = arr.len();
        let mut tree = vec![0i64; 2 * n];
        for i in 0..n {
            tree[n + i] = arr[i];
        }
        for i in (1..n).rev() {
            tree[i] = tree[2 * i] + tree[2 * i + 1];
        }
        SegmentTree { n, tree }
    }

    fn update(&mut self, index: usize, value: i64) {
        let mut i = index + self.n;
        self.tree[i] = value;
        i /= 2;
        while i >= 1 {
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1];
            i /= 2;
        }
    }

    fn query(&self, mut left: usize, mut right: usize) -> i64 {
        // [left, right) の区間和
        let mut res = 0;
        left += self.n;
        right += self.n;
        while left < right {
            if left % 2 == 1 {
                res += self.tree[left];
                left += 1;
            }
            if right % 2 == 1 {
                right -= 1;
                res += self.tree[right];
            }
            left /= 2;
            right /= 2;
        }
        res
    }
}
```

```csharp
class SegmentTree
{
    private readonly int n;
    private readonly long[] tree;

    public SegmentTree(int[] arr)
    {
        n = arr.Length;
        tree = new long[2 * n];
        for (int i = 0; i < n; i++) tree[n + i] = arr[i];
        for (int i = n - 1; i >= 1; i--) tree[i] = tree[2 * i] + tree[2 * i + 1];
    }

    public void Update(int index, long value)
    {
        int i = index + n;
        tree[i] = value;
        i /= 2;
        while (i >= 1)
        {
            tree[i] = tree[2 * i] + tree[2 * i + 1];
            i /= 2;
        }
    }

    public long Query(int left, int right)  // [left, right)
    {
        long res = 0;
        left += n;
        right += n;
        while (left < right)
        {
            if (left % 2 == 1) res += tree[left++];
            if (right % 2 == 1) res += tree[--right];
            left /= 2;
            right /= 2;
        }
        return res;
    }
}
```
