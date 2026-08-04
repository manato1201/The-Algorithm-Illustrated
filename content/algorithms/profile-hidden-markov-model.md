---
name: プロファイル隠れマルコフモデル(Profile HMM)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(nm)([ビタビ法](/algorithms/viterbi-algorithm)によるアラインメント、n=モデルの長さ、m=クエリ配列長)
summary: "[多重配列アラインメント](/algorithms/multiple-sequence-alignment)で得られた「タンパク質ファミリー全体の共通パターン」を確率モデルとして表現し、新しい配列がそのファミリーに属するかどうかを、挿入・欠失・置換の起こりやすさまで考慮して統計的に判定する隠れマルコフモデルの応用。"
---

## 概要

[多重配列アラインメント](/algorithms/multiple-sequence-alignment)によって、同じタンパク質ファミリーに属する複数の配列を並べると、「ある位置は種を超えてよく保存されている」「別の位置は挿入・欠失(ギャップ)が頻繁に起こる」といった、ファミリー全体に共通するパターンが見えてくる。プロファイルHMMは、このアラインメント結果を「各位置でどのアミノ酸がどれだけ出現しやすいか」「どの位置で挿入・欠失が起こりやすいか」という確率分布の連なりとしてモデル化したものである。[ビタビ法](/algorithms/viterbi-algorithm)が品詞タグ付けで「単語列から最も尤もらしい品詞列」を求めるのと同じ発想を使い、新しい未知の配列がこのモデル(タンパク質ファミリー)にどれだけ良く適合するかを、単純な配列同士の類似度比較よりもずっと精度高く判定できる。

## 仕組み

1. [多重配列アラインメント](/algorithms/multiple-sequence-alignment)によって得られた、同じファミリーに属する複数の配列の並びから出発する
2. アラインメントの各列(位置)について、3種類の状態を持つHMMの構造を構築する: **Match状態**(その位置で実際にアミノ酸が対応している、20種のアミノ酸それぞれの出現確率を持つ)、**Insert状態**(その位置の直後に余分な文字が挿入される)、**Delete状態**(その位置に対応する文字が欠落している)
3. アラインメントされた配列群における各列でのアミノ酸の出現頻度から、Match状態の出力確率(どのアミノ酸がどれだけ出やすいか)を推定する。同様に、ギャップの出現頻度から状態間の遷移確率(次にMatch/Insert/Deleteのどれに進みやすいか)を推定する
4. 新しい未知の配列がこのモデルにどれだけ適合するかを判定する際、[ビタビ法](/algorithms/viterbi-algorithm)を使って「その配列を生成する最も尤もらしい状態列(どこがMatchでどこがInsert/Deleteか)」とその尤度を計算する
5. 尤度が高ければ、その配列はこのタンパク質ファミリーに属する可能性が高いと判定できる。逆に、新しい配列をこのモデルに沿って整列させることで、ファミリー全体との配列アラインメントも同時に得られる

## 特性・トレードオフ

- **計算量**: [ビタビ法](/algorithms/viterbi-algorithm)によるアラインメント自体は、モデルの長さ`n`とクエリ配列長`m`に対して`O(nm)`——[Needleman-Wunsch法](/algorithms/needleman-wunsch)や[Smith-Waterman法](/algorithms/smith-waterman)の1対1アラインメントと同程度のオーダーだが、比較対象が単一の配列ではなくファミリー全体の統計的な特徴になっている点が本質的に異なる
- **位置ごとに異なる保存度を扱えるという精度の高さ**: 単純な配列類似度スコア(全位置を均等に扱う)と異なり、プロファイルHMMは「進化的に強く保存されている位置での不一致は重く減点し、可変性の高い位置での不一致は軽く扱う」という、生物学的に意味のある重み付けを自然に表現できる——遠縁の(配列類似度が低い)ファミリーメンバーの検出精度が、単純な類似度比較より格段に高い
- **[多重配列アラインメント](/algorithms/multiple-sequence-alignment)への依存**: プロファイルHMMの構築には、まず質の良い多重配列アラインメントが必要であり、そのアラインメント自体の精度がプロファイルHMMの性能に直接影響する——多重配列アラインメントが持つ計算量・精度のトレードオフが、そのままプロファイルHMM構築のボトルネックにもなる
- **使いどころ**: タンパク質ファミリーデータベース(Pfam等)における新規配列の家族分類、リモートホモロジー検出(配列類似度は低いが構造的・機能的に類縁である配列の発見)、遺伝子予測における既知のモチーフ・ドメインの検出、宏遺伝学(メタゲノミクス)における未知配列の機能推定

## 実装例

多重配列アラインメントの各列からMatch状態の出力確率分布(ラプラススムージング付き)を構築し、[ビタビ法](/algorithms/viterbi-algorithm)と同じ発想の動的計画法(Needleman-Wunsch型のDP)でクエリ配列の対数尤度を計算する。ファミリーに近い配列ほど、無関係な配列よりスコアが高くなることを検証する。

```python
import math

NEG_INF = float("-inf")


def log(x: float) -> float:
    return math.log(x) if x > 0 else NEG_INF


class ProfileHMM:
    def __init__(self, match_emissions: list[dict[str, float]], insert_penalty: float = -2.0, delete_penalty: float = -2.0) -> None:
        self.match_emissions = match_emissions  # 各列の出力確率分布(20種アミノ酸やDNA塩基など)
        self.n = len(match_emissions)
        self.insert_penalty = insert_penalty
        self.delete_penalty = delete_penalty

    def score(self, query: str) -> float:
        """dp[i][j] = プロファイル列[0..i)とクエリ[0..j)を最良に対応させたときの対数尤度。
        Match: 列と文字を1つずつ消費、Delete: 列だけ消費、Insert: 文字だけ消費。"""
        n, m = self.n, len(query)
        dp = [[NEG_INF] * (m + 1) for _ in range(n + 1)]
        dp[0][0] = 0.0
        for i in range(n + 1):
            for j in range(m + 1):
                if i == 0 and j == 0:
                    continue
                best = NEG_INF
                if i > 0 and j > 0:
                    emit = self.match_emissions[i - 1].get(query[j - 1], 1e-6)
                    best = max(best, dp[i - 1][j - 1] + log(emit))
                if i > 0:
                    best = max(best, dp[i - 1][j] + self.delete_penalty)
                if j > 0:
                    best = max(best, dp[i][j - 1] + self.insert_penalty)
                dp[i][j] = best
        return dp[n][m]


def build_profile_from_alignment(aligned_seqs: list[str]) -> list[dict[str, float]]:
    length = len(aligned_seqs[0])
    profile = []
    alphabet = "ACGT"
    for col in range(length):
        counts: dict[str, float] = {}
        total = 0
        for seq in aligned_seqs:
            c = seq[col]
            if c == "-":
                continue
            counts[c] = counts.get(c, 0) + 1
            total += 1
        # ラプラススムージング: 未観測の記号にも確率0を割り当てない
        smoothed = {a: (counts.get(a, 0) + 0.5) / (total + 0.5 * len(alphabet)) for a in alphabet}
        profile.append(smoothed)
    return profile
```

```typescript
const NEG_INF = -Infinity;

function logp(x: number): number {
  return x > 0 ? Math.log(x) : NEG_INF;
}

class ProfileHMM {
  matchEmissions: Map<string, number>[];
  n: number;
  insertPenalty: number;
  deletePenalty: number;

  constructor(matchEmissions: Map<string, number>[], insertPenalty = -2.0, deletePenalty = -2.0) {
    this.matchEmissions = matchEmissions;
    this.n = matchEmissions.length;
    this.insertPenalty = insertPenalty;
    this.deletePenalty = deletePenalty;
  }

  score(query: string): number {
    const n = this.n, m = query.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(NEG_INF));
    dp[0][0] = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        if (i === 0 && j === 0) continue;
        let best = NEG_INF;
        if (i > 0 && j > 0) {
          const emit = this.matchEmissions[i - 1].get(query[j - 1]) ?? 1e-6;
          best = Math.max(best, dp[i - 1][j - 1] + logp(emit));
        }
        if (i > 0) best = Math.max(best, dp[i - 1][j] + this.deletePenalty);
        if (j > 0) best = Math.max(best, dp[i][j - 1] + this.insertPenalty);
        dp[i][j] = best;
      }
    }
    return dp[n][m];
  }
}

function buildProfileFromAlignment(alignedSeqs: string[]): Map<string, number>[] {
  const length = alignedSeqs[0].length;
  const profile: Map<string, number>[] = [];
  const alphabet = "ACGT";
  for (let col = 0; col < length; col++) {
    const counts = new Map<string, number>();
    let total = 0;
    for (const seq of alignedSeqs) {
      const c = seq[col];
      if (c === "-") continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
      total++;
    }
    const smoothed = new Map<string, number>();
    for (const a of alphabet) smoothed.set(a, ((counts.get(a) ?? 0) + 0.5) / (total + 0.5 * alphabet.length));
    profile.push(smoothed);
  }
  return profile;
}
```

```cpp
#include <vector>
#include <string>
#include <map>
#include <cmath>
#include <limits>
#include <algorithm>

constexpr double NEG_INF = -std::numeric_limits<double>::infinity();

double logp(double x) {
    return x > 0 ? std::log(x) : NEG_INF;
}

class ProfileHMM {
public:
    std::vector<std::map<char, double>> matchEmissions;
    int n;
    double insertPenalty, deletePenalty;

    ProfileHMM(std::vector<std::map<char, double>> matchEmissions, double insertPenalty = -2.0, double deletePenalty = -2.0)
        : matchEmissions(std::move(matchEmissions)), n(static_cast<int>(this->matchEmissions.size())),
          insertPenalty(insertPenalty), deletePenalty(deletePenalty) {}

    double score(const std::string& query) const {
        int m = static_cast<int>(query.size());
        std::vector<std::vector<double>> dp(n + 1, std::vector<double>(m + 1, NEG_INF));
        dp[0][0] = 0;
        for (int i = 0; i <= n; i++) {
            for (int j = 0; j <= m; j++) {
                if (i == 0 && j == 0) continue;
                double best = NEG_INF;
                if (i > 0 && j > 0) {
                    auto it = matchEmissions[i - 1].find(query[j - 1]);
                    double emit = it != matchEmissions[i - 1].end() ? it->second : 1e-6;
                    best = std::max(best, dp[i - 1][j - 1] + logp(emit));
                }
                if (i > 0) best = std::max(best, dp[i - 1][j] + deletePenalty);
                if (j > 0) best = std::max(best, dp[i][j - 1] + insertPenalty);
                dp[i][j] = best;
            }
        }
        return dp[n][m];
    }
};

std::vector<std::map<char, double>> buildProfileFromAlignment(const std::vector<std::string>& alignedSeqs) {
    size_t length = alignedSeqs[0].size();
    std::vector<std::map<char, double>> profile;
    std::string alphabet = "ACGT";
    for (size_t col = 0; col < length; col++) {
        std::map<char, double> counts;
        int total = 0;
        for (const auto& seq : alignedSeqs) {
            char c = seq[col];
            if (c == '-') continue;
            counts[c] += 1;
            total++;
        }
        std::map<char, double> smoothed;
        for (char a : alphabet) smoothed[a] = (counts[a] + 0.5) / (total + 0.5 * alphabet.size());
        profile.push_back(smoothed);
    }
    return profile;
}
```

```rust
use std::collections::HashMap;

const NEG_INF: f64 = f64::NEG_INFINITY;

fn logp(x: f64) -> f64 {
    if x > 0.0 { x.ln() } else { NEG_INF }
}

struct ProfileHmm {
    match_emissions: Vec<HashMap<char, f64>>,
    n: usize,
    insert_penalty: f64,
    delete_penalty: f64,
}

impl ProfileHmm {
    fn new(match_emissions: Vec<HashMap<char, f64>>, insert_penalty: f64, delete_penalty: f64) -> Self {
        let n = match_emissions.len();
        ProfileHmm { match_emissions, n, insert_penalty, delete_penalty }
    }

    fn score(&self, query: &str) -> f64 {
        let chars: Vec<char> = query.chars().collect();
        let m = chars.len();
        let mut dp = vec![vec![NEG_INF; m + 1]; self.n + 1];
        dp[0][0] = 0.0;
        for i in 0..=self.n {
            for j in 0..=m {
                if i == 0 && j == 0 {
                    continue;
                }
                let mut best = NEG_INF;
                if i > 0 && j > 0 {
                    let emit = *self.match_emissions[i - 1].get(&chars[j - 1]).unwrap_or(&1e-6);
                    best = best.max(dp[i - 1][j - 1] + logp(emit));
                }
                if i > 0 {
                    best = best.max(dp[i - 1][j] + self.delete_penalty);
                }
                if j > 0 {
                    best = best.max(dp[i][j - 1] + self.insert_penalty);
                }
                dp[i][j] = best;
            }
        }
        dp[self.n][m]
    }
}

fn build_profile_from_alignment(aligned_seqs: &[&str]) -> Vec<HashMap<char, f64>> {
    let seqs: Vec<Vec<char>> = aligned_seqs.iter().map(|s| s.chars().collect()).collect();
    let length = seqs[0].len();
    let alphabet = ['A', 'C', 'G', 'T'];
    let mut profile = Vec::new();
    for col in 0..length {
        let mut counts: HashMap<char, f64> = HashMap::new();
        let mut total = 0.0;
        for seq in &seqs {
            let c = seq[col];
            if c == '-' {
                continue;
            }
            *counts.entry(c).or_insert(0.0) += 1.0;
            total += 1.0;
        }
        let mut smoothed = HashMap::new();
        for &a in &alphabet {
            let count = *counts.get(&a).unwrap_or(&0.0);
            smoothed.insert(a, (count + 0.5) / (total + 0.5 * alphabet.len() as f64));
        }
        profile.push(smoothed);
    }
    profile
}
```

```csharp
static class ProfileHmmAlgo
{
    const double NegInf = double.NegativeInfinity;
    static double Logp(double x) => x > 0 ? Math.Log(x) : NegInf;

    public class ProfileHmm
    {
        List<Dictionary<char, double>> matchEmissions; int n; double insertPenalty, deletePenalty;

        public ProfileHmm(List<Dictionary<char, double>> matchEmissions, double insertPenalty = -2.0, double deletePenalty = -2.0)
        {
            this.matchEmissions = matchEmissions; n = matchEmissions.Count;
            this.insertPenalty = insertPenalty; this.deletePenalty = deletePenalty;
        }

        public double Score(string query)
        {
            int m = query.Length;
            var dp = new double[n + 1, m + 1];
            for (int i = 0; i <= n; i++) for (int j = 0; j <= m; j++) dp[i, j] = NegInf;
            dp[0, 0] = 0;
            for (int i = 0; i <= n; i++)
            {
                for (int j = 0; j <= m; j++)
                {
                    if (i == 0 && j == 0) continue;
                    double best = NegInf;
                    if (i > 0 && j > 0)
                    {
                        double emit = matchEmissions[i - 1].GetValueOrDefault(query[j - 1], 1e-6);
                        best = Math.Max(best, dp[i - 1, j - 1] + Logp(emit));
                    }
                    if (i > 0) best = Math.Max(best, dp[i - 1, j] + deletePenalty);
                    if (j > 0) best = Math.Max(best, dp[i, j - 1] + insertPenalty);
                    dp[i, j] = best;
                }
            }
            return dp[n, m];
        }
    }

    public static List<Dictionary<char, double>> BuildProfileFromAlignment(List<string> alignedSeqs)
    {
        int length = alignedSeqs[0].Length;
        var profile = new List<Dictionary<char, double>>();
        const string alphabet = "ACGT";
        for (int col = 0; col < length; col++)
        {
            var counts = new Dictionary<char, double>();
            int total = 0;
            foreach (var seq in alignedSeqs)
            {
                char c = seq[col];
                if (c == '-') continue;
                counts[c] = counts.GetValueOrDefault(c, 0) + 1;
                total++;
            }
            var smoothed = new Dictionary<char, double>();
            foreach (var a in alphabet) smoothed[a] = (counts.GetValueOrDefault(a, 0) + 0.5) / (total + 0.5 * alphabet.Length);
            profile.Add(smoothed);
        }
        return profile;
    }
}
```
