---
name: テンプレートマッチング
category: コンピュータビジョン
subcategory: ロバスト推定
complexity: O(W×H×w×h)(素朴な実装、画像W×H、テンプレートw×h)
summary: 小さな見本画像(テンプレート)を大きな画像上のあらゆる位置にスライドさせながら類似度を計算し、最もよく一致する場所を見つける最も直接的な物体検出法。
---

## 概要

「この小さな見本画像は、大きな画像のどこに写っているか」を調べる最も素朴で直接的な方法は、見本(テンプレート)を大きな画像の左上から右下まで1画素ずつずらしながら重ね合わせ、その都度「どれだけ似ているか」を計算することである。テンプレートマッチングはまさにこの発想をそのまま実装したアルゴリズムで、洗練さには欠けるものの、実装が単純で結果の解釈が直感的という利点から、条件が整った場面(照明や角度の変化が少ない)では今なお実用的に使われている。

## 仕組み

1. 検出したい対象の小さな見本画像(テンプレート、サイズ`w×h`)を用意する
2. 大きな画像(サイズ`W×H`)上の各位置`(x, y)`について、その位置を左上とする`w×h`の領域とテンプレートとの類似度(または非類似度)を計算する
3. 類似度の指標には複数の選択肢がある: 差の二乗和(SSD、値が小さいほど似ている)、正規化相互相関(NCC、[最小二乗法](/algorithms/least-squares)の考え方に近い、値が1に近いほど似ている、明るさの違いにある程度頑健)など
4. 全ての位置`(x, y)`について類似度マップを計算し終えたら、最も類似度が高い(あるいは非類似度が最も低い)位置を、テンプレートが検出された場所として採用する

類似度マップの計算は、[離散畳み込み](/algorithms/discrete-convolution)と同じ構造の総当たり演算であり、[FFT](/algorithms/fft)を使った高速化(周波数領域での積に変換する)も可能である。

## 特性・トレードオフ

- **計算量**: 素朴な実装では、画像の全位置`(W×H)`それぞれでテンプレートサイズ`(w×h)`の比較を行うため`O(W×H×w×h)`と重い。[FFT](/algorithms/fft)を使うと`O(W×H×log(W×H))`程度まで高速化できる
- **拡大縮小・回転に弱い**: テンプレートと対象物のサイズや向きが完全に一致していることを前提とするため、対象が少しでも回転・拡大縮小していると検出精度が急激に落ちる。この弱点を克服するには、[SIFT](/algorithms/sift)のようなスケール・回転不変の特徴量を使う手法が必要になる
- **実装の単純さと解釈の容易さ**: アルゴリズム自体は直感的で実装しやすく、類似度マップを可視化すれば「どこがどれだけ似ているか」を人間が直接確認できる。デバッグや教育目的にも適している
- **使いどころ**: 条件が管理された環境での部品検査(工業製品の欠陥検出、決まった向き・サイズの部品の位置合わせ)、ゲームの画面上のUI要素検出、簡易な物体検出のベースライン手法として、より高度な[SIFT](/algorithms/sift)ベースの手法や深層学習ベースの手法と比較する際の対照実験にも使われる

## 実装例

差の二乗和(SSD)を類似度指標として使うテンプレートマッチングの実装例。ランダムな画像の既知の位置にテンプレートを埋め込み、検出された位置が実際に埋め込んだ位置と一致することを200回のランダム試行で検証している。

```python
def template_match(image: list[list[int]], template: list[list[int]]) -> tuple[int, int]:
    """SSD(差の二乗和)が最小になる位置(左上座標 (y, x))を返す"""
    img_h, img_w = len(image), len(image[0])
    t_h, t_w = len(template), len(template[0])
    best_score = None
    best_pos = (0, 0)
    for y in range(img_h - t_h + 1):
        for x in range(img_w - t_w + 1):
            score = 0
            for ty in range(t_h):
                for tx in range(t_w):
                    diff = image[y + ty][x + tx] - template[ty][tx]
                    score += diff * diff
            if best_score is None or score < best_score:
                best_score = score
                best_pos = (y, x)
    return best_pos
```

```typescript
function templateMatch(image: number[][], template: number[][]): [number, number] {
  const imgH = image.length;
  const imgW = image[0].length;
  const tH = template.length;
  const tW = template[0].length;
  let bestScore = Infinity;
  let bestPos: [number, number] = [0, 0];
  for (let y = 0; y <= imgH - tH; y++) {
    for (let x = 0; x <= imgW - tW; x++) {
      let score = 0;
      for (let ty = 0; ty < tH; ty++) {
        for (let tx = 0; tx < tW; tx++) {
          const diff = image[y + ty][x + tx] - template[ty][tx];
          score += diff * diff;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        bestPos = [y, x];
      }
    }
  }
  return bestPos;
}
```

```cpp
#include <vector>
#include <utility>
#include <limits>

std::pair<int, int> templateMatch(const std::vector<std::vector<int>>& image, const std::vector<std::vector<int>>& tmpl) {
    int imgH = static_cast<int>(image.size());
    int imgW = static_cast<int>(image[0].size());
    int tH = static_cast<int>(tmpl.size());
    int tW = static_cast<int>(tmpl[0].size());
    long long bestScore = std::numeric_limits<long long>::max();
    std::pair<int, int> bestPos = {0, 0};
    for (int y = 0; y <= imgH - tH; y++) {
        for (int x = 0; x <= imgW - tW; x++) {
            long long score = 0;
            for (int ty = 0; ty < tH; ty++) {
                for (int tx = 0; tx < tW; tx++) {
                    long long diff = image[y + ty][x + tx] - tmpl[ty][tx];
                    score += diff * diff;
                }
            }
            if (score < bestScore) {
                bestScore = score;
                bestPos = {y, x};
            }
        }
    }
    return bestPos;
}
```

```rust
fn template_match(image: &[Vec<i32>], template: &[Vec<i32>]) -> (usize, usize) {
    let img_h = image.len();
    let img_w = image[0].len();
    let t_h = template.len();
    let t_w = template[0].len();
    let mut best_score = i64::MAX;
    let mut best_pos = (0usize, 0usize);
    for y in 0..=(img_h - t_h) {
        for x in 0..=(img_w - t_w) {
            let mut score: i64 = 0;
            for ty in 0..t_h {
                for tx in 0..t_w {
                    let diff = (image[y + ty][x + tx] - template[ty][tx]) as i64;
                    score += diff * diff;
                }
            }
            if score < best_score {
                best_score = score;
                best_pos = (y, x);
            }
        }
    }
    best_pos
}
```

```csharp
static (int, int) TemplateMatch(int[][] image, int[][] template)
{
    int imgH = image.Length, imgW = image[0].Length;
    int tH = template.Length, tW = template[0].Length;
    long bestScore = long.MaxValue;
    (int, int) bestPos = (0, 0);
    for (int y = 0; y <= imgH - tH; y++)
    {
        for (int x = 0; x <= imgW - tW; x++)
        {
            long score = 0;
            for (int ty = 0; ty < tH; ty++)
            {
                for (int tx = 0; tx < tW; tx++)
                {
                    long diff = image[y + ty][x + tx] - template[ty][tx];
                    score += diff * diff;
                }
            }
            if (score < bestScore)
            {
                bestScore = score;
                bestPos = (y, x);
            }
        }
    }
    return bestPos;
}
```
