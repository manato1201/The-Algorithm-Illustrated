---
name: Word2Vec(Skip-gram)
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(コーパスサイズ × 窓幅 × 埋め込み次元)(訓練)
summary: 「周囲の単語を予測できるように」単語ベクトルを学習することで、意味の近い単語が近いベクトルになる分散表現を獲得するニューラル言語モデル。
---

## 概要

[n-gram言語モデル](/algorithms/n-gram-language-model)は単語を記号として扱うため、"king"と"queen"が意味的に近いという情報を表現できない。2013年にミコロフらが発表したWord2Vecは、「ある単語の意味は、その周囲に現れる単語(文脈)によって特徴づけられる」という分布仮説に基づき、各単語を高次元の実数ベクトル(分散表現、埋め込み)として学習する。学習後のベクトル空間では、意味的に近い単語同士が近い位置に配置されるだけでなく、"king - man + woman ≈ queen"のような類推関係がベクトルの加減算として成り立つことが知られ、自然言語処理に深層学習を本格的に導入する転換点となった手法のひとつである。

## 仕組み

1. Skip-gramモデルは「中心の単語から、その周囲の文脈語を予測する」というタスクを解くことで単語ベクトルを学習する(逆に「文脈語から中心語を予測する」CBOWという派生型もある)
2. 各単語に、入力側ベクトル`v`と出力側ベクトル`v'`という2つの実数ベクトルを割り当てる(初期値はランダム)
3. コーパスを窓幅(例えば前後5単語)でスライドさせながら、中心語`wt`とその窓内の各文脈語`wc`のペアを訓練サンプルとして集める
4. 各ペアについて、`P(wc|wt) = softmax(v'wc · vwt)`(中心語ベクトルと文脈語ベクトルの内積が大きいほど、その文脈語が出現しやすいと予測する)という確率をモデル化し、実際に観測された文脈語の確率が高くなるよう、[勾配降下法](/algorithms/gradient-descent)でベクトルを更新する
5. 語彙全体に対するsoftmaxの正規化は計算コストが非常に高いため、実用の実装では「負例サンプリング」(実際には出現しなかった単語をランダムに少数選び、それらの確率は低くなるよう、実際に出現した単語の確率は高くなるよう2値分類的に学習する)という近似を使って高速化する

## 特性・トレードオフ

- **計算量**: 負例サンプリングを使うと、各訓練サンプルあたりの計算コストは語彙サイズに依存しない定数個の負例だけで済むため、大規模コーパスでも現実的な時間で訓練できる
- **意味の類似性・類推関係の獲得**: 単なる共起頻度([TF-IDF](/algorithms/tf-idf)のような頻度ベースの手法)を超え、ベクトル空間上での距離や方向が意味的な関係性を反映するようになるのが最大の特徴。これは分布仮説(「同じ文脈に現れる単語は似た意味を持つ」)を、ニューラルネットワークの予測タスクを通じて間接的に学習した結果である
- **[主成分分析(PCA)](/algorithms/pca)・[潜在意味解析](/algorithms/latent-semantic-analysis)との関係**: Word2Vecは予測タスクを通じて分散表現を得るニューラル手法だが、単語文脈の共起行列に対して次元削減を行う[潜在意味解析](/algorithms/latent-semantic-analysis)も、性質の異なるアプローチで似た目的(単語の意味的な低次元表現)を達成しようとする手法として比較されることが多い
- **使いどころ**: 検索・レコメンデーションにおける意味的な類似度計算、テキスト分類・感情分析の入力特徴量、後続のTransformerベースの言語モデル(BERT、GPT等)における単語埋め込みの考え方の原型

## 実装例

`cat`と`dog`は「the ... sat/ran on/in the ...」という同じ文脈パターンを共有し、`banana`は全く異なる文脈にしか現れない小さなコーパスを用意する。負例サンプリング付きskip-gramで数百エポック学習した後、`cat`と`dog`のベクトルのコサイン類似度が`cat`と`banana`のそれより高くなる(分布仮説どおり、同じ文脈を共有する単語が近づく)ことを検証する。

```python
import math
import random


def sigmoid(x):
    if x >= 0:
        z = math.exp(-x)
        return 1 / (1 + z)
    z = math.exp(x)
    return z / (1 + z)


def build_vocab(corpus):
    words = sorted({w for sent in corpus for w in sent})
    return {w: i for i, w in enumerate(words)}


def build_pairs(corpus, vocab, window=2):
    pairs = []
    for sent in corpus:
        idxs = [vocab[w] for w in sent]
        for i, center in enumerate(idxs):
            for j in range(max(0, i - window), min(len(idxs), i + window + 1)):
                if j != i:
                    pairs.append((center, idxs[j]))
    return pairs


def train_skip_gram(corpus, dim=8, epochs=200, lr=0.05, negatives=3, seed=1):
    rng = random.Random(seed)
    vocab = build_vocab(corpus)
    n = len(vocab)
    pairs = build_pairs(corpus, vocab)

    v_in = [[rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(n)]
    v_out = [[rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(n)]

    def dot(a, b):
        return sum(x * y for x, y in zip(a, b))

    for _ in range(epochs):
        rng.shuffle(pairs)
        for center, context in pairs:
            vc, vo = v_in[center], v_out[context]
            grad = lr * (1 - sigmoid(dot(vc, vo)))  # 正例: 予測確率を1に近づける
            new_vc = [vc[k] + grad * vo[k] for k in range(dim)]
            new_vo = [vo[k] + grad * vc[k] for k in range(dim)]

            for _ in range(negatives):  # 負例: ランダムな単語の予測確率を0に近づける
                neg = rng.randrange(n)
                if neg == context:
                    continue
                vneg = v_out[neg]
                neg_grad = lr * (0 - sigmoid(dot(vc, vneg)))
                new_vc = [new_vc[k] + neg_grad * vneg[k] for k in range(dim)]
                v_out[neg] = [vneg[k] + neg_grad * vc[k] for k in range(dim)]

            v_in[center], v_out[context] = new_vc, new_vo

    return v_in, vocab


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


# 検証: catとdogは同じ文脈を共有するため、無関係なbananaより類似度が高くなるはず
corpus = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "sat", "on", "the", "rug"],
    ["the", "cat", "ran", "in", "the", "yard"],
    ["the", "dog", "ran", "in", "the", "park"],
    ["a", "banana", "is", "yellow", "fruit"],
    ["a", "banana", "tastes", "sweet", "today"],
]
v_in, vocab = train_skip_gram(corpus, seed=7)
assert cosine(v_in[vocab["cat"]], v_in[vocab["dog"]]) > cosine(v_in[vocab["cat"]], v_in[vocab["banana"]])
```

```typescript
class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  private nextU32(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }
  next(): number {
    return this.nextU32() / 4294967296.0;
  }
  uniform(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
  randrange(n: number): number {
    return Math.floor(this.next() * n);
  }
  shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randrange(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function buildVocab(corpus: string[][]): Map<string, number> {
  const words = [...new Set(corpus.flat())].sort();
  const vocab = new Map<string, number>();
  words.forEach((w, i) => vocab.set(w, i));
  return vocab;
}

function buildPairs(corpus: string[][], vocab: Map<string, number>, window = 2): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (const sent of corpus) {
    const idxs = sent.map((w) => vocab.get(w)!);
    for (let i = 0; i < idxs.length; i++) {
      for (let j = Math.max(0, i - window); j < Math.min(idxs.length, i + window + 1); j++) {
        if (j !== i) pairs.push([idxs[i], idxs[j]]);
      }
    }
  }
  return pairs;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function trainSkipGram(corpus: string[][], dim = 8, epochs = 200, lr = 0.05, negatives = 3, seed = 1) {
  const rng = new Rng(seed);
  const vocab = buildVocab(corpus);
  const n = vocab.size;
  const pairs = buildPairs(corpus, vocab);

  const vIn: number[][] = Array.from({ length: n }, () => Array.from({ length: dim }, () => rng.uniform(-0.5, 0.5) / dim));
  const vOut: number[][] = Array.from({ length: n }, () => Array.from({ length: dim }, () => rng.uniform(-0.5, 0.5) / dim));

  for (let epoch = 0; epoch < epochs; epoch++) {
    rng.shuffle(pairs);
    for (const [center, context] of pairs) {
      const vc = vIn[center];
      const vo = vOut[context];
      const grad = lr * (1 - sigmoid(dot(vc, vo)));
      const newVc = vc.map((x, k) => x + grad * vo[k]);
      const newVo = vo.map((x, k) => x + grad * vc[k]);

      for (let neg = 0; neg < negatives; neg++) {
        const negIdx = rng.randrange(n);
        if (negIdx === context) continue;
        const vneg = vOut[negIdx];
        const negGrad = lr * (0 - sigmoid(dot(vc, vneg)));
        for (let k = 0; k < dim; k++) newVc[k] += negGrad * vneg[k];
        vOut[negIdx] = vneg.map((x, k) => x + negGrad * vc[k]);
      }

      vIn[center] = newVc;
      vOut[context] = newVo;
    }
  }

  return { vIn, vocab };
}

function cosine(a: number[], b: number[]): number {
  const d = dot(a, b);
  const na = Math.sqrt(dot(a, a));
  const nb = Math.sqrt(dot(b, b));
  return na && nb ? d / (na * nb) : 0;
}
```

```cpp
#include <vector>
#include <map>
#include <set>
#include <string>
#include <cmath>
#include <random>
#include <algorithm>

double sigmoid(double x) {
    if (x >= 0) {
        double z = std::exp(-x);
        return 1 / (1 + z);
    }
    double z = std::exp(x);
    return z / (1 + z);
}

double dotProduct(const std::vector<double>& a, const std::vector<double>& b) {
    double s = 0;
    for (size_t i = 0; i < a.size(); i++) s += a[i] * b[i];
    return s;
}

std::map<std::string, int> buildVocab(const std::vector<std::vector<std::string>>& corpus) {
    std::set<std::string> wordSet;
    for (const auto& sent : corpus)
        for (const auto& w : sent) wordSet.insert(w);
    std::map<std::string, int> vocab;
    int i = 0;
    for (const auto& w : wordSet) vocab[w] = i++;
    return vocab;
}

std::vector<std::pair<int, int>> buildPairs(const std::vector<std::vector<std::string>>& corpus,
                                             const std::map<std::string, int>& vocab, int window = 2) {
    std::vector<std::pair<int, int>> pairs;
    for (const auto& sent : corpus) {
        std::vector<int> idxs;
        for (const auto& w : sent) idxs.push_back(vocab.at(w));
        for (int i = 0; i < static_cast<int>(idxs.size()); i++) {
            for (int j = std::max(0, i - window); j < std::min(static_cast<int>(idxs.size()), i + window + 1); j++) {
                if (j != i) pairs.push_back({idxs[i], idxs[j]});
            }
        }
    }
    return pairs;
}

std::pair<std::vector<std::vector<double>>, std::map<std::string, int>> trainSkipGram(
    const std::vector<std::vector<std::string>>& corpus, int dim = 8, int epochs = 200, double lr = 0.05,
    int negatives = 3, unsigned seed = 1) {
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> uniformDist(-0.5, 0.5);
    auto vocab = buildVocab(corpus);
    int n = static_cast<int>(vocab.size());
    auto pairs = buildPairs(corpus, vocab);

    std::vector<std::vector<double>> vIn(n, std::vector<double>(dim));
    std::vector<std::vector<double>> vOut(n, std::vector<double>(dim));
    for (int i = 0; i < n; i++) {
        for (int k = 0; k < dim; k++) {
            vIn[i][k] = uniformDist(rng) / dim;
            vOut[i][k] = uniformDist(rng) / dim;
        }
    }

    std::uniform_int_distribution<int> negDist(0, n - 1);
    for (int epoch = 0; epoch < epochs; epoch++) {
        std::shuffle(pairs.begin(), pairs.end(), rng);
        for (auto [center, context] : pairs) {
            auto& vc = vIn[center];
            auto& vo = vOut[context];
            double grad = lr * (1 - sigmoid(dotProduct(vc, vo)));
            std::vector<double> newVc(dim), newVo(dim);
            for (int k = 0; k < dim; k++) {
                newVc[k] = vc[k] + grad * vo[k];
                newVo[k] = vo[k] + grad * vc[k];
            }
            for (int neg = 0; neg < negatives; neg++) {
                int negIdx = negDist(rng);
                if (negIdx == context) continue;
                auto& vneg = vOut[negIdx];
                double negGrad = lr * (0 - sigmoid(dotProduct(vc, vneg)));
                for (int k = 0; k < dim; k++) newVc[k] += negGrad * vneg[k];
                std::vector<double> updatedNeg(dim);
                for (int k = 0; k < dim; k++) updatedNeg[k] = vneg[k] + negGrad * vc[k];
                vOut[negIdx] = updatedNeg;
            }
            vIn[center] = newVc;
            vOut[context] = newVo;
        }
    }
    return {vIn, vocab};
}

double cosine(const std::vector<double>& a, const std::vector<double>& b) {
    double d = dotProduct(a, b), na = std::sqrt(dotProduct(a, a)), nb = std::sqrt(dotProduct(b, b));
    return (na != 0 && nb != 0) ? d / (na * nb) : 0.0;
}
```

```rust
struct Rng {
    state: u64,
}

impl Rng {
    fn new(seed: u64) -> Self {
        Rng { state: seed }
    }
    fn next_u64(&mut self) -> u64 {
        // splitmix64
        self.state = self.state.wrapping_add(0x9E3779B97F4A7C15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
        z ^ (z >> 31)
    }
    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
    fn uniform(&mut self, lo: f64, hi: f64) -> f64 {
        lo + self.next_f64() * (hi - lo)
    }
    fn randrange(&mut self, n: usize) -> usize {
        (self.next_f64() * n as f64) as usize
    }
    fn shuffle<T>(&mut self, arr: &mut [T]) {
        for i in (1..arr.len()).rev() {
            let j = self.randrange(i + 1);
            arr.swap(i, j);
        }
    }
}

fn sigmoid(x: f64) -> f64 {
    if x >= 0.0 {
        let z = (-x).exp();
        1.0 / (1.0 + z)
    } else {
        let z = x.exp();
        z / (1.0 + z)
    }
}

fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(x, y)| x * y).sum()
}

fn build_vocab(corpus: &[Vec<String>]) -> std::collections::BTreeMap<String, usize> {
    let mut words: Vec<String> = corpus.iter().flatten().cloned().collect();
    words.sort();
    words.dedup();
    words.into_iter().enumerate().map(|(i, w)| (w, i)).collect()
}

fn build_pairs(
    corpus: &[Vec<String>],
    vocab: &std::collections::BTreeMap<String, usize>,
    window: usize,
) -> Vec<(usize, usize)> {
    let mut pairs = Vec::new();
    for sent in corpus {
        let idxs: Vec<usize> = sent.iter().map(|w| vocab[w]).collect();
        for i in 0..idxs.len() {
            let lo = i.saturating_sub(window);
            let hi = (i + window + 1).min(idxs.len());
            for j in lo..hi {
                if j != i {
                    pairs.push((idxs[i], idxs[j]));
                }
            }
        }
    }
    pairs
}

fn train_skip_gram(
    corpus: &[Vec<String>],
    dim: usize,
    epochs: usize,
    lr: f64,
    negatives: usize,
    seed: u64,
) -> (Vec<Vec<f64>>, std::collections::BTreeMap<String, usize>) {
    let mut rng = Rng::new(seed);
    let vocab = build_vocab(corpus);
    let n = vocab.len();
    let mut pairs = build_pairs(corpus, &vocab, 2);

    let mut v_in: Vec<Vec<f64>> = (0..n).map(|_| (0..dim).map(|_| rng.uniform(-0.5, 0.5) / dim as f64).collect()).collect();
    let mut v_out: Vec<Vec<f64>> = (0..n).map(|_| (0..dim).map(|_| rng.uniform(-0.5, 0.5) / dim as f64).collect()).collect();

    for _ in 0..epochs {
        rng.shuffle(&mut pairs);
        for &(center, context) in &pairs {
            let vc = v_in[center].clone();
            let vo = v_out[context].clone();
            let grad = lr * (1.0 - sigmoid(dot(&vc, &vo)));
            let mut new_vc: Vec<f64> = (0..dim).map(|k| vc[k] + grad * vo[k]).collect();
            let new_vo: Vec<f64> = (0..dim).map(|k| vo[k] + grad * vc[k]).collect();

            for _ in 0..negatives {
                let neg_idx = rng.randrange(n);
                if neg_idx == context {
                    continue;
                }
                let vneg = v_out[neg_idx].clone();
                let neg_grad = lr * (0.0 - sigmoid(dot(&vc, &vneg)));
                for k in 0..dim {
                    new_vc[k] += neg_grad * vneg[k];
                }
                v_out[neg_idx] = (0..dim).map(|k| vneg[k] + neg_grad * vc[k]).collect();
            }

            v_in[center] = new_vc;
            v_out[context] = new_vo;
        }
    }

    (v_in, vocab)
}

fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let d = dot(a, b);
    let na = dot(a, a).sqrt();
    let nb = dot(b, b).sqrt();
    if na != 0.0 && nb != 0.0 {
        d / (na * nb)
    } else {
        0.0
    }
}
```

```csharp
class Rng
{
    uint state;
    public Rng(uint seed) { state = seed; }
    uint NextU32()
    {
        state = unchecked(state * 1664525 + 1013904223);
        return state;
    }
    public double Next() => NextU32() / 4294967296.0;
    public double Uniform(double lo, double hi) => lo + Next() * (hi - lo);
    public int RandRange(int n) => (int)(Next() * n);
    public void Shuffle<T>(List<T> arr)
    {
        for (int i = arr.Count - 1; i > 0; i--)
        {
            int j = RandRange(i + 1);
            (arr[i], arr[j]) = (arr[j], arr[i]);
        }
    }
}

static double Sigmoid(double x)
{
    if (x >= 0) { double z = Math.Exp(-x); return 1 / (1 + z); }
    double z2 = Math.Exp(x);
    return z2 / (1 + z2);
}

static double Dot(double[] a, double[] b)
{
    double s = 0;
    for (int i = 0; i < a.Length; i++) s += a[i] * b[i];
    return s;
}

static Dictionary<string, int> BuildVocab(List<List<string>> corpus)
{
    var words = corpus.SelectMany(s => s).Distinct().OrderBy(x => x).ToList();
    var vocab = new Dictionary<string, int>();
    for (int i = 0; i < words.Count; i++) vocab[words[i]] = i;
    return vocab;
}

static List<(int, int)> BuildPairs(List<List<string>> corpus, Dictionary<string, int> vocab, int window = 2)
{
    var pairs = new List<(int, int)>();
    foreach (var sent in corpus)
    {
        var idxs = sent.Select(w => vocab[w]).ToList();
        for (int i = 0; i < idxs.Count; i++)
            for (int j = Math.Max(0, i - window); j < Math.Min(idxs.Count, i + window + 1); j++)
                if (j != i) pairs.Add((idxs[i], idxs[j]));
    }
    return pairs;
}

static (double[][] VIn, Dictionary<string, int> Vocab) TrainSkipGram(
    List<List<string>> corpus, int dim = 8, int epochs = 200, double lr = 0.05, int negatives = 3, uint seed = 1)
{
    var rng = new Rng(seed);
    var vocab = BuildVocab(corpus);
    int n = vocab.Count;
    var pairs = BuildPairs(corpus, vocab);

    var vIn = new double[n][];
    var vOut = new double[n][];
    for (int i = 0; i < n; i++)
    {
        vIn[i] = Enumerable.Range(0, dim).Select(_ => rng.Uniform(-0.5, 0.5) / dim).ToArray();
        vOut[i] = Enumerable.Range(0, dim).Select(_ => rng.Uniform(-0.5, 0.5) / dim).ToArray();
    }

    for (int epoch = 0; epoch < epochs; epoch++)
    {
        rng.Shuffle(pairs);
        foreach (var (center, context) in pairs)
        {
            var vc = vIn[center];
            var vo = vOut[context];
            double grad = lr * (1 - Sigmoid(Dot(vc, vo)));
            var newVc = new double[dim];
            var newVo = new double[dim];
            for (int k = 0; k < dim; k++) { newVc[k] = vc[k] + grad * vo[k]; newVo[k] = vo[k] + grad * vc[k]; }

            for (int neg = 0; neg < negatives; neg++)
            {
                int negIdx = rng.RandRange(n);
                if (negIdx == context) continue;
                var vneg = vOut[negIdx];
                double negGrad = lr * (0 - Sigmoid(Dot(vc, vneg)));
                for (int k = 0; k < dim; k++) newVc[k] += negGrad * vneg[k];
                var updatedNeg = new double[dim];
                for (int k = 0; k < dim; k++) updatedNeg[k] = vneg[k] + negGrad * vc[k];
                vOut[negIdx] = updatedNeg;
            }

            vIn[center] = newVc;
            vOut[context] = newVo;
        }
    }
    return (vIn, vocab);
}

static double Cosine(double[] a, double[] b)
{
    double d = Dot(a, b), na = Math.Sqrt(Dot(a, a)), nb = Math.Sqrt(Dot(b, b));
    return na != 0 && nb != 0 ? d / (na * nb) : 0;
}
```
