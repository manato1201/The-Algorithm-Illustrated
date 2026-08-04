---
name: 大津の二値化(Otsu's Method)
category: コンピュータビジョン
subcategory: セグメンテーション・追跡
complexity: O(L)(Lは輝度階調数、通常256。ヒストグラム計算にO(WH)が別途必要)
summary: 画像を前景と背景の2つに分ける最適な輝度の閾値を、両者を分けた際のクラス間分散が最大になる(=クラス内分散が最小になる)点として自動的に決定する、人手で閾値を調整する必要がない二値化手法。
---

## 概要

画像を「物体(前景)」と「背景」の2つの領域に単純に分割したいとき、最も素朴な方法は「輝度がある閾値より明るければ前景、暗ければ背景」という二値化だが、その閾値をどう決めるかが問題になる。1979年に大津展之が発表したこの手法は、画像の輝度ヒストグラムだけから、この閾値を完全に自動的かつ最適に決定する——候補となる全ての閾値について「その閾値で2つのクラスに分けたときの、クラス間の分離の良さ」を評価し、最も良く分離できる閾値を選ぶ。[Watershed法](/algorithms/watershed-algorithm)のような高度な領域分割の前処理として、あるいは単体の二値化手法として、画像処理の教科書に必ず登場する古典的かつ実用的な手法である。

## 仕組み

1. 画像の輝度ヒストグラム(各輝度値0〜255が画像中に何回出現するか)を計算する
2. 候補となる閾値`t`を0から255まで順に試す。各`t`について、画像の画素を「輝度が`t`以下のクラス(背景)」と「`t`より大きいクラス(前景)」の2つに分ける
3. 2つのクラスそれぞれの画素数の割合・輝度の平均値を計算し、「クラス間分散」(2つのクラスの平均輝度がどれだけ離れているか、それぞれのクラスの画素数で重み付けしたもの)を計算する
4. 全ての候補`t`の中から、クラス間分散が最大になる`t`を選ぶ——これは数学的に「クラス内分散(各クラス内でのばらつき)を最小化する」ことと等価であることが示せる(全体の分散はクラス内分散とクラス間分散の和で一定なので、片方を最大化することはもう片方を最小化することと同じになる)
5. 選ばれた`t`を閾値として、画像全体を二値化する(`t`以下を背景の黒、`t`より大きい部分を前景の白に置き換える)

## 特性・トレードオフ

- **計算量**: 輝度階調数`L`(通常256)の候補全てについてクラス間分散を計算するため`O(L)`——ヒストグラム自体の計算に画像全体を1回走査する`O(WH)`が必要だが、それさえ済めば閾値探索自体は極めて軽量
- **完全に自動化された閾値決定という利点**: 人手で「明るさ128を閾値にする」のような決め打ちをする必要がなく、画像ごとのヒストグラムの形状に応じて最適な閾値が自動的に決まる——照明条件が撮影ごとに変わる実務のシステムで、閾値を都度調整する手間を省ける
- **双峰性(2つの山)を前提とするという制約**: この手法は「前景と背景で輝度が明確に2つの山に分かれている」ことを暗黙に仮定している。照明ムラがある画像やヒストグラムが単峰性(山が1つ)の画像では、大津の二値化だけでは良い分割ができず、適応的二値化(画像を小領域に分けてそれぞれ別の閾値を計算する)や[Watershed法](/algorithms/watershed-algorithm)のような領域分割手法が必要になる
- **[Watershed法](/algorithms/watershed-algorithm)との関係**: 大津の二値化は単一の閾値による大域的な分割だが、[Watershed法](/algorithms/watershed-algorithm)は輝度地形の勾配に基づく局所的な領域分割を行う——大津の二値化で粗く前景・背景を分けてから、その結果を[Watershed法](/algorithms/watershed-algorithm)の初期マーカーとして使う、という2段階の組み合わせもよく行われる
- **使いどころ**: 文書画像の二値化(OCR前処理としての文字と背景の分離)、医療画像における病変領域の粗い抽出、工業製品の外観検査における欠陥領域の分離、[連結成分ラベリング](/algorithms/connected-component-labeling)の前段としての二値化処理

## 実装例

輝度ヒストグラムからクラス間分散を最大化する閾値を`O(L)`で求める。各候補`t`について画素集合を実際に2分してクラス間分散を計算する総当たり実装(`O(L × 画素数)`)と結果が一致することを検証する。

```python
def compute_histogram(pixels: list[int], levels: int = 256) -> list[int]:
    hist = [0] * levels
    for p in pixels:
        hist[p] += 1
    return hist


def otsu_threshold(pixels: list[int], levels: int = 256) -> int:
    hist = compute_histogram(pixels, levels)
    total = len(pixels)
    sum_total = sum(i * hist[i] for i in range(levels))

    sum_bg, weight_bg = 0.0, 0
    best_variance, best_threshold = -1.0, 0
    for t in range(levels):
        weight_bg += hist[t]
        if weight_bg == 0:
            continue
        weight_fg = total - weight_bg
        if weight_fg == 0:
            break
        sum_bg += t * hist[t]
        mean_bg = sum_bg / weight_bg
        mean_fg = (sum_total - sum_bg) / weight_fg
        # クラス間分散: 2クラスの画素数で重み付けした平均輝度差の2乗
        between_variance = weight_bg * weight_fg * (mean_bg - mean_fg) ** 2
        if between_variance > best_variance:
            best_variance, best_threshold = between_variance, t
    return best_threshold
```

```typescript
function computeHistogram(pixels: number[], levels = 256): number[] {
  const hist = new Array(levels).fill(0);
  for (const p of pixels) hist[p]++;
  return hist;
}

function otsuThreshold(pixels: number[], levels = 256): number {
  const hist = computeHistogram(pixels, levels);
  const total = pixels.length;
  let sumTotal = 0;
  for (let i = 0; i < levels; i++) sumTotal += i * hist[i];

  let sumBg = 0;
  let weightBg = 0;
  let bestVariance = -1;
  let bestThreshold = 0;
  for (let t = 0; t < levels; t++) {
    weightBg += hist[t];
    if (weightBg === 0) continue;
    const weightFg = total - weightBg;
    if (weightFg === 0) break;
    sumBg += t * hist[t];
    const meanBg = sumBg / weightBg;
    const meanFg = (sumTotal - sumBg) / weightFg;
    // クラス間分散: 2クラスの画素数で重み付けした平均輝度差の2乗
    const betweenVariance = weightBg * weightFg * (meanBg - meanFg) ** 2;
    if (betweenVariance > bestVariance) {
      bestVariance = betweenVariance;
      bestThreshold = t;
    }
  }
  return bestThreshold;
}
```

```cpp
#include <vector>

std::vector<int> computeHistogram(const std::vector<int>& pixels, int levels = 256) {
    std::vector<int> hist(levels, 0);
    for (int p : pixels) hist[p]++;
    return hist;
}

int otsuThreshold(const std::vector<int>& pixels, int levels = 256) {
    auto hist = computeHistogram(pixels, levels);
    int total = static_cast<int>(pixels.size());
    double sumTotal = 0;
    for (int i = 0; i < levels; i++) sumTotal += i * hist[i];

    double sumBg = 0;
    int weightBg = 0;
    double bestVariance = -1;
    int bestThreshold = 0;
    for (int t = 0; t < levels; t++) {
        weightBg += hist[t];
        if (weightBg == 0) continue;
        int weightFg = total - weightBg;
        if (weightFg == 0) break;
        sumBg += t * hist[t];
        double meanBg = sumBg / weightBg;
        double meanFg = (sumTotal - sumBg) / weightFg;
        // クラス間分散: 2クラスの画素数で重み付けした平均輝度差の2乗
        double betweenVariance = static_cast<double>(weightBg) * weightFg * (meanBg - meanFg) * (meanBg - meanFg);
        if (betweenVariance > bestVariance) {
            bestVariance = betweenVariance;
            bestThreshold = t;
        }
    }
    return bestThreshold;
}
```

```rust
fn compute_histogram(pixels: &[usize], levels: usize) -> Vec<i32> {
    let mut hist = vec![0; levels];
    for &p in pixels {
        hist[p] += 1;
    }
    hist
}

fn otsu_threshold(pixels: &[usize], levels: usize) -> usize {
    let hist = compute_histogram(pixels, levels);
    let total = pixels.len() as i64;
    let sum_total: i64 = (0..levels).map(|i| i as i64 * hist[i] as i64).sum();

    let mut sum_bg: i64 = 0;
    let mut weight_bg: i64 = 0;
    let mut best_variance = -1.0_f64;
    let mut best_threshold = 0usize;

    for t in 0..levels {
        weight_bg += hist[t] as i64;
        if weight_bg == 0 {
            continue;
        }
        let weight_fg = total - weight_bg;
        if weight_fg == 0 {
            break;
        }
        sum_bg += t as i64 * hist[t] as i64;
        let mean_bg = sum_bg as f64 / weight_bg as f64;
        let mean_fg = (sum_total - sum_bg) as f64 / weight_fg as f64;
        // クラス間分散: 2クラスの画素数で重み付けした平均輝度差の2乗
        let between_variance = weight_bg as f64 * weight_fg as f64 * (mean_bg - mean_fg).powi(2);
        if between_variance > best_variance {
            best_variance = between_variance;
            best_threshold = t;
        }
    }
    best_threshold
}
```

```csharp
static int[] ComputeHistogram(List<int> pixels, int levels = 256)
{
    var hist = new int[levels];
    foreach (var p in pixels) hist[p]++;
    return hist;
}

static int OtsuThreshold(List<int> pixels, int levels = 256)
{
    var hist = ComputeHistogram(pixels, levels);
    int total = pixels.Count;
    double sumTotal = 0;
    for (int i = 0; i < levels; i++) sumTotal += i * hist[i];

    double sumBg = 0;
    int weightBg = 0;
    double bestVariance = -1;
    int bestThreshold = 0;
    for (int t = 0; t < levels; t++)
    {
        weightBg += hist[t];
        if (weightBg == 0) continue;
        int weightFg = total - weightBg;
        if (weightFg == 0) break;
        sumBg += t * hist[t];
        double meanBg = sumBg / weightBg;
        double meanFg = (sumTotal - sumBg) / weightFg;
        // クラス間分散: 2クラスの画素数で重み付けした平均輝度差の2乗
        double betweenVariance = weightBg * (double)weightFg * Math.Pow(meanBg - meanFg, 2);
        if (betweenVariance > bestVariance)
        {
            bestVariance = betweenVariance;
            bestThreshold = t;
        }
    }
    return bestThreshold;
}
```
