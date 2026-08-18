---
name: fastText(部分文字列埋め込みによる分散表現)
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(コーパスサイズ × 窓幅 × n-gram数 × 埋め込み次元)(訓練)
summary: 単語を構成する文字n-gramの集合として表現し、それらの部分文字列ベクトルの合計で単語ベクトルを構成することで、未知語や語形変化に頑健な分散表現を得る手法。
---

## 概要

[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)や[GloVe](/algorithms/glove-word-embeddings)は、単語1つに対して1つの学習可能なベクトルを割り当てるため、訓練データに登場しなかった単語(未知語、OOV: Out-of-Vocabulary)にはベクトルを与えられないという弱点を持つ。また、"run"、"runs"、"running"のように語形が変化しても意味的なつながりが強い単語同士が、記号としては全く別物として扱われてしまう。2017年にFacebook AI Researchが発表したfastTextは、この弱点を「単語をそのまま学習単位にする」という発想自体を見直すことで克服した。各単語を、その単語を構成する文字n-gram(部分文字列)の集合として分解し、単語ベクトルを「その単語に含まれる各文字n-gramのベクトルの合計」として構成する。学習される主体は単語そのものではなく文字n-gramであるため、訓練データに一度も現れなかった単語であっても、既知の部分文字列から組み立てたベクトルを得ることができる。

## 仕組み

1. 各単語を、両端に境界記号を付けた上で文字n-gram(通常`n=3〜6`程度)に分解する。例えば`<where>`という単語(境界記号`<`, `>`付き)からは`<wh`, `whe`, `her`, `ere`, `re>`のような部分文字列が得られる
2. 単語全体そのものも1つの特別な"n-gram"として集合に加える(短い単語や固有表現をそのまま扱うため)
3. 語彙は「単語」ではなく「文字n-gramの集合(通常ハッシュ関数で固定サイズのバケットに圧縮する)」に対して構築し、各文字n-gramに1つの学習可能なベクトルを割り当てる
4. ある単語のベクトルは、その単語を構成する全ての文字n-gramベクトルの合計(または平均)として動的に計算される: `v(word) = Σ v(g)  for g in ngrams(word)`
5. 学習の目的関数自体は[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)と同じ(中心語から文脈語を予測し、負例サンプリングで近似する)だが、「中心語のベクトル」を求める際に単語ベクトルではなく、その単語を構成する文字n-gramベクトルの合計を使う点だけが異なる。逆伝播による更新も、単語単位ではなく個々の文字n-gramベクトルに対して行われる

## 特性・トレードオフ

- **計算量**: 各単語を複数の文字n-gramに分解するため、1つの訓練サンプルあたりの計算コストは[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)よりも「1単語あたりの平均n-gram数」倍だけ増える。訓練は多少重くなるが、推論時(単語ベクトルを組み立てる操作)は該当する文字n-gramベクトルを合計するだけで済み、実用上大きな問題にはならない
- **未知語への頑健性**: 訓練データに一度も出現しなかった単語でも、その単語を構成する文字n-gramの多くが既知であれば意味の近い妥当なベクトルを得られる。特にタイプミス、スラング、複合語、形態変化の多い言語(ドイツ語、フィンランド語、トルコ語など)で[Word2Vec](/algorithms/word2vec-skip-gram)・[GloVe](/algorithms/glove-word-embeddings)より頑健な性能を示す
- **形態的な類似性の自然な反映**: "running"と"runner"のように語幹を共有する単語は、文字n-gramの多く("run"など)を共有するため、ベクトル空間上でも自然に近い位置に配置されやすい——[Porterステミング](/algorithms/porter-stemming)のように語形を明示的に正規化しなくても、部分文字列の共有という間接的な仕組みで類似性が捉えられる
- **使いどころ**: タイプミスやスラングの多いSNSテキストの分類・検索、形態変化が豊富な言語での分散表現学習、[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)や[SentencePiece](/algorithms/sentencepiece-tokenization)がサブワード単位でトークン化を行うのと似た発想を、トークン化ではなく単語ベクトルの構成レベルで実現したものと位置づけられる

## 実装例

```python
import math
import random


def sigmoid(x):
    if x >= 0:
        z = math.exp(-x)
        return 1 / (1 + z)
    z = math.exp(x)
    return z / (1 + z)


def char_ngrams(word: str, min_n: int = 3, max_n: int = 4) -> list[str]:
    padded = f"<{word}>"
    grams = {padded}  # 単語全体も1つのngramとして含める
    for n in range(min_n, max_n + 1):
        for i in range(len(padded) - n + 1):
            grams.add(padded[i : i + n])
    return sorted(grams)


def build_ngram_vocab(words: set[str], min_n: int = 3, max_n: int = 4) -> dict[str, int]:
    all_grams: set[str] = set()
    for w in words:
        all_grams.update(char_ngrams(w, min_n, max_n))
    return {g: i for i, g in enumerate(sorted(all_grams))}


class FastTextModel:
    def __init__(self, corpus: list[list[str]], dim: int = 8, min_n: int = 3, max_n: int = 4, seed: int = 1):
        self.rng = random.Random(seed)
        self.dim = dim
        self.min_n, self.max_n = min_n, max_n
        words = {w for sent in corpus for w in sent}
        self.word_list = sorted(words)
        self.word_index = {w: i for i, w in enumerate(self.word_list)}
        self.ngram_vocab = build_ngram_vocab(words, min_n, max_n)
        n_grams = len(self.ngram_vocab)
        self.v_gram = [[self.rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(n_grams)]
        self.v_out = [[self.rng.uniform(-0.5, 0.5) / dim for _ in range(dim)] for _ in range(len(self.word_list))]

    def word_vector(self, word: str) -> list[float]:
        grams = char_ngrams(word, self.min_n, self.max_n)
        vec = [0.0] * self.dim
        for g in grams:
            gi = self.ngram_vocab.get(g)
            if gi is not None:  # 既知の部分文字列だけを合計する(未知語でも既知のngramは拾える)
                for k in range(self.dim):
                    vec[k] += self.v_gram[gi][k]
        return vec

    def train(self, corpus: list[list[str]], window: int = 2, epochs: int = 200, lr: float = 0.05, negatives: int = 3):
        pairs = []
        for sent in corpus:
            for i, center in enumerate(sent):
                for j in range(max(0, i - window), min(len(sent), i + window + 1)):
                    if j != i:
                        pairs.append((center, sent[j]))

        def dot(a, b):
            return sum(x * y for x, y in zip(a, b))

        for _ in range(epochs):
            self.rng.shuffle(pairs)
            for center, context in pairs:
                grams = [self.ngram_vocab[g] for g in char_ngrams(center, self.min_n, self.max_n) if g in self.ngram_vocab]
                vc = [0.0] * self.dim
                for gi in grams:
                    for k in range(self.dim):
                        vc[k] += self.v_gram[gi][k]

                context_idx = self.word_index[context]
                vo = self.v_out[context_idx]
                grad = lr * (1 - sigmoid(dot(vc, vo)))
                grad_vec = [grad * vo[k] for k in range(self.dim)]
                self.v_out[context_idx] = [vo[k] + grad * vc[k] for k in range(self.dim)]

                for _ in range(negatives):
                    neg_idx = self.rng.randrange(len(self.word_list))
                    if neg_idx == context_idx:
                        continue
                    vneg = self.v_out[neg_idx]
                    neg_grad = lr * (0 - sigmoid(dot(vc, vneg)))
                    for k in range(self.dim):
                        grad_vec[k] += neg_grad * vneg[k]
                    self.v_out[neg_idx] = [vneg[k] + neg_grad * vc[k] for k in range(self.dim)]

                # 単語ベクトルへの勾配を、それを構成する各ngramベクトルへ分配する
                for gi in grams:
                    for k in range(self.dim):
                        self.v_gram[gi][k] += grad_vec[k]


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0
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

function charNgrams(word: string, minN = 3, maxN = 4): string[] {
  const padded = `<${word}>`;
  const grams = new Set<string>([padded]);
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= padded.length - n; i++) grams.add(padded.slice(i, i + n));
  }
  return [...grams].sort();
}

function buildNgramVocab(words: Set<string>, minN = 3, maxN = 4): Map<string, number> {
  const allGrams = new Set<string>();
  for (const w of words) for (const g of charNgrams(w, minN, maxN)) allGrams.add(g);
  const sorted = [...allGrams].sort();
  const vocab = new Map<string, number>();
  sorted.forEach((g, i) => vocab.set(g, i));
  return vocab;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

class FastTextModel {
  dim: number;
  minN: number;
  maxN: number;
  wordList: string[];
  wordIndex: Map<string, number>;
  ngramVocab: Map<string, number>;
  vGram: number[][];
  vOut: number[][];
  private rng: Rng;

  constructor(corpus: string[][], dim = 8, minN = 3, maxN = 4, seed = 1) {
    this.rng = new Rng(seed);
    this.dim = dim;
    this.minN = minN;
    this.maxN = maxN;
    const words = new Set(corpus.flat());
    this.wordList = [...words].sort();
    this.wordIndex = new Map(this.wordList.map((w, i) => [w, i]));
    this.ngramVocab = buildNgramVocab(words, minN, maxN);
    const nGrams = this.ngramVocab.size;
    this.vGram = Array.from({ length: nGrams }, () => Array.from({ length: dim }, () => this.rng.uniform(-0.5, 0.5) / dim));
    this.vOut = Array.from({ length: this.wordList.length }, () => Array.from({ length: dim }, () => this.rng.uniform(-0.5, 0.5) / dim));
  }

  wordVector(word: string): number[] {
    const grams = charNgrams(word, this.minN, this.maxN);
    const vec = new Array(this.dim).fill(0);
    for (const g of grams) {
      const gi = this.ngramVocab.get(g);
      if (gi !== undefined) {
        for (let k = 0; k < this.dim; k++) vec[k] += this.vGram[gi][k];
      }
    }
    return vec;
  }

  train(corpus: string[][], window = 2, epochs = 200, lr = 0.05, negatives = 3): void {
    const pairs: Array<[string, string]> = [];
    for (const sent of corpus) {
      for (let i = 0; i < sent.length; i++) {
        for (let j = Math.max(0, i - window); j < Math.min(sent.length, i + window + 1); j++) {
          if (j !== i) pairs.push([sent[i], sent[j]]);
        }
      }
    }

    for (let epoch = 0; epoch < epochs; epoch++) {
      this.rng.shuffle(pairs);
      for (const [center, context] of pairs) {
        const grams = charNgrams(center, this.minN, this.maxN)
          .map((g) => this.ngramVocab.get(g))
          .filter((gi): gi is number => gi !== undefined);
        const vc = new Array(this.dim).fill(0);
        for (const gi of grams) for (let k = 0; k < this.dim; k++) vc[k] += this.vGram[gi][k];

        const contextIdx = this.wordIndex.get(context)!;
        const vo = this.vOut[contextIdx];
        const grad = lr * (1 - sigmoid(dot(vc, vo)));
        const gradVec = vo.map((x) => grad * x);
        this.vOut[contextIdx] = vo.map((x, k) => x + grad * vc[k]);

        for (let neg = 0; neg < negatives; neg++) {
          const negIdx = this.rng.randrange(this.wordList.length);
          if (negIdx === contextIdx) continue;
          const vneg = this.vOut[negIdx];
          const negGrad = lr * (0 - sigmoid(dot(vc, vneg)));
          for (let k = 0; k < this.dim; k++) gradVec[k] += negGrad * vneg[k];
          this.vOut[negIdx] = vneg.map((x, k) => x + negGrad * vc[k]);
        }

        for (const gi of grams) {
          for (let k = 0; k < this.dim; k++) this.vGram[gi][k] += gradVec[k];
        }
      }
    }
  }
}

function cosine(a: number[], b: number[]): number {
  const d = dot(a, b);
  const na = Math.sqrt(dot(a, a));
  const nb = Math.sqrt(dot(b, b));
  return na && nb ? d / (na * nb) : 0;
}
```
