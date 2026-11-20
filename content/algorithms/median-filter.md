---
name: メディアンフィルタ
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(n·w log w)(窓幅 w を毎回整列する素朴な実装)、効率化すると O(n·log w) 以下
summary: 各点を、その周囲の窓の中央値で置き換える非線形フィルタ。ごま塩ノイズのような突発的な外れ値を取り除きながら、エッジの鋭さを保つ。
---

## 概要

ノイズ除去の基本は、周囲の値を平均する(移動平均、ガウシアンフィルタ)ことだが、平均には欠点がある。**ごま塩ノイズ**(センサーの不良や伝送の誤りで、ときどき極端に明るい・暗い値が混ざる)のように、1点だけ大きく外れた値があると、平均はそれに引きずられる。しかも、ノイズを均すと同時に、画像の輪郭(エッジ)もぼやけてしまう。

メディアンフィルタ(中央値フィルタ)は、John Tukey が1970年代に時系列の平滑化のために提案した「running median」を起源とし、画像処理にも広く使われるようになった。窓の中の値を**大きさの順に並べて、真ん中の値**を取る。極端な外れ値は並べると端に追いやられるので、1つや2つの外れ値は結果にまったく影響しない。また、窓がエッジをまたいでも、中央値は「どちらか一方の側の値」になるので、エッジが鈍らずに保たれる。

## 仕組み

1次元の信号 `x[0..n-1]`、窓の幅 `w`(奇数、`k = (w−1)/2`)とする。

1. 各位置 `i` について、`i−k .. i+k` の `w` 個の値を取り出す(端では、端の値を繰り返す、あるいは窓を狭めるなど、境界の規則を決める)
2. 取り出した値を並べ替えて、中央(`k` 番目)の値を `y[i]` とする
3. 全位置で繰り返す

画像(2次元)では、`3×3` や `5×5` の窓の値を並べて中央値を取る。カラー画像では、各チャンネルに別々に適用する(色が不自然に混ざる場合は、ベクトル中央値フィルタを使う)。

効率化: 窓が1つずれるたびに、「出ていく値を削除、入ってくる値を挿入」だけで中央値を更新できる(ソート済みの窓や、ヒストグラム、2つのヒープを使う)。画像の場合、行・列方向の再利用をする Huang の方法や、定数時間の方法(Perreault–Hébert)が知られている。

## 特性・トレードオフ

- **外れ値に強い**: 窓の半分未満の外れ値は、どれだけ極端な値でも結果に影響しない(崩壊点が高い)
- **エッジを保つ**: 階段状の変化は、窓幅の範囲でも階段のまま残る。一方で、移動平均は階段をなだらかなスロープにしてしまう
- **細い構造は消える**: 窓の幅の半分より細い線や小さな点は、ノイズと見なされて消える。窓幅の選び方が重要
- **非線形**: 重ね合わせの原理が成り立たず、周波数応答では語れない。ガウス雑音のように、全体に細かく乗ったノイズには、平均のほうが有効なこともある
- **計算がやや重い**: 素朴には並べ替えが必要で、平均より計算量が多い。大きな窓では効率化の工夫が必要
- **使いどころ**: ごま塩ノイズの除去、スキャン画像・衛星画像のノイズ除去、センサー信号のスパイク除去、画像のセグメンテーション前処理

## 実装例

```python
def median_filter(signal, window=5):
    k = window // 2
    n = len(signal)
    out = []
    for i in range(n):
        # 端は端の値を繰り返して窓を埋める
        chunk = [signal[min(max(j, 0), n - 1)] for j in range(i - k, i + k + 1)]
        out.append(sorted(chunk)[k])
    return out


def moving_average(signal, window=5):
    k = window // 2
    n = len(signal)
    return [sum(signal[min(max(j, 0), n - 1)] for j in range(i - k, i + k + 1)) / window for i in range(n)]


noisy = [1, 1, 1, 9, 1, 1, 1, 5, 5, 5, 0, 5, 5, 5]   # 階段の信号に、外れ値(9 と 0)が混ざっている
print(median_filter(noisy))                    # 外れ値は消え、階段は鋭いまま
print([round(v, 1) for v in moving_average(noisy)])  # 外れ値が周囲に広がり、階段もなまる
```

```typescript
function clampIndex(j: number, n: number): number {
  return Math.min(Math.max(j, 0), n - 1);
}

function medianFilter(signal: number[], window = 5): number[] {
  const k = Math.floor(window / 2);
  return signal.map((_, i) => {
    const chunk: number[] = [];
    for (let j = i - k; j <= i + k; j++)
      chunk.push(signal[clampIndex(j, signal.length)]);
    return chunk.sort((a, b) => a - b)[k];
  });
}

function movingAverage(signal: number[], window = 5): number[] {
  const k = Math.floor(window / 2);
  return signal.map((_, i) => {
    let sum = 0;
    for (let j = i - k; j <= i + k; j++)
      sum += signal[clampIndex(j, signal.length)];
    return sum / window;
  });
}

const noisy = [1, 1, 1, 9, 1, 1, 1, 5, 5, 5, 0, 5, 5, 5];
console.log(medianFilter(noisy)); // 外れ値は消え、階段は鋭いまま
console.log(movingAverage(noisy).map((v) => Number(v.toFixed(1)))); // 外れ値が広がり、階段もなまる
```
