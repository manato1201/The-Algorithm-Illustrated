---
name: Kneser-Ney平滑化
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: 学習 O(コーパスのn-gram数)、確率の計算 O(1)(カウントの表引き)
summary: n-gramの確率の見積もりで、「その語が何回出たか」ではなく「何種類の語の後ろに現れたか」で低次の確率を作る平滑化。未知の組み合わせでも、もっともらしい確率を割り当てる。
---

## 概要

[n-gram言語モデル](/algorithms/n-gram-language-model)は、「直前の語が `v` のとき次の語が `w` である確率」を、コーパス中の数え上げ `c(v, w) / c(v)` で見積もる。しかし、訓練データに現れなかった組み合わせは確率0になってしまい、1つでも0があると文全体の確率が0になる。そこで、少しずつ確率を割り引いて、見たことのない組み合わせにも小さな確率を回す**平滑化**が必要になる。

単純な方法では、低次のn-gram(たとえば単語単独の確率)の語の出現頻度を回す先に使う。だが、これには落とし穴がある。`Francisco` は頻度の高い語だが、ほとんど常に `San` の後ろにしか現れない。`San` のない文脈で「次は何か」を見積もるとき、頻度の高い `Francisco` に大きな確率を回すのは不自然である。Kneser と Ney(1995年)は、**低次の分布には「その語が何種類の異なる語の後ろに現れるか」(語が文脈を作る多様性)を使うべきだ**と考えた。Chen と Goodman(1996〜1998年)が、これを修正して比較実験を行い、実用上の最良の平滑化手法のひとつと位置づけた。

## 仕組み

補間型の Kneser-Ney の2-gram版。割引定数 `d`(通常 0.75 前後)を使う。

`P_KN(w | v) = max(c(v, w) − d, 0) / c(v) + λ(v) · P_cont(w)`

- **第1項**: 観測された組み合わせの確率を、`d` だけ割り引いたもの
- **λ(v)** `= d · N₁₊(v •) / c(v)`: 割り引いた分を回収した重み。`N₁₊(v •)` は、`v` の後ろに現れた**異なる語の種類数**。割引した総量(各種類につき `d`)を `c(v)` で割ったもの
- **P_cont(w)** `= N₁₊(• w) / N₁₊(• •)`: **継続確率**。`N₁₊(• w)` は、`w` の前に現れた異なる語の種類数、`N₁₊(• •)` は、観測された異なる2-gramの総数。`w` が様々な語の後ろに出てくるほど、新しい文脈でも出現しやすいとみなす

例: `Francisco` は `San` の後ろにしか出ないので `N₁₊(• Francisco) = 1`、継続確率は小さい。`the` の前には多様な語が来るので、継続確率は大きい。

高次(3-gram以上)では、最高次では実際の頻度を、それより低次では継続カウントを使い、再帰的に補間する。さらに、`d` を頻度のクラス(1回、2回、3回以上)ごとに変える**修正版 Kneser-Ney** が、実用では最もよく使われる。

## 特性・トレードオフ

- **直感に合う低次の分布**: 頻度の偏った語(`Francisco`)が、文脈を変えたときに過大評価されるのを避ける。出現の頻度ではなく、文脈の多様性で新しい組み合わせを予想する
- **性能が高い**: n-gram言語モデルの平滑化として、長く標準的な選択肢だった。音声認識や機械翻訳の言語モデル(KenLM など)に広く使われた
- **訓練データの統計が前提**: n-gramの数え上げが必要で、データが大きいと表が巨大になる。サイズを抑える枝刈りや圧縮が必要
- **文脈が長い依存は扱えない**: n-gramの枠組みの限界。ニューラル言語モデル(RNN、Transformer)が主流になってからは、主役の座を譲ったが、小さなモデルやドメイン特化で今も使われる
- **割引定数の調整**: `d` は、保持したデータ(開発セット)で調整するか、`d = n₁ / (n₁ + 2 n₂)`(出現1回・2回の種類数 `n₁`, `n₂`)で推定する
- **使いどころ**: 音声認識・機械翻訳・スペル訂正の言語モデル、小規模データでのn-gram確率の見積もり、教育用の言語モデルの実装

## 実装例

```python
from collections import Counter, defaultdict


class KneserNeyBigram:
    def __init__(self, sentences, d=0.75):
        self.d = d
        self.bigrams = Counter()
        for words in sentences:
            tokens = ["<s>"] + words
            for v, w in zip(tokens, tokens[1:]):
                self.bigrams[(v, w)] += 1
        self.context_count = Counter()
        self.followers = defaultdict(set)    # v の後ろに現れた異なる語
        self.predecessors = defaultdict(set)  # w の前に現れた異なる語
        for (v, w), c in self.bigrams.items():
            self.context_count[v] += c
            self.followers[v].add(w)
            self.predecessors[w].add(v)
        self.total_types = len(self.bigrams)  # 異なる2-gramの数
        self.vocab = {w for _, w in self.bigrams}

    def prob(self, v, w):
        p_cont = len(self.predecessors[w]) / self.total_types
        c_v = self.context_count[v]
        if c_v == 0:
            return p_cont
        discounted = max(self.bigrams[(v, w)] - self.d, 0) / c_v
        lam = self.d * len(self.followers[v]) / c_v
        return discounted + lam * p_cont


corpus = [
    "i live in san francisco".split(),
    "i love san francisco".split(),
    "i read the book".split(),
    "you read the paper".split(),
    "we read a book".split(),
]
lm = KneserNeyBigram(corpus)
print(round(lm.prob("san", "francisco"), 3))                 # 高い: 実際によく続く
print(round(lm.prob("read", "francisco"), 3))                # 低い: francisco は san の後ろにしか出ない
print(round(sum(lm.prob("read", w) for w in lm.vocab), 6))   # 1.0(確率の総和)
```

```typescript
class KneserNeyBigram {
  private bigrams = new Map<string, number>();
  private contextCount = new Map<string, number>();
  private followers = new Map<string, Set<string>>();
  private predecessors = new Map<string, Set<string>>();
  private totalTypes = 0;
  readonly vocab = new Set<string>();
  private d: number;

  constructor(sentences: string[][], d = 0.75) {
    this.d = d;
    for (const words of sentences) {
      const tokens = ["<s>", ...words];
      for (let i = 1; i < tokens.length; i++) {
        const key = `${tokens[i - 1]} ${tokens[i]}`;
        this.bigrams.set(key, (this.bigrams.get(key) ?? 0) + 1);
      }
    }
    for (const [key, c] of this.bigrams) {
      const [v, w] = key.split(" ");
      this.contextCount.set(v, (this.contextCount.get(v) ?? 0) + c);
      if (!this.followers.has(v)) this.followers.set(v, new Set());
      this.followers.get(v)!.add(w);
      if (!this.predecessors.has(w)) this.predecessors.set(w, new Set());
      this.predecessors.get(w)!.add(v);
      this.vocab.add(w);
    }
    this.totalTypes = this.bigrams.size;
  }

  prob(v: string, w: string): number {
    const pCont = (this.predecessors.get(w)?.size ?? 0) / this.totalTypes;
    const cV = this.contextCount.get(v) ?? 0;
    if (cV === 0) return pCont;
    const discounted =
      Math.max((this.bigrams.get(`${v} ${w}`) ?? 0) - this.d, 0) / cV;
    const lambda = (this.d * (this.followers.get(v)?.size ?? 0)) / cV;
    return discounted + lambda * pCont;
  }
}

const corpus = [
  "i live in san francisco",
  "i love san francisco",
  "i read the book",
  "you read the paper",
  "we read a book",
].map((s) => s.split(" "));
const lm = new KneserNeyBigram(corpus);
console.log(lm.prob("san", "francisco").toFixed(3));
console.log(lm.prob("read", "francisco").toFixed(3));
console.log(
  [...lm.vocab].reduce((s, w) => s + lm.prob("read", w), 0).toFixed(6),
); // 1.000000
```
