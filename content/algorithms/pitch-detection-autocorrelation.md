---
name: 自己相関法によるピッチ検出
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n²)(nはフレーム長、直接計算の場合)
summary: 音声信号を少しずつずらしながら自分自身との相関を取り、最も強く相関するずらし幅(周期)から基本周波数(ピッチ)を推定する、音声・音楽解析の基礎技術。
---

## 概要

声の高さ(ピッチ)を数値として取り出すことは、[フォルマント合成](/algorithms/formant-synthesis)の音源生成、音程を検出するチューナーアプリ、カラオケの採点システムなど、音声・音楽処理の多くの場面で必要になる。ピッチとは声帯やギターの弦が振動する周波数(基本周波数)のことで、波形そのものは複数の倍音が重なった複雑な形をしているが、**波形は基本周期ごとにほぼ同じ形を繰り返す**という性質を持つ。自己相関法は、信号を時間方向に少しずつずらしながら「元の信号とどれだけ似ているか(相関)」を計算し、相関が最も強くなるずらし幅(ラグ)を基本周期として検出する、直感的で実装が容易なピッチ検出手法である。

## 仕組み

1. 音声信号を短いフレーム(ピッチ検出したい区間、数十ms程度)に切り出す
2. 想定するピッチの範囲(例えば人の声なら80Hz〜400Hz程度)に対応するラグ(ずらしサンプル数)の範囲を計算する。ラグ`τ`はサンプリング周波数を候補周波数で割ることで求まる
3. 各ラグ`τ`について、**自己相関関数**`R(τ) = Σ_n x[n]・x[n+τ]`を計算する。これは「信号を`τ`サンプルずらしたものと、元の信号がどれだけ似ているか」を表す
4. `R(τ)`が最大になる`τ`(ただし`τ=0`は必ず最大になるため除外し、想定周波数範囲内で最初の明確なピーク)を探す。このラグが信号の基本周期に対応する
5. 求めたラグ`τ`から基本周波数を`f0 = サンプリング周波数 / τ`として求める
6. 実務では、正規化した自己相関(振幅の大きさに依存しないようにする)や、倍音周期での誤検出(オクターブエラー)を避けるための後処理(候補ピークの中から最も低い周波数を優先するなど)が併用される

## 特性・トレードオフ

- **時間領域での直接的な計算**: FFTのような周波数領域への変換を必要とせず、時間領域の波形から直接ピッチを推定できるため、実装が単純でアルゴリズムの動作を追いやすい
- **計算量とラグ範囲のトレードオフ**: 素朴な実装ではフレーム長`n`とラグの範囲の積に比例した計算量がかかる。低いピッチ(長い周期)まで検出しようとするほどラグの探索範囲が広がり、計算コストが増える。実務ではFFTを使って自己相関を高速に計算する(ウィーナー・ヒンチンの定理により、自己相関はパワースペクトルの逆フーリエ変換として計算できる)ことでO(n log n)に落とすことも多い
- **オクターブエラーという典型的な失敗モード**: 基本周波数の整数倍・分数倍のラグでも相関が強く出ることがあり、真の基本周波数の2倍や半分の値を誤検出する「オクターブエラー」が起きやすい。YIN法などの改良版自己相関法は、この問題を軽減するための正規化や差分関数を導入している
- **使いどころ**: 楽器チューナー・声のピッチ検出アプリ、カラオケ採点システム、音声合成のための音源ピッチ推定、音楽情報検索(メロディ抽出)、ボーカルのオートチューン処理

## 実装例

```python
def autocorrelation_pitch(
    frame: list[float], sample_rate: int, min_freq: float = 80.0, max_freq: float = 400.0,
) -> float:
    min_lag = int(sample_rate / max_freq)
    max_lag = int(sample_rate / min_freq)
    n = len(frame)

    best_lag = min_lag
    best_corr = float("-inf")
    for lag in range(min_lag, min(max_lag, n - 1) + 1):
        corr = sum(frame[i] * frame[i + lag] for i in range(n - lag))
        if corr > best_corr:
            best_corr = corr
            best_lag = lag

    return sample_rate / best_lag if best_lag > 0 else 0.0
```

```typescript
function autocorrelationPitch(
  frame: Float64Array,
  sampleRate: number,
  minFreq = 80.0,
  maxFreq = 400.0,
): number {
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);
  const n = frame.length;

  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= Math.min(maxLag, n - 1); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += frame[i] * frame[i + lag];
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : 0;
}
```

```cpp
#include <vector>
#include <limits>
#include <algorithm>

double autocorrelationPitch(const std::vector<double>& frame, int sampleRate, double minFreq = 80.0, double maxFreq = 400.0) {
    int minLag = static_cast<int>(sampleRate / maxFreq);
    int maxLag = static_cast<int>(sampleRate / minFreq);
    int n = static_cast<int>(frame.size());

    int bestLag = minLag;
    double bestCorr = -std::numeric_limits<double>::infinity();
    for (int lag = minLag; lag <= std::min(maxLag, n - 1); lag++) {
        double corr = 0.0;
        for (int i = 0; i < n - lag; i++) corr += frame[i] * frame[i + lag];
        if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
        }
    }

    return bestLag > 0 ? static_cast<double>(sampleRate) / bestLag : 0.0;
}
```

```rust
fn autocorrelation_pitch(frame: &[f64], sample_rate: usize, min_freq: f64, max_freq: f64) -> f64 {
    let min_lag = (sample_rate as f64 / max_freq) as usize;
    let max_lag = (sample_rate as f64 / min_freq) as usize;
    let n = frame.len();

    let mut best_lag = min_lag;
    let mut best_corr = f64::MIN;
    for lag in min_lag..=max_lag.min(n - 1) {
        let corr: f64 = (0..n - lag).map(|i| frame[i] * frame[i + lag]).sum();
        if corr > best_corr {
            best_corr = corr;
            best_lag = lag;
        }
    }

    if best_lag > 0 { sample_rate as f64 / best_lag as f64 } else { 0.0 }
}
```

```csharp
static double AutocorrelationPitch(double[] frame, int sampleRate, double minFreq = 80.0, double maxFreq = 400.0)
{
    int minLag = (int)(sampleRate / maxFreq);
    int maxLag = (int)(sampleRate / minFreq);
    int n = frame.Length;

    int bestLag = minLag;
    double bestCorr = double.NegativeInfinity;
    for (int lag = minLag; lag <= Math.Min(maxLag, n - 1); lag++)
    {
        double corr = 0;
        for (int i = 0; i < n - lag; i++) corr += frame[i] * frame[i + lag];
        if (corr > bestCorr)
        {
            bestCorr = corr;
            bestLag = lag;
        }
    }

    return bestLag > 0 ? (double)sampleRate / bestLag : 0.0;
}
```
