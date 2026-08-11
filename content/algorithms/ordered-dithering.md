---
name: 順序ディザリング(Ordered Dithering)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(w・h)(w×hは画像の画素数)
summary: 固定のしきい値パターン(ベイヤー行列)を画素位置に応じて周期的に適用し、限られた階調数でも視覚的になめらかなグラデーションに見せかける。
---

## 概要

低ビット深度のディスプレイやテクスチャ(例: 各チャンネル数bit)でグラデーションを表示すると、階調が足りず「バンディング(色の帯)」と呼ばれる不自然な縞模様が現れる。順序ディザリング(組織的ディザリング)は、各画素を丸め込む際のしきい値を、あらかじめ決まった規則的なパターン(**ベイヤー行列**が代表的)に基づいて画素ごとにわずかにずらすことで、局所的には粗い階調のまま、離れて見ると人間の目には滑らかな階調に見えるという錯覚を作り出す。ゲームのレトロなドット絵表現から、実際に低ビット深度出力(HDR→SDRトーンマッピング後のバンディング対策など)まで幅広く使われる。

## 仕組み

1. あらかじめ`n×n`(例: 4×4や8×8)の**ベイヤー行列**を用意する。この行列は「各セルに0〜n²-1の整数が、隣接するセル同士がなるべく離れた値になるように再帰的に配置された」特殊なパターンで、単純なグリッド状の量子化より視覚的なムラが出にくい
2. ベイヤー行列の各値を`[0, 1)`の範囲に正規化し、しきい値マップ`T(x mod n, y mod n)`として扱う
3. 各画素`(x, y)`の元の色値`v`(0〜1に正規化)について、`v + T(x mod n, y mod n) / (階調数)`のように、その画素の位置に応じたしきい値分だけオフセットを加えてから、目的の階調数に丸め込む
4. これにより、本来同じ丸め込み結果になるはずの画素でも、位置によって「切り上げ」と「切り下げ」がベイヤー行列のパターンに従って混在するようになり、平均的な明るさが元の値に近づく(誤差拡散法と似た目的だが、順序ディザは近傍画素への依存がなく完全に並列処理できる点が異なる)

## 特性・トレードオフ

- **完全に並列化できる**: 各画素の計算がその画素の位置と値だけで決まり、他の画素の処理結果に依存しない(誤差拡散法のフロイド・スタインバーグ法は逐次的に誤差を伝播させる必要がある)。GPUのピクセルシェーダで1画素ずつ独立に計算できるため、リアルタイムレンダリングに向いている
- **視覚的なパターンが規則的**: ベイヤー行列由来の格子状のパターンがわずかに視認できることがあり、誤差拡散法のような不規則なノイズパターンに比べて「機械的な模様」に見えやすい。この特性を逆手に取り、レトロゲーム風の意図的なドット模様表現として使われることも多い
- **時間方向のディザ(Temporal Dithering)への拡張**: 静止画では格子パターンが目立つ場合でも、フレームごとにしきい値マップの位相をずらす(または乱数化する)ことで、人間の目には時間的に平均化されてさらに滑らかに見える。動画・ゲームのポストプロセスでよく使われる工夫
- **使いどころ**: HDRレンダリングパイプラインのトーンマッピング後のバンディング対策、低ビット深度ディスプレイ・テクスチャ圧縮フォーマットへの変換、レトロ/ピクセルアート風のシェーダー表現、印刷業界のハーフトーン処理(起源の一つ)

## 実装例

```python
BAYER_4X4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

def ordered_dither(image: list[list[float]], levels: int = 4) -> list[list[int]]:
    """image[y][x] は0.0〜1.0の輝度。levels階調に量子化した結果を返す。"""
    h, w = len(image), len(image[0])
    n = len(BAYER_4X4)
    out = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            threshold = (BAYER_4X4[y % n][x % n] + 0.5) / (n * n)
            scaled = image[y][x] * (levels - 1) + threshold - 0.5
            out[y][x] = max(0, min(levels - 1, round(scaled)))
    return out
```

```typescript
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function orderedDither(image: number[][], levels = 4): number[][] {
  const h = image.length;
  const w = image[0].length;
  const n = BAYER_4X4.length;
  const out: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const threshold = (BAYER_4X4[y % n][x % n] + 0.5) / (n * n);
      const scaled = image[y][x] * (levels - 1) + threshold - 0.5;
      out[y][x] = Math.max(0, Math.min(levels - 1, Math.round(scaled)));
    }
  }
  return out;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <cmath>

static const int BAYER_4X4[4][4] = {
    {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5},
};

std::vector<std::vector<int>> orderedDither(const std::vector<std::vector<double>>& image, int levels = 4) {
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    std::vector<std::vector<int>> out(h, std::vector<int>(w, 0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16.0;
            double scaled = image[y][x] * (levels - 1) + threshold - 0.5;
            out[y][x] = std::clamp(static_cast<int>(std::round(scaled)), 0, levels - 1);
        }
    }
    return out;
}
```

```rust
const BAYER_4X4: [[i32; 4]; 4] = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

fn ordered_dither(image: &[Vec<f64>], levels: i32) -> Vec<Vec<i32>> {
    let h = image.len();
    let w = image[0].len();
    let mut out = vec![vec![0i32; w]; h];
    for y in 0..h {
        for x in 0..w {
            let threshold = (BAYER_4X4[y % 4][x % 4] as f64 + 0.5) / 16.0;
            let scaled = image[y][x] * (levels - 1) as f64 + threshold - 0.5;
            out[y][x] = (scaled.round() as i32).clamp(0, levels - 1);
        }
    }
    out
}
```

```csharp
static readonly int[,] Bayer4x4 = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } };

static int[][] OrderedDither(double[][] image, int levels = 4)
{
    int h = image.Length, w = image[0].Length;
    var outArr = new int[h][];
    for (int y = 0; y < h; y++)
    {
        outArr[y] = new int[w];
        for (int x = 0; x < w; x++)
        {
            double threshold = (Bayer4x4[y % 4, x % 4] + 0.5) / 16.0;
            double scaled = image[y][x] * (levels - 1) + threshold - 0.5;
            outArr[y][x] = Math.Clamp((int)Math.Round(scaled), 0, levels - 1);
        }
    }
    return outArr;
}
```
