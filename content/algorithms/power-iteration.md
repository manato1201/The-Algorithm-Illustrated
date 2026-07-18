---
name: べき乗法
category: 数値計算
subcategory: 線形代数計算
complexity: O(反復回数 × n²)(n×n行列、密行列の場合)
summary: 適当なベクトルに行列を繰り返し掛け続けるだけで、最大固有値に対応する固有ベクトルの方向に収束する反復解法。
---

## 概要

行列`A`の固有値・固有ベクトルを求める問題は、振動解析(共振周波数)からGoogleの[PageRank](/algorithms/pagerank)まで幅広い場面で登場するが、大きな行列の固有値を解析的に(特性方程式を解いて)求めるのは現実的でないことが多い。べき乗法は、驚くほど単純な観察に基づく反復解法である——適当なベクトル`v`に行列`A`を繰り返し掛け続けると(`v, Av, A²v, A³v, ...`)、`v`は次第に「最大固有値に対応する固有ベクトル」の方向へ引き寄せられていく。実は[PageRank](/algorithms/pagerank)のアルゴリズム自体が、Webページのリンク構造を表す行列に対するべき乗法の応用に他ならない。

## 仕組み

1. 適当な初期ベクトル`v₀`(ゼロベクトルでなければ何でもよい)を用意する
2. 行列を掛ける: `v' = A × vₙ`
3. `v'`を正規化する(長さ1になるようスケーリングする。掛け算を繰り返すとベクトルの大きさが際限なく増大・縮小してしまうのを防ぐため): `vₙ₊₁ = v' / ‖v'‖`
4. `vₙ₊₁`と`vₙ`がほぼ同じ方向を向く(収束した)まで2〜3を繰り返す
5. 収束したベクトル`v`が最大固有値に対応する固有ベクトルの近似、そのときの`‖Av‖ / ‖v‖`(レイリー商)が最大固有値の近似になる

なぜこれで最大固有値の固有ベクトルに収束するかというと、初期ベクトルを固有ベクトルの線形結合として表したとき、行列を掛けるたびに各成分は対応する固有値の倍で伸縮するため、最大固有値の成分が反復のたびに相対的にどんどん支配的になっていくためである。

## 特性・トレードオフ

- **計算量**: 密行列に対して1回の行列-ベクトル積が`O(n²)`。収束するまでの反復回数は、最大固有値と2番目に大きい固有値の比(スペクトルギャップ)が大きいほど少なくて済む。疎行列(0が多い行列、Webリンク行列など)なら1回の積はさらに高速化できる
- **最大固有値しか求まらない**: 素のべき乗法では最大固有値(絶対値が最大の固有値)の固有ベクトルしか得られない。他の固有値・固有ベクトルまで求めたい場合は、逆べき乗法・QR法などの発展的な手法が必要
- **収束速度がスペクトルギャップに依存**: 最大固有値と2番目の固有値が近い(ギャップが小さい)場合、収束が非常に遅くなる。[PageRank](/algorithms/pagerank)ではダンピングファクタ(確率0.85でリンクを辿り、それ以外はランダムジャンプする工夫)がこのギャップを人為的に広げ、収束を速める役割も果たしている
- **使いどころ**: [PageRank](/algorithms/pagerank)・[HITS](/algorithms/hits)のようなグラフの重要度スコアリング、振動解析での主要な固有モードの抽出、[主成分分析(PCA)](/algorithms/pca)における第一主成分の計算(共分散行列の最大固有ベクトルを求める場面)

## 実装例

```python
import math


def power_iteration(a: list[list[float]], iterations: int = 200) -> tuple[float, list[float]]:
    n = len(a)
    v = [1.0] * n
    for _ in range(iterations):
        v_new = [sum(a[i][j] * v[j] for j in range(n)) for i in range(n)]
        norm = math.sqrt(sum(x * x for x in v_new))
        v = [x / norm for x in v_new]
    av = [sum(a[i][j] * v[j] for j in range(n)) for i in range(n)]
    eigenvalue = sum(x * y for x, y in zip(av, v))  # レイリー商(vは正規化済みなので内積のみでよい)
    return eigenvalue, v
```

```typescript
function powerIteration(a: number[][], iterations = 200): { eigenvalue: number; vector: number[] } {
  const n = a.length;
  let v = new Array(n).fill(1);
  for (let it = 0; it < iterations; it++) {
    const vNew = a.map((row) => row.reduce((s, aij, j) => s + aij * v[j], 0));
    const norm = Math.sqrt(vNew.reduce((s, x) => s + x * x, 0));
    v = vNew.map((x) => x / norm);
  }
  const av = a.map((row) => row.reduce((s, aij, j) => s + aij * v[j], 0));
  const eigenvalue = av.reduce((s, x, i) => s + x * v[i], 0);
  return { eigenvalue, vector: v };
}
```

```cpp
#include <vector>
#include <cmath>

std::pair<double, std::vector<double>> powerIteration(const std::vector<std::vector<double>>& a, int iterations = 200) {
    int n = static_cast<int>(a.size());
    std::vector<double> v(n, 1.0);
    for (int it = 0; it < iterations; it++) {
        std::vector<double> vNew(n, 0.0);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) vNew[i] += a[i][j] * v[j];
        }
        double norm = 0.0;
        for (double x : vNew) norm += x * x;
        norm = std::sqrt(norm);
        for (int i = 0; i < n; i++) v[i] = vNew[i] / norm;
    }
    std::vector<double> av(n, 0.0);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) av[i] += a[i][j] * v[j];
    }
    double eigenvalue = 0.0;
    for (int i = 0; i < n; i++) eigenvalue += av[i] * v[i];
    return {eigenvalue, v};
}
```

```rust
fn power_iteration(a: &[Vec<f64>], iterations: usize) -> (f64, Vec<f64>) {
    let n = a.len();
    let mut v = vec![1.0; n];
    for _ in 0..iterations {
        let v_new: Vec<f64> = (0..n).map(|i| (0..n).map(|j| a[i][j] * v[j]).sum()).collect();
        let norm = v_new.iter().map(|x| x * x).sum::<f64>().sqrt();
        v = v_new.iter().map(|x| x / norm).collect();
    }
    let av: Vec<f64> = (0..n).map(|i| (0..n).map(|j| a[i][j] * v[j]).sum()).collect();
    let eigenvalue: f64 = av.iter().zip(v.iter()).map(|(x, y)| x * y).sum();
    (eigenvalue, v)
}
```

```csharp
static (double Eigenvalue, double[] Vector) PowerIteration(double[][] a, int iterations = 200)
{
    int n = a.Length;
    var v = Enumerable.Repeat(1.0, n).ToArray();
    for (int it = 0; it < iterations; it++)
    {
        var vNew = a.Select(row => row.Select((aij, j) => aij * v[j]).Sum()).ToArray();
        double norm = Math.Sqrt(vNew.Sum(x => x * x));
        v = vNew.Select(x => x / norm).ToArray();
    }
    var av = a.Select(row => row.Select((aij, j) => aij * v[j]).Sum()).ToArray();
    double eigenvalue = av.Select((x, i) => x * v[i]).Sum();
    return (eigenvalue, v);
}
```
