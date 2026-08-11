---
name: メル周波数ケプストラム係数(MFCC)分析
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n log n)(nはフレームのサンプル数、FFTに依存)
summary: 人間の聴覚特性(メル尺度)に合わせた周波数フィルタバンクとケプストラム変換で、音声波形から少数の特徴量に要約する音声認識・話者識別の標準的な前処理。
---

## 概要

[線形予測符号化(LPC)](/algorithms/linear-predictive-coding)は声道を線形予測モデルとして捉えるが、音声認識や話者識別のような機械学習タスクの入力特徴量としては、**人間の聴覚がどう周波数を知覚するか**を反映した表現の方が有効であることが経験的に知られている。人間の耳は低い周波数の違いには敏感だが、高い周波数になるほど違いを区別しにくくなる(この非線形な知覚尺度を「メル尺度」と呼ぶ)。メル周波数ケプストラム係数(MFCC)は、音声のパワースペクトルをメル尺度に沿ったフィルタバンクで圧縮し、さらに離散コサイン変換(DCT)で相関を落としてから少数の係数(典型的には12〜13次元)に要約する。深層学習以前の音声認識システムのほぼ標準的な特徴量であり、現在も音声・話者認識の前処理として広く使われている。

## 仕組み

1. 音声波形を短いフレーム(20〜30ms程度、フレーム間はオーバーラップさせる)に分割し、各フレームに窓関数(ハミング窓など)をかける
2. 各フレームに**高速フーリエ変換(FFT)**を適用し、周波数ごとのパワースペクトルを求める
3. パワースペクトルに**メルフィルタバンク**(周波数軸をメル尺度で等間隔に配置した三角形フィルタ群、典型的には20〜40本)を適用し、各フィルタの出力(そのメル帯域のエネルギー)を求める。メル尺度`mel(f) = 2595・log10(1 + f/700)`により、低周波数域では密に、高周波数域では粗くフィルタが配置される
4. 各フィルタバンク出力の対数を取る(人間の音量知覚が対数的であることに対応)
5. 対数フィルタバンクエネルギーの列に**離散コサイン変換(DCT)**を適用し、低次の係数(通常12〜13個)だけを取り出す。DCTによって隣接フィルタ間の相関(フィルタバンクは重なり合っているため相関が強い)が圧縮され、少数の係数に情報が集約される
6. 1〜5を全フレームに適用し、フレームごとのMFCCベクトル列(音声全体の特徴量系列)を得る

## 特性・トレードオフ

- **聴覚特性に基づく圧縮**: メル尺度のフィルタバンクにより、人間の聴覚が敏感な低周波数域の情報を優先的に保持しつつ、次元数を大きく削減できる。音声認識・話者識別のタスクにおいて、生の周波数スペクトルより識別性能が高くなることが経験的に知られている
- **DCTによる次元圧縮とデコリレーション**: フィルタバンクは隣接する帯域が重なり合うため出力間に強い相関があるが、DCTを通すことでこの相関を落とし、少数の係数(第0次は全体のエネルギー、以降は周波数の粗さを表す)にまとめられる。これにより、対角共分散行列を仮定するようなシンプルな統計モデル(混合ガウスモデルなど)とも相性が良かった
- **チャネル・ノイズへの頑健性の限界**: MFCCは背景ノイズやマイク特性の変化に弱い面があり、深層学習ベースの音声認識では生のスペクトログラムやメルスペクトログラムをニューラルネットワークに直接入力する手法(MFCCの手作業的な圧縮ステップを省く)も広く使われるようになっている
- **使いどころ**: 音声認識(隠れマルコフモデル/深層学習ベース双方の前処理)、話者識別・話者照合、音楽ジャンル分類、音響イベント検出の特徴量抽出

## 実装例

```python
import numpy as np

def hz_to_mel(f: float) -> float:
    return 2595.0 * np.log10(1.0 + f / 700.0)

def mel_to_hz(m: float) -> float:
    return 700.0 * (10 ** (m / 2595.0) - 1.0)

def mel_filterbank(n_filters: int, n_fft: int, sample_rate: int) -> np.ndarray:
    mel_min, mel_max = hz_to_mel(0), hz_to_mel(sample_rate / 2)
    mel_points = np.linspace(mel_min, mel_max, n_filters + 2)
    hz_points = mel_to_hz(mel_points)
    bin_points = np.floor((n_fft + 1) * hz_points / sample_rate).astype(int)

    filters = np.zeros((n_filters, n_fft // 2 + 1))
    for i in range(1, n_filters + 1):
        left, center, right = bin_points[i - 1], bin_points[i], bin_points[i + 1]
        for k in range(left, center):
            if center > left:
                filters[i - 1, k] = (k - left) / (center - left)
        for k in range(center, right):
            if right > center:
                filters[i - 1, k] = (right - k) / (right - center)
    return filters

def dct_ii(x: np.ndarray, n_coeffs: int) -> np.ndarray:
    n = len(x)
    result = np.zeros(n_coeffs)
    for k in range(n_coeffs):
        s = sum(x[i] * np.cos(np.pi / n * (i + 0.5) * k) for i in range(n))
        result[k] = s
    return result

def mfcc(frame: np.ndarray, sample_rate: int, n_filters: int = 26, n_coeffs: int = 13) -> np.ndarray:
    n_fft = len(frame)
    windowed = frame * np.hamming(n_fft)
    spectrum = np.abs(np.fft.rfft(windowed)) ** 2
    filters = mel_filterbank(n_filters, n_fft, sample_rate)
    filter_energy = filters @ spectrum
    log_energy = np.log(np.maximum(filter_energy, 1e-10))
    return dct_ii(log_energy, n_coeffs)
```

```typescript
function hzToMel(f: number): number {
  return 2595 * Math.log10(1 + f / 700);
}

function melToHz(m: number): number {
  return 700 * (10 ** (m / 2595) - 1);
}

function melFilterbank(
  nFilters: number,
  nFft: number,
  sampleRate: number,
): number[][] {
  const melMin = hzToMel(0);
  const melMax = hzToMel(sampleRate / 2);
  const melPoints = Array.from(
    { length: nFilters + 2 },
    (_, i) => melMin + ((melMax - melMin) * i) / (nFilters + 1),
  );
  const hzPoints = melPoints.map(melToHz);
  const binPoints = hzPoints.map((hz) =>
    Math.floor(((nFft + 1) * hz) / sampleRate),
  );

  const filters: number[][] = Array.from({ length: nFilters }, () =>
    new Array(Math.floor(nFft / 2) + 1).fill(0),
  );
  for (let i = 1; i <= nFilters; i++) {
    const [left, center, right] = [
      binPoints[i - 1],
      binPoints[i],
      binPoints[i + 1],
    ];
    for (let k = left; k < center; k++)
      if (center > left) filters[i - 1][k] = (k - left) / (center - left);
    for (let k = center; k < right; k++)
      if (right > center) filters[i - 1][k] = (right - k) / (right - center);
  }
  return filters;
}

function dctII(x: number[], nCoeffs: number): number[] {
  const n = x.length;
  const result = new Array(nCoeffs).fill(0);
  for (let k = 0; k < nCoeffs; k++) {
    let s = 0;
    for (let i = 0; i < n; i++)
      s += x[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    result[k] = s;
  }
  return result;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

double hzToMel(double f) { return 2595.0 * std::log10(1.0 + f / 700.0); }
double melToHz(double m) { return 700.0 * (std::pow(10.0, m / 2595.0) - 1.0); }

std::vector<std::vector<double>> melFilterbank(int nFilters, int nFft, int sampleRate) {
    double melMin = hzToMel(0), melMax = hzToMel(sampleRate / 2.0);
    std::vector<double> melPoints(nFilters + 2), hzPoints(nFilters + 2);
    std::vector<int> binPoints(nFilters + 2);
    for (int i = 0; i < nFilters + 2; i++) {
        melPoints[i] = melMin + (melMax - melMin) * i / (nFilters + 1);
        hzPoints[i] = melToHz(melPoints[i]);
        binPoints[i] = static_cast<int>(std::floor((nFft + 1) * hzPoints[i] / sampleRate));
    }
    std::vector<std::vector<double>> filters(nFilters, std::vector<double>(nFft / 2 + 1, 0.0));
    for (int i = 1; i <= nFilters; i++) {
        int left = binPoints[i - 1], center = binPoints[i], right = binPoints[i + 1];
        for (int k = left; k < center; k++) if (center > left) filters[i - 1][k] = double(k - left) / (center - left);
        for (int k = center; k < right; k++) if (right > center) filters[i - 1][k] = double(right - k) / (right - center);
    }
    return filters;
}

std::vector<double> dctII(const std::vector<double>& x, int nCoeffs) {
    int n = static_cast<int>(x.size());
    std::vector<double> result(nCoeffs, 0.0);
    for (int k = 0; k < nCoeffs; k++) {
        double s = 0.0;
        for (int i = 0; i < n; i++) s += x[i] * std::cos(M_PI / n * (i + 0.5) * k);
        result[k] = s;
    }
    return result;
}
```

```rust
fn hz_to_mel(f: f64) -> f64 {
    2595.0 * (1.0 + f / 700.0).log10()
}

fn mel_to_hz(m: f64) -> f64 {
    700.0 * (10f64.powf(m / 2595.0) - 1.0)
}

fn mel_filterbank(n_filters: usize, n_fft: usize, sample_rate: f64) -> Vec<Vec<f64>> {
    let mel_min = hz_to_mel(0.0);
    let mel_max = hz_to_mel(sample_rate / 2.0);
    let mel_points: Vec<f64> = (0..n_filters + 2)
        .map(|i| mel_min + (mel_max - mel_min) * i as f64 / (n_filters + 1) as f64)
        .collect();
    let hz_points: Vec<f64> = mel_points.iter().map(|&m| mel_to_hz(m)).collect();
    let bin_points: Vec<usize> = hz_points
        .iter()
        .map(|&hz| (((n_fft + 1) as f64 * hz / sample_rate).floor()) as usize)
        .collect();

    let mut filters = vec![vec![0.0; n_fft / 2 + 1]; n_filters];
    for i in 1..=n_filters {
        let (left, center, right) = (bin_points[i - 1], bin_points[i], bin_points[i + 1]);
        for k in left..center {
            if center > left {
                filters[i - 1][k] = (k - left) as f64 / (center - left) as f64;
            }
        }
        for k in center..right {
            if right > center {
                filters[i - 1][k] = (right - k) as f64 / (right - center) as f64;
            }
        }
    }
    filters
}

fn dct_ii(x: &[f64], n_coeffs: usize) -> Vec<f64> {
    let n = x.len();
    (0..n_coeffs)
        .map(|k| {
            (0..n)
                .map(|i| x[i] * (std::f64::consts::PI / n as f64 * (i as f64 + 0.5) * k as f64).cos())
                .sum()
        })
        .collect()
}
```

```csharp
static double HzToMel(double f) => 2595.0 * Math.Log10(1.0 + f / 700.0);
static double MelToHz(double m) => 700.0 * (Math.Pow(10.0, m / 2595.0) - 1.0);

static double[][] MelFilterbank(int nFilters, int nFft, int sampleRate)
{
    double melMin = HzToMel(0), melMax = HzToMel(sampleRate / 2.0);
    var melPoints = new double[nFilters + 2];
    var hzPoints = new double[nFilters + 2];
    var binPoints = new int[nFilters + 2];
    for (int i = 0; i < nFilters + 2; i++)
    {
        melPoints[i] = melMin + (melMax - melMin) * i / (nFilters + 1);
        hzPoints[i] = MelToHz(melPoints[i]);
        binPoints[i] = (int)Math.Floor((nFft + 1) * hzPoints[i] / sampleRate);
    }
    var filters = new double[nFilters][];
    for (int i = 0; i < nFilters; i++) filters[i] = new double[nFft / 2 + 1];
    for (int i = 1; i <= nFilters; i++)
    {
        int left = binPoints[i - 1], center = binPoints[i], right = binPoints[i + 1];
        for (int k = left; k < center; k++) if (center > left) filters[i - 1][k] = (double)(k - left) / (center - left);
        for (int k = center; k < right; k++) if (right > center) filters[i - 1][k] = (double)(right - k) / (right - center);
    }
    return filters;
}

static double[] DctII(double[] x, int nCoeffs)
{
    int n = x.Length;
    var result = new double[nCoeffs];
    for (int k = 0; k < nCoeffs; k++)
    {
        double s = 0;
        for (int i = 0; i < n; i++) s += x[i] * Math.Cos(Math.PI / n * (i + 0.5) * k);
        result[k] = s;
    }
    return result;
}
```
