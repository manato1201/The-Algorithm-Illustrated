---
name: 修正離散コサイン変換(MDCT)音声符号化
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n log n)(nはブロック長、高速アルゴリズム使用時)
summary: 隣接ブロックを50%重ね合わせながらコサイン変換することで、ブロック境界の不連続ノイズを出さずに時間-周波数変換を行う、MP3/AAC/Opusなど主要音声コーデックの基盤技術。
---

## 概要

音声データを圧縮する際、[MFCC分析](/algorithms/mfcc-analysis)のような分析用途と異なり、圧縮後に**元の波形へ正確に復元できる**変換が必要になる。単純に音声をブロックに区切って離散コサイン変換(DCT)をかけると、ブロックの境界で波形が不連続になり、復元時に「ブロックノイズ」と呼ばれる耳障りなクリック音が発生する。修正離散コサイン変換(MDCT: Modified Discrete Cosine Transform)は、**隣接するブロックを50%重ね合わせながら変換する**という工夫により、各ブロックの変換・逆変換だけでは音が正しく復元されないが、**隣接ブロック同士を足し合わせる(重ね合わせ加算)ことで元の波形が完全に復元される**という性質(Time Domain Aliasing Cancellation、TDAC)を持つ。この性質のおかげでブロック境界のノイズが理論的に消え、MP3・AAC・Vorbis・Opusなど主要な非可逆音声コーデックの周波数変換部分として採用されている。

## 仕組み

1. 音声波形を、長さ`2N`のブロックに、**隣接ブロックが50%(`N`サンプル分)重なる**ように分割する
2. 各ブロックに窓関数(サイン窓など、TDACの性質を満たすよう設計された窓)を適用する。窓関数は「ブロックの前半と後半の窓が滑らかにフェードイン/フェードアウトする」形状を持つ
3. 窓をかけた`2N`サンプルのブロックに対し、**MDCT変換**を適用し、`N`個の周波数係数を得る(入力`2N`点に対して出力が`N`点という、通常のDCTにはない「臨界サンプリング」の性質を持つ——情報量を増やさずに周波数領域へ変換できる)
4. 符号化時はこの`N`個の周波数係数を量子化・エントロピー符号化して圧縮する(MP3やAACではこの量子化ステップに人間の聴覚心理モデルを利用し、聞こえにくい周波数成分をより粗く量子化する)
5. 復号時は各ブロックに**逆MDCT(IMDCT)** をかけて`2N`サンプルを復元し、隣接するブロック同士の重なり部分を足し合わせる(Overlap-Add)。この足し合わせにより、各ブロック単体では復元しきれなかった成分(エイリアシング)が打ち消し合い、元の波形が正確に(非可逆圧縮による量子化誤差を除けば)復元される

## 特性・トレードオフ

- **ブロックノイズの理論的な解消**: TDAC(時間領域エイリアシングの打ち消し)により、ブロック境界での不連続が原理的に発生しない。単純なブロック分割DCTでは避けられない問題を、変換方式そのものの数学的性質で解決している
- **臨界サンプリング(情報量を増やさない変換)**: 50%重なり合う`2N`点の入力から`N`点の出力しか得られないにもかかわらず、隣接ブロックの情報と組み合わせることで完全な復元が可能という性質は、データ量を増やさずに周波数領域の分析能力を得られることを意味し、圧縮効率に直結する
- **符号化の遅延**: 現在のブロックを正しく復元するには次のブロックの情報も必要になるため、MDCTベースのコーデックには構造的に一定の符号化遅延(レイテンシ)が生じる。Opusのように低遅延が求められる用途では、ブロック長を短くするなどの工夫でこの遅延を抑える設計が取られる
- **使いどころ**: MP3・AAC・Vorbis・Opus・Dolby Digital(AC-3)など、ほぼ全ての主要な非可逆音声コーデックの周波数変換部、動画コーデックの音声トラック圧縮、音楽ストリーミングサービスの配信フォーマット

## 実装例

窓関数(サイン窓)の適用、MDCT/IMDCT、Overlap-Addによる完全な波形復元までの一連の流れを示す。

```python
import math

def sine_window(n: int) -> list[float]:
    return [math.sin(math.pi / (2 * n) * (i + 0.5)) for i in range(2 * n)]

def mdct(x: list[float]) -> list[float]:
    """長さ2Nの入力からN個の周波数係数を得る(直接計算、O(N^2))。"""
    n = len(x) // 2
    coeffs = []
    for k in range(n):
        s = sum(
            x[i] * math.cos((math.pi / n) * (i + 0.5 + n / 2) * (k + 0.5))
            for i in range(2 * n)
        )
        coeffs.append(s)
    return coeffs

def imdct(coeffs: list[float]) -> list[float]:
    """N個の周波数係数から長さ2Nの時間領域信号を復元する(スケーリングは省略した単純形)。"""
    n = len(coeffs)
    out = []
    for i in range(2 * n):
        s = sum(
            coeffs[k] * math.cos((math.pi / n) * (i + 0.5 + n / 2) * (k + 0.5))
            for k in range(n)
        )
        out.append(s / n)
    return out

def mdct_encode_decode(signal: list[float], block_size: int) -> list[float]:
    """50%オーバーラップでMDCT→IMDCT→Overlap-Addを行い、元の波形を復元する。"""
    n = block_size
    window = sine_window(n)
    hop = n
    output = [0.0] * (len(signal) + 2 * n)

    pos = 0
    while pos + 2 * n <= len(signal) + 2 * n:
        block = [(signal[pos + i] if pos + i < len(signal) else 0.0) * window[i] for i in range(2 * n)]
        coeffs = mdct(block)
        reconstructed = imdct(coeffs)
        for i in range(2 * n):
            if pos + i < len(output):
                output[pos + i] += reconstructed[i] * window[i]
        pos += hop
        if pos >= len(signal):
            break
    return output[:len(signal)]
```

```typescript
function sineWindow(n: number): number[] {
  return Array.from({ length: 2 * n }, (_, i) => Math.sin((Math.PI / (2 * n)) * (i + 0.5)));
}

function mdct(x: number[]): number[] {
  const n = x.length / 2;
  const coeffs: number[] = [];
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < 2 * n; i++) {
      s += x[i] * Math.cos((Math.PI / n) * (i + 0.5 + n / 2) * (k + 0.5));
    }
    coeffs.push(s);
  }
  return coeffs;
}

function imdct(coeffs: number[]): number[] {
  const n = coeffs.length;
  const out: number[] = [];
  for (let i = 0; i < 2 * n; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      s += coeffs[k] * Math.cos((Math.PI / n) * (i + 0.5 + n / 2) * (k + 0.5));
    }
    out.push(s / n);
  }
  return out;
}
```

```cpp
#include <vector>
#include <cmath>

std::vector<double> sineWindow(int n) {
    std::vector<double> w(2 * n);
    for (int i = 0; i < 2 * n; i++) w[i] = std::sin(M_PI / (2 * n) * (i + 0.5));
    return w;
}

std::vector<double> mdct(const std::vector<double>& x) {
    int n = static_cast<int>(x.size()) / 2;
    std::vector<double> coeffs(n);
    for (int k = 0; k < n; k++) {
        double s = 0.0;
        for (int i = 0; i < 2 * n; i++) {
            s += x[i] * std::cos(M_PI / n * (i + 0.5 + n / 2.0) * (k + 0.5));
        }
        coeffs[k] = s;
    }
    return coeffs;
}

std::vector<double> imdct(const std::vector<double>& coeffs) {
    int n = static_cast<int>(coeffs.size());
    std::vector<double> out(2 * n);
    for (int i = 0; i < 2 * n; i++) {
        double s = 0.0;
        for (int k = 0; k < n; k++) {
            s += coeffs[k] * std::cos(M_PI / n * (i + 0.5 + n / 2.0) * (k + 0.5));
        }
        out[i] = s / n;
    }
    return out;
}
```

```rust
fn sine_window(n: usize) -> Vec<f64> {
    (0..2 * n)
        .map(|i| (std::f64::consts::PI / (2.0 * n as f64) * (i as f64 + 0.5)).sin())
        .collect()
}

fn mdct(x: &[f64]) -> Vec<f64> {
    let n = x.len() / 2;
    (0..n)
        .map(|k| {
            (0..2 * n)
                .map(|i| {
                    x[i] * (std::f64::consts::PI / n as f64 * (i as f64 + 0.5 + n as f64 / 2.0) * (k as f64 + 0.5)).cos()
                })
                .sum()
        })
        .collect()
}

fn imdct(coeffs: &[f64]) -> Vec<f64> {
    let n = coeffs.len();
    (0..2 * n)
        .map(|i| {
            let s: f64 = (0..n)
                .map(|k| {
                    coeffs[k] * (std::f64::consts::PI / n as f64 * (i as f64 + 0.5 + n as f64 / 2.0) * (k as f64 + 0.5)).cos()
                })
                .sum();
            s / n as f64
        })
        .collect()
}
```

```csharp
static double[] SineWindow(int n)
{
    var w = new double[2 * n];
    for (int i = 0; i < 2 * n; i++) w[i] = Math.Sin(Math.PI / (2 * n) * (i + 0.5));
    return w;
}

static double[] Mdct(double[] x)
{
    int n = x.Length / 2;
    var coeffs = new double[n];
    for (int k = 0; k < n; k++)
    {
        double s = 0;
        for (int i = 0; i < 2 * n; i++)
            s += x[i] * Math.Cos(Math.PI / n * (i + 0.5 + n / 2.0) * (k + 0.5));
        coeffs[k] = s;
    }
    return coeffs;
}

static double[] Imdct(double[] coeffs)
{
    int n = coeffs.Length;
    var out1 = new double[2 * n];
    for (int i = 0; i < 2 * n; i++)
    {
        double s = 0;
        for (int k = 0; k < n; k++)
            s += coeffs[k] * Math.Cos(Math.PI / n * (i + 0.5 + n / 2.0) * (k + 0.5));
        out1[i] = s / n;
    }
    return out1;
}
```
