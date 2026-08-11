---
name: 切除平面法(Cutting Plane Method)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(反復回数 × 線形計画法1回分のコスト)
summary: 整数解を要求する問題を、まず整数制約を無視した緩和問題として解き、得られた非整数解を「切り落とす」新しい制約(切除平面)を追加しながら反復することで、線形計画法だけを道具に整数計画問題の厳密解へ迫る。
---

## 概要

[分枝限定法](/algorithms/branch-and-bound)は整数計画問題を「変数を分岐させて場合分けする」ことで解くが、切除平面法は全く異なるアプローチを取る——**整数であるという制約を一旦無視して、通常の(実数解を許す)線形計画問題として解き**、得られた最適解が整数条件を満たしていなければ、その**非整数解だけを除外し、真の整数最適解は依然として含むような新しい制約(切除平面、カット)を追加**して、再び線形計画問題を解き直す。この「解いて、切って、また解く」を繰り返すことで、実行可能領域が徐々に整数計画問題の凸包(整数点だけを頂点とする多面体)に近づいていき、最終的に線形計画法の最適解がそのまま整数解になる。ラルフ・ゴモリーが1958年に提案したゴモリー切除平面が代表的な手法で、現代の商用整数計画ソルバーの中核技術の一つになっている。

## 仕組み

1. 整数計画問題から整数制約を取り除いた**線形緩和問題**を、[シンプレックス法](/algorithms/simplex-method)などの線形計画法で解く
2. 得られた最適解が全ての変数について整数値になっていれば、それがそのまま元の整数計画問題の最適解でもあるため終了する
3. 整数値になっていない変数(分数解)があれば、その分数解を基にした**ゴモリー切除平面**を導出する。これは、シンプレックス法の最終的な単体表(タブロー)の情報から機械的に構成できる、「今の分数解は満たさないが、あらゆる整数実行可能解は必ず満たす」という性質を持つ新しい不等式制約である
4. 導出した切除平面を線形計画問題の制約に追加し、実行可能領域を(整数解を1つも取りこぼすことなく)少しだけ狭める
5. 狭めた制約のもとで再び線形計画問題を解き直し、2〜4を、整数解が得られるまで繰り返す

## 特性・トレードオフ

- **線形計画法という強力な道具だけで整数計画を解ける**: 切除平面法は、整数計画問題を解くために本質的に必要なのは「線形計画法を繰り返し呼び出すこと」と「切除平面を導出すること」だけであり、[分枝限定法](/algorithms/branch-and-bound)のような探索木の管理を必要としない。この単純さから、理論的な整数計画法の基礎として重要視される
- **収束の遅さという実務上の課題**: 基本形のゴモリー切除平面法は、理論上は有限回の反復で収束することが保証されているものの、実際には非常に多くの反復を要することがあり、単体では実務的な速度に欠けることが多い。このため現代のソルバーでは、切除平面法単体ではなく、[分枝限定法](/algorithms/branch-and-bound)と組み合わせた「分枝カット法(Branch and Cut)」として、探索木の各ノードで有効な切除平面を追加しながら分枝を進める、より実用的なハイブリッド手法が主流になっている
- **切除平面の「強さ」という設計上の指標**: どんな切除平面を選ぶかによって、実行可能領域をどれだけ効率的に整数解の凸包に近づけられるかが変わる。ゴモリー切除平面以外にも、問題の構造に応じたより強力な切除平面(カバー不等式、フローカバー不等式など)が研究されており、切除平面の選び方自体が整数計画法の研究テーマの一つになっている
- **使いどころ**: 生産計画・スケジューリングにおける整数計画問題、商用最適化ソルバー(CPLEX、Gurobiなど)の内部アルゴリズムの構成要素、[分枝限定法](/algorithms/branch-and-bound)と組み合わせた分枝カット法による大規模組合せ最適化、ネットワークフロー・施設配置問題のような整数制約を持つ実務的な最適化問題

## 実装例

簡略化した1次元的なゴモリー切除の考え方(分数部分を使った新しい制約の生成)を示す。実際のゴモリー切除は単体表全体から導出されるため、ここではその核となる数式の適用部分を抜き出す。

```python
import math

def gomory_cut_from_row(tableau_row: list[float], rhs: float) -> tuple[list[float], float]:
    """単体表の1行(分数解を持つ基底変数の行)からゴモリー切除の係数を導出する。"""
    frac_rhs = rhs - math.floor(rhs)
    cut_coeffs = [-(coef - math.floor(coef)) for coef in tableau_row]
    cut_rhs = -frac_rhs
    return cut_coeffs, cut_rhs

def is_integer_solution(solution: list[float], tolerance: float = 1e-6) -> bool:
    return all(abs(x - round(x)) < tolerance for x in solution)

def find_fractional_variable(solution: list[float], tolerance: float = 1e-6) -> int | None:
    for i, x in enumerate(solution):
        if abs(x - round(x)) >= tolerance:
            return i
    return None
```

```typescript
function gomoryCutFromRow(tableauRow: number[], rhs: number): { cutCoeffs: number[]; cutRhs: number } {
  const fracRhs = rhs - Math.floor(rhs);
  const cutCoeffs = tableauRow.map((coef) => -(coef - Math.floor(coef)));
  const cutRhs = -fracRhs;
  return { cutCoeffs, cutRhs };
}

function isIntegerSolution(solution: number[], tolerance = 1e-6): boolean {
  return solution.every((x) => Math.abs(x - Math.round(x)) < tolerance);
}

function findFractionalVariable(solution: number[], tolerance = 1e-6): number | null {
  const idx = solution.findIndex((x) => Math.abs(x - Math.round(x)) >= tolerance);
  return idx === -1 ? null : idx;
}
```

```cpp
#include <vector>
#include <cmath>
#include <optional>

std::pair<std::vector<double>, double> gomoryCutFromRow(const std::vector<double>& tableauRow, double rhs) {
    double fracRhs = rhs - std::floor(rhs);
    std::vector<double> cutCoeffs;
    for (double coef : tableauRow) cutCoeffs.push_back(-(coef - std::floor(coef)));
    double cutRhs = -fracRhs;
    return {cutCoeffs, cutRhs};
}

bool isIntegerSolution(const std::vector<double>& solution, double tolerance = 1e-6) {
    for (double x : solution) if (std::abs(x - std::round(x)) >= tolerance) return false;
    return true;
}

std::optional<int> findFractionalVariable(const std::vector<double>& solution, double tolerance = 1e-6) {
    for (size_t i = 0; i < solution.size(); i++) {
        if (std::abs(solution[i] - std::round(solution[i])) >= tolerance) return static_cast<int>(i);
    }
    return std::nullopt;
}
```

```rust
fn gomory_cut_from_row(tableau_row: &[f64], rhs: f64) -> (Vec<f64>, f64) {
    let frac_rhs = rhs - rhs.floor();
    let cut_coeffs: Vec<f64> = tableau_row.iter().map(|&coef| -(coef - coef.floor())).collect();
    let cut_rhs = -frac_rhs;
    (cut_coeffs, cut_rhs)
}

fn is_integer_solution(solution: &[f64], tolerance: f64) -> bool {
    solution.iter().all(|&x| (x - x.round()).abs() < tolerance)
}

fn find_fractional_variable(solution: &[f64], tolerance: f64) -> Option<usize> {
    solution.iter().position(|&x| (x - x.round()).abs() >= tolerance)
}
```

```csharp
static (double[] cutCoeffs, double cutRhs) GomoryCutFromRow(double[] tableauRow, double rhs)
{
    double fracRhs = rhs - Math.Floor(rhs);
    var cutCoeffs = tableauRow.Select(coef => -(coef - Math.Floor(coef))).ToArray();
    double cutRhs = -fracRhs;
    return (cutCoeffs, cutRhs);
}

static bool IsIntegerSolution(double[] solution, double tolerance = 1e-6)
{
    return solution.All(x => Math.Abs(x - Math.Round(x)) < tolerance);
}

static int? FindFractionalVariable(double[] solution, double tolerance = 1e-6)
{
    for (int i = 0; i < solution.Length; i++)
    {
        if (Math.Abs(solution[i] - Math.Round(solution[i])) >= tolerance) return i;
    }
    return null;
}
```
