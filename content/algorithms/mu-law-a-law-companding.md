---
name: μ-law/A-law対数圧伸符号化
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n)(nはサンプル数、1サンプルあたりO(1))
summary: 対数圧縮によって小振幅の信号により多くの量子化ビットを割り当て、8ビットでも16ビット線形PCMに近い知覚品質を得る電話網標準G.711の静的な符号化方式。
---

## 概要

音声を16ビット線形PCMでそのまま符号化すると1サンプルあたり16ビット必要になるが、電話網のように帯域が限られる回線では、より少ないビット数(8ビット)で十分な音質を保ちたいという要求があった。単純にビット数を減らして線形量子化すると、特に振幅の小さい(静かな)部分で量子化誤差(量子化ノイズ)が相対的に大きくなり、耳障りなノイズとして知覚されやすい。μ-law(北米・日本で採用)とA-law(欧州で採用)は、**信号を対数的に圧縮してから均一に量子化し、復号時に対数の逆関数で伸張する**という「圧伸(companding = compressing + expanding)」の考え方で、8ビットでも16ビット線形PCMに近い知覚品質を実現する。1972年に国際電気通信連合(ITU-T)がG.711として標準化し、現在もIP電話(VoIP)や電話網で使われ続けている息の長い符号化方式である。

## 仕組み

1. 入力信号`x`(-1〜1に正規化された振幅)を、対数的な圧縮関数で圧縮する。**μ-law**の圧縮関数は
   `F(x) = sign(x)・ln(1 + μ|x|) / ln(1 + μ)`
   (`μ = 255`が標準)で定義される。**A-law**の圧縮関数は
   `F(x) = sign(x)・A|x| / (1 + ln A)` (`|x| < 1/A`のとき)
   `F(x) = sign(x)・(1 + ln(A|x|)) / (1 + ln A)` (`|x| ≥ 1/A`のとき)
   (`A = 87.6`が標準)という区分定義になる。どちらも小振幅域では傾きが急(=小さな入力変化が出力に大きく反映される=量子化ステップが細かい)で、大振幅域では傾きが緩やか(=量子化ステップが粗い)という共通の性質を持つ
2. 圧縮後の信号`F(x)`を8ビット(256段階)で**均一(線形)量子化**する。実際の実装では対数計算を毎回行うのではなく、区分線形近似(セグメントごとに傾きが2倍ずつ変化する13〜14区分の折れ線)によるテーブル参照で高速化するのが一般的
3. 量子化された8ビット値を1バイトとして伝送・保存する。符号ビット・セグメント(振幅の桁を表す3ビット)・セグメント内位置(4ビット)という構造でビットが割り当てられる
4. 復号時は8ビット値を圧縮関数の逆関数`F⁻¹`で伸張し、元の振幅スケールに戻す:
   `x = sign・(1/μ)・((1 + μ)^|F(x)| - 1)` (μ-lawの場合)
   これにより、小振幅域では細かく、大振幅域では粗く量子化されていた値が、元の線形スケールに正しく引き伸ばされる

## 特性・トレードオフ

- **知覚的に均一な量子化誤差**: 人間の聴覚は音量に対して対数的に感度を持つ(ウェーバー・フェヒナーの法則に近い性質)ため、対数圧縮によって振幅の大きさに関わらず「相対的な」量子化誤差(signal-to-quantization-noise ratio)がほぼ一定に保たれる。線形量子化を8ビットで行うと静かな部分のノイズが目立つのに対し、μ-law/A-lawの8ビットは主観的な音質で線形13〜14ビットPCMに匹敵するといわれる
- **[ADPCM](/algorithms/adpcm)との違い**: μ-law/A-lawは**サンプルごとに独立した静的な対数圧伸**であり、過去のサンプルを参照した予測は一切行わない(各サンプルの符号化は直前の状態に依存しない)。一方ADPCMは、直前のサンプルからの**差分を適応的に予測**して符号化するため、信号の時間的相関を利用してさらに低いビットレート(4ビット/サンプル程度)を実現できる。μ-law/A-lawは圧縮率で劣るが、実装が単純でサンプル単位の誤り訂正・ランダムアクセスがしやすく、伝送誤りが後続サンプルへ伝播しない利点がある
- **区分線形近似による高速化**: 実際の電話網機器では、対数関数の計算コストを避けるため、セグメントごとに傾きが2倍になる13(A-law)または15(μ-law)区分の折れ線で近似したテーブルを使うのが標準的な実装であり、乗算・除算なしに符号化できる
- **μ-lawとA-lawの違いと非互換性**: 圧縮関数の定数や小振幅付近の扱いがわずかに異なり、両者に互換性はない(G.711規格内で相互変換テーブルが定義されている)。北米・日本はμ-law、欧州はA-lawを標準としており、国際電話網では変換が必要になる場面がある
- **使いどころ**: 固定電話網・ISDN・初期のVoIP(G.711コーデック)、電話品質の音声録音、組み込み機器での省メモリな音声保存(WAVファイルのμ-law/A-lawエンコーディング)

## 実装例

```python
import math

MU = 255
A = 87.6

def mu_law_encode(x: float) -> int:
    x = max(-1.0, min(1.0, x))
    sign = 1 if x >= 0 else -1
    magnitude = math.log1p(MU * abs(x)) / math.log1p(MU)
    quantized = round(magnitude * 127)
    byte = (0 if sign > 0 else 0x80) | (127 - quantized)
    return byte

def mu_law_decode(byte: int) -> float:
    byte = byte ^ 0xFF
    sign = 1 if (byte & 0x80) == 0 else -1
    magnitude = (byte & 0x7F) / 127.0
    x = sign * (1.0 / MU) * ((1 + MU) ** magnitude - 1)
    return x

def a_law_encode(x: float) -> int:
    x = max(-1.0, min(1.0, x))
    sign = 1 if x >= 0 else -1
    ax = abs(x)
    if ax < 1 / A:
        magnitude = A * ax / (1 + math.log(A))
    else:
        magnitude = (1 + math.log(A * ax)) / (1 + math.log(A))
    quantized = round(magnitude * 127)
    byte = (0 if sign > 0 else 0x80) | quantized
    return byte ^ 0x55

def a_law_decode(byte: int) -> float:
    byte = byte ^ 0x55
    sign = 1 if (byte & 0x80) == 0 else -1
    magnitude = (byte & 0x7F) / 127.0
    ln_a = math.log(A)
    if magnitude < 1 / (1 + ln_a):
        x = magnitude * (1 + ln_a) / A
    else:
        x = math.exp(magnitude * (1 + ln_a) - 1) / A
    return sign * x
```

```typescript
const MU = 255;
const A_LAW_A = 87.6;

function muLawEncode(x: number): number {
  x = Math.max(-1, Math.min(1, x));
  const sign = x >= 0 ? 1 : -1;
  const magnitude = Math.log1p(MU * Math.abs(x)) / Math.log1p(MU);
  const quantized = Math.round(magnitude * 127);
  return (sign > 0 ? 0 : 0x80) | (127 - quantized);
}

function muLawDecode(byteIn: number): number {
  const byte = byteIn ^ 0xff;
  const sign = (byte & 0x80) === 0 ? 1 : -1;
  const magnitude = (byte & 0x7f) / 127.0;
  return sign * (1 / MU) * ((1 + MU) ** magnitude - 1);
}

function aLawEncode(x: number): number {
  x = Math.max(-1, Math.min(1, x));
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const lnA = Math.log(A_LAW_A);
  let magnitude: number;
  if (ax < 1 / A_LAW_A) {
    magnitude = (A_LAW_A * ax) / (1 + lnA);
  } else {
    magnitude = (1 + Math.log(A_LAW_A * ax)) / (1 + lnA);
  }
  const quantized = Math.round(magnitude * 127);
  const byte = (sign > 0 ? 0 : 0x80) | quantized;
  return byte ^ 0x55;
}

function aLawDecode(byteIn: number): number {
  const byte = byteIn ^ 0x55;
  const sign = (byte & 0x80) === 0 ? 1 : -1;
  const magnitude = (byte & 0x7f) / 127.0;
  const lnA = Math.log(A_LAW_A);
  let x: number;
  if (magnitude < 1 / (1 + lnA)) {
    x = (magnitude * (1 + lnA)) / A_LAW_A;
  } else {
    x = Math.exp(magnitude * (1 + lnA) - 1) / A_LAW_A;
  }
  return sign * x;
}
```
