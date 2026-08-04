---
name: サポートベクターマシン(SVM)
category: 機械学習
subcategory: 教師あり学習
complexity: O(n²) 〜 O(n³)(学習)
summary: クラス間のマージンを最大化する境界を求める。カーネルトリックで非線形分離にも対応できる。
---

## 概要

2つのクラスのデータを分ける境界線(あるいは超平面)は無数に引けるが、その中でも「**両クラスから最も余裕(マージン)を持って離れている境界**」を選ぶことで、未知のデータに対しても頑健な分類ができるはず——この直感を数理的に定式化した分類手法。1990年代に理論が確立し、深層学習が主流になる以前の機械学習の中心的な手法として広く使われてきた。

## 仕組み

1. 2クラスのデータを分離する境界線(超平面)の候補を考える
2. 各クラスの中で、境界線に最も近いデータ点(これが「サポートベクター」——名前の由来であり、境界を決定づける"支え"になる点)との距離(マージン)を計算する
3. このマージンが**最大になるように**境界線の位置と向きを最適化する(これは凸最適化問題として解くことができ、大域最適解が保証される)
4. 完全には分離できないデータ(重なりがある場合)には、一部の誤分類を許容しつつマージンを最大化する「ソフトマージン」という緩和も用意されている

**カーネルトリック**という強力な拡張技法により、直線では分離できない複雑な形状のデータも扱える。データを高次元空間に(明示的に写像することなく)"暗黙的に"変換したかのような効果を、カーネル関数という数学的な仕組みだけで実現し、元の空間では曲線状になる境界線を、計算上はあくまで線形な問題として効率的に解ける。

## 特性・トレードオフ

- **計算量**: 学習にO(n²)〜O(n³)程度かかり、データ数が非常に多い場合は他の手法(ニューラルネットワークなど)に比べ不利になりやすい
- **理論的な裏付けの強さ**: マージン最大化という基準が、統計的学習理論(汎化誤差の上限に関する理論)によって裏付けられており、「なぜこの手法がうまくいくのか」を数学的に説明しやすい点が、他の多くのヒューリスティックな手法と一線を画す
- **カーネル関数の選択が鍵**: 線形カーネル、多項式カーネル、RBF(ガウシアン)カーネルなど、データの性質に応じて適切なカーネルを選ぶ必要があり、この選択とパラメータ調整が実践上の腕の見せ所になる
- **使いどころ**: テキスト分類、画像分類(深層学習以前の時代の主力手法)、バイオインフォマティクスにおける遺伝子発現データの分類など、特徴量の次元数が多く、データ数がそこまで巨大でないタスクで特に力を発揮する

## 実装例

線形SVMを、ヒンジ損失+L2正則化のサブグラディエント降下法で学習する実装例。線形分離可能な2クラス(第1象限寄りのクラスタと第3象限寄りのクラスタ)のデータで学習し、学習データ全件と未知の検証点(原点をまたぐ複数の点)の両方を正しく分類できることを検証している。

```python
def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def train_svm(
    xs: list[list[float]], ys: list[int], epochs: int = 2000, lr: float = 0.01, c: float = 1.0
) -> tuple[list[float], float]:
    """線形SVMをヒンジ損失+L2正則化のサブグラディエント降下法で学習する"""
    n_features = len(xs[0])
    w = [0.0] * n_features
    b = 0.0
    n = len(xs)
    for _ in range(epochs):
        for i in range(n):
            xi, yi = xs[i], ys[i]
            margin = yi * (dot(w, xi) + b)
            if margin < 1:
                # マージン違反: ヒンジ損失の劣勾配で更新
                for j in range(n_features):
                    w[j] -= lr * (w[j] - c * yi * xi[j])
                b += lr * c * yi
            else:
                # マージン内で正しく分類: 正則化項のみ減衰させる
                for j in range(n_features):
                    w[j] -= lr * w[j]
    return w, b


def predict(w: list[float], b: float, x: list[float]) -> int:
    return 1 if dot(w, x) + b >= 0 else -1
```

```typescript
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function trainSvm(xs: number[][], ys: number[], epochs = 2000, lr = 0.01, c = 1.0): { w: number[]; b: number } {
  const nFeatures = xs[0].length;
  const w = new Array(nFeatures).fill(0);
  let b = 0;
  const n = xs.length;
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < n; i++) {
      const xi = xs[i];
      const yi = ys[i];
      const margin = yi * (dot(w, xi) + b);
      if (margin < 1) {
        for (let j = 0; j < nFeatures; j++) {
          w[j] -= lr * (w[j] - c * yi * xi[j]);
        }
        b += lr * c * yi;
      } else {
        for (let j = 0; j < nFeatures; j++) {
          w[j] -= lr * w[j];
        }
      }
    }
  }
  return { w, b };
}

function predict(w: number[], b: number, x: number[]): number {
  return dot(w, x) + b >= 0 ? 1 : -1;
}
```

```cpp
#include <vector>

double dot(const std::vector<double>& a, const std::vector<double>& b) {
    double sum = 0.0;
    for (size_t i = 0; i < a.size(); i++) sum += a[i] * b[i];
    return sum;
}

std::pair<std::vector<double>, double> trainSvm(
    const std::vector<std::vector<double>>& xs, const std::vector<int>& ys,
    int epochs = 2000, double lr = 0.01, double c = 1.0) {
    size_t nFeatures = xs[0].size();
    std::vector<double> w(nFeatures, 0.0);
    double b = 0.0;
    size_t n = xs.size();
    for (int epoch = 0; epoch < epochs; epoch++) {
        for (size_t i = 0; i < n; i++) {
            const auto& xi = xs[i];
            int yi = ys[i];
            double margin = yi * (dot(w, xi) + b);
            if (margin < 1) {
                for (size_t j = 0; j < nFeatures; j++) w[j] -= lr * (w[j] - c * yi * xi[j]);
                b += lr * c * yi;
            } else {
                for (size_t j = 0; j < nFeatures; j++) w[j] -= lr * w[j];
            }
        }
    }
    return {w, b};
}

int predict(const std::vector<double>& w, double b, const std::vector<double>& x) {
    return dot(w, x) + b >= 0 ? 1 : -1;
}
```

```rust
fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn train_svm(xs: &[Vec<f64>], ys: &[i32], epochs: usize, lr: f64, c: f64) -> (Vec<f64>, f64) {
    let n_features = xs[0].len();
    let mut w = vec![0.0f64; n_features];
    let mut b = 0.0f64;
    let n = xs.len();
    for _ in 0..epochs {
        for i in 0..n {
            let xi = &xs[i];
            let yi = ys[i] as f64;
            let margin = yi * (dot(&w, xi) + b);
            if margin < 1.0 {
                for j in 0..n_features {
                    w[j] -= lr * (w[j] - c * yi * xi[j]);
                }
                b += lr * c * yi;
            } else {
                for j in 0..n_features {
                    w[j] -= lr * w[j];
                }
            }
        }
    }
    (w, b)
}

fn predict(w: &[f64], b: f64, x: &[f64]) -> i32 {
    if dot(w, x) + b >= 0.0 {
        1
    } else {
        -1
    }
}
```

```csharp
static double Dot(double[] a, double[] b)
{
    double sum = 0;
    for (int i = 0; i < a.Length; i++) sum += a[i] * b[i];
    return sum;
}

static (double[] w, double b) TrainSvm(double[][] xs, int[] ys, int epochs = 2000, double lr = 0.01, double c = 1.0)
{
    int nFeatures = xs[0].Length;
    var w = new double[nFeatures];
    double b = 0;
    int n = xs.Length;
    for (int epoch = 0; epoch < epochs; epoch++)
    {
        for (int i = 0; i < n; i++)
        {
            var xi = xs[i];
            int yi = ys[i];
            double margin = yi * (Dot(w, xi) + b);
            if (margin < 1)
            {
                for (int j = 0; j < nFeatures; j++) w[j] -= lr * (w[j] - c * yi * xi[j]);
                b += lr * c * yi;
            }
            else
            {
                for (int j = 0; j < nFeatures; j++) w[j] -= lr * w[j];
            }
        }
    }
    return (w, b);
}

static int Predict(double[] w, double b, double[] x) => Dot(w, x) + b >= 0 ? 1 : -1;
```
