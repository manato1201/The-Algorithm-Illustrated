---
name: 最長共通部分列(LCS)
category: 動的計画法
subcategory: 数列・部分列
complexity: O(nm)
summary: 2つの列に共通する最長の並びを求める。差分表示(diff)の基礎理論。
---

## 概要

2つの文字列(あるいは配列)に共通して現れる要素の並びのうち、最も長いものを求める問題。「部分列」は連続している必要がなく、元の順序さえ保っていればよい(例えば "ABCBDAB" と "BDCABA" の最長共通部分列は "BCBA" や "BDAB" など、長さ4)。`git diff`やファイル比較ツールが「何が変更されたか」を表示する仕組みの裏には、このLCSの考え方がある。

## 仕組み

`dp[i][j]` を「1つ目の文字列の先頭i文字と、2つ目の文字列の先頭j文字における最長共通部分列の長さ」と定義する。

1. `dp[0][*]` と `dp[*][0]`(どちらかの文字列が空)は全て0で初期化する
2. i文字目とj文字目を比較し、**一致すれば** `dp[i][j] = dp[i-1][j-1] + 1`(共通部分列が1文字伸びる)
3. **一致しなければ** `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`(どちらか一方の文字を読み飛ばした場合の、より良い方を引き継ぐ)
4. 表の右下 `dp[n][m]` が最終的な最長共通部分列の長さになる
5. 実際の部分列そのものが必要な場合は、表を右下から左上へたどり直す(バックトラック)ことで復元できる

一致した場合は「斜め」に、一致しなかった場合は「上か左のうち大きい方」に伝播していく——この伝播パターンが0-1ナップサック問題のDPテーブルとよく似ており、両者は「2次元の表を埋めていく」という同じ骨格を共有している。

## 特性・トレードオフ

- **計算量**: O(nm)(n, mは2つの列の長さ)。表を1マスずつ埋めるだけなので直感的だが、列が長くなると急激に計算量が増える
- **メモリ**: 素朴な実装は表全体O(nm)を保持するが、長さの計算だけなら直前の行だけを保持するO(min(n,m))まで圧縮できる(ただし部分列そのものを復元したい場合は表全体が必要になる)
- **応用範囲の広さ**: `diff`コマンドやバージョン管理システムの差分表示、DNA配列の類似度解析(バイオインフォマティクス)、剽窃検出など、「2つの系列がどれだけ似ているか」を測るあらゆる場面の基礎理論になっている
- **最長共通部分文字列との違い**: 部分列は「連続していなくてよい」のに対し、部分文字列は「連続していなければならない」という制約があり、別のアルゴリズム(接尾辞配列など)で解かれることが多い

## 実装例

```python
def lcs(a: str, b: str) -> str:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    result = []
    i, j = n, m
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            result.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(result))
```

```typescript
function lcs(a: string, b: string): string {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let result = "";
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result = a[i - 1] + result;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

std::string lcs(const std::string& a, const std::string& b) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    std::string result;
    int i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            result.push_back(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    std::reverse(result.begin(), result.end());
    return result;
}
```

```rust
fn lcs(a: &str, b: &str) -> String {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let n = a.len();
    let m = b.len();
    let mut dp = vec![vec![0i32; m + 1]; n + 1];
    for i in 1..=n {
        for j in 1..=m {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }

    let mut result = Vec::new();
    let (mut i, mut j) = (n, m);
    while i > 0 && j > 0 {
        if a[i - 1] == b[j - 1] {
            result.push(a[i - 1]);
            i -= 1;
            j -= 1;
        } else if dp[i - 1][j] >= dp[i][j - 1] {
            i -= 1;
        } else {
            j -= 1;
        }
    }
    result.reverse();
    result.into_iter().collect()
}
```

```csharp
static string Lcs(string a, string b)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            if (a[i - 1] == b[j - 1])
            {
                dp[i, j] = dp[i - 1, j - 1] + 1;
            }
            else
            {
                dp[i, j] = Math.Max(dp[i - 1, j], dp[i, j - 1]);
            }
        }
    }

    var result = new System.Text.StringBuilder();
    int x = n, y = m;
    while (x > 0 && y > 0)
    {
        if (a[x - 1] == b[y - 1])
        {
            result.Append(a[x - 1]);
            x--;
            y--;
        }
        else if (dp[x - 1, y] >= dp[x, y - 1])
        {
            x--;
        }
        else
        {
            y--;
        }
    }
    var chars = result.ToString().ToCharArray();
    Array.Reverse(chars);
    return new string(chars);
}
```
