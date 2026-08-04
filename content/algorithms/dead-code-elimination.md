---
name: 不要コード除去(Dead Code Elimination)
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n)(nは命令数、データフロー解析込みでほぼ線形)
summary: 計算結果がその後どこからも使われない命令や、決して実行されない分岐を特定して取り除くことで、実行バイナリを軽量化するコンパイラ最適化。
---

## 概要

[定数畳み込み](/algorithms/constant-folding)などの最適化を経ると、「計算はしたが結果を誰も使わない」命令や、「条件が常に偽になることが判明し、二度と実行されない」コードブロックが残ることがある。不要コード除去は、こうした「実行しても意味のない、あるいは実行され得ない」コードを機械的に特定し、削除する最適化パスの総称である。単に無駄な計算時間を省くだけでなく、実行バイナリのサイズを縮小し、命令キャッシュの効率を高める効果もある。

## 仕組み

1. **到達不能コードの除去**: プログラムの制御フローグラフ(命令や基本ブロックとジャンプの繋がりを表すグラフ、[3番地コード生成](/algorithms/three-address-code-generation)の出力から構築する)上で、開始点から[BFS](/algorithms/bfs)や[DFS](/algorithms/dfs)のようなグラフ探索を行い、到達可能なブロックに印をつける。印がつかなかったブロックは、プログラムのどの実行経路をたどっても決して実行されないコードなので、丸ごと削除できる
2. **無駄な代入の除去**: 各変数について、「その値がこの後どこかで実際に読み取られるか」を表す**生存変数解析**(データフロー解析の一種、制御フローグラフを逆向きに辿りながら「この時点で生きている変数の集合」を不動点に達するまで反復計算する)を行う
3. ある命令`t = a op b`について、計算結果`t`がその後どこからも読み取られない(生存していない)ことが分かれば、この命令自体を実行しても副作用がない限り安全に削除できる
4. 1つの命令を削除すると、その命令が使っていたオペランド(`a`、`b`)の生存状況も変わり、さらに別の命令が不要になることがある——この連鎖を、これ以上削除できる命令がなくなるまで繰り返す

## 特性・トレードオフ

- **計算量**: 到達可能性解析(グラフ探索)は`O(頂点数+辺数)`、生存変数解析はデータフロー方程式を不動点まで反復するため制御フローグラフの構造に応じた反復回数がかかるが、実用上はほぼ線形時間で収束することが多い
- **副作用のある命令への注意**: 関数呼び出しやメモリへの書き込み、入出力操作のように「結果を使わなくても実行すること自体に意味がある(副作用がある)」命令は、生存変数解析の対象から除外し、削除してはならない。この判定を誤ると、プログラムの意味が変わってしまう危険な最適化になる
- **他の最適化との相乗効果**: [定数畳み込み](/algorithms/constant-folding)・定数伝播・共通部分式除去といった他の最適化パスが新たな不要コードを生み出すことが多く、これらの最適化パスと不要コード除去を繰り返し交互に適用することで、最適化の効果が雪だるま式に広がっていく——コンパイラの最適化パイプラインが複数パスを反復適用する設計になっている理由のひとつ
- **使いどころ**: ほぼ全ての実用コンパイラの最適化パイプラインに組み込まれる標準的な最適化。デバッグ用のコード(`if (DEBUG) {...}`のような、コンパイル時に判定できる条件分岐)を製品ビルドから自動的に取り除く用途としても実務でよく利用される

## 実装例

「到達不能ブロックの除去」(制御フローグラフをエントリからBFSして到達しない基本ブロックを除く)と、「無駄な代入の除去」(命令列を逆向きに辿る生存変数解析で使われない代入を消す)の2つを実装する。

```python
from collections import deque


class Instr:
    def __init__(self, dest: str | None, uses: list[str], has_side_effect: bool = False):
        self.dest = dest
        self.uses = uses
        self.has_side_effect = has_side_effect


def eliminate_dead_assignments(instrs: list[Instr], live_out: set[str]) -> list[Instr]:
    live = set(live_out)
    keep = [False] * len(instrs)
    for i in reversed(range(len(instrs))):
        instr = instrs[i]
        if instr.has_side_effect or (instr.dest is not None and instr.dest in live):
            keep[i] = True
            if instr.dest is not None:
                live.discard(instr.dest)
            live.update(instr.uses)
    return [instrs[i] for i in range(len(instrs)) if keep[i]]


def remove_unreachable_blocks(entry: str, successors: dict[str, list[str]]) -> set[str]:
    reachable = {entry}
    q = deque([entry])
    while q:
        u = q.popleft()
        for v in successors.get(u, []):
            if v not in reachable:
                reachable.add(v)
                q.append(v)
    return reachable
```

```typescript
interface Instr {
  dest: string | null;
  uses: string[];
  hasSideEffect: boolean;
}

function eliminateDeadAssignments(instrs: Instr[], liveOut: Set<string>): Instr[] {
  const live = new Set(liveOut);
  const keep = new Array(instrs.length).fill(false);
  for (let i = instrs.length - 1; i >= 0; i--) {
    const instr = instrs[i];
    if (instr.hasSideEffect || (instr.dest !== null && live.has(instr.dest))) {
      keep[i] = true;
      if (instr.dest !== null) live.delete(instr.dest);
      for (const u of instr.uses) live.add(u);
    }
  }
  return instrs.filter((_, i) => keep[i]);
}

function removeUnreachableBlocks(entry: string, successors: Record<string, string[]>): Set<string> {
  const reachable = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of successors[u] || []) {
      if (!reachable.has(v)) { reachable.add(v); queue.push(v); }
    }
  }
  return reachable;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <unordered_map>
#include <queue>
#include <optional>

struct Instr {
    std::optional<std::string> dest;
    std::vector<std::string> uses;
    bool hasSideEffect = false;
};

std::vector<Instr> eliminateDeadAssignments(const std::vector<Instr>& instrs, std::set<std::string> liveOut) {
    std::set<std::string> live = liveOut;
    std::vector<bool> keep(instrs.size(), false);
    for (int i = static_cast<int>(instrs.size()) - 1; i >= 0; i--) {
        const auto& instr = instrs[i];
        bool destLive = instr.dest.has_value() && live.count(*instr.dest) > 0;
        if (instr.hasSideEffect || destLive) {
            keep[i] = true;
            if (instr.dest.has_value()) live.erase(*instr.dest);
            for (const auto& u : instr.uses) live.insert(u);
        }
    }
    std::vector<Instr> result;
    for (size_t i = 0; i < instrs.size(); i++) if (keep[i]) result.push_back(instrs[i]);
    return result;
}

std::set<std::string> removeUnreachableBlocks(const std::string& entry,
                                               const std::unordered_map<std::string, std::vector<std::string>>& successors) {
    std::set<std::string> reachable = { entry };
    std::queue<std::string> q;
    q.push(entry);
    while (!q.empty()) {
        auto u = q.front(); q.pop();
        auto it = successors.find(u);
        if (it == successors.end()) continue;
        for (const auto& v : it->second) {
            if (reachable.insert(v).second) q.push(v);
        }
    }
    return reachable;
}
```

```rust
use std::collections::{HashMap, HashSet, VecDeque};

struct Instr {
    dest: Option<String>,
    uses: Vec<String>,
    has_side_effect: bool,
}

fn eliminate_dead_assignments(instrs: &[Instr], live_out: &HashSet<String>) -> Vec<usize> {
    let mut live: HashSet<String> = live_out.clone();
    let mut keep = vec![false; instrs.len()];
    for i in (0..instrs.len()).rev() {
        let instr = &instrs[i];
        let dest_live = instr.dest.as_ref().is_some_and(|d| live.contains(d));
        if instr.has_side_effect || dest_live {
            keep[i] = true;
            if let Some(d) = &instr.dest {
                live.remove(d);
            }
            for u in &instr.uses {
                live.insert(u.clone());
            }
        }
    }
    (0..instrs.len()).filter(|&i| keep[i]).collect()
}

fn remove_unreachable_blocks(entry: &str, successors: &HashMap<String, Vec<String>>) -> HashSet<String> {
    let mut reachable: HashSet<String> = HashSet::new();
    reachable.insert(entry.to_string());
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(entry.to_string());
    while let Some(u) = queue.pop_front() {
        if let Some(succs) = successors.get(&u) {
            for v in succs {
                if reachable.insert(v.clone()) {
                    queue.push_back(v.clone());
                }
            }
        }
    }
    reachable
}
```

```csharp
class Instr
{
    public string? Dest;
    public List<string> Uses;
    public bool HasSideEffect;
    public Instr(string? dest, List<string> uses, bool hasSideEffect = false)
    {
        Dest = dest; Uses = uses; HasSideEffect = hasSideEffect;
    }
}

static class DeadCodeElimination
{
    public static List<Instr> EliminateDeadAssignments(List<Instr> instrs, HashSet<string> liveOut)
    {
        var live = new HashSet<string>(liveOut);
        var keep = new bool[instrs.Count];
        for (int i = instrs.Count - 1; i >= 0; i--)
        {
            var instr = instrs[i];
            if (instr.HasSideEffect || (instr.Dest != null && live.Contains(instr.Dest)))
            {
                keep[i] = true;
                if (instr.Dest != null) live.Remove(instr.Dest);
                foreach (var u in instr.Uses) live.Add(u);
            }
        }
        var result = new List<Instr>();
        for (int i = 0; i < instrs.Count; i++) if (keep[i]) result.Add(instrs[i]);
        return result;
    }

    public static HashSet<string> RemoveUnreachableBlocks(string entry, Dictionary<string, List<string>> successors)
    {
        var reachable = new HashSet<string> { entry };
        var queue = new Queue<string>();
        queue.Enqueue(entry);
        while (queue.Count > 0)
        {
            var u = queue.Dequeue();
            if (successors.TryGetValue(u, out var succs))
            {
                foreach (var v in succs)
                {
                    if (reachable.Add(v)) queue.Enqueue(v);
                }
            }
        }
        return reachable;
    }
}
```
