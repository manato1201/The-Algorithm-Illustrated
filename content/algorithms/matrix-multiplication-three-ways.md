---
name: 行列の掛け算:逐次・並列・回路固定の3方式
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: 演算 O(n³)(方式で変わるのはステップ数とデータ移動量)
summary: 同じ行列の掛け算を、逐次・並列・回路固定の3方式で同時に進め、かかるステップ数とデータの読み出し量の違いを比べる。
---

## 概要

行列の掛け算 C = A×B は、画像処理やニューラルネットワークの計算の大半を占める基本演算です。計算そのものは一つ(n×nなら積がn³回)ですが、**どう実行するか**で「何ステップで終わるか」「演算器がいくつ要るか」「メモリからどれだけデータを動かすか」が大きく変わります。

この項目は、同じ計算を3つの方式で並べて比べるための題材です。

- **逐次**: 演算器が1個で、積を1回ずつ順に計算する。
- **並列**: 演算器をn²個並べ、出力の各セルをそれぞれが同時に計算する。
- **回路固定**: 掛け合わせる行列Bの値を回路に「固定」してしまい、行列Aを1行ずつ流し込む。AI向けの専用回路(NPUなど)で使われる考え方です。

生まれた目的は、行列積という頻出の計算を「速く」だけでなく「データを動かす量を減らして」実行することにあります。

## 仕組み

3×3の例では、C[i][j] = Σ A[i][k]·B[k][j](kは0〜2)で、積は全部で27回です。

1. **逐次**: 1ステップに積を1回。27ステップかかる。毎回、AとBの値を1つずつ読むので、読み出しは54回。
2. **並列**: 9個の演算器が、それぞれ1つのC[i][j]を担当する。1ステップに全員が1つずつ積を足すので、3ステップで終わる。ただし各演算器が毎回AとBの値を読むので、読み出しは逐次と同じ54回のまま。
3. **回路固定**: 最初の1ステップでBの9個の値を回路に固定する(以後は読み直さない)。次にAを1行ずつ流すと、1ステップでCの1行が出る。準備の1ステップ+3行で4ステップ。読み出しはBの9回+Aの9回で18回。

つまり、ステップ数は並列(3)が最短、回路固定(4)はそれに近く、逐次(27)が最長です。一方、データの読み出しは回路固定が最も少なくなります。

## 特性・トレードオフ

- **計算量**: 乗加算の回数はどの方式でもn³で変わらない。変わるのは、終わるまでのステップ数、必要な演算器の数、データの移動量の3つ。
- **並列は速いが、データ移動は減らない**: 演算器の数だけ速くなるが、同じ値をメモリから何度も読む。読み出しの量は逐次と同じ。
- **回路固定は読み出しが少ない代わりに融通が利かない**: 固定した行列B専用の回路になるため、Bが変わるたびに設定し直す必要がある。準備に1ステップかかる。
- **電力の目安について**: データの移動は計算そのものより電力を食いやすい、という一般的な傾向にもとづき、この図鑑ではメモリ読み出し量を「電力の目安」として丸の数で示している。これは定性的な目安であり、実測値ではない。
- **一般化しすぎない**: 専用回路の作りは製品ごとに異なる。ここで示すのは考え方を説明する簡略モデルで、特定の製品の動作そのものではない。
- **使いどころ**: GPUやNPUがなぜ行列積に強いのかの理解、ニューラルネットワークの推論の高速化、並列化で何が減り何が減らないかを見極める練習。

## 実装例

```python
def matmul_sequential(a: list[list[int]], b: list[list[int]]) -> tuple[list[list[int]], int, int]:
    n = len(a)
    c = [[0] * n for _ in range(n)]
    steps = reads = 0
    for i in range(n):
        for j in range(n):
            for k in range(n):
                c[i][j] += a[i][k] * b[k][j]
                steps += 1  # 演算器1個: 1ステップに積1回
                reads += 2  # aとbの値を1つずつ読む
    return c, steps, reads


def matmul_parallel(a: list[list[int]], b: list[list[int]]) -> tuple[list[list[int]], int, int]:
    n = len(a)
    c = [[0] * n for _ in range(n)]
    steps = reads = 0
    for k in range(n):  # 1ステップで n*n 個の演算器が同時に動く
        for i in range(n):
            for j in range(n):
                c[i][j] += a[i][k] * b[k][j]
                reads += 2
        steps += 1
    return c, steps, reads


def matmul_fixed(a: list[list[int]], b: list[list[int]]) -> tuple[list[list[int]], int, int]:
    n = len(a)
    steps = 1  # Bを回路に固定する準備
    reads = n * n  # Bは一度だけ読む
    c: list[list[int]] = []
    for i in range(n):  # Aを1行ずつ流し込む
        c.append([sum(a[i][k] * b[k][j] for k in range(n)) for j in range(n)])
        steps += 1
        reads += n  # Aの1行(n個)だけを読む
    return c, steps, reads


# 3x3 の例: 逐次 (27ステップ, 読み出し54)、並列 (3ステップ, 読み出し54)、回路固定 (4ステップ, 読み出し18)
```

```typescript
type Result = { c: number[][]; steps: number; reads: number };

function matmulSequential(a: number[][], b: number[][]): Result {
  const n = a.length;
  const c = Array.from({ length: n }, () => Array<number>(n).fill(0));
  let steps = 0;
  let reads = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        c[i][j] += a[i][k] * b[k][j];
        steps += 1; // 演算器1個: 1ステップに積1回
        reads += 2; // aとbの値を1つずつ読む
      }
    }
  }
  return { c, steps, reads };
}

function matmulParallel(a: number[][], b: number[][]): Result {
  const n = a.length;
  const c = Array.from({ length: n }, () => Array<number>(n).fill(0));
  let steps = 0;
  let reads = 0;
  for (let k = 0; k < n; k++) {
    // 1ステップで n*n 個の演算器が同時に動く
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        c[i][j] += a[i][k] * b[k][j];
        reads += 2;
      }
    }
    steps += 1;
  }
  return { c, steps, reads };
}

function matmulFixed(a: number[][], b: number[][]): Result {
  const n = a.length;
  let steps = 1; // Bを回路に固定する準備
  let reads = n * n; // Bは一度だけ読む
  const c: number[][] = [];
  for (let i = 0; i < n; i++) {
    // Aを1行ずつ流し込む
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[i][k] * b[k][j];
      row.push(sum);
    }
    c.push(row);
    steps += 1;
    reads += n; // Aの1行(n個)だけを読む
  }
  return { c, steps, reads };
}
```
