---
name: フォルマント合成(Formant Synthesis)
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n)(nは生成サンプル数、フォルマントフィルタ段数は定数)
summary: 声道の共鳴周波数(フォルマント)を複数の共振フィルタで直接モデル化し、声帯振動に相当するパルス列や雑音源をそこに通すことで、音声を「合成」する音源-フィルタモデルの代表手法。
---

## 概要

[線形予測符号化(LPC)](/algorithms/linear-predictive-coding)が録音済みの音声から声道特性を**分析**する手法だったのに対し、フォルマント合成はゼロから音声を**生成**するための古典的な音声合成技術である。母音は声道の形状によって決まる複数の共鳴周波数(フォルマント、通常F1・F2・F3の3つで母音の種類がほぼ決まる)を持ち、これを直接パラメータとして扱う。声帯の振動(有声音の場合はパルス列、無声音の場合は雑音)を「音源」とし、それをフォルマント周波数に同調した複数の共振フィルタ(バンドパスフィルタ)からなる「フィルタ」に通すことで音声を合成する、音源-フィルタモデル(Source-Filter Model)の直接的な実装である。1980年代のDECtalkのようなテキスト音声合成システムで広く使われ、機械的で特徴的な「ロボット声」として今も認識されている。

## 仕組み

1. **音源の生成**: 有声音(母音など)の場合、基本周波数(ピッチ)に同期したインパルス列(声帯の振動を模した鋭いパルスの繰り返し)を生成する。無声音(摩擦音など)の場合は白色雑音を音源として使う
2. **フォルマントフィルタの設計**: 合成したい母音ごとに、あらかじめ決められたフォルマント周波数(F1, F2, F3、…)とその帯域幅を持つ[双二次フィルタ](/algorithms/biquad-filter)(共振型バンドパスフィルタ)を複数用意する。例えば「あ」の音はF1が高くF2が低い、「い」の音はF1が低くF2が高いといった特徴的な組み合わせを持つ
3. 各フォルマントフィルタを**並列**(カスケード方式もある)に配置し、音源信号をそれぞれのフィルタに通す
4. 各フィルタの出力を合成(重み付き加算)し、最終的な音声波形を得る
5. 時間的に変化する発話(母音から子音への遷移など)を表現するには、フォルマント周波数・帯域幅・音源のピッチをフレームごとに滑らかに変化させながら1〜4を繰り返す

## 特性・トレードオフ

- **少数のパラメータで音声を制御できる**: フォルマント周波数という数個の数値を変化させるだけで、任意の母音・子音に近い音を作り出せる。録音した音声波形を持たずにテキストから音声を合成する、初期のテキスト音声合成(TTS)技術の基盤となった
- **機械的な音質**: 音源(単純なパルス列や雑音)とフィルタ(数個の共振器)という単純なモデルであるため、実際の人間の声が持つ複雑な微細変動(ジッタ、ブレスノイズなど)を再現しきれず、特徴的な「機械音声らしさ」が残る。現代の音声合成は、波形接続合成(録音済み音声の断片を組み合わせる)や深層学習ベースの手法(WaveNetなど)に主流が移っている
- **[線形予測符号化(LPC)](/algorithms/linear-predictive-coding)との補完関係**: LPCは録音済み音声からフォルマントに相当する情報(声道の共鳴特性)を分析的に抽出する手法であり、その分析結果をフォルマント合成のパラメータとして流用する「分析合成(Analysis-Synthesis)」システムを組むことができる
- **使いどころ**: 初期のテキスト音声合成システム(DECtalk等)、音声合成研究の教育的な題材、レトロなロボット音声の演出(ゲーム・映像制作)、音声障害を持つ人のための補助的コミュニケーション機器(AAC機器)の歴史的な実装

## 実装例

母音「あ」相当のフォルマント(F1≈700Hz, F2≈1220Hz, F3≈2600Hz)を持つ有声音を、パルス列音源+並列共振フィルタで合成する例。

```python
import math

def impulse_train(sample_rate: int, duration: float, pitch_hz: float) -> list[float]:
    n = int(sample_rate * duration)
    period = sample_rate / pitch_hz
    signal = [0.0] * n
    t = 0.0
    while t < n:
        signal[int(t)] = 1.0
        t += period
    return signal

def resonant_filter(x: list[float], sample_rate: int, freq: float, bandwidth: float) -> list[float]:
    """フォルマント周波数freq・帯域幅bandwidthの2次共振フィルタ(簡易版バンドパス)。"""
    r = math.exp(-math.pi * bandwidth / sample_rate)
    theta = 2 * math.pi * freq / sample_rate
    a1 = 2 * r * math.cos(theta)
    a2 = -r * r
    gain = (1 - r) * math.sqrt(1 - 2 * r * math.cos(2 * theta) + r * r)

    y1 = y2 = 0.0
    y = []
    for xn in x:
        yn = gain * xn + a1 * y1 + a2 * y2
        y.append(yn)
        y2, y1 = y1, yn
    return y

def formant_synthesize(sample_rate: int, duration: float, pitch_hz: float, formants: list[tuple[float, float]]) -> list[float]:
    source = impulse_train(sample_rate, duration, pitch_hz)
    output = [0.0] * len(source)
    for freq, bw in formants:
        filtered = resonant_filter(source, sample_rate, freq, bw)
        output = [o + f for o, f in zip(output, filtered)]
    return output
```

```typescript
function impulseTrain(sampleRate: number, duration: number, pitchHz: number): Float64Array {
  const n = Math.floor(sampleRate * duration);
  const period = sampleRate / pitchHz;
  const signal = new Float64Array(n);
  let t = 0;
  while (t < n) {
    signal[Math.floor(t)] = 1.0;
    t += period;
  }
  return signal;
}

function resonantFilter(x: Float64Array, sampleRate: number, freq: number, bandwidth: number): Float64Array {
  const r = Math.exp((-Math.PI * bandwidth) / sampleRate);
  const theta = (2 * Math.PI * freq) / sampleRate;
  const a1 = 2 * r * Math.cos(theta);
  const a2 = -r * r;
  const gain = (1 - r) * Math.sqrt(1 - 2 * r * Math.cos(2 * theta) + r * r);

  let y1 = 0, y2 = 0;
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const yn = gain * x[i] + a1 * y1 + a2 * y2;
    y[i] = yn;
    y2 = y1; y1 = yn;
  }
  return y;
}

function formantSynthesize(
  sampleRate: number, duration: number, pitchHz: number, formants: [number, number][],
): Float64Array {
  const source = impulseTrain(sampleRate, duration, pitchHz);
  const output = new Float64Array(source.length);
  for (const [freq, bw] of formants) {
    const filtered = resonantFilter(source, sampleRate, freq, bw);
    for (let i = 0; i < output.length; i++) output[i] += filtered[i];
  }
  return output;
}
```

```cpp
#include <vector>
#include <cmath>

std::vector<double> impulseTrain(int sampleRate, double duration, double pitchHz) {
    int n = static_cast<int>(sampleRate * duration);
    double period = sampleRate / pitchHz;
    std::vector<double> signal(n, 0.0);
    for (double t = 0; t < n; t += period) signal[static_cast<int>(t)] = 1.0;
    return signal;
}

std::vector<double> resonantFilter(const std::vector<double>& x, int sampleRate, double freq, double bandwidth) {
    double r = std::exp(-M_PI * bandwidth / sampleRate);
    double theta = 2 * M_PI * freq / sampleRate;
    double a1 = 2 * r * std::cos(theta);
    double a2 = -r * r;
    double gain = (1 - r) * std::sqrt(1 - 2 * r * std::cos(2 * theta) + r * r);

    double y1 = 0, y2 = 0;
    std::vector<double> y(x.size());
    for (size_t i = 0; i < x.size(); i++) {
        double yn = gain * x[i] + a1 * y1 + a2 * y2;
        y[i] = yn;
        y2 = y1; y1 = yn;
    }
    return y;
}

std::vector<double> formantSynthesize(
    int sampleRate, double duration, double pitchHz, const std::vector<std::pair<double, double>>& formants) {
    auto source = impulseTrain(sampleRate, duration, pitchHz);
    std::vector<double> output(source.size(), 0.0);
    for (auto& [freq, bw] : formants) {
        auto filtered = resonantFilter(source, sampleRate, freq, bw);
        for (size_t i = 0; i < output.size(); i++) output[i] += filtered[i];
    }
    return output;
}
```

```rust
fn impulse_train(sample_rate: usize, duration: f64, pitch_hz: f64) -> Vec<f64> {
    let n = (sample_rate as f64 * duration) as usize;
    let period = sample_rate as f64 / pitch_hz;
    let mut signal = vec![0.0; n];
    let mut t = 0.0;
    while (t as usize) < n {
        signal[t as usize] = 1.0;
        t += period;
    }
    signal
}

fn resonant_filter(x: &[f64], sample_rate: usize, freq: f64, bandwidth: f64) -> Vec<f64> {
    let r = (-std::f64::consts::PI * bandwidth / sample_rate as f64).exp();
    let theta = 2.0 * std::f64::consts::PI * freq / sample_rate as f64;
    let a1 = 2.0 * r * theta.cos();
    let a2 = -r * r;
    let gain = (1.0 - r) * (1.0 - 2.0 * r * (2.0 * theta).cos() + r * r).sqrt();

    let (mut y1, mut y2) = (0.0, 0.0);
    let mut y = vec![0.0; x.len()];
    for i in 0..x.len() {
        let yn = gain * x[i] + a1 * y1 + a2 * y2;
        y[i] = yn;
        y2 = y1;
        y1 = yn;
    }
    y
}

fn formant_synthesize(sample_rate: usize, duration: f64, pitch_hz: f64, formants: &[(f64, f64)]) -> Vec<f64> {
    let source = impulse_train(sample_rate, duration, pitch_hz);
    let mut output = vec![0.0; source.len()];
    for &(freq, bw) in formants {
        let filtered = resonant_filter(&source, sample_rate, freq, bw);
        for i in 0..output.len() {
            output[i] += filtered[i];
        }
    }
    output
}
```

```csharp
static double[] ImpulseTrain(int sampleRate, double duration, double pitchHz)
{
    int n = (int)(sampleRate * duration);
    double period = sampleRate / pitchHz;
    var signal = new double[n];
    for (double t = 0; t < n; t += period) signal[(int)t] = 1.0;
    return signal;
}

static double[] ResonantFilter(double[] x, int sampleRate, double freq, double bandwidth)
{
    double r = Math.Exp(-Math.PI * bandwidth / sampleRate);
    double theta = 2 * Math.PI * freq / sampleRate;
    double a1 = 2 * r * Math.Cos(theta);
    double a2 = -r * r;
    double gain = (1 - r) * Math.Sqrt(1 - 2 * r * Math.Cos(2 * theta) + r * r);

    double y1 = 0, y2 = 0;
    var y = new double[x.Length];
    for (int i = 0; i < x.Length; i++)
    {
        double yn = gain * x[i] + a1 * y1 + a2 * y2;
        y[i] = yn;
        y2 = y1; y1 = yn;
    }
    return y;
}

static double[] FormantSynthesize(int sampleRate, double duration, double pitchHz, (double freq, double bw)[] formants)
{
    var source = ImpulseTrain(sampleRate, duration, pitchHz);
    var output = new double[source.Length];
    foreach (var (freq, bw) in formants)
    {
        var filtered = ResonantFilter(source, sampleRate, freq, bw);
        for (int i = 0; i < output.Length; i++) output[i] += filtered[i];
    }
    return output;
}
```
