---
name: コンタクトマップからの構造復元(距離幾何学的アプローチ)
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(n³)(距離幾何学的埋め込み、nは残基数)
summary: 「どの残基のペアが立体構造上で近接しているか」という2値のコンタクトマップだけから、多次元尺度構成法のような距離幾何学の手法で、矛盾を最小化する3次元座標を逆算してタンパク質の大まかな立体構造を復元する。
---

## 概要

[タンパク質スレッディング法](/algorithms/protein-threading)は既知の鋳型構造を借りて対象配列の構造を推定するが、適切な鋳型が見つからない場合、別のアプローチとして**「どの残基のペアが空間的に近接しているか」という接触情報(コンタクトマップ)から、立体構造そのものを逆算する**という方法がある。コンタクトマップは、`n×n`の行列で、残基`i`と`j`が立体構造上で一定距離以内にあれば1、そうでなければ0を取る、という比較的単純な2値情報だが、この接触パターンさえ精度よく分かれば、多次元尺度構成法(MDS)のような距離幾何学の手法を使って、**その接触パターンをできるだけ矛盾なく満たす3次元座標**を求めることで、タンパク質の大まかな立体的な折り畳み方を復元できる。深層学習によるコンタクトマップ予測の精度向上と組み合わさり、AlphaFold以前の構造予測手法の重要な柱の一つだった。

## 仕組み

1. **コンタクトマップの取得**: 進化的に関連する配列群(相同配列)の共進化パターンの統計解析(直接結合解析、DCAなど)や、深層学習モデルによって、残基ペアが接触している確率を推定した`n×n`の接触確率行列を得る
2. 接触していると予測されたペア`(i,j)`には「近い距離(例えば8Å以内)」という制約を、接触していないペアには「遠い距離」という制約を割り当て、**目標距離行列**を構成する
3. **多次元尺度構成法(MDS)による埋め込み**: 目標距離行列に最もよく整合する3次元座標を求める。これは、距離行列から座標を復元する古典的な問題で、距離行列を二重中心化してから固有値分解を行う「古典的MDS」、または勾配降下法で座標を直接最適化する「計量MDS」のいずれかで解ける
4. 得られた3次元座標は、コンタクトマップの制約(近接ペアは近く、非近接ペアは遠く)をできるだけ満たすように配置されているが、あくまで距離情報だけから逆算した近似的な構造であるため、局所的な原子レベルの精密さは持たない
5. 得られた大まかな立体配置を初期構造として、さらに分子力学的なエネルギー最小化やリファインメントを行うことで、より精密な立体構造モデルへと磨き上げる

## 特性・トレードオフ

- **鋳型構造を必要としない**: [タンパク質スレッディング法](/algorithms/protein-threading)が既知の立体構造データベースから適切な鋳型を探すのに対し、コンタクトマップからの構造復元は、接触予測さえ得られれば理論上は新規のフォールドにも対応できる。深層学習による接触予測の精度が向上したことで、この手法の実用性は大きく高まった
- **接触予測の精度がボトルネック**: この手法全体の精度は、最初のステップであるコンタクトマップ自体の予測精度に強く依存する。予測された接触パターンに誤りが多いと、それを満たす3次元座標自体が歪んだ、生物物理学的に不自然な構造になってしまう
- **距離幾何学的埋め込みという汎用的な数学的道具**: コンタクトマップからの構造復元で使われるMDSは、タンパク質構造予測に限らず、ネットワークのノード間距離からの空間的な配置推定、センサーネットワークの位置推定など、「相対的な距離・近接情報だけから絶対座標を復元する」という共通の問題構造を持つ幅広い応用に使われる数学的な道具である
- **使いどころ**: 深層学習ベースの構造予測パイプラインの中間ステップ(接触予測→座標復元→リファインメント)、共進化解析に基づくタンパク質構造モデリング、RNA構造の3次元復元、ソーシャルネットワーク分析における「関係の強さ」からの概念的な位置関係の可視化

## 実装例

古典的MDS(距離行列の二重中心化+固有値分解)による、簡略化した2次元版の座標復元を示す。

```python
def double_center(distance_sq: list[list[float]]) -> list[list[float]]:
    n = len(distance_sq)
    row_means = [sum(row) / n for row in distance_sq]
    grand_mean = sum(row_means) / n
    b = [[-0.5 * (distance_sq[i][j] - row_means[i] - row_means[j] + grand_mean) for j in range(n)] for i in range(n)]
    return b

def power_iteration_top_eigenvectors(b: list[list[float]], k: int, iterations: int = 200) -> list[list[float]]:
    """行列bの上位k個の固有ベクトルを、単純なべき乗法(直交化を伴う簡易版)で近似的に求める。"""
    import random
    n = len(b)
    vectors = []
    for _ in range(k):
        v = [random.random() for _ in range(n)]
        for _ in range(iterations):
            new_v = [sum(b[i][j] * v[j] for j in range(n)) for i in range(n)]
            for prev in vectors:
                dot = sum(new_v[i] * prev[i] for i in range(n))
                new_v = [new_v[i] - dot * prev[i] for i in range(n)]
            norm = sum(x * x for x in new_v) ** 0.5 or 1e-9
            v = [x / norm for x in new_v]
        vectors.append(v)
    return vectors

def contact_map_to_coordinates(contact_map: list[list[int]], contact_distance: float = 8.0, non_contact_distance: float = 20.0) -> list[tuple[float, float]]:
    n = len(contact_map)
    distance_sq = [
        [(contact_distance if contact_map[i][j] else non_contact_distance) ** 2 for j in range(n)]
        for i in range(n)
    ]
    for i in range(n):
        distance_sq[i][i] = 0.0

    b = double_center(distance_sq)
    top_vectors = power_iteration_top_eigenvectors(b, k=2)
    return list(zip(top_vectors[0], top_vectors[1]))
```

```typescript
function doubleCenter(distanceSq: number[][]): number[][] {
  const n = distanceSq.length;
  const rowMeans = distanceSq.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const grandMean = rowMeans.reduce((a, b) => a + b, 0) / n;
  return distanceSq.map((row, i) => row.map((d, j) => -0.5 * (d - rowMeans[i] - rowMeans[j] + grandMean)));
}

function contactMapToCoordinates(
  contactMap: number[][], contactDistance = 8.0, nonContactDistance = 20.0,
): [number, number][] {
  const n = contactMap.length;
  const distanceSq = contactMap.map((row, i) =>
    row.map((c, j) => (i === j ? 0 : (c ? contactDistance : nonContactDistance) ** 2)),
  );
  const b = doubleCenter(distanceSq);
  // 簡略化のため、実際の固有値分解は省略し中心化行列のみ返す実装イメージを示す
  return b.map((_, i) => [b[i][0], b[i][1]]);
}
```

```cpp
#include <vector>

std::vector<std::vector<double>> doubleCenter(const std::vector<std::vector<double>>& distanceSq) {
    int n = static_cast<int>(distanceSq.size());
    std::vector<double> rowMeans(n, 0.0);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) rowMeans[i] += distanceSq[i][j];
        rowMeans[i] /= n;
    }
    double grandMean = 0.0;
    for (double m : rowMeans) grandMean += m;
    grandMean /= n;

    std::vector<std::vector<double>> b(n, std::vector<double>(n));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            b[i][j] = -0.5 * (distanceSq[i][j] - rowMeans[i] - rowMeans[j] + grandMean);
    return b;
}
```

```rust
fn double_center(distance_sq: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = distance_sq.len();
    let row_means: Vec<f64> = distance_sq.iter().map(|row| row.iter().sum::<f64>() / n as f64).collect();
    let grand_mean: f64 = row_means.iter().sum::<f64>() / n as f64;

    (0..n)
        .map(|i| {
            (0..n)
                .map(|j| -0.5 * (distance_sq[i][j] - row_means[i] - row_means[j] + grand_mean))
                .collect()
        })
        .collect()
}
```

```csharp
static double[][] DoubleCenter(double[][] distanceSq)
{
    int n = distanceSq.Length;
    var rowMeans = new double[n];
    for (int i = 0; i < n; i++) rowMeans[i] = distanceSq[i].Sum() / n;
    double grandMean = rowMeans.Sum() / n;

    var b = new double[n][];
    for (int i = 0; i < n; i++)
    {
        b[i] = new double[n];
        for (int j = 0; j < n; j++)
            b[i][j] = -0.5 * (distanceSq[i][j] - rowMeans[i] - rowMeans[j] + grandMean);
    }
    return b;
}
```
