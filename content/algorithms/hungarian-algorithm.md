---
name: ハンガリアン法(Hungarian Algorithm)
category: グラフ
subcategory: 最大流・マッチング
complexity: O(n³)(n頂点の重み付き二部グラフ)
summary: 作業員と仕事の割り当てのように、コスト(または利得)が付いた二部グラフで、総コストを最小化(または総利得を最大化)する完全マッチングを求める組合せ最適化の古典的手法。
---

## 概要

[Hopcroft-Karp法](/algorithms/hopcroft-karp)は「マッチングの本数を最大化する」二部マッチング問題を解くが、現実の割り当て問題では、各ペアに重み(コストや利得)が付いていて「本数」ではなく「総コスト・総利得」を最適化したいことが多い(N人の作業員をN個の仕事に割り当てるとき、誰をどの仕事に割り当てれば全体の作業時間が最小になるか、など)。1955年にハロルド・クーンが発表し、19世紀のハンガリーの数学者エゴルバリとケーニヒの定理にちなんで名付けられたハンガリアン法は、この「割り当て問題(assignment problem)」を多項式時間で厳密に解く、組合せ最適化の代表的なアルゴリズムである。

## 仕組み

1. `n×n`のコスト行列(行が作業員、列が仕事、各セルがそのペアのコスト)を用意する
2. **行の削減**: 各行から、その行の最小値を引く。これにより各行に少なくとも1つの0が生まれるが、総コストの相対的な大小関係は変わらない(全体に同じ値を足し引きしても最適な割り当ては変わらないという性質を利用する)
3. **列の削減**: 同様に、各列からその列の最小値を引く
4. 0の要素だけを使って、独立した(同じ行・同じ列を共有しない)0を`n`個選べるかを確認する。選べれば、その0の位置が最適な割り当てであり終了する
5. 選べない場合、最小本数の直線(行・列)で全ての0を覆い尽くす(ケーニヒの定理が示す、二部グラフの最小頂点被覆と最大マッチングの本数が一致するという双対性を利用する)。覆われていない要素の最小値を、覆われていない要素からは引き、2重に覆われた要素には足す、という調整を行い、4に戻る

## 特性・トレードオフ

- **計算量**: 効率的な実装(疑似フロー的な増加パスの考え方を使うKuhn-Munkresのアルゴリズム)で`O(n³)`。愚直な組み合わせ全探索の`O(n!)`と比べ、劇的に効率的な厳密解法になっている
- **[Hopcroft-Karp法](/algorithms/hopcroft-karp)との関係**: どちらも二部グラフのマッチング問題を扱うが、Hopcroft-Karp法は「重みなし・本数最大化」、ハンガリアン法は「重みあり・総コスト最小化(総利得最大化)」という異なる目的関数を扱う。ハンガリアン法は最大流問題としても定式化でき、[Edmonds-Karp法](/algorithms/edmonds-karp)のような最小費用流アルゴリズムの特殊ケースと見なすこともできる
- **完全マッチングの前提**: 標準的なハンガリアン法は、作業員数と仕事数が等しい(完全マッチングが存在する)ことを前提とする。数が異なる場合はダミーの行・列を追加して正方行列に揃える前処理が必要になる
- **使いどころ**: 人員配置・タスク割り当ての最適化(コールセンターのオペレーター配置、配送ドライバーとルートの割り当て)、[SIFT](/algorithms/sift)や[RANSAC](/algorithms/ransac)などで検出した特徴点同士の対応付け(マルチオブジェクトトラッキングにおけるフレーム間のID対応)、機械学習の評価指標(予測結果と正解ラベルの最適な対応付け)

## 実装例

以下は`O(n³)`のKuhn-Munkres法(ポテンシャルと最短増加路を使う定式化)による実装。行削減・列削減・0の被覆という古典的な手順と数学的に等価な操作を、効率的な形で行っている。

```python
def hungarian_algorithm(cost: list[list[float]]) -> tuple[list[int], float]:
    """n×nのコスト行列に対する最小コスト割当を求める(Kuhn-Munkres法)"""
    n = len(cost)
    INF = float("inf")
    u = [0.0] * (n + 1)
    v = [0.0] * (n + 1)
    p = [0] * (n + 1)    # p[j]: 列jに割り当てられている行(1-indexed、0は未割当)
    way = [0] * (n + 1)

    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [INF] * (n + 1)
        used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = INF
            j1 = -1
            for j in range(1, n + 1):
                if not used[j]:
                    cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j] = cur
                        way[j] = j0
                    if minv[j] < delta:
                        delta = minv[j]
                        j1 = j
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while j0:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1

    assignment = [0] * (n + 1)
    for j in range(1, n + 1):
        assignment[p[j]] = j
    row_to_col = [assignment[i] - 1 for i in range(1, n + 1)]
    total = sum(cost[i][row_to_col[i]] for i in range(n))
    return row_to_col, total


# 4人の作業員(行)を4つの仕事(列)に割り当てるコスト行列の例
cost_matrix = [
    [9, 11, 14, 11],
    [6, 15, 13, 13],
    [12, 13, 6, 8],
    [11, 9, 10, 12],
]
assignment, total_cost = hungarian_algorithm(cost_matrix)
# assignment[i] は作業員iに割り当てる仕事の番号、total_costは総コストの最小値
```

```typescript
function hungarianAlgorithm(cost: number[][]): { assignment: number[]; total: number } {
  const n = cost.length;
  const INF = Infinity;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0); // p[j]: 列jに割り当てられている行(1-indexed、0は未割当)
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    while (j0) {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    }
  }

  const assignment = new Array(n + 1).fill(0);
  for (let j = 1; j <= n; j++) assignment[p[j]] = j;
  const rowToCol = Array.from({ length: n }, (_, i) => assignment[i + 1] - 1);
  const total = rowToCol.reduce((sum, c, i) => sum + cost[i][c], 0);
  return { assignment: rowToCol, total };
}

// 4人の作業員(行)を4つの仕事(列)に割り当てるコスト行列の例
const costMatrix = [
  [9, 11, 14, 11],
  [6, 15, 13, 13],
  [12, 13, 6, 8],
  [11, 9, 10, 12],
];
const { assignment, total } = hungarianAlgorithm(costMatrix);
```

```cpp
#include <vector>
#include <limits>
#include <numeric>

struct HungarianResult {
    std::vector<int> rowToCol;
    double total;
};

HungarianResult hungarianAlgorithm(const std::vector<std::vector<double>>& cost) {
    int n = static_cast<int>(cost.size());
    const double INF = std::numeric_limits<double>::infinity();
    std::vector<double> u(n + 1, 0.0), v(n + 1, 0.0);
    std::vector<int> p(n + 1, 0), way(n + 1, 0);

    for (int i = 1; i <= n; i++) {
        p[0] = i;
        int j0 = 0;
        std::vector<double> minv(n + 1, INF);
        std::vector<bool> used(n + 1, false);
        do {
            used[j0] = true;
            int i0 = p[j0];
            double delta = INF;
            int j1 = -1;
            for (int j = 1; j <= n; j++) {
                if (!used[j]) {
                    double cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) {
                        minv[j] = cur;
                        way[j] = j0;
                    }
                    if (minv[j] < delta) {
                        delta = minv[j];
                        j1 = j;
                    }
                }
            }
            for (int j = 0; j <= n; j++) {
                if (used[j]) {
                    u[p[j]] += delta;
                    v[j] -= delta;
                } else {
                    minv[j] -= delta;
                }
            }
            j0 = j1;
        } while (p[j0] != 0);
        while (j0 != 0) {
            int j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        }
    }

    std::vector<int> assignment(n + 1, 0);
    for (int j = 1; j <= n; j++) assignment[p[j]] = j;
    std::vector<int> rowToCol(n);
    double total = 0;
    for (int i = 1; i <= n; i++) {
        rowToCol[i - 1] = assignment[i] - 1;
        total += cost[i - 1][rowToCol[i - 1]];
    }
    return {rowToCol, total};
}

// 4人の作業員(行)を4つの仕事(列)に割り当てるコスト行列の例
// std::vector<std::vector<double>> costMatrix = {
//     {9, 11, 14, 11}, {6, 15, 13, 13}, {12, 13, 6, 8}, {11, 9, 10, 12}
// };
// auto result = hungarianAlgorithm(costMatrix);
```

```rust
fn hungarian_algorithm(cost: &[Vec<f64>]) -> (Vec<usize>, f64) {
    let n = cost.len();
    const INF: f64 = f64::INFINITY;
    let mut u = vec![0.0; n + 1];
    let mut v = vec![0.0; n + 1];
    let mut p = vec![0usize; n + 1]; // p[j]: 列jに割り当てられている行(1-indexed、0は未割当)
    let mut way = vec![0usize; n + 1];

    for i in 1..=n {
        p[0] = i;
        let mut j0 = 0usize;
        let mut minv = vec![INF; n + 1];
        let mut used = vec![false; n + 1];
        loop {
            used[j0] = true;
            let i0 = p[j0];
            let mut delta = INF;
            let mut j1 = 0usize;
            for j in 1..=n {
                if !used[j] {
                    let cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if cur < minv[j] {
                        minv[j] = cur;
                        way[j] = j0;
                    }
                    if minv[j] < delta {
                        delta = minv[j];
                        j1 = j;
                    }
                }
            }
            for j in 0..=n {
                if used[j] {
                    u[p[j]] += delta;
                    v[j] -= delta;
                } else {
                    minv[j] -= delta;
                }
            }
            j0 = j1;
            if p[j0] == 0 {
                break;
            }
        }
        while j0 != 0 {
            let j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        }
    }

    let mut assignment = vec![0usize; n + 1];
    for j in 1..=n {
        assignment[p[j]] = j;
    }
    let row_to_col: Vec<usize> = (1..=n).map(|i| assignment[i] - 1).collect();
    let total: f64 = (0..n).map(|i| cost[i][row_to_col[i]]).sum();
    (row_to_col, total)
}

// 4人の作業員(行)を4つの仕事(列)に割り当てるコスト行列の例
// let cost_matrix = vec![
//     vec![9.0, 11.0, 14.0, 11.0],
//     vec![6.0, 15.0, 13.0, 13.0],
//     vec![12.0, 13.0, 6.0, 8.0],
//     vec![11.0, 9.0, 10.0, 12.0],
// ];
// let (assignment, total) = hungarian_algorithm(&cost_matrix);
```

```csharp
static (int[] RowToCol, double Total) HungarianAlgorithm(double[][] cost)
{
    int n = cost.Length;
    double INF = double.PositiveInfinity;
    var u = new double[n + 1];
    var v = new double[n + 1];
    var p = new int[n + 1];   // p[j]: 列jに割り当てられている行(1-indexed、0は未割当)
    var way = new int[n + 1];

    for (int i = 1; i <= n; i++)
    {
        p[0] = i;
        int j0 = 0;
        var minv = new double[n + 1];
        var used = new bool[n + 1];
        for (int k = 0; k <= n; k++) minv[k] = INF;

        do
        {
            used[j0] = true;
            int i0 = p[j0];
            double delta = INF;
            int j1 = -1;
            for (int j = 1; j <= n; j++)
            {
                if (!used[j])
                {
                    double cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
                    if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                }
            }
            for (int j = 0; j <= n; j++)
            {
                if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                else { minv[j] -= delta; }
            }
            j0 = j1;
        } while (p[j0] != 0);

        while (j0 != 0)
        {
            int j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        }
    }

    var assignment = new int[n + 1];
    for (int j = 1; j <= n; j++) assignment[p[j]] = j;
    var rowToCol = new int[n];
    double total = 0;
    for (int i = 1; i <= n; i++)
    {
        rowToCol[i - 1] = assignment[i] - 1;
        total += cost[i - 1][rowToCol[i - 1]];
    }
    return (rowToCol, total);
}

// 4人の作業員(行)を4つの仕事(列)に割り当てるコスト行列の例
// double[][] costMatrix = {
//     new double[] {9, 11, 14, 11}, new double[] {6, 15, 13, 13},
//     new double[] {12, 13, 6, 8}, new double[] {11, 9, 10, 12}
// };
// var (assignment, total) = HungarianAlgorithm(costMatrix);
```
