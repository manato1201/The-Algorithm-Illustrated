---
name: 疎表(Sparse Table)
category: データ構造
subcategory: 区間・累積クエリ構造
complexity: O(1)(クエリ)
summary: 事前計算で区間最小値などのクエリを定数時間で答える、更新のないデータ向けの構造。
---

## 概要

セグメント木は「更新もクエリも両方必要」な場面で強力だが、もし**データが一切更新されない**とわかっているなら、もっと大胆に高速化できる。疎表(Sparse Table)は、事前計算に多少の手間をかける代わりに、区間最小値・最大値のようなクエリを**驚くべきことにO(1)**(定数時間)で答えられるようにする、データが静的な場合専用のデータ構造。

## 仕組み

「2のべき乗の長さの区間」についてだけ、あらかじめ全ての答えを計算しておく、というのが核心のアイデア。

1. `sparse[k][i]` を「位置iから始まる、長さ2^kの区間における最小値(あるいは最大値)」と定義する
2. `sparse[0][i]` は要素そのもの(長さ1の区間)
3. `sparse[k][i] = min(sparse[k-1][i], sparse[k-1][i + 2^(k-1)])` という漸化式で、小さいkから大きいkへ順に埋めていく(長さ2^kの区間は、長さ2^(k-1)の区間2つに分割できるため)
4. クエリ時、知りたい区間の長さに収まる最大の2のべき乗 `2^k` を求め、**区間の左側から始まる長さ2^kの部分**と**区間の右側で終わる長さ2^kの部分**という、**重なりを許した2つの区間**の最小値同士を比較するだけで答えが求まる

「区間が重なっていても、min/maxのような"べき等"な演算(同じ値を何度使っても結果が変わらない演算)なら問題ない」という性質を利用しているのがポイントで、この重なりを許すことで、クエリのたびに複数の区間を継ぎ接ぎする必要がなくなり、たった2回の参照でO(1)が実現する。

## 特性・トレードオフ

- **計算量**: 構築O(n log n)、クエリO(1)。**ただし更新には対応できない**(1要素でも変更すると、関係する`sparse[k][i]`を全て再計算する必要があり、事前計算の意味がなくなる)
- **セグメント木との使い分け**: データが一切変わらないと分かっているならO(1)クエリの疎表が圧倒的に有利。更新が発生しうるならセグメント木(O(log n))を選ぶ必要がある
- **べき等な演算に限定**: min/max/gcd(最大公約数)のような「同じ値を重複して使っても結果が変わらない」演算にしか、この重なりを許すテクニックは使えない。合計(sum)のような演算では重複分が余計に加算されてしまうため適用できない
- **使いどころ**: LCA(最小共通祖先)問題の高速な解法(オイラーツアー+疎表)、変化しないログデータに対する区間最小値の大量クエリ、競技プログラミングにおける静的な区間クエリ問題全般

## 実装例

```python
class SparseTable:
    def __init__(self, arr: list[int]) -> None:
        n = len(arr)
        self.log = [0] * (n + 1)
        for i in range(2, n + 1):
            self.log[i] = self.log[i // 2] + 1
        k = self.log[n] + 1 if n > 0 else 1
        self.table = [[0] * n for _ in range(k)]
        self.table[0] = arr[:]
        for j in range(1, k):
            length = 1 << j
            for i in range(n - length + 1):
                self.table[j][i] = min(self.table[j - 1][i], self.table[j - 1][i + (length >> 1)])

    def query_min(self, l: int, r: int) -> int:  # 区間[l, r]は両端を含む
        j = self.log[r - l + 1]
        return min(self.table[j][l], self.table[j][r - (1 << j) + 1])
```

```typescript
class SparseTable {
  private table: number[][];
  private log: number[];

  constructor(arr: number[]) {
    const n = arr.length;
    this.log = new Array(n + 1).fill(0);
    for (let i = 2; i <= n; i++) this.log[i] = this.log[Math.floor(i / 2)] + 1;
    const k = n > 0 ? this.log[n] + 1 : 1;
    this.table = Array.from({ length: k }, () => new Array(n).fill(0));
    this.table[0] = [...arr];
    for (let j = 1; j < k; j++) {
      const length = 1 << j;
      for (let i = 0; i + length <= n; i++) {
        this.table[j][i] = Math.min(this.table[j - 1][i], this.table[j - 1][i + (length >> 1)]);
      }
    }
  }

  queryMin(l: number, r: number): number {
    // 区間[l, r]は両端を含む
    const j = this.log[r - l + 1];
    return Math.min(this.table[j][l], this.table[j][r - (1 << j) + 1]);
  }
}
```

```cpp
#include <vector>
#include <algorithm>

class SparseTable {
public:
    explicit SparseTable(const std::vector<int>& arr) {
        int n = static_cast<int>(arr.size());
        log_.assign(n + 1, 0);
        for (int i = 2; i <= n; i++) {
            log_[i] = log_[i / 2] + 1;
        }
        int k = (n > 0) ? log_[n] + 1 : 1;
        table_.assign(k, std::vector<int>(n));
        if (n > 0) table_[0] = arr;
        for (int j = 1; j < k; j++) {
            int length = 1 << j;
            for (int i = 0; i + length <= n; i++) {
                table_[j][i] = std::min(table_[j - 1][i], table_[j - 1][i + (length >> 1)]);
            }
        }
    }

    // 区間[l, r]は両端を含む
    int queryMin(int l, int r) const {
        int j = log_[r - l + 1];
        return std::min(table_[j][l], table_[j][r - (1 << j) + 1]);
    }

private:
    std::vector<std::vector<int>> table_;
    std::vector<int> log_;
};
```

```rust
struct SparseTable {
    table: Vec<Vec<i32>>,
    log: Vec<usize>,
}

impl SparseTable {
    fn new(arr: &[i32]) -> Self {
        let n = arr.len();
        let mut log = vec![0usize; n + 1];
        for i in 2..=n {
            log[i] = log[i / 2] + 1;
        }
        let k = if n > 0 { log[n] + 1 } else { 1 };
        let mut table = vec![vec![0i32; n]; k];
        if n > 0 {
            table[0] = arr.to_vec();
        }
        for j in 1..k {
            let length = 1usize << j;
            let half = length >> 1;
            for i in 0..n {
                if i + length > n {
                    break;
                }
                table[j][i] = table[j - 1][i].min(table[j - 1][i + half]);
            }
        }
        SparseTable { table, log }
    }

    // 区間[l, r]は両端を含む
    fn query_min(&self, l: usize, r: usize) -> i32 {
        let j = self.log[r - l + 1];
        self.table[j][l].min(self.table[j][r - (1 << j) + 1])
    }
}
```

```csharp
class SparseTable
{
    private readonly int[][] table;
    private readonly int[] log;

    public SparseTable(int[] arr)
    {
        int n = arr.Length;
        log = new int[n + 1];
        for (int i = 2; i <= n; i++) log[i] = log[i / 2] + 1;
        int k = n > 0 ? log[n] + 1 : 1;
        table = new int[k][];
        table[0] = (int[])arr.Clone();
        for (int j = 1; j < k; j++)
        {
            int length = 1 << j;
            table[j] = new int[n];
            for (int i = 0; i + length <= n; i++)
                table[j][i] = Math.Min(table[j - 1][i], table[j - 1][i + (length >> 1)]);
        }
    }

    // 区間[l, r]は両端を含む
    public int QueryMin(int l, int r)
    {
        int j = log[r - l + 1];
        return Math.Min(table[j][l], table[j][r - (1 << j) + 1]);
    }
}
```
