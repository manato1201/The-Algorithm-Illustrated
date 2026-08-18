---
name: ポインタ・ジェネレータネットワークによる要約
category: 自然言語処理
subcategory: 要約・訂正
complexity: O(n × m)(nは原文長、mは要約長、注意機構込みのSeq2Seq推論)
summary: 語彙から新しい単語を生成するか原文から単語を直接コピーするかをステップごとに動的に切り替える機構を持つ、抽象型要約の代表的なSeq2Seqアーキテクチャ。
---

## 概要

自動要約には大きく2つのアプローチがある。原文から重要な文をそのまま抜き出す抽出型要約と、原文の内容を理解した上で新しい文を生成する抽象型要約である。抽象型要約は人間らしい滑らかな要約文を作れる可能性がある一方、注意機構付きSeq2Seqモデルをそのまま使うと2つの深刻な問題が起きる。1つは固有名詞や専門用語、数値など、語彙に含まれない未知語(OOV)を正しく出力できないこと。もう1つは、同じ語句を何度も繰り返し生成してしまう反復問題である。2017年にSeeらが発表したポインタ・ジェネレータネットワークは、「語彙から単語を生成する」通常のSeq2Seqの機構と、「原文中の単語をそのままコピーする」ポインタ機構(コピー機構)を、各出力ステップで動的な重み`p_gen`によって混ぜ合わせるという単純だが効果的なアイデアで、この2つの問題を同時に緩和した。

## 仕組み

1. エンコーダ(通常は双方向RNN)で原文の各単語を隠れ状態のベクトル列にエンコードする
2. デコーダは各出力ステップで、注意機構(attention)を使って原文中のどの単語に注目すべきかを表す「注意重み分布」`a_t`(原文の各単語位置に対する確率分布)を計算する
3. 通常のSeq2Seqと同様、注意で重み付けした文脈ベクトルとデコーダの隠れ状態から、語彙全体に対する生成確率分布`P_vocab`(softmaxで正規化)を計算する
4. **生成確率(generation probability)** `p_gen ∈ [0, 1]`を、デコーダの隠れ状態・文脈ベクトル・直前の出力単語から計算する——これは「このステップで語彙から単語を生成するか、原文から単語をコピーするか」の混合比率を表すゲートである
5. 最終的な出力確率分布は、語彙からの生成確率分布`P_vocab`と、注意重み分布`a_t`(=原文の単語をそのままコピーする確率分布)を`p_gen`で線形結合したものになる: `P(w) = p_gen × P_vocab(w) + (1 - p_gen) × Σ{i: xi=w} a_t(i)`。この式により、語彙にない単語(`P_vocab(w)=0`)であっても、原文中に出現していれば注意重みを通じて直接コピーされ、正しい確率が割り当てられる
6. 反復問題への対策として、各ステップまでの注意重みの累積(coverage vector)を追跡し、既に強く注目した部分に再度注目することを損失関数でペナルティ付けする「カバレッジ機構」を追加する

## 特性・トレードオフ

- **計算量**: 通常の注意機構付きSeq2Seqモデルに`p_gen`を計算する小さな追加のゲート機構を足すだけなので、計算量のオーダーは元のSeq2Seq(原文長`n`×要約長`m`の注意計算)とほぼ変わらない
- **未知語(OOV)問題の直接的な解決**: 語彙に含まれない固有名詞や専門用語であっても、原文中に出現していればポインタ機構を通じてそのままコピーできる。要約タスクでは原文にしか現れない固有名詞や数値をそのまま使いたい場面が多く、この性質は特に有効に働く
- **抽出と抽象のハイブリッド**: 純粋な抽出型要約(原文の文をそのまま切り貼り)と純粋な抽象型要約(語彙からの自由な生成)の中間に位置し、事実に忠実でありながら流暢な要約文を生成しやすい——`p_gen`が高いステップでは抽象的な生成、低いステップでは原文の言い回しをそのまま保持する、という柔軟な使い分けが学習される
- **カバレッジ機構なしでは反復が残る**: ポインタ機構自体は未知語問題を解決するが、反復問題(同じ句を繰り返し生成してしまう)には別途カバレッジ機構による損失項が必要であり、この2つの工夫は独立した問題に対する別々の解決策として組み合わされている
- **使いどころ**: ニュース記事の見出し・要約生成、長文書の抽象型要約、[TextRank](/algorithms/textrank)のようなグラフベースの抽出型要約とは異なるアプローチとして比較検討される。生成された要約の評価には[ROUGEスコア](/algorithms/rouge-score)がよく使われる

## 実装例

以下は語彙生成確率とコピー確率の混合という核心部分を、簡略化したnumPy風の素朴な実装で示す(実際のエンコーダ・デコーダのRNN部分は省略し、注意重みと語彙分布が既に得られている前提で出力分布を合成する部分に焦点を当てる)。

```python
import math


def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1 / (1 + z)
    z = math.exp(x)
    return z / (1 + z)


def compute_p_gen(context_vec: list[float], decoder_state: list[float], w_gen: list[float], b_gen: float) -> float:
    """p_gen = sigmoid(w^T [context; decoder_state] + b) という単純な線形ゲート"""
    combined = context_vec + decoder_state
    score = sum(w * x for w, x in zip(w_gen, combined)) + b_gen
    return sigmoid(score)


def final_distribution(
    vocab: list[str],
    source_tokens: list[str],
    vocab_logits: list[float],
    attention_weights: list[float],
    p_gen: float,
) -> dict[str, float]:
    """語彙からの生成確率分布とコピー(注意)確率分布をp_genで混合する"""
    p_vocab = softmax(vocab_logits)
    dist: dict[str, float] = {w: p_gen * p for w, p in zip(vocab, p_vocab)}

    # 未知語(語彙にない単語)を含む原文の各単語に注意重みでコピー確率を加算する
    for token, weight in zip(source_tokens, attention_weights):
        dist[token] = dist.get(token, 0.0) + (1 - p_gen) * weight

    return dist


# 例: 語彙に含まれない固有名詞"Zephyria"を原文からコピーする様子を確認する
vocab = ["the", "city", "was", "founded", "in"]
source_tokens = ["the", "city", "of", "Zephyria", "was", "founded"]
vocab_logits = [2.0, 1.5, 1.0, 0.5, 0.8]  # 語彙上のスコア(Zephyriaは語彙にないため含まれない)
attention_weights = [0.05, 0.05, 0.05, 0.7, 0.1, 0.05]  # "Zephyria"に強く注目している
p_gen = 0.3  # このステップでは主にコピーに頼る

dist = final_distribution(vocab, source_tokens, vocab_logits, attention_weights, p_gen)
assert dist["Zephyria"] > dist["the"]  # 語彙にない単語がコピー機構で高い確率を得る
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function computePGen(contextVec: number[], decoderState: number[], wGen: number[], bGen: number): number {
  // p_gen = sigmoid(w^T [context; decoder_state] + b) という単純な線形ゲート
  const combined = [...contextVec, ...decoderState];
  const score = wGen.reduce((sum, w, i) => sum + w * combined[i], 0) + bGen;
  return sigmoid(score);
}

function finalDistribution(
  vocab: string[],
  sourceTokens: string[],
  vocabLogits: number[],
  attentionWeights: number[],
  pGen: number,
): Map<string, number> {
  // 語彙からの生成確率分布とコピー(注意)確率分布をpGenで混合する
  const pVocab = softmax(vocabLogits);
  const dist = new Map<string, number>();
  vocab.forEach((w, i) => dist.set(w, pGen * pVocab[i]));

  // 未知語(語彙にない単語)を含む原文の各単語に注意重みでコピー確率を加算する
  sourceTokens.forEach((token, i) => {
    const weight = attentionWeights[i];
    dist.set(token, (dist.get(token) ?? 0) + (1 - pGen) * weight);
  });

  return dist;
}

// 例: 語彙に含まれない固有名詞"Zephyria"を原文からコピーする様子を確認する
const vocab = ["the", "city", "was", "founded", "in"];
const sourceTokens = ["the", "city", "of", "Zephyria", "was", "founded"];
const vocabLogits = [2.0, 1.5, 1.0, 0.5, 0.8]; // 語彙上のスコア(Zephyriaは語彙にないため含まれない)
const attentionWeights = [0.05, 0.05, 0.05, 0.7, 0.1, 0.05]; // "Zephyria"に強く注目している
const pGen = 0.3; // このステップでは主にコピーに頼る

const dist = finalDistribution(vocab, sourceTokens, vocabLogits, attentionWeights, pGen);
console.assert(dist.get("Zephyria")! > dist.get("the")!); // 語彙にない単語がコピー機構で高い確率を得る
```
