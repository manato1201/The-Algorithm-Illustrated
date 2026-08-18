---
name: スクリーンスペース・アンビエントオクルージョン(SSAO)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(w・h・k)(w×hは画面の画素数、kはピクセルあたりのサンプル数)
summary: 深度バッファと法線バッファだけを使い、各ピクセル周辺の空間をサンプリングして「周囲のジオメトリにどれだけ光が遮られているか」を画面空間で近似することで、物体の接触部や隙間に生じる間接光の陰影をリアルタイムに付加する手法。
---

## 概要

現実世界では、部屋の隅や物体同士が接触する箇所は、周囲のジオメトリが環境光を遮ることでわずかに暗くなる。この現象を**アンビエントオクルージョン(Ambient Occlusion, AO)**と呼び、本来は各点から半球状にレイを飛ばして周囲のジオメトリとの遮蔽率を積分する必要があるが、これをシーン全体でリアルタイムに計算するのは非常に重い。スクリーンスペース・アンビエントオクルージョン(Screen-Space Ambient Occlusion, SSAO)は、2007年にクリスピン・カウフマンらによって発表された手法で、シーンの3D構造を使う代わりに、**すでにレンダリング済みの深度バッファと法線バッファ(画面空間の情報)だけ**を使ってこの遮蔽を近似する。各ピクセルの周辺にランダムなサンプル点を配置し、それらのサンプル点が深度バッファ上で「実際のジオメトリの内側」に埋まっているかどうかを調べることで、真の3Dジオメトリを持たずとも、それらしい接触陰影を安価に生成できる。[ディファードシェーディング](/algorithms/deferred-shading)のようにGバッファ(深度・法線)がすでに存在するパイプラインとは特に相性がよく、リアルタイム3Dレンダリングにおける間接光表現の定番技法として広く普及している。

## 仕組み

1. 前段のジオメトリパスから、**深度バッファ**と**法線バッファ**(あるいはこれらから復元できるワールド座標/ビュー空間座標)を取得する
2. 各ピクセルについて、そのピクセルの法線を基準にした半球状(または球状)の範囲に、複数のランダムなサンプル点(カーネル)を生成する。サンプル点はあらかじめランダムなベクトルの集合として用意しておき、法線に沿った半球に収まるよう回転させる
3. 各サンプル点のビュー空間座標を、カメラのプロジェクション行列で画面空間(スクリーン座標)に変換し、その座標で深度バッファをサンプリングして「実際のジオメトリの深度」を取得する
4. サンプル点自体の深度と、深度バッファから読み取った実際のジオメトリの深度を比較する。サンプル点の深度の方が奥にある(=実際のジオメトリの手前に何かがある)場合、そのサンプル点は「遮蔽されている」とみなしてカウントする。急激な深度差(全く別のオブジェクト)による誤判定を避けるため、深度差にレンジチェック(一定範囲を超える差は無視する)を適用する
5. 遮蔽されたサンプル点の割合を集計し、そのピクセルの遮蔽係数(0〜1)とする。この値をシーンの環境光・間接光の項に乗算することで、接触部が暗く沈み込んだような陰影を得る
6. サンプル数を減らすとノイズが目立つため、実用上はサンプル数を絞った上で、生成されたAOバッファに対して**ぼかし(ブラー)**をかけてノイズを均す。法線・深度が近いピクセル同士だけをぼかす「バイラテラルブラー」を使うと、輪郭のにじみを抑えられる

## 特性・トレードオフ

- **真の3D構造を必要としない安さ**: シーン全体のジオメトリに対してレイキャストする本来のアンビエントオクルージョンと異なり、SSAOは画面に映っている情報(深度・法線)だけで完結するため、シーンの複雑さに関わらずコストが画面解像度とサンプル数だけで決まる
- **画面外・遮蔽情報の欠落による誤差**: 画面に映っていないジオメトリ(カメラの背後や画面端の外)は考慮できないため、本来遮蔽されるべき箇所が計算に含まれず、逆に画面の端でAOが不自然に途切れることがある。これはスクリーンスペース手法全般([スクリーンスペースリフレクションなど](/algorithms/screen-space-ambient-occlusion))が共有する根本的な制約
- **ノイズとぼかしのトレードオフ**: サンプル数を減らせば高速だがノイズが目立ち、増やせば滑らかだが重くなる。実用上は少ないサンプル+空間的/時間的なノイズ除去(バイラテラルブラー、あるいは[テンポラルアンチエイリアシング](/algorithms/temporal-anti-aliasing)と同様の考え方でフレーム間の蓄積を使うテンポラルAO)を組み合わせることが多い
- **後継手法の存在**: SSAOは深度バッファのみを情報源とするため遮蔽の推定精度に限界があり、後継としてより正確な法線情報を利用するHBAO(Horizon-Based AO)、法線に加え水平線の走査を使うGTAO(Ground Truth AO)などが提案され、多くの現代エンジンではこれらの改良版が使われている
- **使いどころ**: [ディファードシェーディング](/algorithms/deferred-shading)パイプラインを持つ現代のゲームエンジンのほぼ標準的な間接光補助エフェクト、屋内シーンの物体の接触部・隅の陰影表現、フルパストレーシングが重すぎるリアルタイム用途での近似的な間接光表現

## 実装例

半球サンプリングカーネルの生成と、深度バッファ比較による遮蔽率の計算を簡略化して示す(実際のGPU実装ではピクセルシェーダーで並列に行うが、ここではCPU側の逐次処理として表現している)。

```python
import math
import random

def dot3(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

def normalize3(v):
    length = math.sqrt(dot3(v, v)) or 1e-9
    return (v[0] / length, v[1] / length, v[2] / length)

def generate_hemisphere_kernel(sample_count: int = 16) -> list[tuple[float, float, float]]:
    """法線+Z方向を軸とする半球内にランダムなサンプルベクトルを生成する。近いほど密にする。"""
    kernel = []
    for i in range(sample_count):
        sample = (
            random.uniform(-1, 1),
            random.uniform(-1, 1),
            random.uniform(0, 1),  # 半球なのでz(法線方向)は正のみ
        )
        sample = normalize3(sample)
        scale = (i / sample_count) ** 2  # 原点付近に密なサンプル分布にする
        sample = tuple(s * scale for s in sample)
        kernel.append(sample)
    return kernel

def align_kernel_to_normal(sample: tuple[float, float, float], normal: tuple[float, float, float]) -> tuple[float, float, float]:
    """半球サンプルを実際のピクセルの法線方向に合わせて簡易的に回転(法線基底への射影)する。"""
    up = (0.0, 1.0, 0.0) if abs(normal[1]) < 0.99 else (1.0, 0.0, 0.0)
    tangent = normalize3(tuple(
        up[i] - normal[i] * dot3(up, normal) for i in range(3)
    ))
    bitangent = (
        normal[1] * tangent[2] - normal[2] * tangent[1],
        normal[2] * tangent[0] - normal[0] * tangent[2],
        normal[0] * tangent[1] - normal[1] * tangent[0],
    )
    return tuple(
        tangent[i] * sample[0] + bitangent[i] * sample[1] + normal[i] * sample[2] for i in range(3)
    )

def compute_ssao(
    pixel_view_pos: tuple[float, float, float],
    pixel_normal: tuple[float, float, float],
    kernel: list[tuple[float, float, float]],
    sample_depth_lookup,  # (view_pos) -> 深度バッファ上の実際のview空間Z値
    radius: float = 0.5,
    bias: float = 0.025,
) -> float:
    occluded = 0
    for raw_sample in kernel:
        offset = align_kernel_to_normal(raw_sample, pixel_normal)
        sample_pos = tuple(pixel_view_pos[i] + offset[i] * radius for i in range(3))

        scene_depth = sample_depth_lookup(sample_pos)
        range_check = 1.0 if abs(pixel_view_pos[2] - scene_depth) < radius else 0.0

        if scene_depth >= sample_pos[2] + bias:
            occluded += range_check

    return 1.0 - (occluded / len(kernel))
```

```typescript
type Vec3 = [number, number, number];

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize3(v: Vec3): Vec3 {
  const length = Math.sqrt(dot3(v, v)) || 1e-9;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function generateHemisphereKernel(sampleCount = 16): Vec3[] {
  const kernel: Vec3[] = [];
  for (let i = 0; i < sampleCount; i++) {
    let sample: Vec3 = [
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random(), // 半球なのでz(法線方向)は正のみ
    ];
    sample = normalize3(sample);
    const scale = (i / sampleCount) ** 2; // 原点付近に密なサンプル分布にする
    sample = [sample[0] * scale, sample[1] * scale, sample[2] * scale];
    kernel.push(sample);
  }
  return kernel;
}

function alignKernelToNormal(sample: Vec3, normal: Vec3): Vec3 {
  const up: Vec3 = Math.abs(normal[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalize3([
    up[0] - normal[0] * dot3(up, normal),
    up[1] - normal[1] * dot3(up, normal),
    up[2] - normal[2] * dot3(up, normal),
  ]);
  const bitangent: Vec3 = [
    normal[1] * tangent[2] - normal[2] * tangent[1],
    normal[2] * tangent[0] - normal[0] * tangent[2],
    normal[0] * tangent[1] - normal[1] * tangent[0],
  ];
  return [
    tangent[0] * sample[0] + bitangent[0] * sample[1] + normal[0] * sample[2],
    tangent[1] * sample[0] + bitangent[1] * sample[1] + normal[1] * sample[2],
    tangent[2] * sample[0] + bitangent[2] * sample[1] + normal[2] * sample[2],
  ];
}

function computeSSAO(
  pixelViewPos: Vec3,
  pixelNormal: Vec3,
  kernel: Vec3[],
  sampleDepthLookup: (viewPos: Vec3) => number,
  radius = 0.5,
  bias = 0.025,
): number {
  let occluded = 0;
  for (const rawSample of kernel) {
    const offset = alignKernelToNormal(rawSample, pixelNormal);
    const samplePos: Vec3 = [
      pixelViewPos[0] + offset[0] * radius,
      pixelViewPos[1] + offset[1] * radius,
      pixelViewPos[2] + offset[2] * radius,
    ];

    const sceneDepth = sampleDepthLookup(samplePos);
    const rangeCheck = Math.abs(pixelViewPos[2] - sceneDepth) < radius ? 1 : 0;

    if (sceneDepth >= samplePos[2] + bias) {
      occluded += rangeCheck;
    }
  }

  return 1 - occluded / kernel.length;
}
```
