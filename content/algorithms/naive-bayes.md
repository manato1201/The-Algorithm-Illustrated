---
name: ナイーブベイズ
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd)
summary: 特徴同士が独立だと(強引に)仮定することで、ベイズの定理による分類を現実的な計算量で実現する。
---

## 概要

「あるメールが迷惑メールである確率」のように、与えられた特徴(単語の出現など)から、それがどのクラスに属するかを確率的に予測する分類手法。数学的に正しいベイズの定理を使いたいところだが、特徴同士の相互関係を厳密に考慮すると計算量が爆発してしまう。ナイーブベイズは、**「全ての特徴は互いに独立している」という、現実には成り立たないことが多い単純化(だからこそ"naive"=素朴/ナイーブ)を大胆に仮定する**ことで、この計算を現実的なコストまで削減しながら、驚くほど実用的な精度を発揮する。

## 仕組み

ベイズの定理は、「特徴Xが観測されたときに、クラスCである確率」を、「クラスCのときに特徴Xが観測される確率」と「クラスCの事前確率」から計算する方法を与える。

1. 訓練データから、各クラスの事前確率(そのクラスがどれだけ一般的か)を計算する
2. 各クラスにおける、各特徴(単語など)の出現確率を個別に計算する(このとき「独立性の仮定」により、複数の特徴の同時確率を、個々の特徴の確率の**単純な掛け算**で近似する)
3. 新しいデータが与えられたら、各クラスについて「事前確率 × 各特徴の出現確率の積」を計算し、**最も値が大きいクラス**を予測結果とする

「特徴同士の複雑な相関を無視して、単純に掛け合わせるだけ」という大胆な単純化にもかかわらず、テキスト分類のような、特徴数(単語数)が非常に多いタスクで特に効果を発揮することが経験的に知られている。

## 特性・トレードオフ

- **計算量**: O(nd)(n=データ数、d=特徴数)と非常に軽量で、学習・予測ともに高速
- **少ないデータでも機能しやすい**: パラメータ数が少なく単純なモデルであるため、訓練データが比較的少なくても過学習しにくい傾向がある
- **独立性の仮定の"良い意味での嘘"**: 実際には特徴同士に相関があっても、分類の**順位**(どのクラスの確率が最も高いか)さえ正しければ十分なため、確率の絶対値が不正確でも実用上の分類精度は保たれることが多い、という興味深い性質がある
- **使いどころ**: スパムメールフィルタ(ナイーブベイズの最も有名な応用例)、テキストの感情分析・トピック分類、医療診断における簡易的な確率推定、リアルタイム性が求められる軽量な分類システムなど

## 実装例

多項分布ナイーブベイズ(単語の出現回数に基づく、テキスト分類の典型的な設定)に、ラプラススムージング(未知語対策のための+1)を加えた実装。

```python
import math
from collections import defaultdict


def train_naive_bayes(docs: list[list[str]], labels: list[str]) -> dict:
    class_counts: dict[str, int] = defaultdict(int)
    word_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    vocab: set[str] = set()

    for doc, label in zip(docs, labels):
        class_counts[label] += 1
        for word in doc:
            word_counts[label][word] += 1
            vocab.add(word)

    total_docs = len(docs)
    priors = {c: count / total_docs for c, count in class_counts.items()}
    vocab_size = len(vocab)

    likelihoods: dict[str, dict[str, float]] = {}
    word_totals: dict[str, int] = {}
    for c in class_counts:
        total_words = sum(word_counts[c].values())
        word_totals[c] = total_words
        # ラプラススムージング: 分子分母に+1して未出現の単語の確率が0にならないようにする
        likelihoods[c] = {
            word: (word_counts[c][word] + 1) / (total_words + vocab_size)
            for word in vocab
        }

    return {
        "priors": priors,
        "likelihoods": likelihoods,
        "vocab_size": vocab_size,
        "word_totals": word_totals,
    }


def predict_naive_bayes(model: dict, doc: list[str]) -> str:
    best_class, best_score = None, float("-inf")
    for c, prior in model["priors"].items():
        # アンダーフロー回避のため、確率の積ではなく対数の和で計算する
        score = math.log(prior)
        for word in doc:
            if word in model["likelihoods"][c]:
                score += math.log(model["likelihoods"][c][word])
            else:
                score += math.log(1 / (model["word_totals"][c] + model["vocab_size"] + 1))
        if score > best_score:
            best_score = score
            best_class = c
    return best_class
```

```typescript
interface NaiveBayesModel {
  priors: Map<string, number>;
  likelihoods: Map<string, Map<string, number>>;
  vocabSize: number;
  wordTotals: Map<string, number>;
}

function trainNaiveBayes(docs: string[][], labels: string[]): NaiveBayesModel {
  const classCounts = new Map<string, number>();
  const wordCounts = new Map<string, Map<string, number>>();
  const vocab = new Set<string>();

  docs.forEach((doc, i) => {
    const label = labels[i];
    classCounts.set(label, (classCounts.get(label) ?? 0) + 1);
    if (!wordCounts.has(label)) wordCounts.set(label, new Map());
    for (const word of doc) {
      const wc = wordCounts.get(label)!;
      wc.set(word, (wc.get(word) ?? 0) + 1);
      vocab.add(word);
    }
  });

  const totalDocs = docs.length;
  const priors = new Map<string, number>();
  for (const [c, count] of classCounts) priors.set(c, count / totalDocs);
  const vocabSize = vocab.size;

  const likelihoods = new Map<string, Map<string, number>>();
  const wordTotals = new Map<string, number>();
  for (const c of classCounts.keys()) {
    const wc = wordCounts.get(c)!;
    const totalWords = [...wc.values()].reduce((s, v) => s + v, 0);
    wordTotals.set(c, totalWords);
    const likelihood = new Map<string, number>();
    for (const word of vocab) {
      // ラプラススムージング: 分子分母に+1して未出現の単語の確率が0にならないようにする
      likelihood.set(word, ((wc.get(word) ?? 0) + 1) / (totalWords + vocabSize));
    }
    likelihoods.set(c, likelihood);
  }

  return { priors, likelihoods, vocabSize, wordTotals };
}

function predictNaiveBayes(model: NaiveBayesModel, doc: string[]): string {
  let bestClass = "";
  let bestScore = -Infinity;
  for (const [c, prior] of model.priors) {
    let score = Math.log(prior); // アンダーフロー回避のため対数の和で計算する
    const likelihood = model.likelihoods.get(c)!;
    for (const word of doc) {
      if (likelihood.has(word)) {
        score += Math.log(likelihood.get(word)!);
      } else {
        score += Math.log(1 / (model.wordTotals.get(c)! + model.vocabSize + 1));
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestClass = c;
    }
  }
  return bestClass;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <limits>

using Document = std::vector<std::string>;

struct NaiveBayesModel {
    std::unordered_map<std::string, double> priors;
    std::unordered_map<std::string, std::unordered_map<std::string, double>> likelihoods;
    std::unordered_map<std::string, int> wordTotals;
    int vocabSize;
};

NaiveBayesModel trainNaiveBayes(const std::vector<Document>& docs, const std::vector<std::string>& labels) {
    std::unordered_map<std::string, int> classCounts;
    std::unordered_map<std::string, std::unordered_map<std::string, int>> wordCounts;
    std::unordered_set<std::string> vocab;

    for (size_t i = 0; i < docs.size(); i++) {
        const auto& label = labels[i];
        classCounts[label]++;
        for (const auto& word : docs[i]) {
            wordCounts[label][word]++;
            vocab.insert(word);
        }
    }

    NaiveBayesModel model;
    model.vocabSize = static_cast<int>(vocab.size());
    int totalDocs = static_cast<int>(docs.size());
    for (const auto& [c, count] : classCounts) model.priors[c] = static_cast<double>(count) / totalDocs;

    for (const auto& [c, count] : classCounts) {
        int totalWords = 0;
        for (const auto& [word, wc] : wordCounts[c]) totalWords += wc;
        model.wordTotals[c] = totalWords;
        for (const auto& word : vocab) {
            int wc = wordCounts[c].count(word) ? wordCounts[c][word] : 0;
            // ラプラススムージング: 分子分母に+1して未出現の単語の確率が0にならないようにする
            model.likelihoods[c][word] = static_cast<double>(wc + 1) / (totalWords + model.vocabSize);
        }
    }
    return model;
}

std::string predictNaiveBayes(const NaiveBayesModel& model, const Document& doc) {
    std::string bestClass;
    double bestScore = -std::numeric_limits<double>::infinity();
    for (const auto& [c, prior] : model.priors) {
        double score = std::log(prior); // アンダーフロー回避のため対数の和で計算する
        const auto& likelihood = model.likelihoods.at(c);
        for (const auto& word : doc) {
            auto it = likelihood.find(word);
            if (it != likelihood.end()) {
                score += std::log(it->second);
            } else {
                score += std::log(1.0 / (model.wordTotals.at(c) + model.vocabSize + 1));
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestClass = c;
        }
    }
    return bestClass;
}
```

```rust
use std::collections::{HashMap, HashSet};

type Document = Vec<String>;

struct NaiveBayesModel {
    priors: HashMap<String, f64>,
    likelihoods: HashMap<String, HashMap<String, f64>>,
    word_totals: HashMap<String, usize>,
    vocab_size: usize,
}

fn train_naive_bayes(docs: &[Document], labels: &[String]) -> NaiveBayesModel {
    let mut class_counts: HashMap<String, usize> = HashMap::new();
    let mut word_counts: HashMap<String, HashMap<String, usize>> = HashMap::new();
    let mut vocab: HashSet<String> = HashSet::new();

    for (doc, label) in docs.iter().zip(labels.iter()) {
        *class_counts.entry(label.clone()).or_insert(0) += 1;
        let wc = word_counts.entry(label.clone()).or_insert_with(HashMap::new);
        for word in doc {
            *wc.entry(word.clone()).or_insert(0) += 1;
            vocab.insert(word.clone());
        }
    }

    let total_docs = docs.len() as f64;
    let vocab_size = vocab.len();
    let mut priors = HashMap::new();
    for (c, count) in &class_counts {
        priors.insert(c.clone(), *count as f64 / total_docs);
    }

    let mut likelihoods = HashMap::new();
    let mut word_totals = HashMap::new();
    for c in class_counts.keys() {
        let wc = &word_counts[c];
        let total_words: usize = wc.values().sum();
        word_totals.insert(c.clone(), total_words);
        let mut likelihood = HashMap::new();
        for word in &vocab {
            let count = *wc.get(word).unwrap_or(&0);
            // ラプラススムージング: 分子分母に+1して未出現の単語の確率が0にならないようにする
            likelihood.insert(word.clone(), (count + 1) as f64 / (total_words + vocab_size) as f64);
        }
        likelihoods.insert(c.clone(), likelihood);
    }

    NaiveBayesModel { priors, likelihoods, word_totals, vocab_size }
}

fn predict_naive_bayes(model: &NaiveBayesModel, doc: &Document) -> String {
    let mut best_class = String::new();
    let mut best_score = f64::NEG_INFINITY;
    for (c, prior) in &model.priors {
        let mut score = prior.ln(); // アンダーフロー回避のため対数の和で計算する
        let likelihood = &model.likelihoods[c];
        for word in doc {
            if let Some(&p) = likelihood.get(word) {
                score += p.ln();
            } else {
                let total = model.word_totals[c];
                score += (1.0 / (total + model.vocab_size + 1) as f64).ln();
            }
        }
        if score > best_score {
            best_score = score;
            best_class = c.clone();
        }
    }
    best_class
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class NaiveBayesModel
{
    public Dictionary<string, double> Priors = new();
    public Dictionary<string, Dictionary<string, double>> Likelihoods = new();
    public Dictionary<string, int> WordTotals = new();
    public int VocabSize;
}

static NaiveBayesModel TrainNaiveBayes(List<List<string>> docs, List<string> labels)
{
    var classCounts = new Dictionary<string, int>();
    var wordCounts = new Dictionary<string, Dictionary<string, int>>();
    var vocab = new HashSet<string>();

    for (int i = 0; i < docs.Count; i++)
    {
        var label = labels[i];
        classCounts[label] = classCounts.GetValueOrDefault(label) + 1;
        if (!wordCounts.ContainsKey(label)) wordCounts[label] = new Dictionary<string, int>();
        foreach (var word in docs[i])
        {
            wordCounts[label][word] = wordCounts[label].GetValueOrDefault(word) + 1;
            vocab.Add(word);
        }
    }

    int totalDocs = docs.Count;
    var model = new NaiveBayesModel { VocabSize = vocab.Count };
    foreach (var (c, count) in classCounts) model.Priors[c] = (double)count / totalDocs;

    foreach (var c in classCounts.Keys)
    {
        int totalWords = wordCounts[c].Values.Sum();
        model.WordTotals[c] = totalWords;
        var likelihood = new Dictionary<string, double>();
        foreach (var word in vocab)
        {
            // ラプラススムージング: 分子分母に+1して未出現の単語の確率が0にならないようにする
            likelihood[word] = (wordCounts[c].GetValueOrDefault(word) + 1.0) / (totalWords + model.VocabSize);
        }
        model.Likelihoods[c] = likelihood;
    }

    return model;
}

static string PredictNaiveBayes(NaiveBayesModel model, List<string> doc)
{
    string bestClass = "";
    double bestScore = double.NegativeInfinity;
    foreach (var (c, prior) in model.Priors)
    {
        double score = Math.Log(prior); // アンダーフロー回避のため対数の和で計算する
        foreach (var word in doc)
        {
            if (model.Likelihoods[c].TryGetValue(word, out double likelihood))
                score += Math.Log(likelihood);
            else
                score += Math.Log(1.0 / (model.WordTotals[c] + model.VocabSize + 1));
        }
        if (score > bestScore) { bestScore = score; bestClass = c; }
    }
    return bestClass;
}
```
