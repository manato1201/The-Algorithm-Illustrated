---
name: 適応的差分PCM(ADPCM)
category: 音響・信号処理
subcategory: オーディオ圧縮・符号化
complexity: O(n)(nはサンプル数)
summary: サンプル間の差分だけを、信号の変化の激しさに応じて動的に幅を変える量子化ステップで符号化し、16bit PCMを4bit程度まで圧縮する。
---

## 概要

音声波形は隣接サンプル同士が強く相関しており(急に大きく変化することは少ない)、各サンプルをそのまま16bitで記録するのは冗長である。差分PCM(DPCM)は「前のサンプルとの差分」だけを符号化することでこの冗長性を削るが、差分の大きさは信号によって大きく変動するため、固定幅の量子化では小さな差分では精度が足りず、大きな差分では追従できない。適応的差分PCM(ADPCM)は、**量子化ステップ幅を直前の符号化結果に応じて動的に増減させる**ことでこの問題を解決し、16bit PCMをおよそ4bit/サンプルまで圧縮しながら実用的な音質を保つ。IMA ADPCMやMicrosoft ADPCMとして初期のゲーム機・PCサウンドカードで広く使われた。

## 仕組み

1. エンコーダは、前回の実サンプル値から予測した値(単純には直前のサンプル値そのもの)と実際の入力値との**差分**を計算する
2. 差分を現在の量子化ステップ幅`step`で割り、数bit(典型的には4bit)のコードに丸める。このコードは「差分の符号」と「ステップ幅の何倍か」をおおまかに表す
3. コードを使って、量子化された差分を逆算し、それを予測値に足し込んで**復元済みサンプル値**を更新する(デコーダも全く同じ計算をするため、エンコーダ・デコーダの状態は常に一致する)
4. コードの大きさ(表現している差分の相対的な大きさ)に応じて、あらかじめ用意した係数テーブルから次のステップ幅`step`を更新する——**大きな差分が続けば`step`を拡大して急な変化に追従し、小さな差分が続けば`step`を縮小して精度を上げる**
5. 1〜4をサンプルごとに繰り返す。各ステップの計算がO(1)なので全体でO(n)

## 特性・トレードオフ

- **圧縮率と音質のバランス**: 16bit(2byte)/サンプルを4bit(0.5byte)/サンプル程度に圧縮でき、単純な差分PCMより明らかに音質が良い。可逆圧縮ではなく非可逆(量子化誤差が蓄積する)点には注意が要る
- **状態を持つ逐次処理**: エンコーダとデコーダが同じ`step`・予測値の更新規則を共有する必要があり、ビットストリームの途中から復号を始められない(ランダムアクセスに弱い)。ストリーミング再生やシークが必要な用途では区間ごとにキーフレーム(状態のリセット点)を挟むなどの工夫がされる
- **低い計算コスト**: 加減算とテーブル参照が主体で、浮動小数点演算や複雑な変換(DCTなど)を必要としない。1990年代のゲーム機のような非力なハードウェアでも十分な速度でデコードできた
- **使いどころ**: ゲーム機・組み込み機器の効果音・音声データ圧縮(SNES、GBA、初期の携帯電話の音声コーデックなど)、WAVファイルのIMA ADPCM/MS ADPCM形式。現在はより高圧縮率のMP3/AACやOpusが主流だが、超低遅延・超低計算コストが求められる組み込み用途では今も使われる

## 実装例

```python
INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8]
STEP_TABLE = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
              50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
              253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
              1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
              3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
              12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]

def clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))

def adpcm_encode(samples: list[int]) -> tuple[list[int], int, int]:
    predicted = 0
    index = 0
    codes = []
    for sample in samples:
        step = STEP_TABLE[index]
        diff = sample - predicted
        code = 0
        if diff < 0:
            code = 8
            diff = -diff
        temp_step = step
        for bit in (4, 2, 1):
            if diff >= temp_step:
                code |= bit
                diff -= temp_step
            temp_step >>= 1
        codes.append(code)

        diff_q = step >> 3
        if code & 4: diff_q += step
        if code & 2: diff_q += step >> 1
        if code & 1: diff_q += step >> 2
        if code & 8: diff_q = -diff_q
        predicted = clamp(predicted + diff_q, -32768, 32767)
        index = clamp(index + INDEX_TABLE[code], 0, len(STEP_TABLE) - 1)
    return codes, predicted, index

def adpcm_decode(codes: list[int]) -> list[int]:
    predicted = 0
    index = 0
    out = []
    for code in codes:
        step = STEP_TABLE[index]
        diff_q = step >> 3
        if code & 4: diff_q += step
        if code & 2: diff_q += step >> 1
        if code & 1: diff_q += step >> 2
        if code & 8: diff_q = -diff_q
        predicted = clamp(predicted + diff_q, -32768, 32767)
        out.append(predicted)
        index = clamp(index + INDEX_TABLE[code], 0, len(STEP_TABLE) - 1)
    return out
```

```typescript
const INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
const STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80,
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function adpcmEncode(samples: number[]): number[] {
  let predicted = 0;
  let index = 0;
  const codes: number[] = [];
  for (const sample of samples) {
    const step = STEP_TABLE[index];
    let diff = sample - predicted;
    let code = 0;
    if (diff < 0) {
      code = 8;
      diff = -diff;
    }
    let tempStep = step;
    for (const bit of [4, 2, 1]) {
      if (diff >= tempStep) {
        code |= bit;
        diff -= tempStep;
      }
      tempStep >>= 1;
    }
    codes.push(code);

    let diffQ = step >> 3;
    if (code & 4) diffQ += step;
    if (code & 2) diffQ += step >> 1;
    if (code & 1) diffQ += step >> 2;
    if (code & 8) diffQ = -diffQ;
    predicted = clamp(predicted + diffQ, -32768, 32767);
    index = clamp(index + INDEX_TABLE[code], 0, STEP_TABLE.length - 1);
  }
  return codes;
}

function adpcmDecode(codes: number[]): number[] {
  let predicted = 0;
  let index = 0;
  const out: number[] = [];
  for (const code of codes) {
    const step = STEP_TABLE[index];
    let diffQ = step >> 3;
    if (code & 4) diffQ += step;
    if (code & 2) diffQ += step >> 1;
    if (code & 1) diffQ += step >> 2;
    if (code & 8) diffQ = -diffQ;
    predicted = clamp(predicted + diffQ, -32768, 32767);
    out.push(predicted);
    index = clamp(index + INDEX_TABLE[code], 0, STEP_TABLE.length - 1);
  }
  return out;
}
```

```cpp
#include <vector>
#include <algorithm>

static const int INDEX_TABLE[16] = {-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8};
static const int STEP_TABLE[26] = {7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31,
                                    34, 37, 41, 45, 50, 55, 60, 66, 73, 80};

int clampInt(int v, int lo, int hi) { return std::max(lo, std::min(hi, v)); }

std::vector<int> adpcmEncode(const std::vector<int>& samples) {
    int predicted = 0, index = 0;
    std::vector<int> codes;
    for (int sample : samples) {
        int step = STEP_TABLE[index];
        int diff = sample - predicted;
        int code = 0;
        if (diff < 0) { code = 8; diff = -diff; }
        int tempStep = step;
        for (int bit : {4, 2, 1}) {
            if (diff >= tempStep) { code |= bit; diff -= tempStep; }
            tempStep >>= 1;
        }
        codes.push_back(code);

        int diffQ = step >> 3;
        if (code & 4) diffQ += step;
        if (code & 2) diffQ += step >> 1;
        if (code & 1) diffQ += step >> 2;
        if (code & 8) diffQ = -diffQ;
        predicted = clampInt(predicted + diffQ, -32768, 32767);
        index = clampInt(index + INDEX_TABLE[code], 0, 25);
    }
    return codes;
}

std::vector<int> adpcmDecode(const std::vector<int>& codes) {
    int predicted = 0, index = 0;
    std::vector<int> out;
    for (int code : codes) {
        int step = STEP_TABLE[index];
        int diffQ = step >> 3;
        if (code & 4) diffQ += step;
        if (code & 2) diffQ += step >> 1;
        if (code & 1) diffQ += step >> 2;
        if (code & 8) diffQ = -diffQ;
        predicted = clampInt(predicted + diffQ, -32768, 32767);
        out.push_back(predicted);
        index = clampInt(index + INDEX_TABLE[code], 0, 25);
    }
    return out;
}
```

```rust
const INDEX_TABLE: [i32; 16] = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
const STEP_TABLE: [i32; 26] = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34,
                                37, 41, 45, 50, 55, 60, 66, 73, 80];

fn clamp_i32(v: i32, lo: i32, hi: i32) -> i32 {
    v.max(lo).min(hi)
}

fn adpcm_encode(samples: &[i32]) -> Vec<i32> {
    let mut predicted = 0i32;
    let mut index = 0usize;
    let mut codes = Vec::with_capacity(samples.len());
    for &sample in samples {
        let step = STEP_TABLE[index];
        let mut diff = sample - predicted;
        let mut code = 0;
        if diff < 0 { code = 8; diff = -diff; }
        let mut temp_step = step;
        for bit in [4, 2, 1] {
            if diff >= temp_step { code |= bit; diff -= temp_step; }
            temp_step >>= 1;
        }
        codes.push(code);

        let mut diff_q = step >> 3;
        if code & 4 != 0 { diff_q += step; }
        if code & 2 != 0 { diff_q += step >> 1; }
        if code & 1 != 0 { diff_q += step >> 2; }
        if code & 8 != 0 { diff_q = -diff_q; }
        predicted = clamp_i32(predicted + diff_q, -32768, 32767);
        index = clamp_i32(index as i32 + INDEX_TABLE[code as usize], 0, 25) as usize;
    }
    codes
}

fn adpcm_decode(codes: &[i32]) -> Vec<i32> {
    let mut predicted = 0i32;
    let mut index = 0usize;
    let mut out = Vec::with_capacity(codes.len());
    for &code in codes {
        let step = STEP_TABLE[index];
        let mut diff_q = step >> 3;
        if code & 4 != 0 { diff_q += step; }
        if code & 2 != 0 { diff_q += step >> 1; }
        if code & 1 != 0 { diff_q += step >> 2; }
        if code & 8 != 0 { diff_q = -diff_q; }
        predicted = clamp_i32(predicted + diff_q, -32768, 32767);
        out.push(predicted);
        index = clamp_i32(index as i32 + INDEX_TABLE[code as usize], 0, 25) as usize;
    }
    out
}
```

```csharp
static readonly int[] IndexTable = { -1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8 };
static readonly int[] StepTable = { 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80 };

static int Clamp(int v, int lo, int hi) => Math.Max(lo, Math.Min(hi, v));

static List<int> AdpcmEncode(List<int> samples)
{
    int predicted = 0, index = 0;
    var codes = new List<int>();
    foreach (int sample in samples)
    {
        int step = StepTable[index];
        int diff = sample - predicted;
        int code = 0;
        if (diff < 0) { code = 8; diff = -diff; }
        int tempStep = step;
        foreach (int bit in new[] { 4, 2, 1 })
        {
            if (diff >= tempStep) { code |= bit; diff -= tempStep; }
            tempStep >>= 1;
        }
        codes.Add(code);

        int diffQ = step >> 3;
        if ((code & 4) != 0) diffQ += step;
        if ((code & 2) != 0) diffQ += step >> 1;
        if ((code & 1) != 0) diffQ += step >> 2;
        if ((code & 8) != 0) diffQ = -diffQ;
        predicted = Clamp(predicted + diffQ, -32768, 32767);
        index = Clamp(index + IndexTable[code], 0, 25);
    }
    return codes;
}

static List<int> AdpcmDecode(List<int> codes)
{
    int predicted = 0, index = 0;
    var outSamples = new List<int>();
    foreach (int code in codes)
    {
        int step = StepTable[index];
        int diffQ = step >> 3;
        if ((code & 4) != 0) diffQ += step;
        if ((code & 2) != 0) diffQ += step >> 1;
        if ((code & 1) != 0) diffQ += step >> 2;
        if ((code & 8) != 0) diffQ = -diffQ;
        predicted = Clamp(predicted + diffQ, -32768, 32767);
        outSamples.Add(predicted);
        index = Clamp(index + IndexTable[code], 0, 25);
    }
    return outSamples;
}
```
