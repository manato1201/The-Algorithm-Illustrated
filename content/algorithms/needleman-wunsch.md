---
name: Needleman-Wunsch法(大域アラインメント)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(n×m)(長さn、mの2配列)
summary: 2つの生物配列全体を端から端まで対応付け、挿入・削除・置換のコストを最小にする最適な整列を動的計画法で求める配列比較の基礎アルゴリズム。
---

## 概要

2本のDNA配列やタンパク質配列がどれだけ似ているかを調べるには、単純な文字の一致だけでなく、進化の過程で起こる「挿入」「削除」「置換」を考慮して2つの配列全体を対応付ける必要がある。1970年にニードルマンとブンシュが発表したこの手法は、[編集距離](/algorithms/edit-distance)を求めるアルゴリズムと全く同じ動的計画法の骨格を使い、2つの配列の**全長**を端から端まで対応付ける「大域アラインメント」を計算する、配列比較の最も基本的な手法である。

## 仕組み

1. 長さ`n`、`m`の2配列に対して、`(n+1)×(m+1)`のDPテーブルを用意する。`dp[i][j]`は「配列Aの先頭`i`文字と配列Bの先頭`j`文字を最適に整列させたときのスコア」を表す
2. 初期条件は、片方の配列が空の場合(`dp[i][0] = -i×ギャップペナルティ`、`dp[0][j] = -j×ギャップペナルティ`)——全て挿入または削除で対応するしかないため
3. 各セル`dp[i][j]`は、3通りの操作のうち最良のものを選んで計算する: (a) `A[i]`と`B[j]`を対応付ける(一致なら加点、不一致なら減点、`dp[i-1][j-1] + スコア(A[i],B[j])`)、(b) `A[i]`を挿入として扱う(`dp[i-1][j] - ギャップペナルティ`)、(c) `B[j]`を挿入として扱う(`dp[i][j-1] - ギャップペナルティ`)——これは[編集距離](/algorithms/edit-distance)の3方向の遷移と全く同じ構造
4. テーブル全体を埋め終えたら、`dp[n][m]`が2配列全体の最適な整列スコアになる。実際の整列(どこで文字を対応付け、どこにギャップを入れるか)は、[LCS](/algorithms/lcs)の復元と同様に、テーブルをどの操作で来たかを逆に辿ることで復元できる

## 特性・トレードオフ

- **計算量**: `O(n×m)`の時間・空間。[編集距離](/algorithms/edit-distance)や[LCS](/algorithms/lcs)と全く同じ計算量のクラスに属する
- **[編集距離](/algorithms/edit-distance)との違い**: 数学的な構造は同一だが、生物学的な文脈では「一致・不一致のスコア」が単なる0/1ではなく、アミノ酸の性質の近さを反映したスコア行列(BLOSUM、PAM等)を使うことが多い——化学的に似た性質のアミノ酸同士の置換は、全く異なる性質のアミノ酸への置換よりペナルティを小さくする、生物学的知見を組み込んだ設計になっている
- **大域アラインメントの限界**: 配列全体を強制的に端から端まで対応付けるため、一方の配列にもう一方には存在しない大きな領域がある場合(部分的な類似性しかない場合)、無理に対応付けようとして不自然な整列になることがある。この場合は、部分的な最も良く似た領域だけを見つける[Smith-Waterman法(局所アラインメント)](/algorithms/smith-waterman)の方が適している
- **使いどころ**: 近縁種の相同遺伝子全体の比較、既知のタンパク質と新規タンパク質配列の全体構造比較、[UPGMA](/algorithms/upgma)や[近隣結合法](/algorithms/neighbor-joining)で系統樹を構築する際の配列間距離の計算基盤

## 実装例

```python
def needleman_wunsch(
    a: str, b: str, match: int = 1, mismatch: int = -1, gap: int = -2
) -> tuple[int, str, str]:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i * gap
    for j in range(m + 1):
        dp[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = match if a[i - 1] == b[j - 1] else mismatch
            dp[i][j] = max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap)

    # トレースバックでアラインメントを復元する
    aligned_a, aligned_b = [], []
    i, j = n, m
    while i > 0 or j > 0:
        s = match if i > 0 and j > 0 and a[i - 1] == b[j - 1] else mismatch
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + s:
            aligned_a.append(a[i - 1])
            aligned_b.append(b[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + gap:
            aligned_a.append(a[i - 1])
            aligned_b.append("-")
            i -= 1
        else:
            aligned_a.append("-")
            aligned_b.append(b[j - 1])
            j -= 1
    return dp[n][m], "".join(reversed(aligned_a)), "".join(reversed(aligned_b))
```

```typescript
function needlemanWunsch(
  a: string,
  b: string,
  match = 1,
  mismatch = -1,
  gap = -2
): { score: number; alignedA: string; alignedB: string } {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = a[i - 1] === b[j - 1] ? match : mismatch;
      dp[i][j] = Math.max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
    }
  }

  let i = n;
  let j = m;
  const alignedA: string[] = [];
  const alignedB: string[] = [];
  while (i > 0 || j > 0) {
    const s = i > 0 && j > 0 && a[i - 1] === b[j - 1] ? match : mismatch;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + s) {
      alignedA.push(a[i - 1]);
      alignedB.push(b[j - 1]);
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gap) {
      alignedA.push(a[i - 1]);
      alignedB.push("-");
      i--;
    } else {
      alignedA.push("-");
      alignedB.push(b[j - 1]);
      j--;
    }
  }
  return { score: dp[n][m], alignedA: alignedA.reverse().join(""), alignedB: alignedB.reverse().join("") };
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

struct AlignmentResult {
    int score;
    std::string alignedA;
    std::string alignedB;
};

AlignmentResult needlemanWunsch(const std::string& a, const std::string& b,
                                 int match = 1, int mismatch = -1, int gap = -2) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0][j] = j * gap;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            int s = (a[i - 1] == b[j - 1]) ? match : mismatch;
            dp[i][j] = std::max({dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap});
        }
    }

    std::string alignedA, alignedB;
    int i = n, j = m;
    while (i > 0 || j > 0) {
        int s = (i > 0 && j > 0 && a[i - 1] == b[j - 1]) ? match : mismatch;
        if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + s) {
            alignedA.push_back(a[i - 1]);
            alignedB.push_back(b[j - 1]);
            i--; j--;
        } else if (i > 0 && dp[i][j] == dp[i - 1][j] + gap) {
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
    return {dp[n][m], alignedA, alignedB};
}
```

```rust
fn needleman_wunsch(a: &str, b: &str, match_score: i32, mismatch: i32, gap: i32) -> (i32, String, String) {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let n = a.len();
    let m = b.len();
    let mut dp = vec![vec![0i32; m + 1]; n + 1];
    for i in 0..=n {
        dp[i][0] = i as i32 * gap;
    }
    for j in 0..=m {
        dp[0][j] = j as i32 * gap;
    }
    for i in 1..=n {
        for j in 1..=m {
            let s = if a[i - 1] == b[j - 1] { match_score } else { mismatch };
            dp[i][j] = (dp[i - 1][j - 1] + s)
                .max(dp[i - 1][j] + gap)
                .max(dp[i][j - 1] + gap);
        }
    }

    let mut aligned_a = Vec::new();
    let mut aligned_b = Vec::new();
    let (mut i, mut j) = (n, m);
    while i > 0 || j > 0 {
        let s = if i > 0 && j > 0 && a[i - 1] == b[j - 1] { match_score } else { mismatch };
        if i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + s {
            aligned_a.push(a[i - 1]);
            aligned_b.push(b[j - 1]);
            i -= 1;
            j -= 1;
        } else if i > 0 && dp[i][j] == dp[i - 1][j] + gap {
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
    (dp[n][m], aligned_a.into_iter().collect(), aligned_b.into_iter().collect())
}
```

```csharp
static (int Score, string AlignedA, string AlignedB) NeedlemanWunsch(
    string a, string b, int match = 1, int mismatch = -1, int gap = -2)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0, j] = j * gap;
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            int s = a[i - 1] == b[j - 1] ? match : mismatch;
            dp[i, j] = Math.Max(dp[i - 1, j - 1] + s, Math.Max(dp[i - 1, j] + gap, dp[i, j - 1] + gap));
        }
    }

    var alignedA = new List<char>();
    var alignedB = new List<char>();
    int ii = n, jj = m;
    while (ii > 0 || jj > 0)
    {
        int s = (ii > 0 && jj > 0 && a[ii - 1] == b[jj - 1]) ? match : mismatch;
        if (ii > 0 && jj > 0 && dp[ii, jj] == dp[ii - 1, jj - 1] + s)
        {
            alignedA.Add(a[ii - 1]); alignedB.Add(b[jj - 1]); ii--; jj--;
        }
        else if (ii > 0 && dp[ii, jj] == dp[ii - 1, jj] + gap)
        {
            alignedA.Add(a[ii - 1]); alignedB.Add('-'); ii--;
        }
        else
        {
            alignedB.Add(b[jj - 1]); alignedA.Add('-'); jj--;
        }
    }
    alignedA.Reverse(); alignedB.Reverse();
    return (dp[n, m], new string(alignedA.ToArray()), new string(alignedB.ToArray()));
}
```
