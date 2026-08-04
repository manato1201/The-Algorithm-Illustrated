---
name: WordPieceトークナイゼーション
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(語彙サイズ × コーパスサイズ)(訓練時)、O(n²)または貪欲法でO(n)(適用時)
summary: 統合によってコーパス全体の尤度(言語モデルとしてのもっともらしさ)が最も改善するペアを選ぶ、頻度だけに頼らないBPEの確率的な発展形。
---

## 概要

[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)は「最も頻繁に出現するペア」を機械的に統合していくが、単に頻度が高いというだけでは、言語モデルとしての性能に直結しない統合が選ばれてしまうことがある。2012年にGoogleの音声認識研究で考案され、後にBERTのトークナイザーとして広く知られるようになったWordPieceは、統合の基準を「頻度」から「その統合がコーパス全体の言語モデルの尤度(もっともらしさ)をどれだけ改善するか」に変更した、より統計的に洗練されたサブワード分割手法である。

## 仕組み

1. [バイトペア符号化](/algorithms/byte-pair-encoding)と同じく、まず全ての単語を基本文字に分解した状態から始める
2. 現在の語彙で、コーパス全体をユニグラム言語モデル(各トークンが独立に出現する確率モデル)として評価したときの対数尤度を考える
3. 隣接するペアの候補それぞれについて、「もしこのペアを1つのトークンとして統合したら、言語モデルの対数尤度がどれだけ増加するか」を計算する。これは、統合後のトークンの出現確率と、統合前の2つのトークンが独立に出現する確率の比(相互情報量に近い量)に相当する
4. 尤度の増加が最大になるペアを選んで統合し、語彙に追加する
5. 目標語彙サイズに達するまで2〜4を繰り返す
6. 未知テキストへの分割適用時は、語彙中の最長一致するサブワードから貪欲に切り出していく方式が一般的(WordPieceでは単語の先頭以外のサブワードに`##`のような接頭辞を付けて、単語内部の位置であることを示す実装が広く使われる、例: "unaffable" → "un", "##aff", "##able")

## 特性・トレードオフ

- **計算量**: 訓練時は各統合候補の尤度改善を評価する必要があり、素朴な実装では[バイトペア符号化](/algorithms/byte-pair-encoding)よりもコストが高くなりやすい。適用時の分割は、語彙中の最長一致を貪欲に探す方式なら入力長に比例する程度で済む
- **頻度ベースより統計的に洗練**: 単なる出現頻度ではなく「言語モデルとしての説明力の向上」を基準にするため、統計的に意味のあるサブワード分割が得られやすいとされる。実務上は[バイトペア符号化](/algorithms/byte-pair-encoding)との性能差は僅かなことも多いが、BERT系モデルの標準トークナイザーとして定着している
- **`##`記法による単語内位置の明示**: 単語の先頭に来るサブワードと単語の途中に来るサブワードを区別することで、トークン列から元のテキストの単語境界をある程度復元できる
- **使いどころ**: BERT・DistilBERTなど、Transformerベースの言語理解モデルの標準トークナイザー。[バイトペア符号化](/algorithms/byte-pair-encoding)とともに、現代の大規模言語モデルにおける「単語より細かく文字より粗い」語彙設計の主流手法の一角を占める

## 実装例

`{low:5, lower:2, newest:6, widest:3, new:4}`という単語頻度から目標語彙サイズ16まで学習し、学習に使った単語がすべて元の文字列へ正しく復元できること(ラウンドトリップ)、および未知語`newer`も既知のサブワードの組み合わせに分割できることを検証する。

```python
from collections import defaultdict


def word_to_symbols(word):
    return [word[0]] + ["##" + ch for ch in word[1:]]


def get_symbol_counts(splits, word_freqs):
    counts = defaultdict(int)
    for word, freq in word_freqs.items():
        for sym in splits[word]:
            counts[sym] += freq
    return counts


def get_pair_counts(splits, word_freqs):
    counts = defaultdict(int)
    for word, freq in word_freqs.items():
        symbols = splits[word]
        for i in range(len(symbols) - 1):
            counts[(symbols[i], symbols[i + 1])] += freq
    return counts


def merge_symbol(a, b):
    # bが"##"接頭辞を持つ場合はそれを外して結合し、aの接頭辞状態(単語先頭かどうか)は保持する
    b_clean = b[2:] if b.startswith("##") else b
    return a + b_clean


def train_wordpiece(word_freqs, vocab_size):
    splits = {word: word_to_symbols(word) for word in word_freqs}
    vocab = set(sym for symbols in splits.values() for sym in symbols)
    merges = []

    while len(vocab) < vocab_size:
        symbol_counts = get_symbol_counts(splits, word_freqs)
        pair_counts = get_pair_counts(splits, word_freqs)
        if not pair_counts:
            break
        # 頻度ではなく「言語モデルの尤度改善」= count(AB) / (count(A) * count(B)) が最大のペアを選ぶ
        best_pair = max(pair_counts, key=lambda p: pair_counts[p] / (symbol_counts[p[0]] * symbol_counts[p[1]]))
        a, b = best_pair
        merged = merge_symbol(a, b)
        merges.append((a, b, merged))
        vocab.add(merged)

        for word, symbols in splits.items():
            new_symbols = []
            i = 0
            while i < len(symbols):
                if i < len(symbols) - 1 and symbols[i] == a and symbols[i + 1] == b:
                    new_symbols.append(merged)
                    i += 2
                else:
                    new_symbols.append(symbols[i])
                    i += 1
            splits[word] = new_symbols

    return vocab, merges


def tokenize(word, vocab):
    tokens = []
    start = 0
    n = len(word)
    while start < n:
        end = n
        found = None
        while end > start:
            substr = word[start:end]
            candidate = substr if start == 0 else "##" + substr
            if candidate in vocab:
                found = candidate
                break
            end -= 1
        if found is None:
            return ["[UNK]"]
        tokens.append(found)
        start = end
    return tokens


# 検証: 学習に使った単語はすべて元の文字列へ復元でき、未知語もサブワードへ分割される
word_freqs = {"low": 5, "lower": 2, "newest": 6, "widest": 3, "new": 4}
vocab, merges = train_wordpiece(word_freqs, vocab_size=16)
print(tokenize("lower", vocab))   # => ['low', '##e', '##r']
print(tokenize("newest", vocab))  # => ['n', '##e', '##w', '##e', '##st']
print(tokenize("newer", vocab))   # => ['n', '##e', '##w', '##e', '##r'] (未知語)
```

```typescript
function wordToSymbols(word: string): string[] {
  return [word[0], ...word.slice(1).split("").map((ch) => "##" + ch)];
}

function getSymbolCounts(splits: Map<string, string[]>, wordFreqs: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [word, freq] of wordFreqs) {
    for (const sym of splits.get(word)!) counts.set(sym, (counts.get(sym) ?? 0) + freq);
  }
  return counts;
}

function getPairCounts(splits: Map<string, string[]>, wordFreqs: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [word, freq] of wordFreqs) {
    const symbols = splits.get(word)!;
    for (let i = 0; i < symbols.length - 1; i++) {
      const key = symbols[i] + " " + symbols[i + 1];
      counts.set(key, (counts.get(key) ?? 0) + freq);
    }
  }
  return counts;
}

function mergeSymbol(a: string, b: string): string {
  return a + (b.startsWith("##") ? b.slice(2) : b);
}

function trainWordpiece(
  wordFreqs: Map<string, number>,
  vocabSize: number
): { vocab: Set<string>; merges: Array<[string, string, string]> } {
  const splits = new Map<string, string[]>();
  for (const word of wordFreqs.keys()) splits.set(word, wordToSymbols(word));
  const vocab = new Set<string>();
  for (const symbols of splits.values()) for (const s of symbols) vocab.add(s);
  const merges: Array<[string, string, string]> = [];

  while (vocab.size < vocabSize) {
    const symbolCounts = getSymbolCounts(splits, wordFreqs);
    const pairCounts = getPairCounts(splits, wordFreqs);
    if (pairCounts.size === 0) break;

    let bestPair: [string, string] | null = null;
    let bestScore = -1;
    for (const [key, cnt] of pairCounts) {
      const [a, b] = key.split(" ");
      const score = cnt / (symbolCounts.get(a)! * symbolCounts.get(b)!);
      if (score > bestScore) {
        bestScore = score;
        bestPair = [a, b];
      }
    }
    if (bestPair === null) break;
    const [a, b] = bestPair;
    const merged = mergeSymbol(a, b);
    merges.push([a, b, merged]);
    vocab.add(merged);

    for (const [word, symbols] of splits) {
      const newSymbols: string[] = [];
      let i = 0;
      while (i < symbols.length) {
        if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
          newSymbols.push(merged);
          i += 2;
        } else {
          newSymbols.push(symbols[i]);
          i += 1;
        }
      }
      splits.set(word, newSymbols);
    }
  }
  return { vocab, merges };
}

function tokenize(word: string, vocab: Set<string>): string[] {
  const tokens: string[] = [];
  let start = 0;
  const n = word.length;
  while (start < n) {
    let end = n;
    let found: string | null = null;
    while (end > start) {
      const substr = word.slice(start, end);
      const candidate = start === 0 ? substr : "##" + substr;
      if (vocab.has(candidate)) {
        found = candidate;
        break;
      }
      end -= 1;
    }
    if (found === null) return ["[UNK]"];
    tokens.push(found);
    start = end;
  }
  return tokens;
}
```

```cpp
#include <vector>
#include <string>
#include <map>
#include <set>
#include <algorithm>

std::vector<std::string> wordToSymbols(const std::string& word) {
    std::vector<std::string> symbols{std::string(1, word[0])};
    for (size_t i = 1; i < word.size(); i++) symbols.push_back("##" + std::string(1, word[i]));
    return symbols;
}

std::map<std::string, int> getSymbolCounts(const std::map<std::string, std::vector<std::string>>& splits,
                                            const std::map<std::string, int>& wordFreqs) {
    std::map<std::string, int> counts;
    for (const auto& [word, freq] : wordFreqs) {
        for (const auto& sym : splits.at(word)) counts[sym] += freq;
    }
    return counts;
}

std::map<std::pair<std::string, std::string>, int> getPairCounts(
    const std::map<std::string, std::vector<std::string>>& splits, const std::map<std::string, int>& wordFreqs) {
    std::map<std::pair<std::string, std::string>, int> counts;
    for (const auto& [word, freq] : wordFreqs) {
        const auto& symbols = splits.at(word);
        for (size_t i = 0; i + 1 < symbols.size(); i++) counts[{symbols[i], symbols[i + 1]}] += freq;
    }
    return counts;
}

std::string mergeSymbol(const std::string& a, const std::string& b) {
    std::string bClean = (b.rfind("##", 0) == 0) ? b.substr(2) : b;
    return a + bClean;
}

std::pair<std::set<std::string>, std::vector<std::tuple<std::string, std::string, std::string>>> trainWordpiece(
    const std::map<std::string, int>& wordFreqs, size_t vocabSize) {
    std::map<std::string, std::vector<std::string>> splits;
    for (const auto& [word, _] : wordFreqs) splits[word] = wordToSymbols(word);
    std::set<std::string> vocab;
    for (const auto& [word, symbols] : splits)
        for (const auto& s : symbols) vocab.insert(s);
    std::vector<std::tuple<std::string, std::string, std::string>> merges;

    while (vocab.size() < vocabSize) {
        auto symbolCounts = getSymbolCounts(splits, wordFreqs);
        auto pairCounts = getPairCounts(splits, wordFreqs);
        if (pairCounts.empty()) break;

        double bestScore = -1;
        std::pair<std::string, std::string> bestPair;
        for (const auto& [pair, cnt] : pairCounts) {
            double score = static_cast<double>(cnt) / (symbolCounts[pair.first] * symbolCounts[pair.second]);
            if (score > bestScore) {
                bestScore = score;
                bestPair = pair;
            }
        }
        auto [a, b] = bestPair;
        std::string merged = mergeSymbol(a, b);
        merges.push_back({a, b, merged});
        vocab.insert(merged);

        for (auto& [word, symbols] : splits) {
            std::vector<std::string> newSymbols;
            size_t i = 0;
            while (i < symbols.size()) {
                if (i + 1 < symbols.size() && symbols[i] == a && symbols[i + 1] == b) {
                    newSymbols.push_back(merged);
                    i += 2;
                } else {
                    newSymbols.push_back(symbols[i]);
                    i += 1;
                }
            }
            symbols = newSymbols;
        }
    }
    return {vocab, merges};
}

std::vector<std::string> tokenize(const std::string& word, const std::set<std::string>& vocab) {
    std::vector<std::string> tokens;
    size_t start = 0;
    size_t n = word.size();
    while (start < n) {
        size_t end = n;
        bool found = false;
        std::string foundToken;
        while (end > start) {
            std::string substr = word.substr(start, end - start);
            std::string candidate = start == 0 ? substr : "##" + substr;
            if (vocab.count(candidate)) {
                found = true;
                foundToken = candidate;
                break;
            }
            end -= 1;
        }
        if (!found) return {"[UNK]"};
        tokens.push_back(foundToken);
        start = end;
    }
    return tokens;
}
```

```rust
use std::collections::{BTreeMap, BTreeSet, HashMap};

fn word_to_symbols(word: &str) -> Vec<String> {
    let chars: Vec<char> = word.chars().collect();
    let mut symbols = vec![chars[0].to_string()];
    for &ch in &chars[1..] {
        symbols.push(format!("##{}", ch));
    }
    symbols
}

fn get_symbol_counts(splits: &BTreeMap<String, Vec<String>>, word_freqs: &BTreeMap<String, i32>) -> HashMap<String, i32> {
    let mut counts = HashMap::new();
    for (word, &freq) in word_freqs {
        for sym in &splits[word] {
            *counts.entry(sym.clone()).or_insert(0) += freq;
        }
    }
    counts
}

fn get_pair_counts(
    splits: &BTreeMap<String, Vec<String>>,
    word_freqs: &BTreeMap<String, i32>,
) -> HashMap<(String, String), i32> {
    let mut counts = HashMap::new();
    for (word, &freq) in word_freqs {
        let symbols = &splits[word];
        for i in 0..symbols.len().saturating_sub(1) {
            *counts.entry((symbols[i].clone(), symbols[i + 1].clone())).or_insert(0) += freq;
        }
    }
    counts
}

fn merge_symbol(a: &str, b: &str) -> String {
    let b_clean = b.strip_prefix("##").unwrap_or(b);
    format!("{a}{b_clean}")
}

fn train_wordpiece(word_freqs: &BTreeMap<String, i32>, vocab_size: usize) -> BTreeSet<String> {
    let mut splits: BTreeMap<String, Vec<String>> =
        word_freqs.keys().map(|w| (w.clone(), word_to_symbols(w))).collect();
    let mut vocab: BTreeSet<String> = splits.values().flatten().cloned().collect();

    while vocab.len() < vocab_size {
        let symbol_counts = get_symbol_counts(&splits, word_freqs);
        let pair_counts = get_pair_counts(&splits, word_freqs);
        if pair_counts.is_empty() {
            break;
        }
        let best_pair = pair_counts
            .iter()
            .map(|((a, b), &cnt)| {
                let score = cnt as f64 / (symbol_counts[a] as f64 * symbol_counts[b] as f64);
                ((a.clone(), b.clone()), score)
            })
            .max_by(|x, y| x.1.partial_cmp(&y.1).unwrap())
            .unwrap()
            .0;
        let (a, b) = best_pair;
        let merged = merge_symbol(&a, &b);
        vocab.insert(merged.clone());

        for symbols in splits.values_mut() {
            let mut new_symbols = Vec::new();
            let mut i = 0;
            while i < symbols.len() {
                if i + 1 < symbols.len() && symbols[i] == a && symbols[i + 1] == b {
                    new_symbols.push(merged.clone());
                    i += 2;
                } else {
                    new_symbols.push(symbols[i].clone());
                    i += 1;
                }
            }
            *symbols = new_symbols;
        }
    }
    vocab
}

fn tokenize(word: &str, vocab: &BTreeSet<String>) -> Vec<String> {
    let chars: Vec<char> = word.chars().collect();
    let n = chars.len();
    let mut tokens = Vec::new();
    let mut start = 0;
    while start < n {
        let mut end = n;
        let mut found: Option<String> = None;
        while end > start {
            let substr: String = chars[start..end].iter().collect();
            let candidate = if start == 0 { substr } else { format!("##{substr}") };
            if vocab.contains(&candidate) {
                found = Some(candidate);
                break;
            }
            end -= 1;
        }
        match found {
            Some(tok) => {
                tokens.push(tok);
                start = end;
            }
            None => return vec!["[UNK]".to_string()],
        }
    }
    tokens
}
```

```csharp
static List<string> WordToSymbols(string word)
{
    var result = new List<string> { word[0].ToString() };
    for (int i = 1; i < word.Length; i++) result.Add("##" + word[i]);
    return result;
}

static Dictionary<string, int> GetSymbolCounts(Dictionary<string, List<string>> splits, Dictionary<string, int> wordFreqs)
{
    var counts = new Dictionary<string, int>();
    foreach (var (word, freq) in wordFreqs)
        foreach (var sym in splits[word])
            counts[sym] = counts.GetValueOrDefault(sym, 0) + freq;
    return counts;
}

static Dictionary<(string, string), int> GetPairCounts(Dictionary<string, List<string>> splits, Dictionary<string, int> wordFreqs)
{
    var counts = new Dictionary<(string, string), int>();
    foreach (var (word, freq) in wordFreqs)
    {
        var symbols = splits[word];
        for (int i = 0; i < symbols.Count - 1; i++)
        {
            var key = (symbols[i], symbols[i + 1]);
            counts[key] = counts.GetValueOrDefault(key, 0) + freq;
        }
    }
    return counts;
}

static string MergeSymbol(string a, string b) => a + (b.StartsWith("##") ? b.Substring(2) : b);

static HashSet<string> TrainWordpiece(Dictionary<string, int> wordFreqs, int vocabSize)
{
    var splits = new Dictionary<string, List<string>>();
    foreach (var word in wordFreqs.Keys) splits[word] = WordToSymbols(word);
    var vocab = new HashSet<string>();
    foreach (var symbols in splits.Values) foreach (var s in symbols) vocab.Add(s);

    while (vocab.Count < vocabSize)
    {
        var symbolCounts = GetSymbolCounts(splits, wordFreqs);
        var pairCounts = GetPairCounts(splits, wordFreqs);
        if (pairCounts.Count == 0) break;

        (string, string)? bestPair = null;
        double bestScore = -1;
        foreach (var (pair, cnt) in pairCounts)
        {
            double score = (double)cnt / (symbolCounts[pair.Item1] * symbolCounts[pair.Item2]);
            if (score > bestScore) { bestScore = score; bestPair = pair; }
        }
        var (a, b) = bestPair!.Value;
        string merged = MergeSymbol(a, b);
        vocab.Add(merged);

        foreach (var word in splits.Keys.ToList())
        {
            var symbols = splits[word];
            var newSymbols = new List<string>();
            int i = 0;
            while (i < symbols.Count)
            {
                if (i < symbols.Count - 1 && symbols[i] == a && symbols[i + 1] == b)
                {
                    newSymbols.Add(merged);
                    i += 2;
                }
                else
                {
                    newSymbols.Add(symbols[i]);
                    i += 1;
                }
            }
            splits[word] = newSymbols;
        }
    }
    return vocab;
}

static List<string> Tokenize(string word, HashSet<string> vocab)
{
    var tokens = new List<string>();
    int start = 0;
    int n = word.Length;
    while (start < n)
    {
        int end = n;
        string? found = null;
        while (end > start)
        {
            string substr = word.Substring(start, end - start);
            string candidate = start == 0 ? substr : "##" + substr;
            if (vocab.Contains(candidate)) { found = candidate; break; }
            end -= 1;
        }
        if (found == null) return new List<string> { "[UNK]" };
        tokens.Add(found);
        start = end;
    }
    return tokens;
}
```
