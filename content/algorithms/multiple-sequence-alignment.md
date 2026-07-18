---
name: 多重配列アラインメント(累進的アラインメント)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(N² × L²)(近縁ペア距離計算)+O(N × L²)(累進的な統合、N配列・長さL)
summary: 3本以上の配列を同時に最適整列させる厳密計算は現実的でないため、まず似た配列同士から順にペアで統合していくことで実用的な多重アラインメントを構築する手法。
---

## 概要

[Needleman-Wunsch法](/algorithms/needleman-wunsch)は2本の配列の最適な整列を厳密に求めるが、この動的計画法を3本以上の配列にそのまま拡張すると、DPテーブルの次元が配列の本数だけ増えてしまい(`N`本の配列で`O(L^N)`)、現実的な本数の配列にはとても適用できない。累進的アラインメントは、この計算量の壁を回避するための実用的な戦略で、「最も似ている配列同士から順にペアで整列させ、その結果を土台にして残りの配列を1本ずつ追加していく」という、貪欲な統合の考え方に基づいている。

## 仕組み

1. 全ての配列ペアについて、[Needleman-Wunsch法](/algorithms/needleman-wunsch)(または高速な近似)で2配列間の距離(非類似度)を計算する
2. この距離行列をもとに、[UPGMA](/algorithms/upgma)や[近隣結合法](/algorithms/neighbor-joining)と同様の階層的クラスタリングの考え方でガイドツリー(どの順序で配列を統合していくべきかを示す木構造)を構築する——最も近い配列(またはグループ)同士から順に統合する
3. ガイドツリーの葉(個々の配列)から根に向かって、木の構造に従って統合を進める。2つの配列を統合するときは通常の[Needleman-Wunsch法](/algorithms/needleman-wunsch)、既に整列済みのグループとまだ1本の配列(または別のグループ)を統合するときは、整列済みグループを「プロファイル」(各列でどの文字がどんな頻度で現れるかの統計)として扱い、プロファイル同士のアラインメントを行う
4. 一度整列済みのグループに挿入されたギャップは、後の統合ステップでも基本的に保持される(「一度ギャップ、永遠にギャップ」という制約)——この制約により計算が実用的な速度に保たれる代わりに、初期段階での整列ミスが最終結果に伝播するリスクもある
5. 全ての配列がガイドツリーに従って統合されると、全配列が同じ列数に揃った多重配列アラインメントが完成する

## 特性・トレードオフ

- **計算量**: 全ペアの距離計算に`O(N² × L²)`、累進的な統合自体は`O(N × L²)`程度で済むため、配列の本数`N`が多くなっても、指数的な爆発を避けた実用的な計算量に収まる
- **厳密解ではなく貪欲な近似**: ガイドツリーの構築順序と「一度ギャップ、永遠にギャップ」という制約のため、得られる多重アラインメントは(3本以上の配列を同時に最適化する)真の最適解を保証しない。初期の統合(特に配列が少ない・ノイズが多い場合)での誤りが後の全体に影響を及ぼす
- **[UPGMA](/algorithms/upgma)・[近隣結合法](/algorithms/neighbor-joining)との相互依存関係**: 多重配列アラインメントはガイドツリーの構築に系統樹推定の手法を使う一方、系統樹推定自体は多重配列アラインメントの結果を入力として使うことが多い——実務では両者を反復的に改善し合う(アラインメント→系統樹→アラインメントの再構築)ワークフローがよく使われる
- **使いどころ**: 複数の近縁種のタンパク質・DNA配列を比較して保存された機能領域を特定する、系統解析の前処理、タンパク質構造予測における進化的保存パターンの活用(ClustalW、MUSCLE、MAFFTなどの実用ツールがこの累進的アラインメントの考え方を発展させている)

## 実装例

```python
def nw_score_only(a: str, b: str, match: int = 1, mismatch: int = -1, gap: int = -1) -> int:
    """2配列間のNeedleman-Wunschスコアのみを返す(距離行列の計算用)"""
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
    return dp[n][m]


def profile_col_score(col_a: list[str], col_b: list[str], match: int = 1, mismatch: int = -1) -> float:
    """2つのプロファイル列の平均対応付けスコア(ギャップ同士は無視する)"""
    total, count = 0, 0
    for ca in col_a:
        for cb in col_b:
            if ca == "-" or cb == "-":
                continue
            total += match if ca == cb else mismatch
            count += 1
    return total / count if count > 0 else 0.0


def align_profiles(prof_a: list[list[str]], prof_b: list[list[str]], gap: float = -1) -> list[list[str]]:
    """2つのプロファイル(整列済みグループ)を通常のNW法と同じDPで整列する"""
    n, m = len(prof_a), len(prof_b)
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i * gap
    for j in range(m + 1):
        dp[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = profile_col_score(prof_a[i - 1], prof_b[j - 1])
            dp[i][j] = max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap)

    i, j = n, m
    merged: list[list[str]] = []
    gap_a = ["-"] * len(prof_a[0]) if prof_a else []
    gap_b = ["-"] * len(prof_b[0]) if prof_b else []
    while i > 0 or j > 0:
        s = profile_col_score(prof_a[i - 1], prof_b[j - 1]) if i > 0 and j > 0 else 0.0
        if i > 0 and j > 0 and abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-9:
            merged.append(prof_a[i - 1] + prof_b[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and abs(dp[i][j] - (dp[i - 1][j] + gap)) < 1e-9:
            merged.append(prof_a[i - 1] + gap_b)
            i -= 1
        else:
            merged.append(gap_a + prof_b[j - 1])
            j -= 1
    merged.reverse()
    return merged


def build_guide_tree_order(seqs: list[str]) -> list[tuple[frozenset[int], frozenset[int]]]:
    """UPGMA風の平均連結法で、どの順にグループを統合するかを決める"""
    n = len(seqs)
    dist = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = -nw_score_only(seqs[i], seqs[j])  # NWスコアが高い(似ている)ほど距離を小さく
            dist[i][j] = dist[j][i] = d

    groups: list[frozenset[int]] = [frozenset([i]) for i in range(n)]
    merges: list[tuple[frozenset[int], frozenset[int]]] = []

    def group_dist(g1: frozenset[int], g2: frozenset[int]) -> float:
        total = sum(dist[x][y] for x in g1 for y in g2)
        return total / (len(g1) * len(g2))

    while len(groups) > 1:
        best_pair, best_d = None, float("inf")
        for a in range(len(groups)):
            for b in range(a + 1, len(groups)):
                d = group_dist(groups[a], groups[b])
                if d < best_d:
                    best_d, best_pair = d, (a, b)
        a, b = best_pair
        merges.append((groups[a], groups[b]))
        new_group = groups[a] | groups[b]
        groups = [g for k, g in enumerate(groups) if k not in (a, b)] + [new_group]
    return merges


def progressive_msa(seqs: list[str]) -> list[str]:
    n = len(seqs)
    merges = build_guide_tree_order(seqs)
    profiles: dict[frozenset[int], list[list[str]]] = {}
    members: dict[frozenset[int], list[int]] = {}
    for i in range(n):
        g = frozenset([i])
        profiles[g] = [[c] for c in seqs[i]]
        members[g] = [i]

    # ガイドツリーに従って葉から根へ、プロファイル同士を累進的に統合する
    for g1, g2 in merges:
        merged_cols = align_profiles(profiles[g1], profiles[g2])
        profiles[g1 | g2] = merged_cols
        members[g1 | g2] = members[g1] + members[g2]

    full = frozenset(range(n))
    final_cols = profiles[full]
    order = members[full]
    aligned = [""] * n
    for col in final_cols:
        for pos, seq_idx in enumerate(order):
            aligned[seq_idx] += col[pos]
    return aligned
```

```typescript
function nwScoreOnly(a: string, b: string, match = 1, mismatch = -1, gap = -1): number {
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
  return dp[n][m];
}

function profileColScore(colA: string[], colB: string[], match = 1, mismatch = -1): number {
  let total = 0;
  let count = 0;
  for (const ca of colA) {
    for (const cb of colB) {
      if (ca === "-" || cb === "-") continue;
      total += ca === cb ? match : mismatch;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

function alignProfiles(profA: string[][], profB: string[][], gap = -1): string[][] {
  const n = profA.length;
  const m = profB.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gap;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = profileColScore(profA[i - 1], profB[j - 1]);
      dp[i][j] = Math.max(dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap);
    }
  }

  let i = n;
  let j = m;
  const merged: string[][] = [];
  const gapA = profA.length > 0 ? new Array(profA[0].length).fill("-") : [];
  const gapB = profB.length > 0 ? new Array(profB[0].length).fill("-") : [];
  while (i > 0 || j > 0) {
    const s = i > 0 && j > 0 ? profileColScore(profA[i - 1], profB[j - 1]) : 0;
    if (i > 0 && j > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-9) {
      merged.push([...profA[i - 1], ...profB[j - 1]]);
      i--; j--;
    } else if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + gap)) < 1e-9) {
      merged.push([...profA[i - 1], ...gapB]);
      i--;
    } else {
      merged.push([...gapA, ...profB[j - 1]]);
      j--;
    }
  }
  merged.reverse();
  return merged;
}

function buildGuideTreeOrder(seqs: string[]): [Set<number>, Set<number>][] {
  const n = seqs.length;
  const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = -nwScoreOnly(seqs[i], seqs[j]);
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }
  let groups: Set<number>[] = Array.from({ length: n }, (_, i) => new Set([i]));
  const merges: [Set<number>, Set<number>][] = [];
  const groupDist = (g1: Set<number>, g2: Set<number>) => {
    let total = 0;
    let cnt = 0;
    for (const x of g1) {
      for (const y of g2) {
        total += dist[x][y];
        cnt++;
      }
    }
    return total / cnt;
  };
  while (groups.length > 1) {
    let bestA = 0;
    let bestB = 1;
    let bestD = Infinity;
    for (let a = 0; a < groups.length; a++) {
      for (let b = a + 1; b < groups.length; b++) {
        const d = groupDist(groups[a], groups[b]);
        if (d < bestD) {
          bestD = d;
          bestA = a;
          bestB = b;
        }
      }
    }
    merges.push([groups[bestA], groups[bestB]]);
    const newGroup = new Set([...groups[bestA], ...groups[bestB]]);
    groups = groups.filter((_, k) => k !== bestA && k !== bestB);
    groups.push(newGroup);
  }
  return merges;
}

function progressiveMsa(seqs: string[]): string[] {
  const n = seqs.length;
  const merges = buildGuideTreeOrder(seqs);
  const keyOf = (s: Set<number>) => [...s].sort((a, b) => a - b).join(",");
  const profiles = new Map<string, string[][]>();
  const members = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const g = new Set([i]);
    profiles.set(keyOf(g), [...seqs[i]].map((c) => [c]));
    members.set(keyOf(g), [i]);
  }
  for (const [g1, g2] of merges) {
    const k1 = keyOf(g1);
    const k2 = keyOf(g2);
    const mergedCols = alignProfiles(profiles.get(k1)!, profiles.get(k2)!);
    const newGroup = new Set([...g1, ...g2]);
    const kNew = keyOf(newGroup);
    profiles.set(kNew, mergedCols);
    members.set(kNew, [...members.get(k1)!, ...members.get(k2)!]);
  }
  const fullKey = keyOf(new Set(Array.from({ length: n }, (_, i) => i)));
  const finalCols = profiles.get(fullKey)!;
  const order = members.get(fullKey)!;
  const aligned = new Array(n).fill("");
  for (const col of finalCols) {
    order.forEach((seqIdx, pos) => {
      aligned[seqIdx] += col[pos];
    });
  }
  return aligned;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <map>
#include <algorithm>
#include <cmath>
#include <limits>

int nwScoreOnly(const std::string& a, const std::string& b, int match = 1, int mismatch = -1, int gap = -1) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0][j] = j * gap;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            int s = (a[i - 1] == b[j - 1]) ? match : mismatch;
            dp[i][j] = std::max({dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap});
        }
    return dp[n][m];
}

using Profile = std::vector<std::vector<char>>;

double profileColScore(const std::vector<char>& colA, const std::vector<char>& colB, int match = 1, int mismatch = -1) {
    double total = 0.0;
    int count = 0;
    for (char ca : colA)
        for (char cb : colB) {
            if (ca == '-' || cb == '-') continue;
            total += (ca == cb) ? match : mismatch;
            count++;
        }
    return count > 0 ? total / count : 0.0;
}

Profile alignProfiles(const Profile& profA, const Profile& profB, double gap = -1) {
    int n = static_cast<int>(profA.size());
    int m = static_cast<int>(profB.size());
    std::vector<std::vector<double>> dp(n + 1, std::vector<double>(m + 1, 0.0));
    for (int i = 0; i <= n; i++) dp[i][0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0][j] = j * gap;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            double s = profileColScore(profA[i - 1], profB[j - 1]);
            dp[i][j] = std::max({dp[i - 1][j - 1] + s, dp[i - 1][j] + gap, dp[i][j - 1] + gap});
        }

    std::vector<char> gapA(profA.empty() ? 0 : profA[0].size(), '-');
    std::vector<char> gapB(profB.empty() ? 0 : profB[0].size(), '-');
    Profile merged;
    int i = n, j = m;
    while (i > 0 || j > 0) {
        double s = (i > 0 && j > 0) ? profileColScore(profA[i - 1], profB[j - 1]) : 0.0;
        if (i > 0 && j > 0 && std::abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-9) {
            std::vector<char> col = profA[i - 1];
            col.insert(col.end(), profB[j - 1].begin(), profB[j - 1].end());
            merged.push_back(col);
            i--; j--;
        } else if (i > 0 && std::abs(dp[i][j] - (dp[i - 1][j] + gap)) < 1e-9) {
            std::vector<char> col = profA[i - 1];
            col.insert(col.end(), gapB.begin(), gapB.end());
            merged.push_back(col);
            i--;
        } else {
            std::vector<char> col = gapA;
            col.insert(col.end(), profB[j - 1].begin(), profB[j - 1].end());
            merged.push_back(col);
            j--;
        }
    }
    std::reverse(merged.begin(), merged.end());
    return merged;
}

// ガイドツリーの統合順(平均連結法)を、集合のペアの列として返す
std::vector<std::pair<std::set<int>, std::set<int>>> buildGuideTreeOrder(const std::vector<std::string>& seqs) {
    int n = static_cast<int>(seqs.size());
    std::vector<std::vector<double>> dist(n, std::vector<double>(n, 0.0));
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            double d = -nwScoreOnly(seqs[i], seqs[j]);
            dist[i][j] = d;
            dist[j][i] = d;
        }
    std::vector<std::set<int>> groups;
    for (int i = 0; i < n; i++) groups.push_back({i});
    std::vector<std::pair<std::set<int>, std::set<int>>> merges;

    auto groupDist = [&](const std::set<int>& g1, const std::set<int>& g2) {
        double total = 0.0;
        for (int x : g1)
            for (int y : g2) total += dist[x][y];
        return total / (g1.size() * g2.size());
    };

    while (groups.size() > 1) {
        int bestA = 0, bestB = 1;
        double bestD = std::numeric_limits<double>::infinity();
        for (size_t a = 0; a < groups.size(); a++)
            for (size_t b = a + 1; b < groups.size(); b++) {
                double d = groupDist(groups[a], groups[b]);
                if (d < bestD) { bestD = d; bestA = static_cast<int>(a); bestB = static_cast<int>(b); }
            }
        merges.push_back({groups[bestA], groups[bestB]});
        std::set<int> merged = groups[bestA];
        merged.insert(groups[bestB].begin(), groups[bestB].end());
        std::vector<std::set<int>> next;
        for (size_t k = 0; k < groups.size(); k++)
            if (static_cast<int>(k) != bestA && static_cast<int>(k) != bestB) next.push_back(groups[k]);
        next.push_back(merged);
        groups = next;
    }
    return merges;
}

std::string keyOf(const std::set<int>& s) {
    std::string key;
    for (int x : s) key += std::to_string(x) + ",";
    return key;
}

std::vector<std::string> progressiveMsa(const std::vector<std::string>& seqs) {
    int n = static_cast<int>(seqs.size());
    auto merges = buildGuideTreeOrder(seqs);
    std::map<std::string, Profile> profiles;
    std::map<std::string, std::vector<int>> members;
    for (int i = 0; i < n; i++) {
        std::set<int> g = {i};
        Profile p;
        for (char c : seqs[i]) p.push_back({c});
        profiles[keyOf(g)] = p;
        members[keyOf(g)] = {i};
    }
    for (auto& [g1, g2] : merges) {
        std::string k1 = keyOf(g1), k2 = keyOf(g2);
        Profile mergedCols = alignProfiles(profiles[k1], profiles[k2]);
        std::set<int> newGroup = g1;
        newGroup.insert(g2.begin(), g2.end());
        std::string kNew = keyOf(newGroup);
        profiles[kNew] = mergedCols;
        std::vector<int> mem = members[k1];
        mem.insert(mem.end(), members[k2].begin(), members[k2].end());
        members[kNew] = mem;
    }
    std::set<int> full;
    for (int i = 0; i < n; i++) full.insert(i);
    Profile finalCols = profiles[keyOf(full)];
    std::vector<int> order = members[keyOf(full)];
    std::vector<std::string> aligned(n, "");
    for (auto& col : finalCols)
        for (size_t pos = 0; pos < order.size(); pos++)
            aligned[order[pos]] += col[pos];
    return aligned;
}
```

```rust
use std::collections::{BTreeSet, HashMap};

fn nw_score_only(a: &str, b: &str, match_score: i32, mismatch: i32, gap: i32) -> i32 {
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
            dp[i][j] = (dp[i - 1][j - 1] + s).max(dp[i - 1][j] + gap).max(dp[i][j - 1] + gap);
        }
    }
    dp[n][m]
}

type Profile = Vec<Vec<char>>;

fn profile_col_score(col_a: &[char], col_b: &[char], match_score: f64, mismatch: f64) -> f64 {
    let mut total = 0.0;
    let mut count = 0;
    for &ca in col_a {
        for &cb in col_b {
            if ca == '-' || cb == '-' {
                continue;
            }
            total += if ca == cb { match_score } else { mismatch };
            count += 1;
        }
    }
    if count > 0 {
        total / count as f64
    } else {
        0.0
    }
}

fn align_profiles(prof_a: &Profile, prof_b: &Profile, gap: f64) -> Profile {
    let n = prof_a.len();
    let m = prof_b.len();
    let mut dp = vec![vec![0.0; m + 1]; n + 1];
    for i in 0..=n {
        dp[i][0] = i as f64 * gap;
    }
    for j in 0..=m {
        dp[0][j] = j as f64 * gap;
    }
    for i in 1..=n {
        for j in 1..=m {
            let s = profile_col_score(&prof_a[i - 1], &prof_b[j - 1], 1.0, -1.0);
            dp[i][j] = (dp[i - 1][j - 1] + s).max(dp[i - 1][j] + gap).max(dp[i][j - 1] + gap);
        }
    }

    let gap_a = vec!['-'; if prof_a.is_empty() { 0 } else { prof_a[0].len() }];
    let gap_b = vec!['-'; if prof_b.is_empty() { 0 } else { prof_b[0].len() }];
    let mut merged: Profile = Vec::new();
    let (mut i, mut j) = (n, m);
    while i > 0 || j > 0 {
        let s = if i > 0 && j > 0 {
            profile_col_score(&prof_a[i - 1], &prof_b[j - 1], 1.0, -1.0)
        } else {
            0.0
        };
        if i > 0 && j > 0 && (dp[i][j] - (dp[i - 1][j - 1] + s)).abs() < 1e-9 {
            let mut col = prof_a[i - 1].clone();
            col.extend(prof_b[j - 1].clone());
            merged.push(col);
            i -= 1;
            j -= 1;
        } else if i > 0 && (dp[i][j] - (dp[i - 1][j] + gap)).abs() < 1e-9 {
            let mut col = prof_a[i - 1].clone();
            col.extend(gap_b.clone());
            merged.push(col);
            i -= 1;
        } else {
            let mut col = gap_a.clone();
            col.extend(prof_b[j - 1].clone());
            merged.push(col);
            j -= 1;
        }
    }
    merged.reverse();
    merged
}

// ガイドツリーの統合順(平均連結法)。集合を要素の昇順ソート済みVecで表す
fn build_guide_tree_order(seqs: &[String]) -> Vec<(BTreeSet<usize>, BTreeSet<usize>)> {
    let n = seqs.len();
    let mut dist = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in (i + 1)..n {
            let d = -(nw_score_only(&seqs[i], &seqs[j], 1, -1, -1) as f64);
            dist[i][j] = d;
            dist[j][i] = d;
        }
    }
    let mut groups: Vec<BTreeSet<usize>> = (0..n).map(|i| BTreeSet::from([i])).collect();
    let mut merges = Vec::new();

    let group_dist = |g1: &BTreeSet<usize>, g2: &BTreeSet<usize>, dist: &Vec<Vec<f64>>| {
        let mut total = 0.0;
        for &x in g1 {
            for &y in g2 {
                total += dist[x][y];
            }
        }
        total / (g1.len() * g2.len()) as f64
    };

    while groups.len() > 1 {
        let mut best_a = 0;
        let mut best_b = 1;
        let mut best_d = f64::INFINITY;
        for a in 0..groups.len() {
            for b in (a + 1)..groups.len() {
                let d = group_dist(&groups[a], &groups[b], &dist);
                if d < best_d {
                    best_d = d;
                    best_a = a;
                    best_b = b;
                }
            }
        }
        merges.push((groups[best_a].clone(), groups[best_b].clone()));
        let mut merged: BTreeSet<usize> = groups[best_a].clone();
        merged.extend(groups[best_b].iter());
        let mut next: Vec<BTreeSet<usize>> = groups
            .iter()
            .enumerate()
            .filter(|(k, _)| *k != best_a && *k != best_b)
            .map(|(_, g)| g.clone())
            .collect();
        next.push(merged);
        groups = next;
    }
    merges
}

fn progressive_msa(seqs: &[String]) -> Vec<String> {
    let n = seqs.len();
    let merges = build_guide_tree_order(seqs);
    let mut profiles: HashMap<BTreeSet<usize>, Profile> = HashMap::new();
    let mut members: HashMap<BTreeSet<usize>, Vec<usize>> = HashMap::new();
    for i in 0..n {
        let g = BTreeSet::from([i]);
        profiles.insert(g.clone(), seqs[i].chars().map(|c| vec![c]).collect());
        members.insert(g, vec![i]);
    }
    for (g1, g2) in merges {
        let merged_cols = align_profiles(&profiles[&g1], &profiles[&g2], -1.0);
        let mut new_group = g1.clone();
        new_group.extend(g2.iter());
        let mut mem = members[&g1].clone();
        mem.extend(members[&g2].iter());
        profiles.insert(new_group.clone(), merged_cols);
        members.insert(new_group, mem);
    }
    let full: BTreeSet<usize> = (0..n).collect();
    let final_cols = &profiles[&full];
    let order = &members[&full];
    let mut aligned = vec![String::new(); n];
    for col in final_cols {
        for (pos, &seq_idx) in order.iter().enumerate() {
            aligned[seq_idx].push(col[pos]);
        }
    }
    aligned
}
```

```csharp
static int NwScoreOnly(string a, string b, int match = 1, int mismatch = -1, int gap = -1)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0, j] = j * gap;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
        {
            int s = a[i - 1] == b[j - 1] ? match : mismatch;
            dp[i, j] = Math.Max(dp[i - 1, j - 1] + s, Math.Max(dp[i - 1, j] + gap, dp[i, j - 1] + gap));
        }
    return dp[n, m];
}

static double ProfileColScore(List<char> colA, List<char> colB, int match = 1, int mismatch = -1)
{
    double total = 0; int count = 0;
    foreach (var ca in colA)
        foreach (var cb in colB)
        {
            if (ca == '-' || cb == '-') continue;
            total += ca == cb ? match : mismatch;
            count++;
        }
    return count > 0 ? total / count : 0.0;
}

static List<List<char>> AlignProfiles(List<List<char>> profA, List<List<char>> profB, double gap = -1)
{
    int n = profA.Count, m = profB.Count;
    var dp = new double[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i * gap;
    for (int j = 0; j <= m; j++) dp[0, j] = j * gap;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
        {
            double s = ProfileColScore(profA[i - 1], profB[j - 1]);
            dp[i, j] = Math.Max(dp[i - 1, j - 1] + s, Math.Max(dp[i - 1, j] + gap, dp[i, j - 1] + gap));
        }

    var gapA = profA.Count > 0 ? Enumerable.Repeat('-', profA[0].Count).ToList() : new List<char>();
    var gapB = profB.Count > 0 ? Enumerable.Repeat('-', profB[0].Count).ToList() : new List<char>();
    var merged = new List<List<char>>();
    int ii = n, jj = m;
    while (ii > 0 || jj > 0)
    {
        double s = (ii > 0 && jj > 0) ? ProfileColScore(profA[ii - 1], profB[jj - 1]) : 0;
        if (ii > 0 && jj > 0 && Math.Abs(dp[ii, jj] - (dp[ii - 1, jj - 1] + s)) < 1e-9)
        {
            var col = new List<char>(profA[ii - 1]); col.AddRange(profB[jj - 1]);
            merged.Add(col); ii--; jj--;
        }
        else if (ii > 0 && Math.Abs(dp[ii, jj] - (dp[ii - 1, jj] + gap)) < 1e-9)
        {
            var col = new List<char>(profA[ii - 1]); col.AddRange(gapB);
            merged.Add(col); ii--;
        }
        else
        {
            var col = new List<char>(gapA); col.AddRange(profB[jj - 1]);
            merged.Add(col); jj--;
        }
    }
    merged.Reverse();
    return merged;
}

static string KeyOf(HashSet<int> s) => string.Join(",", s.OrderBy(x => x));

static string[] ProgressiveMsa(string[] seqs)
{
    int n = seqs.Length;
    var merges = BuildGuideTreeOrder(seqs);
    var profiles = new Dictionary<string, List<List<char>>>();
    var members = new Dictionary<string, List<int>>();
    for (int i = 0; i < n; i++)
    {
        var g = new HashSet<int> { i };
        profiles[KeyOf(g)] = seqs[i].Select(c => new List<char> { c }).ToList();
        members[KeyOf(g)] = new List<int> { i };
    }
    foreach (var (g1, g2) in merges)
    {
        string k1 = KeyOf(g1), k2 = KeyOf(g2);
        var mergedCols = AlignProfiles(profiles[k1], profiles[k2]);
        var newGroup = new HashSet<int>(g1); newGroup.UnionWith(g2);
        string kNew = KeyOf(newGroup);
        profiles[kNew] = mergedCols;
        var mem = new List<int>(members[k1]); mem.AddRange(members[k2]);
        members[kNew] = mem;
    }
    var fullKey = KeyOf(new HashSet<int>(Enumerable.Range(0, n)));
    var finalCols = profiles[fullKey];
    var order = members[fullKey];
    var aligned = new string[n];
    for (int i = 0; i < n; i++) aligned[i] = "";
    foreach (var col in finalCols)
        for (int pos = 0; pos < order.Count; pos++)
            aligned[order[pos]] += col[pos];
    return aligned;
}

// ガイドツリーの統合順(平均連結法)を求める
static List<(HashSet<int>, HashSet<int>)> BuildGuideTreeOrder(string[] seqs)
{
    int n = seqs.Length;
    var dist = new double[n, n];
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
        {
            double d = -NwScoreOnly(seqs[i], seqs[j]);
            dist[i, j] = d; dist[j, i] = d;
        }
    var groups = new List<HashSet<int>>();
    for (int i = 0; i < n; i++) groups.Add(new HashSet<int> { i });
    var merges = new List<(HashSet<int>, HashSet<int>)>();
    double GroupDist(HashSet<int> g1, HashSet<int> g2)
    {
        double total = 0; int cnt = 0;
        foreach (var x in g1) foreach (var y in g2) { total += dist[x, y]; cnt++; }
        return total / cnt;
    }
    while (groups.Count > 1)
    {
        int bestA = 0, bestB = 1; double bestD = double.MaxValue;
        for (int a = 0; a < groups.Count; a++)
            for (int b = a + 1; b < groups.Count; b++)
            {
                double d = GroupDist(groups[a], groups[b]);
                if (d < bestD) { bestD = d; bestA = a; bestB = b; }
            }
        merges.Add((groups[bestA], groups[bestB]));
        var newGroup = new HashSet<int>(groups[bestA]);
        newGroup.UnionWith(groups[bestB]);
        var next = new List<HashSet<int>>();
        for (int k = 0; k < groups.Count; k++) if (k != bestA && k != bestB) next.Add(groups[k]);
        next.Add(newGroup);
        groups = next;
    }
    return merges;
}
```
