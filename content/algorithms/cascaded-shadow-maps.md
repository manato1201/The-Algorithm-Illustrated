---
name: カスケードシャドウマップ(CSM)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(n・c)(nはシーンのポリゴン数、cはカスケード段数)
summary: カメラからの距離に応じてシーンを複数の区間(カスケード)に分割し、それぞれの区間ごとに独立した解像度の[シャドウマップ](/algorithms/shadow-mapping)を生成することで、広大な屋外シーンでも近景の影の解像度を保ちながら遠景までカバーする手法。
---

## 概要

[シャドウマッピング](/algorithms/shadow-mapping)は光源視点からの深度マップを1枚だけ生成する手法だが、太陽光のような広い範囲を照らす平行光源をシーン全体にわたって1枚のシャドウマップでカバーしようとすると、有限のテクスチャ解像度をシーン全体の広さに引き伸ばすことになり、カメラの近くにある物体の影が粗いブロック状のジャギーになってしまう(シャドウマップエイリアシング)。カスケードシャドウマップ(Cascaded Shadow Maps, CSM)は、この問題を「カメラからの距離によって必要な影の解像度が違う」という観察から解決する。カメラの視錐台をカメラに近い区間から遠い区間まで複数のカスケード(段)に分割し、**各カスケードごとに独立したシャドウマップを、そのカスケードがカバーする範囲にぴったり合わせて生成する**。近いカスケードは狭い範囲を高解像度でカバーし、遠いカスケードは広い範囲を(相対的に)低解像度でカバーすることで、限られたテクスチャメモリを効率的に配分し、近景の影の品質を保ちながら遠景まで影を届かせることができる。屋外シーンで太陽光のような平行光源の影を描く現代のリアルタイムレンダリングにおける事実上の標準技法である。

## 仕組み

1. カメラの視錐台を、カメラからの距離に応じて複数の区間(通常3〜4段)に分割する。分割の境界は、近くほど細かく・遠くほど粗くなるよう対数的または対数と線形の中間的なスキームで決めることが多い(近距離の精度を優先するため)
2. 各カスケードについて、そのカスケードが占める視錐台の一部分(サブフラスタム)を包含するバウンディングボックスを、光源のビュー空間で計算する
3. そのバウンディングボックスにちょうど収まるように、光源視点の正射影(オルソグラフィック)プロジェクション行列を構成する。カスケードごとに異なるビュープロジェクション行列を持つことになる
4. カスケードの数だけ、[シャドウマッピング](/algorithms/shadow-mapping)と同様の深度マップ生成パスをそれぞれ独立に実行し、カスケードごとのシャドウマップを得る(通常、同じテクスチャ解像度を使うが、カバーする範囲が狭い近景のカスケードほど1テクセルあたりの実空間の広さが小さくなり、結果的に高解像度になる)
5. 本番描画時、各ピクセルのカメラからの距離を調べ、そのピクセルがどのカスケードに属するかを判定し、対応するカスケードのシャドウマップを使って[シャドウマッピング](/algorithms/shadow-mapping)と同様の深度比較を行う
6. カスケードの境界付近では、隣接する2つのカスケードのシャドウマップ結果をブレンドする(**カスケード間のフェード**)ことで、境界をまたいだ際に影の解像度が急に変わる不自然な継ぎ目を目立たなくする

## 特性・トレードオフ

- **限られたテクスチャメモリの効率的な配分**: 単一のシャドウマップでシーン全体をカバーする場合と比べ、同じ総テクスチャメモリでも近景により多くの解像度を割り当てられるため、体感的な影の品質が大きく向上する。広大なオープンワールドゲームで特に効果を発揮する
- **カスケード間の継ぎ目とポップイン**: カスケードの境界をまたいでカメラが移動すると、影の解像度が段階的に変化するため、注意深くブレンドしないと境界線がちらついたり、遠くの物体が急に鮮明な影を持つように見える「ポップイン」が起きやすい
- **カスケードごとの描画コスト**: カスケードの数だけジオメトリの描画パスが増えるため、ポリゴン数の多いシーンではシャドウマップ生成のコストがカスケード数倍になる。視錐台カリング([フラスタムカリング](/algorithms/frustum-culling)の光源視点版)を各カスケードごとに適用してドローコールを絞り込むことが重要になる
- **安定化(シャドウシマリング対策)**: カメラが動くたびにカスケードの範囲がわずかに変化すると、シャドウマップのテクセルとワールド座標の対応がずれ、影の輪郭がちらつく「シャドウシマリング」が起きる。カスケードの原点をテクセル単位のグリッドにスナップする(テクセルスナッピング)ことで、カメラの微小な移動に対して影を安定させる工夫が広く使われる
- **使いどころ**: オープンワールドゲームや屋外シーンにおける太陽光・月光のような平行光源の影表現、広い視野角と遠い描画距離を持つシーン、[シャドウマッピング](/algorithms/shadow-mapping)を単体で使うと近景の影の粗さが目立つあらゆる屋外レンダリングパイプライン

## 実装例

視錐台をカスケードに分割し、各カスケードの範囲を判定してシャドウマップを選択する中核ロジックを簡略化して示す。

```python
import math

def compute_cascade_splits(near: float, far: float, cascade_count: int, lambda_factor: float = 0.5) -> list[float]:
    """近距離を優先する対数分割と均等な線形分割を混ぜてカスケード境界を決める。"""
    splits = [near]
    for i in range(1, cascade_count + 1):
        t = i / cascade_count
        log_split = near * (far / near) ** t
        linear_split = near + (far - near) * t
        splits.append(lambda_factor * log_split + (1 - lambda_factor) * linear_split)
    return splits

def select_cascade(view_space_depth: float, splits: list[float]) -> int:
    """ピクセルのカメラからの距離(ビュー空間深度)から、使用すべきカスケードを判定する。"""
    for i in range(len(splits) - 1):
        if splits[i] <= view_space_depth < splits[i + 1]:
            return i
    return len(splits) - 2  # 遠すぎる場合は最遠カスケードを使う

def is_in_shadow_cascaded(
    view_space_depth: float,
    world_pos: tuple[float, float, float],
    splits: list[float],
    cascade_shadow_maps: list[dict],  # 各カスケード: {"light_view_proj": ..., "depth_lookup": fn}
    bias: float = 0.005,
) -> bool:
    cascade_index = select_cascade(view_space_depth, splits)
    cascade = cascade_shadow_maps[cascade_index]

    light_space_pos = cascade["light_view_proj"](world_pos)  # (x, y, depth) に射影
    recorded_depth = cascade["depth_lookup"](light_space_pos[0], light_space_pos[1])

    return light_space_pos[2] > recorded_depth + bias

def blend_cascade_edge(
    view_space_depth: float, splits: list[float], cascade_index: int, blend_distance: float = 2.0,
) -> float:
    """カスケード境界付近での隣接カスケードとのブレンド率(0=完全に現カスケード, 1=完全に次カスケード)を返す。"""
    next_split = splits[cascade_index + 1]
    distance_to_edge = next_split - view_space_depth
    if distance_to_edge >= blend_distance:
        return 0.0
    return 1.0 - max(0.0, distance_to_edge / blend_distance)
```

```typescript
type Vec3 = [number, number, number];

interface CascadeShadowMap {
  lightViewProj: (worldPos: Vec3) => [number, number, number]; // (x, y, depth) に射影
  depthLookup: (x: number, y: number) => number;
}

function computeCascadeSplits(
  near: number,
  far: number,
  cascadeCount: number,
  lambdaFactor = 0.5,
): number[] {
  const splits = [near];
  for (let i = 1; i <= cascadeCount; i++) {
    const t = i / cascadeCount;
    const logSplit = near * (far / near) ** t;
    const linearSplit = near + (far - near) * t;
    splits.push(lambdaFactor * logSplit + (1 - lambdaFactor) * linearSplit);
  }
  return splits;
}

function selectCascade(viewSpaceDepth: number, splits: number[]): number {
  for (let i = 0; i < splits.length - 1; i++) {
    if (splits[i] <= viewSpaceDepth && viewSpaceDepth < splits[i + 1]) return i;
  }
  return splits.length - 2; // 遠すぎる場合は最遠カスケードを使う
}

function isInShadowCascaded(
  viewSpaceDepth: number,
  worldPos: Vec3,
  splits: number[],
  cascadeShadowMaps: CascadeShadowMap[],
  bias = 0.005,
): boolean {
  const cascadeIndex = selectCascade(viewSpaceDepth, splits);
  const cascade = cascadeShadowMaps[cascadeIndex];

  const lightSpacePos = cascade.lightViewProj(worldPos);
  const recordedDepth = cascade.depthLookup(lightSpacePos[0], lightSpacePos[1]);

  return lightSpacePos[2] > recordedDepth + bias;
}

function blendCascadeEdge(
  viewSpaceDepth: number,
  splits: number[],
  cascadeIndex: number,
  blendDistance = 2.0,
): number {
  const nextSplit = splits[cascadeIndex + 1];
  const distanceToEdge = nextSplit - viewSpaceDepth;
  if (distanceToEdge >= blendDistance) return 0;
  return 1 - Math.max(0, distanceToEdge / blendDistance);
}
```
