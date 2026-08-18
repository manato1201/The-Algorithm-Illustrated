---
name: Brownクラスタリング
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(V³)(素朴な実装、Vは語彙サイズ)、実用実装ではO(V × C²)程度(Cはクラス数の上限)
summary: 隣接する単語の出現確率(バイグラムの尤度)を最大化するように単語を階層的に貪欲マージしていく、ニューラル分散表現以前の古典的な単語クラスタリング手法。
---

## 概要

[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)や[GloVe](/algorithms/glove-word-embeddings)のようなニューラル分散表現が登場する以前、単語間の意味的な近さを扱う代表的な手法の1つがBrownクラスタリングだった。1992年にIBMのピーター・ブラウンらによって提案されたこの手法は、単語を連続的なベクトル空間に埋め込むのではなく、単語を離散的な「クラス」に分類し、さらにそのクラス群を二分木状に階層的に組織化する。基本的な発想は、コーパス全体の隣接単語ペアの出現確率(バイグラム言語モデルの尤度)を最も高く保てるように、似た文脈で使われる単語同士を同じクラスにまとめていくというものである。学習結果は二分木の形を取るため、木の根に近い大まかな分岐ほど品詞のような大きな単語のカテゴリを、葉に近い細かい分岐ほど意味的に近い単語同士の細かい違いを表す、階層的な単語表現が得られる。

## 仕組み

1. 各単語を、最初はそれぞれ独立した1つのクラスとして扱う(語彙サイズ`V`個のクラスから開始)
2. コーパス全体の「隣接する単語のクラスペア」の出現確率に基づくバイグラム言語モデルの対数尤度を、クラス分割の良さを測る目的関数とする: 直感的には、あるクラスの単語の次に来やすい単語のクラスがはっきり決まっているほど(=予測しやすいほど)尤度が高くなる
3. 現在存在する全てのクラスペアについて、「その2クラスを1つに統合したときに、目的関数(対数尤度)がどれだけ下がるか」を計算し、下がり幅が最も小さい(=最も統合による損失が少ない)クラスペアを貪欲に1つマージする
4. マージのたびに1つのマージ操作が二分木の1つの分岐点として記録される。これをクラス数が目標の`k`個になるまで、または全単語が1つのクラスに統合されるまで繰り返す
5. 最終的に得られる二分木の構造は、各単語をルートから葉までの0/1のビット列(パス)として表現できる。ビット列の先頭何ビットかを共通して持つ単語同士は、木の高い位置で分岐した大まかなグループに属し、意味・統語的に近い傾向を持つ

## 特性・トレードオフ

- **計算量**: 素朴な実装では、各マージステップで全クラスペアの尤度変化を再計算する必要があり、語彙サイズ`V`に対して`O(V³)`程度の計算量になる。ブラウンらの原論文にある実用的な実装は、クラス数の上限`C`(例えば1000程度)を固定し、常に「上限`C`個の枠」の中でマージを行うウィンドウ方式を使うことで`O(V × C²)`程度まで計算量を抑えている
- **階層構造という独自の情報**: [Word2Vec](/algorithms/word2vec-skip-gram)や[GloVe](/algorithms/glove-word-embeddings)が単語を連続的なベクトル空間の1点として表現するのに対し、Brownクラスタリングは離散的な木構造として単語間の関係を表現する。この木構造上のビット列は、深層学習以前の統計的自然言語処理において、系列ラベリング(品詞タグ付けなど)の特徴量として直接利用しやすい形式だった
- **文脈に依存しない静的な割り当て**: 各単語は文脈によらず常に同じクラス(木上の同じ葉)に割り当てられる——同じ単語でも文脈によって異なる意味を持つ多義語を区別できない点は、[Word2Vec](/algorithms/word2vec-skip-gram)などの分散表現とも共通する古典的な手法の限界である
- **使いどころ**: 深層学習が普及する以前の統計的自然言語処理における素性(特徴量)エンジニアリング、[条件付き確率場(CRF)](/algorithms/conditional-random-field)などの系列ラベリングモデルに投入するクラスタベースの特徴量、低頻度語のスパース性を軽減するためのクラスタリング。現代では主にニューラル分散表現に取って代わられたが、その考え方は「単語の文脈からの予測可能性を最大化する」という分布仮説に基づく点で、後続のニューラル手法と本質的な思想を共有している

## 実装例

```python
import math
from collections import Counter
from itertools import combinations


def build_bigram_counts(corpus: list[list[str]]) -> tuple[Counter, Counter]:
    unigram = Counter()
    bigram = Counter()
    for sent in corpus:
        for w in sent:
            unigram[w] += 1
        for w1, w2 in zip(sent, sent[1:]):
            bigram[(w1, w2)] += 1
    return unigram, bigram


class BrownClusterer:
    def __init__(self, corpus: list[list[str]]):
        self.unigram, self.bigram = build_bigram_counts(corpus)
        self.total = sum(self.unigram.values())
        # 各単語を最初は独立したクラスとし、マージ履歴(二分木の分岐)を記録する
        self.classes: dict[str, set[str]] = {w: {w} for w in self.unigram}
        self.merge_history: list[tuple[str, str]] = []

    def _class_bigram_count(self, c1: set[str], c2: set[str]) -> int:
        return sum(self.bigram.get((w1, w2), 0) for w1 in c1 for w2 in c2)

    def _class_unigram_count(self, c: set[str]) -> int:
        return sum(self.unigram[w] for w in c)

    def _log_likelihood_loss(self, c1: set[str], c2: set[str]) -> float:
        """c1とc2をマージした場合の、隣接ペアの対数尤度の"損失"の近似値を返す(小さいほどマージの悪影響が小さい)"""
        merged = c1 | c2
        count_pair = self._class_bigram_count(merged, merged)
        count_total = self._class_unigram_count(merged)
        if count_pair == 0 or count_total == 0:
            return 0.0
        p = count_pair / max(count_total, 1)
        if p <= 0:
            return 0.0
        return -count_pair * math.log(p)  # マージ後クラス内で自己遷移しやすいほど損失(負の尤度)が小さい

    def merge_step(self) -> tuple[str, str] | None:
        if len(self.classes) < 2:
            return None
        names = list(self.classes.keys())
        best_pair = None
        best_loss = float("inf")
        for n1, n2 in combinations(names, 2):
            loss = self._log_likelihood_loss(self.classes[n1], self.classes[n2])
            if loss < best_loss:
                best_loss = loss
                best_pair = (n1, n2)
        if best_pair is None:
            return None
        n1, n2 = best_pair
        merged_name = f"({n1}+{n2})"
        self.classes[merged_name] = self.classes.pop(n1) | self.classes.pop(n2)
        self.merge_history.append((n1, n2))
        return best_pair

    def run(self, target_classes: int) -> None:
        while len(self.classes) > target_classes:
            if self.merge_step() is None:
                break
```

```typescript
function buildBigramCounts(corpus: string[][]): {
  unigram: Map<string, number>;
  bigram: Map<string, number>;
} {
  const unigram = new Map<string, number>();
  const bigram = new Map<string, number>();
  for (const sent of corpus) {
    for (const w of sent) unigram.set(w, (unigram.get(w) ?? 0) + 1);
    for (let i = 0; i < sent.length - 1; i++) {
      const key = `${sent[i]}|${sent[i + 1]}`;
      bigram.set(key, (bigram.get(key) ?? 0) + 1);
    }
  }
  return { unigram, bigram };
}

class BrownClusterer {
  unigram: Map<string, number>;
  bigram: Map<string, number>;
  classes: Map<string, Set<string>>;
  mergeHistory: Array<[string, string]> = [];

  constructor(corpus: string[][]) {
    const { unigram, bigram } = buildBigramCounts(corpus);
    this.unigram = unigram;
    this.bigram = bigram;
    // 各単語を最初は独立したクラスとし、マージ履歴(二分木の分岐)を記録する
    this.classes = new Map([...unigram.keys()].map((w) => [w, new Set([w])]));
  }

  private classBigramCount(c1: Set<string>, c2: Set<string>): number {
    let total = 0;
    for (const w1 of c1)
      for (const w2 of c2) total += this.bigram.get(`${w1}|${w2}`) ?? 0;
    return total;
  }

  private classUnigramCount(c: Set<string>): number {
    let total = 0;
    for (const w of c) total += this.unigram.get(w) ?? 0;
    return total;
  }

  private logLikelihoodLoss(c1: Set<string>, c2: Set<string>): number {
    // c1とc2をマージした場合の、隣接ペアの対数尤度の"損失"の近似値を返す(小さいほどマージの悪影響が小さい)
    const merged = new Set([...c1, ...c2]);
    const countPair = this.classBigramCount(merged, merged);
    const countTotal = this.classUnigramCount(merged);
    if (countPair === 0 || countTotal === 0) return 0;
    const p = countPair / Math.max(countTotal, 1);
    if (p <= 0) return 0;
    return -countPair * Math.log(p); // マージ後クラス内で自己遷移しやすいほど損失(負の尤度)が小さい
  }

  mergeStep(): [string, string] | null {
    const names = [...this.classes.keys()];
    if (names.length < 2) return null;
    let bestPair: [string, string] | null = null;
    let bestLoss = Infinity;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const loss = this.logLikelihoodLoss(
          this.classes.get(names[i])!,
          this.classes.get(names[j])!,
        );
        if (loss < bestLoss) {
          bestLoss = loss;
          bestPair = [names[i], names[j]];
        }
      }
    }
    if (bestPair === null) return null;
    const [n1, n2] = bestPair;
    const mergedName = `(${n1}+${n2})`;
    const mergedSet = new Set([
      ...this.classes.get(n1)!,
      ...this.classes.get(n2)!,
    ]);
    this.classes.delete(n1);
    this.classes.delete(n2);
    this.classes.set(mergedName, mergedSet);
    this.mergeHistory.push(bestPair);
    return bestPair;
  }

  run(targetClasses: number): void {
    while (this.classes.size > targetClasses) {
      if (this.mergeStep() === null) break;
    }
  }
}
```
