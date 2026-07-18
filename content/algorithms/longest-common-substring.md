---
name: 最長共通部分文字列
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n + m)
summary: 接尾辞配列や接尾辞木を使うことで、2つの文字列に連続して共通する部分を高速に見つける。
---

## 概要

2つの文字列に**連続して**共通して現れる部分文字列のうち、最も長いものを求める問題。最長共通部分列(LCS)とよく混同されるが、あちらは「連続していなくてよい」のに対し、こちらは「必ず連続していなければならない」という明確な違いがある(名前が似ているだけに、この区別は文字列アルゴリズムを学ぶ上での定番の注意点)。

## 仕組み

**DPによる解法(O(nm))**: `dp[i][j]` を「1つ目の文字列のi文字目、2つ目の文字列のj文字目で終わる共通部分文字列の長さ」と定義する。i文字目とj文字目が一致すれば `dp[i][j] = dp[i-1][j-1] + 1`、一致しなければ `dp[i][j] = 0`(連続性が途切れるため、LCSのようにmax(左, 上)を引き継ぐことができない)。全てのマスの中の最大値が答えになる。

**接尾辞配列を使った高速解法(O(n + m))**: 2つの文字列を区切り文字(どちらの文字列にも出現しない特殊文字)でつないだ1本の文字列を作り、その接尾辞配列とLCP配列(隣接する接尾辞の最長共通接頭辞の長さ)を構築する。「異なる元の文字列に由来する接尾辞」が配列上で隣接している箇所のLCP値の最大値が、最長共通部分文字列の長さになる。

DPは直感的でわかりやすい反面O(nm)かかるのに対し、接尾辞配列を使う方法は前処理の理解こそ必要だが、線形時間に近いオーダーまで高速化できる。

## 特性・トレードオフ

- **計算量**: DPによる素朴な解法はO(nm)、接尾辞配列を使う解法はO(n + m)(ただし接尾辞配列自体の構築にO(n log n)程度かかる)
- **LCSとの違いを理解する意義**: 「連続」という制約の有無で、必要なアルゴリズムも計算量も大きく変わることを示す好例。問題文を正確に読み、どちらが問われているかを見極める重要性を教えてくれる
- **複数文字列への一般化**: 2つだけでなく、複数の文字列に共通する最長部分文字列を求める問題にも、接尾辞配列ベースの手法は自然に拡張できる
- **使いどころ**: ソースコードの盗用検出(コピーされたコードブロックの発見)、DNA配列の共通領域の発見、差分検出ツールにおける「移動されたブロック」の識別など

## 実装例

```python
def longest_common_substring(a: str, b: str) -> str:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    best_len = 0
    best_end = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                if dp[i][j] > best_len:
                    best_len = dp[i][j]
                    best_end = i
            else:
                dp[i][j] = 0
    return a[best_end - best_len : best_end]
```

```typescript
function longestCommonSubstring(a: string, b: string): string {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  let bestLen = 0;
  let bestEnd = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > bestLen) {
          bestLen = dp[i][j];
          bestEnd = i;
        }
      } else {
        dp[i][j] = 0;
      }
    }
  }
  return a.slice(bestEnd - bestLen, bestEnd);
}
```

```cpp
#include <string>
#include <vector>

std::string longestCommonSubstring(const std::string& a, const std::string& b) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    int bestLen = 0;
    int bestEnd = 0;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > bestLen) {
                    bestLen = dp[i][j];
                    bestEnd = i;
                }
            } else {
                dp[i][j] = 0;
            }
        }
    }
    return a.substr(bestEnd - bestLen, bestLen);
}
```

```rust
fn longest_common_substring(a: &str, b: &str) -> String {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let n = a_chars.len();
    let m = b_chars.len();
    let mut dp = vec![vec![0usize; m + 1]; n + 1];
    let mut best_len = 0;
    let mut best_end = 0;
    for i in 1..=n {
        for j in 1..=m {
            if a_chars[i - 1] == b_chars[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if dp[i][j] > best_len {
                    best_len = dp[i][j];
                    best_end = i;
                }
            } else {
                dp[i][j] = 0;
            }
        }
    }
    a_chars[best_end - best_len..best_end].iter().collect()
}
```

```csharp
static string LongestCommonSubstring(string a, string b)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    int bestLen = 0, bestEnd = 0;
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            if (a[i - 1] == b[j - 1])
            {
                dp[i, j] = dp[i - 1, j - 1] + 1;
                if (dp[i, j] > bestLen)
                {
                    bestLen = dp[i, j];
                    bestEnd = i;
                }
            }
            else
            {
                dp[i, j] = 0;
            }
        }
    }
    return a.Substring(bestEnd - bestLen, bestLen);
}
```
