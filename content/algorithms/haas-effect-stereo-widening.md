---
name: ハース効果によるステレオ音像拡張
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nは処理サンプル数)
summary: 片方のチャンネルに数十ミリ秒未満の短い遅延を加え、先行音効果によって音の方向知覚を保ったままステレオ音像を広く感じさせる心理音響エフェクト。
---

## 概要

人間は同じ音が両耳にわずかに異なるタイミングで届くとき、通常は最初に到達した音の方向をその音源の方向として知覚し、後から届くわずかに遅れた音は方向知覚にほとんど影響を与えない(むしろ音の広がり・空間の豊かさとして感じられる)。この現象は1949年に心理音響学者ヘルムート・ハースが報告したことから「ハース効果(先行音効果、precedence effect)」と呼ばれる。ハース効果によるステレオ音像拡張は、モノラルに近い音源の片方のチャンネルだけに1〜30ミリ秒程度のごく短い遅延を加えることで、この心理音響現象を意図的に利用し、単一の点音源として聞こえていた音を「広がりのある音像」として知覚させるミキシング・マスタリングの定番テクニックである。

## 仕組み

1. 元の信号(通常はモノラル、またはステレオの片チャンネル)を`L`(左)・`R`(右)の2チャンネルに複製する
2. 一方のチャンネル(例えば`R`)にのみ、サンプル数に換算した短い遅延`D`(サンプリング周波数`fs`に対して`D = fs・delay_ms / 1000`)を適用する: `R[n] = x[n - D]`(`n < D`では無音またはゼロ埋め)。遅延量`delay_ms`は典型的に**1ms〜30ms程度**に収める。この範囲を超えると先行音効果が破綻し、単一の音ではなく明確な「こだま(エコー)」として知覚されてしまう
3. `L`チャンネルは元の信号のまま(遅延なし)とする: `L[n] = x[n]`
4. 必要に応じて遅延側のチャンネルにわずかなゲイン差やハイシェルフEQ(高域を少し削るなど)を加え、遅延がもたらす軽微なコムフィルタ効果(遅延信号と原音がミックスされる場面で生じる周波数の山谷)による音色変化を調整する
5. 遅延量を意図的に変化させることで音像の広がり方の印象をコントロールできる。短い遅延(1〜5ms程度)は音の輪郭がわずかにぼやける程度の微妙な広がり、中程度の遅延(10〜25ms程度)はより明確な左右の広がりを生む。30msを超えると単一音像として融合しなくなる点に注意が必要

## 特性・トレードオフ

- **モノラル互換性の低下**: 左右チャンネルを合算(モノラルサミング)すると、遅延時間の逆数に対応する周波数で位相が反転し打ち消し合うコムフィルタ効果が生じ、特定の周波数帯域が減衰する。ステレオ再生では自然に聞こえても、モノラル再生(一部の放送・PA環境など)では音が薄く痩せて聞こえることがあるため、モノラル再生を想定する用途では遅延量やミックス量を慎重に調整する必要がある
- **方向知覚と広がり感のトレードオフ**: 遅延量を増やすほど音の広がりは強く感じられるが、同時に先行音効果が効きにくくなり、音像がぼやけたり定位が不安定になったりする。実務では5〜20ms程度の範囲でミックスに応じて調整されることが多い
- **他のステレオ処理との違い**: パンニング(単純に左右の音量バランスを変える)は音量差だけで方向を作るのに対し、ハース効果は時間差(位相差)によって知覚上の方向・広がりを作る。両者は組み合わせて使われることも多く、より複雑なステレオイメージング処理(ミッド・サイド処理、周波数帯域別のステレオ幅制御)の基礎としても使われる
- **使いどころ**: ボーカル・シンセ・ギターのダブリング(擬似的な重ね録り効果)によるステレオ拡張、モノラル音源の擬似ステレオ化、ゲームオーディオでの音源の空間的な広がり演出、マスタリングにおけるステレオイメージ調整

## 実装例

```python
def haas_widen(
    mono: list[float], sample_rate: int, delay_ms: float = 15.0, wet_gain: float = 1.0,
) -> tuple[list[float], list[float]]:
    delay_samples = int(sample_rate * delay_ms / 1000)
    n = len(mono)

    left = list(mono)
    right = [0.0] * n
    for i in range(n):
        src_idx = i - delay_samples
        right[i] = wet_gain * mono[src_idx] if src_idx >= 0 else 0.0

    return left, right

def mono_sum_check(left: list[float], right: list[float]) -> list[float]:
    """モノラルサミング後の信号を確認するためのユーティリティ(コムフィルタ効果の検証用)"""
    return [(l + r) / 2 for l, r in zip(left, right)]
```

```typescript
function haasWiden(
  mono: Float64Array,
  sampleRate: number,
  delayMs = 15.0,
  wetGain = 1.0,
): { left: Float64Array; right: Float64Array } {
  const delaySamples = Math.floor((sampleRate * delayMs) / 1000);
  const n = mono.length;

  const left = Float64Array.from(mono);
  const right = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const srcIdx = i - delaySamples;
    right[i] = srcIdx >= 0 ? wetGain * mono[srcIdx] : 0;
  }

  return { left, right };
}

function monoSumCheck(left: Float64Array, right: Float64Array): Float64Array {
  const out = new Float64Array(left.length);
  for (let i = 0; i < left.length; i++) out[i] = (left[i] + right[i]) / 2;
  return out;
}
```
