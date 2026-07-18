---
name: Smith-Waterman法(局所アラインメント)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(n×m)(長さn、mの2配列)
summary: 配列全体ではなく、2配列の中で最もよく似ている部分領域だけを見つけ出す、負のスコアを0で打ち切る一工夫で大域アラインメントを局所版へ変える手法。
---

## 概要

[Needleman-Wunsch法](/algorithms/needleman-wunsch)は配列全体を強制的に対応付けるが、実際の生物学的な類似性は、配列全体ではなく特定の機能領域(モチーフ、ドメイン)だけに限られていることが多い——2つのタンパク質の大部分は無関係でも、特定の機能を担う短い領域だけが強く保存されている、というのはよくある状況である。1981年にスミスとウォーターマンが発表した局所アラインメントは、[Needleman-Wunsch法](/algorithms/needleman-wunsch)のDP漸化式にたった1つの変更(スコアが負になったら0で打ち切る)を加えるだけで、「配列中のどこかにある、最もよく似た部分領域」だけを見つけ出せるように変換する、エレガントな改良である。

## 仕組み

1. [Needleman-Wunsch法](/algorithms/needleman-wunsch)と同じ`(n+1)×(m+1)`のDPテーブルを用意するが、初期条件を`dp[i][0] = 0`、`dp[0][j] = 0`とする(配列の途中からアラインメントを始めてもよい、というのがこの手法の核心)
2. 各セル`dp[i][j]`は、[Needleman-Wunsch法](/algorithms/needleman-wunsch)と同じ3方向の漸化式(対応付け・A側の挿入・B側の挿入)に加えて、**第4の選択肢として「0」を追加**する: `dp[i][j] = max(0, dp[i-1][j-1]+スコア, dp[i-1][j]-ギャップ, dp[i][j-1]-ギャップ)`
3. この「0で打ち切る」操作により、スコアが負になりそうな(似ていない)対応付けが続く場合、そこでアラインメントを一旦リセットして「新しい局所アラインメントの開始点」とみなせるようになる
4. テーブル全体を埋め終えたら、`dp[n][m]`ではなく、**テーブル全体の中で最大値を持つセル**を探す。これが最良の局所アラインメントの終点になる
5. その最大値のセルから、値が0になるまで(逆に辿った経路の始点まで)テーブルをトレースバックすることで、最もよく似た部分領域の実際のアラインメントを復元できる

## 特性・トレードオフ

- **計算量**: [Needleman-Wunsch法](/algorithms/needleman-wunsch)と同じ`O(n×m)`。追加されたのは各セルでの1回の比較(`max`に0を含める)だけなので、計算コストはほぼ変わらない
- **「0で打ち切る」ことの意味**: 負のスコアの累積を許すと、似ていない領域を無理に対応付けた結果としてスコア全体が沈んでしまうが、0で打ち切ることで「ここまでの対応付けは筋が悪かったので忘れて、新しく始め直す」ことが可能になる——この1点の工夫だけで大域から局所への性質の転換が実現されているのが、このアルゴリズムの美しさである
- **感度と特異度のトレードオフ**: スコア行列やギャップペナルティの設定次第で、検出される局所領域の長さや厳密性が変わる。緩い設定では偶然の一致まで拾ってしまい(偽陽性)、厳しい設定では本当に意味のある類似領域を見逃す(偽陰性)ことがある
- **使いどころ**: タンパク質の機能ドメイン・モチーフの検出、進化的に離れた種の間でも保存されている重要な配列領域の特定。計算量がやや重いため、データベース全体との高速な検索には、この厳密な手法の近似として[BLASTアルゴリズム](/algorithms/blast-algorithm)のようなヒューリスティック手法が実務では広く使われる

## 実装例

```python
def smith_waterman(
    a: str, b: str, match: int = 3, mismatch: int = -3, gap: int = -2
) -> tuple[int, str, str]:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    best_val, best_i, best_j = 0, 0, 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = match if a[i - 1] == b[j - 1] else mismatch
            dp[i][j] = max(0, dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap)
            if dp[i][j] > best_val:
                best_val, best_i, best_j = dp[i][j], i, j

    # 最大値のセルから、0になるまでトレースバックする
    aligned_a, aligned_b = [], []
    i, j = best_i, best_j
    while i > 0 and j > 0 and dp[i][j] != 0:
        s = match if a[i - 1] == b[j - 1] else mismatch
        if dp[i][j] == dp[i - 1][j - 1] + s:
            aligned_a.append(a[i - 1])
            aligned_b.append(b[j - 1])
            i, j = i - 1, j - 1
        elif dp[i][j] == dp[i - 1][j] + gap:
            aligned_a.append(a[i - 1])
            aligned_b.append("-")
            i -= 1
        else:
            aligned_a.append("-")
            aligned_b.append(b[j - 1])
            j -= 1
    return best_val, "".join(reversed(aligned_a)), "".join(reversed(aligned_b))
```

```typescript
function smithWaterman(
  a: string,
  b: string,
  match = 3,
  mismatch = -3,
  gap = -2
): { score: number; alignedA: string; alignedB: string } {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  let best = { val: 0, i: 0, j: 0 };
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = a[i - 1] === b[j - 1] ? match : mismatch;
      dp[i][j] = Math.max(0, dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
      if (dp[i][j] > best.val) best = { val: dp[i][j], i, j };
    }
  }

  let { i, j } = best;
  const alignedA: string[] = [];
  const alignedB: string[] = [];
  while (i > 0 && j > 0 && dp[i][j] !== 0) {
    const s = a[i - 1] === b[j - 1] ? match : mismatch;
    if (dp[i][j] === dp[i - 1][j - 1] + s) {
      alignedA.push(a[i - 1]);
      alignedB.push(b[j - 1]);
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j] + gap) {
      alignedA.push(a[i - 1]);
      alignedB.push("-");
      i--;
    } else {
      alignedA.push("-");
      alignedB.push(b[j - 1]);
      j--;
    }
  }
  return { score: best.val, alignedA: alignedA.reverse().join(""), alignedB: alignedB.reverse().join("") };
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

struct LocalAlignmentResult {
    int score;
    std::string alignedA;
    std::string alignedB;
};

LocalAlignmentResult smithWaterman(const std::string& a, const std::string& b,
                                    int match = 3, int mismatch = -3, int gap = -2) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    int bestVal = 0, bestI = 0, bestJ = 0;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            int s = (a[i - 1] == b[j - 1]) ? match : mismatch;
            dp[i][j] = std::max({0, dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap});
            if (dp[i][j] > bestVal) {
                bestVal = dp[i][j];
                bestI = i;
                bestJ = j;
            }
        }
    }

    std::string alignedA, alignedB;
    int i = bestI, j = bestJ;
    while (i > 0 && j > 0 && dp[i][j] != 0) {
        int s = (a[i - 1] == b[j - 1]) ? match : mismatch;
        if (dp[i][j] == dp[i - 1][j - 1] + s) {
            alignedA.push_back(a[i - 1]);
            alignedB.push_back(b[j - 1]);
            i--; j--;
        } else if (dp[i][j] == dp[i - 1][j] + gap) {
            alignedA.push_back(a[i - 1]);
            alignedB.push_back('-');
            i--;
        } else {
            alignedA.push_back('-');
            alignedB.push_back(b[j - 1]);
            j--;
        }
    }
    std::reverse(alignedA.begin(), alignedA.end());
    std::reverse(alignedB.begin(), alignedB.end());
    return {bestVal, alignedA, alignedB};
}
```

```rust
fn smith_waterman(a: &str, b: &str, match_score: i32, mismatch: i32, gap: i32) -> (i32, String, String) {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let n = a.len();
    let m = b.len();
    let mut dp = vec![vec![0i32; m + 1]; n + 1];
    let (mut best_val, mut best_i, mut best_j) = (0, 0, 0);
    for i in 1..=n {
        for j in 1..=m {
            let s = if a[i - 1] == b[j - 1] { match_score } else { mismatch };
            let v = 0
                .max(dp[i - 1][j - 1] + s)
                .max(dp[i - 1][j] + gap)
                .max(dp[i][j - 1] + gap);
            dp[i][j] = v;
            if v > best_val {
                best_val = v;
                best_i = i;
                best_j = j;
            }
        }
    }

    let mut aligned_a = Vec::new();
    let mut aligned_b = Vec::new();
    let (mut i, mut j) = (best_i, best_j);
    while i > 0 && j > 0 && dp[i][j] != 0 {
        let s = if a[i - 1] == b[j - 1] { match_score } else { mismatch };
        if dp[i][j] == dp[i - 1][j - 1] + s {
            aligned_a.push(a[i - 1]);
            aligned_b.push(b[j - 1]);
            i -= 1;
            j -= 1;
        } else if dp[i][j] == dp[i - 1][j] + gap {
            aligned_a.push(a[i - 1]);
            aligned_b.push('-');
            i -= 1;
        } else {
            aligned_a.push('-');
            aligned_b.push(b[j - 1]);
            j -= 1;
        }
    }
    aligned_a.reverse();
    aligned_b.reverse();
    (best_val, aligned_a.into_iter().collect(), aligned_b.into_iter().collect())
}
```

```csharp
static (int Score, string AlignedA, string AlignedB) SmithWaterman(
    string a, string b, int match = 3, int mismatch = -3, int gap = -2)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    int bestVal = 0, bestI = 0, bestJ = 0;
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            int s = a[i - 1] == b[j - 1] ? match : mismatch;
            dp[i, j] = Math.Max(0, Math.Max(dp[i - 1, j - 1] + s, Math.Max(dp[i - 1, j] + gap, dp[i, j - 1] + gap)));
            if (dp[i, j] > bestVal) { bestVal = dp[i, j]; bestI = i; bestJ = j; }
        }
    }

    var alignedA = new List<char>();
    var alignedB = new List<char>();
    int ii = bestI, jj = bestJ;
    while (ii > 0 && jj > 0 && dp[ii, jj] != 0)
    {
        int s = a[ii - 1] == b[jj - 1] ? match : mismatch;
        if (dp[ii, jj] == dp[ii - 1, jj - 1] + s)
        {
            alignedA.Add(a[ii - 1]); alignedB.Add(b[jj - 1]); ii--; jj--;
        }
        else if (dp[ii, jj] == dp[ii - 1, jj] + gap)
        {
            alignedA.Add(a[ii - 1]); alignedB.Add('-'); ii--;
        }
        else
        {
            alignedA.Add('-'); alignedB.Add(b[jj - 1]); jj--;
        }
    }
    alignedA.Reverse(); alignedB.Reverse();
    return (bestVal, new string(alignedA.ToArray()), new string(alignedB.ToArray()));
}
```
