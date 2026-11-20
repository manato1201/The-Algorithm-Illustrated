---
name: FM合成
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: 1サンプルあたり O(1)(正弦波の計算2回)
summary: ある正弦波(キャリア)の位相を、別の正弦波(モジュレータ)で揺らすだけで、少ない演算から豊かな倍音を持つ音色を作る。1980年代のシンセサイザーを席巻した方式。
---

## 概要

楽器の音は、基本周波数の整数倍の成分(倍音)が多数含まれている。加算合成は倍音を1本ずつ正弦波で作って足すので、豊かな音には多数の発振器が要る。当時のデジタル回路には重い処理だった。

ジョン・チャウニング(John Chowning)は、1960年代後半から、スタンフォード大学で、ビブラートの深さを大きくしていくと、揺れが速くなりすぎて、新しい音色に聞こえることに気づき、これを**周波数変調(FM)**による音の合成として体系化した(1973年の論文)。**ある周波数の正弦波を、別の正弦波で位相から揺らすだけで、たった2つの発振器から、多数の倍音を作れる**。この方式はヤマハがライセンスを受け、1983年のデジタルシンセサイザー DX7 で商業的な成功を収めた。ベルや金属音、電子ピアノ、ベースなど、それまでのアナログシンセサイザーでは出しにくかった音色が、安価に出せるようになった。

## 仕組み

基本形(2オペレータ)は、キャリア周波数 `fc`、モジュレータ周波数 `fm`、変調指数 `I` を使って、

`y(t) = A · sin( 2π fc t + I · sin( 2π fm t ) )`

位相の中に、別の正弦波 `I · sin(2π fm t)` が入っている。

1. **スペクトルの形**: 結果は、`fc` を中心に、`fm` の間隔で並ぶ側波帯 `fc ± n·fm`(`n = 0, 1, 2, ...`)からなる。各側波帯の振幅は、第1種ベッセル関数 `J_n(I)` に比例する
2. **変調指数 `I`**: 0なら純粋な正弦波(側波帯なし)。大きくなるほど、有意な側波帯の数が増えて、音が明るく(倍音が豊かに)なる。おおよそ `I + 1` 本の対の側波帯が目立つ
3. **周波数比 `fc : fm`**: 整数比だと、側波帯が基本周波数の整数倍の位置に並び、調和的な(音程のある)音になる。たとえば `1 : 1` はのこぎり波に近い倍音、`1 : 2` は奇数倍音が主になる。比が整数でないと、非調和な成分が混じって、鐘や金属のような音になる
4. **時間変化**: `I` を時間とともに変える(エンベロープをかける)と、アタックでは明るく、減衰とともに丸くなる、という自然な音色の変化が作れる

多数のオペレータをつなげたり(DX7は6オペレータ)、モジュレータ自身を別のオペレータで変調したり(フィードバック)することで、さらに複雑な音を作る。

## 特性・トレードオフ

- **少ない演算で豊かな音**: 2つの正弦波(テーブル参照)だけで、数十の倍音を持つ音ができる。演算資源が限られた時代の決定版だった
- **音色の予測が直感的でない**: パラメータ(周波数比、指数)と聞こえ方の関係が、アナログシンセの「フィルタを閉じる」のようには単純でない。ベッセル関数の特性を知ると予想できるようになる
- **折り返し雑音(エイリアシング)**: 側波帯が、サンプリング周波数の半分を超えると、折り返されて不要な音が混じる。`I` や周波数を上げすぎないようにする
- **位相変調との違い**: 実際のDX7などは、周波数ではなく位相を変調する(PM)ほうが、数値的に扱いやすい。両者は、積分を介して等価な関係にある
- **使いどころ**: シンセサイザー(DX7、OPNなどのFM音源チップ)、レトロゲームの音楽、ベル・電子ピアノ・ベースの音色作り、効果音の生成

## 実装例

```python
import math


def fm_wave(n, fs, fc, fm, index, amplitude=1.0):
    return [amplitude * math.sin(2 * math.pi * fc * i / fs + index * math.sin(2 * math.pi * fm * i / fs)) for i in range(n)]


def bessel_j(order, x, terms=30):
    """第1種ベッセル関数(べき級数)。"""
    return sum((-1) ** m / (math.factorial(m) * math.factorial(m + order)) * (x / 2) ** (2 * m + order) for m in range(terms))


def amplitude_at(samples, bin_index):
    n = len(samples)
    re = sum(x * math.cos(2 * math.pi * bin_index * i / n) for i, x in enumerate(samples))
    im = sum(x * math.sin(2 * math.pi * bin_index * i / n) for i, x in enumerate(samples))
    return 2 * math.hypot(re, im) / n


FS, N = 8192, 1024              # ビンの間隔は 8Hz
FC, FM, INDEX = 1000, 200, 2.0   # キャリア 1000Hz(ビン125)、モジュレータ 200Hz(ビン25)
y = fm_wave(N, FS, FC, FM, INDEX)
for order in range(4):
    measured = amplitude_at(y, (FC + order * FM) * N // FS)   # 側波帯 fc + n·fm の振幅
    print(order, round(measured, 4), round(abs(bessel_j(order, INDEX)), 4))  # 実測の振幅 と J_n(I) が一致
```

```typescript
function fmWave(n: number, fs: number, fc: number, fm: number, index: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * fc * i) / fs + index * Math.sin((2 * Math.PI * fm * i) / fs)));
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function besselJ(order: number, x: number, terms = 20): number {
  let sum = 0;
  for (let m = 0; m < terms; m++) {
    sum += ((-1) ** m / (factorial(m) * factorial(m + order))) * (x / 2) ** (2 * m + order);
  }
  return sum;
}

function amplitudeAt(samples: number[], bin: number): number {
  const n = samples.length;
  let re = 0;
  let im = 0;
  samples.forEach((x, i) => {
    re += x * Math.cos((2 * Math.PI * bin * i) / n);
    im += x * Math.sin((2 * Math.PI * bin * i) / n);
  });
  return (2 * Math.hypot(re, im)) / n;
}

const FS = 8192;
const N = 1024;
const [FC, FM, INDEX] = [1000, 200, 2];
const y = fmWave(N, FS, FC, FM, INDEX);
for (let order = 0; order < 4; order++) {
  const measured = amplitudeAt(y, ((FC + order * FM) * N) / FS);
  console.log(order, measured.toFixed(4), Math.abs(besselJ(order, INDEX)).toFixed(4));
}
```
