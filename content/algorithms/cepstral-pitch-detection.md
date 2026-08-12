---
name: ケプストラム分析によるピッチ検出
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n log n)(nはフレームのサンプル数、FFT2回に依存)
summary: 対数パワースペクトルをさらに逆フーリエ変換した「ケプストラム」領域でのピークから、声道の緩やかな包絡と声帯振動の細かい周期成分を分離して基本周波数を検出する手法。
---

## 概要

音声波形は、声帯の振動による周期的な音源(基本周波数`f0`とその倍音)と、声道の形状によるゆっくりした周波数特性(フォルマント)が**掛け合わさった(畳み込まれた)**ものとみなせる。周波数領域で見るとこの2つの要素は「緩やかに変化する成分(声道)」と「細かく周期的に変動する成分(音源)」として重なり合っており、単純なピーク検出では分離しにくい。ケプストラム分析は、対数パワースペクトルにもう一段フーリエ変換(正確には逆フーリエ変換)をかけることで、この2つの成分を**ケフレンシー(quefrency、時間軸に似た単位)領域で分離**する。この操作を繰り返すと元の掛け算(積)が対数を取ることで足し算(和)になり、さらに変換することで周波数領域では絡み合っていた2つの周期成分が別々の位置に分かれて現れる。声道の音響モデル化やロバストなピッチ検出に使われる古典的な信号処理技法である。

## 仕組み

1. 音声信号を短いフレームに分割し、窓関数(ハミング窓など)をかける([短時間フーリエ変換(STFT)](/algorithms/short-time-fourier-transform)の1フレーム分の処理と同じ手順)
2. 各フレームにFFTを適用し、パワースペクトル`|X(f)|²`を求める
3. パワースペクトルの対数を取る: `log|X(f)|²`。この対数化により、音源(音源スペクトル`E(f)`)と声道特性(声道伝達関数`H(f)`)の**掛け算**`X(f) = E(f)・H(f)`が**足し算**`log|X(f)| = log|E(f)| + log|H(f)|`に変換される
4. 対数スペクトルにさらに**逆フーリエ変換(IFFT)**を適用する。得られる結果を「ケプストラム(cepstrum、spectrumのアナグラム)」と呼び、横軸は「ケフレンシー」(時間の次元を持つが物理的な時間ではない)と呼ばれる:
   `c[n] = IFFT(log|X(f)|²)`
5. ケプストラムは低ケフレンシー領域(0付近)に声道の緩やかな周波数特性(フォルマント包絡)由来の成分が集まり、声帯振動の基本周期に対応する高めのケフレンシー位置に鋭いピークが現れる。このピークの位置`τ_peak`をサンプリング周波数`fs`との関係`f0 = fs / τ_peak`から基本周波数に変換する
6. ピーク探索は想定するピッチ範囲(例えば`fs/400`〜`fs/80`)に対応するケフレンシー範囲に限定して行う。これにより声道由来の低ケフレンシー成分を誤って基本周波数として検出することを避ける

## 特性・トレードオフ

- **音源と声道特性を分離できる**: 対数を挟んだ2段階の変換により、乗算的に絡み合った音源(周期成分)と声道特性(緩やかな包絡)がケフレンシー軸上で分離される。低ケフレンシー成分だけを取り出せば声道の音響特性(フォルマント)を推定でき、高ケフレンシー側のピークだけを取り出せばピッチが得られるという、1つの変換から2種類の情報を引き出せる
- **[自己相関法によるピッチ検出](/algorithms/pitch-detection-autocorrelation)との違い**: 自己相関法は時間領域で波形同士の類似度を直接測るのに対し、ケプストラム法は周波数領域(対数スペクトル)を経由する。自己相関法は計算が単純で低SN比でも比較的頑健だが、倍音構造が強い音では基本周波数の整数倍・分数倍を誤検出する「オクターブエラー」を起こしやすい。ケプストラム法は対数化によって倍音の振幅比の影響が緩和されるため、フォルマントが強く倍音構造が複雑な有声音(母音など)でオクターブエラーが相対的に起きにくく、さらに声道特性(フォルマント)も同時に推定できる利点がある。一方、ノイズが多い信号や無声音区間では対数スペクトルが不安定になりやすく、自己相関法の方が頑健な場合もある
- **FFTを2回必要とする計算コスト**: パワースペクトルを求めるFFTと、対数スペクトルを逆変換するIFFTの2段構成のため、自己相関法をFFT経由で計算する場合と同程度の計算コストがかかる。フレームごとにO(n log n)
- **低ケフレンシー成分の除去(リフタリング)**: 声道特性だけを取り出したい場合は低ケフレンシー成分だけを残し(ローパスリフタ)、ピッチだけを取り出したい場合は高ケフレンシー成分だけを残す(ハイパスリフタ)。この操作を「リフタリング(liftering、filteringのアナグラム)」と呼ぶ
- **使いどころ**: 音声のピッチ検出(特に倍音が強い声質)、声道モデル化・フォルマント推定の補助、話者認識の特徴量、音声合成における音源・フィルタ分離モデルの解析

## 実装例

```python
import numpy as np

def hamming_window(n: int) -> np.ndarray:
    return 0.54 - 0.46 * np.cos(2 * np.pi * np.arange(n) / (n - 1))

def cepstrum(frame: np.ndarray) -> np.ndarray:
    n = len(frame)
    windowed = frame * hamming_window(n)
    spectrum = np.fft.fft(windowed)
    log_power = np.log(np.maximum(np.abs(spectrum) ** 2, 1e-12))
    return np.real(np.fft.ifft(log_power))

def cepstral_pitch(
    frame: np.ndarray, sample_rate: int, min_freq: float = 80.0, max_freq: float = 400.0,
) -> float:
    c = cepstrum(frame)
    min_quef = int(sample_rate / max_freq)
    max_quef = min(int(sample_rate / min_freq), len(c) // 2)

    if max_quef <= min_quef:
        return 0.0

    search_region = c[min_quef:max_quef + 1]
    peak_offset = int(np.argmax(search_region))
    peak_quefrency = min_quef + peak_offset

    return sample_rate / peak_quefrency if peak_quefrency > 0 else 0.0
```

```typescript
function hammingWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++)
    w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// 単純なO(n^2)のDFT/IDFT(実運用ではFFTライブラリに置き換える)
function dftMagnitudeSquaredLog(frame: Float64Array): Float64Array {
  const n = frame.length;
  const result = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      re += frame[t] * Math.cos(angle);
      im += frame[t] * Math.sin(angle);
    }
    const power = re * re + im * im;
    result[k] = Math.log(Math.max(power, 1e-12));
  }
  return result;
}

function idftReal(logPower: Float64Array): Float64Array {
  const n = logPower.length;
  const result = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const angle = (2 * Math.PI * k * t) / n;
      sum += logPower[k] * Math.cos(angle);
    }
    result[t] = sum / n;
  }
  return result;
}

function cepstrum(frame: Float64Array): Float64Array {
  const n = frame.length;
  const window = hammingWindow(n);
  const windowed = frame.map((v, i) => v * window[i]);
  const logPower = dftMagnitudeSquaredLog(windowed as Float64Array);
  return idftReal(logPower);
}

function cepstralPitch(
  frame: Float64Array,
  sampleRate: number,
  minFreq = 80.0,
  maxFreq = 400.0,
): number {
  const c = cepstrum(frame);
  const minQuef = Math.floor(sampleRate / maxFreq);
  const maxQuef = Math.min(
    Math.floor(sampleRate / minFreq),
    Math.floor(c.length / 2),
  );

  if (maxQuef <= minQuef) return 0;

  let bestOffset = 0;
  let bestValue = -Infinity;
  for (let i = minQuef; i <= maxQuef; i++) {
    if (c[i] > bestValue) {
      bestValue = c[i];
      bestOffset = i;
    }
  }

  return bestOffset > 0 ? sampleRate / bestOffset : 0;
}
```
