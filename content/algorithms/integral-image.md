---
name: 積分画像(Summed-Area Table)
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(w×h)(前計算)+O(1)(1回の矩形和クエリ)
summary: 各画素までの累積和を事前計算しておくことで、画像内のどんな大きさの矩形領域の合計値も定数時間で求められるようにする前計算テーブル。
---

## 概要

画像処理では「この矩形領域の明るさの合計(または平均)はいくつか」というクエリを、ウィンドウの位置やサイズを変えながら何千回、何万回も繰り返すことがよくある(顔検出のViola-Jones法のHaar-like特徴量計算はその典型例)。素朴には矩形領域内の全画素を毎回足し合わせる必要があり、矩形が大きいと非常に遅い。積分画像は、[Fenwick木](/algorithms/fenwick-tree)や[Sparse Table](/algorithms/sparse-table)が1次元の区間和クエリを高速化するのと同じ発想を2次元に拡張したもので、事前に「原点から各画素までの累積和」を1回だけ計算しておけば、以降はどんな矩形領域の合計値も**足し算・引き算4回だけの定数時間**で求められるようにする。

## 仕組み

1. 元画像`I`と同じ大きさの積分画像`S`を用意する。`S(x, y)`を「原点`(0,0)`から`(x, y)`までの矩形領域内の全画素値の合計」と定義する
2. `S(x, y) = I(x, y) + S(x-1, y) + S(x, y-1) - S(x-1, y-1)`という漸化式で、画像の左上から右下へ1回走査するだけで`S`全体を計算できる(直前の行・列の累積和を再利用することで、各画素`O(1)`の更新で済む——これも2次元版の[動的計画法](/algorithms/lcs)と言える)
3. 任意の矩形領域`(x1, y1)`〜`(x2, y2)`の合計値を求めたいときは、包除原理を使って`S(x2,y2) - S(x1-1,y2) - S(x2,y1-1) + S(x1-1,y1-1)`という4点の値の加減算だけで計算できる(大きい矩形から、はみ出た2つの矩形を引き、二重に引きすぎた左上の矩形を足し戻す)

## 特性・トレードオフ

- **計算量**: 積分画像の構築は画像サイズに比例する`O(w×h)`の前計算が1回必要だが、これさえ済めば以降のどんな矩形領域の合計値クエリも矩形の大きさに関わらず`O(1)`で答えられる。同じ画像に対して大量の矩形和クエリを行う場面で絶大な効果を発揮する
- **メモリと精度のトレードオフ**: 累積和は画像全体を足し合わせた大きな値になりうるため、整数オーバーフローや浮動小数点の精度低下に注意が必要——画像サイズや画素値の範囲に応じて十分なビット幅の型を使う必要がある
- **1次元の区間和([Fenwick木](/algorithms/fenwick-tree)、[Sparse Table](/algorithms/sparse-table))との関係**: 積分画像は本質的に2次元の累積和(プレフィックス和)であり、1次元の区間和高速化の考え方をそのまま2次元に拡張したものとして理解できる
- **使いどころ**: Viola-Jones法による顔検出のHaar-like特徴量の高速計算(この技術の実用化がきっかけで広く知られるようになった)、局所的な平均値・分散を用いた適応的二値化、任意サイズのぼかしフィルタの高速近似(ボックスフィルタ)

## 実装例

```python
def build_integral_image(image: list[list[int]]) -> list[list[int]]:
    h, w = len(image), len(image[0])
    s = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            top = s[y - 1][x] if y > 0 else 0
            left = s[y][x - 1] if x > 0 else 0
            top_left = s[y - 1][x - 1] if y > 0 and x > 0 else 0
            s[y][x] = image[y][x] + top + left - top_left
    return s


def region_sum(integral: list[list[int]], x1: int, y1: int, x2: int, y2: int) -> int:
    """矩形(x1,y1)〜(x2,y2)の合計値を、4点の加減算だけで定数時間で求める"""
    def at(x: int, y: int) -> int:
        if x < 0 or y < 0:
            return 0
        return integral[y][x]
    return at(x2, y2) - at(x1 - 1, y2) - at(x2, y1 - 1) + at(x1 - 1, y1 - 1)
```

```typescript
function buildIntegralImage(image: number[][]): number[][] {
  const h = image.length;
  const w = image[0].length;
  const s: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const top = y > 0 ? s[y - 1][x] : 0;
      const left = x > 0 ? s[y][x - 1] : 0;
      const topLeft = y > 0 && x > 0 ? s[y - 1][x - 1] : 0;
      s[y][x] = image[y][x] + top + left - topLeft;
    }
  }
  return s;
}

function regionSum(integral: number[][], x1: number, y1: number, x2: number, y2: number): number {
  const at = (x: number, y: number) => (x < 0 || y < 0 ? 0 : integral[y][x]);
  return at(x2, y2) - at(x1 - 1, y2) - at(x2, y1 - 1) + at(x1 - 1, y1 - 1);
}
```

```cpp
#include <vector>

std::vector<std::vector<int>> buildIntegralImage(const std::vector<std::vector<int>>& image) {
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    std::vector<std::vector<int>> s(h, std::vector<int>(w, 0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            int top = (y > 0) ? s[y - 1][x] : 0;
            int left = (x > 0) ? s[y][x - 1] : 0;
            int topLeft = (y > 0 && x > 0) ? s[y - 1][x - 1] : 0;
            s[y][x] = image[y][x] + top + left - topLeft;
        }
    }
    return s;
}

int regionSum(const std::vector<std::vector<int>>& integral, int x1, int y1, int x2, int y2) {
    auto at = [&](int x, int y) -> int {
        if (x < 0 || y < 0) return 0;
        return integral[y][x];
    };
    return at(x2, y2) - at(x1 - 1, y2) - at(x2, y1 - 1) + at(x1 - 1, y1 - 1);
}
```

```rust
fn build_integral_image(image: &[Vec<i64>]) -> Vec<Vec<i64>> {
    let h = image.len();
    let w = image[0].len();
    let mut s = vec![vec![0i64; w]; h];
    for y in 0..h {
        for x in 0..w {
            let top = if y > 0 { s[y - 1][x] } else { 0 };
            let left = if x > 0 { s[y][x - 1] } else { 0 };
            let top_left = if y > 0 && x > 0 { s[y - 1][x - 1] } else { 0 };
            s[y][x] = image[y][x] + top + left - top_left;
        }
    }
    s
}

fn region_sum(integral: &[Vec<i64>], x1: i32, y1: i32, x2: i32, y2: i32) -> i64 {
    // x, yが負の場合は範囲外として0を返す(usizeへのキャストによるアンダーフローを避ける)
    let at = |x: i32, y: i32| -> i64 {
        if x < 0 || y < 0 {
            0
        } else {
            integral[y as usize][x as usize]
        }
    };
    at(x2, y2) - at(x1 - 1, y2) - at(x2, y1 - 1) + at(x1 - 1, y1 - 1)
}
```

```csharp
static int[,] BuildIntegralImage(int[,] image)
{
    int h = image.GetLength(0), w = image.GetLength(1);
    var s = new int[h, w];
    for (int y = 0; y < h; y++)
        for (int x = 0; x < w; x++)
        {
            int top = y > 0 ? s[y - 1, x] : 0;
            int left = x > 0 ? s[y, x - 1] : 0;
            int topLeft = y > 0 && x > 0 ? s[y - 1, x - 1] : 0;
            s[y, x] = image[y, x] + top + left - topLeft;
        }
    return s;
}

static int RegionSum(int[,] integral, int x1, int y1, int x2, int y2)
{
    int At(int x, int y) => (x < 0 || y < 0) ? 0 : integral[y, x];
    return At(x2, y2) - At(x1 - 1, y2) - At(x2, y1 - 1) + At(x1 - 1, y1 - 1);
}
```
