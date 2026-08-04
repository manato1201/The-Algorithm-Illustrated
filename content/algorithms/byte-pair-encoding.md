---
name: バイトペア符号化(BPE)
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(語彙サイズ × コーパスサイズ)(訓練時)、O(n)(適用時)
summary: 出現頻度が最も高い隣接文字ペアを繰り返し統合していくことで、単語より細かく文字より粗い「サブワード」の語彙を自動構築する圧縮由来のトークン化手法。
---

## 概要

自然言語処理では、文章を「単語」単位で区切って扱うのが伝統的だったが、単語単位の語彙は未知語(訓練データに現れなかった単語)に弱く、語彙数も膨大になりがちである。バイトペア符号化(BPE)は、元々は1994年にフィリップ・ゲージが考案したシンプルなデータ圧縮アルゴリズムだったが、2016年に自然言語処理のトークン化手法として転用され、GPTシリーズをはじめ多くの大規模言語モデルの語彙構築に使われる標準技術になった。「最も頻繁に隣り合う文字(またはサブワード)のペアを、新しい1つの単位として統合する」ことを繰り返すだけで、頻出する単語はまるごと1トークンに、まれな単語は複数のサブワードに自動的に分解される、データ駆動型の語彙が構築される。

## 仕組み

1. コーパス(訓練テキスト)中の全ての単語を、まず1文字ずつに分解した状態から始める(語彙の初期状態はアルファベット等の基本文字集合)
2. コーパス全体を見渡し、隣接して出現する頻度が最も高い「シンボルのペア」(最初は文字同士、後にはサブワード同士)を見つける
3. そのペアを1つの新しいシンボル(マージルール)として語彙に追加し、コーパス中の全ての出現箇所をこの新しいシンボルに置き換える
4. 目標とする語彙サイズに達するか、あるいは指定した統合回数に達するまで、2〜3を繰り返す
5. 学習済みのマージルールの列を使って、未知のテキストにも同じ順序でマージ操作を適用することで、一貫したサブワード分割ができる

## 特性・トレードオフ

- **計算量**: 訓練時は語彙サイズ分の統合操作を繰り返し、各回でコーパス全体をスキャンする必要があるため、素朴な実装では計算コストが高くなりやすい(効率的な実装では優先度キューとペアの出現位置のインデックスを使って高速化する)。学習済みのマージルールを適用するトークン化自体は入力長`n`に対して`O(n)`程度で高速
- **未知語問題の緩和**: 単語全体を1つのトークンとして扱う方式と異なり、未知の単語も既知のサブワード(最悪の場合は1文字ずつ)に分解して表現できるため、語彙に存在しない単語でも扱えなくなることがない
- **頻度に応じた自然な粒度**: 頻出する単語(例えば"the"や"ing")はほぼそのまま1トークンとして扱われる一方、まれな専門用語や複合語は複数のサブワードに分解される——語の頻度に応じて自動的にちょうどよい粒度の語彙が形成される
- **使いどころ**: GPT系列をはじめとする大規模言語モデルのトークナイザー、機械翻訳の入出力語彙構築。派生手法として、確率的な観点から統合基準を洗練させた[WordPieceトークナイゼーション](/algorithms/wordpiece-tokenization)がBERT系モデルで使われている

## 実装例

```python
from collections import Counter

def get_pair_stats(corpus: list[list[str]]) -> Counter:
    stats = Counter()
    for word in corpus:
        for i in range(len(word) - 1):
            stats[(word[i], word[i + 1])] += 1
    return stats

def merge_pair(pair: tuple[str, str], corpus: list[list[str]]) -> list[list[str]]:
    a, b = pair
    merged = a + b
    new_corpus = []
    for word in corpus:
        new_word = []
        i = 0
        while i < len(word):
            if i < len(word) - 1 and word[i] == a and word[i + 1] == b:
                new_word.append(merged)
                i += 2
            else:
                new_word.append(word[i])
                i += 1
        new_corpus.append(new_word)
    return new_corpus

def train_bpe(words: list[str], num_merges: int) -> list[tuple[str, str]]:
    corpus = [list(w) + ["</w>"] for w in words]
    merges = []
    for _ in range(num_merges):
        stats = get_pair_stats(corpus)
        if not stats:
            break
        best = max(stats.items(), key=lambda kv: (kv[1], kv[0]))[0]
        merges.append(best)
        corpus = merge_pair(best, corpus)
    return merges

def apply_bpe(word: str, merges: list[tuple[str, str]]) -> list[str]:
    symbols = list(word) + ["</w>"]
    for a, b in merges:
        i = 0
        new_symbols = []
        while i < len(symbols):
            if i < len(symbols) - 1 and symbols[i] == a and symbols[i + 1] == b:
                new_symbols.append(a + b)
                i += 2
            else:
                new_symbols.append(symbols[i])
                i += 1
        symbols = new_symbols
    return symbols
```

```typescript
function getPairStats(corpus: string[][]): Map<string, number> {
  const stats = new Map<string, number>();
  for (const word of corpus) {
    for (let i = 0; i < word.length - 1; i++) {
      const key = `${word[i]} ${word[i + 1]}`;
      stats.set(key, (stats.get(key) ?? 0) + 1);
    }
  }
  return stats;
}

function mergePair(pair: [string, string], corpus: string[][]): string[][] {
  const [a, b] = pair;
  const merged = a + b;
  const newCorpus: string[][] = [];
  for (const word of corpus) {
    const newWord: string[] = [];
    let i = 0;
    while (i < word.length) {
      if (i < word.length - 1 && word[i] === a && word[i + 1] === b) {
        newWord.push(merged);
        i += 2;
      } else {
        newWord.push(word[i]);
        i += 1;
      }
    }
    newCorpus.push(newWord);
  }
  return newCorpus;
}

function trainBpe(words: string[], numMerges: number): [string, string][] {
  let corpus: string[][] = words.map((w) => [...w, "</w>"]);
  const merges: [string, string][] = [];
  for (let m = 0; m < numMerges; m++) {
    const stats = getPairStats(corpus);
    if (stats.size === 0) break;
    let bestKey = "";
    let bestCount = -1;
    for (const [key, count] of stats) {
      if (count > bestCount || (count === bestCount && key > bestKey)) {
        bestCount = count;
        bestKey = key;
      }
    }
    const [a, b] = bestKey.split(" ");
    merges.push([a, b]);
    corpus = mergePair([a, b], corpus);
  }
  return merges;
}

function applyBpe(word: string, merges: [string, string][]): string[] {
  let symbols: string[] = [...word, "</w>"];
  for (const [a, b] of merges) {
    const newSymbols: string[] = [];
    let i = 0;
    while (i < symbols.length) {
      if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
        newSymbols.push(a + b);
        i += 2;
      } else {
        newSymbols.push(symbols[i]);
        i += 1;
      }
    }
    symbols = newSymbols;
  }
  return symbols;
}
```

```cpp
#include <string>
#include <vector>
#include <map>

using Corpus = std::vector<std::vector<std::string>>;
using Pair = std::pair<std::string, std::string>;

std::map<Pair, int> getPairStats(const Corpus& corpus) {
    std::map<Pair, int> stats;
    for (const auto& word : corpus) {
        for (size_t i = 0; i + 1 < word.size(); i++) {
            stats[{word[i], word[i + 1]}]++;
        }
    }
    return stats;
}

Corpus mergePair(const Pair& pair, const Corpus& corpus) {
    const std::string& a = pair.first;
    const std::string& b = pair.second;
    std::string merged = a + b;
    Corpus newCorpus;
    for (const auto& word : corpus) {
        std::vector<std::string> newWord;
        size_t i = 0;
        while (i < word.size()) {
            if (i + 1 < word.size() && word[i] == a && word[i + 1] == b) {
                newWord.push_back(merged);
                i += 2;
            } else {
                newWord.push_back(word[i]);
                i += 1;
            }
        }
        newCorpus.push_back(newWord);
    }
    return newCorpus;
}

std::vector<Pair> trainBpe(const std::vector<std::string>& words, int numMerges) {
    Corpus corpus;
    for (const auto& w : words) {
        std::vector<std::string> symbols;
        for (char c : w) symbols.push_back(std::string(1, c));
        symbols.push_back("</w>");
        corpus.push_back(symbols);
    }
    std::vector<Pair> merges;
    for (int m = 0; m < numMerges; m++) {
        auto stats = getPairStats(corpus);
        if (stats.empty()) break;
        Pair best;
        int bestCount = -1;
        for (const auto& [pair, count] : stats) {
            if (count > bestCount || (count == bestCount && pair > best)) {
                bestCount = count;
                best = pair;
            }
        }
        merges.push_back(best);
        corpus = mergePair(best, corpus);
    }
    return merges;
}

std::vector<std::string> applyBpe(const std::string& word, const std::vector<Pair>& merges) {
    std::vector<std::string> symbols;
    for (char c : word) symbols.push_back(std::string(1, c));
    symbols.push_back("</w>");
    for (const auto& [a, b] : merges) {
        std::vector<std::string> newSymbols;
        size_t i = 0;
        while (i < symbols.size()) {
            if (i + 1 < symbols.size() && symbols[i] == a && symbols[i + 1] == b) {
                newSymbols.push_back(a + b);
                i += 2;
            } else {
                newSymbols.push_back(symbols[i]);
                i += 1;
            }
        }
        symbols = newSymbols;
    }
    return symbols;
}
```

```rust
use std::collections::BTreeMap;

type Pair = (String, String);

fn get_pair_stats(corpus: &[Vec<String>]) -> BTreeMap<Pair, usize> {
    let mut stats: BTreeMap<Pair, usize> = BTreeMap::new();
    for word in corpus {
        for i in 0..word.len().saturating_sub(1) {
            let key = (word[i].clone(), word[i + 1].clone());
            *stats.entry(key).or_insert(0) += 1;
        }
    }
    stats
}

fn merge_pair(pair: &Pair, corpus: &[Vec<String>]) -> Vec<Vec<String>> {
    let (a, b) = pair;
    let merged = format!("{}{}", a, b);
    let mut new_corpus = Vec::with_capacity(corpus.len());
    for word in corpus {
        let mut new_word = Vec::with_capacity(word.len());
        let mut i = 0;
        while i < word.len() {
            if i + 1 < word.len() && word[i] == *a && word[i + 1] == *b {
                new_word.push(merged.clone());
                i += 2;
            } else {
                new_word.push(word[i].clone());
                i += 1;
            }
        }
        new_corpus.push(new_word);
    }
    new_corpus
}

fn train_bpe(words: &[String], num_merges: usize) -> Vec<Pair> {
    let mut corpus: Vec<Vec<String>> = words
        .iter()
        .map(|w| {
            let mut symbols: Vec<String> = w.chars().map(|c| c.to_string()).collect();
            symbols.push("</w>".to_string());
            symbols
        })
        .collect();
    let mut merges = Vec::new();
    for _ in 0..num_merges {
        let stats = get_pair_stats(&corpus);
        if stats.is_empty() {
            break;
        }
        let best = stats
            .iter()
            .max_by(|a, b| a.1.cmp(b.1).then(a.0.cmp(b.0)))
            .map(|(pair, _)| pair.clone())
            .unwrap();
        corpus = merge_pair(&best, &corpus);
        merges.push(best);
    }
    merges
}

fn apply_bpe(word: &str, merges: &[Pair]) -> Vec<String> {
    let mut symbols: Vec<String> = word.chars().map(|c| c.to_string()).collect();
    symbols.push("</w>".to_string());
    for (a, b) in merges {
        let mut new_symbols = Vec::with_capacity(symbols.len());
        let mut i = 0;
        while i < symbols.len() {
            if i + 1 < symbols.len() && symbols[i] == *a && symbols[i + 1] == *b {
                new_symbols.push(format!("{}{}", a, b));
                i += 2;
            } else {
                new_symbols.push(symbols[i].clone());
                i += 1;
            }
        }
        symbols = new_symbols;
    }
    symbols
}
```

```csharp
static Dictionary<(string, string), int> GetPairStats(List<List<string>> corpus)
{
    var stats = new Dictionary<(string, string), int>();
    foreach (var word in corpus)
    {
        for (int i = 0; i < word.Count - 1; i++)
        {
            var key = (word[i], word[i + 1]);
            stats[key] = stats.GetValueOrDefault(key) + 1;
        }
    }
    return stats;
}

static List<List<string>> MergePair((string, string) pair, List<List<string>> corpus)
{
    var (a, b) = pair;
    string merged = a + b;
    var newCorpus = new List<List<string>>();
    foreach (var word in corpus)
    {
        var newWord = new List<string>();
        int i = 0;
        while (i < word.Count)
        {
            if (i < word.Count - 1 && word[i] == a && word[i + 1] == b)
            {
                newWord.Add(merged);
                i += 2;
            }
            else
            {
                newWord.Add(word[i]);
                i += 1;
            }
        }
        newCorpus.Add(newWord);
    }
    return newCorpus;
}

static List<(string, string)> TrainBpe(List<string> words, int numMerges)
{
    var corpus = words.Select(w => w.Select(c => c.ToString()).Append("</w>").ToList()).ToList();
    var merges = new List<(string, string)>();
    for (int m = 0; m < numMerges; m++)
    {
        var stats = GetPairStats(corpus);
        if (stats.Count == 0) break;
        var best = stats.OrderByDescending(kv => kv.Value)
                         .ThenByDescending(kv => kv.Key, Comparer<(string, string)>.Create((x, y) =>
                         {
                             int c1 = string.CompareOrdinal(x.Item1, y.Item1);
                             return c1 != 0 ? c1 : string.CompareOrdinal(x.Item2, y.Item2);
                         }))
                         .First().Key;
        merges.Add(best);
        corpus = MergePair(best, corpus);
    }
    return merges;
}

static List<string> ApplyBpe(string word, List<(string, string)> merges)
{
    var symbols = word.Select(c => c.ToString()).Append("</w>").ToList();
    foreach (var (a, b) in merges)
    {
        var newSymbols = new List<string>();
        int i = 0;
        while (i < symbols.Count)
        {
            if (i < symbols.Count - 1 && symbols[i] == a && symbols[i + 1] == b)
            {
                newSymbols.Add(a + b);
                i += 2;
            }
            else
            {
                newSymbols.Add(symbols[i]);
                i += 1;
            }
        }
        symbols = newSymbols;
    }
    return symbols;
}
```
