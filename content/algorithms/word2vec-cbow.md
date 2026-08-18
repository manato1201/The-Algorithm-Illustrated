---
name: Word2Vec(CBOW, Continuous Bag-of-Words)
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(コーパスサイズ × 窓幅 × 埋め込み次元)(訓練)
summary: 周囲の文脈語の集合から中心の単語を予測するタスクを解くことで単語ベクトルを学習する、[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)と対をなすもう一方の学習方式。
---

## 概要

2013年にミコロフらが発表したWord2Vecには、実は2つの学習方式がある。[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)が「中心の単語から周囲の文脈語を予測する」のに対し、CBOW(Continuous Bag-of-Words)はその予測方向を逆にし、「周囲の文脈語の集合から中心の単語を予測する」ことでベクトルを学習する。窓内の複数の文脈語ベクトルを平均(または合計)してから1つの中心語を予測するという構造上、CBOWは複数のサンプルの情報を1回の予測にまとめて使うため学習が滑らかで高速になりやすい一方、Skip-gramは1つの中心語から複数の文脈語それぞれを個別の予測タスクとして扱うため、頻度の低いまれな単語の表現をより丁寧に学習できる傾向がある。同じ分布仮説(「同じ文脈に現れる単語は似た意味を持つ」)に基づきながら、予測方向という一点の違いがモデルの得意分野を分けている好例である。

## 仕組み

1. 各単語に、入力側ベクトル`v`(文脈語として使うとき)と出力側ベクトル`v'`(予測対象の中心語として使うとき)という2つの実数ベクトルを割り当てる(初期値はランダム)
2. コーパスを窓幅(例えば前後2単語)でスライドさせながら、中心語`wt`とその窓内の文脈語集合`{wt-2, wt-1, wt+1, wt+2}`の組を訓練サンプルとして集める
3. 窓内の各文脈語の入力側ベクトルを平均し、1つの「文脈ベクトル」`h`を作る——これがSkip-gramと最も異なる点で、Skip-gramは文脈語1つずつを別々のサンプルとして扱うのに対し、CBOWは窓全体を1つのベクトルにまとめてから予測する
4. `P(wt|context) = softmax(v'wt · h)`(文脈ベクトルと中心語の出力側ベクトルの内積が大きいほど、その単語が中心語として出現しやすいと予測する)という確率をモデル化し、実際に観測された中心語の確率が高くなるよう[勾配降下法](/algorithms/gradient-descent)でベクトルを更新する
5. 逆伝播の際、文脈ベクトルへの勾配は窓内の各文脈語ベクトルに均等に分配される(平均を取った操作の逆伝播)。Skip-gramと同様、語彙全体に対するsoftmaxの正規化コストを避けるため、実用の実装では負例サンプリング(実際には中心語ではなかった単語をランダムに少数選び、それらの確率は低くなるよう学習する)で近似する

## 特性・トレードオフ

- **計算量**: Skip-gramと同様、負例サンプリングを使えば1サンプルあたりの計算コストは語彙サイズに依存しない定数個の負例で済む。ただしCBOWは窓内の複数の文脈語を1回の予測にまとめるため、同じコーパスに対する訓練サンプル数(=更新回数)がSkip-gramより少なく、その分1エポックあたりの訓練は高速になりやすい
- **頻出語に強く低頻度語にやや弱い**: 複数の文脈語ベクトルを平均してから予測するため、個々のまれな単語が持つ固有のシグナルは平均化によって薄まりやすい。逆に頻出語については大量の文脈から繰り返し学習されるため安定した表現が得やすく、CBOWは「小〜中規模のコーパスで頻出語を中心に高速に学習したい」場面に向く
- **Skip-gramとの使い分け**: [Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)は1つの中心語から複数の文脈語をそれぞれ個別に予測するため訓練サンプル数が多く、低頻度語の表現も相対的に丁寧に学習される——ミコロフら自身も原論文で「大規模コーパスではSkip-gramが、低頻度語の質を重視する場合はSkip-gramが有利、CBOWは高速で頻出語に強い」という傾向を報告している
- **使いどころ**: 計算資源やデータ量が限られる中での高速な分散表現の事前学習、頻出語の意味的な近さが重要なタスク(トピック分類など)。fastText等の後続手法もCBOW/Skip-gramの両方の学習方式を選択できる設計を踏襲している

## 実装例

`cat`と`dog`は「the ... sat/ran on/in the ...」という同じ文脈パターンを共有し、`banana`は全く異なる文脈にしか現れない小さなコーパスを用意する。負例サンプリング付きCBOWで数百エポック学習した後、`cat`と`dog`のベクトルのコサイン類似度が`cat`と`banana`のそれより高くなることを検証する。

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


def build_cbow_samples(corpus, vocab, window=2):
    samples = []
    for sent in corpus:
        idxs = [vocab[w] for w in sent]
        for i, center in enumerate(idxs):
            context = [idxs[j] for j in range(max(0, i - window), min(len(idxs), i + window + 1)) if j != i]
            if context:
                samples.append((context, center))
    return samples


def train_cbow(corpus, dim=8, epochs=200, lr=0.05, negatives=3, seed=1):
    rng = random.Random(seed)
    vocab = build_vocab(corpus)
    n = len(vocab)
    samples = build_cbow_samples(corpus, vocab)

    v_in = [[rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(n)]
    v_out = [[rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(n)]

    def dot(a, b):
        return sum(x * y for x, y in zip(a, b))

    def average(idxs):
        h = [0.0] * dim
        for idx in idxs:
            for k in range(dim):
                h[k] += v_in[idx][k]
        return [x / len(idxs) for x in h]

    for _ in range(epochs):
        rng.shuffle(samples)
        for context, center in samples:
            h = average(context)  # 窓内の文脈語ベクトルを平均した「文脈ベクトル」
            vo = v_out[center]

            grad_h = [0.0] * dim
            grad = lr * (1 - sigmoid(dot(h, vo)))  # 正例: 中心語の予測確率を1に近づける
            for k in range(dim):
                grad_h[k] += grad * vo[k]
            new_vo = [vo[k] + grad * h[k] for k in range(dim)]
            v_out[center] = new_vo

            for _ in range(negatives):  # 負例: ランダムな単語が中心語である確率を0に近づける
                neg = rng.randrange(n)
                if neg == center:
                    continue
                vneg = v_out[neg]
                neg_grad = lr * (0 - sigmoid(dot(h, vneg)))
                for k in range(dim):
                    grad_h[k] += neg_grad * vneg[k]
                v_out[neg] = [vneg[k] + neg_grad * h[k] for k in range(dim)]

            # 文脈ベクトルへの勾配を窓内の各文脈語ベクトルへ均等に分配(平均の逆伝播)
            for idx in context:
                for k in range(dim):
                    v_in[idx][k] += grad_h[k] / len(context)

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
v_in, vocab = train_cbow(corpus, seed=7)
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

function buildCbowSamples(
  corpus: string[][],
  vocab: Map<string, number>,
  window = 2,
): Array<[number[], number]> {
  const samples: Array<[number[], number]> = [];
  for (const sent of corpus) {
    const idxs = sent.map((w) => vocab.get(w)!);
    for (let i = 0; i < idxs.length; i++) {
      const context: number[] = [];
      for (
        let j = Math.max(0, i - window);
        j < Math.min(idxs.length, i + window + 1);
        j++
      ) {
        if (j !== i) context.push(idxs[j]);
      }
      if (context.length > 0) samples.push([context, idxs[i]]);
    }
  }
  return samples;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function trainCbow(
  corpus: string[][],
  dim = 8,
  epochs = 200,
  lr = 0.05,
  negatives = 3,
  seed = 1,
) {
  const rng = new Rng(seed);
  const vocab = buildVocab(corpus);
  const n = vocab.size;
  const samples = buildCbowSamples(corpus, vocab);

  const vIn: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: dim }, () => rng.uniform(-0.5, 0.5) / dim),
  );
  const vOut: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: dim }, () => rng.uniform(-0.5, 0.5) / dim),
  );

  const average = (idxs: number[]): number[] => {
    const h = new Array(dim).fill(0);
    for (const idx of idxs) for (let k = 0; k < dim; k++) h[k] += vIn[idx][k];
    return h.map((x) => x / idxs.length);
  };

  for (let epoch = 0; epoch < epochs; epoch++) {
    rng.shuffle(samples);
    for (const [context, center] of samples) {
      const h = average(context);
      const vo = vOut[center];

      const gradH = new Array(dim).fill(0);
      const grad = lr * (1 - sigmoid(dot(h, vo)));
      for (let k = 0; k < dim; k++) gradH[k] += grad * vo[k];
      vOut[center] = vo.map((x, k) => x + grad * h[k]);

      for (let neg = 0; neg < negatives; neg++) {
        const negIdx = rng.randrange(n);
        if (negIdx === center) continue;
        const vneg = vOut[negIdx];
        const negGrad = lr * (0 - sigmoid(dot(h, vneg)));
        for (let k = 0; k < dim; k++) gradH[k] += negGrad * vneg[k];
        vOut[negIdx] = vneg.map((x, k) => x + negGrad * h[k]);
      }

      for (const idx of context) {
        for (let k = 0; k < dim; k++) vIn[idx][k] += gradH[k] / context.length;
      }
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
