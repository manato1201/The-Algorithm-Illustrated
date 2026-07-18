---
name: TF-IDF
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(語彙数)
summary: 単語の出現頻度(TF)と、その単語がどれだけ珍しいか(IDF)を掛け合わせて重要度を数値化する。
---

## 概要

「ある文書の中で、どの単語が重要か」を数値化する、情報検索における最も基本的で影響力の大きい手法のひとつ。単に「よく出てくる単語が重要」と考えると、「は」「です」のようなありふれた単語ばかりが上位に来てしまう。TF-IDFは、**「その文書の中でよく出てくる」かつ「他の文書ではあまり出てこない」**単語ほど、その文書を特徴づける重要な単語である、という直感を数式にした。

## 仕組み

TF-IDFのスコアは、2つの要素の掛け算で構成される。

1. **TF(Term Frequency、単語の出現頻度)**: ある単語が、その文書の中でどれだけ多く出現するかを表す。単純にはその単語の出現回数を文書の総単語数で割った値
2. **IDF(Inverse Document Frequency、逆文書頻度)**: その単語が、文書集合全体の中でどれだけ**珍しいか**を表す。全文書数を「その単語を含む文書数」で割り、対数を取ることで計算される(多くの文書に出現する単語ほどIDFは小さくなる)
3. `TF-IDF = TF × IDF` として、両方が高い(その文書で頻出し、かつ他の文書では珍しい)単語ほど高いスコアを持つ

「は」「の」のような助詞は、ほぼ全ての文書に出現するためIDFがほぼ0になり、TFがどれだけ高くても最終スコアは低く抑えられる。一方、「量子コンピュータ」のような専門用語は、それを含む文書では高いTFを持ち、かつ全体では珍しい(IDFが高い)ため、TF-IDFスコアが高くなる。

## 特性・トレードオフ

- **計算量**: 文書の語彙数に比例するO(語彙数)で、事前に文書集合全体からIDFを計算しておけば、個々の文書のスコアリングは高速
- **BM25との関係**: BM25はTF-IDFの発展形であり、出現頻度の飽和や文書長の正規化といった、より実用的な調整が加えられている。TF-IDFはそのシンプルさから、教育目的や軽量な実装が求められる場面で今も使われる
- **単語の意味を理解しない**: 「car」と「automobile」のような同義語は全く別の単語として扱われ、意味的なつながりを考慮しない。この限界を超えるために、埋め込みベクトルによる意味的な類似度検索(ベクトル検索)が後に発展した
- **使いどころ**: 文書の特徴語抽出、キーワード抽出、シンプルな検索エンジンのスコアリング、文書のクラスタリング・分類における特徴量の生成など、自然言語処理の入門的な手法として広く教えられ、今なお実務でも使われている

## 実装例

```python
import math


def compute_tf(doc: list[str]) -> dict[str, float]:
    tf: dict[str, float] = {}
    for word in doc:
        tf[word] = tf.get(word, 0) + 1
    total = len(doc)
    return {word: count / total for word, count in tf.items()}


def compute_idf(docs: list[list[str]]) -> dict[str, float]:
    n = len(docs)
    vocab = set(word for doc in docs for word in doc)
    idf: dict[str, float] = {}
    for word in vocab:
        containing = sum(1 for doc in docs if word in doc)
        idf[word] = math.log(n / containing)
    return idf


def tf_idf(docs: list[list[str]]) -> list[dict[str, float]]:
    idf = compute_idf(docs)
    return [
        {word: tf_val * idf[word] for word, tf_val in compute_tf(doc).items()}
        for doc in docs
    ]
```

```typescript
function computeTf(doc: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const word of doc) tf.set(word, (tf.get(word) ?? 0) + 1);
  const total = doc.length;
  for (const [word, count] of tf) tf.set(word, count / total);
  return tf;
}

function computeIdf(docs: string[][]): Map<string, number> {
  const n = docs.length;
  const vocab = new Set(docs.flat());
  const idf = new Map<string, number>();
  for (const word of vocab) {
    const containing = docs.filter((doc) => doc.includes(word)).length;
    idf.set(word, Math.log(n / containing));
  }
  return idf;
}

function tfIdf(docs: string[][]): Map<string, number>[] {
  const idf = computeIdf(docs);
  return docs.map((doc) => {
    const tf = computeTf(doc);
    const result = new Map<string, number>();
    for (const [word, tfVal] of tf) result.set(word, tfVal * idf.get(word)!);
    return result;
  });
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cmath>

using Document = std::vector<std::string>;

std::unordered_map<std::string, double> computeTf(const Document& doc) {
    std::unordered_map<std::string, double> tf;
    for (const auto& word : doc) tf[word] += 1.0;
    double total = static_cast<double>(doc.size());
    for (auto& [word, count] : tf) count /= total;
    return tf;
}

std::unordered_map<std::string, double> computeIdf(const std::vector<Document>& docs) {
    double n = static_cast<double>(docs.size());
    std::unordered_set<std::string> vocab;
    for (const auto& doc : docs) for (const auto& w : doc) vocab.insert(w);

    std::unordered_map<std::string, double> idf;
    for (const auto& word : vocab) {
        int containing = 0;
        for (const auto& doc : docs) {
            if (std::find(doc.begin(), doc.end(), word) != doc.end()) containing++;
        }
        idf[word] = std::log(n / containing);
    }
    return idf;
}

std::vector<std::unordered_map<std::string, double>> tfIdf(const std::vector<Document>& docs) {
    auto idf = computeIdf(docs);
    std::vector<std::unordered_map<std::string, double>> result;
    for (const auto& doc : docs) {
        auto tf = computeTf(doc);
        std::unordered_map<std::string, double> scores;
        for (auto& [word, tfVal] : tf) scores[word] = tfVal * idf[word];
        result.push_back(std::move(scores));
    }
    return result;
}
```

```rust
use std::collections::{HashMap, HashSet};

type Document = Vec<String>;

fn compute_tf(doc: &Document) -> HashMap<String, f64> {
    let mut tf: HashMap<String, f64> = HashMap::new();
    for word in doc {
        *tf.entry(word.clone()).or_insert(0.0) += 1.0;
    }
    let total = doc.len() as f64;
    for count in tf.values_mut() {
        *count /= total;
    }
    tf
}

fn compute_idf(docs: &[Document]) -> HashMap<String, f64> {
    let n = docs.len() as f64;
    let vocab: HashSet<&String> = docs.iter().flatten().collect();
    let mut idf = HashMap::new();
    for word in vocab {
        let containing = docs.iter().filter(|doc| doc.contains(word)).count() as f64;
        idf.insert(word.clone(), (n / containing).ln());
    }
    idf
}

fn tf_idf(docs: &[Document]) -> Vec<HashMap<String, f64>> {
    let idf = compute_idf(docs);
    docs.iter()
        .map(|doc| {
            compute_tf(doc)
                .into_iter()
                .map(|(word, tf_val)| {
                    let idf_val = idf[&word];
                    (word, tf_val * idf_val)
                })
                .collect()
        })
        .collect()
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static Dictionary<string, double> ComputeTf(List<string> doc)
{
    var tf = new Dictionary<string, double>();
    foreach (var word in doc) tf[word] = tf.GetValueOrDefault(word) + 1;
    int total = doc.Count;
    return tf.ToDictionary(kv => kv.Key, kv => kv.Value / total);
}

static Dictionary<string, double> ComputeIdf(List<List<string>> docs)
{
    int n = docs.Count;
    var vocab = docs.SelectMany(d => d).Distinct();
    var idf = new Dictionary<string, double>();
    foreach (var word in vocab)
    {
        int containing = docs.Count(d => d.Contains(word));
        idf[word] = Math.Log((double)n / containing);
    }
    return idf;
}

static List<Dictionary<string, double>> TfIdf(List<List<string>> docs)
{
    var idf = ComputeIdf(docs);
    return docs.Select(doc =>
    {
        var tf = ComputeTf(doc);
        return tf.ToDictionary(kv => kv.Key, kv => kv.Value * idf[kv.Key]);
    }).ToList();
}
```
