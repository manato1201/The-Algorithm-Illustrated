---
name: HPモデルによるタンパク質構造予測
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(3^n)(素朴な全探索、nはアミノ酸残基数)、実務ではヒューリスティック探索や動的計画法の近似手法を併用
summary: タンパク質を構成する20種のアミノ酸を「疎水性(H)」と「親水性(P)」の2種類だけに単純化し、格子上での折り畳み方の中から疎水性残基同士が最も多く隣接する(=水を避けて内側に集まる)配置を探す、タンパク質の立体構造予測を学ぶための単純化モデル。
---

## 概要

実際のタンパク質の立体構造予測([AlphaFold](/algorithms/backpropagation)のような深層学習モデルが到達点)は極めて複雑な問題だが、その本質的な駆動力の1つ——疎水性のアミノ酸が水分子を避けてタンパク質の内側に集まろうとする「疎水効果」——を理解するために、1985年にケン・ディル(Dill)が提案したHPモデル(Hydrophobic-Polar model)は、20種類のアミノ酸を「疎水性(H)」と「親水性(P)」のたった2種類に単純化する。この大胆な単純化のもとで、「2次元格子上でアミノ酸の鎖(HとPの並び)をどう折り畳めば、H同士が最も多く隣接する(=最もエネルギー的に安定な)配置になるか」を探す組み合わせ最適化問題として、タンパク質folding問題の本質的な難しさ(NP困難性を含む)を単純化された形で学べる、計算生物学の教育・研究の両面で使われるモデルである。

## 仕組み

1. タンパク質のアミノ酸配列を、疎水性(H)・親水性(P)の2文字だけからなる文字列(例えば"HPHPPHHPHH")として表現する
2. この文字列を2次元(または3次元)の格子上に、自己交差しない経路(連続するアミノ酸は格子上で隣接するマスに配置され、同じマスを2回通らない)として配置する——1つの配列に対して指数的に多くの折り畳み方(配置パターン)が存在する
3. ある配置におけるエネルギー(安定度)を、「配列上で連続していないが、格子上で偶然隣接しているH同士のペアの数」として定義する(このようなH-H接触が多いほどエネルギーが低く、安定な構造とみなす)
4. 可能な全ての自己回避経路の中から、このエネルギーを最小化する(H-H接触数を最大化する)配置を探索する——これは配列の長さが増えると計算量が指数的に爆発するNP困難な組み合わせ最適化問題であることが証明されている
5. 実務・研究では、全探索の代わりに[焼きなまし法](/algorithms/simulated-annealing)や[遺伝的アルゴリズム](/algorithms/genetic-algorithm)のようなメタヒューリスティックを使って、最適または準最適な折り畳み配置を探索する

## 特性・トレードオフ

- **計算量**: 素朴な全探索は格子上の経路数に応じて指数的に増加し(`n`残基でおおよそ`O(3^n)`程度、格子上で毎回3方向のいずれかへ進む選択肢がある)、この問題自体がNP困難であることが証明されている——現実的なサイズのタンパク質を厳密に解くことはできず、近似アルゴリズムやメタヒューリスティックに頼る必要がある
- **単純化によって本質を際立たせるという設計思想**: 20種類のアミノ酸の複雑な相互作用を無視してしまう大胆な単純化だが、それによって「疎水性残基が内側に集まる」というタンパク質構造形成の最も基本的な駆動力を、計算可能な組み合わせ最適化問題として明確に取り出せる——複雑な現実の問題を理解可能なモデルに削ぎ落とす、計算生物学におけるモデル化の教育的な好例になっている
- **実際のタンパク質構造予測との関係**: HPモデルはあくまで教育的・理論的なモデルであり、実際のタンパク質の立体構造を定量的に予測する精度はない。現代の実用的なタンパク質構造予測は、深層学習モデル([AlphaFold](/algorithms/backpropagation)に代表される、進化的な配列情報と物理化学的な制約を組み合わせた手法)が主流だが、HPモデルが提示した「疎水性による折り畳みの駆動力」という概念自体は、これらの高度なモデルの背後にある物理的な直感の基礎になっている
- **NP困難性を示す最小の教材としての価値**: 単純化されたルールでありながら組み合わせ爆発とNP困難性を明確に示すため、計算複雑性理論・組み合わせ最適化の教育において、より現実的な(しかし説明が複雑な)問題の代わりに使われることが多い
- **使いどころ**: 計算生物学・バイオインフォマティクスの教育教材(タンパク質折り畳み問題の入門)、組み合わせ最適化アルゴリズム(メタヒューリスティック)のベンチマーク問題、タンパク質構造予測アルゴリズムの理論的基礎研究

## 実装例

```python
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]

def energy(sequence: str, coords: list[tuple[int, int]]) -> int:
    """配列上で隣接していないが、格子上で隣接しているH同士のペア数を数える"""
    n = len(sequence)
    pos_to_idx = {c: i for i, c in enumerate(coords)}
    contacts = 0
    for i in range(n):
        if sequence[i] != 'H':
            continue
        x, y = coords[i]
        for dx, dy in DIRS:
            npos = (x + dx, y + dy)
            if npos in pos_to_idx:
                j = pos_to_idx[npos]
                if j > i + 1 and sequence[j] == 'H':
                    contacts += 1
    return contacts


def best_fold(sequence: str) -> tuple[int, list[tuple[int, int]] | None]:
    """自己回避経路を全探索し、H-H接触数(エネルギー)を最大化する配置を求める"""
    n = len(sequence)
    best_energy = -1
    best_coords: list[tuple[int, int]] | None = None
    start = (0, 0)

    def backtrack(coords: list[tuple[int, int]], visited: set[tuple[int, int]]) -> None:
        nonlocal best_energy, best_coords
        if len(coords) == n:
            e = energy(sequence, coords)
            if e > best_energy:
                best_energy = e
                best_coords = list(coords)
            return
        x, y = coords[-1]
        for dx, dy in DIRS:
            npos = (x + dx, y + dy)
            if npos not in visited:
                visited.add(npos)
                coords.append(npos)
                backtrack(coords, visited)
                coords.pop()
                visited.remove(npos)

    backtrack([start], {start})
    return best_energy, best_coords
```

```typescript
type Pos = [number, number];
const DIRS: Pos[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function energy(sequence: string, coords: Pos[]): number {
  const n = sequence.length;
  const posToIdx = new Map<string, number>();
  coords.forEach((c, i) => posToIdx.set(`${c[0]},${c[1]}`, i));
  let contacts = 0;
  for (let i = 0; i < n; i++) {
    if (sequence[i] !== "H") continue;
    const [x, y] = coords[i];
    for (const [dx, dy] of DIRS) {
      const key = `${x + dx},${y + dy}`;
      if (posToIdx.has(key)) {
        const j = posToIdx.get(key)!;
        if (j > i + 1 && sequence[j] === "H") contacts++;
      }
    }
  }
  return contacts;
}

function bestFold(sequence: string): { energy: number; coords: Pos[] | null } {
  const n = sequence.length;
  const best: { energy: number; coords: Pos[] | null } = { energy: -1, coords: null };
  const start: Pos = [0, 0];

  function backtrack(coords: Pos[], visited: Set<string>): void {
    if (coords.length === n) {
      const e = energy(sequence, coords);
      if (e > best.energy) {
        best.energy = e;
        best.coords = [...coords];
      }
      return;
    }
    const [x, y] = coords[coords.length - 1];
    for (const [dx, dy] of DIRS) {
      const npos: Pos = [x + dx, y + dy];
      const key = `${npos[0]},${npos[1]}`;
      if (!visited.has(key)) {
        visited.add(key);
        coords.push(npos);
        backtrack(coords, visited);
        coords.pop();
        visited.delete(key);
      }
    }
  }

  backtrack([start], new Set([`${start[0]},${start[1]}`]));
  return best;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <map>
#include <utility>

using Pos = std::pair<int, int>;
const std::vector<Pos> DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

int energy(const std::string& sequence, const std::vector<Pos>& coords) {
    int n = static_cast<int>(sequence.size());
    std::map<Pos, int> posToIdx;
    for (int i = 0; i < static_cast<int>(coords.size()); i++) posToIdx[coords[i]] = i;
    int contacts = 0;
    for (int i = 0; i < n; i++) {
        if (sequence[i] != 'H') continue;
        auto [x, y] = coords[i];
        for (auto [dx, dy] : DIRS) {
            Pos npos = {x + dx, y + dy};
            auto it = posToIdx.find(npos);
            if (it != posToIdx.end() && it->second > i + 1 && sequence[it->second] == 'H') {
                contacts++;
            }
        }
    }
    return contacts;
}

void backtrack(const std::string& sequence, std::vector<Pos>& coords, std::set<Pos>& visited,
               int n, int& bestEnergy, std::vector<Pos>& bestCoords) {
    if (static_cast<int>(coords.size()) == n) {
        int e = energy(sequence, coords);
        if (e > bestEnergy) {
            bestEnergy = e;
            bestCoords = coords;
        }
        return;
    }
    auto [x, y] = coords.back();
    for (auto [dx, dy] : DIRS) {
        Pos npos = {x + dx, y + dy};
        if (!visited.count(npos)) {
            visited.insert(npos);
            coords.push_back(npos);
            backtrack(sequence, coords, visited, n, bestEnergy, bestCoords);
            coords.pop_back();
            visited.erase(npos);
        }
    }
}

std::pair<int, std::vector<Pos>> bestFold(const std::string& sequence) {
    int n = static_cast<int>(sequence.size());
    int bestEnergy = -1;
    std::vector<Pos> bestCoords;
    Pos start = {0, 0};
    std::vector<Pos> coords = {start};
    std::set<Pos> visited = {start};
    backtrack(sequence, coords, visited, n, bestEnergy, bestCoords);
    return {bestEnergy, bestCoords};
}
```

```rust
use std::collections::{HashMap, HashSet};

type Pos = (i32, i32);
const DIRS: [(i32, i32); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];

fn energy(sequence: &[u8], coords: &[Pos]) -> i32 {
    let n = sequence.len();
    let mut pos_to_idx: HashMap<Pos, usize> = HashMap::new();
    for (i, &c) in coords.iter().enumerate() {
        pos_to_idx.insert(c, i);
    }
    let mut contacts = 0;
    for i in 0..n {
        if sequence[i] != b'H' {
            continue;
        }
        let (x, y) = coords[i];
        for (dx, dy) in DIRS {
            let npos = (x + dx, y + dy);
            if let Some(&j) = pos_to_idx.get(&npos) {
                if j > i + 1 && sequence[j] == b'H' {
                    contacts += 1;
                }
            }
        }
    }
    contacts
}

fn backtrack(
    sequence: &[u8],
    coords: &mut Vec<Pos>,
    visited: &mut HashSet<Pos>,
    n: usize,
    best_energy: &mut i32,
    best_coords: &mut Option<Vec<Pos>>,
) {
    if coords.len() == n {
        let e = energy(sequence, coords);
        if e > *best_energy {
            *best_energy = e;
            *best_coords = Some(coords.clone());
        }
        return;
    }
    let (x, y) = *coords.last().unwrap();
    for (dx, dy) in DIRS {
        let npos = (x + dx, y + dy);
        if !visited.contains(&npos) {
            visited.insert(npos);
            coords.push(npos);
            backtrack(sequence, coords, visited, n, best_energy, best_coords);
            coords.pop();
            visited.remove(&npos);
        }
    }
}

fn best_fold(sequence: &str) -> (i32, Option<Vec<Pos>>) {
    let seq = sequence.as_bytes();
    let n = seq.len();
    let mut best_energy = -1;
    let mut best_coords = None;
    let start: Pos = (0, 0);
    let mut coords = vec![start];
    let mut visited = HashSet::new();
    visited.insert(start);
    backtrack(seq, &mut coords, &mut visited, n, &mut best_energy, &mut best_coords);
    (best_energy, best_coords)
}
```

```csharp
static readonly (int dx, int dy)[] Dirs = { (1, 0), (-1, 0), (0, 1), (0, -1) };

static int Energy(string sequence, List<(int x, int y)> coords)
{
    int n = sequence.Length;
    var posToIdx = new Dictionary<(int, int), int>();
    for (int i = 0; i < coords.Count; i++) posToIdx[coords[i]] = i;
    int contacts = 0;
    for (int i = 0; i < n; i++)
    {
        if (sequence[i] != 'H') continue;
        var (x, y) = coords[i];
        foreach (var (dx, dy) in Dirs)
        {
            var npos = (x + dx, y + dy);
            if (posToIdx.TryGetValue(npos, out int j) && j > i + 1 && sequence[j] == 'H')
            {
                contacts++;
            }
        }
    }
    return contacts;
}

static (int energy, List<(int, int)>? coords) BestFold(string sequence)
{
    int n = sequence.Length;
    int bestEnergy = -1;
    List<(int, int)>? bestCoords = null;
    var start = (0, 0);
    var coords = new List<(int, int)> { start };
    var visited = new HashSet<(int, int)> { start };

    void Backtrack()
    {
        if (coords.Count == n)
        {
            int e = Energy(sequence, coords);
            if (e > bestEnergy)
            {
                bestEnergy = e;
                bestCoords = new List<(int, int)>(coords);
            }
            return;
        }
        var (x, y) = coords[coords.Count - 1];
        foreach (var (dx, dy) in Dirs)
        {
            var npos = (x + dx, y + dy);
            if (!visited.Contains(npos))
            {
                visited.Add(npos);
                coords.Add(npos);
                Backtrack();
                coords.RemoveAt(coords.Count - 1);
                visited.Remove(npos);
            }
        }
    }

    Backtrack();
    return (bestEnergy, bestCoords);
}
```
