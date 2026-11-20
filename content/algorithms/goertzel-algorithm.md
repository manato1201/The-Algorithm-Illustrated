---
name: ゲルツェルのアルゴリズム
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: 1つの周波数について O(N)(サンプル数 N)。k 個の周波数なら O(kN)
summary: FFTで全周波数を求める代わりに、必要な1つか数個の周波数だけの強さを、漸化式1本で1サンプルあたり乗算1回ほどで求める。電話のトーン信号(DTMF)の検出で有名。
---

## 概要

音のスペクトルを調べるには、通常は[FFT](/algorithms/fft)を使う。FFTはすべての周波数をまとめて O(N log N) で求めるが、**特定の数個の周波数にだけ関心がある**場合(電話のボタン音の判定、楽器のチューナー、特定の警報音の検出)には、無駄が大きい。8個の周波数のうちどれが鳴っているかだけを知りたいのに、数百の周波数を計算するのは、計算も記憶も惜しい。

ゲルツェル(Gerald Goertzel、1958年)のアルゴリズムは、離散フーリエ変換(DFT)の**1つの周波数成分だけ**を、2次の漸化式で計算する。サンプルが1つ届くたびに、乗算1回・加算2回ほどで状態を更新するだけなので、小さなマイコンでも、サンプルをメモリに溜めずにリアルタイムに検出できる。8個のDTMF周波数を調べるなら、FFTより計算量が少なくなることが多い。

## 仕組み

目的の周波数 `f`、サンプリング周波数 `fs`、サンプル数 `N` に対して、調べたいDFTの「ビン」は `k = f · N / fs`(整数でなくてもよい)。

1. 係数を1回だけ計算する: `coeff = 2 · cos(2π k / N)`
2. 状態を `s₁ = s₂ = 0` で初期化する
3. サンプル `x[0], x[1], ..., x[N−1]` を順に処理する
   `s = x[n] + coeff · s₁ − s₂`
   `s₂ = s₁`、`s₁ = s`
4. `N` 個を処理した後、その周波数の**パワー(振幅の2乗)**は、
   `power = s₁² + s₂² − coeff · s₁ · s₂`
   (複素数の計算を使わず、実数だけで求まる)

この漸化式は、周波数 `k` で共振する2次のIIRフィルタとみなせる(ゲルツェルの方法は、ある周波数でのDFTを「再帰フィルタ」として計算する、という見方)。ちょうど `N` サンプル後の状態が、DFTの1成分に対応する。

## 特性・トレードオフ

- **1つの周波数なら FFT より速い**: 1つの周波数あたり O(N)。調べる周波数が `log₂ N` 個程度までなら、ゲルツェルのほうが少ない計算で済む。数が多ければ FFT が有利
- **メモリが少ない**: 状態は2つの数だけ。サンプルを蓄えず、到着ごとに処理できる
- **ビンの位置**: `k` が整数のとき(`N` サンプルにちょうど整数周期が入る)、漏れ(リーケージ)が少ない。DTMFの検出では、標準的に `N = 205` (fs=8kHz)など、各周波数のビンが整数に近くなる値が選ばれる
- **位相は出ない**: 上のパワーの式は、振幅の強さだけ。位相も必要なら、別の式で実部と虚部を取り出す
- **窓関数**: 突発的な切り出しによる漏れを抑えるために、サンプルに窓をかけてから使うこともある
- **使いどころ**: 電話のDTMF(プッシュ音)のデコード、モデムのトーン検出、楽器チューナーの特定の音の判定、振動解析の特定の周波数の監視

## 実装例

```python
import math


def goertzel_power(samples, freq, fs):
    n = len(samples)
    k = freq * n / fs
    coeff = 2 * math.cos(2 * math.pi * k / n)
    s1 = s2 = 0.0
    for x in samples:
        s = x + coeff * s1 - s2
        s2, s1 = s1, s
    return s1 * s1 + s2 * s2 - coeff * s1 * s2


def dft_power(samples, freq, fs):
    n = len(samples)
    k = freq * n / fs
    re = sum(x * math.cos(2 * math.pi * k * i / n) for i, x in enumerate(samples))
    im = sum(-x * math.sin(2 * math.pi * k * i / n) for i, x in enumerate(samples))
    return re * re + im * im


FS, N = 8000, 205
ROWS = [697, 770, 852, 941]
COLS = [1209, 1336, 1477, 1633]
KEYS = ["123A", "456B", "789C", "*0#D"]


def detect(samples):
    row = max(range(4), key=lambda i: goertzel_power(samples, ROWS[i], FS))
    col = max(range(4), key=lambda i: goertzel_power(samples, COLS[i], FS))
    return KEYS[row][col]


# 「5」(770Hz と 1336Hz の合成音)を作って判定する
tone = [math.sin(2 * math.pi * 770 * i / FS) + math.sin(2 * math.pi * 1336 * i / FS) for i in range(N)]
print(detect(tone))  # 5
print(math.isclose(goertzel_power(tone, 770, FS), dft_power(tone, 770, FS), rel_tol=1e-9))  # True(DFTと一致)
```

```typescript
function goertzelPower(samples: number[], freq: number, fs: number): number {
  const n = samples.length;
  const k = (freq * n) / fs;
  const coeff = 2 * Math.cos((2 * Math.PI * k) / n);
  let s1 = 0;
  let s2 = 0;
  for (const x of samples) {
    const s = x + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

const FS = 8000;
const N = 205;
const ROWS = [697, 770, 852, 941];
const COLS = [1209, 1336, 1477, 1633];
const KEYS = ["123A", "456B", "789C", "*0#D"];

const argmax = (power: (i: number) => number): number =>
  [0, 1, 2, 3].reduce((best, i) => (power(i) > power(best) ? i : best));

function detect(samples: number[]): string {
  const row = argmax((i) => goertzelPower(samples, ROWS[i], FS));
  const col = argmax((i) => goertzelPower(samples, COLS[i], FS));
  return KEYS[row][col];
}

const tone = Array.from(
  { length: N },
  (_, i) =>
    Math.sin((2 * Math.PI * 770 * i) / FS) +
    Math.sin((2 * Math.PI * 1336 * i) / FS),
);
console.log(detect(tone)); // 5
```
