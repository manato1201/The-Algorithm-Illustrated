---
name: BLASTアルゴリズム
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(データベースサイズ)(シード検索、ヒューリスティック)
summary: 短い完全一致断片(シード)をまず高速に見つけ、有望な箇所だけを厳密なアラインメントで精査することで、巨大なデータベース検索を現実的な時間に収める近似的な配列検索法。
---

## 概要

[Smith-Waterman法](/algorithms/smith-waterman)は厳密な局所アラインメントを保証するが、`O(n×m)`の計算量は、クエリ配列を数百万〜数十億塩基対の巨大なゲノムデータベース全体と比較するには重すぎる。1990年に発表されたBLAST(Basic Local Alignment Search Tool)は、「本当に似ている配列同士は、必ずどこかに短い完全一致(または高スコア一致)の断片を含むはずだ」という統計的な洞察に基づき、まずこの短い断片(シード)を高速に検索し、シードが見つかった有望な箇所についてのみ厳密なアラインメントを行うという2段階の絞り込みで、実用上十分な精度を保ちながら劇的に高速化する、ヒューリスティック(近似)アルゴリズムである。

## 仕組み

1. クエリ配列を、固定長`w`(タンパク質なら通常3残基程度)の短い断片(k-mer、[k-merカウント](/algorithms/k-mer-counting)と同じ単位の分割)に分解する
2. 各断片について、スコア行列上で高スコアになりうる類似断片のリストを事前に生成する(完全一致だけでなく、化学的に近い置換まで許容する)
3. これらの断片(シード)を、あらかじめ[Aho-Corasick法](/algorithms/aho-corasick)のようなインデックス構造やハッシュテーブルで索引化されたデータベース配列に対して高速に検索し、一致する箇所(ヒット)を全て記録する
4. 2つのヒットが同じ対角線(配列間の同じオフセット)上で近い位置に見つかった場合、それらを繋げて延長を試みる(**シード・アンド・エクステンド**)。スコアが下がり続ける前に延長を打ち切る
5. 延長して得られた候補領域について、[Smith-Waterman法](/algorithms/smith-waterman)に近い厳密なアラインメントを行い、統計的に有意なスコア(偶然にこの一致が起こる確率、E値)を計算して、有意な結果だけを最終的に報告する

## 特性・トレードオフ

- **計算量**: シード検索の段階はデータベースサイズに対してほぼ線形かそれ以下(索引構造による高速化次第)で済み、厳密なアラインメントは有望な少数の候補領域だけに限定されるため、全体として巨大なデータベースに対しても現実的な時間で検索が完了する
- **厳密解の保証はない(ヒューリスティック)**: [Smith-Waterman法](/algorithms/smith-waterman)のような数学的な最適解の保証はなく、シードが短すぎたり分断されすぎている本当に類似した配列を見逃す(偽陰性)可能性が理論上ある。しかし実用上のパラメータ調整により、生物学的に意味のある類似性はほぼ確実に検出できる
- **感度と速度のトレードオフ**: シードの長さ`w`を短くすると感度は上がるが、偶然の一致(ノイズ)が増えて検索が遅くなる。逆に長くすると高速だが、弱い類似性を見逃しやすくなる——この設定は用途(近縁種の比較か、遠縁の類似性探索か)によって調整される
- **使いどころ**: NCBIのGenBankをはじめとする巨大な生物配列データベースに対する検索(未知の配列が何のタンパク質・遺伝子に類似しているかを調べる)、ゲノムアノテーション(新しく解読されたゲノム配列の機能推定)、法医学的なDNA配列の同定など、バイオインフォマティクスにおける最も広く使われるツールのひとつ

## 実装例

```python
MATCH = 1
MISMATCH = -1
X_DROP = 4  # ベストスコアからこれだけ下がったら延長を打ち切る


def _build_kmer_index(db: str, k: int) -> dict[str, list[int]]:
    index: dict[str, list[int]] = {}
    for i in range(len(db) - k + 1):
        index.setdefault(db[i : i + k], []).append(i)
    return index


def _extend_seed(query: str, db: str, qi: int, di: int) -> int:
    # 右方向への延長
    best_score = 0
    score = 0
    q, d = qi, di
    while q < len(query) and d < len(db):
        score += MATCH if query[q] == db[d] else MISMATCH
        if score > best_score:
            best_score = score
        if best_score - score > X_DROP:
            break
        q += 1
        d += 1

    # 左方向への延長
    best_left = 0
    score = 0
    q, d = qi - 1, di - 1
    while q >= 0 and d >= 0:
        score += MATCH if query[q] == db[d] else MISMATCH
        if score > best_left:
            best_left = score
        if best_left - score > X_DROP:
            break
        q -= 1
        d -= 1

    return best_score + best_left


def blast_search(query: str, db: str, k: int = 4) -> int | None:
    index = _build_kmer_index(db, k)
    best: int | None = None
    seen: set[tuple[int, int]] = set()

    for qi in range(len(query) - k + 1):
        kmer = query[qi : qi + k]
        for di in index.get(kmer, []):
            if (qi, di) in seen:
                continue
            seen.add((qi, di))
            score = _extend_seed(query, db, qi, di)
            if best is None or score > best:
                best = score
    return best
```

```typescript
const MATCH = 1;
const MISMATCH = -1;
const X_DROP = 4; // ベストスコアからこれだけ下がったら延長を打ち切る

function buildKmerIndex(db: string, k: number): Map<string, number[]> {
  const index = new Map<string, number[]>();
  for (let i = 0; i + k <= db.length; i++) {
    const kmer = db.slice(i, i + k);
    if (!index.has(kmer)) index.set(kmer, []);
    index.get(kmer)!.push(i);
  }
  return index;
}

function extendSeed(query: string, db: string, qi: number, di: number): number {
  let bestScore = 0;
  let score = 0;
  let q = qi;
  let d = di;
  while (q < query.length && d < db.length) {
    score += query[q] === db[d] ? MATCH : MISMATCH;
    if (score > bestScore) bestScore = score;
    if (bestScore - score > X_DROP) break;
    q++;
    d++;
  }

  let bestLeft = 0;
  score = 0;
  q = qi - 1;
  d = di - 1;
  while (q >= 0 && d >= 0) {
    score += query[q] === db[d] ? MATCH : MISMATCH;
    if (score > bestLeft) bestLeft = score;
    if (bestLeft - score > X_DROP) break;
    q--;
    d--;
  }

  return bestScore + bestLeft;
}

function blastSearch(query: string, db: string, k: number): number | null {
  const index = buildKmerIndex(db, k);
  let best: number | null = null;
  const seen = new Set<string>();

  for (let qi = 0; qi + k <= query.length; qi++) {
    const kmer = query.slice(qi, qi + k);
    for (const di of index.get(kmer) ?? []) {
      const key = `${qi},${di}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const score = extendSeed(query, db, qi, di);
      if (best === null || score > best) best = score;
    }
  }
  return best;
}
```

```cpp
#include <optional>
#include <set>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

constexpr int MATCH = 1;
constexpr int MISMATCH = -1;
constexpr int X_DROP = 4;  // ベストスコアからこれだけ下がったら延長を打ち切る

std::unordered_map<std::string, std::vector<int>> buildKmerIndex(const std::string& db, int k) {
    std::unordered_map<std::string, std::vector<int>> index;
    for (int i = 0; i + k <= static_cast<int>(db.size()); i++) {
        index[db.substr(i, k)].push_back(i);
    }
    return index;
}

int extendSeed(const std::string& query, const std::string& db, int qi, int di) {
    int bestScore = 0, score = 0, q = qi, d = di;
    while (q < static_cast<int>(query.size()) && d < static_cast<int>(db.size())) {
        score += query[q] == db[d] ? MATCH : MISMATCH;
        if (score > bestScore) bestScore = score;
        if (bestScore - score > X_DROP) break;
        q++;
        d++;
    }

    int bestLeft = 0;
    score = 0;
    q = qi - 1;
    d = di - 1;
    while (q >= 0 && d >= 0) {
        score += query[q] == db[d] ? MATCH : MISMATCH;
        if (score > bestLeft) bestLeft = score;
        if (bestLeft - score > X_DROP) break;
        q--;
        d--;
    }

    return bestScore + bestLeft;
}

std::optional<int> blastSearch(const std::string& query, const std::string& db, int k) {
    auto index = buildKmerIndex(db, k);
    std::optional<int> best;
    std::set<std::pair<int, int>> seen;

    for (int qi = 0; qi + k <= static_cast<int>(query.size()); qi++) {
        std::string kmer = query.substr(qi, k);
        auto it = index.find(kmer);
        if (it == index.end()) continue;
        for (int di : it->second) {
            if (!seen.insert({qi, di}).second) continue;
            int score = extendSeed(query, db, qi, di);
            if (!best.has_value() || score > *best) best = score;
        }
    }
    return best;
}
```

```rust
use std::collections::{HashMap, HashSet};

const MATCH: i32 = 1;
const MISMATCH: i32 = -1;
const X_DROP: i32 = 4; // ベストスコアからこれだけ下がったら延長を打ち切る

fn build_kmer_index(db: &str, k: usize) -> HashMap<&str, Vec<usize>> {
    let bytes = db.as_bytes();
    let mut index: HashMap<&str, Vec<usize>> = HashMap::new();
    if bytes.len() < k {
        return index;
    }
    for i in 0..=bytes.len() - k {
        index.entry(&db[i..i + k]).or_default().push(i);
    }
    index
}

fn extend_seed(query: &[u8], db: &[u8], qi: usize, di: usize) -> i32 {
    let mut best_score = 0;
    let mut score = 0;
    let mut q = qi;
    let mut d = di;
    while q < query.len() && d < db.len() {
        score += if query[q] == db[d] { MATCH } else { MISMATCH };
        if score > best_score {
            best_score = score;
        }
        if best_score - score > X_DROP {
            break;
        }
        q += 1;
        d += 1;
    }

    let mut best_left = 0;
    let mut score = 0;
    let mut q = qi as i64 - 1;
    let mut d = di as i64 - 1;
    while q >= 0 && d >= 0 {
        score += if query[q as usize] == db[d as usize] { MATCH } else { MISMATCH };
        if score > best_left {
            best_left = score;
        }
        if best_left - score > X_DROP {
            break;
        }
        q -= 1;
        d -= 1;
    }

    best_score + best_left
}

fn blast_search(query: &str, db: &str, k: usize) -> Option<i32> {
    let index = build_kmer_index(db, k);
    let query_bytes = query.as_bytes();
    let db_bytes = db.as_bytes();
    let mut best: Option<i32> = None;
    let mut seen: HashSet<(usize, usize)> = HashSet::new();

    if query_bytes.len() < k {
        return None;
    }
    for qi in 0..=query_bytes.len() - k {
        let kmer = &query[qi..qi + k];
        if let Some(positions) = index.get(kmer) {
            for &di in positions {
                if !seen.insert((qi, di)) {
                    continue;
                }
                let score = extend_seed(query_bytes, db_bytes, qi, di);
                best = Some(best.map_or(score, |b| b.max(score)));
            }
        }
    }
    best
}
```

```csharp
static class Blast
{
    const int Match = 1;
    const int Mismatch = -1;
    const int XDrop = 4; // ベストスコアからこれだけ下がったら延長を打ち切る

    static Dictionary<string, List<int>> BuildKmerIndex(string db, int k)
    {
        var index = new Dictionary<string, List<int>>();
        for (int i = 0; i + k <= db.Length; i++)
        {
            var kmer = db.Substring(i, k);
            if (!index.ContainsKey(kmer)) index[kmer] = new List<int>();
            index[kmer].Add(i);
        }
        return index;
    }

    static int ExtendSeed(string query, string db, int qi, int di)
    {
        int bestScore = 0, score = 0, q = qi, d = di;
        while (q < query.Length && d < db.Length)
        {
            score += query[q] == db[d] ? Match : Mismatch;
            if (score > bestScore) bestScore = score;
            if (bestScore - score > XDrop) break;
            q++; d++;
        }

        int bestLeft = 0;
        score = 0; q = qi - 1; d = di - 1;
        while (q >= 0 && d >= 0)
        {
            score += query[q] == db[d] ? Match : Mismatch;
            if (score > bestLeft) bestLeft = score;
            if (bestLeft - score > XDrop) break;
            q--; d--;
        }

        return bestScore + bestLeft;
    }

    public static int? Search(string query, string db, int k)
    {
        var index = BuildKmerIndex(db, k);
        int? best = null;
        var seen = new HashSet<(int, int)>();

        for (int qi = 0; qi + k <= query.Length; qi++)
        {
            var kmer = query.Substring(qi, k);
            if (!index.TryGetValue(kmer, out var positions)) continue;
            foreach (var di in positions)
            {
                if (!seen.Add((qi, di))) continue;
                int score = ExtendSeed(query, db, qi, di);
                if (best == null || score > best) best = score;
            }
        }
        return best;
    }
}
```
