---
name: LoGによるブロブ検出(Laplacian of Gaussian)
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h×スケール数)(多重スケールでのフィルタ適用)
summary: ガウシアンで平滑化した画像にラプラシアン(2階微分)を適用し、そのスケール空間での応答の極値からコーナーでもエッジでもない塊状領域(ブロブ)を検出する手法。
---

## 概要

[Harrisコーナー検出](/algorithms/harris-corner-detection)は角を、[Cannyエッジ検出](/algorithms/canny-edge-detection)は輪郭線を見つけるのに優れているが、画像中には「周囲より明るい/暗い塊状の領域」——細胞の核、星、水玉模様の点、道路標識の丸い部分——のような、コーナーでもエッジでもない構造も数多く存在する。こうした塊状領域を**ブロブ(blob)**と呼ぶ。LoG(Laplacian of Gaussian)は、画像をガウシアンで平滑化してからラプラシアン(2階微分)を取るという2段構成のフィルタを、複数のスケール(ぼかしの強さ)で適用し、スケールと空間の両方で応答が極値になる点を探すことで、様々な大きさのブロブをその大きさごと検出する手法である。ラプラシアンが「山型・谷型の急激な変化」に強く反応するという性質を利用しており、SIFTのDoG(差分ガウシアン)による特徴点検出はこのLoGの高速な近似として設計された。

## 仕組み

1. **ガウシアン平滑化**: 画像に標準偏差`σ`のガウシアンフィルタを適用してぼかす。`σ`が大きいほど強くぼやけ、より大きな構造だけが残る
2. **ラプラシアンの適用**: 平滑化した画像に2階微分オペレータ(ラプラシアン、`∇²I = ∂²I/∂x² + ∂²I/∂y²`)を適用する。ラプラシアンは画像の明るさが急激に変化する場所(エッジやブロブの境界)で大きな応答を示し、特に「周囲より明るい/暗い塊」の中心付近で顕著なピークを持つ
3. **スケール正規化**: `σ`が大きくなるほどラプラシアンの応答値は自然に小さくなってしまうため、応答に`σ²`を掛けて正規化する(**スケール正規化ラプラシアン**)。これにより異なる`σ`同士の応答強度を公平に比較できるようになる
4. **多重スケールでの繰り返し**: `σ`を段階的に変化させながら手順1〜3を繰り返し、各スケールでの正規化ラプラシアン応答の画像(スケール空間)を積み重ねる
5. **スケール空間での極値検出**: 各画素について、同じスケール内の空間的な近傍(8近傍)と、隣接するスケールの対応する近傍(SIFTのDoG極値検出と同様に合計26点)を比較し、極大または極小になっている点を検出する。この点が「ブロブの中心」に相当し、そのときの`σ`(正確には`√2・σ`)が「ブロブの半径」に対応する——つまり検出と同時にブロブの大きさも得られる

## 特性・トレードオフ

- **検出対象の違い**: [Harrisコーナー検出](/algorithms/harris-corner-detection)は2方向とも輝度変化が大きい「角」を、[Cannyエッジ検出](/algorithms/canny-edge-detection)は1方向にだけ急激な変化がある「輪郭線」を検出するのに対し、LoGは周囲から孤立した塊状の明暗領域「ブロブ」を検出対象とする——3つは互いに補完的な特徴で、同じ画像から異なる種類の構造情報を取り出せる

- **計算量**: ガウシアン平滑化とラプラシアン計算をスケールの数だけ繰り返すため、計算コストはスケール数に比例して増える。実用上は、より軽量なDoG(差分ガウシアン、隣接する2つのガウシアンぼかし画像の引き算)でラプラシアンを近似することが多く、[SIFT](/algorithms/sift)のスケール空間極値点検出はこの近似を採用している

- **スケール不変性とブロブサイズの同時推定**: 単一のスケールでは特定の大きさのブロブしか検出できないが、多重スケール探索によって画像中の様々な大きさのブロブを、その大きさ情報つきで検出できる点がLoGの最大の強み
- **ノイズへの感度**: 2階微分は1階微分(勾配)よりノイズに敏感なため、ガウシアン平滑化による事前のノイズ除去が効果を大きく左右する。`σ`が小さすぎるとノイズを誤検出し、大きすぎると小さなブロブを見逃す
- **使いどころ**: 医療画像における細胞・腫瘍・血管の検出、天体画像における恒星の検出、SIFTの前段としてのスケール空間極値点探索、テクスチャ解析における斑点状パターンの抽出

## 実装例

複数の`σ`でガウシアン平滑化した画像にラプラシアンフィルタを適用し、`σ²`でスケール正規化した応答のスケール空間内極値点を検出する。中心に円形の明るいブロブを持つテスト画像で、ブロブの半径に対応する`σ`付近で応答が最大になることを確認できる。

```python
import math


def gaussian_kernel_1d(sigma: float, radius: int) -> list[float]:
    kernel = [math.exp(-(x * x) / (2 * sigma * sigma)) for x in range(-radius, radius + 1)]
    s = sum(kernel)
    return [k / s for k in kernel]


def gaussian_blur(image: list[list[float]], sigma: float) -> list[list[float]]:
    radius = max(1, round(3 * sigma))
    kernel = gaussian_kernel_1d(sigma, radius)
    h, w = len(image), len(image[0])
    temp = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            total = 0.0
            for k in range(-radius, radius + 1):
                xx = min(max(x + k, 0), w - 1)
                total += image[y][xx] * kernel[k + radius]
            temp[y][x] = total
    result = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            total = 0.0
            for k in range(-radius, radius + 1):
                yy = min(max(y + k, 0), h - 1)
                total += temp[yy][x] * kernel[k + radius]
            result[y][x] = total
    return result


def laplacian(image: list[list[float]]) -> list[list[float]]:
    h, w = len(image), len(image[0])
    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            c = image[y][x]
            up = image[max(y - 1, 0)][x]
            down = image[min(y + 1, h - 1)][x]
            left = image[y][max(x - 1, 0)]
            right = image[y][min(x + 1, w - 1)]
            out[y][x] = up + down + left + right - 4 * c
    return out


def scale_normalized_log(image: list[list[float]], sigma: float) -> list[list[float]]:
    blurred = gaussian_blur(image, sigma)
    lap = laplacian(blurred)
    return [[v * (sigma ** 2) for v in row] for row in lap]


def detect_blobs(image: list[list[float]], sigmas: list[float]) -> list[tuple[int, int, float]]:
    """複数スケールのLoG応答からスケール空間内極値点(y, x, sigma)を検出する"""
    responses = [scale_normalized_log(image, s) for s in sigmas]
    h, w = len(image), len(image[0])
    blobs = []
    for si in range(1, len(sigmas) - 1):
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                val = responses[si][y][x]
                is_max, is_min = True, True
                for ds in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if ds == 0 and dy == 0 and dx == 0:
                                continue
                            neighbor = responses[si + ds][y + dy][x + dx]
                            if neighbor >= val:
                                is_max = False
                            if neighbor <= val:
                                is_min = False
                if is_max or is_min:
                    blobs.append((y, x, sigmas[si]))
    return blobs
```

```typescript
function gaussianKernel1d(sigma: number, radius: number): number[] {
  const kernel: number[] = [];
  for (let x = -radius; x <= radius; x++) {
    kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
  }
  const s = kernel.reduce((a, b) => a + b, 0);
  return kernel.map((k) => k / s);
}

function gaussianBlur(image: number[][], sigma: number): number[][] {
  const radius = Math.max(1, Math.round(3 * sigma));
  const kernel = gaussianKernel1d(sigma, radius);
  const h = image.length,
    w = image[0].length;
  const temp: number[][] = Array.from({ length: h }, () =>
    new Array(w).fill(0),
  );
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(Math.max(x + k, 0), w - 1);
        total += image[y][xx] * kernel[k + radius];
      }
      temp[y][x] = total;
    }
  }
  const result: number[][] = Array.from({ length: h }, () =>
    new Array(w).fill(0),
  );
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(Math.max(y + k, 0), h - 1);
        total += temp[yy][x] * kernel[k + radius];
      }
      result[y][x] = total;
    }
  }
  return result;
}

function laplacian(image: number[][]): number[][] {
  const h = image.length,
    w = image[0].length;
  const out: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = image[y][x];
      const up = image[Math.max(y - 1, 0)][x];
      const down = image[Math.min(y + 1, h - 1)][x];
      const left = image[y][Math.max(x - 1, 0)];
      const right = image[y][Math.min(x + 1, w - 1)];
      out[y][x] = up + down + left + right - 4 * c;
    }
  }
  return out;
}

function scaleNormalizedLog(image: number[][], sigma: number): number[][] {
  const blurred = gaussianBlur(image, sigma);
  const lap = laplacian(blurred);
  return lap.map((row) => row.map((v) => v * sigma * sigma));
}

function detectBlobs(
  image: number[][],
  sigmas: number[],
): [number, number, number][] {
  const responses = sigmas.map((s) => scaleNormalizedLog(image, s));
  const h = image.length,
    w = image[0].length;
  const blobs: [number, number, number][] = [];
  for (let si = 1; si < sigmas.length - 1; si++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const val = responses[si][y][x];
        let isMax = true;
        let isMin = true;
        for (let ds = -1; ds <= 1; ds++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (ds === 0 && dy === 0 && dx === 0) continue;
              const neighbor = responses[si + ds][y + dy][x + dx];
              if (neighbor >= val) isMax = false;
              if (neighbor <= val) isMin = false;
            }
          }
        }
        if (isMax || isMin) blobs.push([y, x, sigmas[si]]);
      }
    }
  }
  return blobs;
}
```
