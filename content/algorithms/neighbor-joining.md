---
name: 近隣結合法(Neighbor-Joining法)
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O(n³)(n配列)
summary: 種ごとに異なる進化速度を許容しながら、全体の枝の長さの合計が最小になるように統合順序を選ぶことで、UPGMAより現実的な系統樹を構築する手法。
---

## 概要

[UPGMA](/algorithms/upgma)は「全ての系統が同じ速度で進化する」という分子時計の仮定に依存するが、実際の生物では種によって進化速度(突然変異の蓄積速度)が大きく異なることが珍しくない。1987年に斎藤とネイが発表した近隣結合法は、この分子時計の仮定を置かずに、距離行列から直接、系統樹全体の枝の長さの合計が最小になるような木を構築する。単純な最短距離のペアではなく、「他の全ての配列からの平均距離」も考慮した補正済みの距離を使ってペアを選ぶのが、UPGMAとの決定的な違いになっている。

## 仕組み

1. 各配列を独立した頂点として、全ペア間の距離行列`D`を用意する
2. 各頂点`i`について、他の全頂点との距離の合計`R(i) = Σ D(i,j)`を計算する
3. 単純な距離`D(i,j)`の代わりに、`Q(i,j) = (n-2) × D(i,j) - R(i) - R(j)`という補正済みのスコアを全ペアについて計算する——この補正項`R(i)`、`R(j)`が、「その頂点が他の全体からどれだけ離れているか」という情報を加味し、UPGMAの単純な最近ペア選択とは異なる基準を与える
4. `Q(i,j)`が最小になるペア`(i,j)`を選んで新しいノード`u`に統合する。`i`、`j`から`u`への枝の長さは、それぞれ`D(i,j)`と`R(i)`、`R(j)`から計算される式で個別に決まる(UPGMAのような単純な半分ではなく、`i`と`j`で異なる長さになりうる——これが進化速度の違いを木の枝の長さに反映させる仕組み)
5. `u`と他の各頂点`k`との新しい距離を`D(u,k) = (D(i,k) + D(j,k) - D(i,j)) / 2`として計算し直し、`i`、`j`を`u`に置き換えて頂点数を1つ減らす
6. 頂点が3つ以下になるまで2〜5を繰り返し、最後に残った頂点を直接結んで木を完成させる

## 特性・トレードオフ

- **計算量**: 各ステップで全ペアの`Q`値を計算するのに`O(n²)`、これを`n`回繰り返すので全体で`O(n³)`——[UPGMA](/algorithms/upgma)と同じオーダーだが、定数倍のコストは`Q`値の計算の分だけ大きい
- **進化速度の不均一性への対応**: 分子時計の仮定を置かないため、種によって進化速度が異なる(枝の長さが不均一な)現実の系統関係をより正確に反映した木を構築できる。これが実務でUPGMAより広く使われる主な理由
- **加法性への依存**: 近隣結合法は、入力の距離行列が(近似的にでも)「加法的」(木の上の2点間の距離が、その間の枝の長さの単純な合計になっている)であることを前提に設計されている。距離の推定に大きな誤差が含まれると、得られる木の構造が不安定になることがある
- **使いどころ**: 分子系統学における標準的な系統樹推定手法のひとつ、[多重配列アラインメント](/algorithms/multiple-sequence-alignment)のガイドツリー構築、感染症の伝播経路解析(ウイルス株の系統関係からアウトブレイクの起源を推定する)など

## 実装例

既知のトポロジー((A,B)が先に合流し、(C,D)が先に合流してから2つのクラスタが結合する)を持つ加法的な距離行列を入力として与え、近隣結合法が枝長も含めて元のトポロジーを正確に再構築することを検証する。

```python
def neighbor_joining(labels: list[str], dist_matrix: list[list[float]]) -> list[tuple[str, str, float]]:
    nodes = list(labels)
    # dist[i][j]: ノードiとjの間の距離
    dist: dict[str, dict[str, float]] = {
        a: {b: dist_matrix[i][j] for j, b in enumerate(labels)} for i, a in enumerate(labels)
    }
    edges: list[tuple[str, str, float]] = []
    next_id = 0

    while len(nodes) > 2:
        n = len(nodes)
        # 各ノードの他全ノードからの距離の合計R(i)
        r = {i: sum(dist[i][j] for j in nodes if j != i) for i in nodes}

        # 補正済みスコアQ(i,j)が最小のペアを選ぶ
        best_q, best_i, best_j = None, "", ""
        for a in range(n):
            for b in range(a + 1, n):
                i, j = nodes[a], nodes[b]
                q = (n - 2) * dist[i][j] - r[i] - r[j]
                if best_q is None or q < best_q:
                    best_q, best_i, best_j = q, i, j

        u = f"N{next_id}"
        next_id += 1
        d_ij = dist[best_i][best_j]
        d_iu = 0.5 * d_ij + (r[best_i] - r[best_j]) / (2 * (n - 2))
        d_ju = d_ij - d_iu
        edges.append((best_i, u, d_iu))
        edges.append((best_j, u, d_ju))

        # 新ノードuと残りの各ノードkとの距離を再計算
        dist[u] = {}
        for k in nodes:
            if k != best_i and k != best_j:
                d_uk = 0.5 * (dist[best_i][k] + dist[best_j][k] - d_ij)
                dist[u][k] = d_uk
                dist[k][u] = d_uk

        nodes = [x for x in nodes if x != best_i and x != best_j] + [u]
        for k in list(dist.keys()):
            dist[k].pop(best_i, None)
            dist[k].pop(best_j, None)
        dist.pop(best_i, None)
        dist.pop(best_j, None)

    i, j = nodes
    edges.append((i, j, dist[i][j]))
    return edges
```

```typescript
type Edge = [string, string, number];

function neighborJoining(labels: string[], distMatrix: number[][]): Edge[] {
  let nodes = [...labels];
  const dist = new Map<string, Map<string, number>>();
  labels.forEach((a, i) => {
    const row = new Map<string, number>();
    labels.forEach((b, j) => row.set(b, distMatrix[i][j]));
    dist.set(a, row);
  });

  const edges: Edge[] = [];
  let nextId = 0;

  while (nodes.length > 2) {
    const n = nodes.length;
    const r = new Map<string, number>();
    for (const i of nodes) {
      let sum = 0;
      for (const j of nodes) if (j !== i) sum += dist.get(i)!.get(j)!;
      r.set(i, sum);
    }

    let best: [number, string, string] | null = null;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const [i, j] = [nodes[a], nodes[b]];
        const q = (n - 2) * dist.get(i)!.get(j)! - r.get(i)! - r.get(j)!;
        if (best === null || q < best[0]) best = [q, i, j];
      }
    }
    const [, bestI, bestJ] = best!;

    const u = `N${nextId++}`;
    const dij = dist.get(bestI)!.get(bestJ)!;
    const dIu = 0.5 * dij + (r.get(bestI)! - r.get(bestJ)!) / (2 * (n - 2));
    const dJu = dij - dIu;
    edges.push([bestI, u, dIu]);
    edges.push([bestJ, u, dJu]);

    const uRow = new Map<string, number>();
    for (const k of nodes) {
      if (k !== bestI && k !== bestJ) {
        const dUk = 0.5 * (dist.get(bestI)!.get(k)! + dist.get(bestJ)!.get(k)! - dij);
        uRow.set(k, dUk);
        dist.get(k)!.set(u, dUk);
      }
    }
    dist.set(u, uRow);
    for (const k of dist.keys()) {
      dist.get(k)!.delete(bestI);
      dist.get(k)!.delete(bestJ);
    }
    dist.delete(bestI);
    dist.delete(bestJ);
    nodes = nodes.filter((x) => x !== bestI && x !== bestJ);
    nodes.push(u);
  }

  const [i, j] = nodes;
  edges.push([i, j, dist.get(i)!.get(j)!]);
  return edges;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <limits>

using Edge = std::tuple<std::string, std::string, double>;

std::vector<Edge> neighborJoining(
    const std::vector<std::string>& labels,
    const std::vector<std::vector<double>>& distMatrix) {
    std::vector<std::string> nodes(labels);
    std::unordered_map<std::string, std::unordered_map<std::string, double>> dist;
    for (size_t i = 0; i < labels.size(); i++) {
        for (size_t j = 0; j < labels.size(); j++) {
            dist[labels[i]][labels[j]] = distMatrix[i][j];
        }
    }

    std::vector<Edge> edges;
    int nextId = 0;

    while (nodes.size() > 2) {
        int n = static_cast<int>(nodes.size());
        std::unordered_map<std::string, double> r;
        for (const auto& i : nodes) {
            double sum = 0.0;
            for (const auto& j : nodes) if (j != i) sum += dist[i][j];
            r[i] = sum;
        }

        double bestQ = std::numeric_limits<double>::max();
        std::string bestI, bestJ;
        for (int a = 0; a < n; a++) {
            for (int b = a + 1; b < n; b++) {
                const std::string& i = nodes[a];
                const std::string& j = nodes[b];
                double q = (n - 2) * dist[i][j] - r[i] - r[j];
                if (q < bestQ) { bestQ = q; bestI = i; bestJ = j; }
            }
        }

        std::string u = "N" + std::to_string(nextId++);
        double dij = dist[bestI][bestJ];
        double dIu = 0.5 * dij + (r[bestI] - r[bestJ]) / (2.0 * (n - 2));
        double dJu = dij - dIu;
        edges.emplace_back(bestI, u, dIu);
        edges.emplace_back(bestJ, u, dJu);

        for (const auto& k : nodes) {
            if (k != bestI && k != bestJ) {
                double dUk = 0.5 * (dist[bestI][k] + dist[bestJ][k] - dij);
                dist[u][k] = dUk;
                dist[k][u] = dUk;
            }
        }

        for (auto& [k, row] : dist) {
            row.erase(bestI);
            row.erase(bestJ);
        }
        dist.erase(bestI);
        dist.erase(bestJ);

        std::vector<std::string> nextNodes;
        for (const auto& x : nodes) if (x != bestI && x != bestJ) nextNodes.push_back(x);
        nextNodes.push_back(u);
        nodes = nextNodes;
    }

    const std::string& i = nodes[0];
    const std::string& j = nodes[1];
    edges.emplace_back(i, j, dist[i][j]);
    return edges;
}
```

```rust
use std::collections::HashMap;

type Edge = (String, String, f64);

fn neighbor_joining(labels: &[String], dist_matrix: &[Vec<f64>]) -> Vec<Edge> {
    let mut nodes: Vec<String> = labels.to_vec();
    let mut dist: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for (i, a) in labels.iter().enumerate() {
        let mut row = HashMap::new();
        for (j, b) in labels.iter().enumerate() {
            row.insert(b.clone(), dist_matrix[i][j]);
        }
        dist.insert(a.clone(), row);
    }

    let mut edges: Vec<Edge> = Vec::new();
    let mut next_id = 0;

    while nodes.len() > 2 {
        let n = nodes.len();
        let mut r: HashMap<String, f64> = HashMap::new();
        for i in &nodes {
            let sum: f64 = nodes.iter().filter(|j| *j != i).map(|j| dist[i][j]).sum();
            r.insert(i.clone(), sum);
        }

        let mut best_q = f64::MAX;
        let (mut best_i, mut best_j) = (String::new(), String::new());
        for a in 0..n {
            for b in (a + 1)..n {
                let (i, j) = (&nodes[a], &nodes[b]);
                // n >= 3 の時だけこのループに入るので (n - 2) は 0 以上
                let q = (n - 2) as f64 * dist[i][j] - r[i] - r[j];
                if q < best_q {
                    best_q = q;
                    best_i = i.clone();
                    best_j = j.clone();
                }
            }
        }

        let u = format!("N{next_id}");
        next_id += 1;
        let d_ij = dist[&best_i][&best_j];
        let d_iu = 0.5 * d_ij + (r[&best_i] - r[&best_j]) / (2.0 * (n - 2) as f64);
        let d_ju = d_ij - d_iu;
        edges.push((best_i.clone(), u.clone(), d_iu));
        edges.push((best_j.clone(), u.clone(), d_ju));

        let mut u_row = HashMap::new();
        for k in &nodes {
            if *k != best_i && *k != best_j {
                let d_uk = 0.5 * (dist[&best_i][k] + dist[&best_j][k] - d_ij);
                u_row.insert(k.clone(), d_uk);
                dist.get_mut(k).unwrap().insert(u.clone(), d_uk);
            }
        }
        dist.insert(u.clone(), u_row);
        for row in dist.values_mut() {
            row.remove(&best_i);
            row.remove(&best_j);
        }
        dist.remove(&best_i);
        dist.remove(&best_j);

        nodes.retain(|x| *x != best_i && *x != best_j);
        nodes.push(u);
    }

    let (i, j) = (nodes[0].clone(), nodes[1].clone());
    let d = dist[&i][&j];
    edges.push((i, j, d));
    edges
}
```

```csharp
static List<(string, string, double)> NeighborJoining(List<string> labels, double[,] distMatrix)
{
    var nodes = new List<string>(labels);
    var dist = new Dictionary<string, Dictionary<string, double>>();
    for (int i = 0; i < labels.Count; i++)
    {
        var row = new Dictionary<string, double>();
        for (int j = 0; j < labels.Count; j++) row[labels[j]] = distMatrix[i, j];
        dist[labels[i]] = row;
    }

    var edges = new List<(string, string, double)>();
    int nextId = 0;

    while (nodes.Count > 2)
    {
        int n = nodes.Count;
        var r = new Dictionary<string, double>();
        foreach (var i in nodes)
        {
            double sum = 0;
            foreach (var j in nodes) if (j != i) sum += dist[i][j];
            r[i] = sum;
        }

        double bestQ = double.MaxValue;
        string bestI = "", bestJ = "";
        for (int a = 0; a < n; a++)
        {
            for (int b = a + 1; b < n; b++)
            {
                var (i, j) = (nodes[a], nodes[b]);
                double q = (n - 2) * dist[i][j] - r[i] - r[j];
                if (q < bestQ) { bestQ = q; bestI = i; bestJ = j; }
            }
        }

        string u = "N" + nextId++;
        double dij = dist[bestI][bestJ];
        double dIu = 0.5 * dij + (r[bestI] - r[bestJ]) / (2.0 * (n - 2));
        double dJu = dij - dIu;
        edges.Add((bestI, u, dIu));
        edges.Add((bestJ, u, dJu));

        var uRow = new Dictionary<string, double>();
        foreach (var k in nodes)
        {
            if (k != bestI && k != bestJ)
            {
                double dUk = 0.5 * (dist[bestI][k] + dist[bestJ][k] - dij);
                uRow[k] = dUk;
                dist[k][u] = dUk;
            }
        }
        dist[u] = uRow;
        foreach (var k in dist.Keys.ToList())
        {
            dist[k].Remove(bestI);
            dist[k].Remove(bestJ);
        }
        dist.Remove(bestI);
        dist.Remove(bestJ);

        nodes = nodes.Where(x => x != bestI && x != bestJ).ToList();
        nodes.Add(u);
    }

    var (fi, fj) = (nodes[0], nodes[1]);
    edges.Add((fi, fj, dist[fi][fj]));
    return edges;
}
```
