---
name: n-gram言語モデル
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(n)(1文の確率計算、nは文の長さ)、O(コーパスサイズ)(訓練)
summary: 直前n-1個の単語だけから次の単語の出現確率を見積もる、文の「もっともらしさ」を統計的に定量化する最も基本的な言語モデル。
---

## 概要

「この文は自然な英語(あるいは日本語)らしいか」を定量的に判断できると、機械翻訳・音声認識・スペル訂正など多くの応用に役立つ。n-gram言語モデルは、「ある単語が現れる確率は、直前の`n-1`個の単語(文脈)だけに依存する」というマルコフ性の仮定を置くことで、文全体の確率をコーパスから数え上げた頻度だけから計算できるようにする、最もシンプルで解釈しやすい統計的言語モデルである。深層学習ベースの言語モデルが主流になった今でも、その考え方の原点として、また軽量なベースラインとして重要な位置を占めている。

## 仕組み

1. 文全体の確率は、確率の連鎖律により`P(w1, w2, ..., wm) = P(w1) × P(w2|w1) × P(w3|w1,w2) × ... × P(wm|w1,...,wm-1)`と分解できるが、これでは条件部分がどんどん長くなり、対応する組み合わせの頻度データが指数的に不足する(データスパース性の問題)
2. n-gramモデルは「`n-1`単語より前の文脈は無視してよい」というマルコフ性の仮定を置き、`P(wt|w1,...,wt-1) ≈ P(wt|wt-n+1,...,wt-1)`と近似する(例えば`n=3`のトライグラムモデルなら、直前2単語だけを見る)
3. この条件付き確率は、コーパス中の`n`単語連続の出現回数と`n-1`単語連続の出現回数の比、`P(wt|wt-n+1,...,wt-1) = count(wt-n+1,...,wt) / count(wt-n+1,...,wt-1)`として、単純な頻度カウントから直接推定できる
4. 訓練コーパスに一度も出現しなかったn-gramには確率0が割り当てられてしまい、そのn-gramを含む文の確率が全体としてゼロになってしまう(ゼロ頻度問題)。これを緩和するため、既知のn-gramから見た目の頻度を少し割り引いて未知のn-gramに確率を配分する平滑化([ナイーブベイズ](/algorithms/naive-bayes)でも使われるラプラススムージングの考え方に近い、より洗練された手法にはKneser-Ney平滑化などがある)を組み合わせるのが実用上ほぼ必須になる

## 特性・トレードオフ

- **計算量**: 訓練はコーパス中のn-gramの頻度を数え上げるだけなので、コーパスサイズに比例する。文の確率計算も文の長さ`n`に対して線形時間で済む、非常に軽量なモデル
- **文脈窓の長さとデータスパース性のトレードオフ**: `n`を大きくすると、より長い文脈を考慮できて表現力が上がるが、その分だけ同じn-gramがコーパス中に出現する回数が減り、頻度推定が不安定になる(次元の呪い)。実務では`n=2`(バイグラム)〜`n=5`程度が使われることが多い
- **長距離の依存関係を捉えられない**: マルコフ性の仮定により、`n-1`単語より前の文脈は完全に無視される。文の主語と遠く離れた動詞の呼応など、長距離の依存関係を扱うには、この限界を克服したRNN・Transformerベースの言語モデルが必要になる
- **使いどころ**: 音声認識・OCRの後処理での文の尤もらしさの評価、[ノイジーチャネルモデルによるスペル訂正](/algorithms/noisy-channel-spelling-correction)における言語モデル項の計算、機械翻訳の初期の統計的手法(統計的機械翻訳)の基盤、軽量なオートコンプリート機能の実装

## 実装例

小さなコーパスからバイグラム(n=2)モデルを構築し、ラプラス(add-1)平滑化を使って文の対数確率を計算する。

```python
import math

def build_bigram_counts(
    corpus: list[list[str]],
) -> tuple[dict[str, int], dict[tuple[str, str], int], set[str]]:
    unigram_counts: dict[str, int] = {}
    bigram_counts: dict[tuple[str, str], int] = {}
    vocab: set[str] = set()
    for sentence in corpus:
        tokens = ["<s>"] + sentence + ["</s>"]
        for i in range(len(tokens) - 1):
            w1, w2 = tokens[i], tokens[i + 1]
            vocab.add(w1)
            vocab.add(w2)
            unigram_counts[w1] = unigram_counts.get(w1, 0) + 1
            bigram_counts[(w1, w2)] = bigram_counts.get((w1, w2), 0) + 1
    return unigram_counts, bigram_counts, vocab


def sentence_log_prob(
    sentence: list[str],
    unigram_counts: dict[str, int],
    bigram_counts: dict[tuple[str, str], int],
    vocab_size: int,
) -> float:
    tokens = ["<s>"] + sentence + ["</s>"]
    log_prob = 0.0
    for i in range(len(tokens) - 1):
        w1, w2 = tokens[i], tokens[i + 1]
        # ラプラス(add-1)平滑化: 未知のn-gramにも小さな確率を残す
        count_bigram = bigram_counts.get((w1, w2), 0)
        count_unigram = unigram_counts.get(w1, 0)
        prob = (count_bigram + 1) / (count_unigram + vocab_size)
        log_prob += math.log(prob)
    return log_prob
```

```typescript
function buildBigramCounts(corpus: string[][]) {
  const unigramCounts = new Map<string, number>();
  const bigramCounts = new Map<string, number>();
  const vocab = new Set<string>();
  for (const sentence of corpus) {
    const tokens = ["<s>", ...sentence, "</s>"];
    for (let i = 0; i < tokens.length - 1; i++) {
      const [w1, w2] = [tokens[i], tokens[i + 1]];
      vocab.add(w1);
      vocab.add(w2);
      unigramCounts.set(w1, (unigramCounts.get(w1) ?? 0) + 1);
      const key = `${w1} ${w2}`;
      bigramCounts.set(key, (bigramCounts.get(key) ?? 0) + 1);
    }
  }
  return { unigramCounts, bigramCounts, vocab };
}

function sentenceLogProb(
  sentence: string[],
  unigramCounts: Map<string, number>,
  bigramCounts: Map<string, number>,
  vocabSize: number,
): number {
  const tokens = ["<s>", ...sentence, "</s>"];
  let logProb = 0;
  for (let i = 0; i < tokens.length - 1; i++) {
    const [w1, w2] = [tokens[i], tokens[i + 1]];
    // ラプラス(add-1)平滑化: 未知のn-gramにも小さな確率を残す
    const countBigram = bigramCounts.get(`${w1} ${w2}`) ?? 0;
    const countUnigram = unigramCounts.get(w1) ?? 0;
    const prob = (countBigram + 1) / (countUnigram + vocabSize);
    logProb += Math.log(prob);
  }
  return logProb;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <cmath>

struct PairHash {
    size_t operator()(const std::pair<std::string, std::string>& p) const {
        return std::hash<std::string>()(p.first) ^ (std::hash<std::string>()(p.second) << 1);
    }
};

using UnigramCounts = std::unordered_map<std::string, int>;
using BigramCounts = std::unordered_map<std::pair<std::string, std::string>, int, PairHash>;

void buildBigramCounts(
    const std::vector<std::vector<std::string>>& corpus,
    UnigramCounts& unigramCounts,
    BigramCounts& bigramCounts,
    std::unordered_set<std::string>& vocab) {
    for (const auto& sentence : corpus) {
        std::vector<std::string> tokens = {"<s>"};
        tokens.insert(tokens.end(), sentence.begin(), sentence.end());
        tokens.push_back("</s>");
        for (size_t i = 0; i + 1 < tokens.size(); i++) {
            const std::string& w1 = tokens[i];
            const std::string& w2 = tokens[i + 1];
            vocab.insert(w1);
            vocab.insert(w2);
            unigramCounts[w1]++;
            bigramCounts[{w1, w2}]++;
        }
    }
}

double sentenceLogProb(
    const std::vector<std::string>& sentence,
    const UnigramCounts& unigramCounts,
    const BigramCounts& bigramCounts,
    int vocabSize) {
    std::vector<std::string> tokens = {"<s>"};
    tokens.insert(tokens.end(), sentence.begin(), sentence.end());
    tokens.push_back("</s>");
    double logProb = 0.0;
    for (size_t i = 0; i + 1 < tokens.size(); i++) {
        const std::string& w1 = tokens[i];
        const std::string& w2 = tokens[i + 1];
        // ラプラス(add-1)平滑化: 未知のn-gramにも小さな確率を残す
        auto bigramIt = bigramCounts.find({w1, w2});
        int countBigram = bigramIt != bigramCounts.end() ? bigramIt->second : 0;
        auto unigramIt = unigramCounts.find(w1);
        int countUnigram = unigramIt != unigramCounts.end() ? unigramIt->second : 0;
        double prob = static_cast<double>(countBigram + 1) / (countUnigram + vocabSize);
        logProb += std::log(prob);
    }
    return logProb;
}
```

```rust
use std::collections::{HashMap, HashSet};

fn build_bigram_counts(
    corpus: &[Vec<String>],
) -> (HashMap<String, i32>, HashMap<(String, String), i32>, HashSet<String>) {
    let mut unigram_counts: HashMap<String, i32> = HashMap::new();
    let mut bigram_counts: HashMap<(String, String), i32> = HashMap::new();
    let mut vocab: HashSet<String> = HashSet::new();

    for sentence in corpus {
        let mut tokens = vec!["<s>".to_string()];
        tokens.extend(sentence.iter().cloned());
        tokens.push("</s>".to_string());
        for i in 0..tokens.len() - 1 {
            let w1 = tokens[i].clone();
            let w2 = tokens[i + 1].clone();
            vocab.insert(w1.clone());
            vocab.insert(w2.clone());
            *unigram_counts.entry(w1.clone()).or_insert(0) += 1;
            *bigram_counts.entry((w1, w2)).or_insert(0) += 1;
        }
    }
    (unigram_counts, bigram_counts, vocab)
}

fn sentence_log_prob(
    sentence: &[String],
    unigram_counts: &HashMap<String, i32>,
    bigram_counts: &HashMap<(String, String), i32>,
    vocab_size: usize,
) -> f64 {
    let mut tokens = vec!["<s>".to_string()];
    tokens.extend(sentence.iter().cloned());
    tokens.push("</s>".to_string());

    let mut log_prob = 0.0;
    for i in 0..tokens.len() - 1 {
        let w1 = &tokens[i];
        let w2 = &tokens[i + 1];
        // ラプラス(add-1)平滑化: 未知のn-gramにも小さな確率を残す
        let count_bigram = *bigram_counts.get(&(w1.clone(), w2.clone())).unwrap_or(&0);
        let count_unigram = *unigram_counts.get(w1).unwrap_or(&0);
        let prob = (count_bigram + 1) as f64 / (count_unigram as f64 + vocab_size as f64);
        log_prob += prob.ln();
    }
    log_prob
}
```

```csharp
static (Dictionary<string, int> Unigram, Dictionary<(string, string), int> Bigram, HashSet<string> Vocab) BuildBigramCounts(
    List<List<string>> corpus)
{
    var unigramCounts = new Dictionary<string, int>();
    var bigramCounts = new Dictionary<(string, string), int>();
    var vocab = new HashSet<string>();

    foreach (var sentence in corpus)
    {
        var tokens = new List<string> { "<s>" };
        tokens.AddRange(sentence);
        tokens.Add("</s>");
        for (int i = 0; i < tokens.Count - 1; i++)
        {
            var (w1, w2) = (tokens[i], tokens[i + 1]);
            vocab.Add(w1);
            vocab.Add(w2);
            unigramCounts[w1] = unigramCounts.GetValueOrDefault(w1, 0) + 1;
            bigramCounts[(w1, w2)] = bigramCounts.GetValueOrDefault((w1, w2), 0) + 1;
        }
    }
    return (unigramCounts, bigramCounts, vocab);
}

static double SentenceLogProb(
    List<string> sentence,
    Dictionary<string, int> unigramCounts,
    Dictionary<(string, string), int> bigramCounts,
    int vocabSize)
{
    var tokens = new List<string> { "<s>" };
    tokens.AddRange(sentence);
    tokens.Add("</s>");

    double logProb = 0;
    for (int i = 0; i < tokens.Count - 1; i++)
    {
        var (w1, w2) = (tokens[i], tokens[i + 1]);
        // ラプラス(add-1)平滑化: 未知のn-gramにも小さな確率を残す
        int countBigram = bigramCounts.GetValueOrDefault((w1, w2), 0);
        int countUnigram = unigramCounts.GetValueOrDefault(w1, 0);
        double prob = (countBigram + 1.0) / (countUnigram + vocabSize);
        logProb += Math.Log(prob);
    }
    return logProb;
}
```
