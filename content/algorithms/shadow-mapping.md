---
name: シャドウマッピング(Shadow Mapping)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(n)(nはシーンのポリゴン数、深度マップ生成・本描画それぞれ1パス)
summary: 光源の視点から見た深度マップを事前に1枚レンダリングしておき、通常のカメラ視点から描画する際に「光源から見て自分より手前に何かあるか」を深度マップと比較するだけで影を判定する、リアルタイムレンダリングの標準的な影生成技法。
---

## 概要

3Dシーンにリアルな影を落とすには、「その点が光源から見えるかどうか」を判定する必要がある。シャドウマッピングは、1978年にランス・ウィリアムズが提案した手法で、この判定を**2パスのレンダリング**で効率的に行う。第1パスで光源の位置にカメラを置いたつもりでシーンをレンダリングし、各ピクセルの「光源からの距離(深度)」だけを記録した**シャドウマップ**を作る。第2パスで通常のカメラ視点からシーンを描画する際、各ピクセルについて「そのピクセルが光源からどれだけ離れているか」をシャドウマップと照合し、シャドウマップに記録された値より遠ければ「何かに遮られている(影の中)」と判定する。追加のジオメトリ処理を必要とせず、既存のレンダリングパイプラインに深度比較を1回加えるだけで実装できる手軽さから、リアルタイム3Dグラフィックスの事実上標準的な影生成技法になっている。

## 仕組み

1. **シャドウマップの生成(第1パス)**: 光源の位置・向きを仮想的なカメラとみなし、その視点からシーンをレンダリングする。色情報は不要で、各ピクセルの深度値(光源からの距離)だけをテクスチャ(シャドウマップ)に書き込む
2. **本番描画(第2パス)**: 通常のカメラ視点でシーンを描画する。各ピクセルについて、そのワールド座標を光源のビュー・プロジェクション行列で変換し、シャドウマップ上の対応するテクセル座標と、そのピクセルの「光源からの距離」を求める
3. 求めた「このピクセルの光源からの距離」と、シャドウマップに記録されている「同じテクセル位置での最も近い距離」を比較する
4. このピクセルの距離がシャドウマップの値より(わずかな許容誤差を超えて)大きければ、「このピクセルより手前に別の物体があり、光源からの光を遮っている」と判定し、影として扱う(直接光の寄与を無効化する)。そうでなければ光が届いていると判定し、通常通り照明計算を行う
5. 1〜4を毎フレーム繰り返す。動く光源・動くオブジェクトにも対応できる(シャドウマップを毎フレーム再生成すればよい)

## 特性・トレードオフ

- **既存パイプラインへの組み込みやすさ**: 影の判定が「もう1回レンダリングして、深度を比較するだけ」というシンプルな追加パスで実現できるため、既存のレンダリングエンジンに比較的容易に組み込める。[球面調和関数照明](/algorithms/spherical-harmonics-lighting)のような間接光の計算とは独立して扱える
- **シャドウアクネとピーターパン問題**: 深度値の精度の限界により、本来影であるべきでない面が誤って自分自身に影を落とす「シャドウアクネ(ノイズ状の縞模様)」や、逆に許容誤差を大きくしすぎるとオブジェクトが地面から浮いているように見える「ピーターパン問題」が起きやすい。バイアス値の調整、法線方向を考慮したバイアス、深度差分の技法などで軽減される
- **解像度依存のジャギー(シャドウマップエイリアシング)**: シャドウマップはテクスチャであるため有限の解像度しか持たず、影の輪郭がギザギザに見えるエイリアシングが生じやすい。カスケードシャドウマップ(カメラからの距離に応じて複数解像度のシャドウマップを使い分ける)、PCF(Percentage Closer Filtering、周辺テクセルを平均して輪郭を滑らかにする)といった改良手法が広く併用される
- **使いどころ**: リアルタイム3Dゲーム・映像制作のほぼ全ての直接光の影表現、建築ビジュアライゼーションの日照シミュレーション、太陽光のような広域光源向けのカスケードシャドウマップ、複数光源の影を扱う場合の光源ごとのシャドウマップ生成

## 実装例

簡略化した1次元的な例として、光源視点からの深度マップ生成と、比較によるシャドウ判定のロジックを示す。

```python
def render_depth_from_light(scene_heights: list[float], light_x: float) -> list[float]:
    """簡略化: シーンを1次元の高さ配列とみなし、光源から見た各方向の最も近い深度を記録する。"""
    depth_map = []
    for x, height in enumerate(scene_heights):
        distance = ((x - light_x) ** 2 + height ** 2) ** 0.5
        depth_map.append(distance)
    return depth_map

def is_in_shadow(
    point_x: int, point_height: float, light_x: float, depth_map: list[float], bias: float = 0.01,
) -> bool:
    distance_to_light = ((point_x - light_x) ** 2 + point_height ** 2) ** 0.5
    recorded_depth = depth_map[point_x]
    return distance_to_light > recorded_depth + bias
```

```typescript
function renderDepthFromLight(sceneHeights: number[], lightX: number): number[] {
  return sceneHeights.map((height, x) => Math.hypot(x - lightX, height));
}

function isInShadow(
  pointX: number, pointHeight: number, lightX: number, depthMap: number[], bias = 0.01,
): boolean {
  const distanceToLight = Math.hypot(pointX - lightX, pointHeight);
  const recordedDepth = depthMap[pointX];
  return distanceToLight > recordedDepth + bias;
}
```

```cpp
#include <vector>
#include <cmath>

std::vector<double> renderDepthFromLight(const std::vector<double>& sceneHeights, double lightX) {
    std::vector<double> depthMap;
    for (size_t x = 0; x < sceneHeights.size(); x++) {
        depthMap.push_back(std::hypot(static_cast<double>(x) - lightX, sceneHeights[x]));
    }
    return depthMap;
}

bool isInShadow(int pointX, double pointHeight, double lightX, const std::vector<double>& depthMap, double bias = 0.01) {
    double distanceToLight = std::hypot(pointX - lightX, pointHeight);
    double recordedDepth = depthMap[pointX];
    return distanceToLight > recordedDepth + bias;
}
```

```rust
fn render_depth_from_light(scene_heights: &[f64], light_x: f64) -> Vec<f64> {
    scene_heights
        .iter()
        .enumerate()
        .map(|(x, &height)| ((x as f64 - light_x).powi(2) + height.powi(2)).sqrt())
        .collect()
}

fn is_in_shadow(point_x: usize, point_height: f64, light_x: f64, depth_map: &[f64], bias: f64) -> bool {
    let distance_to_light = ((point_x as f64 - light_x).powi(2) + point_height.powi(2)).sqrt();
    let recorded_depth = depth_map[point_x];
    distance_to_light > recorded_depth + bias
}
```

```csharp
static double[] RenderDepthFromLight(double[] sceneHeights, double lightX)
{
    var depthMap = new double[sceneHeights.Length];
    for (int x = 0; x < sceneHeights.Length; x++)
        depthMap[x] = Math.Sqrt(Math.Pow(x - lightX, 2) + Math.Pow(sceneHeights[x], 2));
    return depthMap;
}

static bool IsInShadow(int pointX, double pointHeight, double lightX, double[] depthMap, double bias = 0.01)
{
    double distanceToLight = Math.Sqrt(Math.Pow(pointX - lightX, 2) + Math.Pow(pointHeight, 2));
    double recordedDepth = depthMap[pointX];
    return distanceToLight > recordedDepth + bias;
}
```
