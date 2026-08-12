---
name: 短時間フーリエ変換(STFT)によるスペクトログラム生成
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n log w)(nは全サンプル数、wは窓長。FFTをフレーム数だけ繰り返す)
summary: 信号を短い窓に区切りながらFFTを適用し、時間の経過とともに周波数成分がどう変化するかを可視化・解析する時間周波数表現の基本技法。
---

## 概要

フーリエ変換は信号全体を周波数成分に分解できるが、「いつ、どの周波数が鳴っていたか」という時間情報は失われてしまう。音声や音楽のように周波数成分が時々刻々と変化する信号を扱うには、時間情報と周波数情報を同時に保持できる表現が必要になる。短時間フーリエ変換(Short-Time Fourier Transform, STFT)は、信号を短い時間窓で区切り、各窓に対して個別にフーリエ変換を適用することでこの問題を解決する。各フレームのスペクトルを時間軸に沿って並べたものが「スペクトログラム」であり、[MFCC分析](/algorithms/mfcc-analysis)や音声合成・音声認識・音楽情報検索など、音響信号処理のほぼ全ての前処理段階で使われる最も基礎的な時間周波数表現である。

## 仕組み

1. 信号`x[n]`を、長さ`N`の**窓関数**`w[n]`をかけながら短いフレームに切り出す。窓の開始位置を`H`サンプル(ホップサイズ)ずつずらして次々に切り出すことで、フレーム同士が一部重なり合う(オーバーラップ)ようにする
2. 各フレームに窓関数を乗算してから**高速フーリエ変換(FFT)**を適用する。数式で書くと、フレーム`m`番目・周波数ビン`k`番目のSTFTは
   `X[m, k] = Σ_{n=0}^{N-1} x[n + mH]・w[n]・e^(-j2πkn/N)`
   となる。窓関数をかけずに矩形窓のまま切り出すと、フレーム端の不連続によるスペクトル漏れ(スペクトルリーケージ)が生じるため、端がなめらかに0へ減衰する窓(ハン窓`w[n] = 0.5(1 - cos(2πn/(N-1)))`、ハミング窓など)を使うのが一般的
3. 各フレームのFFT結果`X[m, k]`から振幅`|X[m, k]|`(またはパワー`|X[m, k]|²`)を求め、横軸をフレーム(時間)、縦軸を周波数ビン、色を強度として並べたものがスペクトログラムになる
4. **窓長`N`とホップサイズ`H`が時間分解能・周波数分解能を決める**。窓を長くするほど周波数分解能(隣接する周波数を区別する能力)は上がるが、その窓の中で信号が変化しても平均化されてしまうため時間分解能は下がる。逆に窓を短くすると時間分解能は上がるが周波数分解能は下がる(不確定性原理に類する時間・周波数のトレードオフ)
5. 元の波形へ戻したい場合は、各フレームのスペクトルを逆FFT(IFFT)した後、窓関数を再度乗算してオーバーラップ部分を加算する(overlap-add法)。この際、窓関数とホップサイズの組み合わせによっては加算後に振幅が一定に保たれる条件(COLA: Constant OverLap-Add)を満たす必要がある

## 特性・トレードオフ

- **時間分解能と周波数分解能はトレードオフの関係にある**: 窓長`N`を大きくすると周波数分解能`Δf = fs/N`は細かくなるが、その窓内での時刻の情報は`N`サンプル分ぼやける。逆は逆で、どちらか一方だけを無限に改善することはできない。用途に応じて窓長を選ぶ必要があり、パーカッシブな音の検出には短い窓、音高の精密な解析には長い窓が向く
- **オーバーラップ率が滑らかさを左右する**: ホップサイズを窓長より十分小さくして75%程度オーバーラップさせると、フレーム間の変化が滑らかになり、後段の解析(ピーク追跡など)の精度が上がる。ただし計算量はオーバーラップ率に比例して増える
- **窓関数の選択がスペクトル漏れの度合いを決める**: 矩形窓は主ローブが狭く周波数分解能は高いがサイドローブが大きくスペクトル漏れが目立つ。ハン窓・ハミング窓・ブラックマン窓などはサイドローブを抑える代わりに主ローブが広がる(周波数分解能がやや落ちる)というトレードオフがある
- **使いどころ**: [MFCC分析](/algorithms/mfcc-analysis)のような音声特徴量抽出の前処理、音楽制作ソフトのスペクトログラム表示、位相ボコーダーによるタイムストレッチ・ピッチシフト、ノイズ除去(スペクトル減算法)、音声認識モデルの入力表現(メルスペクトログラム)

## 実装例

```python
import numpy as np

def hann_window(n: int) -> np.ndarray:
    return 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / (n - 1))

def stft(x: np.ndarray, win_size: int = 1024, hop_size: int = 256) -> np.ndarray:
    window = hann_window(win_size)
    n_frames = 1 + (len(x) - win_size) // hop_size
    n_bins = win_size // 2 + 1
    spectrogram = np.zeros((n_frames, n_bins), dtype=complex)

    for m in range(n_frames):
        start = m * hop_size
        frame = x[start:start + win_size] * window
        spectrogram[m] = np.fft.rfft(frame)

    return spectrogram

def spectrogram_magnitude_db(x: np.ndarray, win_size: int = 1024, hop_size: int = 256) -> np.ndarray:
    spec = stft(x, win_size, hop_size)
    magnitude = np.abs(spec)
    return 20 * np.log10(np.maximum(magnitude, 1e-10))

def istft(spectrogram: np.ndarray, win_size: int = 1024, hop_size: int = 256) -> np.ndarray:
    window = hann_window(win_size)
    n_frames = spectrogram.shape[0]
    out_len = win_size + hop_size * (n_frames - 1)
    y = np.zeros(out_len)
    norm = np.zeros(out_len)

    for m in range(n_frames):
        start = m * hop_size
        frame = np.fft.irfft(spectrogram[m], n=win_size)
        y[start:start + win_size] += frame * window
        norm[start:start + win_size] += window ** 2

    norm[norm < 1e-8] = 1.0
    return y / norm
```

```typescript
function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++)
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// 単純なO(n^2)のDFT(実運用ではFFTライブラリに置き換える)
function dft(frame: Float64Array): { re: Float64Array; im: Float64Array } {
  const n = frame.length;
  const nBins = Math.floor(n / 2) + 1;
  const re = new Float64Array(nBins);
  const im = new Float64Array(nBins);
  for (let k = 0; k < nBins; k++) {
    let sumRe = 0;
    let sumIm = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      sumRe += frame[t] * Math.cos(angle);
      sumIm += frame[t] * Math.sin(angle);
    }
    re[k] = sumRe;
    im[k] = sumIm;
  }
  return { re, im };
}

function stft(
  x: Float64Array,
  winSize = 1024,
  hopSize = 256,
): { re: Float64Array; im: Float64Array }[] {
  const window = hannWindow(winSize);
  const nFrames = 1 + Math.floor((x.length - winSize) / hopSize);
  const frames: { re: Float64Array; im: Float64Array }[] = [];

  for (let m = 0; m < nFrames; m++) {
    const start = m * hopSize;
    const frame = new Float64Array(winSize);
    for (let i = 0; i < winSize; i++) frame[i] = x[start + i] * window[i];
    frames.push(dft(frame));
  }
  return frames;
}

function magnitudeDb(
  spec: { re: Float64Array; im: Float64Array }[],
): Float64Array[] {
  return spec.map(({ re, im }) => {
    const mag = new Float64Array(re.length);
    for (let k = 0; k < re.length; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      mag[k] = 20 * Math.log10(Math.max(m, 1e-10));
    }
    return mag;
  });
}
```
