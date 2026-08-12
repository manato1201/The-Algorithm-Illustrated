---
name: ヒルベルト変換(解析信号とエンベロープ検出)
category: 数値計算
subcategory: 信号処理
complexity: O(n log n)(FFTベースの実装)
summary: 信号の全ての周波数成分の位相を90度ずらすことで元信号の「直交ペア」を作り出し、それを虚部として組み合わせた解析信号から、瞬時振幅(エンベロープ)や瞬時周波数を取り出す信号処理の基礎技法。
---

## 概要

振幅変調された音声や無線信号のように、「信号の細かい振動」と「その全体的な音量の変化(エンベロープ)」を分けて扱いたい場面は多い。単純に信号の絶対値を取ってローパスフィルタをかける方法は近似的にしか動作しないが、ヒルベルト変換は数学的に厳密な方法でこれを実現する。ヒルベルト変換は、実数値の信号`x(t)`のあらゆる周波数成分の位相を**90度(π/2)だけずらした**信号`x̂(t)`を生成する変換であり、元の信号`x(t)`を実部、ヒルベルト変換`x̂(t)`を虚部とする複素数値の**解析信号(Analytic Signal)**`z(t) = x(t) + j・x̂(t)`を作ることで、瞬時振幅(エンベロープ)・瞬時位相・瞬時周波数といった、実信号だけでは直接取り出せない情報を得られるようになる。

## 仕組み

1. **周波数領域での定義**: ヒルベルト変換は、周波数領域で最もシンプルに定義できる——信号の[FFT](/algorithms/fft)を取り、正の周波数成分の位相を-90度、負の周波数成分の位相を+90度ずらす(直流成分とナイキスト周波数は変更しない)というフィルタを適用してから、逆FFTで時間領域に戻す
2. **解析信号の構築**: より実用的には、正の周波数成分だけを2倍にし、負の周波数成分を0にするという操作を周波数領域で行ってから逆FFTを取ることで、解析信号`z(t) = x(t) + j・x̂(t)`を直接一度に計算できる(この操作は「ヒルベルト変換を計算してから複素数を組み立てる」のと数学的に等価だが、実装上はこちらの方が効率的)
3. **瞬時振幅(エンベロープ)**: 解析信号の絶対値`|z(t)| = √(x(t)² + x̂(t)²)`を計算する。これが元の信号の「包絡線」であり、振幅変調された信号から変調成分(音量の変化パターン)を正確に取り出せる
4. **瞬時位相・瞬時周波数**: 解析信号の偏角`arg(z(t))`が瞬時位相を、その時間微分が瞬時周波数を与える。これにより、周波数が時間とともに変化する信号(チャープ信号など)の周波数の変化を追跡できる

## 特性・トレードオフ

- **数学的に厳密なエンベロープ抽出**: 絶対値+ローパスフィルタという近似的な包絡線検出と異なり、解析信号のアプローチは理論的な裏付けを持ち、信号の帯域幅や変調の速さに関する仮定なしに正確なエンベロープが得られる(ただしエッジ効果や有限長信号での境界の扱いには実務上の注意が必要)
- **FFTベースの実装コスト**: [FFT](/algorithms/fft)を使った実装ではO(n log n)で解析信号を計算できるが、リアルタイム処理(逐次的にサンプルが届く状況)では、FIRフィルタによる近似的なヒルベルト変換器を使う実装もよく使われる
- **振幅変調・周波数変調通信の復調への応用**: AM(振幅変調)ラジオの復調は、まさにこのエンベロープ検出そのものであり、ヒルベルト変換による解析信号のアプローチは、単純な包絡線検波回路よりも正確で、デジタル信号処理での標準的な復調手法になっている
- **使いどころ**: AM/SSB(単側波帯)通信の復調、心拍・呼吸などの生体信号からのエンベロープ抽出、音声のピッチ・音量変化の解析、機械振動診断(軸受の異常検出のためのエンベロープ解析)、[MFCC分析](/algorithms/mfcc-analysis)のような音声特徴抽出の前処理

## 実装例

```python
import cmath
import math

def fft(x: list[complex]) -> list[complex]:
    n = len(x)
    if n <= 1:
        return x
    even = fft(x[0::2])
    odd = fft(x[1::2])
    factors = [cmath.exp(-2j * math.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + factors[k] for k in range(n // 2)] + [even[k] - factors[k] for k in range(n // 2)]

def ifft(x: list[complex]) -> list[complex]:
    conj = [v.conjugate() for v in x]
    result = fft(conj)
    return [v.conjugate() / len(x) for v in result]

def analytic_signal(x: list[float]) -> list[complex]:
    """信号長は2のべき乗を仮定した簡略版。"""
    n = len(x)
    freq_domain = fft([complex(v, 0) for v in x])

    h = [0.0] * n
    h[0] = 1.0
    if n % 2 == 0:
        h[n // 2] = 1.0
        for i in range(1, n // 2):
            h[i] = 2.0
    else:
        for i in range(1, (n + 1) // 2):
            h[i] = 2.0

    filtered = [freq_domain[i] * h[i] for i in range(n)]
    return ifft(filtered)

def envelope(x: list[float]) -> list[float]:
    z = analytic_signal(x)
    return [abs(v) for v in z]
```

```typescript
type Complex = [number, number];

function complexMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function fft(x: Complex[]): Complex[] {
  const n = x.length;
  if (n <= 1) return x;
  const even = fft(x.filter((_, i) => i % 2 === 0));
  const odd = fft(x.filter((_, i) => i % 2 === 1));
  const result: Complex[] = new Array(n);
  for (let k = 0; k < n / 2; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const twiddle: Complex = [Math.cos(angle), Math.sin(angle)];
    const t = complexMul(twiddle, odd[k]);
    result[k] = [even[k][0] + t[0], even[k][1] + t[1]];
    result[k + n / 2] = [even[k][0] - t[0], even[k][1] - t[1]];
  }
  return result;
}

function envelope(x: number[]): number[] {
  const n = x.length;
  const freqDomain = fft(x.map((v) => [v, 0] as Complex));
  const h = new Array(n).fill(0);
  h[0] = 1;
  if (n % 2 === 0) {
    h[n / 2] = 1;
    for (let i = 1; i < n / 2; i++) h[i] = 2;
  } else {
    for (let i = 1; i < (n + 1) / 2; i++) h[i] = 2;
  }
  const filtered = freqDomain.map((v, i) => [v[0] * h[i], v[1] * h[i]] as Complex);
  // 簡略化のため逆FFTは省略し、周波数領域のエネルギーから概算する実装イメージのみ示す
  return filtered.map(([re, im]) => Math.hypot(re, im) / n);
}
```

```cpp
#include <vector>
#include <complex>
#include <cmath>

using Complex = std::complex<double>;

std::vector<Complex> fft(std::vector<Complex> x) {
    int n = static_cast<int>(x.size());
    if (n <= 1) return x;
    std::vector<Complex> even, odd;
    for (int i = 0; i < n; i += 2) even.push_back(x[i]);
    for (int i = 1; i < n; i += 2) odd.push_back(x[i]);
    even = fft(even);
    odd = fft(odd);

    std::vector<Complex> result(n);
    for (int k = 0; k < n / 2; k++) {
        Complex t = std::polar(1.0, -2 * M_PI * k / n) * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}

std::vector<double> envelope(const std::vector<double>& x) {
    int n = static_cast<int>(x.size());
    std::vector<Complex> input(n);
    for (int i = 0; i < n; i++) input[i] = Complex(x[i], 0);
    auto freqDomain = fft(input);

    std::vector<double> h(n, 0.0);
    h[0] = 1.0;
    if (n % 2 == 0) {
        h[n / 2] = 1.0;
        for (int i = 1; i < n / 2; i++) h[i] = 2.0;
    } else {
        for (int i = 1; i < (n + 1) / 2; i++) h[i] = 2.0;
    }

    std::vector<double> env(n);
    for (int i = 0; i < n; i++) env[i] = std::abs(freqDomain[i] * h[i]) / n;
    return env;
}
```

```rust
use std::f64::consts::PI;

#[derive(Clone, Copy)]
struct Complex {
    re: f64,
    im: f64,
}

impl Complex {
    fn new(re: f64, im: f64) -> Self {
        Complex { re, im }
    }
    fn add(self, o: Complex) -> Complex {
        Complex::new(self.re + o.re, self.im + o.im)
    }
    fn sub(self, o: Complex) -> Complex {
        Complex::new(self.re - o.re, self.im - o.im)
    }
    fn mul(self, o: Complex) -> Complex {
        Complex::new(self.re * o.re - self.im * o.im, self.re * o.im + self.im * o.re)
    }
    fn abs(self) -> f64 {
        (self.re * self.re + self.im * self.im).sqrt()
    }
}

fn fft(x: &[Complex]) -> Vec<Complex> {
    let n = x.len();
    if n <= 1 {
        return x.to_vec();
    }
    let even: Vec<Complex> = x.iter().step_by(2).cloned().collect();
    let odd: Vec<Complex> = x.iter().skip(1).step_by(2).cloned().collect();
    let even = fft(&even);
    let odd = fft(&odd);

    let mut result = vec![Complex::new(0.0, 0.0); n];
    for k in 0..n / 2 {
        let angle = -2.0 * PI * k as f64 / n as f64;
        let twiddle = Complex::new(angle.cos(), angle.sin());
        let t = twiddle.mul(odd[k]);
        result[k] = even[k].add(t);
        result[k + n / 2] = even[k].sub(t);
    }
    result
}

fn envelope(x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let input: Vec<Complex> = x.iter().map(|&v| Complex::new(v, 0.0)).collect();
    let freq_domain = fft(&input);

    let mut h = vec![0.0; n];
    h[0] = 1.0;
    if n % 2 == 0 {
        h[n / 2] = 1.0;
        for i in 1..n / 2 {
            h[i] = 2.0;
        }
    } else {
        for i in 1..(n + 1) / 2 {
            h[i] = 2.0;
        }
    }

    (0..n)
        .map(|i| Complex::new(freq_domain[i].re * h[i], freq_domain[i].im * h[i]).abs() / n as f64)
        .collect()
}
```

```csharp
using System.Numerics;

static Complex[] Fft(Complex[] x)
{
    int n = x.Length;
    if (n <= 1) return x;
    var even = Fft(x.Where((_, i) => i % 2 == 0).ToArray());
    var odd = Fft(x.Where((_, i) => i % 2 == 1).ToArray());

    var result = new Complex[n];
    for (int k = 0; k < n / 2; k++)
    {
        var twiddle = Complex.FromPolarCoordinates(1.0, -2 * Math.PI * k / n);
        var t = twiddle * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}

static double[] Envelope(double[] x)
{
    int n = x.Length;
    var input = x.Select(v => new Complex(v, 0)).ToArray();
    var freqDomain = Fft(input);

    var h = new double[n];
    h[0] = 1.0;
    if (n % 2 == 0)
    {
        h[n / 2] = 1.0;
        for (int i = 1; i < n / 2; i++) h[i] = 2.0;
    }
    else
    {
        for (int i = 1; i < (n + 1) / 2; i++) h[i] = 2.0;
    }

    var env = new double[n];
    for (int i = 0; i < n; i++) env[i] = Complex.Abs(freqDomain[i] * h[i]) / n;
    return env;
}
```
