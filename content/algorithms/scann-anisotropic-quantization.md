---
name: ScaNN(異方性ベクトル量子化, Anisotropic Vector Quantization)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(√n)〜O(n)(量子化パラメータに依存)
summary: 内積の近似誤差が検索結果の順位に与える影響を直接最小化するよう歪めた量子化損失を使う、Google発の近似最近傍探索手法。
---

## 概要

Googleが2020年に発表した近似最近傍探索(ANN)ライブラリ、およびその中核をなす量子化アルゴリズム。従来のProduct Quantization(PQ)は「元のベクトルと量子化後のベクトルの再構成誤差(単純な二乗誤差)」を最小化するように設計されていたが、ScaNNの論文は**「本当に重要なのは再構成誤差そのものではなく、内積(類似度)の順位が狂わないことだ」**と指摘した。この発想に基づき、量子化誤差のうち「候補点の順位に影響を与えやすい方向の誤差」をより重く罰する**異方性(anisotropic)損失関数**を導入し、同じ圧縮率でもより高い検索精度(再現率)を達成する。

## 仕組み

1. 通常のPQと同様に、ベクトルをいくつかのサブベクトルに分割し、それぞれを事前学習したコードブック(代表ベクトル集合)の最も近いエントリに置き換えることで圧縮する
2. ここで、量子化による誤差ベクトル(元のベクトル - 量子化後のベクトル)を、**クエリ方向に平行な成分(内積の大きさに直接影響する)**と、**クエリ方向に垂直な成分(内積にほぼ影響しない)**に分解する
3. 平行成分の誤差にはより大きなペナルティ(重み)を、垂直成分の誤差にはより小さなペナルティを与えるように、コードブックの学習時の損失関数を非対称に設計する(これが「異方性」の由来)
4. この重み付けにより、同じビット数(同じ圧縮率)で量子化しても、内積計算の精度、すなわち検索順位の精度が向上する
5. 実際の検索では、この異方性量子化で圧縮したコードブックに対して高速な内積近似計算を行い、上位候補を絞り込んだ後、必要に応じて元のベクトルで再スコアリング(リランキング)して最終順位を確定する

## 特性・トレードオフ

- **計算量**: 量子化されたコードに対する近似内積計算はSIMD命令で高度に最適化されており、候補の絞り込みは事実上O(√n)〜O(n)程度に抑えられる(具体的な計算量はクラスタリングやパーティション数に依存)。最終的なリランキング段階は候補数に比例した計算コストがかかる
- **通常のPQとの違い**: 通常のProduct Quantizationは再構成誤差(元ベクトルとの距離)を最小化するのに対し、ScaNNは「検索結果の順位を狂わせる誤差」を優先的に抑える設計になっており、同じメモリ予算でより高い再現率を達成できることが実験で示されている
- **内積検索への特化**: 異方性損失の設計は、コサイン類似度や内積による最近傍探索(MIPS: Maximum Inner Product Search)を主なターゲットとしており、推薦システムの埋め込みベクトル検索と特に相性が良い
- **使いどころ**: Google製品における大規模埋め込みベクトル検索、推薦システムのMIPS(最大内積探索)、TensorFlowエコシステムと連携した検索基盤、メモリ制約の厳しい環境での高精度な近似ベクトル検索

## 実装例

```python
import math


def anisotropic_loss(
    original: list[float], quantized: list[float], query_direction: list[float], eta: float = 4.0
) -> float:
    """異方性量子化損失: クエリ方向の誤差(parallel)をより重く罰する。"""
    error = [original[i] - quantized[i] for i in range(len(original))]

    # クエリ方向への射影(parallel成分)とそれに直交する成分(perpendicular成分)に分解
    dot = sum(error[i] * query_direction[i] for i in range(len(error)))
    norm_sq = sum(d * d for d in query_direction) or 1e-10
    parallel = [dot / norm_sq * query_direction[i] for i in range(len(error))]
    perpendicular = [error[i] - parallel[i] for i in range(len(error))]

    parallel_loss = sum(p * p for p in parallel)
    perpendicular_loss = sum(p * p for p in perpendicular)
    # eta(> 1)でparallel方向の誤差をより重く罰し、内積の順位精度を優先する
    return eta * parallel_loss + perpendicular_loss


def quantize_to_nearest_codeword(vector: list[float], codebook: list[list[float]]) -> int:
    def dist2(a: list[float], b: list[float]) -> float:
        return sum((a[i] - b[i]) ** 2 for i in range(len(a)))

    return min(range(len(codebook)), key=lambda i: dist2(vector, codebook[i]))
```

```typescript
function anisotropicLoss(
  original: number[],
  quantized: number[],
  queryDirection: number[],
  eta = 4.0,
): number {
  // 異方性量子化損失: クエリ方向の誤差(parallel)をより重く罰する
  const error = original.map((v, i) => v - quantized[i]);

  const dot = error.reduce((sum, e, i) => sum + e * queryDirection[i], 0);
  const normSq = queryDirection.reduce((sum, q) => sum + q * q, 0) || 1e-10;
  const parallel = queryDirection.map((q) => (dot / normSq) * q);
  const perpendicular = error.map((e, i) => e - parallel[i]);

  const parallelLoss = parallel.reduce((sum, p) => sum + p * p, 0);
  const perpendicularLoss = perpendicular.reduce((sum, p) => sum + p * p, 0);
  // eta(> 1)でparallel方向の誤差をより重く罰し、内積の順位精度を優先する
  return eta * parallelLoss + perpendicularLoss;
}

function quantizeToNearestCodeword(vector: number[], codebook: number[][]): number {
  const dist2 = (a: number[], b: number[]): number =>
    a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < codebook.length; i++) {
    const d = dist2(vector, codebook[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}
```
