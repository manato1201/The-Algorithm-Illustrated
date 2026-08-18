---
name: パープレキシティによる言語モデル評価
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(n)(nはテストデータのトークン数)
summary: テストデータに対するモデルの予測確率の逆数の幾何平均として定義される、言語モデルが「次の単語をどれだけ的確に絞り込めているか」を測る標準的な評価指標。
---

## 概要

[n-gram言語モデル](/algorithms/n-gram-language-model)であれ、より現代的なニューラル言語モデルであれ、「言語モデルの良し悪しをどう数値で比較するか」という問題は避けて通れない。パープレキシティ(perplexity, 困惑度)は、テストデータに対してモデルが割り当てた確率の逆数の幾何平均として定義され、直感的には「モデルが各時点で次にどの単語が来るかを予測する際、平均していくつの選択肢の間で迷っているか」を表す指標である。値が小さいほど、モデルはテストデータの単語列を高い確率で(=自信を持って的確に)予測できていることを意味する。情報理論におけるエントロピー(不確実性の尺度)と直接結びついた指標であり、異なる言語モデルの性能を人手を介さず素早く比較できる利便性から、言語モデル研究における標準的なベンチマーク指標として広く使われてきた。

## 仕組み

1. テストデータ(単語列`w1, w2, ..., wN`)に対して、訓練済みの言語モデルが各単語の出現確率`P(wi | w1, ..., wi-1)`を計算できるようにする(この条件付き確率を計算できることが言語モデルの本質的な機能である)
2. テストデータ全体の同時確率を、連鎖律により各単語の条件付き確率の積として表す: `P(w1, ..., wN) = Π P(wi | w1, ..., wi-1)`
3. この同時確率の対数を取って正規化交差エントロピーを求める: `H = -(1/N) × Σ log2 P(wi | w1, ..., wi-1)`——これは「テストデータ1単語あたり、モデルの予測にどれだけの不確実性(ビット数)が残っているか」を表す
4. パープレキシティは交差エントロピーを底の2でべき乗した値として定義される: `PPL = 2^H = P(w1, ..., wN)^(-1/N)`——「同時確率の逆数のN乗根(幾何平均)」という直感的な形にもなる
5. 数値的には対数尤度の和を直接指数化する形で計算するのが一般的(小さな確率の掛け算による桁あふれを防ぐため): `PPL = exp(-(1/N) × Σ ln P(wi | w1, ..., wi-1))`

## 特性・トレードオフ

- **計算量**: テストデータの各単語について1回ずつモデルに確率を問い合わせるだけなので、テストデータのトークン数`N`に対して線形時間`O(n)`で計算できる——大規模なテストセットでも高速に評価できる
- **直感的な解釈**: パープレキシティが`k`であるとは、モデルが各予測時点であたかも「`k`個の選択肢から一様ランダムに1つを選ぶのと同程度」の不確実性を持っていることに相当する。完全に予測が当たり続ける理想的なモデルはパープレキシティ1に近づき、語彙のサイズと同程度の値になるモデルはほぼ何も学習できていないに等しい
- **異なる語彙・トークン化間では比較できない**: パープレキシティは語彙サイズやトークン化の粒度(例えば[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)のサブワード単位か単語単位か)に強く依存するため、異なる語彙・トークン化方式で訓練されたモデル同士のパープレキシティを単純に比較することはできない——同一のテストデータ・同一のトークン化方式のもとでのみ意味のある比較になる
- **タスク性能との乖離**: パープレキシティが低い(予測が的確な)モデルが、要約や対話などの下流タスクで必ずしも高品質な出力を生成するとは限らない。[BLEUスコア](/algorithms/bleu-score)や[ROUGEスコア](/algorithms/rouge-score)のようなタスク特化の評価指標と組み合わせて使われることが多い
- **使いどころ**: [n-gram言語モデル](/algorithms/n-gram-language-model)のスムージング手法の比較、ニューラル言語モデルの訓練中の検証指標(訓練ログにおける標準的なモニタリング対象)、異なるモデルアーキテクチャの予測性能の一次スクリーニング

## 実装例

```python
import math


def cross_entropy(log_probs: list[float]) -> float:
    """log_probsは各単語に割り当てられた自然対数の条件付き確率 ln P(wi | w1..wi-1) のリスト"""
    if not log_probs:
        raise ValueError("log_probs must be non-empty")
    return -sum(log_probs) / len(log_probs)


def perplexity(log_probs: list[float]) -> float:
    return math.exp(cross_entropy(log_probs))


class BigramLanguageModel:
    """スムージングなしの素朴なバイグラムモデル(検証用の最小実装)"""

    def __init__(self, corpus: list[list[str]]):
        self.unigram_counts: dict[str, int] = {}
        self.bigram_counts: dict[tuple[str, str], int] = {}
        self.vocab: set[str] = set()
        for sent in corpus:
            tokens = ["<s>"] + sent + ["</s>"]
            for w in tokens:
                self.vocab.add(w)
            for w in tokens[:-1]:
                self.unigram_counts[w] = self.unigram_counts.get(w, 0) + 1
            for w1, w2 in zip(tokens, tokens[1:]):
                self.bigram_counts[(w1, w2)] = self.bigram_counts.get((w1, w2), 0) + 1
        self.vocab_size = len(self.vocab)

    def prob(self, w1: str, w2: str, alpha: float = 1.0) -> float:
        # ラプラス(加算)スムージングにより未知のバイグラムにも0でない確率を与える
        count_bigram = self.bigram_counts.get((w1, w2), 0)
        count_unigram = self.unigram_counts.get(w1, 0)
        return (count_bigram + alpha) / (count_unigram + alpha * self.vocab_size)

    def sentence_log_probs(self, sent: list[str]) -> list[float]:
        tokens = ["<s>"] + sent + ["</s>"]
        return [math.log(self.prob(w1, w2)) for w1, w2 in zip(tokens, tokens[1:])]


def evaluate_perplexity(model: BigramLanguageModel, test_corpus: list[list[str]]) -> float:
    all_log_probs: list[float] = []
    for sent in test_corpus:
        all_log_probs.extend(model.sentence_log_probs(sent))
    return perplexity(all_log_probs)
```

```typescript
function crossEntropy(logProbs: number[]): number {
  if (logProbs.length === 0) throw new Error("logProbs must be non-empty");
  return -logProbs.reduce((a, b) => a + b, 0) / logProbs.length;
}

function perplexity(logProbs: number[]): number {
  return Math.exp(crossEntropy(logProbs));
}

class BigramLanguageModel {
  unigramCounts = new Map<string, number>();
  bigramCounts = new Map<string, number>();
  vocab = new Set<string>();
  vocabSize: number;

  constructor(corpus: string[][]) {
    for (const sent of corpus) {
      const tokens = ["<s>", ...sent, "</s>"];
      for (const w of tokens) this.vocab.add(w);
      for (const w of tokens.slice(0, -1)) {
        this.unigramCounts.set(w, (this.unigramCounts.get(w) ?? 0) + 1);
      }
      for (let i = 0; i < tokens.length - 1; i++) {
        const key = `${tokens[i]}|${tokens[i + 1]}`;
        this.bigramCounts.set(key, (this.bigramCounts.get(key) ?? 0) + 1);
      }
    }
    this.vocabSize = this.vocab.size;
  }

  prob(w1: string, w2: string, alpha = 1.0): number {
    // ラプラス(加算)スムージングにより未知のバイグラムにも0でない確率を与える
    const countBigram = this.bigramCounts.get(`${w1}|${w2}`) ?? 0;
    const countUnigram = this.unigramCounts.get(w1) ?? 0;
    return (countBigram + alpha) / (countUnigram + alpha * this.vocabSize);
  }

  sentenceLogProbs(sent: string[]): number[] {
    const tokens = ["<s>", ...sent, "</s>"];
    const logProbs: number[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      logProbs.push(Math.log(this.prob(tokens[i], tokens[i + 1])));
    }
    return logProbs;
  }
}

function evaluatePerplexity(model: BigramLanguageModel, testCorpus: string[][]): number {
  const allLogProbs: number[] = [];
  for (const sent of testCorpus) allLogProbs.push(...model.sentenceLogProbs(sent));
  return perplexity(allLogProbs);
}
```
