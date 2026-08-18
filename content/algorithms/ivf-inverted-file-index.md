---
name: 転置ファイルインデックス(IVF)による近似最近傍探索
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(n・k)(構築、nはベクトル数・kはクラスタ数)、O(nprobe・n/k)(1回の検索、平均)
summary: ベクトル空間をk-meansでクラスタに分割し、クエリに近いクラスタだけを絞り込んで探索することで、全ベクトルとの総当たり比較を避けて近似最近傍探索を高速化する手法。
---

## 概要

数百万〜数十億件のベクトルから最も近いものを見つけたいとき、全件との距離を計算する総当たり探索はO(n)かかり、データ量が増えるほど非現実的になる。IVF(Inverted File Index、転置ファイルインデックス)は、この問題に対して「粗い絞り込みをしてから詳しく調べる」という素朴だが効果的な発想で応える——あらかじめベクトル空間をk-meansなどでいくつかのクラスタに分割しておき、各クラスタに属するベクトルのIDリストを、テキスト検索の転置インデックス(単語→それを含む文書のリスト)になぞらえて保持する。検索時には、クエリベクトルに近いクラスタの中心点だけをいくつか特定し、**その少数のクラスタに属するベクトルだけ**を詳しく調べることで、全件比較を避けて検索を高速化する。実装がシンプルで理解しやすく、[HNSW](/algorithms/hnsw)や[直積量子化](/algorithms/product-quantization)と組み合わせて実用のベクトル検索エンジン(FAISSなど)の基本構成要素として広く使われている。

## 仕組み

1. **クラスタリング(学習フェーズ)**: データセットの一部(または全体)を使ってk-meansクラスタリングを行い、`k`個のクラスタ中心(セントロイド)を求める。この`k`個のセントロイドが「粗量子化器(コースクォンタイザ)」になる
2. **転置リストの構築**: 各ベクトルについて、最も近いセントロイドを求め、そのセントロイドに対応する転置リスト(バケット)にベクトルのIDと(必要なら)ベクトル本体を追加する。結果として、`k`個のバケットそれぞれに、そのクラスタに属するベクトル群が格納された状態になる
3. **検索(クエリ処理)**: クエリベクトルが与えられたら、まず`k`個のセントロイド全てとの距離を計算し、最も近い`nprobe`個(1個だけでなく複数選ぶのがポイント——クラスタの境界付近にある本当の最近傍を取りこぼさないため)のクラスタを選ぶ
4. 選ばれた`nprobe`個のクラスタに属するベクトルだけを対象に、クエリとの距離を計算し、上位k件を最近傍候補として返す。探索対象がデータ全体の一部(`nprobe/k`程度の割合)に絞られるため、総当たり探索よりずっと高速になる
5. **他手法との組み合わせ**: 各クラスタ内の探索自体をさらに高速化するため、バケット内のベクトルを[直積量子化](/algorithms/product-quantization)で圧縮した上で近似距離計算する構成(IVF-PQ)や、粗量子化器そのものを[HNSW](/algorithms/hnsw)のグラフ探索で高速に選ぶ構成が、FAISSなど実用のベクトル検索エンジンで標準的に使われている

## 特性・トレードオフ

- **計算量とnprobeのトレードオフ**: 検索時に調べるクラスタ数`nprobe`を増やすほど再現率(本当の最近傍を取りこぼさない確率)は上がるが、探索対象のベクトル数も増え検索が遅くなる。`nprobe=k`(全クラスタを調べる)にすると総当たり探索と同じ精度になるが速度上の利点は失われるため、精度と速度のバランスを取るパラメータとして重要
- **クラスタの偏りに弱い**: データの分布が偏っている(一部のクラスタに極端に多くのベクトルが集中する)と、そのクラスタが選ばれたときの探索コストが跳ね上がる。クラスタ数`k`の選び方や、定期的な再クラスタリングが実務上の運用課題になる
- **[HNSW](/algorithms/hnsw)との対比**: [HNSW](/algorithms/hnsw)はグラフ構造を辿って探索するため単体でも高精度・高速だがメモリ消費が大きい。IVFはクラスタという単純な構造のみを保持するため実装・メモリ効率がよく、[直積量子化](/algorithms/product-quantization)との相性が良い(IVF-PQはメモリ効率を最優先する構成として広く採用される)一方、単体では[HNSW](/algorithms/hnsw)ほどの検索精度は出にくい
- **使いどころ**: 大規模ベクトルデータベース(FAISS・Milvus等)におけるインデックス構造の基本形、数十億件規模でメモリ効率を優先したい検索拡張生成(RAG)のベクトルストア、画像・音声の大規模類似検索。データ量が中規模までなら[HNSW](/algorithms/hnsw)単体、超大規模かつメモリ制約が厳しいならIVF-PQという使い分けが典型的

## 実装例

```python
import random


def kmeans(vectors: list[list[float]], k: int, iterations: int = 20) -> list[list[float]]:
    centroids = random.sample(vectors, k)
    dim = len(vectors[0])
    for _ in range(iterations):
        clusters: list[list[list[float]]] = [[] for _ in range(k)]
        for v in vectors:
            nearest = min(range(k), key=lambda c: _sq_dist(v, centroids[c]))
            clusters[nearest].append(v)
        for c in range(k):
            if clusters[c]:
                centroids[c] = [sum(v[d] for v in clusters[c]) / len(clusters[c]) for d in range(dim)]
    return centroids


def _sq_dist(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b))


class IvfIndex:
    def __init__(self, vectors: list[list[float]], n_clusters: int):
        self.vectors = vectors
        self.centroids = kmeans(vectors, n_clusters)
        self.inverted_lists: list[list[int]] = [[] for _ in range(n_clusters)]
        for i, v in enumerate(vectors):
            cluster = self._nearest_centroid(v)
            self.inverted_lists[cluster].append(i)

    def _nearest_centroid(self, v: list[float]) -> int:
        return min(range(len(self.centroids)), key=lambda c: _sq_dist(v, self.centroids[c]))

    def search(self, query: list[float], top_k: int = 5, nprobe: int = 3) -> list[int]:
        # クエリに近いセントロイドを nprobe 個選ぶ
        centroid_order = sorted(range(len(self.centroids)), key=lambda c: _sq_dist(query, self.centroids[c]))
        probe_clusters = centroid_order[:nprobe]

        candidates: list[int] = []
        for c in probe_clusters:
            candidates.extend(self.inverted_lists[c])

        candidates.sort(key=lambda i: _sq_dist(query, self.vectors[i]))
        return candidates[:top_k]
```

```typescript
type Vec = number[];

function sqDist(a: Vec, b: Vec): number {
  return a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);
}

function kmeans(
  vectors: Vec[],
  k: number,
  iterations = 20,
  rand: () => number = Math.random,
): Vec[] {
  const centroids = [...vectors].sort(() => rand() - 0.5).slice(0, k);
  const dim = vectors[0].length;

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: Vec[][] = Array.from({ length: k }, () => []);
    for (const v of vectors) {
      let nearest = 0;
      let best = Infinity;
      for (let c = 0; c < k; c++) {
        const d = sqDist(v, centroids[c]);
        if (d < best) {
          best = d;
          nearest = c;
        }
      }
      clusters[nearest].push(v);
    }
    for (let c = 0; c < k; c++) {
      if (clusters[c].length > 0) {
        centroids[c] = Array.from(
          { length: dim },
          (_, d) =>
            clusters[c].reduce((s, v) => s + v[d], 0) / clusters[c].length,
        );
      }
    }
  }
  return centroids;
}

class IvfIndex {
  centroids: Vec[];
  invertedLists: number[][];

  constructor(
    private vectors: Vec[],
    nClusters: number,
  ) {
    this.centroids = kmeans(vectors, nClusters);
    this.invertedLists = Array.from({ length: nClusters }, () => []);
    vectors.forEach((v, i) => {
      const cluster = this.nearestCentroid(v);
      this.invertedLists[cluster].push(i);
    });
  }

  private nearestCentroid(v: Vec): number {
    let nearest = 0;
    let best = Infinity;
    this.centroids.forEach((c, i) => {
      const d = sqDist(v, c);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    return nearest;
  }

  search(query: Vec, topK = 5, nprobe = 3): number[] {
    const centroidOrder = this.centroids
      .map((c, i): [number, number] => [i, sqDist(query, c)])
      .sort((a, b) => a[1] - b[1])
      .map(([i]) => i);
    const probeClusters = centroidOrder.slice(0, nprobe);

    let candidates: number[] = [];
    for (const c of probeClusters) {
      candidates = candidates.concat(this.invertedLists[c]);
    }

    candidates.sort(
      (a, b) => sqDist(query, this.vectors[a]) - sqDist(query, this.vectors[b]),
    );
    return candidates.slice(0, topK);
  }
}
```
