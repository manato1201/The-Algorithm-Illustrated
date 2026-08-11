---
name: 双二次フィルタ(Biquad Filter)によるパラメトリックEQ
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(1)(1サンプルあたり)
summary: 分子・分母とも2次の伝達関数を持つ最小構成のデジタルフィルタ。係数の選び方だけでローパス/ハイパス/ピーキングEQなど多様な音色調整を1つの計算式で表現できる。
---

## 概要

イコライザー(EQ)で「低音を持ち上げる」「特定の周波数だけ削る」といった音色調整をするには、特定の周波数帯を選択的に増幅・減衰させるデジタルフィルタが必要になる。双二次フィルタ(biquad、"bi-quadratic"の略)は、**分子・分母がともに2次の伝達関数**という最小限の構成でありながら、係数`b0,b1,b2,a1,a2`の選び方だけでローパス・ハイパス・バンドパス・ノッチ・ピーキングEQ・シェルビングEQなど、実務で必要になるフィルタ特性のほとんどをカバーできる。ロバート・ブリストウ=ジョンソンによる係数計算式(通称"Audio EQ Cookbook")が広く参照され、音楽制作ソフト・ゲームオーディオエンジンのパラメトリックEQの基本部品として使われている。

## 仕組み

1. 双二次フィルタは**差分方程式**として次の形で定義される:
   `y[n] = (b0/a0)・x[n] + (b1/a0)・x[n-1] + (b2/a0)・x[n-2] - (a1/a0)・y[n-1] - (a2/a0)・y[n-2]`
   直前2サンプル分の入力`x`と出力`y`を保持しておくだけで、1サンプルごとにO(1)で計算できる
2. 実現したいフィルタ特性(ローパス、ハイパス、ピーキングEQなど)に応じて、係数`b0,b1,b2,a0,a1,a2`を解析的な公式から計算する。公式は共通して、中心周波数`f0`・サンプリング周波数`fs`から求まる角周波数`ω0 = 2π・f0/fs`と、フィルタの鋭さを表す`Q`値(または帯域幅)を入力に取る
3. 例えばピーキングEQ(特定の周波数帯だけをdBゲイン分持ち上げ/下げる)の場合、ゲイン`A = 10^(dBgain/40)`を使って`b0 = 1 + α・A`, `b1 = -2cos(ω0)`, `b2 = 1 - α・A`, `a0 = 1 + α/A`, `a1 = -2cos(ω0)`, `a2 = 1 - α/A`(`α = sin(ω0)/(2Q)`)という公式で係数が決まる
4. 得られた係数を差分方程式に当てはめ、入力信号をサンプルごとに処理する。フィルタの状態(直近の入出力サンプル)は次のサンプル処理に持ち越される

## 特性・トレードオフ

- **1種類の計算式で多様な特性を表現できる**: ローパス・ハイパス・バンドパス・ノッチ・オールパス・ピーキングEQ・ローシェルフ・ハイシェルフといった代表的なフィルタが、すべて「差分方程式は共通、係数の求め方だけが違う」という統一的な枠組みに収まる。実装が1つの汎用関数で済むため、パラメトリックEQのようにフィルタ種別を切り替えるUIとの相性が良い
- **段階的なカスケード接続**: 単体の双二次フィルタは2次(1オクターブあたり12dB/オクターブ程度の急峻さ)までしか表現できないが、複数のフィルタを直列に接続する(カスケード)ことで、より急峻な特性や複雑な周波数特性(グラフィックEQの複数バンドなど)を組み立てられる
- **数値安定性への配慮**: 係数の計算やサンプル精度によっては、極(pole)が単位円の外に出て発振する(不安定になる)ことがあるため、実装では係数の正規化(`a0`で割る)や倍精度演算の使用など、数値的な安定性に注意を払う必要がある
- **使いどころ**: 音楽制作ソフトのパラメトリックEQ・グラフィックEQ、ゲームオーディオのリアルタイムエフェクト(こもった音・くぐもった音の表現)、ラウドスピーカーのクロスオーバーフィルタ、[シュレーダーリバーブ](/algorithms/schroeder-reverb)などの複合エフェクトの構成要素

## 実装例

ピーキングEQ(指定した中心周波数の帯域をdBゲイン分ブースト/カットする)の係数計算とフィルタ処理を示す。

```python
import math

def peaking_eq_coeffs(sample_rate: float, f0: float, q: float, gain_db: float) -> dict:
    a = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * f0 / sample_rate
    alpha = math.sin(w0) / (2 * q)
    cos_w0 = math.cos(w0)

    b0 = 1 + alpha * a
    b1 = -2 * cos_w0
    b2 = 1 - alpha * a
    a0 = 1 + alpha / a
    a1 = -2 * cos_w0
    a2 = 1 - alpha / a

    return {"b0": b0 / a0, "b1": b1 / a0, "b2": b2 / a0, "a1": a1 / a0, "a2": a2 / a0}

def biquad_process(x: list[float], coeffs: dict) -> list[float]:
    b0, b1, b2, a1, a2 = coeffs["b0"], coeffs["b1"], coeffs["b2"], coeffs["a1"], coeffs["a2"]
    x1 = x2 = y1 = y2 = 0.0
    y = []
    for xn in x:
        yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y.append(yn)
        x2, x1 = x1, xn
        y2, y1 = y1, yn
    return y
```

```typescript
type BiquadCoeffs = { b0: number; b1: number; b2: number; a1: number; a2: number };

function peakingEqCoeffs(sampleRate: number, f0: number, q: number, gainDb: number): BiquadCoeffs {
  const a = 10 ** (gainDb / 40);
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);

  const b0 = 1 + alpha * a;
  const b1 = -2 * cosW0;
  const b2 = 1 - alpha * a;
  const a0 = 1 + alpha / a;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha / a;

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function biquadProcess(x: number[], coeffs: BiquadCoeffs): number[] {
  const { b0, b1, b2, a1, a2 } = coeffs;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const y: number[] = [];
  for (const xn of x) {
    const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    y.push(yn);
    x2 = x1; x1 = xn;
    y2 = y1; y1 = yn;
  }
  return y;
}
```

```cpp
#include <vector>
#include <cmath>

struct BiquadCoeffs { double b0, b1, b2, a1, a2; };

BiquadCoeffs peakingEqCoeffs(double sampleRate, double f0, double q, double gainDb) {
    double a = std::pow(10.0, gainDb / 40.0);
    double w0 = 2 * M_PI * f0 / sampleRate;
    double alpha = std::sin(w0) / (2 * q);
    double cosW0 = std::cos(w0);

    double b0 = 1 + alpha * a;
    double b1 = -2 * cosW0;
    double b2 = 1 - alpha * a;
    double a0 = 1 + alpha / a;
    double a1 = -2 * cosW0;
    double a2 = 1 - alpha / a;

    return {b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0};
}

std::vector<double> biquadProcess(const std::vector<double>& x, const BiquadCoeffs& c) {
    double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    std::vector<double> y;
    y.reserve(x.size());
    for (double xn : x) {
        double yn = c.b0 * xn + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
        y.push_back(yn);
        x2 = x1; x1 = xn;
        y2 = y1; y1 = yn;
    }
    return y;
}
```

```rust
struct BiquadCoeffs { b0: f64, b1: f64, b2: f64, a1: f64, a2: f64 }

fn peaking_eq_coeffs(sample_rate: f64, f0: f64, q: f64, gain_db: f64) -> BiquadCoeffs {
    let a = 10f64.powf(gain_db / 40.0);
    let w0 = 2.0 * std::f64::consts::PI * f0 / sample_rate;
    let alpha = w0.sin() / (2.0 * q);
    let cos_w0 = w0.cos();

    let b0 = 1.0 + alpha * a;
    let b1 = -2.0 * cos_w0;
    let b2 = 1.0 - alpha * a;
    let a0 = 1.0 + alpha / a;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha / a;

    BiquadCoeffs { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}

fn biquad_process(x: &[f64], c: &BiquadCoeffs) -> Vec<f64> {
    let (mut x1, mut x2, mut y1, mut y2) = (0.0, 0.0, 0.0, 0.0);
    let mut y = Vec::with_capacity(x.len());
    for &xn in x {
        let yn = c.b0 * xn + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
        y.push(yn);
        x2 = x1; x1 = xn;
        y2 = y1; y1 = yn;
    }
    y
}
```

```csharp
struct BiquadCoeffs { public double B0, B1, B2, A1, A2; }

static BiquadCoeffs PeakingEqCoeffs(double sampleRate, double f0, double q, double gainDb)
{
    double a = Math.Pow(10.0, gainDb / 40.0);
    double w0 = 2 * Math.PI * f0 / sampleRate;
    double alpha = Math.Sin(w0) / (2 * q);
    double cosW0 = Math.Cos(w0);

    double b0 = 1 + alpha * a;
    double b1 = -2 * cosW0;
    double b2 = 1 - alpha * a;
    double a0 = 1 + alpha / a;
    double a1 = -2 * cosW0;
    double a2 = 1 - alpha / a;

    return new BiquadCoeffs { B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0 };
}

static double[] BiquadProcess(double[] x, BiquadCoeffs c)
{
    double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    var y = new double[x.Length];
    for (int i = 0; i < x.Length; i++)
    {
        double xn = x[i];
        double yn = c.B0 * xn + c.B1 * x1 + c.B2 * x2 - c.A1 * y1 - c.A2 * y2;
        y[i] = yn;
        x2 = x1; x1 = xn;
        y2 = y1; y1 = yn;
    }
    return y;
}
```
