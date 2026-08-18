---
name: クロスエンコーダによる再ランキング(Cross-Encoder Reranking)
category: 情報検索・ランキング
subcategory: スコアリング
complexity: O(k)(再ランキング対象のk件それぞれに1回の順伝播、kは候補数)
summary: クエリと文書のペアを1つのTransformerに同時入力し、両者の単語間の相互作用を直接モデル化して関連度スコアを出力する、独立に埋め込みを作ってから比較する方式とは対照的なスコアリング手法。
---

## 概要

[ベクトル空間モデル](/algorithms/vector-space-model)や近年の埋め込みベースの検索は、クエリと文書をそれぞれ独立にベクトル化してから、コサイン類似度のような単純な演算で比較する「バイエンコーダ(独立埋め込み)」方式を取る。この方式は文書側のベクトルを事前に計算・インデックス化できるため[HNSW](/algorithms/hnsw)のような近似最近傍探索と組み合わせて高速だが、**クエリと文書を最後まで独立に扱う**ため、両者の単語同士がどう関係しているか(例えば「銀行」がクエリの文脈では金融機関か川岸かなど)を捉えにくいという限界がある。クロスエンコーダは、これとは逆の発想を取る——クエリと文書を`[CLS] クエリ [SEP] 文書 [SEP]`のように**1つの入力系列として連結**し、BERTのようなTransformerに同時に入力することで、Self-Attentionの機構がクエリの単語と文書の単語の間の相互作用を直接計算できるようにする。この「最初から一緒に処理する」設計により、独立埋め込み方式より高い精度が得られることが広く確認されているが、文書ごとに毎回モデルの順伝播が必要になるため事前インデックス化ができず、大規模検索の第一段階には使えない。

## 仕組み

1. **入力の構成**: クエリ`q`と候補文書`d`を、`[CLS] q [SEP] d [SEP]` のように1つのトークン列に連結する
2. この結合系列をTransformerエンコーダ(BERTなど)に入力する。Self-Attention層が、クエリのトークンと文書のトークンの**両方に自由にアテンションを張れる**ため、「クエリのこの単語と文書のこの単語が強く関連している」という相互作用の情報が、層を重ねるごとにモデル内部で直接計算されていく
3. 最終層の`[CLS]`トークンに対応する出力ベクトル(系列全体を要約した表現)を、小さな線形層(分類ヘッド)に通し、スカラーの関連度スコアを出力する
4. **学習**: [ペアワイズ・ランク学習](/algorithms/pairwise-learning-to-rank)や単純な二値分類(関連/非関連)の損失関数を使い、大量の(クエリ, 文書, 関連度ラベル)の組でモデル全体(Transformerの重みを含む)をエンドツーエンドに学習する
5. **推論時の使い方**: クエリごとに全文書に対してクロスエンコーダを実行するのは計算コストが大きすぎるため、実務では2段階構成を取る——まず[BM25](/algorithms/bm25)やバイエンコーダ+[HNSW](/algorithms/hnsw)のような高速な手法で候補を数十〜数百件に絞り込み(第一段階検索)、その絞り込んだ候補だけをクロスエンコーダで精密に再スコアリングする(再ランキング)

## 特性・トレードオフ

- **計算量とレイテンシ**: クエリと文書1組ごとにモデルの順伝播が必要なため、再ランキング対象の候補数`k`に比例してO(k)の推論コストがかかる。[ベクトル空間モデル](/algorithms/vector-space-model)や埋め込みベースの検索のように文書ベクトルを事前計算しておくことができず、大規模なコーパス全体を直接クロスエンコーダで検索することは計算量的に不可能
- **精度と速度のトレードオフ**: クエリと文書の相互作用を直接モデル化できるため、独立埋め込み方式(バイエンコーダ)より高い関連度判定精度が得られることが広く報告されている一方、その精度は「候補を絞り込んだ後の再ランキング」という限定的な用途でしか活かせない。第一段階検索の再現率(本当に関連する文書を候補に残せているか)が低いと、クロスエンコーダがどれだけ高精度でも取りこぼしを覆せない
- **バイエンコーダとの使い分け**: バイエンコーダ(独立に埋め込みを作りコサイン類似度で比較する方式)は、[HNSW](/algorithms/hnsw)や[直積量子化](/algorithms/product-quantization)のような近似最近傍探索と組み合わせて数百万〜数十億件規模から高速に候補を絞り込む「第一段階検索」に向き、クロスエンコーダは絞り込んだ後の少数候補を精密に並べ替える「第二段階の再ランキング」に向く、という役割分担が実務での標準的な構成になっている
- **使いどころ**: 検索エンジン・検索拡張生成(RAG)における2段階検索パイプラインの再ランキング段階、質問応答システムでの根拠文書の精密な選定、レコメンドシステムにおける少数候補の最終順位付け

## 実装例

実際のTransformerを実装することはできないため、ここでは「クエリと文書の相互作用を直接特徴量として扱う」というクロスエンコーダの核心的な発想を、TF-IDF風の疎ベクトルと要素積による相互作用特徴を使った小規模なスコアリングモデルとして実装する。バイエンコーダ(独立ベクトルのコサイン類似度)との違いは、クエリと文書のベクトルを**単独では比較せず、要素積という「絡み合った」特徴に変換してからスコアリングする**点にある。

```python
import math


def build_vector(tokens: list[str], vocab: list[str]) -> list[float]:
    counts = {t: tokens.count(t) for t in set(tokens)}
    return [counts.get(term, 0) for term in vocab]


class CrossEncoderScorer:
    """クエリ・文書ベクトルの要素積(相互作用特徴)を使う簡易クロスエンコーダ。"""

    def __init__(self, vocab: list[str]):
        self.vocab = vocab
        n = len(vocab)
        # [クエリ特徴, 文書特徴, 相互作用特徴] の3ブロック分の重み
        self.weights = [0.0] * (n * 3)

    def _features(self, q_vec: list[float], d_vec: list[float]) -> list[float]:
        interaction = [qi * di for qi, di in zip(q_vec, d_vec)]  # 相互作用: 独立に処理しない核心部分
        return q_vec + d_vec + interaction

    def score(self, query: list[str], doc: list[str]) -> float:
        q_vec = build_vector(query, self.vocab)
        d_vec = build_vector(doc, self.vocab)
        feats = self._features(q_vec, d_vec)
        return sum(w * f for w, f in zip(self.weights, feats))

    def train(self, pairs: list[tuple[list[str], list[str], list[str]]], lr: float = 0.01, epochs: int = 200) -> None:
        """pairs: (query, relevant_doc, irrelevant_doc) のペアワイズ学習データ"""
        for _ in range(epochs):
            for query, pos_doc, neg_doc in pairs:
                q_vec = build_vector(query, self.vocab)
                pos_feats = self._features(q_vec, build_vector(pos_doc, self.vocab))
                neg_feats = self._features(q_vec, build_vector(neg_doc, self.vocab))

                pos_score = sum(w * f for w, f in zip(self.weights, pos_feats))
                neg_score = sum(w * f for w, f in zip(self.weights, neg_feats))
                p = 1.0 / (1.0 + math.exp(-(pos_score - neg_score)))
                grad_coeff = (p - 1.0) * lr

                for i in range(len(self.weights)):
                    self.weights[i] -= grad_coeff * (pos_feats[i] - neg_feats[i])
```

```typescript
function buildVector(tokens: string[], vocab: string[]): number[] {
  return vocab.map((term) => tokens.filter((t) => t === term).length);
}

class CrossEncoderScorer {
  private weights: number[];

  constructor(private vocab: string[]) {
    this.weights = new Array(vocab.length * 3).fill(0);
  }

  private features(qVec: number[], dVec: number[]): number[] {
    const interaction = qVec.map((qi, i) => qi * dVec[i]); // 相互作用: 独立に処理しない核心部分
    return [...qVec, ...dVec, ...interaction];
  }

  score(query: string[], doc: string[]): number {
    const qVec = buildVector(query, this.vocab);
    const dVec = buildVector(doc, this.vocab);
    const feats = this.features(qVec, dVec);
    return this.weights.reduce((s, w, i) => s + w * feats[i], 0);
  }

  train(
    pairs: [string[], string[], string[]][],
    lr = 0.01,
    epochs = 200,
  ): void {
    // pairs: [query, relevantDoc, irrelevantDoc] のペアワイズ学習データ
    for (let e = 0; e < epochs; e++) {
      for (const [query, posDoc, negDoc] of pairs) {
        const qVec = buildVector(query, this.vocab);
        const posFeats = this.features(qVec, buildVector(posDoc, this.vocab));
        const negFeats = this.features(qVec, buildVector(negDoc, this.vocab));

        const posScore = this.weights.reduce((s, w, i) => s + w * posFeats[i], 0);
        const negScore = this.weights.reduce((s, w, i) => s + w * negFeats[i], 0);
        const p = 1 / (1 + Math.exp(-(posScore - negScore)));
        const gradCoeff = (p - 1) * lr;

        for (let i = 0; i < this.weights.length; i++) {
          this.weights[i] -= gradCoeff * (posFeats[i] - negFeats[i]);
        }
      }
    }
  }
}
```
