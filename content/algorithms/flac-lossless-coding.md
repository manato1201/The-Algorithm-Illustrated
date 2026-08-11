---
name: 線形予測+Rice符号によるロスレス音声圧縮(FLAC方式)
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n)(nはサンプル数)
summary: 線形予測で隣接サンプル間の冗長性を取り除いた残差を、値の分布に適応するRice符号(ゴロム符号の特殊形)で符号化することで、情報を一切失わずにPCM音声を圧縮する。
---

## 概要

MP3やAACのような[修正離散コサイン変換(MDCT)](/algorithms/mdct-audio-coding)ベースのコーデックは、聴覚的に目立たない情報を捨てる非可逆圧縮だが、音楽制作のアーカイブや厳密な音質保持が求められる用途では、**情報を一切失わずに**圧縮したい場合がある。FLAC(Free Lossless Audio Codec)に代表されるロスレス音声圧縮は、[線形予測符号化(LPC)](/algorithms/linear-predictive-coding)と同じ発想——「隣接サンプルとの差分(残差)は元の波形よりずっと小さい値に収まる」——を利用しつつ、残差を**可逆的に**符号化することで、典型的には元のPCMデータの50〜70%程度のサイズまで、音質を一切劣化させずに圧縮する。

## 仕組み

1. 音声波形を短いフレームに分割し、各フレームで[線形予測符号化(LPC)](/algorithms/linear-predictive-coding)と同様の手法(または単純な固定次数の差分予測器)を使って、次に来るサンプルを直前の数サンプルから予測する係数を求める
2. 実際のサンプル値と予測値の差分(**残差**)を計算する。音声信号は滑らかに変化することが多いため、残差の絶対値は元のサンプル値よりずっと小さくなる傾向がある
3. 残差の値の分布(小さい値が多く、大きい値はまれ、というラプラス分布に近い形)に適した**Rice符号**(ゴロム符号のパラメータが2のべき乗の特殊形)で残差を符号化する。Rice符号は、値`v`を「商」と「余り」に分け、商をunary符号(1が商の数だけ続いてから0)、余りを固定bit数の二進数で表現する
4. Riceパラメータ`k`(何bitを余りに割り当てるか)は、そのフレームの残差の典型的な大きさに応じてフレームごとに最適化する。残差が小さいフレームでは`k`を小さく、大きいフレームでは`k`を大きくすることで、常に効率的な符号長になるよう調整する
5. 復号時は符号化と逆の手順——Rice符号を復号して残差を復元し、予測器の式を使って残差から元のサンプル値を逆算する——を行う。予測・量子化のいずれも整数演算で可逆的に行われるため、ビット単位で元の波形が完全に復元される

## 特性・トレードオフ

- **情報を一切失わない圧縮**: [MDCT](/algorithms/mdct-audio-coding)ベースの非可逆圧縮と異なり、複号後の波形は元のPCMデータとビット単位で完全に一致する。アーカイブ用途や、後工程でさらに編集・処理を行う音源データの保存に適している
- **圧縮率は非可逆圧縮に劣る**: 情報を捨てないという制約上、圧縮率はMP3/AACのような非可逆圧縮(圧縮率90%以上も可能)には及ばず、FLACの典型的な圧縮率は50〜70%程度にとどまる。「なるべく容量を減らしたいが、音質は絶対に落としたくない」という要求に応える技術である
- **Rice符号のパラメータ選択が効率を左右する**: 残差の分布はフレームごとに変動するため、Riceパラメータ`k`をフレームごとに(場合によってはサブフレームごとにさらに細かく)最適化することで、符号化効率を最大化できる。最適な`k`は残差の平均絶対値から解析的に見積もることができる
- **使いどころ**: 音楽アーカイブ・ハイレゾ音源配信(FLAC、ALAC、WavPackなど)、音声編集ソフトのマスターファイル保存、無線通信や音声認識パイプラインでの前処理としての可逆圧縮、医療・法的証拠として音声の完全性が求められる録音の保存

## 実装例

```python
def fixed_predictor_residual(samples: list[int], order: int = 2) -> list[int]:
    """固定次数の予測器(order=2: 直前2サンプルからの外挿)で残差を計算する。"""
    residual = list(samples[:order])
    for i in range(order, len(samples)):
        if order == 1:
            predicted = samples[i - 1]
        elif order == 2:
            predicted = 2 * samples[i - 1] - samples[i - 2]
        else:
            predicted = samples[i - 1]
        residual.append(samples[i] - predicted)
    return residual

def zigzag_encode(v: int) -> int:
    """負の値も扱えるよう符号なし整数へマッピングする。"""
    return (v << 1) ^ (v >> 31) if v >= 0 else ((-v) << 1) - 1

def rice_encode(residual: list[int], k: int) -> str:
    bits = []
    for v in residual:
        u = zigzag_encode(v)
        quotient, remainder = u >> k, u & ((1 << k) - 1)
        bits.append("1" * quotient + "0")
        bits.append(format(remainder, f"0{k}b"))
    return "".join(bits)

def best_rice_k(residual: list[int]) -> int:
    mean_abs = sum(abs(v) for v in residual) / max(len(residual), 1)
    k = 0
    while (1 << k) < mean_abs + 1:
        k += 1
    return k
```

```typescript
function fixedPredictorResidual(samples: number[], order = 2): number[] {
  const residual = samples.slice(0, order);
  for (let i = order; i < samples.length; i++) {
    const predicted = order === 2 ? 2 * samples[i - 1] - samples[i - 2] : samples[i - 1];
    residual.push(samples[i] - predicted);
  }
  return residual;
}

function zigzagEncode(v: number): number {
  return v >= 0 ? v * 2 : -v * 2 - 1;
}

function riceEncode(residual: number[], k: number): string {
  const bits: string[] = [];
  for (const v of residual) {
    const u = zigzagEncode(v);
    const quotient = u >> k;
    const remainder = u & ((1 << k) - 1);
    bits.push("1".repeat(quotient) + "0");
    bits.push(remainder.toString(2).padStart(k, "0"));
  }
  return bits.join("");
}

function bestRiceK(residual: number[]): number {
  const meanAbs = residual.reduce((s, v) => s + Math.abs(v), 0) / Math.max(residual.length, 1);
  let k = 0;
  while (1 << k < meanAbs + 1) k++;
  return k;
}
```

```cpp
#include <vector>
#include <string>
#include <cmath>

std::vector<int> fixedPredictorResidual(const std::vector<int>& samples, int order = 2) {
    std::vector<int> residual(samples.begin(), samples.begin() + order);
    for (size_t i = order; i < samples.size(); i++) {
        int predicted = (order == 2) ? 2 * samples[i - 1] - samples[i - 2] : samples[i - 1];
        residual.push_back(samples[i] - predicted);
    }
    return residual;
}

unsigned int zigzagEncode(int v) {
    return v >= 0 ? static_cast<unsigned int>(v) * 2 : static_cast<unsigned int>(-v) * 2 - 1;
}

std::string riceEncode(const std::vector<int>& residual, int k) {
    std::string bits;
    for (int v : residual) {
        unsigned int u = zigzagEncode(v);
        unsigned int quotient = u >> k, remainder = u & ((1u << k) - 1);
        bits += std::string(quotient, '1') + "0";
        for (int b = k - 1; b >= 0; b--) bits += ((remainder >> b) & 1) ? '1' : '0';
    }
    return bits;
}

int bestRiceK(const std::vector<int>& residual) {
    double sum = 0.0;
    for (int v : residual) sum += std::abs(v);
    double meanAbs = residual.empty() ? 0.0 : sum / residual.size();
    int k = 0;
    while ((1 << k) < meanAbs + 1) k++;
    return k;
}
```

```rust
fn fixed_predictor_residual(samples: &[i32], order: usize) -> Vec<i32> {
    let mut residual: Vec<i32> = samples[..order].to_vec();
    for i in order..samples.len() {
        let predicted = if order == 2 { 2 * samples[i - 1] - samples[i - 2] } else { samples[i - 1] };
        residual.push(samples[i] - predicted);
    }
    residual
}

fn zigzag_encode(v: i32) -> u32 {
    if v >= 0 { (v as u32) * 2 } else { (-v as u32) * 2 - 1 }
}

fn rice_encode(residual: &[i32], k: u32) -> String {
    let mut bits = String::new();
    for &v in residual {
        let u = zigzag_encode(v);
        let quotient = u >> k;
        let remainder = u & ((1 << k) - 1);
        bits.push_str(&"1".repeat(quotient as usize));
        bits.push('0');
        bits.push_str(&format!("{:0width$b}", remainder, width = k as usize));
    }
    bits
}

fn best_rice_k(residual: &[i32]) -> u32 {
    let mean_abs = residual.iter().map(|v| v.unsigned_abs() as f64).sum::<f64>() / residual.len().max(1) as f64;
    let mut k = 0u32;
    while (1u64 << k) < (mean_abs + 1.0) as u64 {
        k += 1;
    }
    k
}
```

```csharp
static int[] FixedPredictorResidual(int[] samples, int order = 2)
{
    var residual = new List<int>(samples[..order]);
    for (int i = order; i < samples.Length; i++)
    {
        int predicted = order == 2 ? 2 * samples[i - 1] - samples[i - 2] : samples[i - 1];
        residual.Add(samples[i] - predicted);
    }
    return residual.ToArray();
}

static uint ZigzagEncode(int v) => v >= 0 ? (uint)v * 2 : (uint)(-v) * 2 - 1;

static string RiceEncode(int[] residual, int k)
{
    var sb = new StringBuilder();
    foreach (int v in residual)
    {
        uint u = ZigzagEncode(v);
        uint quotient = u >> k, remainder = u & ((1u << k) - 1);
        sb.Append('1', (int)quotient);
        sb.Append('0');
        sb.Append(Convert.ToString(remainder, 2).PadLeft(k, '0'));
    }
    return sb.ToString();
}

static int BestRiceK(int[] residual)
{
    double meanAbs = residual.Length > 0 ? residual.Average(v => Math.Abs((double)v)) : 0;
    int k = 0;
    while ((1 << k) < meanAbs + 1) k++;
    return k;
}
```
