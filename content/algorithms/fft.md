---
name: 高速フーリエ変換(FFT)
category: 数論・暗号
subcategory: 高速演算
complexity: O(n log n)
summary: 多項式乗算や信号処理を、素朴なO(n²)から劇的に高速化する分割統治アルゴリズム。
---

## 概要

2つの多項式(あるいは長い数)を掛け合わせる素朴な方法(筆算と同じ)はO(n²)かかるが、高速フーリエ変換(FFT)を使うと、これをO(n log n)まで劇的に高速化できる。信号処理・画像処理・音声圧縮・大きな数の掛け算など、応用範囲があまりに広く、20世紀で最も影響力のあるアルゴリズムのひとつに数えられている。

## 仕組み

多項式は「係数の列」としても、「十分な数の点における値の列」としても表現できる、という数学的な事実がFFTの出発点になる。

1. 多項式の掛け算は、係数表現のままだと畳み込み演算(O(n²))が必要だが、**点の値の表現に変換すると、単に対応する値同士を掛け算するだけ(O(n))で済む**
2. FFTは、「係数表現」と「点の値表現」を、**複素数の単位根(1のn乗根)という特別な評価点を選ぶことで、O(n log n)で相互変換する**アルゴリズム
3. 手順は、係数表現をFFTで点の値表現に変換 → 点ごとに値を掛け算(O(n)) → 逆FFTで係数表現に戻す、という3段構え
4. FFT自体は分割統治法で実現される: 多項式を偶数次の項と奇数次の項に分け、それぞれを半分のサイズのFFTとして再帰的に解き、単位根の対称性を利用して結果を結合する

「複素数の単位根という特殊な評価点を選ぶと、分割統治の各段階で計算を半分に減らせる対称性が生まれる」という数学的な巧妙さが、このアルゴリズムの核心。

## 特性・トレードオフ

- **計算量**: O(n log n)。素朴な多項式乗算のO(n²)に比べ、nが大きいほど圧倒的な差になる
- **信号処理での役割**: 時間領域の信号(音声波形など)を周波数領域に変換することで、特定の周波数成分の解析・フィルタリング・圧縮(MP3, JPEGなど)が可能になる。FFTはこの変換の高速な実装そのもの
- **数値誤差の考慮**: 複素数を使った浮動小数点演算のため、整数の厳密な計算が必要な場面(大きな数の掛け算など)では、数値誤差に注意深く対処する必要がある(NTT: 数論変換という、有限体上で同じ発想を使う整数専用の派生版もある)
- **使いどころ**: 音声・画像・動画の圧縮技術、大きな整数同士の高速な掛け算(円周率の桁数計算など)、多項式乗算が必要な競技プログラミングの問題、デジタル信号処理全般の基盤技術

## 実装例

```python
import cmath


def fft(a: list[complex]) -> list[complex]:
    """再帰的なCooley-Tukey FFT。長さは2の冪であることを前提とする"""
    n = len(a)
    if n == 1:
        return a[:]

    even = fft(a[0::2])
    odd = fft(a[1::2])

    result = [0j] * n
    for k in range(n // 2):
        twiddle = cmath.exp(-2j * cmath.pi * k / n) * odd[k]
        result[k] = even[k] + twiddle
        result[k + n // 2] = even[k] - twiddle
    return result
```

```typescript
type Complex = { re: number; im: number };

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}
function sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}
function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

// 再帰的なCooley-Tukey FFT。長さは2の冪であることを前提とする
function fft(a: Complex[]): Complex[] {
  const n = a.length;
  if (n === 1) return a;

  const even = fft(a.filter((_, i) => i % 2 === 0));
  const odd = fft(a.filter((_, i) => i % 2 === 1));

  const result: Complex[] = new Array(n);
  for (let k = 0; k < n / 2; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const w: Complex = { re: Math.cos(angle), im: Math.sin(angle) };
    const t = mul(w, odd[k]);
    result[k] = add(even[k], t);
    result[k + n / 2] = sub(even[k], t);
  }
  return result;
}
```

```cpp
#include <vector>
#include <complex>
#include <cmath>

using Complex = std::complex<double>;

// 再帰的なCooley-Tukey FFT。長さは2の冪であることを前提とする
std::vector<Complex> fft(const std::vector<Complex>& a) {
    size_t n = a.size();
    if (n == 1) return a;

    std::vector<Complex> aEven(n / 2), aOdd(n / 2);
    for (size_t i = 0; i < n / 2; i++) {
        aEven[i] = a[2 * i];
        aOdd[i] = a[2 * i + 1];
    }
    auto even = fft(aEven);
    auto odd = fft(aOdd);

    std::vector<Complex> result(n);
    for (size_t k = 0; k < n / 2; k++) {
        double angle = -2.0 * M_PI * static_cast<double>(k) / static_cast<double>(n);
        Complex w = std::polar(1.0, angle);
        Complex t = w * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}
```

```rust
#[derive(Clone, Copy, Debug)]
struct Complex {
    re: f64,
    im: f64,
}

impl std::ops::Add for Complex {
    type Output = Complex;
    fn add(self, rhs: Complex) -> Complex {
        Complex { re: self.re + rhs.re, im: self.im + rhs.im }
    }
}
impl std::ops::Sub for Complex {
    type Output = Complex;
    fn sub(self, rhs: Complex) -> Complex {
        Complex { re: self.re - rhs.re, im: self.im - rhs.im }
    }
}
impl std::ops::Mul for Complex {
    type Output = Complex;
    fn mul(self, rhs: Complex) -> Complex {
        Complex { re: self.re * rhs.re - self.im * rhs.im, im: self.re * rhs.im + self.im * rhs.re }
    }
}

// 再帰的なCooley-Tukey FFT。長さは2の冪であることを前提とする
fn fft(a: &[Complex]) -> Vec<Complex> {
    let n = a.len();
    if n == 1 {
        return a.to_vec();
    }

    let even_input: Vec<Complex> = a.iter().step_by(2).copied().collect();
    let odd_input: Vec<Complex> = a.iter().skip(1).step_by(2).copied().collect();
    let even = fft(&even_input);
    let odd = fft(&odd_input);

    let mut result = vec![Complex { re: 0.0, im: 0.0 }; n];
    for k in 0..n / 2 {
        let angle = -2.0 * std::f64::consts::PI * k as f64 / n as f64;
        let w = Complex { re: angle.cos(), im: angle.sin() };
        let t = w * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    result
}
```

```csharp
using System.Numerics;

// 再帰的なCooley-Tukey FFT。長さは2の冪であることを前提とする
static Complex[] Fft(Complex[] a)
{
    int n = a.Length;
    if (n == 1) return a;

    var even = Fft(a.Where((_, i) => i % 2 == 0).ToArray());
    var odd = Fft(a.Where((_, i) => i % 2 == 1).ToArray());

    var result = new Complex[n];
    for (int k = 0; k < n / 2; k++)
    {
        var w = Complex.FromPolarCoordinates(1.0, -2 * Math.PI * k / n);
        var t = w * odd[k];
        result[k] = even[k] + t;
        result[k + n / 2] = even[k] - t;
    }
    return result;
}
```
