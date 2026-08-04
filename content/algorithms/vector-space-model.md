---
name: ベクトル空間モデル(Vector Space Model)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(V)(V=語彙数、クエリと文書1件のコサイン類似度計算)
summary: 文書とクエリをそれぞれ「単語の出現頻度を成分とする高次元ベクトル」とみなし、両者の類似度をベクトル間のコサイン類似度(なす角の近さ)として計算する、[TF-IDF](/algorithms/tf-idf)を実際の検索に使うための幾何学的な枠組み。
---

## 概要

[TF-IDF](/algorithms/tf-idf)は「ある単語が、ある文書にとってどれだけ重要か」という重みを計算する手法だが、それ単体では「クエリに最も合致する文書はどれか」を決める仕組みにはならない。1975年にジェラルド・ソルトン(Salton)らが提案したベクトル空間モデルは、この橋渡しを行う——語彙全体のサイズを次元数とする高次元空間を考え、各文書・各クエリを「各単語のTF-IDF値を成分とするベクトル」として表現する。すると「文書がクエリにどれだけ関連しているか」という情報検索の中心的な問いが、「2つのベクトルのなす角がどれだけ小さいか(コサイン類似度がどれだけ1に近いか)」という純粋に幾何学的な問いに置き換わる——[TF-IDF](/algorithms/tf-idf)や[BM25](/algorithms/bm25)のような重み付け手法を実際の検索システムに組み込むための、情報検索の基礎理論となる枠組みである。

## 仕組み

1. コーパス全体に出現する単語の集合(語彙)を洗い出し、その語彙数を次元数`V`とする高次元ベクトル空間を定義する
2. 各文書`d`を、[TF-IDF](/algorithms/tf-idf)によって計算した各単語の重みを成分とするベクトル`d⃗`として表現する(その文書に出現しない単語の成分は0になる、非常に疎なベクトルになる)
3. クエリ`q`も同様に、TF-IDF(またはクエリ内での単純な出現有無)を成分とするベクトル`q⃗`として表現する
4. 文書`d`とクエリ`q`の類似度を、コサイン類似度`cos(θ) = (d⃗・q⃗) / (|d⃗| |q⃗|)`(内積をそれぞれのベクトルの長さで正規化したもの)として計算する——ベクトルの長さではなく「向き」の近さだけを見ることで、長い文書が単に語数が多いという理由だけで有利になることを防ぐ
5. コーパス内の全文書についてこの類似度を計算し、類似度の高い順にランキングして検索結果として返す

## 特性・トレードオフ

- **計算量**: 各文書ベクトルは疎(非零成分は文書に実際に出現する単語のみ)であるため、転置インデックスと組み合わせれば、クエリに含まれる単語を持つ文書だけを効率的に列挙してコサイン類似度を計算できる。1件あたりの類似度計算自体は`O(V)`だが実際には疎性のおかげでずっと高速に処理できる
- **コサイン類似度が「長さ」ではなく「向き」を見る理由**: 単純な内積だけを類似度に使うと、単語数が多い(長い)文書が有利になってしまう(単語を繰り返すほど内積が大きくなるため)。ベクトルの長さで正規化することで、短い文書でも関連する単語の「割合」が高ければ高く評価されるようになる
- **[潜在意味解析](/algorithms/latent-semantic-analysis)との関係**: ベクトル空間モデルは単語をそのまま次元として使うため、同義語(「車」と「自動車」)を別次元として扱ってしまう限界がある。[潜在意味解析(LSA)](/algorithms/latent-semantic-analysis)は、この語彙空間を特異値分解によってより低次元の「意味空間」に圧縮することで、この限界を緩和する発展形になっている
- **使いどころ**: 古典的な検索エンジンのランキング基盤、文書間の類似度に基づくレコメンデーション、盗用検出(文書同士の類似度計算)、[BM25](/algorithms/bm25)のような改良版が主流になった現在でも、情報検索理論を学ぶ上での出発点として教育的価値が高い

## 実装例

3文書からなる小さなコーパス(`cat dog cat` / `dog dog fish` / `cat fish bird`)にクエリ`cat dog`を投げ、コサイン類似度の高い順にランキングする。

```python
import math
from collections import Counter


def build_vocab(docs: list[list[str]]) -> list[str]:
    return sorted({w for d in docs for w in d})


def compute_idf(docs: list[list[str]], vocab: list[str]) -> dict[str, float]:
    n = len(docs)
    return {term: math.log(n / sum(1 for d in docs if term in d)) for term in vocab}


def tfidf_vector(tokens: list[str], vocab: list[str], idf: dict[str, float]) -> list[float]:
    counts = Counter(tokens)
    return [counts.get(term, 0) * idf[term] for term in vocab]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def rank_documents(query_tokens, docs, vocab, idf):
    q_vec = tfidf_vector(query_tokens, vocab, idf)
    scores = [cosine_similarity(q_vec, tfidf_vector(d, vocab, idf)) for d in docs]
    ranked = sorted(range(len(docs)), key=lambda i: scores[i], reverse=True)
    return ranked, scores


docs = [
    ["cat", "dog", "cat"],
    ["dog", "dog", "fish"],
    ["cat", "fish", "bird"],
]
vocab = build_vocab(docs)
idf = compute_idf(docs, vocab)
ranked, scores = rank_documents(["cat", "dog"], docs, vocab, idf)
print(ranked, scores)
# => [0, 1, 2] [0.9487, 0.6325, 0.2314] ("cat dog cat" が最も近く、無関係語を含む文書ほど遠い)
```

```typescript
function buildVocab(docs: string[][]): string[] {
  const set = new Set<string>();
  for (const d of docs) for (const w of d) set.add(w);
  return [...set].sort();
}

function computeIdf(docs: string[][], vocab: string[]): Map<string, number> {
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const term of vocab) {
    const df = docs.filter((d) => d.includes(term)).length;
    idf.set(term, Math.log(n / df));
  }
  return idf;
}

function tfidfVector(tokens: string[], vocab: string[], idf: Map<string, number>): number[] {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return vocab.map((term) => (counts.get(term) ?? 0) * idf.get(term)!);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function rankDocuments(queryTokens: string[], docs: string[][], vocab: string[], idf: Map<string, number>) {
  const qVec = tfidfVector(queryTokens, vocab, idf);
  const scores = docs.map((d) => cosineSimilarity(qVec, tfidfVector(d, vocab, idf)));
  const ranked = scores
    .map((s, i): [number, number] => [i, s])
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i);
  return { ranked, scores };
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <map>
#include <cmath>
#include <algorithm>

std::vector<std::string> buildVocab(const std::vector<std::vector<std::string>>& docs) {
    std::set<std::string> s;
    for (const auto& d : docs) for (const auto& w : d) s.insert(w);
    return {s.begin(), s.end()};
}

std::map<std::string, double> computeIdf(const std::vector<std::vector<std::string>>& docs,
                                          const std::vector<std::string>& vocab) {
    int n = static_cast<int>(docs.size());
    std::map<std::string, double> idf;
    for (const auto& term : vocab) {
        int df = 0;
        for (const auto& d : docs) {
            if (std::find(d.begin(), d.end(), term) != d.end()) df++;
        }
        idf[term] = std::log(static_cast<double>(n) / df);
    }
    return idf;
}

std::vector<double> tfidfVector(const std::vector<std::string>& tokens, const std::vector<std::string>& vocab,
                                 const std::map<std::string, double>& idf) {
    std::map<std::string, int> counts;
    for (const auto& t : tokens) counts[t]++;
    std::vector<double> vec;
    for (const auto& term : vocab) {
        auto it = counts.find(term);
        int c = it != counts.end() ? it->second : 0;
        vec.push_back(c * idf.at(term));
    }
    return vec;
}

double cosineSimilarity(const std::vector<double>& a, const std::vector<double>& b) {
    double dot = 0, normA = 0, normB = 0;
    for (size_t i = 0; i < a.size(); i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA == 0 || normB == 0) return 0.0;
    return dot / (std::sqrt(normA) * std::sqrt(normB));
}
```

```rust
use std::collections::{BTreeSet, HashMap};

fn build_vocab(docs: &[Vec<String>]) -> Vec<String> {
    let mut set = BTreeSet::new();
    for d in docs {
        for w in d {
            set.insert(w.clone());
        }
    }
    set.into_iter().collect()
}

fn compute_idf(docs: &[Vec<String>], vocab: &[String]) -> HashMap<String, f64> {
    let n = docs.len() as f64;
    vocab
        .iter()
        .map(|term| {
            let df = docs.iter().filter(|d| d.contains(term)).count() as f64;
            (term.clone(), (n / df).ln())
        })
        .collect()
}

fn tfidf_vector(tokens: &[String], vocab: &[String], idf: &HashMap<String, f64>) -> Vec<f64> {
    let mut counts: HashMap<&str, i32> = HashMap::new();
    for t in tokens {
        *counts.entry(t.as_str()).or_insert(0) += 1;
    }
    vocab
        .iter()
        .map(|term| *counts.get(term.as_str()).unwrap_or(&0) as f64 * idf[term])
        .collect()
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let norm_a = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b = b.iter().map(|y| y * y).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}
```

```csharp
static List<string> BuildVocab(List<List<string>> docs)
{
    var set = new HashSet<string>();
    foreach (var d in docs) foreach (var w in d) set.Add(w);
    return set.OrderBy(x => x).ToList();
}

static Dictionary<string, double> ComputeIdf(List<List<string>> docs, List<string> vocab)
{
    int n = docs.Count;
    var idf = new Dictionary<string, double>();
    foreach (var term in vocab)
    {
        int df = docs.Count(d => d.Contains(term));
        idf[term] = Math.Log((double)n / df);
    }
    return idf;
}

static double[] TfidfVector(List<string> tokens, List<string> vocab, Dictionary<string, double> idf)
{
    var counts = new Dictionary<string, int>();
    foreach (var t in tokens) counts[t] = counts.GetValueOrDefault(t, 0) + 1;
    return vocab.Select(term => counts.GetValueOrDefault(term, 0) * idf[term]).ToArray();
}

static double CosineSimilarity(double[] a, double[] b)
{
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < a.Length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na == 0 || nb == 0 ? 0 : dot / (Math.Sqrt(na) * Math.Sqrt(nb));
}
```
