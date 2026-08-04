---
name: UPGMA法(非加重結合法による系統樹構築)
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O(n³)(素朴な実装)、O(n²)(効率的な実装)
summary: 最も距離が近い2つの生物・配列のグループを繰り返し統合していくことで、進化的な類縁関係を表す系統樹を階層的クラスタリングとして構築する手法。
---

## 概要

複数の種やタンパク質配列の間の進化的な類縁関係を視覚化する系統樹は、生物学の基本的な道具のひとつである。UPGMA(Unweighted Pair Group Method with Arithmetic mean)は、配列間の距離(例えば[Needleman-Wunsch法](/algorithms/needleman-wunsch)で計算した非類似度)だけを入力として、最も近い2つのグループを繰り返し統合していく、階層的クラスタリングの一種として系統樹を構築する。「全ての系統が一定の速度で進化してきた」という分子時計の仮定を置くことで、常に根から等距離の葉を持つ、超計量的な木を生成するのが特徴である。

## 仕組み

1. 各配列(または種)を、それ自身だけからなる1つのクラスタとして初期化する。全ペア間の距離を行列として用意する
2. 距離行列の中から、距離が最も近い2つのクラスタ`A`、`B`を見つける
3. `A`と`B`を統合して新しいクラスタ`AB`を作る。統合する木の枝の高さ(祖先が分岐した時期)は、`A`と`B`の距離の半分とする
4. 新しいクラスタ`AB`と、他の各クラスタ`C`との距離は、`AとC`の距離、`BとC`の距離の**算術平均**として計算し直す(これが「非加重(Unweighted)」の意味——統合前のクラスタサイズを考慮せず単純平均を取る)
5. クラスタが1つだけになるまで2〜4を繰り返す。この統合の過程がそのまま木の枝分かれの構造(系統樹)になる

## 特性・トレードオフ

- **計算量**: 素朴な実装では、各ステップで距離行列全体を走査して最小値を探すため`O(n³)`(`n`ステップ×各ステップ`O(n²)`)。優先度キューなどを使った効率的な実装では`O(n²)`まで改善できる
- **分子時計の仮定**: UPGMAは「全ての系統が同じ速度で進化してきた」という強い仮定(分子時計仮説)を置いており、この仮定が成り立たない場合(進化速度が種によって大きく異なる場合)、得られる木の形が実際の進化の歴史と食い違うことがある
- **[近隣結合法](/algorithms/neighbor-joining)との違い**: UPGMAは常に根から全ての葉までの距離が等しい超計量的な木を作るのに対し、[近隣結合法](/algorithms/neighbor-joining)は進化速度が種ごとに異なることを許容するより柔軟な木を構築できる。実際の生物の進化速度は種によって異なることが多いため、実務では[近隣結合法](/algorithms/neighbor-joining)が好まれることも多いが、UPGMAは計算のシンプルさと直感的な解釈のしやすさから、教育目的や大まかなクラスタリングには今なお使われる
- **使いどころ**: 種間・遺伝子間の進化的類縁関係の可視化、[多重配列アラインメント](/algorithms/multiple-sequence-alignment)におけるガイドツリーの構築、一般的な階層的クラスタリング(生物学に限らず、任意のデータの距離行列からクラスタ構造を発見する場面)

## 実装例

```python
def upgma(labels: list[str], dist: list[list[float]]):
    n = len(labels)
    clusters = {i: {"members": [labels[i]], "size": 1} for i in range(n)}
    d = {}
    for i in range(n):
        for j in range(n):
            if i != j:
                d[(i, j)] = dist[i][j]

    next_id = n
    active = set(range(n))
    merges = []  # (left_members, right_members, height)

    while len(active) > 1:
        best, best_pair = None, None
        for i in active:
            for j in active:
                if i < j and (best is None or d[(i, j)] < best):
                    best, best_pair = d[(i, j)], (i, j)
        i, j = best_pair
        new_height = best / 2.0
        new_size = clusters[i]["size"] + clusters[j]["size"]
        new_members = clusters[i]["members"] + clusters[j]["members"]
        clusters[next_id] = {"members": new_members, "size": new_size}
        merges.append((clusters[i]["members"], clusters[j]["members"], new_height))

        for k in active:
            if k != i and k != j:
                new_d = (clusters[i]["size"] * d[(i, k)] + clusters[j]["size"] * d[(j, k)]) / new_size
                d[(next_id, k)] = new_d
                d[(k, next_id)] = new_d

        active -= {i, j}
        active.add(next_id)
        next_id += 1

    return merges


# 検証: 5種の距離行列から既知の系統樹トポロジー((a,b),e) と (c,d) を再構築できるか
labels = ["a", "b", "c", "d", "e"]
dist = [
    [0, 17, 21, 31, 23],
    [17, 0, 30, 34, 21],
    [21, 30, 0, 28, 39],
    [31, 34, 28, 0, 43],
    [23, 21, 39, 43, 0],
]
merges = upgma(labels, dist)
for left, right, height in merges:
    print(left, right, height)
# => ['a'] ['b'] 8.5 / ['e'] ['a', 'b'] 11.0 / ['c'] ['d'] 14.0 / ['e','a','b'] ['c','d'] 16.5
```

```typescript
interface Cluster {
  members: string[];
  size: number;
}

function upgma(labels: string[], dist: number[][]): Array<[string[], string[], number]> {
  const n = labels.length;
  const clusters = new Map<number, Cluster>();
  for (let i = 0; i < n; i++) clusters.set(i, { members: [labels[i]], size: 1 });

  const d = new Map<string, number>();
  const key = (i: number, j: number): string => `${i},${j}`;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) d.set(key(i, j), dist[i][j]);
    }
  }

  let nextId = n;
  const active = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const merges: Array<[string[], string[], number]> = [];

  while (active.size > 1) {
    let best = Infinity;
    let bestPair: [number, number] = [-1, -1];
    for (const i of active) {
      for (const j of active) {
        if (i < j && d.get(key(i, j))! < best) {
          best = d.get(key(i, j))!;
          bestPair = [i, j];
        }
      }
    }
    const [i, j] = bestPair;
    const ci = clusters.get(i)!;
    const cj = clusters.get(j)!;
    const newSize = ci.size + cj.size;
    clusters.set(nextId, { members: [...ci.members, ...cj.members], size: newSize });
    merges.push([ci.members, cj.members, best / 2]);

    for (const k of active) {
      if (k !== i && k !== j) {
        const newD = (ci.size * d.get(key(i, k))! + cj.size * d.get(key(j, k))!) / newSize;
        d.set(key(nextId, k), newD);
        d.set(key(k, nextId), newD);
      }
    }
    active.delete(i);
    active.delete(j);
    active.add(nextId);
    nextId++;
  }
  return merges;
}
```

```cpp
#include <vector>
#include <string>
#include <map>
#include <set>
#include <limits>

struct Cluster {
    std::vector<std::string> members;
    int size;
};

struct Merge {
    std::vector<std::string> left;
    std::vector<std::string> right;
    double height;
};

std::vector<Merge> upgma(const std::vector<std::string>& labels, const std::vector<std::vector<double>>& dist) {
    int n = static_cast<int>(labels.size());
    std::map<int, Cluster> clusters;
    for (int i = 0; i < n; i++) clusters[i] = {{labels[i]}, 1};

    std::map<std::pair<int, int>, double> d;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (i != j) d[{i, j}] = dist[i][j];

    int nextId = n;
    std::set<int> active;
    for (int i = 0; i < n; i++) active.insert(i);
    std::vector<Merge> merges;

    while (active.size() > 1) {
        double best = std::numeric_limits<double>::infinity();
        int bi = -1, bj = -1;
        for (int i : active) {
            for (int j : active) {
                if (i < j && d[{i, j}] < best) {
                    best = d[{i, j}];
                    bi = i;
                    bj = j;
                }
            }
        }
        int newSize = clusters[bi].size + clusters[bj].size;
        std::vector<std::string> newMembers = clusters[bi].members;
        newMembers.insert(newMembers.end(), clusters[bj].members.begin(), clusters[bj].members.end());
        merges.push_back({clusters[bi].members, clusters[bj].members, best / 2.0});
        clusters[nextId] = {newMembers, newSize};

        for (int k : active) {
            if (k != bi && k != bj) {
                double newD = (clusters[bi].size * d[{bi, k}] + clusters[bj].size * d[{bj, k}]) / newSize;
                d[{nextId, k}] = newD;
                d[{k, nextId}] = newD;
            }
        }
        active.erase(bi);
        active.erase(bj);
        active.insert(nextId);
        nextId++;
    }
    return merges;
}
```

```rust
use std::collections::{HashMap, HashSet};

#[derive(Clone)]
struct Cluster {
    members: Vec<String>,
    size: usize,
}

struct Merge {
    left: Vec<String>,
    right: Vec<String>,
    height: f64,
}

fn upgma(labels: &[String], dist: &[Vec<f64>]) -> Vec<Merge> {
    let n = labels.len();
    let mut clusters: HashMap<usize, Cluster> = HashMap::new();
    for i in 0..n {
        clusters.insert(i, Cluster { members: vec![labels[i].clone()], size: 1 });
    }

    let mut d: HashMap<(usize, usize), f64> = HashMap::new();
    for i in 0..n {
        for j in 0..n {
            if i != j {
                d.insert((i, j), dist[i][j]);
            }
        }
    }

    let mut next_id = n;
    let mut active: HashSet<usize> = (0..n).collect();
    let mut merges = Vec::new();

    while active.len() > 1 {
        let mut best = f64::INFINITY;
        let mut best_pair = (0usize, 0usize);
        for &i in &active {
            for &j in &active {
                if i < j {
                    let dij = d[&(i, j)];
                    if dij < best {
                        best = dij;
                        best_pair = (i, j);
                    }
                }
            }
        }
        let (i, j) = best_pair;
        let ci = clusters[&i].clone();
        let cj = clusters[&j].clone();
        let new_size = ci.size + cj.size;
        let mut new_members = ci.members.clone();
        new_members.extend(cj.members.clone());
        merges.push(Merge { left: ci.members.clone(), right: cj.members.clone(), height: best / 2.0 });
        clusters.insert(next_id, Cluster { members: new_members, size: new_size });

        let active_snapshot: Vec<usize> = active.iter().copied().collect();
        for k in active_snapshot {
            if k != i && k != j {
                let new_d = (ci.size as f64 * d[&(i, k)] + cj.size as f64 * d[&(j, k)]) / new_size as f64;
                d.insert((next_id, k), new_d);
                d.insert((k, next_id), new_d);
            }
        }
        active.remove(&i);
        active.remove(&j);
        active.insert(next_id);
        next_id += 1;
    }
    merges
}
```

```csharp
class Cluster
{
    public List<string> Members = new();
    public int Size;
}

static List<(List<string> Left, List<string> Right, double Height)> Upgma(string[] labels, double[,] dist)
{
    int n = labels.Length;
    var clusters = new Dictionary<int, Cluster>();
    for (int i = 0; i < n; i++) clusters[i] = new Cluster { Members = new List<string> { labels[i] }, Size = 1 };

    var d = new Dictionary<(int, int), double>();
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (i != j) d[(i, j)] = dist[i, j];

    int nextId = n;
    var active = new HashSet<int>(Enumerable.Range(0, n));
    var merges = new List<(List<string>, List<string>, double)>();

    while (active.Count > 1)
    {
        double best = double.PositiveInfinity;
        (int, int) bestPair = (-1, -1);
        foreach (var i in active)
            foreach (var j in active)
                if (i < j && d[(i, j)] < best) { best = d[(i, j)]; bestPair = (i, j); }

        var (a, b) = bestPair;
        int newSize = clusters[a].Size + clusters[b].Size;
        var newMembers = clusters[a].Members.Concat(clusters[b].Members).ToList();
        merges.Add((clusters[a].Members, clusters[b].Members, best / 2.0));
        clusters[nextId] = new Cluster { Members = newMembers, Size = newSize };

        foreach (var k in active.ToList())
        {
            if (k != a && k != b)
            {
                double newD = (clusters[a].Size * d[(a, k)] + clusters[b].Size * d[(b, k)]) / newSize;
                d[(nextId, k)] = newD;
                d[(k, nextId)] = newD;
            }
        }
        active.Remove(a);
        active.Remove(b);
        active.Add(nextId);
        nextId++;
    }
    return merges;
}
```
