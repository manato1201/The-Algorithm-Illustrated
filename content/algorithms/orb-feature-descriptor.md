---
name: ORB特徴量(Oriented FAST and Rotated BRIEF)
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h)(特徴点検出) + O(特徴点数×256)(記述子生成)
summary: 高速なFAST特徴点検出に回転不変性を持たせ、二値の比較テストだけで記述子を作るBRIEFと組み合わせることで、特許フリーかつ高速に動作する実用志向の局所特徴量。
---

## 概要

[SIFT](/algorithms/sift)はスケール・回転・照明変化に頑健な優れた特徴量だが、ガウシアンぼかしの多重スケール計算や128次元の浮動小数点記述子の生成にコストがかかり、スマートフォンやロボットのようなリアルタイム処理には重すぎる場面がある。さらに長らく特許で保護されており、商用利用に制約があった時期もあった。2011年にEthan Rubleeらが発表したORB(Oriented FAST and Rotated BRIEF)は、「FAST」という高速なコーナー検出器に回転不変性を追加したものと、「BRIEF」というビット列で表現される軽量な記述子を組み合わせ、SIFTに匹敵する実用精度を保ちながら桁違いに高速で、かつ特許フリーという実用上の利点を両立させた特徴量である。名前の通り「Oriented FAST」(向き付きFAST)による検出と「Rotated BRIEF」(回転補正されたBRIEF)による記述の2段構成になっている。

## 仕組み

1. **FASTによる特徴点検出**: 各画素を中心とした円周上16画素の輝度を調べ、中心より明るい(または暗い)画素が連続して一定数以上続けば、その画素をコーナー候補として検出する。単純な輝度比較だけで済むため[Harrisコーナー検出](/algorithms/harris-corner-detection)より大幅に高速
2. **Harrisスコアによる候補の絞り込み**: FASTは応答の強さを持たないため、検出された候補点に対して[Harrisコーナー検出](/algorithms/harris-corner-detection)と同様のコーナー応答スコアを計算し、上位N個だけを最終的な特徴点として残す
3. **方向の割り当て(Oriented FAST)**: 特徴点周囲のパッチの輝度重心を計算し、パッチ中心から輝度重心へ向かうベクトルの角度を、その特徴点の主方向とする(**強度重心法**)。これにより画像が回転しても各特徴点に一貫した基準方向を持たせられる
4. **BRIEF記述子の生成**: 特徴点周囲のパッチ内から事前に決めた256組の画素ペアを選び、各ペアで「一方が他方より明るいか」を1ビットの0/1で表す。これを256回繰り返すことで256ビットの二値ベクトルが得られる——浮動小数点の勾配ヒストグラムを作るSIFTと異なり、単純な大小比較だけで済むため生成が極めて高速
5. **Rotated BRIEF**: 手順3で求めた主方向に合わせて、256組の画素ペアの座標配置そのものを回転させてからビット比較を行う。これにより画像が回転してもほぼ同じビット列が得られる回転不変性を獲得する
6. **記述子の照合**: 二値ベクトル同士の類似度は、各ビットが一致するかを数える**ハミング距離**で高速に計算できる(XORとビットカウント命令だけで済み、SIFTのユークリッド距離計算より大幅に軽い)

## 特性・トレードオフ

- **計算量と速度**: FASTのコーナー検出もBRIEFの記述子生成も単純な比較演算の繰り返しであり、[SIFT](/algorithms/sift)のガウシアンぼかしの多重計算や勾配ヒストグラム生成と比べて大幅に軽量。マッチング時のハミング距離計算もCPUのビット演算命令で高速に処理できるため、リアルタイムのSLAM(自己位置推定と地図構築の同時実行)やAR(拡張現実)のトラッキングで広く採用されている
- **特許フリー**: SIFTやSURFが特許で保護されていた期間、ORBは無償で商用利用できる代替として大きな存在感を持った(SIFTの特許は2020年に失効済み)
- **スケール不変性は限定的**: ORB単体では[ガウシアンピラミッド](/algorithms/gaussian-pyramid)のような多重解像度のスケール空間を構築しないため、SIFTほど広いスケール範囲には対応できない。実装では画像ピラミッドの各層でFASTを実行することでスケール変化にある程度対応する工夫がされている
- **精度と頑健性のトレードオフ**: 二値記述子は情報量がSIFTの浮動小数点ベクトルより少ないため、大きな視点変化や強い照明変化がある場面ではSIFTよりマッチング精度が落ちる傾向がある。速度と特許の制約が優先される用途(モバイル・組み込み機器)でSIFTの代替として選ばれることが多い
- **使いどころ**: スマートフォンARアプリのマーカーレストラッキング、ロボットのVisual SLAM、リアルタイム物体認識、[RANSAC](/algorithms/ransac)と組み合わせた高速な画像間ホモグラフィ推定

## 実装例

3×3近傍の単純化したFAST風コーナー検出(中心と円周8画素の輝度比較)と、固定パターンのBRIEF風記述子(画素ペアの大小比較によるビット列生成)、およびハミング距離によるマッチングを実装する。教育目的のため、本来16画素の円周判定・強度重心による方向補正は簡略化している。

```python
import random


def is_fast_corner(img: list[list[float]], y: int, x: int, threshold: float = 20.0) -> bool:
    """3x3近傍の8方向の輝度差で簡易的にコーナーらしさを判定する"""
    h, w = len(img), len(img[0])
    if y - 1 < 0 or y + 1 >= h or x - 1 < 0 or x + 1 >= w:
        return False
    center = img[y][x]
    ring = [
        img[y - 1][x], img[y - 1][x + 1], img[y][x + 1], img[y + 1][x + 1],
        img[y + 1][x], img[y + 1][x - 1], img[y][x - 1], img[y - 1][x - 1],
    ]
    brighter = sum(1 for v in ring if v - center > threshold)
    darker = sum(1 for v in ring if center - v > threshold)
    return brighter >= 6 or darker >= 6


def detect_fast_keypoints(img: list[list[float]], threshold: float = 20.0) -> list[tuple[int, int]]:
    h, w = len(img), len(img[0])
    return [(y, x) for y in range(h) for x in range(w) if is_fast_corner(img, y, x, threshold)]


def make_brief_pattern(patch_size: int, n_bits: int, seed: int = 42) -> list[tuple[int, int, int, int]]:
    """パッチ内で比較する画素ペアの相対座標を固定パターンとして生成する"""
    rng = random.Random(seed)
    half = patch_size // 2
    return [
        (rng.randint(-half, half), rng.randint(-half, half), rng.randint(-half, half), rng.randint(-half, half))
        for _ in range(n_bits)
    ]


def brief_descriptor(
    img: list[list[float]], center: tuple[int, int], pattern: list[tuple[int, int, int, int]]
) -> list[int]:
    h, w = len(img), len(img[0])
    cy, cx = center
    bits = []
    for dy1, dx1, dy2, dx2 in pattern:
        y1 = min(max(cy + dy1, 0), h - 1)
        x1 = min(max(cx + dx1, 0), w - 1)
        y2 = min(max(cy + dy2, 0), h - 1)
        x2 = min(max(cx + dx2, 0), w - 1)
        bits.append(1 if img[y1][x1] < img[y2][x2] else 0)
    return bits


def hamming_distance(a: list[int], b: list[int]) -> int:
    return sum(1 for x, y in zip(a, b) if x != y)


def match_descriptors(
    desc_a: list[list[int]], desc_b: list[list[int]]
) -> list[tuple[int, int, int]]:
    """各記述子について最も近い相手をハミング距離で総当たり探索する"""
    matches = []
    for i, da in enumerate(desc_a):
        best_j, best_dist = -1, float("inf")
        for j, db in enumerate(desc_b):
            d = hamming_distance(da, db)
            if d < best_dist:
                best_dist, best_j = d, j
        matches.append((i, best_j, best_dist))
    return matches
```

```typescript
function isFastCorner(img: number[][], y: number, x: number, threshold = 20): boolean {
  const h = img.length, w = img[0].length;
  if (y - 1 < 0 || y + 1 >= h || x - 1 < 0 || x + 1 >= w) return false;
  const center = img[y][x];
  const ring = [
    img[y - 1][x], img[y - 1][x + 1], img[y][x + 1], img[y + 1][x + 1],
    img[y + 1][x], img[y + 1][x - 1], img[y][x - 1], img[y - 1][x - 1],
  ];
  const brighter = ring.filter((v) => v - center > threshold).length;
  const darker = ring.filter((v) => center - v > threshold).length;
  return brighter >= 6 || darker >= 6;
}

function detectFastKeypoints(img: number[][], threshold = 20): [number, number][] {
  const h = img.length, w = img[0].length;
  const keypoints: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isFastCorner(img, y, x, threshold)) keypoints.push([y, x]);
    }
  }
  return keypoints;
}

// 単純な線形合同法による疑似乱数生成器(再現性のあるパターンを作るため)
function makeRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function makeBriefPattern(patchSize: number, nBits: number, seed = 42): [number, number, number, number][] {
  const rand = makeRng(seed);
  const half = Math.floor(patchSize / 2);
  const randInt = () => Math.floor(rand() * (2 * half + 1)) - half;
  const pattern: [number, number, number, number][] = [];
  for (let i = 0; i < nBits; i++) {
    pattern.push([randInt(), randInt(), randInt(), randInt()]);
  }
  return pattern;
}

function briefDescriptor(
  img: number[][],
  center: [number, number],
  pattern: [number, number, number, number][]
): number[] {
  const h = img.length, w = img[0].length;
  const [cy, cx] = center;
  return pattern.map(([dy1, dx1, dy2, dx2]) => {
    const y1 = Math.min(Math.max(cy + dy1, 0), h - 1);
    const x1 = Math.min(Math.max(cx + dx1, 0), w - 1);
    const y2 = Math.min(Math.max(cy + dy2, 0), h - 1);
    const x2 = Math.min(Math.max(cx + dx2, 0), w - 1);
    return img[y1][x1] < img[y2][x2] ? 1 : 0;
  });
}

function hammingDistance(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function matchDescriptors(descA: number[][], descB: number[][]): [number, number, number][] {
  const matches: [number, number, number][] = [];
  for (let i = 0; i < descA.length; i++) {
    let bestJ = -1;
    let bestDist = Infinity;
    for (let j = 0; j < descB.length; j++) {
      const d = hammingDistance(descA[i], descB[j]);
      if (d < bestDist) {
        bestDist = d;
        bestJ = j;
      }
    }
    matches.push([i, bestJ, bestDist]);
  }
  return matches;
}
```
