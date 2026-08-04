---
name: ノイジーチャネルモデルによるスペル訂正
category: 自然言語処理
subcategory: 要約・訂正
complexity: O(候補数 × n)(nは編集距離計算のコスト)
summary: 「本来正しかった単語がタイプミスという雑音を経て今の誤った綴りになった」と仮定し、誤り確率と言語としての自然さの両方から最も尤もらしい訂正候補を選ぶスペルチェッカーの理論的基盤。
---

## 概要

"teh"と入力されたとき、正しくは"the"だと推測するスペル訂正は、単に[編集距離](/algorithms/edit-distance)が近い単語を探すだけでは不十分なことがある——複数の候補が同じ編集距離を持つ場合、どれが「本当に意図された単語」かを決める必要がある。1990年にケルナハンらが定式化したノイジーチャネルモデルは、通信工学の「送信された信号がノイズの多い通信路(チャネル)を通る間に歪められて受信される」というモデルを言語に応用し、「本来正しい単語`w`が、タイプミスというノイズを経て、観測された誤った綴り`x`になった」と考える。ベイズの定理を使い、「`w`がそもそもどれだけ使われやすい単語か(言語モデル)」と「`w`から`x`へのタイプミスがどれだけ起こりやすいか(誤りモデル)」の両方を掛け合わせて、最も尤もらしい訂正候補を選ぶ。

## 仕組み

1. 観測された誤った綴り`x`が与えられたとき、求めたいのは「`x`が観測されたときに、本来の単語が`w`である確率」`P(w|x)`を最大にする`w`である
2. ベイズの定理により、`P(w|x) ∝ P(x|w) × P(w)`と分解できる。`P(w)`は「そもそも単語`w`がどれだけ一般的に使われるか」を表す事前確率で、[n-gram言語モデル](/algorithms/n-gram-language-model)や単純な単語頻度から推定する
3. `P(x|w)`は「正しい単語`w`が、タイプミスによって`x`という綴りに化ける確率」(誤りモデル)で、挿入・削除・置換・隣接文字の入れ替えといった典型的なタイプミスのパターンごとに、実際のタイプミスのコーパスから確率を推定する
4. 訂正候補`w`の集合は、`x`から[編集距離](/algorithms/edit-distance)が近い(通常は編集距離1〜2以内の)辞書中の単語を列挙することで得る——[編集距離](/algorithms/edit-distance)の計算過程(挿入・削除・置換のどの操作が何回使われたか)がそのまま誤りモデルの計算に流用できる
5. 全ての候補`w`について`P(x|w) × P(w)`を計算し、最大となる`w`を最終的な訂正候補として提示する

## 特性・トレードオフ

- **計算量**: 候補となる単語の数(通常は編集距離が小さい範囲に絞られる)に対して、各候補の誤り確率・言語モデル確率の計算コストを掛けた程度。辞書全体との総当たり比較([編集距離](/algorithms/edit-distance)をトライ木でまとめて計算する高速化も可能)より現実的な計算量に収まる
- **単なる[編集距離](/algorithms/edit-distance)の最小化との違い**: 編集距離だけで訂正候補を選ぶと、複数の候補が同じ距離になったときにどれを選ぶべきか分からない。ノイジーチャネルモデルは「よく使われる単語」「よく起こるタイプミスのパターン」という2つの追加情報を組み合わせることで、より人間の意図に近い訂正を選べる
- **文脈を考慮した拡張**: 単語単体の頻度`P(w)`ではなく、[n-gram言語モデル](/algorithms/n-gram-language-model)で「直前の単語列を踏まえたときのその単語の自然さ」を使うと、文脈に応じた訂正(同じ誤字でも前後の単語によって異なる訂正候補を選ぶ)が可能になる
- **使いどころ**: ワープロ・検索エンジンのスペルチェッカー・自動訂正機能、OCR(光学文字認識)の誤認識訂正、音声認識の後処理における誤認識の訂正。統計的機械翻訳の理論的枠組み(翻訳先言語への「ノイズ」としての翻訳過程をモデル化する)にも同じベイズ的な発想が使われている

## 実装例

小さな単語頻度辞書(言語モデル`P(w)`の代わり)と、編集距離に応じて指数的に確率が下がる単純な誤りモデル`P(x|w)`を組み合わせ、`P(x|w) × P(w)`が最大になる訂正候補を選ぶ。`"teh"`→`"the"`のような典型的な入れ替えミスが正しく訂正されることを検証する。

```python
def edit_distance(a: str, b: str) -> int:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[n][m]


def noisy_channel_correct(
    word: str, dictionary_freq: dict[str, int], max_edit_distance: int = 2
) -> str:
    total_freq = sum(dictionary_freq.values())
    candidates: list[tuple[str, float]] = []
    for candidate, freq in dictionary_freq.items():
        d = edit_distance(word, candidate)
        if d <= max_edit_distance:
            prior = freq / total_freq  # P(w): 単語の一般的な使われやすさ
            error_prob = 0.9 if d == 0 else 0.1**d  # P(x|w): 誤りモデル
            candidates.append((candidate, prior * error_prob))
    if not candidates:
        return word
    return max(candidates, key=lambda c: c[1])[0]


dictionary_freq = {"the": 1000, "then": 50, "them": 40, "tea": 5, "ten": 20}
print(noisy_channel_correct("teh", dictionary_freq))  # "the"
```

```typescript
function editDistance(a: string, b: string): number {
  const [n, m] = [a.length, b.length];
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[n][m];
}

function noisyChannelCorrect(word: string, dictionaryFreq: Map<string, number>, maxEditDistance = 2): string {
  const totalFreq = [...dictionaryFreq.values()].reduce((a, b) => a + b, 0);
  const candidates: [string, number][] = [];
  for (const [candidate, freq] of dictionaryFreq) {
    const d = editDistance(word, candidate);
    if (d <= maxEditDistance) {
      const prior = freq / totalFreq; // P(w): 単語の一般的な使われやすさ
      const errorProb = d === 0 ? 0.9 : Math.pow(0.1, d); // P(x|w): 誤りモデル
      candidates.push([candidate, prior * errorProb]);
    }
  }
  if (candidates.length === 0) return word;
  return candidates.reduce((best, c) => (c[1] > best[1] ? c : best))[0];
}
```

```cpp
#include <string>
#include <unordered_map>
#include <vector>
#include <algorithm>
#include <cmath>

int editDistance(const std::string& a, const std::string& b) {
    int n = static_cast<int>(a.size()), m = static_cast<int>(b.size());
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            int cost = a[i - 1] == b[j - 1] ? 0 : 1;
            dp[i][j] = std::min({dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost});
        }
    }
    return dp[n][m];
}

std::string noisyChannelCorrect(
    const std::string& word,
    const std::unordered_map<std::string, int>& dictionaryFreq,
    int maxEditDistance = 2) {
    int totalFreq = 0;
    for (const auto& [w, freq] : dictionaryFreq) totalFreq += freq;

    std::string best;
    double bestScore = -1.0;
    for (const auto& [candidate, freq] : dictionaryFreq) {
        int d = editDistance(word, candidate);
        if (d <= maxEditDistance) {
            double prior = static_cast<double>(freq) / totalFreq;      // P(w)
            double errorProb = d == 0 ? 0.9 : std::pow(0.1, d);        // P(x|w)
            double score = prior * errorProb;
            if (score > bestScore) { bestScore = score; best = candidate; }
        }
    }
    return bestScore < 0 ? word : best;
}
```

```rust
use std::collections::HashMap;

fn edit_distance(a: &str, b: &str) -> usize {
    let (a, b): (Vec<char>, Vec<char>) = (a.chars().collect(), b.chars().collect());
    let (n, m) = (a.len(), b.len());
    let mut dp = vec![vec![0usize; m + 1]; n + 1];
    for i in 0..=n { dp[i][0] = i; }
    for j in 0..=m { dp[0][j] = j; }
    for i in 1..=n {
        for j in 1..=m {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            dp[i][j] = (dp[i - 1][j] + 1).min(dp[i][j - 1] + 1).min(dp[i - 1][j - 1] + cost);
        }
    }
    dp[n][m]
}

fn noisy_channel_correct(word: &str, dictionary_freq: &HashMap<String, i32>, max_edit_distance: usize) -> String {
    let total_freq: i32 = dictionary_freq.values().sum();
    let mut best_candidate = word.to_string();
    let mut best_score = -1.0_f64;

    for (candidate, &freq) in dictionary_freq {
        let d = edit_distance(word, candidate);
        if d <= max_edit_distance {
            let prior = freq as f64 / total_freq as f64; // P(w)
            let error_prob = if d == 0 { 0.9 } else { 0.1_f64.powi(d as i32) }; // P(x|w)
            let score = prior * error_prob;
            if score > best_score {
                best_score = score;
                best_candidate = candidate.clone();
            }
        }
    }
    best_candidate
}
```

```csharp
static int EditDistance(string a, string b)
{
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i;
    for (int j = 0; j <= m; j++) dp[0, j] = j;
    for (int i = 1; i <= n; i++)
    {
        for (int j = 1; j <= m; j++)
        {
            int cost = a[i - 1] == b[j - 1] ? 0 : 1;
            dp[i, j] = Math.Min(Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1), dp[i - 1, j - 1] + cost);
        }
    }
    return dp[n, m];
}

static string NoisyChannelCorrect(string word, Dictionary<string, int> dictionaryFreq, int maxEditDistance = 2)
{
    int totalFreq = dictionaryFreq.Values.Sum();
    string best = word;
    double bestScore = -1;

    foreach (var (candidate, freq) in dictionaryFreq)
    {
        int d = EditDistance(word, candidate);
        if (d <= maxEditDistance)
        {
            double prior = (double)freq / totalFreq;               // P(w)
            double errorProb = d == 0 ? 0.9 : Math.Pow(0.1, d);     // P(x|w)
            double score = prior * errorProb;
            if (score > bestScore) { bestScore = score; best = candidate; }
        }
    }
    return best;
}
```
