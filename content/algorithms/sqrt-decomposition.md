---
name: 平方分割(Sqrt Decomposition)
category: データ構造
subcategory: 区間・累積クエリ構造
complexity: O(√n)(区間クエリ・更新)
summary: 配列を√n個ずつのブロックに分割し、各ブロックの集約値をあらかじめ計算しておくことで、実装の単純さを保ちながら区間クエリと更新の両方をO(√n)で処理する汎用的な区間クエリ技法。
---

## 概要

[セグメント木](/algorithms/segment-tree)や[Fenwick木](/algorithms/fenwick-tree)は区間クエリを`O(log n)`で処理できる強力な構造だが、木構造の構築・実装にはそれなりの複雑さが伴う。平方分割は、配列を`√n`個ずつの均等なブロックに分割し、各ブロックの集約値(合計・最小値など)をあらかじめ計算しておくだけ、という驚くほど単純な発想で、区間クエリ・点更新をどちらも`O(√n)`で処理できるようにする技法である。`O(log n)`より遅いが、実装が単純で汎用性が高く、`O(log n)`のデータ構造では対応しにくい特殊なクエリ(平方分割の各ブロックに任意の処理を持たせられる柔軟性)にも対応しやすいという利点がある。

## 仕組み

1. 配列(長さ`n`)を、サイズ`√n`のブロック`⌈n/√n⌉`個に分割する。各ブロックについて、集約値(合計・最小値・最大値など、扱うクエリに応じて選ぶ)を計算しておく
2. **区間クエリ`[l, r]`への回答**: (a) `l`を含むブロックの中で`l`から始まる部分だけを愚直に1要素ずつ処理する、(b) `l`のブロックの次から`r`のブロックの前までの、完全に区間に含まれるブロックについては、あらかじめ計算した集約値をそのまま使う(1ブロックあたり`O(1)`)、(c) `r`を含むブロックの中で`r`までの部分だけを愚直に処理する。ブロックサイズを`√n`に揃えることで、端の愚直処理が`O(√n)`、中間のブロック数も`O(√n)`個なので、合計`O(√n)`で区間クエリに答えられる
3. **点更新**: 該当する要素の値を更新した後、その要素が属するブロックの集約値を再計算する(ブロックサイズが`√n`なので`O(√n)`)

## 特性・トレードオフ

- **計算量**: 区間クエリ・点更新ともに`O(√n)`。[セグメント木](/algorithms/segment-tree)や[Fenwick木](/algorithms/fenwick-tree)の`O(log n)`より漸近的には遅いが、`n`が数百万程度までなら実用上十分高速なことが多い
- **実装の単純さと柔軟性**: 木構造やポインタ操作が一切不要で、配列とブロックの集約値配列だけで実装できる。各ブロックに「そのブロック内だけ遅延的に処理を反映する」といった、木構造では実装が煩雑になりがちな遅延処理も比較的素直に組み込みやすい
- **オフライン処理との相性**: クエリを全て先に読み込んでから処理する「オフラインクエリ」の文脈(Mo's algorithmのようなクエリ順序の並べ替え最適化)で、平方分割の考え方がそのまま応用され、[セグメント木](/algorithms/segment-tree)では扱いにくい種類のクエリ(区間内の相異なる値の個数など)を効率的に処理できることがある
- **使いどころ**: 競技プログラミングにおける区間クエリ問題(特にオフラインで処理できる場合)、実装の複雑さを避けたい状況での区間演算、配列の要素だけでなくクエリ自体をブロック化するMo's algorithmのような発展的手法の基礎

## 実装例

区間和を求める平方分割の実装例。ブロックサイズを`⌈√n⌉`とし、点更新・区間和クエリの結果をランダムなブロック分割・操作列に対する愚直な総当たり計算と突き合わせて検証している。

```python
import math


class SqrtDecomposition:
    def __init__(self, arr: list[int]) -> None:
        self.n = len(arr)
        self.arr = arr.copy()
        self.block_size = max(1, math.ceil(math.sqrt(self.n))) if self.n > 0 else 1
        num_blocks = (self.n + self.block_size - 1) // self.block_size
        self.block_sum = [0] * num_blocks
        for i, v in enumerate(self.arr):
            self.block_sum[i // self.block_size] += v

    def update(self, index: int, value: int) -> None:
        block = index // self.block_size
        self.block_sum[block] += value - self.arr[index]
        self.arr[index] = value

    def query(self, left: int, right: int) -> int:
        """[left, right)の区間和を返す"""
        res = 0
        block_left = left // self.block_size
        block_right = (right - 1) // self.block_size
        if block_left == block_right:
            for i in range(left, right):
                res += self.arr[i]
            return res
        end_of_first_block = (block_left + 1) * self.block_size
        for i in range(left, end_of_first_block):
            res += self.arr[i]
        for b in range(block_left + 1, block_right):
            res += self.block_sum[b]
        start_of_last_block = block_right * self.block_size
        for i in range(start_of_last_block, right):
            res += self.arr[i]
        return res
```

```typescript
class SqrtDecomposition {
  n: number;
  arr: number[];
  blockSize: number;
  blockSum: number[];

  constructor(arr: number[]) {
    this.n = arr.length;
    this.arr = [...arr];
    this.blockSize = this.n > 0 ? Math.max(1, Math.ceil(Math.sqrt(this.n))) : 1;
    const numBlocks = Math.ceil(this.n / this.blockSize);
    this.blockSum = new Array(numBlocks).fill(0);
    for (let i = 0; i < this.n; i++) {
      this.blockSum[Math.floor(i / this.blockSize)] += this.arr[i];
    }
  }

  update(index: number, value: number): void {
    const block = Math.floor(index / this.blockSize);
    this.blockSum[block] += value - this.arr[index];
    this.arr[index] = value;
  }

  query(left: number, right: number): number {
    // [left, right) の区間和を返す
    let res = 0;
    const blockLeft = Math.floor(left / this.blockSize);
    const blockRight = Math.floor((right - 1) / this.blockSize);
    if (blockLeft === blockRight) {
      for (let i = left; i < right; i++) res += this.arr[i];
      return res;
    }
    const endOfFirstBlock = (blockLeft + 1) * this.blockSize;
    for (let i = left; i < endOfFirstBlock; i++) res += this.arr[i];
    for (let b = blockLeft + 1; b < blockRight; b++) res += this.blockSum[b];
    const startOfLastBlock = blockRight * this.blockSize;
    for (let i = startOfLastBlock; i < right; i++) res += this.arr[i];
    return res;
  }
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

class SqrtDecomposition {
public:
    explicit SqrtDecomposition(const std::vector<long long>& arr) : arr(arr) {
        n = static_cast<int>(arr.size());
        blockSize = n > 0 ? std::max(1, static_cast<int>(std::ceil(std::sqrt(static_cast<double>(n))))) : 1;
        int numBlocks = (n + blockSize - 1) / blockSize;
        blockSum.assign(numBlocks, 0);
        for (int i = 0; i < n; i++) {
            blockSum[i / blockSize] += arr[i];
        }
    }

    void update(int index, long long value) {
        int block = index / blockSize;
        blockSum[block] += value - arr[index];
        arr[index] = value;
    }

    long long query(int left, int right) const {  // [left, right)
        long long res = 0;
        int blockLeft = left / blockSize;
        int blockRight = (right - 1) / blockSize;
        if (blockLeft == blockRight) {
            for (int i = left; i < right; i++) res += arr[i];
            return res;
        }
        int endOfFirstBlock = (blockLeft + 1) * blockSize;
        for (int i = left; i < endOfFirstBlock; i++) res += arr[i];
        for (int b = blockLeft + 1; b < blockRight; b++) res += blockSum[b];
        int startOfLastBlock = blockRight * blockSize;
        for (int i = startOfLastBlock; i < right; i++) res += arr[i];
        return res;
    }

private:
    int n;
    int blockSize;
    std::vector<long long> arr;
    std::vector<long long> blockSum;
};
```

```rust
struct SqrtDecomposition {
    block_size: usize,
    arr: Vec<i64>,
    block_sum: Vec<i64>,
}

impl SqrtDecomposition {
    fn new(arr: &[i64]) -> Self {
        let n = arr.len();
        let block_size = if n > 0 { ((n as f64).sqrt().ceil() as usize).max(1) } else { 1 };
        let num_blocks = (n + block_size - 1) / block_size;
        let mut block_sum = vec![0i64; num_blocks];
        for (i, &v) in arr.iter().enumerate() {
            block_sum[i / block_size] += v;
        }
        SqrtDecomposition { block_size, arr: arr.to_vec(), block_sum }
    }

    fn update(&mut self, index: usize, value: i64) {
        let block = index / self.block_size;
        self.block_sum[block] += value - self.arr[index];
        self.arr[index] = value;
    }

    fn query(&self, left: usize, right: usize) -> i64 {
        // [left, right) の区間和
        let mut res = 0i64;
        let block_left = left / self.block_size;
        let block_right = (right - 1) / self.block_size;
        if block_left == block_right {
            for i in left..right {
                res += self.arr[i];
            }
            return res;
        }
        let end_of_first_block = (block_left + 1) * self.block_size;
        for i in left..end_of_first_block {
            res += self.arr[i];
        }
        for b in (block_left + 1)..block_right {
            res += self.block_sum[b];
        }
        let start_of_last_block = block_right * self.block_size;
        for i in start_of_last_block..right {
            res += self.arr[i];
        }
        res
    }
}
```

```csharp
class SqrtDecomposition
{
    private readonly int blockSize;
    private readonly long[] arr;
    private readonly long[] blockSum;

    public SqrtDecomposition(long[] arr)
    {
        int n = arr.Length;
        this.arr = (long[])arr.Clone();
        blockSize = n > 0 ? Math.Max(1, (int)Math.Ceiling(Math.Sqrt(n))) : 1;
        int numBlocks = (n + blockSize - 1) / blockSize;
        blockSum = new long[numBlocks];
        for (int i = 0; i < n; i++) blockSum[i / blockSize] += this.arr[i];
    }

    public void Update(int index, long value)
    {
        int block = index / blockSize;
        blockSum[block] += value - arr[index];
        arr[index] = value;
    }

    public long Query(int left, int right)  // [left, right)
    {
        long res = 0;
        int blockLeft = left / blockSize;
        int blockRight = (right - 1) / blockSize;
        if (blockLeft == blockRight)
        {
            for (int i = left; i < right; i++) res += arr[i];
            return res;
        }
        int endOfFirstBlock = (blockLeft + 1) * blockSize;
        for (int i = left; i < endOfFirstBlock; i++) res += arr[i];
        for (int b = blockLeft + 1; b < blockRight; b++) res += blockSum[b];
        int startOfLastBlock = blockRight * blockSize;
        for (int i = startOfLastBlock; i < right; i++) res += arr[i];
        return res;
    }
}
```
