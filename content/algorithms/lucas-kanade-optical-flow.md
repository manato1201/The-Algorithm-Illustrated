---
name: Lucas-Kanade法(オプティカルフロー)
category: コンピュータビジョン
subcategory: セグメンテーション・追跡
complexity: O(w×h)(1フレームあたり、局所探索窓のサイズは定数)
summary: 「明るさは短時間では保存される」という仮定のもと、連続する2フレーム間で各点がどちらへ動いたかを局所的な連立方程式で推定する動き推定法。
---

## 概要

動画の中で物体がどう動いているかを画素単位で追跡する「オプティカルフロー」の推定は、自動運転の障害物追跡やモーションキャプチャなど多くの応用を持つ。1981年にルーカスとカナデが提案した手法は、「ごく短い時間(1フレーム間)では、動いている点の明るさはほとんど変化しない」という自然な仮定(輝度恒常性の仮定)から出発し、その仮定を数式化した「オプティカルフロー方程式」を、各点の周囲の小さな窓の中で連立方程式として解くことで、各点の移動ベクトル(速度)を求める。

## 仕組み

1. 輝度恒常性の仮定`I(x, y, t) = I(x + dx, y + dy, t + dt)`(時刻`t`の点`(x,y)`の明るさは、`dt`後には`(x+dx, y+dy)`に移動しているだけで明るさ自体は変わらない)をテイラー展開して1次近似すると、`Ix×u + Iy×v + It = 0`という関係式(オプティカルフロー方程式)が得られる。ここで`Ix`、`Iy`は空間方向の勾配([ソーベルフィルタ](/algorithms/sobel-filter)等で計算)、`It`は時間方向の変化、`(u, v)`が求めたい移動ベクトルである
2. 未知数`(u, v)`に対して方程式が1つしかなく、このままでは解が定まらない(「開口問題」と呼ばれる、1本のエッジだけを見ていると、エッジに沿った方向の動きは分からないという曖昧さ)
3. Lucas-Kanade法は、「注目点の周囲の小さな窓(例えば5×5画素)の中では、全ての画素が同じ`(u, v)`で動いている」という追加の仮定を置くことで、この曖昧さを解消する。窓内の各画素についてオプティカルフロー方程式を立てると、未知数2つに対して多数の方程式ができる過剰決定系になる
4. これを[最小二乗法](/algorithms/least-squares)で解くと、`(u, v)`を求める2×2の連立方程式(構造テンソル行列が登場する点は[Harrisコーナー検出](/algorithms/harris-corner-detection)と同じ数学的構造)が得られ、[ガウスの消去法](/algorithms/gaussian-elimination)のような手法で効率的に解ける

## 特性・トレードオフ

- **計算量**: 追跡したい各点について、周囲の小さな固定サイズの窓で連立方程式を解くだけなので非常に高速。全画素ではなく[Harrisコーナー検出](/algorithms/harris-corner-detection)等で選んだ「追跡しやすい特徴点」だけを追跡対象にすることが多い(疎なオプティカルフロー)
- **開口問題への部分的な対処**: 窓内で構造テンソルの2つの固有値が両方十分大きい(=コーナーらしい)点では信頼できる`(u, v)`が求まるが、窓がエッジ上や平坦な領域にある場合は解が不安定または不定になる——これが「追跡しやすい点(コーナー)を先に選ぶ」ことが重要な理由
- **大きな動きに弱い**: テイラー展開による1次近似は、フレーム間の動きが小さいことを前提にしている。動きが大きいと近似が破綻するため、実用の実装では画像をぼかして粗いスケールから細かいスケールへ段階的に推定を精緻化するピラミッド階層アプローチが標準的に使われる
- **使いどころ**: 動画のモーション追跡・手ブレ補正、拡張現実(AR)でのマーカーレストラッキング、ビデオ圧縮の動き補償、ロボットの視覚オドメトリ(カメラの動きからの自己位置推定)

## 実装例

窓内の各画素における輝度勾配`(Ix, Iy)`と時間変化`It`から、2×2の正規方程式を解いて移動ベクトル`(u, v)`を求める。

```python
def lucas_kanade(ix: list[float], iy: list[float], it: list[float]) -> tuple[float, float]:
    """窓内の勾配 Ix, Iy と時間変化 It から移動ベクトル (u, v) を最小二乗法で求める"""
    sxx = sum(x * x for x in ix)
    syy = sum(y * y for y in iy)
    sxy = sum(x * y for x, y in zip(ix, iy))
    sxt = sum(x * t for x, t in zip(ix, it))
    syt = sum(y * t for y, t in zip(iy, it))

    det = sxx * syy - sxy * sxy
    if abs(det) < 1e-12:
        # 開口問題: 勾配が平行(エッジ上)で行列が特異、動きを一意に決められない
        return (0.0, 0.0)

    u = (-syy * sxt + sxy * syt) / det
    v = (sxy * sxt - sxx * syt) / det
    return (u, v)
```

```typescript
function lucasKanade(ix: number[], iy: number[], it: number[]): [number, number] {
  let sxx = 0,
    syy = 0,
    sxy = 0,
    sxt = 0,
    syt = 0;
  for (let i = 0; i < ix.length; i++) {
    sxx += ix[i] * ix[i];
    syy += iy[i] * iy[i];
    sxy += ix[i] * iy[i];
    sxt += ix[i] * it[i];
    syt += iy[i] * it[i];
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-12) {
    // 開口問題: 勾配が平行(エッジ上)で行列が特異
    return [0, 0];
  }
  const u = (-syy * sxt + sxy * syt) / det;
  const v = (sxy * sxt - sxx * syt) / det;
  return [u, v];
}
```

```cpp
#include <utility>
#include <vector>
#include <cmath>

std::pair<double, double> lucasKanade(const std::vector<double>& ix, const std::vector<double>& iy,
                                       const std::vector<double>& it) {
    double sxx = 0, syy = 0, sxy = 0, sxt = 0, syt = 0;
    for (size_t i = 0; i < ix.size(); i++) {
        sxx += ix[i] * ix[i];
        syy += iy[i] * iy[i];
        sxy += ix[i] * iy[i];
        sxt += ix[i] * it[i];
        syt += iy[i] * it[i];
    }
    double det = sxx * syy - sxy * sxy;
    if (std::abs(det) < 1e-12) {
        return {0.0, 0.0};  // 開口問題: 勾配が平行で行列が特異
    }
    double u = (-syy * sxt + sxy * syt) / det;
    double v = (sxy * sxt - sxx * syt) / det;
    return {u, v};
}
```

```rust
fn lucas_kanade(ix: &[f64], iy: &[f64], it: &[f64]) -> (f64, f64) {
    let mut sxx = 0.0;
    let mut syy = 0.0;
    let mut sxy = 0.0;
    let mut sxt = 0.0;
    let mut syt = 0.0;
    for i in 0..ix.len() {
        sxx += ix[i] * ix[i];
        syy += iy[i] * iy[i];
        sxy += ix[i] * iy[i];
        sxt += ix[i] * it[i];
        syt += iy[i] * it[i];
    }
    let det = sxx * syy - sxy * sxy;
    if det.abs() < 1e-12 {
        return (0.0, 0.0); // 開口問題: 勾配が平行で行列が特異
    }
    let u = (-syy * sxt + sxy * syt) / det;
    let v = (sxy * sxt - sxx * syt) / det;
    (u, v)
}
```

```csharp
static (double u, double v) LucasKanade(double[] ix, double[] iy, double[] it)
{
    double sxx = 0, syy = 0, sxy = 0, sxt = 0, syt = 0;
    for (int i = 0; i < ix.Length; i++)
    {
        sxx += ix[i] * ix[i];
        syy += iy[i] * iy[i];
        sxy += ix[i] * iy[i];
        sxt += ix[i] * it[i];
        syt += iy[i] * it[i];
    }
    double det = sxx * syy - sxy * sxy;
    if (Math.Abs(det) < 1e-12) return (0, 0); // 開口問題: 勾配が平行で行列が特異

    double u = (-syy * sxt + sxy * syt) / det;
    double v = (sxy * sxt - sxx * syt) / det;
    return (u, v);
}
```
