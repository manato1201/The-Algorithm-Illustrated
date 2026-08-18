---
name: GPUインスタンシングによる描画バッチ最適化
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(1)(ドローコール数は定数、CPU側のオーバーヘッドの観点で)
summary: 同じメッシュを共有する大量のオブジェクト(草・群衆・弾丸など)を1回のドローコールにまとめ、位置・回転・色といった差分だけをGPUに渡すことで、オブジェクト数に比例して増えがちなCPU側の描画命令オーバーヘッドを削減する手法。
---

## 概要

同じ見た目のメッシュ(草の1本、弾丸の1発、群衆の1人)を何千個も描画したい場合、素朴な実装では「メッシュを描画せよ」という命令(ドローコール)をオブジェクトの数だけCPUからGPUへ発行することになる。ドローコールにはGPU側のパイプライン設定(頂点バッファのバインド、シェーダーの切り替え、ユニフォーム変数の更新など)を伴うCPU側のオーバーヘッドがあり、これがオブジェクト数に比例して積み重なると、GPU自体の処理能力は余っているのにCPUがボトルネックになって描画が遅くなる「ドローコール地獄」に陥る。GPUインスタンシング(GPU Instancing)は、この問題を「**同じメッシュ・同じマテリアルを持つオブジェクトは、頂点データを使い回して、インスタンスごとに異なる情報(ワールド変換行列・色など)だけを別のバッファとして渡す**」という発想で解決する。GPUは1回のドローコールで、渡された頂点データを、インスタンスごとの差分データを適用しながら指定した個数分だけ繰り返し描画する。CPU側から見ればドローコールは1回で済むため、オブジェクト数が数千・数万に増えてもCPU側のオーバーヘッドはほぼ一定に保たれる。

## 仕組み

1. インスタンシングしたい全オブジェクトが、**同じメッシュ(頂点・インデックスバッファ)と同じマテリアル/シェーダー**を共有していることを確認する(これが前提条件で、メッシュやシェーダーが異なると単純なインスタンシングは使えない)
2. 各インスタンスに固有のデータ(ワールド変換行列、色、UVオフセットなど)を、通常の頂点バッファとは別の「インスタンスバッファ」としてまとめてGPUメモリに転送する。1本の草なら「位置・回転・スケールをまとめた4x4行列」、群衆なら「アニメーションの再生位置」なども含めることがある
3. 頂点シェーダーの入力属性に、通常の頂点属性(位置・法線・UV)に加えて、インスタンスごとに1つだけ供給される「インスタンス属性」(ワールド変換行列など)を追加する。GPUのハードウェアインスタンシング機能を使うと、頂点ごとではなくインスタンスごとにこの属性が進む(step rate)よう指定できる
4. CPU側からは「このメッシュを、このインスタンスバッファを使って、N個分描画せよ」という**1回のドローコール(instanced draw call)**を発行するだけで済む
5. GPU内部では、頂点シェーダーがインスタンスごとにインスタンス属性(ワールド変換行列)を使って頂点をワールド空間に変換し、以降は通常の描画パイプラインと同様にラスタライズ・シェーディングが行われる。[フラスタムカリング](/algorithms/frustum-culling)と組み合わせ、視野外のインスタンスをあらかじめインスタンスバッファから除外しておくと、GPU側の負荷もさらに削減できる

## 特性・トレードオフ

- **CPU側オーバーヘッドの劇的な削減**: ドローコール数がオブジェクト数ではなく「メッシュ・マテリアルの組み合わせの数」で決まるようになるため、同種のオブジェクトが大量にあるシーン(草原、森、弾幕、群衆)で特に効果が大きい。CPU側がボトルネックになっているシーンほど恩恵が大きい
- **同一メッシュ・同一マテリアルという制約**: インスタンシングの適用条件は「メッシュとマテリアルが同じ」であることなので、見た目が微妙に異なる無数の個別オブジェクト(全く異なるメッシュを持つキャラクターなど)にはそのまま使えない。マテリアルのパラメータ(色・UVオフセットなど)をインスタンスごとの差分データとして持たせることで、同じメッシュでも見た目にバリエーションを持たせる工夫が一般的に使われる
- **GPUドリブンレンダリングへの発展**: カリングやLOD([Level of Detail](/algorithms/level-of-detail))の判定までもGPU上のコンピュートシェーダーで行い、CPUの介在なしにインスタンスバッファとドローコールの引数自体をGPU上で生成する「GPUドリブンレンダリング」「インダイレクトドローコール」という発展形もあり、数十万オブジェクト規模の描画を実現する現代のエンジンの基盤技術になっている
- **バッチングとの違い**: 似た最適化に「静的/動的バッチング」(複数の小さなメッシュを1つの大きなメッシュに事前結合する)があるが、これは頂点データそのものを複製・結合するためメモリ消費が増え、個別のオブジェクトを動かせなくなる場合がある。GPUインスタンシングは頂点データを複製せず、変換だけをインスタンスごとに変えられる点で、動くオブジェクトの大量描画に適している
- **使いどころ**: 草・木・岩などの自然物の大量配置、弾幕シューティングの弾、RTSやオープンワールドゲームの群衆・軍隊、パーティクルシステムの大量の同一形状オブジェクト、UnityのGraphics.DrawMeshInstancedやUnreal EngineのInstanced Static Meshコンポーネントなど主要ゲームエンジンの標準機能

## 実装例

インスタンスごとの変換行列をまとめたバッファを構築し、1回の「インスタンス描画呼び出し」でまとめて描画する流れを、CPU側のロジックとして簡略化して示す。

```python
import math

Mat4 = list[list[float]]

def make_transform_matrix(position: tuple[float, float, float], rotation_y: float, scale: float) -> Mat4:
    """位置・Y軸回転・一様スケールから4x4のワールド変換行列を作る。"""
    c, s = math.cos(rotation_y), math.sin(rotation_y)
    return [
        [c * scale, 0.0, s * scale, position[0]],
        [0.0, scale, 0.0, position[1]],
        [-s * scale, 0.0, c * scale, position[2]],
        [0.0, 0.0, 0.0, 1.0],
    ]

class InstanceBatch:
    """同じメッシュ・マテリアルを共有するインスタンス群。1回のドローコールに相当する単位。"""
    def __init__(self, mesh_id: str, material_id: str):
        self.mesh_id = mesh_id
        self.material_id = material_id
        self.transforms: list[Mat4] = []
        self.colors: list[tuple[float, float, float]] = []

    def add_instance(self, position, rotation_y, scale, color):
        self.transforms.append(make_transform_matrix(position, rotation_y, scale))
        self.colors.append(color)

    def draw_call_count(self) -> int:
        """インスタンシングを使う場合、インスタンス数に関わらずドローコールは常に1回。"""
        return 1 if self.transforms else 0


def build_instance_batches(objects: list[dict]) -> dict[tuple[str, str], InstanceBatch]:
    """メッシュ・マテリアルの組ごとにオブジェクトをグルーピングし、インスタンスバッチにまとめる。"""
    batches: dict[tuple[str, str], InstanceBatch] = {}
    for obj in objects:
        key = (obj["mesh_id"], obj["material_id"])
        if key not in batches:
            batches[key] = InstanceBatch(*key)
        batches[key].add_instance(obj["position"], obj["rotation_y"], obj["scale"], obj["color"])
    return batches


def total_draw_calls(batches: dict[tuple[str, str], InstanceBatch]) -> int:
    """インスタンシングなしなら total_draw_calls == オブジェクト総数になるが、
    インスタンシングありなら (メッシュ, マテリアル) の組み合わせ数だけで済む。"""
    return sum(batch.draw_call_count() for batch in batches.values())
```

```typescript
type Vec3 = [number, number, number];
type Mat4 = number[][];

function makeTransformMatrix(position: Vec3, rotationY: number, scale: number): Mat4 {
  const c = Math.cos(rotationY),
    s = Math.sin(rotationY);
  return [
    [c * scale, 0, s * scale, position[0]],
    [0, scale, 0, position[1]],
    [-s * scale, 0, c * scale, position[2]],
    [0, 0, 0, 1],
  ];
}

interface SceneObject {
  meshId: string;
  materialId: string;
  position: Vec3;
  rotationY: number;
  scale: number;
  color: Vec3;
}

class InstanceBatch {
  transforms: Mat4[] = [];
  colors: Vec3[] = [];
  constructor(
    public meshId: string,
    public materialId: string,
  ) {}

  addInstance(position: Vec3, rotationY: number, scale: number, color: Vec3): void {
    this.transforms.push(makeTransformMatrix(position, rotationY, scale));
    this.colors.push(color);
  }

  drawCallCount(): number {
    // インスタンシングを使う場合、インスタンス数に関わらずドローコールは常に1回
    return this.transforms.length > 0 ? 1 : 0;
  }
}

function buildInstanceBatches(objects: SceneObject[]): Map<string, InstanceBatch> {
  const batches = new Map<string, InstanceBatch>();
  for (const obj of objects) {
    const key = `${obj.meshId}::${obj.materialId}`;
    if (!batches.has(key)) {
      batches.set(key, new InstanceBatch(obj.meshId, obj.materialId));
    }
    batches.get(key)!.addInstance(obj.position, obj.rotationY, obj.scale, obj.color);
  }
  return batches;
}

function totalDrawCalls(batches: Map<string, InstanceBatch>): number {
  // インスタンシングなしなら合計はオブジェクト総数になるが、
  // インスタンシングありなら (メッシュ, マテリアル) の組み合わせ数だけで済む
  let total = 0;
  for (const batch of batches.values()) total += batch.drawCallCount();
  return total;
}
```
