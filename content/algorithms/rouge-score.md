---
name: ROUGEスコア
category: 自然言語処理
subcategory: 要約・訂正
complexity: O(n)(nは要約文の長さ、n-gramの集計)
summary: 自動生成された要約が、人間による参照要約の内容をどれだけ「拾えているか(再現率)」を測る自動評価指標群で、[BLEUスコア](/algorithms/bleu-score)が翻訳の適合率を重視するのとは対照的に、要約タスクでは重要な情報を漏らさず含んでいるかを重視する設計になっている。
---

## 概要

[BLEUスコア](/algorithms/bleu-score)が機械翻訳の評価で標準になったのと同様に、文書要約の分野では2004年にチン-イュー・リン(Lin)が発表したROUGE(Recall-Oriented Understudy for Gisting Evaluation)が標準的な自動評価指標として使われてきた。要約タスクでは、翻訳とは重視すべき点が異なる——翻訳は原文の内容を過不足なく訳し切ることが求められるが、要約はそもそも「情報を削って短くする」タスクであるため、「人間が書いた参照要約に含まれる重要な情報を、生成された要約がどれだけ拾えているか」という再現率(Recall)の観点が特に重要になる。ROUGEはこの発想に基づき、[BLEUスコア](/algorithms/bleu-score)と似たn-gram一致に基づく計算方法を使いながらも、適合率ではなく再現率を中心に据えた指標群として設計されている。

## 仕組み

1. 機械が生成した要約文(候補要約)と、人間が作成した参照要約を用意する
2. **ROUGE-N**: 候補要約と参照要約の間で、`n`-gram(連続するn個の単語の並び)がどれだけ一致するかを数える。[BLEUスコア](/algorithms/bleu-score)と似た計算だが、分母を「参照要約に含まれるn-gramの総数」に取ることで、再現率(参照要約の内容をどれだけ拾えたか)を計算する
3. **ROUGE-L**: 候補要約と参照要約の最長共通部分列([LCS](/algorithms/lcs)、連続していなくても順序さえ保たれていればよい)の長さを基準にスコアを計算する。単語が連続していなくても文の構造的な類似性を評価できるため、n-gramベースの指標より柔軟な一致判定になる
4. 適合率(候補要約のうちどれだけが参照要約とも一致しているか)も合わせて計算し、再現率と適合率の調和平均(F値)を最終的なROUGEスコアとして報告することも多い
5. 複数の参照要約がある場合は、[BLEUスコア](/algorithms/bleu-score)と同様にそれぞれとの一致を考慮して集計する

## 特性・トレードオフ

- **計算量**: ROUGE-Nはn-gramの集計なので候補・参照要約の長さに対して線形時間`O(n)`。ROUGE-Lは[最長共通部分列(LCS)](/algorithms/lcs)の計算であり、2つの文字列(単語列)の長さの積に比例する動的計画法`O(nm)`が必要になる
- **再現率重視という設計思想**: 「重要な情報を漏らさず拾えているか」を測ることが要約の評価では特に重視されるため、ROUGEは適合率よりも再現率を主軸に据えている——[BLEUスコア](/algorithms/bleu-score)が「生成した内容のうちどれだけ正しいか」という適合率を主軸に据えるのと対照的な設計判断であり、評価したいタスクの性質(翻訳=過不足なく訳す、要約=重要情報を漏らさず拾う)の違いを反映している
- **意味の同一性を直接判定しないという共通の限界**: [BLEUスコア](/algorithms/bleu-score)と同様、ROUGEも表層的な単語の一致に基づく指標であり、同義語による言い換えや文の構造の違いを人間のようには評価できない。近年はBERTScoreのような文脈依存埋め込みに基づくより高度な評価指標も使われるようになっているが、ROUGEは計算の軽さと再現性の高さから今なお広く使われている
- **ROUGE-Nとroute-Lの使い分け**: ROUGE-1(単語単位の一致)・ROUGE-2(2単語の連続一致)は表層的な語彙の一致を測るのに向き、ROUGE-L(LCSベース)は語順の入れ替わりにある程度頑健なため文の構造的な類似性を測るのに向く——実務では複数のROUGE指標を組み合わせて報告することが一般的
- **使いどころ**: 自動文書要約システムの評価・モデル間比較、対話システムの応答生成評価、機械翻訳以外のテキスト生成タスク全般における自動評価のベースライン指標

## 実装例

```python
from collections import Counter


def ngrams(tokens: list[str], n: int) -> list[tuple[str, ...]]:
    return [tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def rouge_n(candidate: str, reference: str, n: int) -> dict[str, float]:
    cand_grams = Counter(ngrams(candidate.split(), n))
    ref_grams = Counter(ngrams(reference.split(), n))
    overlap = sum((cand_grams & ref_grams).values())  # マルチセットの共通部分
    recall = overlap / max(1, sum(ref_grams.values()))
    precision = overlap / max(1, sum(cand_grams.values()))
    f1 = 0.0 if (recall + precision) == 0 else 2 * recall * precision / (recall + precision)
    return {"recall": recall, "precision": precision, "f1": f1}


def lcs_length(a: list[str], b: list[str]) -> int:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]


def rouge_l(candidate: str, reference: str) -> dict[str, float]:
    cand_tokens = candidate.split()
    ref_tokens = reference.split()
    lcs = lcs_length(cand_tokens, ref_tokens)
    recall = lcs / max(1, len(ref_tokens))
    precision = lcs / max(1, len(cand_tokens))
    f1 = 0.0 if (recall + precision) == 0 else 2 * recall * precision / (recall + precision)
    return {"recall": recall, "precision": precision, "f1": f1, "lcs": lcs}
```

```typescript
function ngrams(tokens: string[], n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) result.push(tokens.slice(i, i + n).join(" "));
  return result;
}
function counter(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}
function multisetOverlap(a: Map<string, number>, b: Map<string, number>): number {
  let total = 0;
  for (const [key, count] of a) total += Math.min(count, b.get(key) ?? 0);
  return total;
}

function rougeN(candidate: string, reference: string, n: number) {
  const candGrams = counter(ngrams(candidate.split(" "), n));
  const refGrams = counter(ngrams(reference.split(" "), n));
  const overlap = multisetOverlap(candGrams, refGrams);
  const refTotal = [...refGrams.values()].reduce((s, c) => s + c, 0);
  const candTotal = [...candGrams.values()].reduce((s, c) => s + c, 0);
  const recall = overlap / Math.max(1, refTotal);
  const precision = overlap / Math.max(1, candTotal);
  const f1 = recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return { recall, precision, f1 };
}

function lcsLength(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
function rougeL(candidate: string, reference: string) {
  const candTokens = candidate.split(" ");
  const refTokens = reference.split(" ");
  const lcs = lcsLength(candTokens, refTokens);
  const recall = lcs / Math.max(1, refTokens.length);
  const precision = lcs / Math.max(1, candTokens.length);
  const f1 = recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return { recall, precision, f1, lcs };
}
```

```cpp
#include <vector>
#include <string>
#include <sstream>
#include <map>
#include <algorithm>

std::vector<std::string> splitWords(const std::string& text) {
    std::vector<std::string> words;
    std::istringstream iss(text);
    std::string w;
    while (iss >> w) words.push_back(w);
    return words;
}

std::vector<std::string> ngrams(const std::vector<std::string>& tokens, int n) {
    std::vector<std::string> result;
    for (size_t i = 0; i + n <= tokens.size(); i++) {
        std::string joined;
        for (int k = 0; k < n; k++) { if (k > 0) joined += " "; joined += tokens[i + k]; }
        result.push_back(joined);
    }
    return result;
}
std::map<std::string, int> counter(const std::vector<std::string>& items) {
    std::map<std::string, int> m;
    for (auto& it : items) m[it]++;
    return m;
}

struct RougeResult { double recall, precision, f1; };

RougeResult rougeN(const std::string& candidate, const std::string& reference, int n) {
    auto candGrams = counter(ngrams(splitWords(candidate), n));
    auto refGrams = counter(ngrams(splitWords(reference), n));
    int overlap = 0, refTotal = 0, candTotal = 0;
    for (auto& [key, count] : candGrams) {
        candTotal += count;
        auto it = refGrams.find(key);
        if (it != refGrams.end()) overlap += std::min(count, it->second);
    }
    for (auto& [_, count] : refGrams) refTotal += count;
    double recall = overlap / static_cast<double>(std::max(1, refTotal));
    double precision = overlap / static_cast<double>(std::max(1, candTotal));
    double f1 = (recall + precision == 0) ? 0 : 2 * recall * precision / (recall + precision);
    return { recall, precision, f1 };
}

int lcsLength(const std::vector<std::string>& a, const std::vector<std::string>& b) {
    std::vector<std::vector<int>> dp(a.size() + 1, std::vector<int>(b.size() + 1, 0));
    for (size_t i = 1; i <= a.size(); i++)
        for (size_t j = 1; j <= b.size(); j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : std::max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.size()][b.size()];
}

struct RougeLResult { double recall, precision, f1; int lcs; };

RougeLResult rougeL(const std::string& candidate, const std::string& reference) {
    auto candTokens = splitWords(candidate);
    auto refTokens = splitWords(reference);
    int lcs = lcsLength(candTokens, refTokens);
    double recall = lcs / static_cast<double>(std::max<size_t>(1, refTokens.size()));
    double precision = lcs / static_cast<double>(std::max<size_t>(1, candTokens.size()));
    double f1 = (recall + precision == 0) ? 0 : 2 * recall * precision / (recall + precision);
    return { recall, precision, f1, lcs };
}
```

```rust
use std::collections::HashMap;

fn split_words(text: &str) -> Vec<String> {
    text.split_whitespace().map(|s| s.to_string()).collect()
}

fn ngrams(tokens: &[String], n: usize) -> Vec<String> {
    if tokens.len() < n {
        return Vec::new();
    }
    (0..=tokens.len() - n).map(|i| tokens[i..i + n].join(" ")).collect()
}
fn counter(items: &[String]) -> HashMap<String, i32> {
    let mut m = HashMap::new();
    for it in items {
        *m.entry(it.clone()).or_insert(0) += 1;
    }
    m
}

struct RougeResult { recall: f64, precision: f64, f1: f64 }

fn rouge_n(candidate: &str, reference: &str, n: usize) -> RougeResult {
    let cand_grams = counter(&ngrams(&split_words(candidate), n));
    let ref_grams = counter(&ngrams(&split_words(reference), n));
    let overlap: i32 = cand_grams.iter().map(|(k, &c)| c.min(*ref_grams.get(k).unwrap_or(&0))).sum();
    let ref_total: i32 = ref_grams.values().sum();
    let cand_total: i32 = cand_grams.values().sum();
    let recall = overlap as f64 / ref_total.max(1) as f64;
    let precision = overlap as f64 / cand_total.max(1) as f64;
    let f1 = if recall + precision == 0.0 { 0.0 } else { 2.0 * recall * precision / (recall + precision) };
    RougeResult { recall, precision, f1 }
}

fn lcs_length(a: &[String], b: &[String]) -> usize {
    let mut dp = vec![vec![0usize; b.len() + 1]; a.len() + 1];
    for i in 1..=a.len() {
        for j in 1..=b.len() {
            dp[i][j] = if a[i - 1] == b[j - 1] { dp[i - 1][j - 1] + 1 } else { dp[i - 1][j].max(dp[i][j - 1]) };
        }
    }
    dp[a.len()][b.len()]
}

struct RougeLResult { recall: f64, precision: f64, f1: f64, lcs: usize }

fn rouge_l(candidate: &str, reference: &str) -> RougeLResult {
    let cand_tokens = split_words(candidate);
    let ref_tokens = split_words(reference);
    let lcs = lcs_length(&cand_tokens, &ref_tokens);
    let recall = lcs as f64 / ref_tokens.len().max(1) as f64;
    let precision = lcs as f64 / cand_tokens.len().max(1) as f64;
    let f1 = if recall + precision == 0.0 { 0.0 } else { 2.0 * recall * precision / (recall + precision) };
    RougeLResult { recall, precision, f1, lcs }
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class Rouge
{
    static List<string> Ngrams(string[] tokens, int n)
    {
        var result = new List<string>();
        for (int i = 0; i <= tokens.Length - n; i++) result.Add(string.Join(" ", tokens.Skip(i).Take(n)));
        return result;
    }
    static Dictionary<string, int> Counter(List<string> items)
    {
        var d = new Dictionary<string, int>();
        foreach (var it in items) d[it] = d.GetValueOrDefault(it) + 1;
        return d;
    }

    public static (double Recall, double Precision, double F1) RougeN(string candidate, string reference, int n)
    {
        var candGrams = Counter(Ngrams(candidate.Split(' '), n));
        var refGrams = Counter(Ngrams(reference.Split(' '), n));
        int overlap = candGrams.Sum(kv => Math.Min(kv.Value, refGrams.GetValueOrDefault(kv.Key)));
        int refTotal = refGrams.Values.Sum();
        int candTotal = candGrams.Values.Sum();
        double recall = overlap / (double)Math.Max(1, refTotal);
        double precision = overlap / (double)Math.Max(1, candTotal);
        double f1 = recall + precision == 0 ? 0 : 2 * recall * precision / (recall + precision);
        return (recall, precision, f1);
    }

    static int LcsLength(string[] a, string[] b)
    {
        var dp = new int[a.Length + 1, b.Length + 1];
        for (int i = 1; i <= a.Length; i++)
            for (int j = 1; j <= b.Length; j++)
                dp[i, j] = a[i - 1] == b[j - 1] ? dp[i - 1, j - 1] + 1 : Math.Max(dp[i - 1, j], dp[i, j - 1]);
        return dp[a.Length, b.Length];
    }
    public static (double Recall, double Precision, double F1, int Lcs) RougeL(string candidate, string reference)
    {
        var candTokens = candidate.Split(' ');
        var refTokens = reference.Split(' ');
        int lcs = LcsLength(candTokens, refTokens);
        double recall = lcs / (double)Math.Max(1, refTokens.Length);
        double precision = lcs / (double)Math.Max(1, candTokens.Length);
        double f1 = recall + precision == 0 ? 0 : 2 * recall * precision / (recall + precision);
        return (recall, precision, f1, lcs);
    }
}
```
