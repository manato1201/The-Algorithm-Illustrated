---
name: PSOLA法によるピッチシフト
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nは処理サンプル数)
summary: 音声波形をピッチ周期ごとの短い断片(グレイン)に分解し、それらを元とは異なる間隔で重ね合わせて再配置することで、話す速さ(音の長さ)を変えずに声の高さだけを変化させる。
---

## 概要

音声の再生速度を単純に変える(サンプルの間引き・補間で時間軸を伸縮する)と、ピッチ(声の高さ)も一緒に変わってしまう——早送りすれば声が高くなり、スロー再生すれば声が低くなる、という現象は誰もが経験したことがあるだろう。しかし歌の音程を変えずにテンポだけを変えたい、逆にテンポは保ったまま音程だけを変えたい、という要求は音楽制作・音声処理で頻繁に生じる。PSOLA(Pitch Synchronous Overlap and Add)法は、[自己相関法によるピッチ検出](/algorithms/pitch-detection-autocorrelation)で求めた**ピッチ周期に同期した位置**で音声波形を短い断片(グレイン)に分割し、それらの断片を**元とは異なる間隔で並べ直して重ね合わせる**ことで、音の長さ(継続時間)を保ったままピッチだけを変化させる、あるいはその逆(ピッチを保ったまま長さを変える)を実現する。

## 仕組み

1. **分析(Analysis)**: 入力音声から[ピッチ検出](/algorithms/pitch-detection-autocorrelation)を行い、各ピッチ周期の中心となる位置(ピッチマーク)を特定する。各ピッチマークを中心に、前後2周期分程度の幅を持つ窓関数(ハニング窓など)をかけて、短い音声断片(グレイン)を切り出す
2. **ピッチシフトの場合**: 元のグレインをそのまま使いながら、**グレインを配置する間隔(合成ピッチマークの間隔)を、元のピッチ周期より短く(高いピッチへ)、または長く(低いピッチへ)** 変更する。グレイン自体の波形の中身は変えないため、各グレインが持つ音色的な特徴(フォルマント)は保たれたまま、周期だけが変化する
3. **タイムストレッチの場合**: 逆に、グレインを配置する間隔は元のピッチ周期と同じに保ちながら、**グレインを重複させて使う回数を増やす(引き伸ばす)、または一部を間引く(短縮する)**ことで、ピッチを変えずに再生時間だけを伸縮する
4. **合成(Synthesis)**: 再配置された各グレインを、窓関数の重なり部分で自然に混ざり合うように**重ね合わせ加算(Overlap-Add)** する。窓関数の設計により、グレインの継ぎ目が滑らかにクロスフェードされ、不連続なノイズが生じないようにする
5. 音声全体にわたってこの分析・再配置・合成を繰り返すことで、ピッチシフトまたはタイムストレッチされた音声波形が得られる

## 特性・トレードオフ

- **ピッチと時間を独立に制御できる**: 単純なリサンプリング(再生速度を変える)ではピッチと時間長が連動して変化してしまうが、PSOLA法はピッチ周期に同期したグレイン単位で処理することで、両者を独立に(片方だけ、あるいは両方を別々に)制御できる。ボーカルのオートチューン、カラオケの音程調整、映像の吹き替えでの話速調整など、実用上重要な機能を実現する基盤技術である
- **正確なピッチ検出への依存**: PSOLA法の品質は、事前のピッチ検出の精度に強く依存する。ピッチマークの位置がずれると、グレインの継ぎ目で不自然なアーティファクト(音の歪み、機械的な質感)が生じやすい。特に無声音(摩擦音のような周期性のない音)の扱いには工夫が必要で、実装ではピッチが検出できない区間を別処理する
- **極端な変換ではフォルマントの不自然さが生じる**: ピッチを大きく変化させると(1オクターブ以上など)、声道の共鳴特性(フォルマント)がピッチと一緒にスケールしてしまい、「アニメ声」や「ドナルドダック効果」と呼ばれる不自然な音色変化が生じることがある。この問題を回避するには、フォルマントとピッチを分離して扱う、より高度な変種(フォルマント保存PSOLA)が使われる
- **使いどころ**: 音楽制作におけるボーカルのピッチ補正・ハーモニー生成、カラオケ機材のキーコントロール機能、映像編集における話速変換(ピッチを保った早口・スロー再生)、音声合成における韻律(イントネーション)の調整

## 実装例

簡略化した、固定ピッチ周期を仮定したPSOLAによるピッチシフトの核心部分を示す。

```python
import math

def hanning_window(size: int) -> list[float]:
    return [0.5 - 0.5 * math.cos(2 * math.pi * i / (size - 1)) for i in range(size)]

def psola_pitch_shift(signal: list[float], pitch_period: int, shift_ratio: float) -> list[float]:
    """shift_ratio > 1でピッチを上げ、< 1で下げる。継続時間はほぼ保たれる。"""
    grain_size = pitch_period * 2
    window = hanning_window(grain_size)

    # 分析: pitch_period間隔でグレインを切り出す
    grains = []
    pos = 0
    while pos + grain_size <= len(signal):
        grain = [signal[pos + i] * window[i] for i in range(grain_size)]
        grains.append(grain)
        pos += pitch_period

    # 合成: 新しいピッチ周期(元よりshift_ratio倍短い/長い)間隔でオーバーラップ加算
    new_period = max(1, round(pitch_period / shift_ratio))
    output_length = len(grains) * new_period + grain_size
    output = [0.0] * output_length

    out_pos = 0
    for grain in grains:
        for i in range(grain_size):
            if out_pos + i < len(output):
                output[out_pos + i] += grain[i]
        out_pos += new_period

    return output
```

```typescript
function hanningWindow(size: number): number[] {
  return Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
}

function psolaPitchShift(signal: number[], pitchPeriod: number, shiftRatio: number): number[] {
  const grainSize = pitchPeriod * 2;
  const window = hanningWindow(grainSize);

  const grains: number[][] = [];
  let pos = 0;
  while (pos + grainSize <= signal.length) {
    const grain = Array.from({ length: grainSize }, (_, i) => signal[pos + i] * window[i]);
    grains.push(grain);
    pos += pitchPeriod;
  }

  const newPeriod = Math.max(1, Math.round(pitchPeriod / shiftRatio));
  const outputLength = grains.length * newPeriod + grainSize;
  const output = new Array(outputLength).fill(0);

  let outPos = 0;
  for (const grain of grains) {
    for (let i = 0; i < grainSize; i++) {
      if (outPos + i < output.length) output[outPos + i] += grain[i];
    }
    outPos += newPeriod;
  }

  return output;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

std::vector<double> hanningWindow(int size) {
    std::vector<double> w(size);
    for (int i = 0; i < size; i++) w[i] = 0.5 - 0.5 * std::cos(2 * M_PI * i / (size - 1));
    return w;
}

std::vector<double> psolaPitchShift(const std::vector<double>& signal, int pitchPeriod, double shiftRatio) {
    int grainSize = pitchPeriod * 2;
    auto window = hanningWindow(grainSize);

    std::vector<std::vector<double>> grains;
    int pos = 0;
    while (pos + grainSize <= static_cast<int>(signal.size())) {
        std::vector<double> grain(grainSize);
        for (int i = 0; i < grainSize; i++) grain[i] = signal[pos + i] * window[i];
        grains.push_back(grain);
        pos += pitchPeriod;
    }

    int newPeriod = std::max(1, static_cast<int>(std::round(pitchPeriod / shiftRatio)));
    int outputLength = static_cast<int>(grains.size()) * newPeriod + grainSize;
    std::vector<double> output(outputLength, 0.0);

    int outPos = 0;
    for (auto& grain : grains) {
        for (int i = 0; i < grainSize; i++) {
            if (outPos + i < outputLength) output[outPos + i] += grain[i];
        }
        outPos += newPeriod;
    }

    return output;
}
```

```rust
fn hanning_window(size: usize) -> Vec<f64> {
    (0..size)
        .map(|i| 0.5 - 0.5 * (2.0 * std::f64::consts::PI * i as f64 / (size - 1) as f64).cos())
        .collect()
}

fn psola_pitch_shift(signal: &[f64], pitch_period: usize, shift_ratio: f64) -> Vec<f64> {
    let grain_size = pitch_period * 2;
    let window = hanning_window(grain_size);

    let mut grains = Vec::new();
    let mut pos = 0;
    while pos + grain_size <= signal.len() {
        let grain: Vec<f64> = (0..grain_size).map(|i| signal[pos + i] * window[i]).collect();
        grains.push(grain);
        pos += pitch_period;
    }

    let new_period = ((pitch_period as f64 / shift_ratio).round() as usize).max(1);
    let output_length = grains.len() * new_period + grain_size;
    let mut output = vec![0.0; output_length];

    let mut out_pos = 0;
    for grain in &grains {
        for (i, &v) in grain.iter().enumerate() {
            if out_pos + i < output.len() {
                output[out_pos + i] += v;
            }
        }
        out_pos += new_period;
    }

    output
}
```

```csharp
static double[] HanningWindow(int size)
{
    var w = new double[size];
    for (int i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.Cos(2 * Math.PI * i / (size - 1));
    return w;
}

static double[] PsolaPitchShift(double[] signal, int pitchPeriod, double shiftRatio)
{
    int grainSize = pitchPeriod * 2;
    var window = HanningWindow(grainSize);

    var grains = new List<double[]>();
    int pos = 0;
    while (pos + grainSize <= signal.Length)
    {
        var grain = new double[grainSize];
        for (int i = 0; i < grainSize; i++) grain[i] = signal[pos + i] * window[i];
        grains.Add(grain);
        pos += pitchPeriod;
    }

    int newPeriod = Math.Max(1, (int)Math.Round(pitchPeriod / shiftRatio));
    int outputLength = grains.Count * newPeriod + grainSize;
    var output = new double[outputLength];

    int outPos = 0;
    foreach (var grain in grains)
    {
        for (int i = 0; i < grainSize; i++)
        {
            if (outPos + i < outputLength) output[outPos + i] += grain[i];
        }
        outPos += newPeriod;
    }

    return output;
}
```
