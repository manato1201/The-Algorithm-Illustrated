---
name: Zバッファ(深度バッファ)
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(ポリゴンの画素数の合計)(各画素で深度の比較1回)、メモリは画素数に比例
summary: 画面の各ピクセルに「いま描かれているものの奥行き」を覚えておき、新しく描くものがより手前のときだけ上書きする。描く順序に関係なく、正しい前後関係の隠面消去が得られる。
---

## 概要

3Dの物体を画面に描くとき、手前の物体が奥の物体を隠さなければならない(隠面消去)。初期の方法は、物体を奥から手前の順に並べて塗り重ねる**画家のアルゴリズム**だった。しかし、互いに食い込む物体や、循環して重なる物体(AがBの前、BがCの前、CがAの前)では、どう並べても正しくならない。しかも、描画のたびに全ポリゴンを奥行きで並べ替える必要がある。

エドウィン・キャットマル(Edwin Catmull)は、1974年のユタ大学の博士論文で、**ピクセルごとに奥行きを記録する**という発想を示した(ヴォルフガング・シュトラッサーも同時期に独立に類似の方法を考案している)。各ピクセルについて、これまで描かれたものの深度(カメラからの距離に相当する値)を専用のメモリ(Zバッファ)に保持し、新しいポリゴンのピクセルがより手前(深度が小さい)なら色と深度を更新、そうでなければ捨てる。ポリゴンの描画順に依存せず、並べ替えも不要で、ハードウェアで実装しやすい。現在のほぼすべてのGPUが、この方式を標準の機能として持っている。

## 仕組み

1. **初期化**: 画面と同じ大きさの2つの配列を用意する。色バッファ(背景色で初期化)と、深度バッファ(最も遠い値、たとえば `+∞` や 1.0 で初期化)
2. **ラスタライズ**: 各ポリゴン(三角形)について、画面上で覆うピクセルを求める。各ピクセル `(x, y)` で、三角形の3頂点の深度を、**重心座標**で補間して深度 `z` を得る(画面上で線形に補間できる値は、射影後の `1/w` やNDCの深度など)
3. **深度テスト**: `z < depth[x][y]` なら(より手前なら)、`depth[x][y] = z` に更新し、そのピクセルの色を書き込む。そうでなければ何もしない
4. すべてのポリゴンを処理し終えると、色バッファが完成した画像になる

深度の補間は、画面空間では `1/z` が線形に変化する(透視投影のため)ので、実装では、深度そのものではなく、その逆数や、射影後の深度値を補間する。

## 特性・トレードオフ

- **描画順に依存しない**: 並べ替え不要。互いに貫通する物体、循環する重なりも正しく処理できる
- **メモリを食う**: 画面の画素数分の深度値を保持する。解像度が高い(4K)と、バッファも大きい。MSAAなどのアンチエイリアスでは、サブサンプルごとに必要
- **深度の精度**: 深度値は有限のビット数(16〜32ビット)で、遠くになるほど分解能が粗くなる(近い面を細かく、遠い面を粗く表現する)。遠くで2つの面が近いと、どちらが手前か決められず、ちらつく**Zファイティング**が起きる。対策に、近平面を遠ざける、逆Z(1.0を近、0を遠にする浮動小数点の深度)、対数深度などがある
- **半透明に弱い**: 深度テストは「最も手前」を残すだけなので、半透明の物体は、奥から手前の順に混ぜる必要がある(並べ替えが必要)。不透明を先に描いてから、半透明を後から並べ替えて描くのが定石
- **オーバードロー**: 奥にあるものを先に描くと、後で上書きされて無駄になる。手前から描く(前から後ろの順)と、深度テストで早期に捨てられ、速くなる(early-Z)
- **使いどころ**: ほぼすべてのリアルタイム3Dレンダリング(ゲーム、CAD、可視化)。影の生成(シャドウマップ)にも、同じ深度バッファの仕組みが使われる

## 実装例

```python
def edge(a, b, p):
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])


def render(width, height, triangles):
    """triangles: [(頂点3つ [(x, y, z), ...], 文字)]。z が小さいほど手前。"""
    color = [["." for _ in range(width)] for _ in range(height)]
    depth = [[float("inf")] * width for _ in range(height)]
    for (v0, v1, v2), ch in triangles:
        area = edge(v0, v1, v2)
        if area == 0:
            continue
        for y in range(height):
            for x in range(width):
                p = (x + 0.5, y + 0.5)                       # ピクセルの中心
                w0, w1, w2 = edge(v1, v2, p) / area, edge(v2, v0, p) / area, edge(v0, v1, p) / area
                if w0 < 0 or w1 < 0 or w2 < 0:
                    continue                                  # 三角形の外
                z = w0 * v0[2] + w1 * v1[2] + w2 * v2[2]      # 重心座標で深度を補間
                if z < depth[y][x]:                           # 深度テスト
                    depth[y][x] = z
                    color[y][x] = ch
    return ["".join(row) for row in color]


far = ((0, 0, 0.9), (12, 0, 0.9), (0, 12, 0.9))       # 奥の大きな三角形 'A'
near = ((4, 3, 0.2), (12, 3, 0.2), (8, 11, 0.2))      # 手前の三角形 'B'
for row in render(12, 12, [(far, "A"), (near, "B")]):  # 描く順序を逆にしても、結果は同じ
    print(row)
print(render(12, 12, [(far, "A"), (near, "B")]) == render(12, 12, [(near, "B"), (far, "A")]))  # True
```

```typescript
type V3 = [number, number, number];

const edge = (a: V3, b: V3, p: [number, number]): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function render(width: number, height: number, triangles: [[V3, V3, V3], string][]): string[] {
  const color = Array.from({ length: height }, () => new Array<string>(width).fill("."));
  const depth = Array.from({ length: height }, () => new Array<number>(width).fill(Infinity));
  for (const [[v0, v1, v2], ch] of triangles) {
    const area = edge(v0, v1, v2);
    if (area === 0) continue;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p: [number, number] = [x + 0.5, y + 0.5];
        const w0 = edge(v1, v2, p) / area;
        const w1 = edge(v2, v0, p) / area;
        const w2 = edge(v0, v1, p) / area;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * v0[2] + w1 * v1[2] + w2 * v2[2];
        if (z < depth[y][x]) {
          depth[y][x] = z;
          color[y][x] = ch;
        }
      }
    }
  }
  return color.map((row) => row.join(""));
}

const far: [V3, V3, V3] = [[0, 0, 0.9], [12, 0, 0.9], [0, 12, 0.9]];
const near: [V3, V3, V3] = [[4, 3, 0.2], [12, 3, 0.2], [8, 11, 0.2]];
const a = render(12, 12, [[far, "A"], [near, "B"]]);
const b = render(12, 12, [[near, "B"], [far, "A"]]);
console.log(a.join("\n"));
console.log(JSON.stringify(a) === JSON.stringify(b)); // true: 描く順序に依存しない
```
