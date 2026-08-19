---
name: 最大部分行列和問題(2次元版Kadane法)
category: 動的計画法
subcategory: ナップサック・組合せ最適化
complexity: O(rows² × cols)
summary: 行の範囲を全通り固定し、列方向の累積和に1次元のKadaneのアルゴリズムを適用することで、和が最大になる矩形領域を求める。
---

## 概要

正負の値が混在する2次元配列(行列)の中から、**和が最大になる矩形の部分領域(部分行列)**を見つける問題。1次元配列における「和が最大になる連続部分列」を求める[Kadaneのアルゴリズム](/algorithms/kadane)の自然な拡張にあたり、画像処理における「最も明るい(または特徴的な)矩形領域の検出」や、2次元データの中から「最も効果の高い範囲」を探す分析など、応用範囲は幅広い。素朴に全ての矩形候補を試すとO(rows²×cols²)以上かかるが、行の固定と1次元Kadane法を組み合わせることでO(rows²×cols)まで落とし込めるのがこの手法の要点である。

## 仕組み

**ステップ1: 問題を「行の範囲を固定した1次元問題」に分解する**

もし「上端の行`top`」と「下端の行`bottom`」があらかじめ決まっていれば、その範囲に含まれる部分行列の和が最大になる列の範囲を求める問題は、**各列について`top`行から`bottom`行までの値を合計した1次元配列に対して、通常の(1次元の)Kadaneのアルゴリズムを適用するだけ**で解ける。つまり2次元の問題が1次元の問題に帰着する。

**ステップ2: 行の範囲を全パターン試す**

1. 上端の行`top`を0からrows-1まで全通り試す
2. 各`top`について、下端の行`bottom`を`top`からrows-1まで全通り試す
3. `top`から`bottom`までの行の値を列ごとに合計した1次元配列`colSum`を作る(`bottom`を1つ増やすたびに、その行の値を`colSum`に加算していくだけで済み、毎回作り直す必要はない)
4. `colSum`に対して1次元のKadaneのアルゴリズムを適用し、その`(top, bottom)`の組み合わせにおける最大の部分列和を求める
5. 全ての`(top, bottom)`の組み合わせの中で最大だったものが、2次元の最大部分行列和になる

「行の範囲をO(rows²)通り全て試し、その都度O(cols)のKadane法を1回適用する」という構造により、全体の計算量はO(rows²×cols)に収まる。愚直に矩形の4隅(上端・下端・左端・右端)を全通り試すO(rows²×cols²)に比べ、**1次元Kadane法が「左端・右端の組み合わせ探索」をO(cols)まで一気に圧縮している**点が高速化の核心である。

## 特性・トレードオフ

- **計算量**: O(rows²×cols)(rows≤colsとなるよう転置しておけば、実質O(min(rows,cols)²×max(rows,cols))まで抑えられる)。矩形の4隅を総当たりするO(rows²×cols²)に比べて1次元分の探索がKadane法によって線形時間に圧縮されている
- **1次元Kadane法への正しい帰着が鍵**: 「行の範囲を固定すれば列方向の1次元問題になる」という観察こそがこの手法の本質であり、DPというよりも「累積和+貪欲法(Kadane法)」の組み合わせと捉えることもできる。とはいえ、部分問題(行の範囲ごとの最良解)を再利用しながら全体最適を組み立てるという発想はDP的でもあり、動的計画法の応用例として扱われることが多い
- **さらなる高速化の限界**: rowsとcolsの少なくとも一方に対して2乗のオーダーは避けがたく、より高速な(劣二次の)一般解法は知られていない。実務上はrows(またはcols)が小さい場合にこの手法が特に有効
- **1次元Kadane法との関係**: 1次元のKadaneのアルゴリズム([kadane](/algorithms/kadane))は「今までの累積和が負になったら、そこで区間をリセットする」という貪欲な戦略でO(n)を実現するが、2次元版はこの1次元アルゴリズムを「部分問題を解く道具」としてO(rows²)回呼び出す構造になっている
- **使いどころ**: 画像・センサーデータの中から最も特徴的な矩形領域を検出する、2次元の収益・コストマップから最も利益の高い範囲を特定する、ゲームのマップデータから特定の条件を満たす最大の領域を探すなど

## 実装例

```python
def max_submatrix_sum(matrix: list[list[int]]) -> int:
    rows = len(matrix)
    cols = len(matrix[0])
    best = float("-inf")

    for top in range(rows):
        col_sum = [0] * cols
        for bottom in range(top, rows):
            for c in range(cols):
                col_sum[c] += matrix[bottom][c]

            # 1次元Kadane法をcol_sumに適用する
            current = 0
            for value in col_sum:
                current = max(value, current + value)
                best = max(best, current)

    return best
```

```typescript
function maxSubmatrixSum(matrix: number[][]): number {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let best = -Infinity;

  for (let top = 0; top < rows; top++) {
    const colSum = new Array(cols).fill(0);
    for (let bottom = top; bottom < rows; bottom++) {
      for (let c = 0; c < cols; c++) {
        colSum[c] += matrix[bottom][c];
      }

      // 1次元Kadane法をcolSumに適用する
      let current = 0;
      for (const value of colSum) {
        current = Math.max(value, current + value);
        best = Math.max(best, current);
      }
    }
  }

  return best;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <limits>

long long maxSubmatrixSum(const std::vector<std::vector<int>>& matrix) {
    int rows = static_cast<int>(matrix.size());
    int cols = static_cast<int>(matrix[0].size());
    long long best = std::numeric_limits<long long>::min();

    for (int top = 0; top < rows; top++) {
        std::vector<long long> colSum(cols, 0);
        for (int bottom = top; bottom < rows; bottom++) {
            for (int c = 0; c < cols; c++) {
                colSum[c] += matrix[bottom][c];
            }

            long long current = 0;
            for (long long value : colSum) {
                current = std::max(value, current + value);
                best = std::max(best, current);
            }
        }
    }

    return best;
}
```

```rust
fn max_submatrix_sum(matrix: &[Vec<i64>]) -> i64 {
    let rows = matrix.len();
    let cols = matrix[0].len();
    let mut best = i64::MIN;

    for top in 0..rows {
        let mut col_sum = vec![0i64; cols];
        for bottom in top..rows {
            for c in 0..cols {
                col_sum[c] += matrix[bottom][c];
            }

            let mut current = 0i64;
            for &value in &col_sum {
                current = value.max(current + value);
                best = best.max(current);
            }
        }
    }

    best
}
```

```csharp
static class MaxSubmatrix
{
    public static long MaxSubmatrixSum(int[][] matrix)
    {
        int rows = matrix.Length;
        int cols = matrix[0].Length;
        long best = long.MinValue;

        for (int top = 0; top < rows; top++)
        {
            var colSum = new long[cols];
            for (int bottom = top; bottom < rows; bottom++)
            {
                for (int c = 0; c < cols; c++)
                {
                    colSum[c] += matrix[bottom][c];
                }

                long current = 0;
                foreach (var value in colSum)
                {
                    current = Math.Max(value, current + value);
                    best = Math.Max(best, current);
                }
            }
        }

        return best;
    }
}
```
