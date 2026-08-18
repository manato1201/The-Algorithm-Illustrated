---
name: p-安定分布によるLSH(p-Stable LSH)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(D)(1ベクトルあたりのハッシュ計算、Dはベクトルの次元数)
summary: p-安定分布に従う乱数ベクトルへの射影とハッシュ幅による量子化を組み合わせ、ユークリッド距離(L2)が近いベクトルほど同じハッシュ値になりやすいという性質を持つ局所性鋭敏型ハッシュを構成する手法。
---

## 概要

[ランダム射影LSH](/algorithms/random-projection-lsh)がコサイン類似度(ベクトルの向きの近さ)を近似するために超平面への射影の符号だけを使うのに対し、p-安定LSH(p-Stable LSH、別名E2LSH)は**ユークリッド距離(L2距離)**が近いベクトルを同じハッシュバケットに落としやすくするために設計された、別系統の局所性鋭敏型ハッシュである。2004年にDatarらが提案したこの手法は、「p-安定分布」と呼ばれる確率分布——複数の独立同分布な確率変数の重み付き和が、再び同じ分布に従うという特殊な性質を持つ分布——の理論を利用する。ユークリッド距離(L2)の場合、標準正規分布(ガウス分布)がちょうどこの2-安定性を満たすことが知られており、ガウス分布からサンプリングした乱数ベクトルへの射影を、一定幅の区間ごとに量子化するだけで、L2距離に鋭敏なハッシュ関数が作れる。[MinHash/LSH](/algorithms/minhash-lsh)(集合のJaccard類似度向け)・[ランダム射影LSH](/algorithms/random-projection-lsh)(コサイン類似度向け)と並び、**対象とする距離・類似度の種類によってLSHファミリーを使い分ける**という考え方の代表例になっている。

## 仕組み

1. ベクトルの次元数`D`に対して、各成分が標準正規分布`N(0,1)`からサンプリングされたランダムベクトル`a`(`a`はガウス分布に従うため2-安定)を用意する。ガウス分布は2-安定分布の代表例であり、L2距離(ユークリッド距離、p=2)に対応するLSHにはこの分布が使われる
2. ハッシュ幅(バケット幅)を決めるパラメータ`w`と、量子化の基準点をずらすための一様分布からのオフセット`b ~ Uniform[0, w)`を用意する
3. ベクトル`v`に対して、以下のハッシュ関数でスカラーのハッシュ値を計算する:
   `h(v) = floor((a・v + b) / w)`
   `a・v`はベクトル`v`をランダムな1次元の直線に射影した値であり、その射影値を幅`w`の区間ごとに離散化(量子化)している
4. **理論的な保証**: p-安定分布の性質により、2つのベクトル`u`, `v`の射影値の差`a・(u-v)`の分布は、`u`と`v`のユークリッド距離`||u-v||_2`にスケールされた同じp-安定分布に従う。つまり**ユークリッド距離が近い2点ほど、射影値も近くなりやすく、結果として同じ量子化バケットに落ちる確率が高くなる**
5. 1本のハッシュ関数だけでは精度が粗いため、実務では`k`本のハッシュ関数の出力を連結して1つのハッシュキーとし(バンディング)、さらに複数のハッシュテーブル(`L`個)を用意して和集合を取ることで、[MinHash/LSH](/algorithms/minhash-lsh)と同様の「AND-OR構成」により精度(再現率と適合率のバランス)を調整する

## 特性・トレードオフ

- **距離の種類による使い分け**: [MinHash/LSH](/algorithms/minhash-lsh)は集合のJaccard類似度、[ランダム射影LSH](/algorithms/random-projection-lsh)はベクトルのコサイン類似度(角度)、p-安定LSHはベクトルのユークリッド距離(L2、大きさも考慮した空間的な近さ)と、それぞれ異なる類似度指標に特化している。扱いたいデータの性質(集合か実数ベクトルか、向きが重要か絶対的な距離が重要か)によって適切なLSHファミリーを選ぶ必要がある
- **ハッシュ幅`w`のチューニング**: `w`を大きくすると1つのバケットに入るベクトルが増え再現率が上がるが、無関係なベクトル同士も同じバケットに入りやすくなり適合率が下がる。逆に`w`を小さくすると精度は上がるが取りこぼしが増える、というトレードオフになる
- **バンディングによる精度調整**: [MinHash/LSH](/algorithms/minhash-lsh)と同じ発想で、ハッシュ関数の本数`k`(AND条件、精度重視)とハッシュテーブルの数`L`(OR条件、再現率重視)を調整することで、目的の精度・再現率のバランスに合わせてパラメータを設計できる
- **使いどころ**: 高次元の実数値特徴ベクトル(画像特徴量、センサーデータ)に対するユークリッド距離ベースの近似最近傍探索、大規模な音声・画像の重複検出、[HNSW](/algorithms/hnsw)のようなグラフベースの手法が使えないメモリ制約下での軽量な近似検索、局所性鋭敏型ハッシュ理論全体の中でL2距離を扱う代表的な構成法としての教育的価値

## 実装例

```python
import random
import math
from collections import defaultdict


def generate_hash_functions(dim: int, k: int, w: float, seed: int | None = None) -> list[tuple[list[float], float]]:
    rng = random.Random(seed)
    functions = []
    for _ in range(k):
        a = [rng.gauss(0, 1) for _ in range(dim)]  # ガウス分布(2-安定)からサンプリング
        b = rng.uniform(0, w)
        functions.append((a, b))
    return functions


def hash_vector(vector: list[float], functions: list[tuple[list[float], float]], w: float) -> tuple[int, ...]:
    keys = []
    for a, b in functions:
        projection = sum(vi * ai for vi, ai in zip(vector, a))
        keys.append(math.floor((projection + b) / w))
    return tuple(keys)


class PStableLSHIndex:
    """k本のハッシュ関数(AND)を束ねたテーブルをL個(OR)束ねてL2距離の近似探索を行う。"""

    def __init__(self, dim: int, k: int = 4, l_tables: int = 3, w: float = 4.0, seed: int = 0):
        self.w = w
        self.tables: list[dict[tuple[int, ...], list[int]]] = [defaultdict(list) for _ in range(l_tables)]
        self.hash_fns = [generate_hash_functions(dim, k, w, seed=seed + t) for t in range(l_tables)]

    def insert(self, idx: int, vector: list[float]) -> None:
        for table, fns in zip(self.tables, self.hash_fns):
            key = hash_vector(vector, fns, self.w)
            table[key].append(idx)

    def query_candidates(self, vector: list[float]) -> set[int]:
        candidates: set[int] = set()
        for table, fns in zip(self.tables, self.hash_fns):
            key = hash_vector(vector, fns, self.w)
            candidates.update(table.get(key, []))
        return candidates
```

```typescript
type Vec = number[];

function gaussianRandom(rand: () => number = Math.random): number {
  const u1 = rand();
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generateHashFunctions(
  dim: number,
  k: number,
  w: number,
  rand: () => number = Math.random,
): [Vec, number][] {
  const functions: [Vec, number][] = [];
  for (let i = 0; i < k; i++) {
    const a = Array.from({ length: dim }, () => gaussianRandom(rand)); // ガウス分布(2-安定)からサンプリング
    const b = rand() * w;
    functions.push([a, b]);
  }
  return functions;
}

function hashVector(vector: Vec, functions: [Vec, number][], w: number): string {
  const keys = functions.map(([a, b]) => {
    const projection = vector.reduce((s, vi, i) => s + vi * a[i], 0);
    return Math.floor((projection + b) / w);
  });
  return keys.join(",");
}

class PStableLshIndex {
  private w: number;
  private tables: Map<string, number[]>[];
  private hashFns: [Vec, number][][];

  constructor(dim: number, k = 4, lTables = 3, w = 4.0, rand: () => number = Math.random) {
    this.w = w;
    this.tables = Array.from({ length: lTables }, () => new Map());
    this.hashFns = Array.from({ length: lTables }, () => generateHashFunctions(dim, k, w, rand));
  }

  insert(idx: number, vector: Vec): void {
    this.tables.forEach((table, t) => {
      const key = hashVector(vector, this.hashFns[t], this.w);
      const bucket = table.get(key) ?? [];
      bucket.push(idx);
      table.set(key, bucket);
    });
  }

  queryCandidates(vector: Vec): Set<number> {
    const candidates = new Set<number>();
    this.tables.forEach((table, t) => {
      const key = hashVector(vector, this.hashFns[t], this.w);
      for (const idx of table.get(key) ?? []) candidates.add(idx);
    });
    return candidates;
  }
}
```
