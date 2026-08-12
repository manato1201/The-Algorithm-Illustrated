---
name: キャンディ配布問題(2パス貪欲法)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n)
summary: 「評価値が高い子供は、隣接するより評価値の低い子供より多くキャンディをもらう」という制約を、左から右への走査と右から左への走査という2回の一方向貪欲法に分解し、それぞれの結果の最大値を取ることで満たす、最小総配布数を求める問題。
---

## 概要

一列に並んだ子供たちにキャンディを配る際、「各子供は最低1個は受け取る」「隣同士で評価値(成績など)が高い方が、隣より多くのキャンディを受け取る」という制約のもとで、**配るキャンディの総数を最小化**したい、という問題を考える。この制約は左右**両方向**の隣接関係に同時に依存するため、一度の走査だけでは正しく解けないように見えるが、実は「左から右への制約」と「右から左への制約」を**別々の貪欲法で独立に解いてから、各子供についてその2つの結果の大きい方を採用する**、という2パスの分解によって、O(n)で正確に最小解が求まる。制約が双方向に絡み合う問題を、方向ごとに分解して貪欲法を適用するという典型的なテクニックを学べる好例である。

## 仕組み

1. 各子供に、まず1個ずつキャンディを割り当てる(`candies[i] = 1`で初期化)
2. **左から右への走査(第1パス)**: `i=1`から`n-1`まで順に見ていき、「`ratings[i] > ratings[i-1]`(自分の方が評価が高い)ならば、`candies[i] = candies[i-1] + 1`にする」というルールを適用する。これにより、**左隣より評価が高い場合の制約**だけが正しく満たされる
3. **右から左への走査(第2パス)**: `i=n-2`から`0`まで逆順に見ていき、「`ratings[i] > ratings[i+1]`(自分の方が評価が高い)ならば、`candies[i] = max(candies[i], candies[i+1] + 1)`にする」というルールを適用する。これにより、**右隣より評価が高い場合の制約**も満たされる(`max`を取ることで、第1パスで既に満たされていた左側の制約を壊さないようにする)
4. 2回のパスが終わった時点で、全ての子供について「左右どちらの隣接者と比べても、評価が高ければキャンディも多い」という制約が同時に満たされている
5. 全員の`candies[i]`の合計が、求める最小配布数となる

## 特性・トレードオフ

- **双方向の制約を単方向の貪欲法2回に分解する発想**: 一見すると「左右両方を同時に見ながら」解く必要がありそうな問題を、「まず左方向の制約だけを満たす」「次に右方向の制約を、既存の解を壊さないよう`max`で統合しながら満たす」という2段階に分解することで、それぞれは単純な貪欲法(前の要素だけを見ればよい)で解けるようになる。この「制約を方向ごとに分解し、後から`max`や`min`で統合する」という考え方は、他の似た構造を持つ問題(例えば[トラップ雨水問題](/algorithms/two-pointers-sliding-window)のような左右の最大値を使う問題)にも応用が利く汎用的なパターンである
- **各パスの貪欲選択の正当性**: 第1パスでは「左隣より評価が高いなら、左隣+1個にする」という選択が、その時点で得られる制約を満たす最小の値であることが直感的に分かる。第2パスで`max`を取る操作も、「既に確定した左方向の制約を壊さずに、右方向の制約も追加で満たす最小の値」を選んでいることに相当し、局所的な貪欲選択の積み重ねが全体の最適解に一致することが保証される
- **O(n)という効率性**: 2回の線形走査だけで解けるため、子供の人数`n`に対して非常に効率的に最小配布数を計算できる。同じ制約を満たすキャンディの割り当てを動的計画法で素朴に求めようとすると、双方向の依存関係のためにより複雑な定式化が必要になるが、2パス貪欲法はそれをシンプルに回避している
- **使いどころ**: 競技プログラミングにおける「隣接制約を持つ最小化問題」の典型パターン、ゲームのリソース配分(隣接するプレイヤー・ユニット間の相対的な強さに応じた資源割り当て)、報酬・給与制度における相対評価に基づく最小限の差別化配分の設計

## 実装例

```python
def candy_distribution(ratings: list[int]) -> int:
    n = len(ratings)
    candies = [1] * n

    for i in range(1, n):
        if ratings[i] > ratings[i - 1]:
            candies[i] = candies[i - 1] + 1

    for i in range(n - 2, -1, -1):
        if ratings[i] > ratings[i + 1]:
            candies[i] = max(candies[i], candies[i + 1] + 1)

    return sum(candies)
```

```typescript
function candyDistribution(ratings: number[]): number {
  const n = ratings.length;
  const candies = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
  }

  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1])
      candies[i] = Math.max(candies[i], candies[i + 1] + 1);
  }

  return candies.reduce((a, b) => a + b, 0);
}
```

```cpp
#include <vector>
#include <algorithm>
#include <numeric>

int candyDistribution(const std::vector<int>& ratings) {
    int n = static_cast<int>(ratings.size());
    std::vector<int> candies(n, 1);

    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
    }

    for (int i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) candies[i] = std::max(candies[i], candies[i + 1] + 1);
    }

    return std::accumulate(candies.begin(), candies.end(), 0);
}
```

```rust
fn candy_distribution(ratings: &[i32]) -> i32 {
    let n = ratings.len();
    let mut candies = vec![1; n];

    for i in 1..n {
        if ratings[i] > ratings[i - 1] {
            candies[i] = candies[i - 1] + 1;
        }
    }

    for i in (0..n - 1).rev() {
        if ratings[i] > ratings[i + 1] {
            candies[i] = candies[i].max(candies[i + 1] + 1);
        }
    }

    candies.iter().sum()
}
```

```csharp
static int CandyDistribution(int[] ratings)
{
    int n = ratings.Length;
    var candies = new int[n];
    Array.Fill(candies, 1);

    for (int i = 1; i < n; i++)
    {
        if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
    }

    for (int i = n - 2; i >= 0; i--)
    {
        if (ratings[i] > ratings[i + 1]) candies[i] = Math.Max(candies[i], candies[i + 1] + 1);
    }

    return candies.Sum();
}
```
