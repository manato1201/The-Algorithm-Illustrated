---
name: Schönhage-Strassenアルゴリズム(FFTベースの大数乗算)
category: 数論・暗号
subcategory: 高速演算
complexity: O(n log n log log n)
summary: 巨大な整数を多項式とみなし、[高速フーリエ変換(FFT)](/algorithms/fft)で周波数領域に変換してから要素ごとの積を取り、逆変換で畳み込み結果(=多項式の積)を復元することで、[Karatsuba法](/algorithms/karatsuba)や[Toom-Cook法](/algorithms/toom-cook-multiplication)よりもさらに漸近的に高速な乗算を実現する。
---

## 概要

[Karatsuba法](/algorithms/karatsuba)はO(n^1.585)、[Toom-Cook法](/algorithms/toom-cook-multiplication)は分割数を増やすことでさらに指数を1に近づけられるが、いずれも「分割数を増やすほど、部分積を組み合わせるオーバーヘッドも増える」というトレードオフから逃れられない。Schönhage-Strassenアルゴリズムは、1971年にアーノルド・シェーンハーゲとフォルカー・シュトラッセンが提案した、発想を根本的に変えるアプローチを取る——2つの大きな整数の掛け算は、各桁を係数とする**多項式同士の掛け算(畳み込み)** とみなせる、という observation に基づき、この畳み込みを[高速フーリエ変換(FFT)](/algorithms/fft)を使って計算する。「時間領域での畳み込みは、周波数領域では単純な要素ごとの積になる」というFFTの性質を活かすことで、O(n log n log log n)という、長らく整数乗算アルゴリズムの中で最も高速とされてきた計算量を達成した。

## 仕組み

1. 掛け合わせたい2つの大きな整数`A`, `B`を、それぞれの桁(または一定ビット幅のブロック)を係数とする多項式`A(x)`, `B(x)`とみなす(`A`の各桁が多項式の各項の係数になる)
2. 多項式`A(x)`, `B(x)`の係数列に対して、[FFT](/algorithms/fft)(通常は、桁あふれを正確に扱うため、実数ではなく特定の環上で定義された数論変換NTTが使われる)を適用し、周波数領域の表現に変換する
3. 周波数領域では、多項式の積(畳み込み)は**要素ごとの単純な掛け算**に対応する。2つの変換結果を要素ごとに掛け合わせる
4. 掛け合わせた結果に**逆FFT(逆NTT)** を適用し、時間領域(係数列)に戻す。これが`A(x)・B(x)`の係数列、つまり多項式の積である
5. 得られた係数列には、各桁の積の和がまだ**桁上がり処理をしていない状態**で入っている(各係数が1桁の範囲を超えていることがある)ため、最後に**繰り上げ処理(キャリー処理)** を行い、正しい十進(または二進)表現の整数に変換する

## 特性・トレードオフ

- **長らく理論上最速だった乗算アルゴリズム**: O(n log n log log n)という計算量は、2019年にハーヴェイとファン・デル・ホーヴェンが理論上のO(n log n)アルゴリズムを発表するまで、数十年にわたって整数乗算の漸近的な最速記録だった。実用的な多倍長演算ライブラリ(GMPなど)でも、非常に大きな数(数千〜数万ビット以上)の乗算にはSchönhage-Strassen系の手法が採用されている
- **定数倍のオーバーヘッドが大きい**: 漸近的な計算量は優れているものの、FFT(またはNTT)の実行、桁あふれを防ぐための精度管理、繰り上げ処理など、実装全体の定数倍のコストが[Karatsuba法](/algorithms/karatsuba)や[Toom-Cook法](/algorithms/toom-cook-multiplication)より大きい。このため、実用上はビット数がある閾値(実装によるが数千〜数万ビット程度)を超えた場合にのみ有利になり、多くの多倍長演算ライブラリは桁数に応じて素朴な乗算、Karatsuba法、Toom-Cook法、Schönhage-Strassen法を自動的に切り替える階層的な実装を採用している
- **数論変換(NTT)による精度問題の回避**: 実数のFFTをそのまま使うと、浮動小数点演算の丸め誤差が桁あふれ判定を狂わせるリスクがあるため、実務の実装では、有限体上で定義された「数論変換(Number Theoretic Transform)」を使うことが多い。NTTはFFTと同じアルゴリズム構造を持ちながら、整数演算だけで正確に計算できるという利点がある
- **使いどころ**: 多倍長演算ライブラリ(GMP、Y-cruncherのような円周率計算ソフトウェア)における超巨大数の乗算、[RSA](/algorithms/rsa)のような公開鍵暗号における非常に長い鍵長でのモジュラー演算の高速化、記号計算システムにおける多項式演算の高速化

## 実装例

簡略化した、FFTベースの多項式乗算(繰り上げ処理を含む整数乗算の核心部分)を示す。

```python
import cmath
import math

def fft(a: list[complex], invert: bool = False) -> list[complex]:
    n = len(a)
    if n == 1:
        return a
    even = fft(a[0::2], invert)
    odd = fft(a[1::2], invert)
    result = [0] * n
    angle_sign = -1 if not invert else 1
    for k in range(n // 2):
        w = cmath.exp(angle_sign * 2j * math.pi * k / n)
        result[k] = even[k] + w * odd[k]
        result[k + n // 2] = even[k] - w * odd[k]
    return result

def multiply_big_integers(digits_a: list[int], digits_b: list[int]) -> list[int]:
    """digits_a, digits_bは各桁(下位桁から)を並べたリスト(基数10を仮定)。"""
    n = 1
    while n < len(digits_a) + len(digits_b):
        n *= 2

    fa = [complex(d, 0) for d in digits_a] + [0] * (n - len(digits_a))
    fb = [complex(d, 0) for d in digits_b] + [0] * (n - len(digits_b))

    fa = fft(fa)
    fb = fft(fb)
    fc = [fa[i] * fb[i] for i in range(n)]
    result_complex = fft(fc, invert=True)
    result = [round(c.real / n) for c in result_complex]

    # 繰り上げ処理
    carry = 0
    for i in range(len(result)):
        result[i] += carry
        carry = result[i] // 10
        result[i] %= 10

    while carry > 0:
        result.append(carry % 10)
        carry //= 10

    while len(result) > 1 and result[-1] == 0:
        result.pop()

    return result
```

```typescript
type Complex = [number, number];

function complexMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function fft(a: Complex[], invert = false): Complex[] {
  const n = a.length;
  if (n === 1) return a;
  const even = fft(a.filter((_, i) => i % 2 === 0), invert);
  const odd = fft(a.filter((_, i) => i % 2 === 1), invert);
  const result: Complex[] = new Array(n);
  const sign = invert ? 1 : -1;
  for (let k = 0; k < n / 2; k++) {
    const angle = (sign * 2 * Math.PI * k) / n;
    const w: Complex = [Math.cos(angle), Math.sin(angle)];
    const t = complexMul(w, odd[k]);
    result[k] = [even[k][0] + t[0], even[k][1] + t[1]];
    result[k + n / 2] = [even[k][0] - t[0], even[k][1] - t[1]];
  }
  return result;
}

function multiplyBigIntegers(digitsA: number[], digitsB: number[]): number[] {
  let n = 1;
  while (n < digitsA.length + digitsB.length) n *= 2;

  const fa: Complex[] = Array.from({ length: n }, (_, i) => [digitsA[i] ?? 0, 0]);
  const fb: Complex[] = Array.from({ length: n }, (_, i) => [digitsB[i] ?? 0, 0]);

  const ta = fft(fa);
  const tb = fft(fb);
  const tc: Complex[] = ta.map((v, i) => complexMul(v, tb[i]));
  const resultComplex = fft(tc, true);
  const result = resultComplex.map(([re]) => Math.round(re / n));

  let carry = 0;
  for (let i = 0; i < result.length; i++) {
    result[i] += carry;
    carry = Math.floor(result[i] / 10);
    result[i] %= 10;
  }
  while (carry > 0) {
    result.push(carry % 10);
    carry = Math.floor(carry / 10);
  }

  return result;
}
```

```cpp
#include <vector>
#include <complex>
#include <cmath>

using Complex = std::complex<double>;

std::vector<Complex> fft(std::vector<Complex> a, bool invert) {
    int n = static_cast<int>(a.size());
    if (n == 1) return a;

    std::vector<Complex> even, odd;
    for (int i = 0; i < n; i += 2) even.push_back(a[i]);
    for (int i = 1; i < n; i += 2) odd.push_back(a[i]);
    even = fft(even, invert);
    odd = fft(odd, invert);

    std::vector<Complex> result(n);
    double sign = invert ? 1.0 : -1.0;
    for (int k = 0; k < n / 2; k++) {
        Complex w = std::polar(1.0, sign * 2 * M_PI * k / n) * odd[k];
        result[k] = even[k] + w;
        result[k + n / 2] = even[k] - w;
    }
    return result;
}

std::vector<int> multiplyBigIntegers(const std::vector<int>& digitsA, const std::vector<int>& digitsB) {
    int n = 1;
    while (n < static_cast<int>(digitsA.size() + digitsB.size())) n *= 2;

    std::vector<Complex> fa(n, 0), fb(n, 0);
    for (size_t i = 0; i < digitsA.size(); i++) fa[i] = Complex(digitsA[i], 0);
    for (size_t i = 0; i < digitsB.size(); i++) fb[i] = Complex(digitsB[i], 0);

    fa = fft(fa, false);
    fb = fft(fb, false);
    std::vector<Complex> fc(n);
    for (int i = 0; i < n; i++) fc[i] = fa[i] * fb[i];
    auto resultComplex = fft(fc, true);

    std::vector<long long> result(n);
    for (int i = 0; i < n; i++) result[i] = std::llround(resultComplex[i].real() / n);

    long long carry = 0;
    std::vector<int> digits;
    for (int i = 0; i < n || carry > 0; i++) {
        long long v = (i < n ? result[i] : 0) + carry;
        digits.push_back(static_cast<int>(v % 10));
        carry = v / 10;
    }
    return digits;
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

fn fft(a: &[Complex], invert: bool) -> Vec<Complex> {
    let n = a.len();
    if n == 1 { return a.to_vec(); }
    let even: Vec<Complex> = a.iter().step_by(2).cloned().collect();
    let odd: Vec<Complex> = a.iter().skip(1).step_by(2).cloned().collect();
    let even = fft(&even, invert);
    let odd = fft(&odd, invert);

    let sign = if invert { 1.0 } else { -1.0 };
    let mut result = vec![Complex::new(0.0, 0.0); n];
    for k in 0..n / 2 {
        let angle = sign * 2.0 * PI * k as f64 / n as f64;
        let w = Complex::new(angle.cos(), angle.sin()).mul(odd[k]);
        result[k] = even[k].add(w);
        result[k + n / 2] = even[k].sub(w);
    }
    result
}

fn multiply_big_integers(digits_a: &[i64], digits_b: &[i64]) -> Vec<i64> {
    let mut n = 1;
    while n < digits_a.len() + digits_b.len() {
        n *= 2;
    }

    let mut fa = vec![Complex::new(0.0, 0.0); n];
    let mut fb = vec![Complex::new(0.0, 0.0); n];
    for (i, &d) in digits_a.iter().enumerate() { fa[i] = Complex::new(d as f64, 0.0); }
    for (i, &d) in digits_b.iter().enumerate() { fb[i] = Complex::new(d as f64, 0.0); }

    let ta = fft(&fa, false);
    let tb = fft(&fb, false);
    let tc: Vec<Complex> = ta.iter().zip(tb.iter()).map(|(&x, &y)| x.mul(y)).collect();
    let result_complex = fft(&tc, true);

    let mut carry: i64 = 0;
    let mut digits = Vec::new();
    for i in 0..n {
        let v = (result_complex[i].re / n as f64).round() as i64 + carry;
        digits.push(v.rem_euclid(10));
        carry = v.div_euclid(10);
    }
    while carry > 0 {
        digits.push(carry % 10);
        carry /= 10;
    }
    digits
}
```

```csharp
using System.Numerics;

static Complex[] Fft(Complex[] a, bool invert)
{
    int n = a.Length;
    if (n == 1) return a;

    var even = Fft(a.Where((_, i) => i % 2 == 0).ToArray(), invert);
    var odd = Fft(a.Where((_, i) => i % 2 == 1).ToArray(), invert);

    var result = new Complex[n];
    double sign = invert ? 1.0 : -1.0;
    for (int k = 0; k < n / 2; k++)
    {
        var w = Complex.FromPolarCoordinates(1.0, sign * 2 * Math.PI * k / n) * odd[k];
        result[k] = even[k] + w;
        result[k + n / 2] = even[k] - w;
    }
    return result;
}

static List<int> MultiplyBigIntegers(int[] digitsA, int[] digitsB)
{
    int n = 1;
    while (n < digitsA.Length + digitsB.Length) n *= 2;

    var fa = new Complex[n];
    var fb = new Complex[n];
    for (int i = 0; i < digitsA.Length; i++) fa[i] = new Complex(digitsA[i], 0);
    for (int i = 0; i < digitsB.Length; i++) fb[i] = new Complex(digitsB[i], 0);

    fa = Fft(fa, false);
    fb = Fft(fb, false);
    var fc = new Complex[n];
    for (int i = 0; i < n; i++) fc[i] = fa[i] * fb[i];
    var resultComplex = Fft(fc, true);

    long carry = 0;
    var digits = new List<int>();
    for (int i = 0; i < n || carry > 0; i++)
    {
        long v = (i < n ? (long)Math.Round(resultComplex[i].Real / n) : 0) + carry;
        digits.Add((int)(((v % 10) + 10) % 10));
        carry = (long)Math.Floor(v / 10.0);
    }
    return digits;
}
```
