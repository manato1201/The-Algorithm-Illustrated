---
name: シームカービング(内容を考慮した画像リサイズ)
category: コンピュータビジョン
subcategory: 画像変換
complexity: 1本のシームの探索 O(W·H)(動的計画法)、k 本取り除くなら O(k·W·H)
summary: 画像の幅を縮めるとき、一様に縮小せず、見た目の変化が最も小さい「縦に連なる1画素幅の経路(シーム)」を動的計画法で見つけて取り除く。主要な被写体を歪めずに縦横比を変えられる。
---

## 概要

画像の縦横比を変えたい(横長の写真を縦長の画面に合わせたい)とき、普通の縮小は全体を一様に縮めるので、人物や建物がつぶれる。切り抜き(クロップ)は、端の内容を失う。理想は「重要な部分は保ち、どうでもよい部分(空、芝生、壁)だけを詰める」ことである。

Shai Avidan と Ariel Shamir(2007年、SIGGRAPH)のシームカービングは、これを**「重要でない経路を1本ずつ取り除く」**ことで実現した。シームとは、上から下まで、各行から1画素ずつ選んでつないだ、連続した経路のことで、隣り合う行では横の位置が最大1しかずれない。このシームを取り除くと、各行から1画素ずつ減るので、画像の幅がちょうど1画素縮まる。その経路を、画素の「エネルギー」(輪郭の強さ)の合計が最小になるように選べば、目立たない部分だけが取り除かれる。

## 仕組み

1. **エネルギーの計算**: 各画素 `(y, x)` のエネルギー `e(y, x)` を、隣の画素との明るさの差(勾配の大きさ)で定める。たとえば `|I(y, x+1) − I(y, x−1)| + |I(y+1, x) − I(y−1, x)|`。エッジの近くや細部は大きく、平坦な領域は小さい
2. **最小エネルギーのシームを探す(動的計画法)**: 上の行から順に、各画素までの最小の累積エネルギー `M` を求める
   `M(y, x) = e(y, x) + min( M(y−1, x−1), M(y−1, x), M(y−1, x+1) )`
   (最初の行は `M = e`)
3. **経路の復元**: 最下行で `M` が最小の位置から出発し、上へたどる。どの親(左上・真上・右上)から来たかを記録しておく(あるいは、各行で最小の親を再度選ぶ)
4. **シームの除去**: 各行から、シーム上の画素を1つ取り除き、右側を左へ詰める。画像の幅が1減る
5. 目標の幅になるまで、1〜4を繰り返す(1本取り除くたびに、エネルギーを再計算する)

幅を広げる場合は、見つけたシームを複製して挿入する。横ではなく高さを変える場合は、行と列を入れ替えて(転置して)同じ操作をする。

## 特性・トレードオフ

- **内容を保つ**: 重要な物体(エネルギーの高い領域)を避けて取り除くので、被写体が歪まない。同じ幅への一様な縮小に比べて見た目が大きく違う
- **欠点**: 顔や直線構造をシームが通ると、不自然に歪む。顔検出や、保護する領域のマスク(エネルギーを大きくして避けさせる)、不要な物体のマスク(小さくして取り除く)を併用する
- **計算量**: 1本あたり O(W·H)。大きな画像で多くのシームを取り除くと重いが、インタラクティブに使える程度には速い。シームの順序を事前に求めておけば、リサイズの操作はなめらかになる
- **エネルギー関数の選び方**: 勾配だけでなく、顕著性(saliency)や顔検出の結果を使うと、結果が改善する
- **発展**: 前向きエネルギー(シームを取り除いたあとに生じる新しい隣接関係のエネルギーを最小化する)の版は、ギザギザの不自然さを減らす。グラフカット版もある
- **使いどころ**: 画像のレスポンシブな縮小、縦横比の変更、物体除去、写真編集ツールの「コンテンツに応じた拡大・縮小」の基礎

## 実装例

```python
def energy(img):
    h, w = len(img), len(img[0])
    e = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            dx = abs(img[y][min(x + 1, w - 1)] - img[y][max(x - 1, 0)])
            dy = abs(img[min(y + 1, h - 1)][x] - img[max(y - 1, 0)][x])
            e[y][x] = dx + dy
    return e


def find_seam(img):
    e = energy(img)
    h, w = len(e), len(e[0])
    m = [row[:] for row in e]
    for y in range(1, h):
        for x in range(w):
            m[y][x] += min(m[y - 1][max(x - 1, 0):min(x + 2, w)])
    x = min(range(w), key=lambda i: m[h - 1][i])
    seam = [x]
    for y in range(h - 2, -1, -1):
        lo, hi = max(x - 1, 0), min(x + 2, w)
        x = min(range(lo, hi), key=lambda i: m[y][i])
        seam.append(x)
    return seam[::-1]          # seam[y] = y 行目で取り除く列


def remove_seam(img, seam):
    return [row[:x] + row[x + 1:] for row, x in zip(img, seam)]


img = [
    [9, 9, 1, 9, 9],
    [9, 9, 1, 9, 9],
    [9, 1, 1, 9, 9],
    [9, 1, 9, 9, 9],
    [9, 1, 9, 9, 9],
]
seam = find_seam(img)
print(seam)                       # 値の変化が小さい(平坦な)列を縦に通る経路
print(remove_seam(img, seam))     # 幅が 5 → 4
```

```typescript
function energy(img: number[][]): number[][] {
  const h = img.length;
  const w = img[0].length;
  return img.map((row, y) =>
    row.map((_, x) => {
      const dx = Math.abs(
        img[y][Math.min(x + 1, w - 1)] - img[y][Math.max(x - 1, 0)],
      );
      const dy = Math.abs(
        img[Math.min(y + 1, h - 1)][x] - img[Math.max(y - 1, 0)][x],
      );
      return dx + dy;
    }),
  );
}

function findSeam(img: number[][]): number[] {
  const e = energy(img);
  const h = e.length;
  const w = e[0].length;
  const m = e.map((row) => [...row]);
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      m[y][x] += Math.min(
        ...m[y - 1].slice(Math.max(x - 1, 0), Math.min(x + 2, w)),
      );
    }
  }
  let x = m[h - 1].indexOf(Math.min(...m[h - 1]));
  const seam = [x];
  for (let y = h - 2; y >= 0; y--) {
    const lo = Math.max(x - 1, 0);
    const hi = Math.min(x + 2, w);
    let best = lo;
    for (let i = lo; i < hi; i++) if (m[y][i] < m[y][best]) best = i;
    x = best;
    seam.push(x);
  }
  return seam.reverse();
}

const removeSeam = (img: number[][], seam: number[]): number[][] =>
  img.map((row, y) => [...row.slice(0, seam[y]), ...row.slice(seam[y] + 1)]);

const img = [
  [9, 9, 1, 9, 9],
  [9, 9, 1, 9, 9],
  [9, 1, 1, 9, 9],
  [9, 1, 9, 9, 9],
  [9, 1, 9, 9, 9],
];
const seam = findSeam(img);
console.log(seam);
console.log(removeSeam(img, seam));
```
