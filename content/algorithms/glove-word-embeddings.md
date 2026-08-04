---
name: GloVe(Global Vectors for Word Representation)
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(V²)(語彙数Vに対する共起行列の構築)、O(nnz)(学習、nnzは共起行列の非零要素数)
summary: "[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)が局所的な文脈の窓だけから単語ベクトルを学習するのに対し、コーパス全体の単語共起の統計情報(大域的な頻度情報)を直接利用して分散表現を学習する、局所と大域の両方の情報を組み合わせた単語埋め込み手法。"
---

## 概要

[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)は、ある単語の周囲数語という「局所的な文脈の窓」だけを見て予測タスクを解くことで単語ベクトルを学習するが、この方式だと、コーパス全体で見たときの単語同士の共起頻度という大域的な統計情報を直接は活用していない。2014年にスタンフォード大学のジェフリー・ペニントン(Pennington)らが発表したGloVeは、「コーパス全体である単語ペアがどれだけ頻繁に共起するか」を表す巨大な共起行列を明示的に構築し、その行列の統計的な構造(特に共起確率の比)を再現するようにベクトルを学習する。局所的な予測タスク([Word2Vec](/algorithms/word2vec-skip-gram))と大域的な行列分解([潜在意味解析(LSA)](/algorithms/latent-semantic-analysis)に近い発想)という、単語埋め込みの2つの主要なアプローチの利点を組み合わせた手法として知られている。

## 仕組み

1. コーパス全体を走査し、単語`i`と単語`j`が(ある窓幅の範囲内で)何回同時に出現したかを数えた共起行列`X`(`X_ij`が単語`i`と`j`の共起回数)を構築する
2. GloVeの核心的な洞察は、単語ベクトルの内積が「共起確率の比の対数」を再現するように学習すべきだという点にある——例えば「氷」に関連する単語と「蒸気」に関連する単語の共起確率の比を見ると、「固い」のような氷に特有の性質を持つ単語では比が大きく偏り、「水」のようにどちらにも関連する単語では比が1に近くなる。この比の情報が、単語の意味的な違いを捉える手がかりになる
3. 各単語ベクトル`w_i`とその文脈ベクトル`w̃_j`について、内積`w_i・w̃_j + bias`が共起回数の対数`log(X_ij)`に近づくよう、二乗誤差を最小化する目的関数を設計する
4. 共起回数が極端に少ない(ノイズが多い)ペアの影響を抑えるため、共起頻度に応じた重み関数`f(X_ij)`を目的関数に掛け合わせる(頻度が非常に高い一般的な単語ペアの影響も抑える)
5. [勾配降下法](/algorithms/gradient-descent)ベースの最適化でこの目的関数を最小化し、最終的な単語ベクトルを得る

## 特性・トレードオフ

- **計算量**: 共起行列の構築自体は語彙数`V`に対して理論上`O(V²)`だが、実際には大半のペアは共起回数0であるため疎行列として扱え、実質的な学習コストは非零要素数`nnz`に比例する`O(nnz)`——コーパス全体を都度舐め直す必要がなく、一度共起行列を作ってしまえば効率的に学習できる
- **[Word2Vec](/algorithms/word2vec-skip-gram)との位置づけ**: [Word2Vec](/algorithms/word2vec-skip-gram)は局所的な予測タスク(周囲の単語を当てる)を通じて間接的に大域的な統計を学習するのに対し、GloVeは大域的な共起統計を明示的な目的関数として直接最適化する——理論的な出発点は異なるが、得られる単語ベクトルの性質(意味的な類似度、"king - man + woman ≈ queen"のような加法構成性)は驚くほど似ていることが実証されている
- **静的な埋め込みという世代的な制約**: GloVeも[Word2Vec](/algorithms/word2vec-skip-gram)と同様、各単語に文脈によらない1つの固定ベクトルしか割り当てられない(”bank”が「銀行」と「川岸」のどちらの意味でも同じベクトル)。この制約は、後のBERT等の文脈依存埋め込みモデルによって克服されることになる
- **使いどころ**: 検索エンジンにおけるクエリ拡張(意味的に近い単語の発見)、機械学習モデルの入力特徴量としての単語ベクトル利用、単語間の類似度・アナロジー(”パリ-フランス+日本≈東京”)の計算、[潜在意味解析](/algorithms/latent-semantic-analysis)や[Word2Vec](/algorithms/word2vec-skip-gram)と並ぶ、深層学習以前の分散表現学習の代表的な到達点

## 実装例

小さなトイコーパスから共起行列を構築し、重み付き最小二乗損失を[勾配降下法](/algorithms/gradient-descent)で最小化する簡易版GloVe。

```python
import math
from collections import defaultdict


def build_cooccurrence(corpus: list[list[str]], window: int) -> dict[tuple[str, str], float]:
    cooc: dict[tuple[str, str], float] = defaultdict(float)
    for sentence in corpus:
        for i, wi in enumerate(sentence):
            for dist in range(1, window + 1):
                j = i + dist
                if j >= len(sentence):
                    break
                wj = sentence[j]
                weight = 1.0 / dist  # 遠い共起ほど重みを下げる
                cooc[(wi, wj)] += weight
                cooc[(wj, wi)] += weight
    return cooc


def weighting_fn(x: float, x_max: float = 100.0, alpha: float = 0.75) -> float:
    return (x / x_max) ** alpha if x < x_max else 1.0


def train_glove(
    cooc: dict[tuple[str, str], float], vocab: list[str], dim: int, iterations: int, lr: float,
) -> dict[str, list[float]]:
    w = {word: [0.1 * (hash((word, d)) % 10 - 5) for d in range(dim)] for word in vocab}
    wt = {word: [0.1 * (hash((word, "t", d)) % 10 - 5) for d in range(dim)] for word in vocab}
    b = {word: 0.0 for word in vocab}
    bt = {word: 0.0 for word in vocab}
    pairs = list(cooc.items())

    for _ in range(iterations):
        for (wi, wj), xij in pairs:
            dot = sum(w[wi][d] * wt[wj][d] for d in range(dim))
            diff = dot + b[wi] + bt[wj] - math.log(xij)
            weight = weighting_fn(xij)
            grad_common = weight * diff
            for d in range(dim):
                grad_w = grad_common * wt[wj][d]
                grad_wt = grad_common * w[wi][d]
                w[wi][d] -= lr * grad_w
                wt[wj][d] -= lr * grad_wt
            b[wi] -= lr * grad_common
            bt[wj] -= lr * grad_common

    # 最終的な単語ベクトルは w と wt の和(GloVe論文の慣例)
    return {word: [w[word][d] + wt[word][d] for d in range(dim)] for word in vocab}
```

```typescript
function buildCooccurrence(corpus: string[][], window: number): Map<string, number> {
  const cooc = new Map<string, number>();
  const add = (a: string, b: string, weight: number) => {
    const key = `${a}|${b}`;
    cooc.set(key, (cooc.get(key) ?? 0) + weight);
  };
  for (const sentence of corpus) {
    for (let i = 0; i < sentence.length; i++) {
      for (let dist = 1; dist <= window; dist++) {
        const j = i + dist;
        if (j >= sentence.length) break;
        const weight = 1.0 / dist;
        add(sentence[i], sentence[j], weight);
        add(sentence[j], sentence[i], weight);
      }
    }
  }
  return cooc;
}

function weightingFn(x: number, xMax = 100.0, alpha = 0.75): number {
  return x < xMax ? Math.pow(x / xMax, alpha) : 1.0;
}

function trainGlove(
  cooc: Map<string, number>,
  vocab: string[],
  dim: number,
  iterations: number,
  lr: number,
  rng: () => number
): Map<string, number[]> {
  const w = new Map(vocab.map((word) => [word, Array.from({ length: dim }, () => rng() - 0.5)]));
  const wt = new Map(vocab.map((word) => [word, Array.from({ length: dim }, () => rng() - 0.5)]));
  const b = new Map(vocab.map((word) => [word, 0]));
  const bt = new Map(vocab.map((word) => [word, 0]));
  const pairs = [...cooc.entries()].map(([key, xij]) => {
    const [wi, wj] = key.split("|");
    return { wi, wj, xij };
  });

  for (let it = 0; it < iterations; it++) {
    for (const { wi, wj, xij } of pairs) {
      const wvi = w.get(wi)!, wtvj = wt.get(wj)!;
      let dot = 0;
      for (let d = 0; d < dim; d++) dot += wvi[d] * wtvj[d];
      const diff = dot + b.get(wi)! + bt.get(wj)! - Math.log(xij);
      const gradCommon = weightingFn(xij) * diff;
      for (let d = 0; d < dim; d++) {
        wvi[d] -= lr * gradCommon * wtvj[d];
        wtvj[d] -= lr * gradCommon * wvi[d];
      }
      b.set(wi, b.get(wi)! - lr * gradCommon);
      bt.set(wj, bt.get(wj)! - lr * gradCommon);
    }
  }

  return new Map(vocab.map((word) => [word, w.get(word)!.map((v, d) => v + wt.get(word)![d])]));
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <cmath>

using Cooc = std::unordered_map<std::string, double>; // key: "wi|wj"

double weightingFn(double x, double xMax = 100.0, double alpha = 0.75) {
    return x < xMax ? std::pow(x / xMax, alpha) : 1.0;
}

void gloveStep(
    std::unordered_map<std::string, std::vector<double>>& w,
    std::unordered_map<std::string, std::vector<double>>& wt,
    std::unordered_map<std::string, double>& b,
    std::unordered_map<std::string, double>& bt,
    const std::vector<std::tuple<std::string, std::string, double>>& pairs,
    int dim, double lr) {

    for (const auto& [wi, wj, xij] : pairs) {
        auto& wvi = w[wi];
        auto& wtvj = wt[wj];
        double dot = 0.0;
        for (int d = 0; d < dim; d++) dot += wvi[d] * wtvj[d];
        double diff = dot + b[wi] + bt[wj] - std::log(xij);
        double gradCommon = weightingFn(xij) * diff;
        for (int d = 0; d < dim; d++) {
            double gradW = gradCommon * wtvj[d];
            double gradWt = gradCommon * wvi[d];
            wvi[d] -= lr * gradW;
            wtvj[d] -= lr * gradWt;
        }
        b[wi] -= lr * gradCommon;
        bt[wj] -= lr * gradCommon;
    }
}
```

```rust
use std::collections::HashMap;

fn weighting_fn(x: f64, x_max: f64, alpha: f64) -> f64 {
    if x < x_max {
        (x / x_max).powf(alpha)
    } else {
        1.0
    }
}

fn glove_step(
    w: &mut HashMap<String, Vec<f64>>,
    wt: &mut HashMap<String, Vec<f64>>,
    b: &mut HashMap<String, f64>,
    bt: &mut HashMap<String, f64>,
    pairs: &[(String, String, f64)],
    dim: usize,
    lr: f64,
) {
    for (wi, wj, xij) in pairs {
        let dot: f64 = (0..dim).map(|d| w[wi][d] * wt[wj][d]).sum();
        let diff = dot + b[wi] + bt[wj] - xij.ln();
        let grad_common = weighting_fn(*xij, 100.0, 0.75) * diff;

        let wvi_old = w[wi].clone();
        let wtvj_old = wt[wj].clone();
        for d in 0..dim {
            w.get_mut(wi).unwrap()[d] -= lr * grad_common * wtvj_old[d];
            wt.get_mut(wj).unwrap()[d] -= lr * grad_common * wvi_old[d];
        }
        *b.get_mut(wi).unwrap() -= lr * grad_common;
        *bt.get_mut(wj).unwrap() -= lr * grad_common;
    }
}
```

```csharp
static double WeightingFn(double x, double xMax = 100.0, double alpha = 0.75) =>
    x < xMax ? Math.Pow(x / xMax, alpha) : 1.0;

static void GloveStep(
    Dictionary<string, double[]> w, Dictionary<string, double[]> wt,
    Dictionary<string, double> b, Dictionary<string, double> bt,
    List<(string wi, string wj, double xij)> pairs, int dim, double lr)
{
    foreach (var (wi, wj, xij) in pairs)
    {
        var wvi = w[wi];
        var wtvj = wt[wj];
        double dot = 0;
        for (int d = 0; d < dim; d++) dot += wvi[d] * wtvj[d];
        double diff = dot + b[wi] + bt[wj] - Math.Log(xij);
        double gradCommon = WeightingFn(xij) * diff;
        for (int d = 0; d < dim; d++)
        {
            double gradW = gradCommon * wtvj[d];
            double gradWt = gradCommon * wvi[d];
            wvi[d] -= lr * gradW;
            wtvj[d] -= lr * gradWt;
        }
        b[wi] -= lr * gradCommon;
        bt[wj] -= lr * gradCommon;
    }
}
```
