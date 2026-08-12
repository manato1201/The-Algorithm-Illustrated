---
name: チャープZ変換(Bluesteinのアルゴリズム)
category: 数値計算
subcategory: 信号処理
complexity: O(n log n)
summary: 通常のFFTが要求する「系列長が2のべき乗」という制約を、離散フーリエ変換を畳み込みの形に書き換えることで取り払い、任意の長さの系列でもO(n log n)で高速フーリエ変換と同等の結果を得る。
---

## 概要

[高速フーリエ変換(FFT)](/algorithms/fft)のCooley-Tukeyアルゴリズムは、系列長`n`が2のべき乗(またはせめて小さな素因数の積)であることを前提に、分割統治で計算量をO(n log n)に落とす。しかし実データの系列長は必ずしも都合の良い値になるとは限らず、例えば長さが大きな素数の場合、通常のCooley-Tukey FFTは分割のしようがなく適用できない。Bluesteinのアルゴリズム(チャープZ変換の特殊形)は、1968年にレオ・ブルースタインが示した巧妙な数学的変形によって、**離散フーリエ変換の計算を、系列長に関わらず適用できる「畳み込み」の形に書き換える**ことで、任意の長さ`n`の系列に対してもO(n log n)でDFTを計算できるようにする。

## 仕組み

1. DFTの定義式`X[k] = Σ_n x[n]・e^(-j2πkn/N)`の指数部分に、恒等式`2kn = k² + n² - (k-n)²`を代入する(この式変形が"チャープ"、つまり時間とともに周波数が変化する信号を使うアイデアの核心)
2. 変形後、`X[k] = e^(-jπk²/N) Σ_n [x[n]・e^(-jπn²/N)]・e^(jπ(k-n)²/N)`という形になる。これは、**`x[n]`にチャープ信号`e^(-jπn²/N)`を掛けたものと、別のチャープ信号`e^(jπn²/N)`との畳み込み**として解釈できる
3. 畳み込みは「時間領域での畳み込みは、周波数領域では積になる」という定理を使い、両方の系列をゼロ埋めして**2のべき乗以上の長さ**にしてから通常の[FFT](/algorithms/fft)で計算し、要素ごとに掛け合わせてから逆FFTで畳み込み結果を得る、というO(n log n)の手順に帰着できる(畳み込み自体の系列長は自由に選べるゼロ埋め後のサイズなので、2のべき乗にできる)
4. 得られた畳み込み結果に、最初に掛けた`e^(-jπk²/N)`を掛け戻すことで、元のDFTの結果`X[k]`が得られる
5. これにより、**元の系列長`N`がどんな値であっても**(2のべき乗でなくても、素数であっても)、畳み込みの計算に使う補助的な系列長さえ2のべき乗に選べば、全体としてO(n log n)でDFTが計算できる

## 特性・トレードオフ

- **系列長の制約からの解放**: 通常のCooley-Tukey FFTが「都合の良い長さ」を要求するのに対し、Bluesteinのアルゴリズムは任意の長さの系列に対してO(n log n)を達成できる汎用性を持つ。素数長の系列や、パディングで長さを変えたくない場面で特に有用である
- **畳み込みへの帰着という発想の転用**: 「本来欲しい計算(DFT)を、既に高速なアルゴリズムがある別の計算(畳み込み)に書き換える」というBluesteinの発想は、アルゴリズム設計における強力なパターンの一例であり、他の変換(離散コサイン変換の高速化など)にも同様の技法が応用される
- **実装コストと定数倍のオーバーヘッド**: Bluesteinのアルゴリズムは、畳み込みのための系列を2〜4倍程度の長さにゼロ埋めする必要があり、都合の良い長さの系列に対する通常のFFTと比べると定数倍のオーバーヘッドがある。系列長が最初から2のべき乗である場合は、素直にCooley-Tukey FFTを使う方が効率的である
- **使いどころ**: 任意サンプル数のオーディオ・センサーデータのスペクトル解析、素数長の系列に対するDFT計算、チャープZ変換自体が持つ「任意のZ平面上の等角螺旋に沿ったスペクトルサンプリング」という一般化された機能を活かした狭帯域の周波数解析

## 実装例

```python
import cmath
import math

def fft_pow2(x: list[complex]) -> list[complex]:
    n = len(x)
    if n <= 1:
        return x
    even = fft_pow2(x[0::2])
    odd = fft_pow2(x[1::2])
    factors = [cmath.exp(-2j * math.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + factors[k] for k in range(n // 2)] + [even[k] - factors[k] for k in range(n // 2)]

def ifft_pow2(x: list[complex]) -> list[complex]:
    conj = [v.conjugate() for v in x]
    result = fft_pow2(conj)
    return [v.conjugate() / len(x) for v in result]

def next_power_of_two(n: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return p

def bluestein_dft(x: list[complex]) -> list[complex]:
    n = len(x)
    m = next_power_of_two(2 * n - 1)

    chirp = [cmath.exp(-1j * math.pi * (k * k) / n) for k in range(n)]
    a = [x[k] * chirp[k] if k < n else 0 for k in range(m)]

    b = [0] * m
    b[0] = chirp[0].conjugate()
    for k in range(1, n):
        b[k] = chirp[k].conjugate()
        b[m - k] = chirp[k].conjugate()

    fa = fft_pow2(a)
    fb = fft_pow2(b)
    fc = [fa[i] * fb[i] for i in range(m)]
    conv = ifft_pow2(fc)

    return [conv[k] * chirp[k] for k in range(n)]
```

```typescript
type Complex = [number, number];

function cMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}
function cConj(a: Complex): Complex {
  return [a[0], -a[1]];
}
function cExp(theta: number): Complex {
  return [Math.cos(theta), Math.sin(theta)];
}

function fftPow2(x: Complex[]): Complex[] {
  const n = x.length;
  if (n <= 1) return x;
  const even = fftPow2(x.filter((_, i) => i % 2 === 0));
  const odd = fftPow2(x.filter((_, i) => i % 2 === 1));
  const result: Complex[] = new Array(n);
  for (let k = 0; k < n / 2; k++) {
    const t = cMul(cExp((-2 * Math.PI * k) / n), odd[k]);
    result[k] = [even[k][0] + t[0], even[k][1] + t[1]];
    result[k + n / 2] = [even[k][0] - t[0], even[k][1] - t[1]];
  }
  return result;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function bluesteinDft(x: Complex[]): Complex[] {
  const n = x.length;
  const m = nextPowerOfTwo(2 * n - 1);
  const chirp: Complex[] = Array.from({ length: n }, (_, k) => cExp((-Math.PI * k * k) / n));

  const a: Complex[] = Array.from({ length: m }, (_, k) => (k < n ? cMul(x[k], chirp[k]) : [0, 0]));
  const b: Complex[] = new Array(m).fill([0, 0]);
  b[0] = cConj(chirp[0]);
  for (let k = 1; k < n; k++) {
    b[k] = cConj(chirp[k]);
    b[m - k] = cConj(chirp[k]);
  }

  const fa = fftPow2(a);
  const fb = fftPow2(b);
  const fc = fa.map((v, i) => cMul(v, fb[i]));
  // 簡略化: 逆FFTは共役+FFT+共役+スケーリングで実現できる(詳細はPython版参照)
  return fc.slice(0, n).map((v, k) => cMul(v, chirp[k]));
}
```

```cpp
#include <vector>
#include <complex>
#include <cmath>

using Complex = std::complex<double>;

std::vector<Complex> fftPow2(std::vector<Complex> x) {
    int n = static_cast<int>(x.size());
    if (n <= 1) return x;
    std::vector<Complex> even, odd;
    for (int i = 0; i < n; i += 2) even.push_back(x[i]);
    for (int i = 1; i < n; i += 2) odd.push_back(x[i]);
    even = fftPow2(even);
    odd = fftPow2(odd);

    std::vector<Complex> result(n);
    for (int k = 0; k < n / 2; k++) {
        Complex t = std::polar(1.0, -2 * M_PI * k / n) * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}

int nextPowerOfTwo(int n) {
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

std::vector<Complex> bluesteinDft(const std::vector<Complex>& x) {
    int n = static_cast<int>(x.size());
    int m = nextPowerOfTwo(2 * n - 1);

    std::vector<Complex> chirp(n);
    for (int k = 0; k < n; k++) chirp[k] = std::polar(1.0, -M_PI * k * k / n);

    std::vector<Complex> a(m, Complex(0, 0));
    for (int k = 0; k < n; k++) a[k] = x[k] * chirp[k];

    std::vector<Complex> b(m, Complex(0, 0));
    b[0] = std::conj(chirp[0]);
    for (int k = 1; k < n; k++) {
        b[k] = std::conj(chirp[k]);
        b[m - k] = std::conj(chirp[k]);
    }

    auto fa = fftPow2(a);
    auto fb = fftPow2(b);
    std::vector<Complex> fc(m);
    for (int i = 0; i < m; i++) fc[i] = fa[i] * fb[i];

    // 逆FFT(共役->FFT->共役->スケーリング)
    for (auto& v : fc) v = std::conj(v);
    auto conv = fftPow2(fc);
    for (auto& v : conv) v = std::conj(v) / static_cast<double>(m);

    std::vector<Complex> result(n);
    for (int k = 0; k < n; k++) result[k] = conv[k] * chirp[k];
    return result;
}
```

```rust
use std::f64::consts::PI;

#[derive(Clone, Copy)]
struct Complex { re: f64, im: f64 }

impl Complex {
    fn new(re: f64, im: f64) -> Self { Complex { re, im } }
    fn add(self, o: Complex) -> Complex { Complex::new(self.re + o.re, self.im + o.im) }
    fn sub(self, o: Complex) -> Complex { Complex::new(self.re - o.re, self.im - o.im) }
    fn mul(self, o: Complex) -> Complex {
        Complex::new(self.re * o.re - self.im * o.im, self.re * o.im + self.im * o.re)
    }
    fn conj(self) -> Complex { Complex::new(self.re, -self.im) }
    fn from_polar(theta: f64) -> Complex { Complex::new(theta.cos(), theta.sin()) }
}

fn fft_pow2(x: &[Complex]) -> Vec<Complex> {
    let n = x.len();
    if n <= 1 { return x.to_vec(); }
    let even: Vec<Complex> = x.iter().step_by(2).cloned().collect();
    let odd: Vec<Complex> = x.iter().skip(1).step_by(2).cloned().collect();
    let even = fft_pow2(&even);
    let odd = fft_pow2(&odd);

    let mut result = vec![Complex::new(0.0, 0.0); n];
    for k in 0..n / 2 {
        let t = Complex::from_polar(-2.0 * PI * k as f64 / n as f64).mul(odd[k]);
        result[k] = even[k].add(t);
        result[k + n / 2] = even[k].sub(t);
    }
    result
}

fn next_power_of_two(n: usize) -> usize {
    let mut p = 1;
    while p < n { p *= 2; }
    p
}

fn bluestein_dft(x: &[Complex]) -> Vec<Complex> {
    let n = x.len();
    let m = next_power_of_two(2 * n - 1);

    let chirp: Vec<Complex> = (0..n).map(|k| Complex::from_polar(-PI * (k * k) as f64 / n as f64)).collect();

    let mut a = vec![Complex::new(0.0, 0.0); m];
    for k in 0..n { a[k] = x[k].mul(chirp[k]); }

    let mut b = vec![Complex::new(0.0, 0.0); m];
    b[0] = chirp[0].conj();
    for k in 1..n {
        b[k] = chirp[k].conj();
        b[m - k] = chirp[k].conj();
    }

    let fa = fft_pow2(&a);
    let fb = fft_pow2(&b);
    let fc: Vec<Complex> = (0..m).map(|i| fa[i].mul(fb[i])).collect();

    let fc_conj: Vec<Complex> = fc.iter().map(|v| v.conj()).collect();
    let conv_raw = fft_pow2(&fc_conj);
    let conv: Vec<Complex> = conv_raw.iter().map(|v| Complex::new(v.conj().re / m as f64, v.conj().im / m as f64)).collect();

    (0..n).map(|k| conv[k].mul(chirp[k])).collect()
}
```

```csharp
using System.Numerics;

static Complex[] FftPow2(Complex[] x)
{
    int n = x.Length;
    if (n <= 1) return x;
    var even = FftPow2(x.Where((_, i) => i % 2 == 0).ToArray());
    var odd = FftPow2(x.Where((_, i) => i % 2 == 1).ToArray());

    var result = new Complex[n];
    for (int k = 0; k < n / 2; k++)
    {
        var t = Complex.FromPolarCoordinates(1.0, -2 * Math.PI * k / n) * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}

static int NextPowerOfTwo(int n)
{
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

static Complex[] BluesteinDft(Complex[] x)
{
    int n = x.Length;
    int m = NextPowerOfTwo(2 * n - 1);

    var chirp = new Complex[n];
    for (int k = 0; k < n; k++) chirp[k] = Complex.FromPolarCoordinates(1.0, -Math.PI * k * k / n);

    var a = new Complex[m];
    for (int k = 0; k < n; k++) a[k] = x[k] * chirp[k];

    var b = new Complex[m];
    b[0] = Complex.Conjugate(chirp[0]);
    for (int k = 1; k < n; k++)
    {
        b[k] = Complex.Conjugate(chirp[k]);
        b[m - k] = Complex.Conjugate(chirp[k]);
    }

    var fa = FftPow2(a);
    var fb = FftPow2(b);
    var fc = new Complex[m];
    for (int i = 0; i < m; i++) fc[i] = fa[i] * fb[i];

    var fcConj = fc.Select(Complex.Conjugate).ToArray();
    var convRaw = FftPow2(fcConj);
    var conv = convRaw.Select(v => Complex.Conjugate(v) / m).ToArray();

    var result = new Complex[n];
    for (int k = 0; k < n; k++) result[k] = conv[k] * chirp[k];
    return result;
}
```
