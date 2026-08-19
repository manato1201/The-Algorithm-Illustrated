---
name: ラプラシアンピラミッドによる画像ブレンディング
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(WH)(元画像サイズW×H、ピラミッド構築・合成・再構成すべて元画像1枚分と同じオーダー)
summary: ガウシアンピラミッドの隣接階層の差分(高周波の詳細成分)を各解像度で保持するラプラシアンピラミッドを使い、複数の解像度それぞれで滑らかに合成することで、単純なコピー&ペーストでは目立つ境界の継ぎ目を目立たなくする画像合成手法。
---

## 概要

2枚の画像を単純に境界線でコピー&ペーストして合成すると、明るさや色の急激な変化が境界にはっきり残り、いかにも「貼り合わせた」不自然な画像になる。境界をぼかしてから合成すればある程度は緩和できるが、今度は画像全体がぼやけてしまい、細部が失われる。ラプラシアンピラミッドによる画像ブレンディングは、この二律背反を「解像度ごとに合成する」という発想で解決する——[ガウシアンピラミッド](/algorithms/gaussian-pyramid)の隣接する2階層の差分(=その解像度で失われる高周波成分、輪郭やテクスチャなどの細部)を各層に保持する**ラプラシアンピラミッド**を作り、粗い解像度(低周波)ではなだらかに、細かい解像度(高周波)では狭い範囲でシャープに、というように**解像度ごとに異なる幅で境界を溶け込ませてから全階層を足し合わせて再構成**する。BurtとAdelsonが1983年に提案したこの手法は、パノラマ画像の縫い目消しや映画のVFX合成など、自然な境界の画像合成が必要な場面で今なお広く使われている。

## 仕組み

1. **ラプラシアンピラミッドの構築**: 画像に対して[ガウシアンピラミッド](/algorithms/gaussian-pyramid)`G₀(元解像度), G₁, ..., G_k(最も粗い)`を作る。各層`i`(最終層を除く)について、`G_i`から「`G_{i+1}`を`G_i`と同じ解像度にアップサンプリング(拡大)して`G_i`から引いたもの」を計算し、これをラプラシアン層`L_i = G_i - upsample(G_{i+1})`とする。`L_i`はその解像度で失われる高周波の詳細(輪郭・エッジ・テクスチャ)だけを表す。最終層`L_k = G_k`(最も粗い低周波成分そのもの)とする
2. **合成する2画像それぞれのラプラシアンピラミッドを作る**: 画像A・画像Bそれぞれについて手順1のラプラシアンピラミッド`{L_i^A}`・`{L_i^B}`を構築する
3. **マスクのガウシアンピラミッドを作る**: どちらの画像をどの位置で使うかを表す0〜1のマスク画像(境界がシャープな2値マスクでよい)に対しても[ガウシアンピラミッド](/algorithms/gaussian-pyramid)`{M_i}`を構築する。マスクにガウシアンぼかしをかけることで、粗い層ほどマスクの境界が広くなだらかに、細かい層ほど境界が狭くシャープになる
4. **各層を独立にブレンドする**: 各解像度`i`について、`L_i^blend = M_i × L_i^A + (1 - M_i) × L_i^B`のように、その層のマスクを重みとして画像Aと画像Bのラプラシアン成分を線形補間する。粗い層(低周波)では境界が広くなだらかに混ざり、細かい層(高周波)では境界が狭く保たれる——これにより、明るさなどの緩やかな変化は広い範囲でなだらかに、エッジなどの鋭い変化は境界付近だけで混ざる、という理想的なブレンディングが自然に実現される
5. **ピラミッドの再構成**: 最も粗い層`L_k^blend`から始めて、`upsample(L_{i+1}^blend) + L_i^blend`を繰り返し計算しながら元の解像度まで積み上げていくと、ブレンドされた最終画像が得られる

## 特性・トレードオフ

- **計算量**: [ガウシアンピラミッド](/algorithms/gaussian-pyramid)の各層のサイズの合計が元画像の約4/3倍にとどまるのと同様、ラプラシアンピラミッドの構築・合成・再構成もすべて元画像1枚分の処理と同オーダー`O(WH)`で完了する
- **解像度ごとに異なる幅でブレンドするのが核心**: 単純な画像上での線形フェード(1つの固定幅で境界をぼかす)では、その幅より大きいスケールの明るさの段差は境界として残り、その幅より小さいスケールのエッジは過度にぼやけてしまう。ラプラシアンピラミッドは「粗い層=広い範囲、細かい層=狭い範囲」という**周波数に応じた最適なブレンド幅**を自動的に割り当てる点が本質的な工夫である
- **[ガウシアンピラミッド](/algorithms/gaussian-pyramid)との関係**: ラプラシアンピラミッドは[ガウシアンピラミッド](/algorithms/gaussian-pyramid)の副産物であり、両者は可逆な変換の関係にある——ラプラシアンピラミッドの全層を足し合わせれば元画像を完全に復元できる(画像の多重解像度分解、ウェーブレット変換に近い発想)。ブレンディング以外にも、画像圧縮(粗い層は大まかに、細かい層は差分だけを符号化する)やコントラスト強調にも応用される
- **マスクの精度への依存**: 合成結果の品質は入力マスクの境界形状に依存する。マスク自体が対象物の輪郭からずれていると、いくらラプラシアンピラミッドでなめらかに混ぜても不自然な合成になる——[グラフカットによるセグメンテーション](/algorithms/graph-cut-segmentation)のような手法で高品質なマスクを事前に作ってから適用することも多い
- **使いどころ**: パノラマ画像・パノラマ写真の縫い目のないスティッチング、映画・写真編集ソフトの合成(コンポジット)機能、顔のモーフィング、医療画像の複数モダリティ合成、画像の多重解像度圧縮・分解全般

## 実装例

1次元(横方向)の簡略化した画像で、3×3ガウシアン風カーネルによるぼかし・半分への縮小・2倍への拡大を使ってガウシアンピラミッド・ラプラシアンピラミッドを構築し、垂直な境界を持つ2つの画像を境界マスクでブレンドする例。

```python
def blur(row: list[float]) -> list[float]:
    """簡易ガウシアン風の1次元平滑化(端はクランプ)。"""
    n = len(row)
    kernel = [0.25, 0.5, 0.25]
    out = [0.0] * n
    for i in range(n):
        acc = 0.0
        for k, w in enumerate(kernel):
            j = min(max(i + k - 1, 0), n - 1)
            acc += row[j] * w
        out[i] = acc
    return out


def downsample(row: list[float]) -> list[float]:
    return row[::2]


def upsample(row: list[float], target_len: int) -> list[float]:
    """最近傍拡大してからぼかすことで滑らかに補間する。"""
    out = [row[min(i // 2, len(row) - 1)] for i in range(target_len)]
    return blur(out)


def gaussian_pyramid(row: list[float], levels: int) -> list[list[float]]:
    pyramid = [row]
    cur = row
    for _ in range(levels - 1):
        cur = downsample(blur(cur))
        pyramid.append(cur)
    return pyramid


def laplacian_pyramid(row: list[float], levels: int) -> list[list[float]]:
    gpyr = gaussian_pyramid(row, levels)
    lpyr = []
    for i in range(levels - 1):
        up = upsample(gpyr[i + 1], len(gpyr[i]))
        lpyr.append([a - b for a, b in zip(gpyr[i], up)])
    lpyr.append(gpyr[-1])  # 最終層は最も粗い低周波成分そのもの
    return lpyr


def reconstruct(lpyr: list[list[float]]) -> list[float]:
    cur = lpyr[-1]
    for i in range(len(lpyr) - 2, -1, -1):
        up = upsample(cur, len(lpyr[i]))
        cur = [a + b for a, b in zip(lpyr[i], up)]
    return cur


def blend(image_a: list[float], image_b: list[float], mask: list[float], levels: int) -> list[float]:
    la = laplacian_pyramid(image_a, levels)
    lb = laplacian_pyramid(image_b, levels)
    gmask = gaussian_pyramid(mask, levels)

    blended = []
    for la_i, lb_i, m_i in zip(la, lb, gmask):
        blended.append([m * a + (1 - m) * b for a, b, m in zip(la_i, lb_i, m_i)])
    return reconstruct(blended)


# 左半分が0.0(暗)、右半分が1.0(明)の画像Aと、その逆の画像Bを境界マスクでブレンド
image_a = [0.0] * 8 + [1.0] * 8
image_b = [1.0] * 8 + [0.0] * 8
mask = [1.0] * 8 + [0.0] * 8  # 左半分は画像Aを、右半分は画像Bを使う
result = blend(image_a, image_b, mask, levels=4)
```

```typescript
function blur(row: number[]): number[] {
  // 簡易ガウシアン風の1次元平滑化(端はクランプ)
  const n = row.length;
  const kernel = [0.25, 0.5, 0.25];
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = 0; k < kernel.length; k++) {
      const j = Math.min(Math.max(i + k - 1, 0), n - 1);
      acc += row[j] * kernel[k];
    }
    out[i] = acc;
  }
  return out;
}

function downsample(row: number[]): number[] {
  return row.filter((_, i) => i % 2 === 0);
}

function upsample(row: number[], targetLen: number): number[] {
  // 最近傍拡大してからぼかすことで滑らかに補間する
  const out = Array.from({ length: targetLen }, (_, i) => row[Math.min(Math.floor(i / 2), row.length - 1)]);
  return blur(out);
}

function gaussianPyramid(row: number[], levels: number): number[][] {
  const pyramid = [row];
  let cur = row;
  for (let i = 0; i < levels - 1; i++) {
    cur = downsample(blur(cur));
    pyramid.push(cur);
  }
  return pyramid;
}

function laplacianPyramid(row: number[], levels: number): number[][] {
  const gpyr = gaussianPyramid(row, levels);
  const lpyr: number[][] = [];
  for (let i = 0; i < levels - 1; i++) {
    const up = upsample(gpyr[i + 1], gpyr[i].length);
    lpyr.push(gpyr[i].map((v, j) => v - up[j]));
  }
  lpyr.push(gpyr[gpyr.length - 1]); // 最終層は最も粗い低周波成分そのもの
  return lpyr;
}

function reconstruct(lpyr: number[][]): number[] {
  let cur = lpyr[lpyr.length - 1];
  for (let i = lpyr.length - 2; i >= 0; i--) {
    const up = upsample(cur, lpyr[i].length);
    cur = lpyr[i].map((v, j) => v + up[j]);
  }
  return cur;
}

function blend(imageA: number[], imageB: number[], mask: number[], levels: number): number[] {
  const la = laplacianPyramid(imageA, levels);
  const lb = laplacianPyramid(imageB, levels);
  const gmask = gaussianPyramid(mask, levels);

  const blended = la.map((laI, i) =>
    laI.map((a, j) => gmask[i][j] * a + (1 - gmask[i][j]) * lb[i][j])
  );
  return reconstruct(blended);
}

// 左半分が0.0(暗)、右半分が1.0(明)の画像Aと、その逆の画像Bを境界マスクでブレンド
const imageA = [...Array(8).fill(0.0), ...Array(8).fill(1.0)];
const imageB = [...Array(8).fill(1.0), ...Array(8).fill(0.0)];
const mask = [...Array(8).fill(1.0), ...Array(8).fill(0.0)]; // 左半分は画像Aを、右半分は画像Bを使う
const result = blend(imageA, imageB, mask, 4);
```
