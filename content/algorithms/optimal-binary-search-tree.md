---
name: 最適二分探索木(Optimal BST)
category: 動的計画法
subcategory: 区間分割DP
complexity: O(n³)(素朴な区間DP)、O(n²)(Knuthの単調性最適化を使う場合)
summary: 各キーの検索頻度が分かっているとき、検索の期待コスト(平均比較回数)が最小になるように二分探索木の形を組み立てる問題で、行列連鎖乗算と同じ「区間分割DP」の枠組みで解ける古典的な問題。
---

## 概要

通常の[二分探索木](/algorithms/binary-search-tree)は、どのキーも平等に検索されることを前提に構築されるが、実際のアプリケーションでは特定のキーが他よりずっと頻繁に検索されることが多い(例えば辞書アプリで"the"や"a"のような単語は"xylophone"よりずっと検索されやすい)。最適二分探索木問題は、各キーの検索頻度(または検索確率)があらかじめ分かっているとき、頻繁に検索されるキーを木の浅い場所に配置することで、検索1回あたりの期待コスト(ルートからそのキーまでの深さ×検索確率の総和)を最小化する木の形を求める。この問題は、[行列連鎖乗算問題](/algorithms/matrix-chain-multiplication)と全く同じ「どこで区間を分割するのが最適か」という区間分割DPの枠組みで解ける、構造的に美しい対応関係を持つ古典的な問題である。

## 仕組み

1. キー`k1 < k2 < ... < kn`とそれぞれの検索頻度`p1, ..., pn`が与えられているとする
2. `cost[i][j]`を「キー`ki`から`kj`までを含む部分木を最適に構成した場合の期待コスト」とする2次元テーブルを用意する
3. 区間`[i, j]`内のどのキー`kr`(`i ≤ r ≤ j`)をこの部分木のルートに選ぶかを全通り試す——`kr`をルートに選んだ場合、左部分木は`[i, r-1]`、右部分木は`[r+1, j]`となり、コストは`cost[i][r-1] + cost[r+1][j] + sum(p[i..j])`(ルートを選ぶことで区間内の全キーの深さが1ずつ増えるため、区間の頻度合計を加算する)になる
4. 全ての`r`についてこのコストを計算し、最小になる`r`を選んで`cost[i][j]`を確定させる——これは[行列連鎖乗算問題](/algorithms/matrix-chain-multiplication)の「どこで行列の掛け算の区切りを入れるか」を全通り試す構造と全く同一である
5. 区間の長さが短いものから長いものへ順にテーブルを埋めていき、最終的に`cost[1][n]`(全キーを含む区間)が答えになる。どの`r`が選ばれたかを記録しておけば、最適な木の形自体も再構築できる

## 特性・トレードオフ

- **計算量**: 素朴な実装では、区間の数が`O(n²)`、各区間でルート候補を試すのに`O(n)`かかるため全体で`O(n³)`。[行列連鎖乗算問題](/algorithms/matrix-chain-multiplication)と全く同じ計算量になる
- **Knuthの単調性最適化**: 「最適なルート`r`の位置は、区間`[i,j]`が広がるにつれて単調に動く」という性質(Knuth's optimal BST の単調性)を利用すると、各区間でのルート探索範囲を絞り込めて全体を`O(n²)`まで改善できる——動的計画法における「範囲を絞り込む最適化」の代表例として知られる高度な技法
- **[行列連鎖乗算](/algorithms/matrix-chain-multiplication)との構造的同型性**: 両者とも「区間`[i,j]`をどこで2つに分割するのが最適か」を全通り試す区間分割DPであり、片方の解法パターンを理解すればもう片方も同じ枠組みで解ける——区間分割DPという一つの「型」の異なる応用例として並べて学ぶと理解が深まる
- **使いどころ**: 検索頻度に偏りがある辞書・データベースインデックスの構築、ハフマン符号化に似た「頻度に応じた最適配置」問題全般、コンパイラの構文解析表の最適化(頻出トークンの判定を高速化する)

## 実装例

```python
def optimal_bst(keys: list[int], freq: list[float]) -> float:
    n = len(keys)
    cost = [[0.0] * n for _ in range(n)]
    for i in range(n):
        cost[i][i] = freq[i]
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            total = sum(freq[i : j + 1])
            best = float("inf")
            for r in range(i, j + 1):  # ルート候補rを全て試す
                left = cost[i][r - 1] if r > i else 0.0
                right = cost[r + 1][j] if r < j else 0.0
                best = min(best, left + right + total)
            cost[i][j] = best
    return cost[0][n - 1]


# 例: keys=[10, 12, 20], freq=[34, 8, 50] -> 最小期待コスト 142 (GeeksforGeeksの定番例)
```

```typescript
function optimalBst(keys: number[], freq: number[]): number {
  const n = keys.length;
  const cost: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) cost[i][i] = freq[i];
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      let total = 0;
      for (let k = i; k <= j; k++) total += freq[k];
      let best = Infinity;
      for (let r = i; r <= j; r++) {
        const left = r > i ? cost[i][r - 1] : 0;
        const right = r < j ? cost[r + 1][j] : 0;
        best = Math.min(best, left + right + total);
      }
      cost[i][j] = best;
    }
  }
  return cost[0][n - 1];
}
```

```cpp
#include <vector>
#include <limits>
#include <algorithm>

double optimalBst(const std::vector<int>& keys, const std::vector<double>& freq) {
    int n = static_cast<int>(keys.size());
    std::vector<std::vector<double>> cost(n, std::vector<double>(n, 0.0));
    for (int i = 0; i < n; i++) cost[i][i] = freq[i];
    for (int length = 2; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            double total = 0.0;
            for (int k = i; k <= j; k++) total += freq[k];
            double best = std::numeric_limits<double>::infinity();
            for (int r = i; r <= j; r++) {
                double left = (r > i) ? cost[i][r - 1] : 0.0;
                double right = (r < j) ? cost[r + 1][j] : 0.0;
                best = std::min(best, left + right + total);
            }
            cost[i][j] = best;
        }
    }
    return cost[0][n - 1];
}
```

```rust
fn optimal_bst(keys: &[i32], freq: &[f64]) -> f64 {
    let n = keys.len();
    let mut cost = vec![vec![0.0; n]; n];
    for i in 0..n {
        cost[i][i] = freq[i];
    }
    for length in 2..=n {
        for i in 0..=(n - length) {
            let j = i + length - 1;
            let total: f64 = freq[i..=j].iter().sum();
            let mut best = f64::INFINITY;
            for r in i..=j {
                let left = if r > i { cost[i][r - 1] } else { 0.0 };
                let right = if r < j { cost[r + 1][j] } else { 0.0 };
                best = best.min(left + right + total);
            }
            cost[i][j] = best;
        }
    }
    cost[0][n - 1]
}
```

```csharp
static double OptimalBst(int[] keys, double[] freq)
{
    int n = keys.Length;
    var cost = new double[n, n];
    for (int i = 0; i < n; i++) cost[i, i] = freq[i];
    for (int length = 2; length <= n; length++)
    {
        for (int i = 0; i <= n - length; i++)
        {
            int j = i + length - 1;
            double total = 0;
            for (int k = i; k <= j; k++) total += freq[k];
            double best = double.MaxValue;
            for (int r = i; r <= j; r++)
            {
                double left = r > i ? cost[i, r - 1] : 0;
                double right = r < j ? cost[r + 1, j] : 0;
                best = Math.Min(best, left + right + total);
            }
            cost[i, j] = best;
        }
    }
    return cost[0, n - 1];
}
```
