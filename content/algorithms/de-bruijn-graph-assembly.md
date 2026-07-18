---
name: de Bruijnグラフによるゲノムアセンブリ
category: バイオインフォマティクス
subcategory: ゲノムアセンブリ
complexity: O(L)(全リードの総塩基数L、グラフ構築)
summary: 大量の短い断片配列(リード)をk-merの重なりに基づくグラフに変換し、そのグラフを1本の道として辿ることで元のゲノム配列を再構築するアセンブリ手法。
---

## 概要

次世代シーケンサーは、ゲノム全体を一度に読み取るのではなく、数百塩基程度の短い断片(リード)を大量に生成する。この膨大な断片から元の(数百万〜数十億塩基対の)ゲノム配列全体を再構築する「アセンブリ」は、ジグソーパズルのピースから絵を復元するような問題である。de Bruijnグラフを使うアプローチは、リード同士を直接比較するのではなく、全リードを[k-merカウント](/algorithms/k-mer-counting)で得た`k-1`塩基の重なりを持つk-merの集合に分解し、それをグラフの辺として表現することで、ゲノムアセンブリを「グラフ上のオイラー路(全ての辺をちょうど1回ずつ通る経路)を見つける問題」に還元する。

## 仕組み

1. 全リードを、固定長`k`の全てのk-merに分解する([k-merカウント](/algorithms/k-mer-counting)と同じ処理)
2. 各k-merについて、その最初の`k-1`文字を表す頂点と、最後の`k-1`文字を表す頂点を作り、そのk-mer自体を「最初の`k-1`文字の頂点」から「最後の`k-1`文字の頂点」への有向辺として追加する(例えば`k=4`のk-mer"ACGT"は、頂点"ACG"から頂点"CGT"への辺になる)
3. 全てのk-merについてこれを行うと、多数の頂点(`k-1`塩基の断片)と辺(k-mer)からなる有向グラフが構築される。ゲノム上で隣接して出現するk-mer同士は、`k-1`塩基の重なりを通じて自動的に頂点を共有し、グラフ上で繋がった経路になる
4. 元のゲノム配列は、理想的にはこのグラフ上で「全ての辺をちょうど1回ずつ通る経路」(オイラー路)に対応する。オイラー路は[Fleuryのアルゴリズム](/algorithms/dfs)やHierholzerのアルゴリズムのような効率的な手法で見つけられる([DFS](/algorithms/dfs)に近い考え方で辺を消費しながら経路を構築する)
5. 実際のゲノムには反復配列(同じ配列が複数箇所に出現する)が存在するため、グラフには分岐や合流(バブル、ループ)が生じ、単一の経路に一意に定まらないことが多い。実用のアセンブラは、リードのペア情報や被覆率(各k-merが何回観測されたか)を使って、こうした曖昧さを解消しようとする

## 特性・トレードオフ

- **計算量**: グラフの構築自体は、全リードの総塩基数`L`に対して`O(L)`(各k-merの処理が[k-merカウント](/algorithms/k-mer-counting)と同じくハッシュテーブルで定数時間)。オイラー路の探索もグラフの辺数に対して線形時間で行える
- **オーバーラップ・レイアウト・コンセンサス法との対比**: [オーバーラップ・レイアウト・コンセンサス法](/algorithms/overlap-layout-consensus)がリード同士を直接ペアワイズに比較して重なりを見つけるのに対し、de Bruijnグラフはk-merという固定長の断片を経由することで、リードの本数が膨大でも(直接の全ペア比較を避けられるため)スケーラブルに扱える。この違いが、短いリードを大量に生成する次世代シーケンサーのデータに、de Bruijnグラフ法が広く使われる理由になっている
- **反復配列とグラフの複雑さ**: ゲノム中の反復配列は、de Bruijnグラフ上で複数の経路が同じ頂点を共有する「合流・分岐」を作り出し、正しい経路が一意に定まらない曖昧さの原因になる。反復配列の長さが`k`より長いと、この曖昧さは`k`を大きくしても解消できず、アセンブリの根本的な難しさとして残る
- **使いどころ**: 次世代シーケンサー(短いリードを大量に生成する)によるゲノムアセンブリの標準的な手法(Velvet、SPAdesなどの実用アセンブラの基盤)、メタゲノム解析における複数種が混在するサンプルからのゲノム再構築

## 実装例

```python
def assemble_genome(reads: list[str], k: int) -> str | None:
    """リード群からk-merのde Bruijnグラフを構築し、オイラー路を辿ってゲノムを復元する。"""
    # 重複するk-mer(オーバーラップしたリード同士が同じk-merを再発見する場合)は
    # 集合にまとめてから辺として追加する。
    kmers = set()
    for read in reads:
        for i in range(len(read) - k + 1):
            kmers.add(read[i:i + k])

    graph: dict[str, list[str]] = {}
    for kmer in kmers:
        prefix, suffix = kmer[:-1], kmer[1:]
        graph.setdefault(prefix, []).append(suffix)
        graph.setdefault(suffix, [])

    out_degree = {node: len(neighbors) for node, neighbors in graph.items()}
    in_degree = {node: 0 for node in graph}
    for node, neighbors in graph.items():
        for nxt in neighbors:
            in_degree[nxt] = in_degree.get(nxt, 0) + 1

    # 出次数が入次数より1多い頂点があればそこが開始点(オイラー路の始点)
    start = next(iter(graph))
    for node in graph:
        if out_degree.get(node, 0) - in_degree.get(node, 0) == 1:
            start = node
            break

    ptr = {node: 0 for node in graph}
    stack = [start]
    path: list[str] = []
    total_edges = sum(out_degree.values())

    while stack:
        node = stack[-1]
        if ptr.get(node, 0) < len(graph.get(node, [])):
            nxt = graph[node][ptr[node]]
            ptr[node] += 1
            stack.append(nxt)
        else:
            path.append(stack.pop())

    path.reverse()
    if len(path) != total_edges + 1:
        return None  # 全ての辺を通る経路が見つからなかった(連結でない等)

    genome = path[0]
    for node in path[1:]:
        genome += node[-1]
    return genome
```

```typescript
function assembleGenome(reads: string[], k: number): string | null {
  const kmers = new Set<string>();
  for (const read of reads) {
    for (let i = 0; i + k <= read.length; i++) kmers.add(read.slice(i, i + k));
  }

  const graph = new Map<string, string[]>();
  for (const kmer of kmers) {
    const prefix = kmer.slice(0, -1);
    const suffix = kmer.slice(1);
    if (!graph.has(prefix)) graph.set(prefix, []);
    graph.get(prefix)!.push(suffix);
    if (!graph.has(suffix)) graph.set(suffix, []);
  }

  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const [node, neighbors] of graph) {
    outDegree.set(node, neighbors.length);
    if (!inDegree.has(node)) inDegree.set(node, 0);
    for (const nxt of neighbors) inDegree.set(nxt, (inDegree.get(nxt) ?? 0) + 1);
  }

  let start = graph.keys().next().value as string;
  for (const node of graph.keys()) {
    if ((outDegree.get(node) ?? 0) - (inDegree.get(node) ?? 0) === 1) {
      start = node;
      break;
    }
  }

  const ptr = new Map<string, number>();
  const stack: string[] = [start];
  const path: string[] = [];
  let totalEdges = 0;
  for (const v of outDegree.values()) totalEdges += v;

  while (stack.length > 0) {
    const node = stack[stack.length - 1];
    const neighbors = graph.get(node) ?? [];
    const p = ptr.get(node) ?? 0;
    if (p < neighbors.length) {
      ptr.set(node, p + 1);
      stack.push(neighbors[p]);
    } else {
      path.push(stack.pop()!);
    }
  }

  path.reverse();
  if (path.length !== totalEdges + 1) return null;

  let genome = path[0];
  for (let i = 1; i < path.length; i++) genome += path[i][path[i].length - 1];
  return genome;
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <optional>

std::optional<std::string> assembleGenome(const std::vector<std::string>& reads, int k) {
    std::unordered_set<std::string> kmers;
    for (const auto& read : reads) {
        for (size_t i = 0; i + k <= read.size(); i++) {
            kmers.insert(read.substr(i, k));
        }
    }

    std::unordered_map<std::string, std::vector<std::string>> graph;
    for (const auto& kmer : kmers) {
        std::string prefix = kmer.substr(0, kmer.size() - 1);
        std::string suffix = kmer.substr(1);
        graph[prefix].push_back(suffix);
        graph[suffix]; // 頂点として存在だけ登録(隣接リストが空でも良い)
    }

    std::unordered_map<std::string, int> outDegree, inDegree;
    for (const auto& [node, neighbors] : graph) {
        outDegree[node] = static_cast<int>(neighbors.size());
        inDegree.try_emplace(node, 0);
        for (const auto& nxt : neighbors) inDegree[nxt]++;
    }

    std::string start = graph.begin()->first;
    for (const auto& [node, _] : graph) {
        if (outDegree[node] - inDegree[node] == 1) {
            start = node;
            break;
        }
    }

    std::unordered_map<std::string, size_t> ptr;
    std::vector<std::string> stack{start};
    std::vector<std::string> path;
    int totalEdges = 0;
    for (const auto& [_, d] : outDegree) totalEdges += d;

    while (!stack.empty()) {
        const std::string& node = stack.back();
        auto& neighbors = graph[node];
        size_t p = ptr[node];
        if (p < neighbors.size()) {
            ptr[node] = p + 1;
            stack.push_back(neighbors[p]);
        } else {
            path.push_back(node);
            stack.pop_back();
        }
    }

    std::reverse(path.begin(), path.end());
    if (static_cast<int>(path.size()) != totalEdges + 1) return std::nullopt;

    std::string genome = path[0];
    for (size_t i = 1; i < path.size(); i++) genome += path[i].back();
    return genome;
}
```

```rust
use std::collections::{HashMap, HashSet};

fn assemble_genome(reads: &[String], k: usize) -> Option<String> {
    let mut kmers: HashSet<String> = HashSet::new();
    for read in reads {
        let chars: Vec<char> = read.chars().collect();
        for i in 0..=chars.len().saturating_sub(k) {
            if i + k <= chars.len() {
                kmers.insert(chars[i..i + k].iter().collect());
            }
        }
    }

    let mut graph: HashMap<String, Vec<String>> = HashMap::new();
    for kmer in &kmers {
        let chars: Vec<char> = kmer.chars().collect();
        let prefix: String = chars[..chars.len() - 1].iter().collect();
        let suffix: String = chars[1..].iter().collect();
        graph.entry(prefix).or_default().push(suffix.clone());
        graph.entry(suffix).or_default();
    }

    let mut out_degree: HashMap<String, usize> = HashMap::new();
    let mut in_degree: HashMap<String, usize> = HashMap::new();
    for (node, neighbors) in &graph {
        out_degree.insert(node.clone(), neighbors.len());
        in_degree.entry(node.clone()).or_insert(0);
        for nxt in neighbors {
            *in_degree.entry(nxt.clone()).or_insert(0) += 1;
        }
    }

    let mut start = graph.keys().next()?.clone();
    for node in graph.keys() {
        let out = *out_degree.get(node).unwrap_or(&0) as i64;
        let inn = *in_degree.get(node).unwrap_or(&0) as i64;
        if out - inn == 1 {
            start = node.clone();
            break;
        }
    }

    let mut ptr: HashMap<String, usize> = HashMap::new();
    let mut stack: Vec<String> = vec![start];
    let mut path: Vec<String> = Vec::new();
    let total_edges: usize = out_degree.values().sum();

    while let Some(node) = stack.last().cloned() {
        let neighbors = graph.get(&node).cloned().unwrap_or_default();
        let p = *ptr.get(&node).unwrap_or(&0);
        if p < neighbors.len() {
            ptr.insert(node.clone(), p + 1);
            stack.push(neighbors[p].clone());
        } else {
            path.push(node);
            stack.pop();
        }
    }

    path.reverse();
    if path.len() != total_edges + 1 {
        return None;
    }

    let mut genome = path[0].clone();
    for node in &path[1..] {
        genome.push(node.chars().last().unwrap());
    }
    Some(genome)
}
```

```csharp
static string? AssembleGenome(List<string> reads, int k)
{
    var kmers = new HashSet<string>();
    foreach (var read in reads)
    {
        for (int i = 0; i + k <= read.Length; i++) kmers.Add(read.Substring(i, k));
    }

    var graph = new Dictionary<string, List<string>>();
    foreach (var kmer in kmers)
    {
        string prefix = kmer.Substring(0, kmer.Length - 1);
        string suffix = kmer.Substring(1);
        if (!graph.ContainsKey(prefix)) graph[prefix] = new List<string>();
        graph[prefix].Add(suffix);
        if (!graph.ContainsKey(suffix)) graph[suffix] = new List<string>();
    }

    var outDegree = new Dictionary<string, int>();
    var inDegree = new Dictionary<string, int>();
    foreach (var (node, neighbors) in graph)
    {
        outDegree[node] = neighbors.Count;
        if (!inDegree.ContainsKey(node)) inDegree[node] = 0;
        foreach (var nxt in neighbors) inDegree[nxt] = inDegree.GetValueOrDefault(nxt, 0) + 1;
    }

    string start = graph.Keys.First();
    foreach (var node in graph.Keys)
    {
        if (outDegree.GetValueOrDefault(node, 0) - inDegree.GetValueOrDefault(node, 0) == 1)
        {
            start = node;
            break;
        }
    }

    var ptr = new Dictionary<string, int>();
    var stack = new List<string> { start };
    var path = new List<string>();
    int totalEdges = outDegree.Values.Sum();

    while (stack.Count > 0)
    {
        string node = stack[^1];
        var neighbors = graph.GetValueOrDefault(node, new List<string>());
        int p = ptr.GetValueOrDefault(node, 0);
        if (p < neighbors.Count)
        {
            ptr[node] = p + 1;
            stack.Add(neighbors[p]);
        }
        else
        {
            path.Add(node);
            stack.RemoveAt(stack.Count - 1);
        }
    }

    path.Reverse();
    if (path.Count != totalEdges + 1) return null;

    var genome = new System.Text.StringBuilder(path[0]);
    for (int i = 1; i < path.Count; i++) genome.Append(path[i][^1]);
    return genome.ToString();
}
```
