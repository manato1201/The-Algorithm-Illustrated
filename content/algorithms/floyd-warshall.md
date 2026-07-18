---
name: フロイド・ワーシャル法
category: グラフ
subcategory: 最短路
complexity: O(V³)
summary: 全点対の最短経路を動的計画法で一括に求める。
---

## 概要

ダイクストラ法やベルマン・フォード法が「1つのスタート地点から全頂点への最短経路」(単一始点最短経路)を求めるのに対し、フロイド・ワーシャル法は**全ての頂点の組み合わせについて最短経路をまとめて求める**(全点対最短経路)。実装がわずか3重ループで済むほどシンプルながら、動的計画法の考え方が凝縮された、グラフアルゴリズムの中でも際立って美しい構造を持つ。

## 仕組み

`dp[i][j]` を「頂点iから頂点jへの最短距離」と定義し、隣接する頂点なら辺の重み、そうでなければ無限大で初期化する。

1. 各頂点kを「経由地」として1つずつ順番に試す(k = 1, 2, ..., 頂点数)
2. 全ての頂点の組(i, j)について、「iからjへ直接行く距離」と「iから**kを経由して**jへ行く距離(`dp[i][k] + dp[k][j]`)」を比較し、経由した方が短ければ更新する
3. 全てのkについてこれを終えると、`dp[i][j]`は全て最終的な最短距離になっている

「経由地を1つずつ増やしながら、その経由地を使うと近道になる組み合わせがないか全頂点対で確認する」というシンプルな発想だけで、全点対の最短経路が同時に求まってしまう。ループの順序(k→i→j)を間違えると正しく動かないという、DPらしい繊細さも持ち合わせている。

## 特性・トレードオフ

- **計算量**: O(V³)。3重ループそのままのシンプルな計算量で、頂点数が増えると急激に重くなる(数百頂点程度が実用的な上限の目安)
- **負の辺に対応(負閉路がなければ)**: ベルマン・フォード法と同様、負の重みの辺があっても正しく動作する(ただし負閉路があると対角成分`dp[i][i]`が負になることで検出できる)
- **実装の単純さ**: 優先度付きキューなど特別なデータ構造が不要で、3重ループだけで書ける。頂点数が少ない(〜数百程度)場合は、実装の手間と実行速度のバランスが良い
- **使いどころ**: 全ての都市間の最短距離をあらかじめ計算しておきたい経路案内システム、ネットワークの全ノード間の遅延を事前計算しておくケースなど、「全点対」の最短経路そのものが必要な場面。1つのスタート地点だけでよいならダイクストラ法の方が高速

## 実装例

```python
def floyd_warshall(dist: list[list[float]]) -> list[list[float]]:
    n = len(dist)
    d = [row[:] for row in dist]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    return d
```

```typescript
function floydWarshall(dist: number[][]): number[][] {
  const n = dist.length;
  const d = dist.map((row) => [...row]);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) {
          d[i][j] = d[i][k] + d[k][j];
        }
      }
    }
  }
  return d;
}
```

```cpp
#include <vector>

std::vector<std::vector<double>> floydWarshall(std::vector<std::vector<double>> dist) {
    int n = static_cast<int>(dist.size());
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    return dist;
}
```

```rust
fn floyd_warshall(dist: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = dist.len();
    let mut d: Vec<Vec<f64>> = dist.to_vec();
    for k in 0..n {
        for i in 0..n {
            for j in 0..n {
                if d[i][k] + d[k][j] < d[i][j] {
                    d[i][j] = d[i][k] + d[k][j];
                }
            }
        }
    }
    d
}
```

```csharp
static double[,] FloydWarshall(double[,] dist)
{
    int n = dist.GetLength(0);
    var d = (double[,])dist.Clone();
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i, k] + d[k, j] < d[i, j]) d[i, j] = d[i, k] + d[k, j];
    return d;
}
```
