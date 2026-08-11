---
name: 線形予測符号化(LPC)
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n・p)(nはサンプル数、pは予測次数)
summary: 声道を「これまでのp個のサンプルの線形結合」でモデル化し、音声波形を少数の予測係数と残差(励起源)に圧縮・分析する。
---

## 概要

人間の声は、声帯の振動(励起源)が声道という共鳴管を通ることで作られる。線形予測符号化(LPC: Linear Predictive Coding)は、この「声道の共鳴」を**直近p個のサンプルの重み付き線形和で次のサンプルを予測できる**という仮定でモデル化する。実際の音声とこの予測値との差(残差)を求めると、残差はほぼ声帯の励起パルス(または無声音のノイズ)だけが残った信号になる——声道の形の情報が少数の予測係数に集約されるため、電話網の音声圧縮(初期の携帯電話コーデック)や音声合成、フォルマント分析の基礎技術として長く使われてきた。

## 仕組み

1. 音声信号を短いフレーム(例: 20〜30ms)に区切り、フレームごとにp次のLPC係数`a_1, ..., a_p`を求める
2. モデルは `x[n] ≈ a_1・x[n-1] + a_2・x[n-2] + ... + a_p・x[n-p]` という自己回帰(AR)モデル
3. 係数は「予測誤差(残差)の二乗和を最小化する」という最小二乗問題として求まる。これは自己相関関数`R[0..p]`を計算し、それを**Levinson-Durbin法**でO(p²)で解くことで効率的に得られる(愚直な連立方程式の解法はO(p³))
4. 得られた係数からフレームごとの残差信号`e[n] = x[n] - Σ a_k・x[n-k]`を計算する。声道の共鳴特性はほぼ`a_1..a_p`に、励起源の情報はほぼ`e[n]`に分離される
5. 復元(合成)時は、残差(または簡易化した励起パルス列)を同じ差分方程式に逆に通すことで元の波形に近い信号を再構成できる

## 特性・トレードオフ

- **少数のパラメータへの圧縮**: 数十サンプル分の波形の情報を、たった数個〜十数個のLPC係数に要約できる。1フレームあたりp=10程度でも十分な音質が得られることが多く、帯域の狭い伝送路(初期の携帯電話網)に向いた符号化として普及した
- **フォルマント(共鳴周波数)の抽出**: LPC係数から声道の周波数応答(スペクトル包絡)を復元でき、母音を特徴づけるフォルマント周波数の推定に使える。音声認識・話者識別の特徴量としても使われた(現在はメル周波数ケプストラム係数(MFCC)などが主流)
- **数値安定性への配慮が必要**: Levinson-Durbin法は自己相関行列がトープリッツ行列であることを利用して高速化する一方、無音区間や病的な入力では反射係数が発散しやすく、実装では絶対値でクリップするなどの対策が要る
- **使いどころ**: 音声コーデック(LPC-10、Code-Excited Linear Prediction系コーデックの基礎)、音声合成(声道モデルに励起源を通すボコーダ)、フォルマント分析、楽器音のフォルマント風エフェクト

## 実装例

```python
import numpy as np

def autocorrelation(x: np.ndarray, max_lag: int) -> np.ndarray:
    n = len(x)
    return np.array([np.dot(x[:n - lag], x[lag:]) for lag in range(max_lag + 1)])

def levinson_durbin(r: np.ndarray, order: int) -> np.ndarray:
    a = np.zeros(order + 1)
    a[0] = 1.0
    error = r[0]
    for i in range(1, order + 1):
        acc = r[i] + np.dot(a[1:i], r[i - 1:0:-1])
        k = -acc / error
        a_new = a.copy()
        a_new[1:i] = a[1:i] + k * a[i - 1:0:-1]
        a_new[i] = k
        a = a_new
        error *= (1 - k * k)
    return -a[1:]  # a_1..a_p (x[n] = sum a_k * x[n-k] の係数)

def lpc_residual(x: np.ndarray, order: int) -> tuple[np.ndarray, np.ndarray]:
    r = autocorrelation(x, order)
    coeffs = levinson_durbin(r, order)
    predicted = np.zeros_like(x)
    for n in range(order, len(x)):
        predicted[n] = np.dot(coeffs, x[n - order:n][::-1])
    residual = x - predicted
    return coeffs, residual
```

```typescript
function autocorrelation(x: Float64Array, maxLag: number): Float64Array {
  const n = x.length;
  const r = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += x[i] * x[i + lag];
    r[lag] = sum;
  }
  return r;
}

function levinsonDurbin(r: Float64Array, order: number): Float64Array {
  const a = new Float64Array(order + 1);
  a[0] = 1.0;
  let error = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / error;
    const aNew = a.slice();
    for (let j = 1; j < i; j++) aNew[j] = a[j] + k * a[i - j];
    aNew[i] = k;
    a.set(aNew);
    error *= 1 - k * k;
  }
  return a.slice(1, order + 1).map((v) => -v);
}

function lpcResidual(
  x: Float64Array,
  order: number,
): { coeffs: Float64Array; residual: Float64Array } {
  const r = autocorrelation(x, order);
  const coeffs = levinsonDurbin(r, order);
  const residual = x.slice();
  for (let n = order; n < x.length; n++) {
    let predicted = 0;
    for (let k = 0; k < order; k++) predicted += coeffs[k] * x[n - 1 - k];
    residual[n] = x[n] - predicted;
  }
  return { coeffs, residual };
}
```

```cpp
#include <vector>

std::vector<double> autocorrelation(const std::vector<double>& x, int maxLag) {
    int n = static_cast<int>(x.size());
    std::vector<double> r(maxLag + 1, 0.0);
    for (int lag = 0; lag <= maxLag; lag++) {
        double sum = 0.0;
        for (int i = 0; i < n - lag; i++) sum += x[i] * x[i + lag];
        r[lag] = sum;
    }
    return r;
}

std::vector<double> levinsonDurbin(const std::vector<double>& r, int order) {
    std::vector<double> a(order + 1, 0.0);
    a[0] = 1.0;
    double error = r[0];
    for (int i = 1; i <= order; i++) {
        double acc = r[i];
        for (int j = 1; j < i; j++) acc += a[j] * r[i - j];
        double k = -acc / error;
        std::vector<double> aNew = a;
        for (int j = 1; j < i; j++) aNew[j] = a[j] + k * a[i - j];
        aNew[i] = k;
        a = aNew;
        error *= (1 - k * k);
    }
    std::vector<double> coeffs(order);
    for (int i = 0; i < order; i++) coeffs[i] = -a[i + 1];
    return coeffs;
}

std::vector<double> lpcResidual(const std::vector<double>& x, int order, std::vector<double>& coeffsOut) {
    auto r = autocorrelation(x, order);
    coeffsOut = levinsonDurbin(r, order);
    std::vector<double> residual = x;
    for (size_t n = order; n < x.size(); n++) {
        double predicted = 0.0;
        for (int k = 0; k < order; k++) predicted += coeffsOut[k] * x[n - 1 - k];
        residual[n] = x[n] - predicted;
    }
    return residual;
}
```

```rust
fn autocorrelation(x: &[f64], max_lag: usize) -> Vec<f64> {
    let n = x.len();
    (0..=max_lag)
        .map(|lag| (0..n - lag).map(|i| x[i] * x[i + lag]).sum())
        .collect()
}

fn levinson_durbin(r: &[f64], order: usize) -> Vec<f64> {
    let mut a = vec![0.0; order + 1];
    a[0] = 1.0;
    let mut error = r[0];
    for i in 1..=order {
        let mut acc = r[i];
        for j in 1..i {
            acc += a[j] * r[i - j];
        }
        let k = -acc / error;
        let mut a_new = a.clone();
        for j in 1..i {
            a_new[j] = a[j] + k * a[i - j];
        }
        a_new[i] = k;
        a = a_new;
        error *= 1.0 - k * k;
    }
    a[1..=order].iter().map(|v| -v).collect()
}

fn lpc_residual(x: &[f64], order: usize) -> (Vec<f64>, Vec<f64>) {
    let r = autocorrelation(x, order);
    let coeffs = levinson_durbin(&r, order);
    let mut residual = x.to_vec();
    for n in order..x.len() {
        let predicted: f64 = (0..order).map(|k| coeffs[k] * x[n - 1 - k]).sum();
        residual[n] = x[n] - predicted;
    }
    (coeffs, residual)
}
```

```csharp
static double[] Autocorrelation(double[] x, int maxLag)
{
    int n = x.Length;
    var r = new double[maxLag + 1];
    for (int lag = 0; lag <= maxLag; lag++)
    {
        double sum = 0;
        for (int i = 0; i < n - lag; i++) sum += x[i] * x[i + lag];
        r[lag] = sum;
    }
    return r;
}

static double[] LevinsonDurbin(double[] r, int order)
{
    var a = new double[order + 1];
    a[0] = 1.0;
    double error = r[0];
    for (int i = 1; i <= order; i++)
    {
        double acc = r[i];
        for (int j = 1; j < i; j++) acc += a[j] * r[i - j];
        double k = -acc / error;
        var aNew = (double[])a.Clone();
        for (int j = 1; j < i; j++) aNew[j] = a[j] + k * a[i - j];
        aNew[i] = k;
        a = aNew;
        error *= 1 - k * k;
    }
    var coeffs = new double[order];
    for (int i = 0; i < order; i++) coeffs[i] = -a[i + 1];
    return coeffs;
}

static double[] LpcResidual(double[] x, int order, out double[] coeffs)
{
    var r = Autocorrelation(x, order);
    coeffs = LevinsonDurbin(r, order);
    var residual = (double[])x.Clone();
    for (int n = order; n < x.Length; n++)
    {
        double predicted = 0;
        for (int k = 0; k < order; k++) predicted += coeffs[k] * x[n - 1 - k];
        residual[n] = x[n] - predicted;
    }
    return residual;
}
```
