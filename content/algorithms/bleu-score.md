---
name: BLEUスコア
category: 自然言語処理
subcategory: 要約・訂正
complexity: O(n)(nは生成文の長さ、n-gramの集計)
summary: 機械翻訳の出力が人間の参照訳とどれだけ「n-gramレベルで一致しているか」を測る自動評価指標で、人手による評価を待たずに翻訳システムの品質を素早く定量比較できるようにした、機械翻訳研究の標準的なベンチマーク手法。
---

## 概要

機械翻訳システムの品質を評価する最も確実な方法は人間の専門家に読んでもらうことだが、これは時間とコストがかかり、モデルを少し改良するたびに繰り返すことは現実的ではない。2002年にIBMのキシャン・パピネニ(Papineni)らが発表したBLEU(Bilingual Evaluation Understudy)は、機械が生成した翻訳文が、あらかじめ用意された(人間による)参照訳と「単語の並び(n-gram)がどれだけ一致しているか」を自動的に採点することで、人手を介さずに翻訳品質を数値化する。完璧な指標ではない(流暢さや意味の正しさを直接測るわけではない)ものの、モデル同士を高速かつ再現可能に比較できる利便性から、機械翻訳研究における標準的なベンチマーク指標として長年使われてきた。

## 仕組み

1. 機械が生成した翻訳文(候補文)と、人間が用意した1つ以上の参照訳を用意する
2. 候補文に含まれる`n`-gram(連続する`n`個の単語の並び、通常`n=1〜4`について計算する)それぞれが、参照訳の中に出現するかを調べ、「適合率(precision)」——候補文のn-gramのうち参照訳にも出現する割合——を`n=1,2,3,4`のそれぞれについて計算する
3. 同じn-gramが参照訳での出現回数を超えてカウントされないよう上限を設ける(クリッピング)——これにより、同じ単語をひたすら繰り返すだけの手抜きな翻訳が不当に高いスコアを得ることを防ぐ
4. `n=1〜4`の適合率の幾何平均を取り、翻訳の「n-gramレベルでの一致度」の総合スコアとする
5. 候補文が参照訳より極端に短い場合、少ないn-gramで見かけ上の適合率を稼げてしまうため、「簡潔性ペナルティ(Brevity Penalty)」——候補文が参照訳より短いほどスコアを減点する補正項——を掛け合わせて最終的なBLEUスコアを算出する

## 特性・トレードオフ

- **計算量**: 候補文・参照訳それぞれについてn-gramを数え上げるだけなので、文の長さ`n`に対して線形時間`O(n)`——大量の翻訳結果を高速に自動評価できる
- **表層的な一致しか測れないという本質的な限界**: BLEUは単語の並びが一致しているかを機械的に数えるだけで、意味が同じでも語順や単語選択が異なる訳文(同義語の言い換えなど)には低いスコアしか与えられない——流暢さ・意味の正確さを人間のように判断しているわけではなく、あくまで参照訳との表層的な近さの代理指標にすぎない
- **複数の参照訳を用意することの重要性**: 1つの正解しか用意しないと、それと異なる(しかし正しい)言い回しを不当に低く評価してしまう。複数の参照訳を用意し、各n-gramについて「どれか1つの参照訳にでも出現すれば一致」とみなすことで、この問題をある程度緩和している
- **[ROUGEスコア](/algorithms/rouge-score)との対比**: BLEUは主に機械翻訳の評価に使われ「適合率(生成した内容のうちどれだけが正しいか)」を重視するのに対し、[ROUGEスコア](/algorithms/rouge-score)は主に要約の評価に使われ「再現率(参照が持つ内容のうちどれだけ拾えたか)」を重視する——同じn-gram一致に基づく指標でも、評価したいタスクの性質に応じて重視する方向が逆になっている好対照な関係にある
- **使いどころ**: 機械翻訳システムの自動評価・モデル間比較(研究論文でのベンチマーク報告の定番指標)、翻訳モデルの学習過程における検証指標、他の生成タスク(画像キャプション生成等)への応用

## 実装例

```python
import math
from collections import Counter


def _get_ngrams(tokens: list[str], n: int) -> list[tuple[str, ...]]:
    return [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def _modified_precision(candidate: list[str], references: list[list[str]], n: int) -> tuple[int, int]:
    cand_ngrams = Counter(_get_ngrams(candidate, n))
    if not cand_ngrams:
        return 0, 0
    max_ref_counts: Counter = Counter()
    for ref in references:
        ref_ngrams = Counter(_get_ngrams(ref, n))
        for ng, cnt in ref_ngrams.items():
            max_ref_counts[ng] = max(max_ref_counts[ng], cnt)
    clipped = sum(min(cnt, max_ref_counts.get(ng, 0)) for ng, cnt in cand_ngrams.items())
    total = sum(cand_ngrams.values())
    return clipped, total


def _brevity_penalty(candidate_len: int, references: list[list[str]]) -> float:
    r = min((len(ref) for ref in references), key=lambda rl: abs(rl - candidate_len))
    c = candidate_len
    if c > r:
        return 1.0
    if c == 0:
        return 0.0
    return math.exp(1 - r / c)


def bleu_score(candidate: list[str], references: list[list[str]], max_n: int = 4) -> float:
    precisions = []
    for n in range(1, max_n + 1):
        clipped, total = _modified_precision(candidate, references, n)
        precisions.append(clipped / total if total else 0.0)

    if any(p == 0.0 for p in precisions):
        geo_mean = 0.0
    else:
        geo_mean = math.exp(sum(math.log(p) for p in precisions) / len(precisions))

    bp = _brevity_penalty(len(candidate), references)
    return bp * geo_mean
```

```typescript
function getNgrams(tokens: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) result.push(tokens.slice(i, i + n).join(" "));
  return result;
}

function modifiedPrecision(candidate: string[], references: string[][], n: number): [number, number] {
  const candCounts = new Map<string, number>();
  for (const ng of getNgrams(candidate, n)) candCounts.set(ng, (candCounts.get(ng) ?? 0) + 1);
  if (candCounts.size === 0) return [0, 0];

  const maxRef = new Map<string, number>();
  for (const ref of references) {
    const refCounts = new Map<string, number>();
    for (const ng of getNgrams(ref, n)) refCounts.set(ng, (refCounts.get(ng) ?? 0) + 1);
    for (const [ng, cnt] of refCounts) maxRef.set(ng, Math.max(maxRef.get(ng) ?? 0, cnt));
  }

  let clipped = 0;
  let total = 0;
  for (const [ng, cnt] of candCounts) {
    clipped += Math.min(cnt, maxRef.get(ng) ?? 0);
    total += cnt;
  }
  return [clipped, total];
}

function brevityPenalty(candidateLen: number, references: string[][]): number {
  const r = references
    .map((ref) => ref.length)
    .reduce((best, len) => (Math.abs(len - candidateLen) < Math.abs(best - candidateLen) ? len : best));
  const c = candidateLen;
  if (c > r) return 1.0;
  if (c === 0) return 0.0;
  return Math.exp(1 - r / c);
}

function bleuScore(candidate: string[], references: string[][], maxN: number = 4): number {
  const precisions: number[] = [];
  for (let n = 1; n <= maxN; n++) {
    const [clipped, total] = modifiedPrecision(candidate, references, n);
    precisions.push(total > 0 ? clipped / total : 0.0);
  }

  const geoMean = precisions.some((p) => p === 0.0)
    ? 0.0
    : Math.exp(precisions.reduce((a, p) => a + Math.log(p), 0) / precisions.length);

  return brevityPenalty(candidate.length, references) * geoMean;
}
```

```cpp
#include <algorithm>
#include <cmath>
#include <map>
#include <string>
#include <vector>

std::vector<std::vector<std::string>> getNgrams(const std::vector<std::string>& tokens, int n) {
    std::vector<std::vector<std::string>> result;
    for (int i = 0; i + n <= static_cast<int>(tokens.size()); i++) {
        result.emplace_back(tokens.begin() + i, tokens.begin() + i + n);
    }
    return result;
}

std::pair<int, int> modifiedPrecision(const std::vector<std::string>& candidate,
                                       const std::vector<std::vector<std::string>>& references, int n) {
    std::map<std::vector<std::string>, int> candCounts;
    for (const auto& ng : getNgrams(candidate, n)) candCounts[ng]++;
    if (candCounts.empty()) return {0, 0};

    std::map<std::vector<std::string>, int> maxRef;
    for (const auto& ref : references) {
        std::map<std::vector<std::string>, int> refCounts;
        for (const auto& ng : getNgrams(ref, n)) refCounts[ng]++;
        for (const auto& [ng, cnt] : refCounts) maxRef[ng] = std::max(maxRef[ng], cnt);
    }

    int clipped = 0, total = 0;
    for (const auto& [ng, cnt] : candCounts) {
        clipped += std::min(cnt, maxRef[ng]);
        total += cnt;
    }
    return {clipped, total};
}

double brevityPenalty(int candidateLen, const std::vector<std::vector<std::string>>& references) {
    int r = static_cast<int>(references[0].size());
    int bestDiff = std::abs(r - candidateLen);
    for (const auto& ref : references) {
        int diff = std::abs(static_cast<int>(ref.size()) - candidateLen);
        if (diff < bestDiff) {
            bestDiff = diff;
            r = static_cast<int>(ref.size());
        }
    }
    int c = candidateLen;
    if (c > r) return 1.0;
    if (c == 0) return 0.0;
    return std::exp(1.0 - static_cast<double>(r) / c);
}

double bleuScore(const std::vector<std::string>& candidate, const std::vector<std::vector<std::string>>& references,
                  int maxN = 4) {
    std::vector<double> precisions;
    for (int n = 1; n <= maxN; n++) {
        auto [clipped, total] = modifiedPrecision(candidate, references, n);
        precisions.push_back(total > 0 ? static_cast<double>(clipped) / total : 0.0);
    }

    bool anyZero = std::any_of(precisions.begin(), precisions.end(), [](double p) { return p == 0.0; });
    double geoMean;
    if (anyZero) {
        geoMean = 0.0;
    } else {
        double logSum = 0.0;
        for (double p : precisions) logSum += std::log(p);
        geoMean = std::exp(logSum / precisions.size());
    }

    return brevityPenalty(static_cast<int>(candidate.size()), references) * geoMean;
}
```

```rust
use std::collections::HashMap;

fn get_ngrams(tokens: &[String], n: usize) -> Vec<Vec<String>> {
    if tokens.len() < n {
        return Vec::new();
    }
    (0..=tokens.len() - n).map(|i| tokens[i..i + n].to_vec()).collect()
}

fn modified_precision(candidate: &[String], references: &[Vec<String>], n: usize) -> (u32, u32) {
    let mut cand_counts: HashMap<Vec<String>, u32> = HashMap::new();
    for ng in get_ngrams(candidate, n) {
        *cand_counts.entry(ng).or_insert(0) += 1;
    }
    if cand_counts.is_empty() {
        return (0, 0);
    }

    let mut max_ref: HashMap<Vec<String>, u32> = HashMap::new();
    for reference in references {
        let mut ref_counts: HashMap<Vec<String>, u32> = HashMap::new();
        for ng in get_ngrams(reference, n) {
            *ref_counts.entry(ng).or_insert(0) += 1;
        }
        for (ng, cnt) in ref_counts {
            let entry = max_ref.entry(ng).or_insert(0);
            *entry = (*entry).max(cnt);
        }
    }

    let mut clipped = 0u32;
    let mut total = 0u32;
    for (ng, cnt) in &cand_counts {
        clipped += cnt.min(max_ref.get(ng).unwrap_or(&0));
        total += cnt;
    }
    (clipped, total)
}

fn brevity_penalty(candidate_len: usize, references: &[Vec<String>]) -> f64 {
    let r = references
        .iter()
        .map(|r| r.len())
        .min_by_key(|&len| (len as i64 - candidate_len as i64).abs())
        .unwrap_or(0);
    let c = candidate_len;
    if c > r {
        1.0
    } else if c == 0 {
        0.0
    } else {
        (1.0 - r as f64 / c as f64).exp()
    }
}

fn bleu_score(candidate: &[String], references: &[Vec<String>], max_n: usize) -> f64 {
    let mut precisions = Vec::new();
    for n in 1..=max_n {
        let (clipped, total) = modified_precision(candidate, references, n);
        precisions.push(if total > 0 { clipped as f64 / total as f64 } else { 0.0 });
    }

    let geo_mean = if precisions.iter().any(|&p| p == 0.0) {
        0.0
    } else {
        let log_sum: f64 = precisions.iter().map(|p| p.ln()).sum();
        (log_sum / precisions.len() as f64).exp()
    };

    brevity_penalty(candidate.len(), references) * geo_mean
}
```

```csharp
static class Bleu
{
    static List<string> GetNgrams(List<string> tokens, int n)
    {
        var result = new List<string>();
        for (int i = 0; i + n <= tokens.Count; i++) result.Add(string.Join(" ", tokens.GetRange(i, n)));
        return result;
    }

    static (int clipped, int total) ModifiedPrecision(List<string> candidate, List<List<string>> references, int n)
    {
        var candCounts = new Dictionary<string, int>();
        foreach (var ng in GetNgrams(candidate, n)) candCounts[ng] = candCounts.GetValueOrDefault(ng) + 1;
        if (candCounts.Count == 0) return (0, 0);

        var maxRef = new Dictionary<string, int>();
        foreach (var reference in references)
        {
            var refCounts = new Dictionary<string, int>();
            foreach (var ng in GetNgrams(reference, n)) refCounts[ng] = refCounts.GetValueOrDefault(ng) + 1;
            foreach (var (ng, cnt) in refCounts) maxRef[ng] = Math.Max(maxRef.GetValueOrDefault(ng), cnt);
        }

        int clipped = 0, total = 0;
        foreach (var (ng, cnt) in candCounts) { clipped += Math.Min(cnt, maxRef.GetValueOrDefault(ng)); total += cnt; }
        return (clipped, total);
    }

    static double BrevityPenalty(int candidateLen, List<List<string>> references)
    {
        int r = references.Select(rf => rf.Count).OrderBy(len => Math.Abs(len - candidateLen)).First();
        int c = candidateLen;
        if (c > r) return 1.0;
        if (c == 0) return 0.0;
        return Math.Exp(1 - (double)r / c);
    }

    public static double Score(List<string> candidate, List<List<string>> references, int maxN = 4)
    {
        var precisions = new List<double>();
        for (int n = 1; n <= maxN; n++)
        {
            var (clipped, total) = ModifiedPrecision(candidate, references, n);
            precisions.Add(total > 0 ? (double)clipped / total : 0.0);
        }
        double geo = precisions.Any(p => p == 0.0) ? 0.0 : Math.Exp(precisions.Sum(Math.Log) / precisions.Count);
        return BrevityPenalty(candidate.Count, references) * geo;
    }
}
```
