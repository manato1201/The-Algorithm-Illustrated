---
name: SentencePiece(言語非依存トークナイゼーション)
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(語彙サイズ × コーパスサイズ)(ユニグラム言語モデル訓練時)、O(n log n)(Viterbi風の適用時)
summary: 単語分割を前提とせず生テキストからユニグラム言語モデルに基づいてサブワード分割を学習する、[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)・[WordPieceトークナイゼーション](/algorithms/wordpiece-tokenization)と並ぶ第三のサブワード分割方式。
---

## 概要

[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)や[WordPieceトークナイゼーション](/algorithms/wordpiece-tokenization)は、いずれも「まず空白などで単語に分割してから、その単語内部をサブワードに分解する」という前処理を前提とする。しかし日本語や中国語、タイ語のように単語の境界が明示的な空白で示されない言語では、この前提自体が成り立たない。2018年にGoogleが発表したSentencePieceは、生のテキスト(スペースも1つの通常の文字として扱う)から直接サブワード分割を学習することで、この言語依存性を取り除いた。分割方式としてBPE風のアルゴリズムも選べるが、SentencePieceの特徴的な貢献は「ユニグラム言語モデル」という第三の分割アルゴリズムにある。これは大きめの候補サブワード集合から始め、コーパス全体の尤度への寄与が小さいサブワードを繰り返し間引いていくという、BPE(小さい単位から統合していくボトムアップ)とは逆方向のトップダウンなアプローチである。

## 仕組み

1. **前処理**: 入力テキストの単語区切りの空白を、通常の文字と同様に扱う特殊記号(例えば`▁`)に置き換えてから処理する——これにより「単語分割してからサブワード分割する」という工程が不要になり、分割結果を結合すれば空白位置も含めて元のテキストを完全に復元できる(可逆性)
2. **候補語彙の初期化**: コーパス中に出現する部分文字列(頻度の高いものを中心に)を大量に候補として集め、大きめの初期語彙とする
3. **ユニグラム言語モデルによる分割確率**: 各サブワード`x`に出現確率`P(x)`を割り当て、ある単語列がサブワード列`x1, x2, ..., xn`に分割される確率を`P(x1)×P(x2)×...×P(xn)`という単純な独立積(ユニグラム仮定)でモデル化する。ある文字列に対する最も確率の高い分割は、Viterbiアルゴリズムに似た動的計画法で効率的に求まる
4. **EMアルゴリズムによる確率推定と語彙の刈り込み**: 期待値最大化(EM)の考え方で各サブワードの出現確率`P(x)`をコーパス全体の尤度が最大になるよう繰り返し推定し、その上で「そのサブワードを語彙から除いたときにコーパス全体の尤度がどれだけ下がるか」を計算し、影響の小さいサブワードから一定割合ずつ語彙から間引く
5. 目標の語彙サイズに達するまで3〜4を繰り返す。学習後は、新しいテキストに対してユニグラム言語モデルのもとで最も確率の高い(またはNベストの中からサンプリングした)分割を求めることでトークン化する

## 特性・トレードオフ

- **計算量**: 訓練は語彙サイズとコーパスサイズに比例した繰り返し処理(EM推定と刈り込みの反復)がかかり、[バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)より重くなりやすい。一方、学習済みモデルを使った分割適用時は、動的計画法による最尤分割の探索が`O(n log n)`程度で行える
- **言語非依存性**: 単語分割の前処理を必要としないため、空白で単語が区切られない日本語・中国語・タイ語などにも、英語などの空白区切り言語と全く同じアルゴリズム・実装でそのまま適用できる。多言語をまたぐ大規模言語モデルの語彙構築で特に重宝される
- **可逆性(losslessな分割)**: 空白を特殊記号として明示的にトークン列に含めるため、分割結果を単純に連結するだけで、元の生テキスト(空白の位置も含む)を完全に復元できる。これは単語境界の情報が分割後に失われがちな従来の「まず単語分割してから」という方式に対する明確な利点
- **BPE・WordPieceとの位置づけ**: [バイトペア符号化(BPE)](/algorithms/byte-pair-encoding)は頻度最大のペアを繰り返し統合するボトムアップ、[WordPieceトークナイゼーション](/algorithms/wordpiece-tokenization)は尤度増分が最大のペアを統合する(BPEの確率版)ボトムアップであるのに対し、SentencePieceのユニグラム言語モデル方式は大きな候補集合からトップダウンに間引いていく点で発想が逆であり、加えて分割自体を確率的にサンプリングできる(サブワード正則化によるデータ拡張が可能)という独自の利点を持つ
- **使いどころ**: 多言語対応の大規模言語モデル(T5、ALBERT、多くの多言語BERT系モデルなど)のトークナイザー、日本語・中国語を含む言語混在コーパスの前処理、単語分割器(形態素解析器)に依存しないパイプラインの構築

## 実装例

```python
import math
from collections import Counter


def get_substrings(word: str, max_len: int) -> list[str]:
    subs = []
    for i in range(len(word)):
        for j in range(i + 1, min(len(word), i + max_len) + 1):
            subs.append(word[i:j])
    return subs


def init_seed_vocab(corpus: list[str], max_len: int = 6, top_k: int = 60) -> dict[str, float]:
    counts = Counter()
    for word in corpus:
        counts.update(get_substrings(word, max_len))
    most_common = counts.most_common(top_k)
    total = sum(c for _, c in most_common)
    return {s: c / total for s, c in most_common}


def viterbi_segment(word: str, vocab: dict[str, float]) -> tuple[list[str], float]:
    """ユニグラム言語モデルのもとで対数確率が最大になる分割をDPで求める"""
    n = len(word)
    neg_inf = float("-inf")
    best_score = [neg_inf] * (n + 1)
    best_score[0] = 0.0
    back = [-1] * (n + 1)
    for i in range(1, n + 1):
        for j in range(max(0, i - 8), i):  # 部分文字列の最大長を8に制限して探索
            piece = word[j:i]
            if piece in vocab and best_score[j] > neg_inf:
                score = best_score[j] + math.log(vocab[piece])
                if score > best_score[i]:
                    best_score[i] = score
                    back[i] = j
    if best_score[n] == neg_inf:
        return list(word), neg_inf  # フォールバック: 語彙にない場合は1文字ずつ
    pieces = []
    i = n
    while i > 0:
        j = back[i]
        pieces.append(word[j:i])
        i = j
    pieces.reverse()
    return pieces, best_score[n]


def em_reestimate(corpus: list[str], vocab: dict[str, float]) -> dict[str, float]:
    """各単語の最尤分割を使ってサブワード出現頻度を数え直し、確率を再推定する(簡略化したEM)"""
    counts = Counter()
    for word in corpus:
        pieces, _ = viterbi_segment(word, vocab)
        counts.update(pieces)
    total = sum(counts.values())
    return {s: c / total for s, c in counts.items() if s in vocab}


def prune_vocab(vocab: dict[str, float], target_size: int) -> dict[str, float]:
    """出現確率が低い(コーパスへの寄与が小さい)サブワードから間引く"""
    if len(vocab) <= target_size:
        return vocab
    sorted_items = sorted(vocab.items(), key=lambda kv: kv[1], reverse=True)
    kept = dict(sorted_items[:target_size])
    total = sum(kept.values())
    return {s: p / total for s, p in kept.items()}


def train_unigram_lm(corpus: list[str], target_vocab_size: int = 30, iterations: int = 5) -> dict[str, float]:
    vocab = init_seed_vocab(corpus)
    for _ in range(iterations):
        vocab = em_reestimate(corpus, vocab)
        vocab = prune_vocab(vocab, target_vocab_size)
    return vocab
```

```typescript
function getSubstrings(word: string, maxLen: number): string[] {
  const subs: string[] = [];
  for (let i = 0; i < word.length; i++) {
    for (let j = i + 1; j <= Math.min(word.length, i + maxLen); j++) {
      subs.push(word.slice(i, j));
    }
  }
  return subs;
}

function initSeedVocab(corpus: string[], maxLen = 6, topK = 60): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of corpus) {
    for (const s of getSubstrings(word, maxLen)) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);
  const total = mostCommon.reduce((sum, [, c]) => sum + c, 0);
  return new Map(mostCommon.map(([s, c]) => [s, c / total]));
}

function viterbiSegment(word: string, vocab: Map<string, number>): { pieces: string[]; score: number } {
  const n = word.length;
  const negInf = -Infinity;
  const bestScore = new Array(n + 1).fill(negInf);
  bestScore[0] = 0;
  const back = new Array(n + 1).fill(-1);
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - 8); j < i; j++) {
      const piece = word.slice(j, i);
      const p = vocab.get(piece);
      if (p !== undefined && bestScore[j] > negInf) {
        const score = bestScore[j] + Math.log(p);
        if (score > bestScore[i]) {
          bestScore[i] = score;
          back[i] = j;
        }
      }
    }
  }
  if (bestScore[n] === negInf) {
    return { pieces: word.split(""), score: negInf };
  }
  const pieces: string[] = [];
  let i = n;
  while (i > 0) {
    const j = back[i];
    pieces.push(word.slice(j, i));
    i = j;
  }
  pieces.reverse();
  return { pieces, score: bestScore[n] };
}

function emReestimate(corpus: string[], vocab: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of corpus) {
    const { pieces } = viterbiSegment(word, vocab);
    for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const result = new Map<string, number>();
  for (const [s, c] of counts) {
    if (vocab.has(s)) result.set(s, c / total);
  }
  return result;
}

function pruneVocab(vocab: Map<string, number>, targetSize: number): Map<string, number> {
  if (vocab.size <= targetSize) return vocab;
  const sorted = [...vocab.entries()].sort((a, b) => b[1] - a[1]).slice(0, targetSize);
  const total = sorted.reduce((sum, [, p]) => sum + p, 0);
  return new Map(sorted.map(([s, p]) => [s, p / total]));
}

function trainUnigramLm(corpus: string[], targetVocabSize = 30, iterations = 5): Map<string, number> {
  let vocab = initSeedVocab(corpus);
  for (let i = 0; i < iterations; i++) {
    vocab = emReestimate(corpus, vocab);
    vocab = pruneVocab(vocab, targetVocabSize);
  }
  return vocab;
}
```
