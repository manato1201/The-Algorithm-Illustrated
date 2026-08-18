---
name: テンポラルアンチエイリアシング(TAA)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(w・h)(w×hは画面の画素数、1フレームあたり)
summary: 前フレームの描画結果をカメラ・オブジェクトの動きに合わせて再投影し、サブピクセル単位でジッターさせた複数フレームの情報を時間方向に蓄積することで、1フレームあたりの追加コストをほぼ増やさずに高品質なアンチエイリアシングを実現する手法。
---

## 概要

ポリゴンの輪郭がギザギザに見える「エイリアシング」を抑える最も素朴な方法はMSAA(マルチサンプルアンチエイリアシング)のように1ピクセルを複数のサブサンプルで評価することだが、[ディファードシェーディング](/algorithms/deferred-shading)のような画面空間パイプラインとは相性が悪く、サンプル数を増やすほどメモリと計算コストが線形に増える。テンポラルアンチエイリアシング(Temporal Anti-Aliasing, TAA)は発想を変え、**1フレームでは1ピクセルにつき1サンプルしか使わない代わりに、毎フレームわずかに異なるサブピクセル位置でサンプリングし、その結果を過去のフレームと時間方向に蓄積していく**ことで、実質的に多数のサンプルを使ったのと同等の滑らかさを得る。カメラやオブジェクトが動くと、前フレームの各ピクセルが今のフレームのどこに移動したかを推定する「再投影(リプロジェクション)」が必要になるため、モーションベクトルの計算が手法の中核を成す。追加コストが低く高品質な結果が得られることから、現代の多くのリアルタイムレンダリングパイプラインで標準的なアンチエイリアシング手法として採用されている。

## 仕組み

1. **サブピクセルジッター**: 毎フレーム、カメラのプロジェクション行列にごくわずかなオフセット(通常はハルトン数列などの低食い違い量列で選んだサブピクセル単位のずれ)を加えて描画する。これにより、フレームごとにピクセル中心からわずかにずれた位置がサンプリングされる
2. **モーションベクトルの計算**: 各ピクセルについて、そのジオメトリが前フレームの画面上のどこにあったかを表す「モーションベクトル」を計算する。静的なジオメトリならカメラの移動・回転だけから求まるが、動くオブジェクト(スキンメッシュや剛体)は頂点シェーダー側でオブジェクト自身の移動も考慮してモーションベクトルを出力する必要がある
3. **再投影(リプロジェクション)**: 現在のピクセルの位置からモーションベクトルを引いた(あるいは逆算した)座標で、前フレームの蓄積バッファ(ヒストリバッファ)をサンプリングする。バイリニア補間で前フレームの色を取得する
4. **時間的蓄積**: 現在フレームの新しい色と、再投影して得た前フレームの色を、指数移動平均のような重み(例: `history * 0.9 + current * 0.1`)で混合し、新しいヒストリバッファとする。多くのフレームを経るごとに、実質的なサンプル数が積み重なり画像が滑らかになっていく
5. **ヒストリの棄却(クランプ/クリッピング)**: オクルージョンの変化やオブジェクトの出現・消失によって、再投影した前フレームの色が「今のフレームでは本来ありえない色」になることがある(ゴーストと呼ばれるアーティファクト)。現在フレーム近傍のピクセルの色分布(近傍ピクセルの最小値・最大値、または分散)を使ってヒストリの値をクランプし、極端に古い/不整合な情報を早めに棄却することで、ゴーストを抑制しながら時間的な滑らかさを両立させる

## 特性・トレードオフ

- **低コストで高品質**: 1フレームあたりの追加サンプル数は実質1つで済み、MSAAのようにサンプル数に比例してメモリ・計算コストが増えない。画面空間の[スクリーンスペース・アンビエントオクルージョン](/algorithms/screen-space-ambient-occlusion)のようなノイズの多いエフェクトのノイズ除去にも同じ時間的蓄積の考え方が転用できる
- **ゴーストとブラーが宿命的な弱点**: 再投影が不正確な領域(高速に動く細いオブジェクト、透明・半透明、オクルージョンの変化が激しい箇所)では、前フレームの残像が尾を引く「ゴースト」や、蓄積によって画像全体がわずかにぼやける「テンポラルブラー」が発生しやすい。クランプ手法の工夫やモーションベクトルの精度向上が実装上の主戦場になっている
- **モーションベクトルの生成コストと精度要求**: 静的なジオメトリだけでなく、スキンメッシュ・パーティクル・頂点シェーダーでの変形など、あらゆる動的要素について正確なモーションベクトルを出力する必要があり、実装の手間が大きい。モーションベクトルが欠落・不正確な部分は再投影が破綻し、ゴーストの温床になる
- **超解像技術への発展**: TAAの「時間的にサブピクセル情報を蓄積する」という基本アイデアは、DLSSやFSR、TSRのようなテンポラル型のアップスケーリング(低解像度でレンダリングし高解像度に再構成する)技術の土台にもなっている
- **使いどころ**: PBR(物理ベースレンダリング)を採用する現代の3Dゲームのほぼ標準的なアンチエイリアシング手法、[ディファードシェーディング](/algorithms/deferred-shading)パイプラインでMSAAが使いにくい環境、細いジオメトリ(電線・草・フェンス)のちらつき(シマー)を抑えたい場面

## 実装例

サブピクセルジッターの生成、モーションベクトルに基づく再投影、近傍クランプ付きの時間的蓄積という中核ロジックを簡略化して示す。

```python
import math

def halton(index: int, base: int) -> float:
    """低食い違い量列(ハルトン数列)でジッターオフセットを生成する。"""
    result, f = 0.0, 1.0
    i = index
    while i > 0:
        f /= base
        result += f * (i % base)
        i //= base
    return result

def jitter_offset(frame_index: int, sample_count: int = 8) -> tuple[float, float]:
    idx = (frame_index % sample_count) + 1
    return (halton(idx, 2) - 0.5, halton(idx, 3) - 0.5)

def reproject(
    current_pixel: tuple[int, int],
    motion_vector: tuple[float, float],
    history_buffer: list[list[tuple[float, float, float]]],
) -> tuple[float, float, float]:
    """モーションベクトル分だけ遡り、前フレームの色をバイリニア補間で取得する。"""
    h, w = len(history_buffer), len(history_buffer[0])
    src_x = current_pixel[0] - motion_vector[0]
    src_y = current_pixel[1] - motion_vector[1]
    x0, y0 = int(math.floor(src_x)), int(math.floor(src_y))
    x0 = min(max(x0, 0), w - 1)
    y0 = min(max(y0, 0), h - 1)
    return history_buffer[y0][x0]

def neighborhood_clamp(
    color: tuple[float, float, float], current_frame: list[list[tuple[float, float, float]]], x: int, y: int,
) -> tuple[float, float, float]:
    """近傍3x3ピクセルの色範囲でヒストリの色をクランプし、ゴーストを抑制する。"""
    h, w = len(current_frame), len(current_frame[0])
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ny, nx = min(max(y + dy, 0), h - 1), min(max(x + dx, 0), w - 1)
            px = current_frame[ny][nx]
            for c in range(3):
                mins[c] = min(mins[c], px[c])
                maxs[c] = max(maxs[c], px[c])
    return tuple(min(max(color[c], mins[c]), maxs[c]) for c in range(3))

def temporal_accumulate(
    current_frame: list[list[tuple[float, float, float]]],
    history_buffer: list[list[tuple[float, float, float]]],
    motion_vectors: list[list[tuple[float, float]]],
    blend_weight: float = 0.1,
) -> list[list[tuple[float, float, float]]]:
    h, w = len(current_frame), len(current_frame[0])
    output = [[(0.0, 0.0, 0.0)] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            history_color = reproject((x, y), motion_vectors[y][x], history_buffer)
            clamped_history = neighborhood_clamp(history_color, current_frame, x, y)
            current_color = current_frame[y][x]
            output[y][x] = tuple(
                clamped_history[c] * (1 - blend_weight) + current_color[c] * blend_weight for c in range(3)
            )
    return output
```

```typescript
type Vec2 = [number, number];
type Rgb = [number, number, number];

function halton(index: number, base: number): number {
  let result = 0;
  let f = 1;
  let i = index;
  while (i > 0) {
    f /= base;
    result += f * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

function jitterOffset(frameIndex: number, sampleCount = 8): Vec2 {
  const idx = (frameIndex % sampleCount) + 1;
  return [halton(idx, 2) - 0.5, halton(idx, 3) - 0.5];
}

function reproject(currentPixel: Vec2, motionVector: Vec2, historyBuffer: Rgb[][]): Rgb {
  const h = historyBuffer.length,
    w = historyBuffer[0].length;
  const srcX = currentPixel[0] - motionVector[0];
  const srcY = currentPixel[1] - motionVector[1];
  const x0 = Math.min(Math.max(Math.floor(srcX), 0), w - 1);
  const y0 = Math.min(Math.max(Math.floor(srcY), 0), h - 1);
  return historyBuffer[y0][x0];
}

function neighborhoodClamp(color: Rgb, currentFrame: Rgb[][], x: number, y: number): Rgb {
  const h = currentFrame.length,
    w = currentFrame[0].length;
  const mins: Rgb = [Infinity, Infinity, Infinity];
  const maxs: Rgb = [-Infinity, -Infinity, -Infinity];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = Math.min(Math.max(y + dy, 0), h - 1);
      const nx = Math.min(Math.max(x + dx, 0), w - 1);
      const px = currentFrame[ny][nx];
      for (let c = 0; c < 3; c++) {
        mins[c] = Math.min(mins[c], px[c]);
        maxs[c] = Math.max(maxs[c], px[c]);
      }
    }
  }
  return [
    Math.min(Math.max(color[0], mins[0]), maxs[0]),
    Math.min(Math.max(color[1], mins[1]), maxs[1]),
    Math.min(Math.max(color[2], mins[2]), maxs[2]),
  ];
}

function temporalAccumulate(
  currentFrame: Rgb[][],
  historyBuffer: Rgb[][],
  motionVectors: Vec2[][],
  blendWeight = 0.1,
): Rgb[][] {
  const h = currentFrame.length,
    w = currentFrame[0].length;
  const output: Rgb[][] = Array.from({ length: h }, () => new Array(w).fill([0, 0, 0]));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const historyColor = reproject([x, y], motionVectors[y][x], historyBuffer);
      const clamped = neighborhoodClamp(historyColor, currentFrame, x, y);
      const current = currentFrame[y][x];
      output[y][x] = [
        clamped[0] * (1 - blendWeight) + current[0] * blendWeight,
        clamped[1] * (1 - blendWeight) + current[1] * blendWeight,
        clamped[2] * (1 - blendWeight) + current[2] * blendWeight,
      ];
    }
  }
  return output;
}
```
