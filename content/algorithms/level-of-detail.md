---
name: LOD(Level of Detail)切り替え
category: CG・3Dレンダリング
subcategory: ジオメトリ処理
complexity: O(1)(1オブジェクトあたりの選択コスト)
summary: カメラからの距離や画面上の見かけの大きさに応じて、同じオブジェクトのポリゴン数が異なる複数バージョンを切り替えて描画し、見た目の劣化を抑えながら描画コストを削減する。
---

## 概要

[線形ブレンドスキニング](/algorithms/linear-blend-skinning)や[フラスタムカリング](/algorithms/frustum-culling)がそれぞれ変形と可視性の最適化を担うのに対し、LOD(Level of Detail)は「**画面に映ってはいるが遠くにあって細部が見えないオブジェクト**」の描画コストを削減する手法である。遠くの木や建物は、画面上でわずか数ピクセルしか占めないにもかかわらず、近くにあるときと同じ数万ポリゴンで描画すると、その精細さは画面には反映されないまま頂点処理のコストだけがかかる。LODは、同じオブジェクトについてあらかじめポリゴン数の異なる複数のバージョン(高精細・中精細・低精細)を用意しておき、**カメラからの距離や画面上の見かけの大きさに応じて描画するバージョンを切り替える**ことで、見た目の劣化を最小限に抑えながら全体の描画負荷を大きく下げる。

## 仕組み

1. オフラインで、対象メッシュのポリゴン数を段階的に削減した複数のバージョン(LOD0=最高精細のオリジナル、LOD1、LOD2、…と番号が上がるほど粗くなる)を用意する。削減には辺の縮退(エッジコラプス)などのメッシュ簡略化アルゴリズムが使われる
2. 各LODレベルに、切り替えの基準となる距離(または画面上の占有面積)のしきい値を設定する
3. 実行時、カメラとオブジェクトの距離(またはオブジェクトの境界球を画面に投影した際の見かけの大きさ)を計算する
4. 計算した距離・見かけの大きさをしきい値と比較し、該当するLODレベルのメッシュを選んで描画する。近ければLOD0(高精細)、遠くなるほどLOD1、LOD2…と粗いメッシュに切り替わる
5. 切り替えの瞬間にポリゴン数が急に変わることで見た目が「パッ」と変化する(ポッピング)ことがあるため、実務では2つのLODレベルの間でアルファブレンドしながら滑らかに切り替える(クロスフェード)、または画面上のピクセル単位で連続的にディテールを変化させる(ジオメトリシェーダやメッシュシェーダを使った連続LOD)といった工夫が併用される

## 特性・トレードオフ

- **描画負荷と視覚品質の実務的な妥協点**: 遠くのオブジェクトの詳細は画面解像度の制約で人間の目にはほぼ見えないため、そこに高精細なメッシュを使うのは計算資源の無駄になる。LODは「見えない情報を削る」という、レンダリング最適化における最も費用対効果の高い手法の一つとされる
- **ポッピングという副作用**: LODレベルの切り替えが唐突だと、画面上でオブジェクトの見た目が瞬間的に変化する「ポッピング」が目立ち、没入感を損なう。ヒステリシス(切り替えの往復にわずかな距離差を設けてチラつきを防ぐ)やクロスフェードの導入が実務上ほぼ必須になる
- **[フラスタムカリング](/algorithms/frustum-culling)との役割分担**: フラスタムカリングは「画面に映るか映らないか」という0/1の判定だが、LODは「画面に映っているオブジェクトをどれだけ精細に描くか」という連続的な調整であり、両者は独立に働きながら組み合わされる(まずカリングで描画対象を絞り、残ったオブジェクトそれぞれにLODを適用する)
- **使いどころ**: オープンワールドゲームの地形・植生・建造物の描画最適化、都市シミュレーションのような大量オブジェクトの表示、VR(フレームレート維持が特に重要)でのオブジェクト表示、3Dモデリングツール・CADソフトのビューポート表示高速化

## 実装例

```python
from dataclasses import dataclass

@dataclass
class LodLevel:
    max_distance: float
    mesh_name: str
    triangle_count: int

def select_lod(levels: list[LodLevel], distance: float) -> LodLevel:
    """levelsはmax_distance昇順にソート済みとする。距離を超えた最初のレベルを選ぶ。"""
    for level in levels:
        if distance <= level.max_distance:
            return level
    return levels[-1]  # 最遠距離を超えたら最も粗いレベルを使う

def select_lod_with_hysteresis(
    levels: list[LodLevel], distance: float, current_index: int, hysteresis: float = 2.0,
) -> int:
    """現在選択中のレベルにわずかな余裕(hysteresis)を持たせ、境界付近でのチラつきを防ぐ。"""
    current = levels[current_index]
    if distance <= current.max_distance + hysteresis and (
        current_index == 0 or distance > levels[current_index - 1].max_distance - hysteresis
    ):
        return current_index
    for i, level in enumerate(levels):
        if distance <= level.max_distance:
            return i
    return len(levels) - 1
```

```typescript
type LodLevel = { maxDistance: number; meshName: string; triangleCount: number };

function selectLod(levels: LodLevel[], distance: number): LodLevel {
  for (const level of levels) {
    if (distance <= level.maxDistance) return level;
  }
  return levels[levels.length - 1];
}

function selectLodWithHysteresis(
  levels: LodLevel[], distance: number, currentIndex: number, hysteresis = 2.0,
): number {
  const current = levels[currentIndex];
  const lowerBound = currentIndex === 0 ? -Infinity : levels[currentIndex - 1].maxDistance - hysteresis;
  if (distance <= current.maxDistance + hysteresis && distance > lowerBound) {
    return currentIndex;
  }
  for (let i = 0; i < levels.length; i++) {
    if (distance <= levels[i].maxDistance) return i;
  }
  return levels.length - 1;
}
```

```cpp
#include <vector>
#include <string>
#include <limits>

struct LodLevel {
    double maxDistance;
    std::string meshName;
    int triangleCount;
};

const LodLevel& selectLod(const std::vector<LodLevel>& levels, double distance) {
    for (const auto& level : levels) {
        if (distance <= level.maxDistance) return level;
    }
    return levels.back();
}

int selectLodWithHysteresis(const std::vector<LodLevel>& levels, double distance, int currentIndex, double hysteresis = 2.0) {
    const auto& current = levels[currentIndex];
    double lowerBound = currentIndex == 0 ? -std::numeric_limits<double>::infinity() : levels[currentIndex - 1].maxDistance - hysteresis;
    if (distance <= current.maxDistance + hysteresis && distance > lowerBound) {
        return currentIndex;
    }
    for (size_t i = 0; i < levels.size(); i++) {
        if (distance <= levels[i].maxDistance) return static_cast<int>(i);
    }
    return static_cast<int>(levels.size()) - 1;
}
```

```rust
struct LodLevel {
    max_distance: f64,
    mesh_name: String,
    triangle_count: u32,
}

fn select_lod(levels: &[LodLevel], distance: f64) -> &LodLevel {
    levels
        .iter()
        .find(|level| distance <= level.max_distance)
        .unwrap_or_else(|| levels.last().unwrap())
}

fn select_lod_with_hysteresis(levels: &[LodLevel], distance: f64, current_index: usize, hysteresis: f64) -> usize {
    let current = &levels[current_index];
    let lower_bound = if current_index == 0 {
        f64::NEG_INFINITY
    } else {
        levels[current_index - 1].max_distance - hysteresis
    };
    if distance <= current.max_distance + hysteresis && distance > lower_bound {
        return current_index;
    }
    for (i, level) in levels.iter().enumerate() {
        if distance <= level.max_distance {
            return i;
        }
    }
    levels.len() - 1
}
```

```csharp
struct LodLevel
{
    public double MaxDistance;
    public string MeshName;
    public int TriangleCount;
}

static LodLevel SelectLod(List<LodLevel> levels, double distance)
{
    foreach (var level in levels)
    {
        if (distance <= level.MaxDistance) return level;
    }
    return levels[^1];
}

static int SelectLodWithHysteresis(List<LodLevel> levels, double distance, int currentIndex, double hysteresis = 2.0)
{
    var current = levels[currentIndex];
    double lowerBound = currentIndex == 0 ? double.NegativeInfinity : levels[currentIndex - 1].MaxDistance - hysteresis;
    if (distance <= current.MaxDistance + hysteresis && distance > lowerBound)
    {
        return currentIndex;
    }
    for (int i = 0; i < levels.Count; i++)
    {
        if (distance <= levels[i].MaxDistance) return i;
    }
    return levels.Count - 1;
}
```
