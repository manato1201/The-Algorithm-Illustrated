---
name: 並列プレフィックス和(Parallel Scan)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(n)(処理量、work)、O(log n)(並列実行時間、span、十分なプロセッサ数の場合)
summary: 一見すると各要素が前の結果に依存する逐次的な計算に見える累積和を、アップスイープ・ダウンスイープという2段階の木構造の走査で並列化する巧妙な並列計算パターン。
---

## 概要

配列`[3, 1, 4, 1, 5]`の累積和`[3, 4, 8, 9, 14]`(プレフィックス和)を計算する処理は、一見すると「各要素の結果が直前の結果に依存する」ため本質的に逐次的にしか計算できないように見える(`sum[i] = sum[i-1] + a[i]`)。しかし1980年にダニエル・ヒリスとガイ・スティールが発表した並列スキャンアルゴリズムは、この直感に反して、`O(n)`個のプロセッサがあれば`O(log n)`という対数時間でプレフィックス和を計算できることを示した。この技法は、単なる和の計算に留まらず、[並列マージソート](/algorithms/parallel-merge-sort)や[MapReduce](/algorithms/mapreduce)のような、より複雑な並列アルゴリズムを構築するための基本部品として広く使われている。

## 仕組み

1. `n`要素の配列を、まるで二分木の葉として捉える(`n`が2のべき乗であることを仮定するとわかりやすい)
2. **アップスイープ(Reduce)フェーズ**: 木の葉から根へ向かって、隣接するペアの和を計算し、1つ上の階層に格納していく。各階層での計算は互いに独立しているため、並列に実行できる。これを`log n`階層繰り返すと、根の位置に配列全体の合計が得られる(これは通常の並列リダクションと同じ処理)
3. **ダウンスイープ(Distribute)フェーズ**: 根から葉へ向かって逆に降りていく。各ノードは、アップスイープで記録しておいた「自分の左の子の部分和」の情報を使い、「自分より左側にある全要素の合計(排他的プレフィックス和)」を子ノードへ伝播させていく——具体的には、左の子には親から受け取った値をそのまま渡し、右の子には「親から受け取った値+左の子の部分和」を渡す
4. ダウンスイープが葉まで到達すると、各葉(元の配列の各要素の位置)に、その要素より前の全要素の合計(排他的プレフィックス和)が格納されている。これに元の要素自身を足せば、通常の(包含的)プレフィックス和が得られる

## 特性・トレードオフ

- **計算量**: 全プロセッサが行う処理の総量(work)は`O(n)`(逐次アルゴリズムと同じオーダー)だが、十分な数のプロセッサを使える場合の実行時間(span、並列度に関する計算量)は、木の深さに対応する`O(log n)`に短縮される——「仕事の総量は変わらないが、並列に処理することで壁時計上の時間が短縮される」という並列アルゴリズムの典型的な効果を示す好例
- **[積分画像](/algorithms/integral-image)との関係**: 1次元のプレフィックス和を並列化するこの技法は、2次元の[積分画像](/algorithms/integral-image)のような、より高次元の累積和構造の並列計算にも自然に拡張できる
- **メモリアクセスパターンの重要性**: 実際のGPU・マルチコアCPU上での性能は、理論上の計算量だけでなく、各プロセッサがどのメモリ位置にアクセスするか(バンクコンフリクトの回避など)にも大きく左右される——理論的に並列化可能であることと、実際のハードウェアで高速に動くことの間にはギャップがあり、実装上の工夫が重要になる
- **使いどころ**: GPUプログラミング(CUDA、compute shader)における基本的な並列プリミティブ、[並列マージソート](/algorithms/parallel-merge-sort)やクイックソートの並列版におけるパーティション位置の計算、ストリーム圧縮(条件を満たす要素だけを詰めて並べ直す処理)、基数ソートの並列実装

## 実装例

Blelloch方式のアップスイープ・ダウンスイープを、配列を2のべき乗長にパディングした上で逐次シミュレーションする。実際の並列実行では各階層内のループが完全に独立して並列実行できる。得られた排他的プレフィックス和が、素朴な逐次累積和と一致することを検証する。

```python
def next_pow2(n: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return p


def parallel_prefix_sum(arr: list[int]) -> tuple[list[int], int]:
    n = len(arr)
    size = next_pow2(n)
    a = arr + [0] * (size - n)

    # アップスイープ(Reduce)フェーズ: 各階層は並列実行可能
    d = 1
    while d < size:
        i = 0
        while i < size:
            a[i + 2 * d - 1] += a[i + d - 1]
            i += 2 * d
        d *= 2

    total = a[size - 1]
    a[size - 1] = 0

    # ダウンスイープ(Distribute)フェーズ: 根から葉へ排他的プレフィックス和を伝播
    d = size // 2
    while d >= 1:
        i = 0
        while i < size:
            left_child, right_child = i + d - 1, i + 2 * d - 1
            t = a[left_child]
            a[left_child] = a[right_child]
            a[right_child] += t
            i += 2 * d
        d //= 2

    return a[:n], total  # a[:n]が排他的プレフィックス和、totalが全体の合計
```

```typescript
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function parallelPrefixSum(arr: number[]): { exclusive: number[]; total: number } {
  const n = arr.length;
  const size = nextPow2(n);
  const a = [...arr, ...new Array(size - n).fill(0)];

  // アップスイープ(Reduce)フェーズ: 各階層は並列実行可能
  for (let d = 1; d < size; d *= 2) {
    for (let i = 0; i < size; i += 2 * d) {
      a[i + 2 * d - 1] += a[i + d - 1];
    }
  }

  const total = a[size - 1];
  a[size - 1] = 0;

  // ダウンスイープ(Distribute)フェーズ: 根から葉へ排他的プレフィックス和を伝播
  for (let d = size / 2; d >= 1; d /= 2) {
    for (let i = 0; i < size; i += 2 * d) {
      const leftChild = i + d - 1;
      const rightChild = i + 2 * d - 1;
      const t = a[leftChild];
      a[leftChild] = a[rightChild];
      a[rightChild] += t;
    }
  }

  return { exclusive: a.slice(0, n), total };
}
```

```cpp
#include <vector>

int nextPow2(int n) {
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

std::pair<std::vector<int>, int> parallelPrefixSum(const std::vector<int>& arr) {
    int n = static_cast<int>(arr.size());
    int size = nextPow2(n);
    std::vector<int> a(size, 0);
    for (int i = 0; i < n; i++) a[i] = arr[i];

    // アップスイープ(Reduce)フェーズ: 各階層は並列実行可能
    for (int d = 1; d < size; d *= 2) {
        for (int i = 0; i < size; i += 2 * d) {
            a[i + 2 * d - 1] += a[i + d - 1];
        }
    }

    int total = a[size - 1];
    a[size - 1] = 0;

    // ダウンスイープ(Distribute)フェーズ: 根から葉へ排他的プレフィックス和を伝播
    for (int d = size / 2; d >= 1; d /= 2) {
        for (int i = 0; i < size; i += 2 * d) {
            int leftChild = i + d - 1;
            int rightChild = i + 2 * d - 1;
            int t = a[leftChild];
            a[leftChild] = a[rightChild];
            a[rightChild] += t;
        }
    }

    std::vector<int> exclusive(a.begin(), a.begin() + n);
    return {exclusive, total};
}
```

```rust
fn next_pow2(n: usize) -> usize {
    let mut p = 1;
    while p < n {
        p *= 2;
    }
    p
}

fn parallel_prefix_sum(arr: &[i32]) -> (Vec<i32>, i32) {
    let n = arr.len();
    let size = next_pow2(n);
    let mut a = vec![0; size];
    a[..n].copy_from_slice(arr);

    // アップスイープ(Reduce)フェーズ: 各階層は並列実行可能
    let mut d = 1;
    while d < size {
        let mut i = 0;
        while i < size {
            a[i + 2 * d - 1] += a[i + d - 1];
            i += 2 * d;
        }
        d *= 2;
    }

    let total = a[size - 1];
    a[size - 1] = 0;

    // ダウンスイープ(Distribute)フェーズ: 根から葉へ排他的プレフィックス和を伝播
    let mut d = size / 2;
    while d >= 1 {
        let mut i = 0;
        while i < size {
            let (left_child, right_child) = (i + d - 1, i + 2 * d - 1);
            let t = a[left_child];
            a[left_child] = a[right_child];
            a[right_child] += t;
            i += 2 * d;
        }
        d /= 2;
    }

    a.truncate(n);
    (a, total)
}
```

```csharp
static int NextPow2(int n)
{
    int p = 1;
    while (p < n) p *= 2;
    return p;
}

static (int[] Exclusive, int Total) ParallelPrefixSum(int[] arr)
{
    int n = arr.Length;
    int size = NextPow2(n);
    var a = new int[size];
    Array.Copy(arr, a, n);

    // アップスイープ(Reduce)フェーズ: 各階層は並列実行可能
    for (int d = 1; d < size; d *= 2)
        for (int i = 0; i < size; i += 2 * d)
            a[i + 2 * d - 1] += a[i + d - 1];

    int total = a[size - 1];
    a[size - 1] = 0;

    // ダウンスイープ(Distribute)フェーズ: 根から葉へ排他的プレフィックス和を伝播
    for (int d = size / 2; d >= 1; d /= 2)
    {
        for (int i = 0; i < size; i += 2 * d)
        {
            int leftChild = i + d - 1, rightChild = i + 2 * d - 1;
            int t = a[leftChild];
            a[leftChild] = a[rightChild];
            a[rightChild] += t;
        }
    }

    return (a.Take(n).ToArray(), total);
}
```
