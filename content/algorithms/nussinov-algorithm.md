---
name: Nussinov法(RNA二次構造予測)
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(n³)(n塩基のRNA配列)
summary: RNA配列が自分自身と塩基対を作って折りたたまれる際、最も多くの塩基対を形成できる組み合わせを区間分割の動的計画法で発見する二次構造予測の基礎アルゴリズム。
---

## 概要

RNAは1本鎖の分子だが、配列中の離れた位置にある塩基同士(A-U、G-Cなど)が水素結合で対を作り、自分自身の上で折りたたまれることで、機能に重要な立体的な「二次構造」(ステムループ、ヘアピン構造など)を形成する。1978年にルース・ヌッシノフが発表したこのアルゴリズムは、「配列中でどの塩基とどの塩基が対を作れば、全体として最も多くの塩基対(安定な構造)を形成できるか」という問題を、[LCS](/algorithms/lcs)や[CKY法](/algorithms/cky-algorithm)と同じ区間分割の動的計画法として解く、RNA構造予測の基礎となる手法である。

## 仕組み

1. `n`塩基のRNA配列に対して、`dp[i][j]`を「部分区間`[i, j]`の中で形成できる最大の塩基対の数」と定義する
2. 短い区間から長い区間へ順に埋めていく。区間`[i, j]`の最大塩基対数は、以下の選択肢のうち最良のものになる: (a) 塩基`i`をどの塩基とも対にしない場合、`dp[i+1][j]`をそのまま使う、(b) 塩基`i`と塩基`j`を対にできる場合(塩基の種類が相補的で、かつ十分離れている)、`1 + dp[i+1][j-1]`、(c) 区間内のどこか`k`で2つの独立した部分構造に分割する場合、`max_k(dp[i][k] + dp[k+1][j])`——この最後の分割操作が、[行列連鎖乗算](/algorithms/matrix-chain-multiplication)や[CKY法](/algorithms/cky-algorithm)と同じ「区間を全ての分割点で試す」区間DPの構造そのものである
3. 全ての区間について`dp`を計算し終えたら、`dp[0][n-1]`(配列全体)が達成可能な最大塩基対数になる
4. 実際にどの塩基とどの塩基が対になっているか(具体的な二次構造)は、[LCS](/algorithms/lcs)の復元と同様に、`dp`テーブルをどの選択肢で最大値に到達したかを逆に辿ることで復元できる

## 特性・トレードオフ

- **計算量**: 区間の選び方が`O(n²)`通り、各区間で分割点や塩基対の判定に`O(n)`かかるため、全体で`O(n³)`。[CKY法](/algorithms/cky-algorithm)や[行列連鎖乗算](/algorithms/matrix-chain-multiplication)と同じ計算量のクラスに属する
- **「最大塩基対数」という単純化されたモデルの限界**: Nussinov法は「塩基対の数が多いほど安定」という単純化した仮定を置いているが、実際のRNAの安定性(自由エネルギー)は、隣接する塩基対のスタッキング(積み重なり)相互作用や、ループの大きさ・種類にも大きく依存する。より生物物理学的に正確な予測には、これらの効果を組み込んだ**Zukerアルゴリズム**(最小自由エネルギー法)のような拡張版が使われる
- **偽結び目(pseudoknot)を扱えない**: Nussinov法の区間分割の定式化は、塩基対が入れ子構造(括弧の対応のように交差しない)になっていることを前提としており、塩基対同士が交差する複雑な立体構造(偽結び目)は表現できない——これはこの動的計画法の定式化そのものに起因する根本的な制約である
- **使いどころ**: RNA分子(tRNA、rRNA、リボザイム、非コードRNA)の二次構造予測、RNA配列設計・RNAワールド仮説の研究における構造安定性の評価。教育的には、生物学的な問題が[CKY法](/algorithms/cky-algorithm)のような文脈自由文法の構文解析と数学的に同じ構造を持つことを示す好例としても知られる

## 実装例

```python
def can_pair(x: str, y: str) -> bool:
    pairs = {"AU", "UA", "GC", "CG", "GU", "UG"}
    return x + y in pairs


def nussinov(seq: str, min_loop: int = 1) -> int:
    n = len(seq)
    dp = [[0] * n for _ in range(n)]
    for length in range(min_loop + 1, n):
        for i in range(0, n - length):
            j = i + length
            best = dp[i + 1][j]  # 塩基iをどの塩基とも対にしない
            if can_pair(seq[i], seq[j]):
                best = max(best, dp[i + 1][j - 1] + 1)  # iとjを対にする
            for k in range(i + 1, j):  # 区間を分割する
                best = max(best, dp[i][k] + dp[k + 1][j])
            dp[i][j] = best
    return dp[0][n - 1] if n > 0 else 0
```

```typescript
function canPair(x: string, y: string): boolean {
  const pairs = new Set(["AU", "UA", "GC", "CG", "GU", "UG"]);
  return pairs.has(x + y);
}

function nussinov(seq: string, minLoop = 1): number {
  const n = seq.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let length = minLoop + 1; length < n; length++) {
    for (let i = 0; i < n - length; i++) {
      const j = i + length;
      let best = dp[i + 1][j];
      if (canPair(seq[i], seq[j])) best = Math.max(best, dp[i + 1][j - 1] + 1);
      for (let k = i + 1; k < j; k++) best = Math.max(best, dp[i][k] + dp[k + 1][j]);
      dp[i][j] = best;
    }
  }
  return n > 0 ? dp[0][n - 1] : 0;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <algorithm>

bool canPair(char x, char y) {
    static const std::set<std::string> pairs = {"AU", "UA", "GC", "CG", "GU", "UG"};
    return pairs.count(std::string{x, y}) > 0;
}

int nussinov(const std::string& seq, int minLoop = 1) {
    int n = static_cast<int>(seq.size());
    if (n == 0) return 0;
    std::vector<std::vector<int>> dp(n, std::vector<int>(n, 0));
    for (int length = minLoop + 1; length < n; length++) {
        for (int i = 0; i < n - length; i++) {
            int j = i + length;
            int best = dp[i + 1][j];
            if (canPair(seq[i], seq[j])) best = std::max(best, dp[i + 1][j - 1] + 1);
            for (int k = i + 1; k < j; k++) best = std::max(best, dp[i][k] + dp[k + 1][j]);
            dp[i][j] = best;
        }
    }
    return dp[0][n - 1];
}
```

```rust
fn can_pair(x: char, y: char) -> bool {
    matches!(
        (x, y),
        ('A', 'U') | ('U', 'A') | ('G', 'C') | ('C', 'G') | ('G', 'U') | ('U', 'G')
    )
}

fn nussinov(seq: &str, min_loop: usize) -> i32 {
    let seq: Vec<char> = seq.chars().collect();
    let n = seq.len();
    if n == 0 {
        return 0;
    }
    let mut dp = vec![vec![0i32; n]; n];
    for length in (min_loop + 1)..n {
        for i in 0..(n - length) {
            let j = i + length;
            let mut best = dp[i + 1][j];
            if can_pair(seq[i], seq[j]) {
                best = best.max(dp[i + 1][j - 1] + 1);
            }
            for k in (i + 1)..j {
                best = best.max(dp[i][k] + dp[k + 1][j]);
            }
            dp[i][j] = best;
        }
    }
    dp[0][n - 1]
}
```

```csharp
static bool CanPair(char x, char y)
{
    var pairs = new HashSet<string> { "AU", "UA", "GC", "CG", "GU", "UG" };
    return pairs.Contains($"{x}{y}");
}

static int Nussinov(string seq, int minLoop = 1)
{
    int n = seq.Length;
    if (n == 0) return 0;
    var dp = new int[n, n];
    for (int length = minLoop + 1; length < n; length++)
    {
        for (int i = 0; i < n - length; i++)
        {
            int j = i + length;
            int best = dp[i + 1, j];
            if (CanPair(seq[i], seq[j])) best = Math.Max(best, dp[i + 1, j - 1] + 1);
            for (int k = i + 1; k < j; k++) best = Math.Max(best, dp[i, k] + dp[k + 1, j]);
            dp[i, j] = best;
        }
    }
    return dp[0, n - 1];
}
```
