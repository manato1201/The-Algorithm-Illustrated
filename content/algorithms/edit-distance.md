---
name: 編集距離(レーベンシュタイン距離)
category: 動的計画法
subcategory: 数列・部分列
complexity: O(nm)
summary: 挿入・削除・置換の最小回数で2つの文字列の近さを測る。
---

## 概要

ある文字列を別の文字列に変形するために必要な、「1文字の挿入」「1文字の削除」「1文字の置換」の最小回数を求める問題。スペルチェッカーが「もしかして"apple"?」と提案する仕組みや、DNA配列の変異を測る手法など、「2つの系列がどれだけ近いか」を定量化する場面で幅広く使われている。1965年にウラジミール・レーベンシュタインが定式化したことからこの名がついた。

## 仕組み

`dp[i][j]` を「1つ目の文字列の先頭i文字を、2つ目の文字列の先頭j文字に変形するのに必要な最小操作回数」と定義する。

1. `dp[0][j] = j`(空文字列からj文字の文字列を作るにはj回の挿入が必要)、`dp[i][0] = i`(同様にi回の削除が必要)で初期化する
2. i文字目とj文字目が**一致すれば**、その文字は操作不要なので `dp[i][j] = dp[i-1][j-1]`
3. **一致しなければ**、次の3つの操作のうち最小のものを選ぶ:
   - 置換: `dp[i-1][j-1] + 1`(i文字目をj文字目に置き換える)
   - 削除: `dp[i-1][j] + 1`(i文字目を削除する)
   - 挿入: `dp[i][j-1] + 1`(j文字目を挿入する)
4. 表の右下 `dp[n][m]` が最終的な編集距離になる

LCS(最長共通部分列)が「一致した部分をどれだけ残せるか」に注目するのに対し、編集距離は「一致しない部分をどれだけ直す必要があるか」に注目する、いわば表裏の関係にある問題と言える。

## 特性・トレードオフ

- **計算量**: O(nm)。LCSと同じ「2次元の表を埋める」骨格を持つ
- **メモリ**: 距離の値だけが必要であれば、直前の1行だけを保持するO(min(n,m))まで圧縮できる。実際の編集操作の列を復元したい場合は表全体が必要
- **応用範囲**: スペルチェック・入力補完(タイプミスを検出し近い単語を提案する)、DNA配列のアラインメント、`diff`ツールの内部処理、あいまい検索(ある単語に近い単語をデータベースから探す)など
- **重み付き編集距離**: 挿入・削除・置換のコストを全て1とするのが基本形だが、実用上は「置換の方が挿入より起きやすい」といった重み付けをして精度を上げることもある

## 実装例

```python
def edit_distance(a: str, b: str) -> int:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]
```

```typescript
function editDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

int editDistance(const std::string& a, const std::string& b) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + std::min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]});
            }
        }
    }
    return dp[n][m];
}
```

```rust
fn edit_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let n = a.len();
    let m = b.len();
    let mut dp = vec![vec![0usize; m + 1]; n + 1];
    for i in 0..=n {
        dp[i][0] = i;
    }
    for j in 0..=m {
        dp[0][j] = j;
    }
    for i in 1..=n {
        for j in 1..=m {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + dp[i - 1][j - 1].min(dp[i - 1][j]).min(dp[i][j - 1]);
            }
        }
    }
    dp[n][m]
}
```

```csharp
static int EditDistance(string a, string b)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i;
    for (int j = 0; j <= m; j++) dp[0, j] = j;
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            if (a[i - 1] == b[j - 1])
            {
                dp[i, j] = dp[i - 1, j - 1];
            }
            else
            {
                dp[i, j] = 1 + Math.Min(dp[i - 1, j - 1], Math.Min(dp[i - 1, j], dp[i, j - 1]));
            }
        }
    }
    return dp[n, m];
}
```
