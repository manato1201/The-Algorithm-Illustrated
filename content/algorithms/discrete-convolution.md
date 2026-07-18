---
name: 離散畳み込み
category: 数値計算
subcategory: 信号処理
complexity: O(n × m)(素朴な実装、n・mは信号長)、O(n log n)(FFT利用時)
summary: 一方の信号を反転させながらもう一方にスライドさせ、重なり部分の積和を取ることで平滑化・フィルタリング・畳み込みニューラルネットの基礎となる演算。
---

## 概要

離散畳み込みは、2つの離散信号(数列)`f`と`g`から、一方を反転させてもう一方の上をスライドさせながら、重なった部分の積の総和を計算していく演算である。直感的には「フィルタ(核、カーネルと呼ばれる短い数列)を信号に沿って滑らせながら、各位置で局所的な加重平均を取る」操作に相当し、画像のぼかし・エッジ検出、音声のノイズ除去、時系列データの移動平均といった信号処理の根幹をなす。近年では畳み込みニューラルネットワーク(CNN)の中核演算としても広く知られるようになった。

## 仕組み

1. 信号`f`(長さ`n`)とカーネル`g`(長さ`m`)を用意する
2. 畳み込みの結果の各要素は、次の式で定義される: `(f * g)[k] = Σᵢ f[i] × g[k - i]`(和は`k - i`が`g`の有効な範囲に収まる`i`について取る)
3. これは「`g`を反転させて`f`の上に置き、位置`k`まで右にずらしながら、重なっている要素同士を掛けて全部足す」ことと同じ意味を持つ
4. `k`を出力の全ての位置についてこれを繰り返すことで、畳み込み結果の数列全体が得られる

例えば`g = [1/3, 1/3, 1/3]`(長さ3の一様カーネル)を使うと、各出力は「その位置を中心とする3点の平均」になり、単純な移動平均(平滑化フィルタ)として機能する。カーネルの値の組み合わせを変えるだけで、平滑化・微分近似(エッジ検出)・鋭敏化など全く異なるフィルタ効果が得られる。

## 特性・トレードオフ

- **計算量**: 定義通りの素朴な実装では、長さ`n`の信号と長さ`m`のカーネルの畳み込みは`O(n × m)`。カーネルが信号と同程度に長い場合(`m ≈ n`)、周波数領域での積に変換できる[高速フーリエ変換(FFT)](/algorithms/fft)を使うことで`O(n log n)`まで高速化できる(畳み込み定理: 時間領域の畳み込みは周波数領域の単純な積に対応する)
- **カーネルの設計が本質**: 同じ畳み込み演算でも、カーネルの値をどう設計するかで平滑化・エッジ検出・鋭敏化など全く異なる効果が得られる。画像処理のガウシアンブラー、ソーベルフィルタ(エッジ検出)はいずれもこの仕組みの応用
- **境界の扱いが必要**: 信号の端では、カーネルが信号の外側にはみ出す部分をどう扱うか(ゼロ埋め、端の値を繰り返す、畳み込みをせず出力を短くする等)の方針を決める必要があり、実装によって結果が微妙に変わる
- **使いどころ**: 画像処理のフィルタリング(ぼかし・エッジ検出・シャープ化)、音声・時系列データのノイズ除去や移動平均、畳み込みニューラルネットワーク(CNN)の畳み込み層(学習可能なカーネルを使って特徴を自動抽出する)

## 実装例

```python
def discrete_convolution(f: list[float], g: list[float]) -> list[float]:
    n, m = len(f), len(g)
    result = [0.0] * (n + m - 1)
    for k in range(n + m - 1):
        s = 0.0
        for i in range(n):
            j = k - i
            if 0 <= j < m:
                s += f[i] * g[j]
        result[k] = s
    return result
```

```typescript
function discreteConvolution(f: number[], g: number[]): number[] {
  const n = f.length;
  const m = g.length;
  const result = new Array(n + m - 1).fill(0);
  for (let k = 0; k < n + m - 1; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const j = k - i;
      if (j >= 0 && j < m) s += f[i] * g[j];
    }
    result[k] = s;
  }
  return result;
}
```

```cpp
#include <vector>

std::vector<double> discreteConvolution(const std::vector<double>& f, const std::vector<double>& g) {
    int n = static_cast<int>(f.size());
    int m = static_cast<int>(g.size());
    std::vector<double> result(n + m - 1, 0.0);
    for (int k = 0; k < n + m - 1; k++) {
        double s = 0.0;
        for (int i = 0; i < n; i++) {
            int j = k - i;
            if (j >= 0 && j < m) s += f[i] * g[j];
        }
        result[k] = s;
    }
    return result;
}
```

```rust
fn discrete_convolution(f: &[f64], g: &[f64]) -> Vec<f64> {
    let n = f.len();
    let m = g.len();
    let mut result = vec![0.0; n + m - 1];
    for k in 0..(n + m - 1) {
        let mut s = 0.0;
        for i in 0..n {
            if k >= i {
                let j = k - i;
                if j < m {
                    s += f[i] * g[j];
                }
            }
        }
        result[k] = s;
    }
    result
}
```

```csharp
static double[] DiscreteConvolution(double[] f, double[] g)
{
    int n = f.Length, m = g.Length;
    var result = new double[n + m - 1];
    for (int k = 0; k < n + m - 1; k++)
    {
        double s = 0;
        for (int i = 0; i < n; i++)
        {
            int j = k - i;
            if (j >= 0 && j < m) s += f[i] * g[j];
        }
        result[k] = s;
    }
    return result;
}
```
