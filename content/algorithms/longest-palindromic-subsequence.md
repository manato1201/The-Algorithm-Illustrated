---
name: 最長回文部分列
category: 動的計画法
subcategory: 数列・部分列
complexity: O(n²)
summary: 文字列を反転したものとのLCSとして解ける、DPの応用力を示す好例。
---

## 概要

ある文字列から、順序を保ったまま(連続していなくてよい)要素を取り出して作れる「前から読んでも後ろから読んでも同じになる並び(回文)」のうち、最も長いものを求める問題。例えば "BBABCBCAB" の最長回文部分列は "BABCBAB"(長さ7)。一見新しい問題に見えるが、既に知っている道具(LCS)を使って驚くほどあっさり解けてしまう、DPの応用力を実感できる好例。

## 仕組み

**発想の転換が鍵**: ある文字列Sの最長回文部分列は、**Sと、Sを反転した文字列の最長共通部分列(LCS)に等しい**。なぜなら、回文は前から読んでも後ろから読んでも同じであり、「Sの中の回文部分列」と「Sを反転したものの中の同じ部分列」は必ず一致するため。

1. 元の文字列Sを反転した文字列Rを作る
2. SとRに対して、通常のLCS(最長共通部分列)のDPをそのまま適用する
3. 求まったLCSの長さが、Sの最長回文部分列の長さと一致する

もちろん、直接 `dp[i][j]` を「文字列の区間[i, j]における最長回文部分列の長さ」と定義し、区間DPとして解く方法もある(両端の文字が一致すれば `dp[i+1][j-1] + 2`、一致しなければ `max(dp[i+1][j], dp[i][j-1])`)。どちらの解法も本質的には同じ発想に行き着く。

## 特性・トレードオフ

- **計算量**: LCS経由・区間DP直接のどちらもO(n²)
- **「知っている問題への帰着」という考え方**: 新しい問題に出会ったとき、それを既知の問題(この場合はLCS)に変換できないかを考える、というアルゴリズム設計の重要な思考法をこの問題は象徴している
- **最長回文部分文字列との違い**: 部分列は連続していなくてよいのに対し、部分文字列は連続していなければならない(こちらはManacherのアルゴリズムでO(n)で解ける、別の問題)
- **使いどころ**: DNA配列における回文構造(制限酵素の認識部位など)の検出、文字列処理の理論的な土台として、直接の実務応用よりも「DPの考え方を鍛える教材」としての価値が大きい

## 実装例

```python
def lps_length(s: str) -> int:
    n = len(s)
    if n == 0:
        return 0
    dp = [[0] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        dp[i][i] = 1
        for j in range(i + 1, n):
            if s[i] == s[j]:
                dp[i][j] = (dp[i + 1][j - 1] if i + 1 <= j - 1 else 0) + 2
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return dp[0][n - 1]
```

```typescript
function lpsLength(s: string): number {
  const n = s.length;
  if (n === 0) return 0;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    dp[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      if (s[i] === s[j]) {
        dp[i][j] = (i + 1 <= j - 1 ? dp[i + 1][j - 1] : 0) + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[0][n - 1];
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

int lpsLength(const std::string& s) {
    int n = static_cast<int>(s.size());
    if (n == 0) return 0;
    std::vector<std::vector<int>> dp(n, std::vector<int>(n, 0));
    for (int i = n - 1; i >= 0; i--) {
        dp[i][i] = 1;
        for (int j = i + 1; j < n; j++) {
            if (s[i] == s[j]) {
                dp[i][j] = (i + 1 <= j - 1 ? dp[i + 1][j - 1] : 0) + 2;
            } else {
                dp[i][j] = std::max(dp[i + 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[0][n - 1];
}
```

```rust
fn lps_length(s: &str) -> usize {
    let chars: Vec<char> = s.chars().collect();
    let n = chars.len();
    if n == 0 {
        return 0;
    }
    let mut dp = vec![vec![0usize; n]; n];
    for i in (0..n).rev() {
        dp[i][i] = 1;
        for j in (i + 1)..n {
            if chars[i] == chars[j] {
                let inner = if j - i >= 2 { dp[i + 1][j - 1] } else { 0 };
                dp[i][j] = inner + 2;
            } else {
                dp[i][j] = dp[i + 1][j].max(dp[i][j - 1]);
            }
        }
    }
    dp[0][n - 1]
}
```

```csharp
static int LpsLength(string s)
{
    int n = s.Length;
    if (n == 0) return 0;
    var dp = new int[n, n];
    for (int i = n - 1; i >= 0; i--)
    {
        dp[i, i] = 1;
        for (int j = i + 1; j < n; j++)
        {
            if (s[i] == s[j])
            {
                dp[i, j] = (i + 1 <= j - 1 ? dp[i + 1, j - 1] : 0) + 2;
            }
            else
            {
                dp[i, j] = Math.Max(dp[i + 1, j], dp[i, j - 1]);
            }
        }
    }
    return dp[0, n - 1];
}
```
