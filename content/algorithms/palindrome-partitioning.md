---
name: 回文分割(Palindrome Partitioning)
category: 動的計画法
subcategory: 数列・部分列
complexity: O(n²)(最小分割数を求める場合、回文判定を前処理でO(1)化した場合)
summary: 文字列を「全ての部分が回文になるように」分割する際、その最小分割数を求める問題で、まず全区間の回文判定をDPで前計算し、その結果を使って最小分割数を求める2段階DPが必要になる。
---

## 概要

`"aab"`のような文字列を、各部分文字列が全て回文になるように分割したい(`"a" + "a" + "b"`や`"aa" + "b"`のように)とき、可能な分割の中で分割回数が最小になるものを求めたい。この問題の面白さは、「与えられた区間が回文かどうか」という判定自体を都度愚直に行うと計算全体が重くなってしまう点にあり、実務上は「まず全ての区間についての回文判定を1つの動的計画法で前計算し、その結果を使って最小分割数をまた別の動的計画法で求める」という**2段階のDP**を組み合わせる必要がある、DPを積み重ねる典型的な設計パターンを学べる良問である。

## 仕組み

1. **第1段階(回文判定テーブルの構築)**: `isPal[i][j]`を「部分文字列`s[i..j]`が回文かどうか」を表すブール値の2次元テーブルとする。長さ1の区間は自明に回文、長さ2の区間は2文字が一致すれば回文。長さ`L`の区間`isPal[i][j]`(`j = i + L - 1`)は、「両端の文字`s[i]`と`s[j]`が一致」かつ「内側の区間`isPal[i+1][j-1]`も回文」であれば回文、という漸化式で、区間の長さが短い順に埋めていく([最長回文部分文字列](/algorithms/longest-palindromic-subsequence)と同系統の区間DP)
2. **第2段階(最小分割数の計算)**: `dp[i]`を「文字列の先頭`i`文字を回文分割するのに必要な最小分割回数」とする1次元テーブルとする。`dp[0] = -1`(分割前、便宜上の初期値)とし、`dp[i]`は`0 ≤ j < i`の全てについて、`isPal[j][i-1]`が真(つまり`s[j..i)`が回文)であるような`j`の中から`dp[j] + 1`の最小値を選ぶ
3. `dp[n]`(`n`は文字列全体の長さ)が答え、すなわち最小分割数になる
4. 各区間が回文かどうかを毎回`O(n)`かけて判定していたら第2段階全体が`O(n³)`になってしまうところを、第1段階で`O(n²)`かけて全区間の判定結果を前計算しておくことで、第2段階の各判定を`O(1)`に落とし、全体を`O(n²)`に抑えられる

## 特性・トレードオフ

- **計算量**: 第1段階(回文判定テーブル構築)が`O(n²)`、第2段階(最小分割数DP)も内側ループを合わせて`O(n²)`、合計で`O(n²)`。回文判定テーブルを省略して都度判定すると`O(n³)`まで悪化する
- **2段階DPという設計パターン**: 「まず補助的な判定テーブルをDPで構築し、それを使って本題のDPを解く」という構成は、[最長共通部分文字列](/algorithms/lcp-array)のような他の文字列DP問題にも共通して現れる、区間ベースの文字列問題を扱う際の定石になっている
- **全列挙版との違い**: 「全ての回文分割パターンを列挙せよ」という亜種の問題ではバックトラッキングが必要になり、最悪`O(2^n)`のパターン数を出力する必要があるため動的計画法だけでは解けない(最小分割数を求めるだけなら動的計画法で十分)——「個数・最小値を求める」問題と「全パターンを列挙する」問題の計算量が本質的に異なる典型例
- **使いどころ**: DNA配列における回文構造(制限酵素の認識部位など)の分割解析、テキスト処理における対称構造の検出、動的計画法における「区間DP+1次元DPの合成」パターンの教材

## 実装例

```python
def min_palindrome_cuts(s: str) -> int:
    n = len(s)

    # 第1段階: is_pal[i][j] = s[i..j] が回文かどうか
    is_pal = [[False] * n for _ in range(n)]
    for i in range(n):
        is_pal[i][i] = True
    for i in range(n - 1):
        is_pal[i][i + 1] = s[i] == s[i + 1]
    for length in range(3, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            is_pal[i][j] = s[i] == s[j] and is_pal[i + 1][j - 1]

    # 第2段階: dp[i] = s[:i] を回文分割する最小分割回数
    dp = [0] * (n + 1)
    dp[0] = -1
    for i in range(1, n + 1):
        best = float("inf")
        for j in range(0, i):
            if is_pal[j][i - 1]:
                best = min(best, dp[j] + 1)
        dp[i] = best
    return dp[n]
```

```typescript
function minPalindromeCuts(s: string): number {
  const n = s.length;

  const isPal: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = 0; i < n; i++) isPal[i][i] = true;
  for (let i = 0; i < n - 1; i++) isPal[i][i + 1] = s[i] === s[i + 1];
  for (let length = 3; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length - 1;
      isPal[i][j] = s[i] === s[j] && isPal[i + 1][j - 1];
    }
  }

  const dp = new Array(n + 1).fill(0);
  dp[0] = -1;
  for (let i = 1; i <= n; i++) {
    let best = Infinity;
    for (let j = 0; j < i; j++) {
      if (isPal[j][i - 1]) best = Math.min(best, dp[j] + 1);
    }
    dp[i] = best;
  }
  return dp[n];
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <limits>

int minPalindromeCuts(const std::string& s) {
    int n = static_cast<int>(s.size());
    std::vector<std::vector<bool>> isPal(n, std::vector<bool>(n, false));
    for (int i = 0; i < n; i++) isPal[i][i] = true;
    for (int i = 0; i < n - 1; i++) isPal[i][i + 1] = (s[i] == s[i + 1]);
    for (int length = 3; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            isPal[i][j] = (s[i] == s[j]) && isPal[i + 1][j - 1];
        }
    }

    std::vector<int> dp(n + 1, 0);
    dp[0] = -1;
    for (int i = 1; i <= n; i++) {
        int best = std::numeric_limits<int>::max();
        for (int j = 0; j < i; j++) {
            if (isPal[j][i - 1]) best = std::min(best, dp[j] + 1);
        }
        dp[i] = best;
    }
    return dp[n];
}
```

```rust
fn min_palindrome_cuts(s: &str) -> i32 {
    let s: Vec<char> = s.chars().collect();
    let n = s.len();
    let mut is_pal = vec![vec![false; n]; n];
    for i in 0..n {
        is_pal[i][i] = true;
    }
    for i in 0..n.saturating_sub(1) {
        is_pal[i][i + 1] = s[i] == s[i + 1];
    }
    for length in 3..=n {
        for i in 0..=(n - length) {
            let j = i + length - 1;
            is_pal[i][j] = s[i] == s[j] && is_pal[i + 1][j - 1];
        }
    }

    let mut dp = vec![0i32; n + 1];
    dp[0] = -1;
    for i in 1..=n {
        let mut best = i32::MAX;
        for j in 0..i {
            if is_pal[j][i - 1] {
                best = best.min(dp[j] + 1);
            }
        }
        dp[i] = best;
    }
    dp[n]
}
```

```csharp
static int MinPalindromeCuts(string s)
{
    int n = s.Length;
    var isPal = new bool[n, n];
    for (int i = 0; i < n; i++) isPal[i, i] = true;
    for (int i = 0; i < n - 1; i++) isPal[i, i + 1] = s[i] == s[i + 1];
    for (int length = 3; length <= n; length++)
    {
        for (int i = 0; i <= n - length; i++)
        {
            int j = i + length - 1;
            isPal[i, j] = s[i] == s[j] && isPal[i + 1, j - 1];
        }
    }

    var dp = new int[n + 1];
    dp[0] = -1;
    for (int i = 1; i <= n; i++)
    {
        int best = int.MaxValue;
        for (int j = 0; j < i; j++)
            if (isPal[j, i - 1]) best = Math.Min(best, dp[j] + 1);
        dp[i] = best;
    }
    return dp[n];
}
```
