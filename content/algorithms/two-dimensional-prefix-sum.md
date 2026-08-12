---
name: 二次元累積和(2D Prefix Sum)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(nm)(前処理)、O(1)(1回の矩形クエリあたり)
summary: 2次元グリッドに対して包除原理に基づく累積和テーブルを前計算しておくことで、任意の矩形領域の総和をO(1)で求められるようにする、1次元累積和の二次元への拡張。
---

## 概要

1次元配列における累積和(`S[i] = a[0] + a[1] + ... + a[i-1]`)を使えば、任意の区間`[l, r)`の和が`S[r] - S[l]`というO(1)の引き算だけで求まる。この発想を2次元グリッドに拡張したのが二次元累積和である。`n × m`のグリッドに対して「原点から`(i, j)`までの矩形領域の総和」を表すテーブル`S`を前計算しておけば、以降どんな矩形領域`(r1, c1)`〜`(r2, c2)`の総和を問われても、**包除原理(inclusion-exclusion principle)に基づく4点の足し引き**だけでO(1)で答えられる。競技プログラミングにおける「2次元累積和(2D Prefix Sum)」というテクニック名は、画像処理分野で同じ考え方を指す「積分画像([Summed-Area Table](/algorithms/integral-image))」とほぼ同一の技法である。

## 仕組み

1. **累積和テーブルの構築**: `S[i][j]`を「グリッドの`[0, i) × [0, j)`部分の総和」と定義し、以下の漸化式でO(nm)で埋める(1行目・1列目は番兵として0で初期化しておくと境界処理が楽になる):
   `S[i][j] = S[i-1][j] + S[i][j-1] - S[i-1][j-1] + grid[i-1][j-1]`
   これは「上の矩形」と「左の矩形」を足すと左上の共通部分`S[i-1][j-1]`が二重に数えられるため、それを1回分引く、という包除原理そのものである
2. **矩形和クエリ**: 行`[r1, r2)`・列`[c1, c2)`の矩形領域の総和は、同じく包除原理で
   `sum = S[r2][c2] - S[r1][c2] - S[r2][c1] + S[r1][c1]`
   と計算できる。直感的には「原点からr2,c2までの大きな矩形」から「上のはみ出し」と「左のはみ出し」を引き、左上の角を二重に引きすぎた分を1回分足し戻す操作になる
3. **クエリの計算量**: テーブル`S`さえ構築してあれば、以降のクエリは矩形の4隅の値を参照するだけのO(1)で完結する

## 特性・トレードオフ

- **静的なグリッド専用**: 二次元累積和はグリッドの値が変化しないことを前提とする前処理である。値の更新(点更新・矩形更新)が発生する場合はテーブル全体をO(nm)で再構築する必要があり、非効率になる。更新も扱いたい場合は2次元[Fenwick木(BIT)](/algorithms/fenwick-tree)を使えば、点更新・矩形和クエリの両方をO(log n log m)で処理できる
- **[いもす法](/algorithms/imos-method)との対比**: いもす法(2次元版)は「多数の矩形領域への加算クエリ」を差分配列でO(1)償却に落とし、最後に2回の累積和で復元する、いわば「区間更新」に特化した手法。二次元累積和は逆に「区間の参照(読み取り)」に特化しており、両者は「更新はいもす法・参照は累積和」という形でしばしば組み合わせて使われる
- **[座標圧縮](/algorithms/coordinate-compression)との相性**: グリッドが疎で、実際に値が存在する座標の値域が大きい場合(例えば`10^9`四方の平面上に`10^5`個の点だけがある)は、そのまま二次元累積和テーブルを確保すると現実的でないメモリ量になる。事前に座標圧縮でx座標・y座標をそれぞれ0-indexedの順位に落としてから累積和テーブルを構築することで、実際に必要なサイズだけに抑えられる
- **使いどころ**: 画像処理での矩形領域の平均値・分散の高速計算([積分画像](/algorithms/integral-image)、Haar-likeフィーチャー)、ゲームマップ上の範囲効果(範囲攻撃・バフの重なり)の事前集計、行列の部分和クエリを大量に処理する競技プログラミングの問題、2次元のヒートマップ集計

## 実装例

```python
class PrefixSum2D:
    def __init__(self, grid: list[list[int]]) -> None:
        n, m = len(grid), len(grid[0]) if grid else 0
        self.s = [[0] * (m + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                self.s[i][j] = (
                    self.s[i - 1][j]
                    + self.s[i][j - 1]
                    - self.s[i - 1][j - 1]
                    + grid[i - 1][j - 1]
                )

    def query(self, r1: int, c1: int, r2: int, c2: int) -> int:
        """行区間[r1, r2)・列区間[c1, c2)の矩形和を返す。"""
        return (
            self.s[r2][c2]
            - self.s[r1][c2]
            - self.s[r2][c1]
            + self.s[r1][c1]
        )
```

```typescript
class PrefixSum2D {
  private s: number[][];

  constructor(grid: number[][]) {
    const n = grid.length;
    const m = n > 0 ? grid[0].length : 0;
    this.s = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        this.s[i][j] =
          this.s[i - 1][j] -
          this.s[i - 1][j - 1] +
          this.s[i][j - 1] +
          grid[i - 1][j - 1];
      }
    }
  }

  query(r1: number, c1: number, r2: number, c2: number): number {
    // 行区間[r1, r2)・列区間[c1, c2)の矩形和
    return this.s[r2][c2] - this.s[r1][c2] - this.s[r2][c1] + this.s[r1][c1];
  }
}
```

```cpp
#include <vector>

class PrefixSum2D {
public:
    explicit PrefixSum2D(const std::vector<std::vector<long long>>& grid) {
        int n = (int)grid.size();
        int m = n > 0 ? (int)grid[0].size() : 0;
        s.assign(n + 1, std::vector<long long>(m + 1, 0));
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                s[i][j] = s[i - 1][j] + s[i][j - 1] - s[i - 1][j - 1] + grid[i - 1][j - 1];
            }
        }
    }

    long long query(int r1, int c1, int r2, int c2) const {
        return s[r2][c2] - s[r1][c2] - s[r2][c1] + s[r1][c1];
    }

private:
    std::vector<std::vector<long long>> s;
};
```

```rust
struct PrefixSum2D {
    s: Vec<Vec<i64>>,
}

impl PrefixSum2D {
    fn new(grid: &[Vec<i64>]) -> Self {
        let n = grid.len();
        let m = if n > 0 { grid[0].len() } else { 0 };
        let mut s = vec![vec![0i64; m + 1]; n + 1];
        for i in 1..=n {
            for j in 1..=m {
                s[i][j] = s[i - 1][j] + s[i][j - 1] - s[i - 1][j - 1] + grid[i - 1][j - 1];
            }
        }
        PrefixSum2D { s }
    }

    fn query(&self, r1: usize, c1: usize, r2: usize, c2: usize) -> i64 {
        self.s[r2][c2] - self.s[r1][c2] - self.s[r2][c1] + self.s[r1][c1]
    }
}
```

```csharp
class PrefixSum2D
{
    readonly long[][] s;

    public PrefixSum2D(long[][] grid)
    {
        int n = grid.Length;
        int m = n > 0 ? grid[0].Length : 0;
        s = new long[n + 1][];
        for (int i = 0; i <= n; i++) s[i] = new long[m + 1];

        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                s[i][j] = s[i - 1][j] + s[i][j - 1] - s[i - 1][j - 1] + grid[i - 1][j - 1];
    }

    public long Query(int r1, int c1, int r2, int c2)
    {
        return s[r2][c2] - s[r1][c2] - s[r2][c1] + s[r1][c1];
    }
}
```
