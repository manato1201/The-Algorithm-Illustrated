---
name: ウェーブシェーピング歪み(Waveshaping Distortion)
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(1)(1サンプルあたり、テーブル参照または関数評価)
summary: 非線形な伝達関数(シェーピング関数)を波形サンプルへ直接適用し、倍音を付加してディストーション・サチュレーションを生成する最も基本的な歪みエフェクトの実装方式。
---

## 概要

ギターアンプの歪みやアナログ機材のサチュレーション(飽和)は、回路が信号を増幅する際に線形範囲を超えて出力が頭打ちになることで生まれる**非線形な波形の変形**である。ウェーブシェーピング歪みは、この物理現象を単純な数式でモデル化したもので、各サンプル値`x`を非線形な関数`f(x)`(シェーピング関数)に通すだけで新しいサンプル値を得る。フィルタのように過去のサンプルを参照する必要がなく、サンプルごとに独立した関数適用で完結するため実装が非常に単純でありながら、シェーピング関数の形状次第で柔らかいサチュレーションから激しいディストーションまで幅広い音色を作れる。デジタルシンセサイザーの音色生成やギターエフェクターのソフトウェア実装で広く使われる基本技法である。

## 仕組み

1. シェーピング関数`f(x)`を選ぶ。代表的なものに以下がある:
   - **ハードクリッピング**: `f(x) = clamp(x, -threshold, threshold)`。しきい値を超えた部分をそのまま切り落とす、最も急激な非線形性
   - **tanhによるソフトクリッピング**: `f(x) = tanh(k・x)`。`k`(ドライブ量)が大きいほど飽和が急峻になり、`k`が小さいうちは滑らかに波形の角が丸まる程度で済む。ハードクリッピングより滑らかに歪みが立ち上がるため耳障りな高調波が出にくい
   - **多項式シェーピング**: `f(x) = x - x³/3`(3次のチェビシェフ多項式に近い形)のように、多項式でも非線形カーブを作れる
2. 入力信号の各サンプル`x[n]`に対して`y[n] = f(g・x[n])`を計算する(`g`はあらかじめ信号を持ち上げる入力ゲイン、いわゆる「ドライブ」量)。フィルタと異なり過去の状態を持たないため、サンプルごとに独立して並列計算できる
3. 非線形関数を通すと、元の信号になかった**高調波(倍音)**が新たに生成される。これが「歪み」として知覚される音色変化の正体であり、シェーピング関数の形状(奇関数か偶関数か、曲がり方の鋭さ)によって生成される倍音の構成(奇数次倍音中心か偶数次倍音も含むか)が変わる
4. 出力レベルを整えるため、歪みで持ち上がった全体音量を`y[n] ← y[n] / f(g)`のように正規化したり、出力段にローパスフィルタやゲイン調整を加えることが多い

## 特性・トレードオフ

- **エイリアシング(折り返し雑音)が最大の課題**: 非線形関数によって生成される高調波は理論上無限次まで広がるため、サンプリング周波数のナイキスト周波数を超えた成分が折り返り、耳障りなエイリアシングノイズとして現れやすい。特にハードクリッピングのような急峻な非線形性ほどこの問題が顕著になる
- **オーバーサンプリングによる対策**: エイリアシングを抑えるため、シェーピング処理の前に信号を(例えば4倍や8倍に)アップサンプリングしてから非線形関数を適用し、処理後にローパスフィルタをかけてから元のサンプリング周波数へダウンサンプリングする手法が一般的に使われる。これにより、生成された高調波のナイキスト周波数が実効的に引き上げられ、可聴域への折り返しが減る
- **関数形状が音色を直接支配する**: ハードクリッピングは倍音が豊富で攻撃的な音色(パンチの効いたディストーション)になりやすく、tanhのような滑らかな飽和カーブはウォームなアナログ的サチュレーションに近い音色になる。奇関数(`f(-x) = -f(x)`)は奇数次倍音のみを生成し、非対称な関数(例えば正負でクリップ量が異なる)は偶数次倍音も生成する
- **フィルタとの違い**: [双二次フィルタ](/algorithms/biquad-filter)のような線形フィルタは周波数成分の相対的な大きさを変えるだけで新しい周波数成分を生み出さないのに対し、ウェーブシェーピングは非線形変換によって元の信号になかった周波数成分(倍音)を積極的に作り出す。両者は音作りの上で補完的に使われることが多い(歪みの後にトーン整形フィルタをかけるなど)
- **使いどころ**: ギターアンプシミュレータ・ディストーション/オーバードライブエフェクター、シンセサイザーのウェーブシェイピング音源、ミックスにアナログ的な質感を加えるサチュレーションプラグイン

## 実装例

```python
import math

def hard_clip(x: float, threshold: float = 0.7) -> float:
    return max(-threshold, min(threshold, x))

def soft_clip_tanh(x: float, drive: float = 3.0) -> float:
    return math.tanh(drive * x) / math.tanh(drive)

def upsample_linear(x: list[float], factor: int) -> list[float]:
    out = []
    for i in range(len(x) - 1):
        out.append(x[i])
        for k in range(1, factor):
            t = k / factor
            out.append(x[i] * (1 - t) + x[i + 1] * t)
    out.append(x[-1])
    return out

def downsample_average(x: list[float], factor: int) -> list[float]:
    return [
        sum(x[i:i + factor]) / len(x[i:i + factor])
        for i in range(0, len(x) - factor + 1, factor)
    ]

def waveshape_with_oversampling(
    x: list[float], drive: float = 3.0, oversample: int = 4,
) -> list[float]:
    up = upsample_linear(x, oversample)
    shaped = [soft_clip_tanh(s, drive) for s in up]
    return downsample_average(shaped, oversample)
```

```typescript
function hardClip(x: number, threshold = 0.7): number {
  return Math.max(-threshold, Math.min(threshold, x));
}

function softClipTanh(x: number, drive = 3.0): number {
  return Math.tanh(drive * x) / Math.tanh(drive);
}

function upsampleLinear(x: Float64Array, factor: number): Float64Array {
  const out: number[] = [];
  for (let i = 0; i < x.length - 1; i++) {
    out.push(x[i]);
    for (let k = 1; k < factor; k++) {
      const t = k / factor;
      out.push(x[i] * (1 - t) + x[i + 1] * t);
    }
  }
  out.push(x[x.length - 1]);
  return Float64Array.from(out);
}

function downsampleAverage(x: Float64Array, factor: number): Float64Array {
  const n = Math.floor((x.length - factor) / factor) + 1;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < factor; k++) sum += x[i * factor + k];
    out[i] = sum / factor;
  }
  return out;
}

function waveshapeWithOversampling(
  x: Float64Array,
  drive = 3.0,
  oversample = 4,
): Float64Array {
  const up = upsampleLinear(x, oversample);
  const shaped = up.map((s) => softClipTanh(s, drive));
  return downsampleAverage(Float64Array.from(shaped), oversample);
}
```
