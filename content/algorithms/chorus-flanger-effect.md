---
name: コーラス/フランジャーエフェクト(可変遅延ディレイライン)
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nはサンプル数)
summary: LFO(低周波発振器)で遅延時間を周期的に揺らしながら原音とミックスすることで、複数人が同時に演奏しているような広がり(コーラス)や、金属的にうねる音色(フランジャー)を作り出す。
---

## 概要

[双二次フィルタ](/algorithms/biquad-filter)や[シュレーダーリバーブ](/algorithms/schroeder-reverb)が周波数特性や残響を扱うのに対し、コーラス・フランジャーは**時間方向の揺らぎ**を使ったエフェクトである。両者は同じ基本構造(可変長ディレイライン)を共有しており、遅延時間の設定範囲だけが異なる。コーラスは数ミリ秒〜数十ミリ秒の遅延を緩やかに揺らすことで「同じ演奏を複数人が同時に奏でているような」広がりと厚みを作り出し、フランジャーはさらに短い遅延(1ミリ秒未満〜数ミリ秒)を使うことで、原音と遅延音の間で特定の周波数が打ち消し合うくし形フィルタ効果が生まれ、金属的な「シュワシュワ」といった特徴的なうねりの音色を作る。ギター・シンセサイザーのエフェクトとして音楽制作で広く使われている。

## 仕組み

1. **LFO(Low Frequency Oscillator)** を用意する。これは可聴域よりずっと低い周波数(0.1Hz〜数Hz程度)で振動するサイン波などの発振器で、時間`t`に応じて遅延時間を変調するために使う
2. 現在時刻`t`における遅延時間を`delay(t) = base_delay + depth・LFO(t)`のように計算する。`base_delay`は基準の遅延量、`depth`は揺らぎの深さを表す
3. 入力信号`x[n]`に対して、`delay(t)`サンプル分だけ遅らせた値を取得する。遅延量が整数サンプルとは限らないため、隣接する2サンプル間を線形補間して非整数遅延を扱う(補間なしだと折れ線状のノイズが乗る)
4. 原音`x[n]`と、遅延させた信号を一定の割合でミックス(加算)し、出力`y[n] = x[n] + g・x[n - delay(t)]`を得る(`g`はミックス比)
5. フランジャーの場合はさらに、遅延信号を出力に戻す**フィードバック**(`y[n] = x[n] + g・(x[n-delay(t)] + f・y[n-delay(t)])`)を加えることで、くし形フィルタの効果をより強調することが多い

## 特性・トレードオフ

- **1つの回路構造で複数のエフェクトを表現できる**: 可変遅延ディレイラインという同一の仕組みが、遅延時間・深さ・フィードバックの設定次第でコーラス、フランジャー、さらに遅延を長くすればディレイ(エコー)やビブラート(ミックスなしで遅延音だけ出力)にもなる。パラメータの違いだけで多様な音響効果を統一的に実装できる
- **非整数遅延の補間精度がノイズの少なさを左右する**: LFOで連続的に変化する遅延時間はサンプル単位の整数値になるとは限らず、線形補間(または、より高品質な三次補間)で滑らかにサンプルを取得する必要がある。補間を怠るとクリック音やジッタが乗る
- **フィードバックの安定性**: フランジャーでフィードバック`f`を1に近づけるほど効果が強調される反面、`|f|`が1以上になると発振(音が無限に増幅され続ける)してしまうため、実装では`f`の範囲を制限する必要がある
- **使いどころ**: ギター・シンセサイザーのエフェクトペダル/プラグイン、楽曲制作における音の広がり・厚みの演出、ゲームオーディオでの環境音のバリエーション表現(同じ効果音を複数回鳴らす代わりにコーラスをかけて厚みを出す)

## 実装例

```python
import math

def lfo(t: float, rate_hz: float) -> float:
    return math.sin(2 * math.pi * rate_hz * t)

def interpolated_sample(buffer: list[float], delay_samples: float) -> float:
    idx = len(buffer) - 1 - delay_samples
    idx0 = int(idx)
    frac = idx - idx0
    if idx0 < 0 or idx0 + 1 >= len(buffer):
        return 0.0
    return buffer[idx0] * (1 - frac) + buffer[idx0 + 1] * frac

def chorus_effect(
    x: list[float], sample_rate: int, base_delay_ms: float = 20.0,
    depth_ms: float = 5.0, rate_hz: float = 0.5, mix: float = 0.5,
) -> list[float]:
    max_delay_samples = int((base_delay_ms + depth_ms) / 1000 * sample_rate) + 2
    history: list[float] = [0.0] * max_delay_samples
    output = []
    for n, xn in enumerate(x):
        history.append(xn)
        t = n / sample_rate
        delay_ms = base_delay_ms + depth_ms * lfo(t, rate_hz)
        delay_samples = delay_ms / 1000 * sample_rate
        delayed = interpolated_sample(history, delay_samples)
        output.append(xn + mix * delayed)
        if len(history) > max_delay_samples:
            history.pop(0)
    return output
```

```typescript
function lfo(t: number, rateHz: number): number {
  return Math.sin(2 * Math.PI * rateHz * t);
}

function interpolatedSample(buffer: number[], delaySamples: number): number {
  const idx = buffer.length - 1 - delaySamples;
  const idx0 = Math.floor(idx);
  const frac = idx - idx0;
  if (idx0 < 0 || idx0 + 1 >= buffer.length) return 0;
  return buffer[idx0] * (1 - frac) + buffer[idx0 + 1] * frac;
}

function chorusEffect(
  x: number[],
  sampleRate: number,
  baseDelayMs = 20.0,
  depthMs = 5.0,
  rateHz = 0.5,
  mix = 0.5,
): number[] {
  const maxDelaySamples =
    Math.floor(((baseDelayMs + depthMs) / 1000) * sampleRate) + 2;
  const history: number[] = new Array(maxDelaySamples).fill(0);
  const output: number[] = [];
  for (let n = 0; n < x.length; n++) {
    history.push(x[n]);
    const t = n / sampleRate;
    const delayMs = baseDelayMs + depthMs * lfo(t, rateHz);
    const delaySamples = (delayMs / 1000) * sampleRate;
    const delayed = interpolatedSample(history, delaySamples);
    output.push(x[n] + mix * delayed);
    if (history.length > maxDelaySamples) history.shift();
  }
  return output;
}
```

```cpp
#include <vector>
#include <cmath>
#include <deque>

double lfo(double t, double rateHz) { return std::sin(2 * M_PI * rateHz * t); }

double interpolatedSample(const std::deque<double>& buffer, double delaySamples) {
    double idx = static_cast<double>(buffer.size()) - 1 - delaySamples;
    int idx0 = static_cast<int>(idx);
    double frac = idx - idx0;
    if (idx0 < 0 || idx0 + 1 >= static_cast<int>(buffer.size())) return 0.0;
    return buffer[idx0] * (1 - frac) + buffer[idx0 + 1] * frac;
}

std::vector<double> chorusEffect(
    const std::vector<double>& x, int sampleRate, double baseDelayMs = 20.0,
    double depthMs = 5.0, double rateHz = 0.5, double mix = 0.5) {
    int maxDelaySamples = static_cast<int>((baseDelayMs + depthMs) / 1000 * sampleRate) + 2;
    std::deque<double> history(maxDelaySamples, 0.0);
    std::vector<double> output;
    for (size_t n = 0; n < x.size(); n++) {
        history.push_back(x[n]);
        double t = static_cast<double>(n) / sampleRate;
        double delayMs = baseDelayMs + depthMs * lfo(t, rateHz);
        double delaySamples = delayMs / 1000 * sampleRate;
        double delayed = interpolatedSample(history, delaySamples);
        output.push_back(x[n] + mix * delayed);
        if (static_cast<int>(history.size()) > maxDelaySamples) history.pop_front();
    }
    return output;
}
```

```rust
use std::collections::VecDeque;

fn lfo(t: f64, rate_hz: f64) -> f64 {
    (2.0 * std::f64::consts::PI * rate_hz * t).sin()
}

fn interpolated_sample(buffer: &VecDeque<f64>, delay_samples: f64) -> f64 {
    let idx = buffer.len() as f64 - 1.0 - delay_samples;
    let idx0 = idx as i64;
    let frac = idx - idx0 as f64;
    if idx0 < 0 || (idx0 as usize) + 1 >= buffer.len() {
        return 0.0;
    }
    buffer[idx0 as usize] * (1.0 - frac) + buffer[idx0 as usize + 1] * frac
}

fn chorus_effect(x: &[f64], sample_rate: usize, base_delay_ms: f64, depth_ms: f64, rate_hz: f64, mix: f64) -> Vec<f64> {
    let max_delay_samples = ((base_delay_ms + depth_ms) / 1000.0 * sample_rate as f64) as usize + 2;
    let mut history: VecDeque<f64> = VecDeque::from(vec![0.0; max_delay_samples]);
    let mut output = Vec::with_capacity(x.len());
    for (n, &xn) in x.iter().enumerate() {
        history.push_back(xn);
        let t = n as f64 / sample_rate as f64;
        let delay_ms = base_delay_ms + depth_ms * lfo(t, rate_hz);
        let delay_samples = delay_ms / 1000.0 * sample_rate as f64;
        let delayed = interpolated_sample(&history, delay_samples);
        output.push(xn + mix * delayed);
        if history.len() > max_delay_samples {
            history.pop_front();
        }
    }
    output
}
```

```csharp
static double Lfo(double t, double rateHz) => Math.Sin(2 * Math.PI * rateHz * t);

static double InterpolatedSample(List<double> buffer, double delaySamples)
{
    double idx = buffer.Count - 1 - delaySamples;
    int idx0 = (int)idx;
    double frac = idx - idx0;
    if (idx0 < 0 || idx0 + 1 >= buffer.Count) return 0.0;
    return buffer[idx0] * (1 - frac) + buffer[idx0 + 1] * frac;
}

static double[] ChorusEffect(double[] x, int sampleRate, double baseDelayMs = 20.0, double depthMs = 5.0, double rateHz = 0.5, double mix = 0.5)
{
    int maxDelaySamples = (int)((baseDelayMs + depthMs) / 1000 * sampleRate) + 2;
    var history = new List<double>(new double[maxDelaySamples]);
    var output = new double[x.Length];
    for (int n = 0; n < x.Length; n++)
    {
        history.Add(x[n]);
        double t = (double)n / sampleRate;
        double delayMs = baseDelayMs + depthMs * Lfo(t, rateHz);
        double delaySamples = delayMs / 1000 * sampleRate;
        double delayed = InterpolatedSample(history, delaySamples);
        output[n] = x[n] + mix * delayed;
        if (history.Count > maxDelaySamples) history.RemoveAt(0);
    }
    return output;
}
```
