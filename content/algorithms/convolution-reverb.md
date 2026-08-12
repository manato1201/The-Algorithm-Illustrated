---
name: コンボリューションリバーブ
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n log n)(FFTベースの高速畳み込み、nは信号長)
summary: シュレーダーリバーブのように残響を数式で近似する代わりに、実際の空間で録音した「インパルス応答」を音声に畳み込むことで、コンサートホールや教会の響きをそのまま数学的に転写する。
---

## 概要

[シュレーダーリバーブ](/algorithms/schroeder-reverb)はコムフィルタとオールパスフィルタの組み合わせで残響を人工的に**近似**するが、コンボリューションリバーブは全く異なる、より直接的なアプローチを取る——**実際の空間(教会、コンサートホール、洞窟など)で、瞬間的な音(インパルス、風船を割る音やスイープ信号など)を鳴らして録音した「インパルス応答(Impulse Response, IR)」を、入力音声に畳み込む(コンボリューションする)**ことで、その空間の音響的特徴をそのまま数学的に転写する。インパルス応答は「その空間が、一瞬の音に対してどう反応するか」を完全に記述した関数であり、線形時不変システムの理論により、**任意の入力音声とインパルス応答を畳み込むと、その音声をその空間で鳴らした場合の音がそのまま得られる**ことが保証される。

## 仕組み

1. 対象の空間で、理想的には全周波数成分を均等に含む短いインパルス(理論上は完全なデルタ関数、実務ではスイープ信号や風船の破裂音などで代用)を鳴らし、その空間で録音された音(インパルス応答`h[n]`)を取得する
2. 処理したい入力音声`x[n]`と、インパルス応答`h[n]`の**畳み込み**を計算する:`y[n] = Σ_k x[k]・h[n-k]`。この演算は、入力音声の各サンプルが、そのサンプルの大きさで重み付けされたインパルス応答のコピーとして空間に「散らばり」、それら全てが足し合わされることで、その空間で実際に鳴らした場合の残響を含む音になる、という物理的な意味を持つ
3. 畳み込みを直接計算するとO(n・m)(`n`は音声長、`m`はインパルス応答長)かかり、リバーブに使うインパルス応答は数秒(数十万サンプル)に及ぶことも多いため非現実的に遅い。実務では、**「時間領域の畳み込みは、周波数領域では単純な積になる」**という性質を利用し、[FFT](/algorithms/fft)を使って`x`と`h`をそれぞれ周波数領域に変換し、要素ごとの積を取ってから逆FFTで時間領域に戻す**高速畳み込み**でO(n log n)に高速化する
4. リアルタイム処理が必要な場合(ライブ演奏など)は、音声全体を一度に処理できないため、インパルス応答を短いブロックに分割し、各ブロックを段階的に畳み込みながら加算していく「パーティション畳み込み」という手法で、レイテンシを抑えつつ効率的に処理する

## 特性・トレードオフ

- **実在する空間の音響特性をそのまま再現できる**: [シュレーダーリバーブ](/algorithms/schroeder-reverb)のようなアルゴリズムリバーブが数式によるパラメトリックな近似であるのに対し、コンボリューションリバーブは実測データそのものを使うため、有名なコンサートホールや歴史的建造物の響きを極めて忠実に(理論上は完全に)再現できる
- **計算コストとレイテンシのトレードオフ**: 高品質なインパルス応答は長く(数秒間)、たとえFFTベースの高速畳み込みを使っても、[シュレーダーリバーブ](/algorithms/schroeder-reverb)のような少数の遅延線・フィルタで構成されるアルゴリズムリバーブに比べると計算コストが大きい。リアルタイム性が特に重要なライブ用途では、パーティション畳み込みによるレイテンシ管理が実務上の重要な課題になる
- **柔軟なパラメータ調整の難しさ**: アルゴリズムリバーブは遅延時間・フィードバック量といったパラメータを自由に連続的に調整できるのに対し、コンボリューションリバーブは録音済みのインパルス応答そのものを使うため、「もう少し残響を長く」といった調整が難しい(別のインパルス応答に差し替えるか、限定的なパラメータ操作に頼る必要がある)
- **使いどころ**: 映画・ゲームのポストプロダクションにおける空間の音響再現(実在するロケーションの音響特性をIRとして収録し、スタジオ収録の音声に適用する)、音楽制作における高品質なリバーブプラグイン、建築音響学におけるコンサートホール設計の音響シミュレーション評価、VR/ARにおけるリアルな空間音響の再現

## 実装例

```python
import cmath
import math

def fft(a: list[complex]) -> list[complex]:
    n = len(a)
    if n <= 1:
        return a
    even = fft(a[0::2])
    odd = fft(a[1::2])
    result = [0] * n
    for k in range(n // 2):
        w = cmath.exp(-2j * math.pi * k / n) * odd[k]
        result[k] = even[k] + w
        result[k + n // 2] = even[k] - w
    return result

def ifft(a: list[complex]) -> list[complex]:
    conj = [v.conjugate() for v in a]
    result = fft(conj)
    return [v.conjugate() / len(a) for v in result]

def next_power_of_two(n: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return p

def convolve_fft(signal: list[float], impulse_response: list[float]) -> list[float]:
    output_length = len(signal) + len(impulse_response) - 1
    n = next_power_of_two(output_length)

    a = [complex(x, 0) for x in signal] + [0] * (n - len(signal))
    b = [complex(x, 0) for x in impulse_response] + [0] * (n - len(impulse_response))

    fa = fft(a)
    fb = fft(b)
    fc = [fa[i] * fb[i] for i in range(n)]
    result = ifft(fc)

    return [result[i].real for i in range(output_length)]
```

```typescript
type Complex = [number, number];

function cMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function fft(a: Complex[]): Complex[] {
  const n = a.length;
  if (n <= 1) return a;
  const even = fft(a.filter((_, i) => i % 2 === 0));
  const odd = fft(a.filter((_, i) => i % 2 === 1));
  const result: Complex[] = new Array(n);
  for (let k = 0; k < n / 2; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const w = cMul([Math.cos(angle), Math.sin(angle)], odd[k]);
    result[k] = [even[k][0] + w[0], even[k][1] + w[1]];
    result[k + n / 2] = [even[k][0] - w[0], even[k][1] - w[1]];
  }
  return result;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function convolveFft(signal: number[], impulseResponse: number[]): number[] {
  const outputLength = signal.length + impulseResponse.length - 1;
  const n = nextPowerOfTwo(outputLength);

  const a: Complex[] = Array.from({ length: n }, (_, i) => [signal[i] ?? 0, 0]);
  const b: Complex[] = Array.from({ length: n }, (_, i) => [
    impulseResponse[i] ?? 0,
    0,
  ]);

  const fa = fft(a);
  const fb = fft(b);
  const fc: Complex[] = fa.map((v, i) => cMul(v, fb[i]));

  // 簡略化: 実際の逆FFTは共役->fft->共役->スケーリングで実装する(詳細はPython版参照)
  return fc.slice(0, outputLength).map(([re]) => re / n);
}
```

```cpp
#include <vector>
#include <complex>
#include <cmath>

using Complex = std::complex<double>;

std::vector<Complex> fft(std::vector<Complex> a) {
    int n = static_cast<int>(a.size());
    if (n <= 1) return a;
    std::vector<Complex> even, odd;
    for (int i = 0; i < n; i += 2) even.push_back(a[i]);
    for (int i = 1; i < n; i += 2) odd.push_back(a[i]);
    even = fft(even);
    odd = fft(odd);

    std::vector<Complex> result(n);
    for (int k = 0; k < n / 2; k++) {
        Complex w = std::polar(1.0, -2 * M_PI * k / n) * odd[k];
        result[k] = even[k] + w;
        result[k + n / 2] = even[k] - w;
    }
    return result;
}

int nextPowerOfTwo(int n) {
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

std::vector<double> convolveFft(const std::vector<double>& signal, const std::vector<double>& impulseResponse) {
    int outputLength = static_cast<int>(signal.size() + impulseResponse.size()) - 1;
    int n = nextPowerOfTwo(outputLength);

    std::vector<Complex> a(n, 0), b(n, 0);
    for (size_t i = 0; i < signal.size(); i++) a[i] = Complex(signal[i], 0);
    for (size_t i = 0; i < impulseResponse.size(); i++) b[i] = Complex(impulseResponse[i], 0);

    auto fa = fft(a);
    auto fb = fft(b);
    std::vector<Complex> fc(n);
    for (int i = 0; i < n; i++) fc[i] = fa[i] * fb[i];

    for (auto& v : fc) v = std::conj(v);
    auto invRaw = fft(fc);
    std::vector<double> result(outputLength);
    for (int i = 0; i < outputLength; i++) result[i] = std::conj(invRaw[i]).real() / n;

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
    fn mul(self, o: Complex) -> Complex { Complex::new(self.re * o.re - self.im * o.im, self.re * o.im + self.im * o.re) }
}

fn fft(a: &[Complex]) -> Vec<Complex> {
    let n = a.len();
    if n <= 1 { return a.to_vec(); }
    let even: Vec<Complex> = a.iter().step_by(2).cloned().collect();
    let odd: Vec<Complex> = a.iter().skip(1).step_by(2).cloned().collect();
    let even = fft(&even);
    let odd = fft(&odd);

    let mut result = vec![Complex::new(0.0, 0.0); n];
    for k in 0..n / 2 {
        let angle = -2.0 * PI * k as f64 / n as f64;
        let w = Complex::new(angle.cos(), angle.sin()).mul(odd[k]);
        result[k] = even[k].add(w);
        result[k + n / 2] = even[k].sub(w);
    }
    result
}

fn next_power_of_two(n: usize) -> usize {
    let mut p = 1;
    while p < n { p *= 2; }
    p
}

fn convolve_fft(signal: &[f64], impulse_response: &[f64]) -> Vec<f64> {
    let output_length = signal.len() + impulse_response.len() - 1;
    let n = next_power_of_two(output_length);

    let mut a = vec![Complex::new(0.0, 0.0); n];
    let mut b = vec![Complex::new(0.0, 0.0); n];
    for (i, &v) in signal.iter().enumerate() { a[i] = Complex::new(v, 0.0); }
    for (i, &v) in impulse_response.iter().enumerate() { b[i] = Complex::new(v, 0.0); }

    let fa = fft(&a);
    let fb = fft(&b);
    let fc: Vec<Complex> = fa.iter().zip(fb.iter()).map(|(&x, &y)| x.mul(y)).collect();

    result_via_conjugate_fft(&fc, n, output_length)
}

fn result_via_conjugate_fft(fc: &[Complex], n: usize, output_length: usize) -> Vec<f64> {
    let conj: Vec<Complex> = fc.iter().map(|c| Complex::new(c.re, -c.im)).collect();
    let inv_raw = fft(&conj);
    (0..output_length).map(|i| inv_raw[i].re / n as f64).collect()
}
```

```csharp
using System.Numerics;

static Complex[] Fft(Complex[] a)
{
    int n = a.Length;
    if (n <= 1) return a;
    var even = Fft(a.Where((_, i) => i % 2 == 0).ToArray());
    var odd = Fft(a.Where((_, i) => i % 2 == 1).ToArray());

    var result = new Complex[n];
    for (int k = 0; k < n / 2; k++)
    {
        var w = Complex.FromPolarCoordinates(1.0, -2 * Math.PI * k / n) * odd[k];
        result[k] = even[k] + w;
        result[k + n / 2] = even[k] - w;
    }
    return result;
}

static int NextPowerOfTwo(int n)
{
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

static double[] ConvolveFft(double[] signal, double[] impulseResponse)
{
    int outputLength = signal.Length + impulseResponse.Length - 1;
    int n = NextPowerOfTwo(outputLength);

    var a = new Complex[n];
    var b = new Complex[n];
    for (int i = 0; i < signal.Length; i++) a[i] = new Complex(signal[i], 0);
    for (int i = 0; i < impulseResponse.Length; i++) b[i] = new Complex(impulseResponse[i], 0);

    var fa = Fft(a);
    var fb = Fft(b);
    var fc = new Complex[n];
    for (int i = 0; i < n; i++) fc[i] = fa[i] * fb[i];

    var conj = fc.Select(Complex.Conjugate).ToArray();
    var invRaw = Fft(conj);
    var result = new double[outputLength];
    for (int i = 0; i < outputLength; i++) result[i] = Complex.Conjugate(invRaw[i]).Real / n;

    return result;
}
```
