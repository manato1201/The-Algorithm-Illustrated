---
name: DFA最小化(Hopcroftのアルゴリズム)
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(n log n)(Hopcroftのアルゴリズム、nは状態数)
summary: 「入力に対して区別できない状態」同士を繰り返し統合していくことで、同じ言語を認識する最小の状態数の決定性有限オートマトンを構築する手法。
---

## 概要

[部分集合構成法](/algorithms/subset-construction)で生成されるDFAは、同じ言語を認識するにもかかわらず、実際には不要に多くの状態を持っていることがある——2つの状態が「その状態以降、どんな入力を与えても全く同じ受理・拒否の振る舞いをする」なら、その2つは区別する必要がなく1つにまとめられる。DFA最小化は、こうした「区別できない状態」を体系的に発見して統合し、同じ言語を認識する状態数最小のDFAを構築する。1971年にジョン・ホップクロフトが発表した効率的なアルゴリズムは、素朴な`O(n²)`の手法を`O(n log n)`まで高速化し、今なお標準的に使われている。

## 仕組み

1. 全状態を、まず「受理状態」と「非受理状態」の2つのグループ(分割クラス)に分ける——受理状態か否かが違う状態は、明らかに区別できるため
2. 各分割クラスについて、「そのクラス内の全状態が、ある入力記号`a`について同じクラスへ遷移するか」を確認する。もし同じクラス内の状態同士が`a`で異なるクラスへ遷移するなら、それらは実は区別可能なので、そのクラスをさらに細かく分割する
3. Hopcroftのアルゴリズムは、この分割の細分化を効率的に行うために、処理待ちの「分割器」候補をキューで管理し、常に小さい方のクラスを使って残りのクラスをふるい分ける(「小さい方を処理する」という工夫が計算量を`O(n log n)`に抑える鍵になる)——2つに分かれた場合、必ず小さい方のサイズが元のサイズの半分以下になるため、1つの状態が処理対象になる回数が`O(log n)`回で抑えられる
4. これ以上どの分割クラスも細分化できなくなったら(不動点に達したら)、各分割クラスを1つの新しい状態としてまとめ、最小化されたDFAを構築する

## 特性・トレードオフ

- **計算量**: Hopcroftのアルゴリズムで`O(n log n)`(`n`は元のDFAの状態数)。素朴に全状態対について区別可能かどうかを直接判定する方法だと`O(n²)`かかるため、大きなDFAに対して明確な高速化になる
- **最小性の保証**: 得られるDFAは、同じ言語を認識する決定性有限オートマトンの中で状態数が最小であることが理論的に保証されている(最小DFAは同型を除いて一意に定まる)——これは単なるヒューリスティックな圧縮ではなく、数学的に最適な結果である
- **実行効率とメモリの両面での改善**: 状態数が減ることで、DFAをテーブルとして実装する際のメモリ使用量が減るだけでなく、命令キャッシュへの収まりが良くなるなど実行速度にも好影響を与えることが多い
- **使いどころ**: 字句解析器生成ツールにおける、[トンプソン構成法](/algorithms/thompson-construction)→[部分集合構成法](/algorithms/subset-construction)→DFA最小化という一連のパイプラインの最終段階。正規表現エンジンの内部最適化、モデル検査(有限状態システムの検証)における状態空間の圧縮にも応用される

## 実装例

分割精緻化法(Hopcroftのアルゴリズムの簡略版)によるDFA最小化を示す。「受理/非受理」の2分割から出発し、各記号での遷移先クラスが分割内で一致しなくなるまでクラスを細分化し続ける。

```python
def minimize_dfa(num_states: int, transitions: dict, accepting: set[int], alphabet: set[str], start: int):
    """分割精緻化法によるDFA最小化。戻り値は (新しい遷移, 新しい受理状態集合, 新しい状態数, 新しい開始状態)"""
    non_accepting = set(range(num_states)) - accepting
    # 1. 受理状態 / 非受理状態の2グループに分割する
    partition: list[set[int]] = [g for g in (accepting, non_accepting) if g]

    def target_class(state: int, symbol: str, classes: list[set[int]]):
        if (state, symbol) not in transitions:
            return -1  # 「遷移先なし」も1つのクラスとして扱う
        dst = transitions[(state, symbol)]
        for i, cls in enumerate(classes):
            if dst in cls:
                return i
        return None

    changed = True
    while changed:
        changed = False
        new_partition: list[set[int]] = []
        for group in partition:
            # 2. グループ内の状態を「各記号でどのクラスへ遷移するか」の signature ごとに細分化する
            buckets: dict[tuple, set[int]] = {}
            for state in group:
                signature = tuple(target_class(state, sym, partition) for sym in sorted(alphabet))
                buckets.setdefault(signature, set()).add(state)
            if len(buckets) > 1:
                changed = True
            new_partition.extend(buckets.values())
        partition = new_partition

    # 3. 不動点に達したら、各分割クラスを1つの新しい状態としてまとめる
    state_to_class = {state: i for i, group in enumerate(partition) for state in group}

    new_transitions = {
        (state_to_class[state], symbol): state_to_class[dst]
        for (state, symbol), dst in transitions.items()
    }
    new_accepting = {state_to_class[s] for s in accepting}
    new_start = state_to_class[start]
    return new_transitions, new_accepting, len(partition), new_start
```

```typescript
type MinResult = { transitions: Map<string, number>; accepting: Set<number>; numStates: number; start: number };

// 分割精緻化法によるDFA最小化。「受理/非受理」の2分割から出発し、区別できなくなるまで細分化する
function minimizeDfa(numStates: number, transitions: Map<string, number>, accepting: Set<number>, alphabet: Set<string>, start: number): MinResult {
  const nonAccepting = new Set<number>();
  for (let i = 0; i < numStates; i++) {
    if (!accepting.has(i)) nonAccepting.add(i);
  }
  // 1. 受理状態 / 非受理状態の2グループに分割する
  let partition: Set<number>[] = [accepting, nonAccepting].filter((g) => g.size > 0);

  const targetClass = (state: number, symbol: string, classes: Set<number>[]): number => {
    const dst = transitions.get(`${state}:${symbol}`);
    if (dst === undefined) return -1; // 「遷移先なし」も1つのクラスとして扱う
    return classes.findIndex((cls) => cls.has(dst));
  };

  const alphabetSorted = [...alphabet].sort();

  let changed = true;
  while (changed) {
    changed = false;
    const newPartition: Set<number>[] = [];
    for (const group of partition) {
      // 2. グループ内の状態を「各記号でどのクラスへ遷移するか」の signature ごとに細分化する
      const buckets = new Map<string, Set<number>>();
      for (const state of group) {
        const signature = alphabetSorted.map((sym) => targetClass(state, sym, partition)).join(",");
        if (!buckets.has(signature)) buckets.set(signature, new Set());
        buckets.get(signature)!.add(state);
      }
      if (buckets.size > 1) changed = true;
      newPartition.push(...buckets.values());
    }
    partition = newPartition;
  }

  // 3. 不動点に達したら、各分割クラスを1つの新しい状態としてまとめる
  const stateToClass = new Map<number, number>();
  partition.forEach((group, i) => {
    for (const state of group) stateToClass.set(state, i);
  });

  const newTransitions = new Map<string, number>();
  for (const [key, dst] of transitions) {
    const [stateStr, symbol] = key.split(":");
    newTransitions.set(`${stateToClass.get(Number(stateStr))}:${symbol}`, stateToClass.get(dst)!);
  }

  const newAccepting = new Set<number>();
  for (const s of accepting) newAccepting.add(stateToClass.get(s)!);

  return { transitions: newTransitions, accepting: newAccepting, numStates: partition.length, start: stateToClass.get(start)! };
}
```

```cpp
#include <vector>
#include <set>
#include <map>
#include <string>
#include <algorithm>

struct MinResult {
    std::map<std::pair<int, char>, int> transitions;
    std::set<int> accepting;
    int numStates;
    int start;
};

// 分割精緻化法によるDFA最小化。「受理/非受理」の2分割から出発し、区別できなくなるまで細分化する
MinResult minimizeDfa(int numStates, const std::map<std::pair<int, char>, int>& transitions,
                       const std::set<int>& accepting, const std::set<char>& alphabet, int start) {
    std::set<int> nonAccepting;
    for (int i = 0; i < numStates; i++) if (!accepting.count(i)) nonAccepting.insert(i);

    // 1. 受理状態 / 非受理状態の2グループに分割する
    std::vector<std::set<int>> partition;
    if (!accepting.empty()) partition.push_back(accepting);
    if (!nonAccepting.empty()) partition.push_back(nonAccepting);

    auto targetClass = [&](int state, char symbol, const std::vector<std::set<int>>& classes) -> int {
        auto it = transitions.find({state, symbol});
        if (it == transitions.end()) return -1; // 「遷移先なし」も1つのクラスとして扱う
        int dst = it->second;
        for (size_t i = 0; i < classes.size(); i++) {
            if (classes[i].count(dst)) return static_cast<int>(i);
        }
        return -2;
    };

    bool changed = true;
    while (changed) {
        changed = false;
        std::vector<std::set<int>> newPartition;
        for (const auto& group : partition) {
            // 2. グループ内の状態を「各記号でどのクラスへ遷移するか」の signature ごとに細分化する
            std::map<std::vector<int>, std::set<int>> buckets;
            for (int state : group) {
                std::vector<int> signature;
                for (char sym : alphabet) signature.push_back(targetClass(state, sym, partition));
                buckets[signature].insert(state);
            }
            if (buckets.size() > 1) changed = true;
            for (auto& [_, bucket] : buckets) newPartition.push_back(bucket);
        }
        partition = newPartition;
    }

    // 3. 不動点に達したら、各分割クラスを1つの新しい状態としてまとめる
    std::map<int, int> stateToClass;
    for (size_t i = 0; i < partition.size(); i++) {
        for (int state : partition[i]) stateToClass[state] = static_cast<int>(i);
    }

    MinResult result;
    result.numStates = static_cast<int>(partition.size());
    result.start = stateToClass[start];
    for (auto& [key, dst] : transitions) {
        result.transitions[{stateToClass[key.first], key.second}] = stateToClass[dst];
    }
    for (int s : accepting) result.accepting.insert(stateToClass[s]);
    return result;
}
```

```rust
use std::collections::{BTreeMap, BTreeSet, HashMap};

struct MinResult {
    transitions: HashMap<(usize, char), usize>,
    accepting: BTreeSet<usize>,
    num_states: usize,
    start: usize,
}

// 分割精緻化法によるDFA最小化。「受理/非受理」の2分割から出発し、区別できなくなるまで細分化する
fn minimize_dfa(
    num_states: usize,
    transitions: &HashMap<(usize, char), usize>,
    accepting: &BTreeSet<usize>,
    alphabet: &BTreeSet<char>,
    start: usize,
) -> MinResult {
    let non_accepting: BTreeSet<usize> = (0..num_states).filter(|s| !accepting.contains(s)).collect();

    // 1. 受理状態 / 非受理状態の2グループに分割する
    let mut partition: Vec<BTreeSet<usize>> = [accepting.clone(), non_accepting]
        .into_iter()
        .filter(|g| !g.is_empty())
        .collect();

    let target_class = |state: usize, symbol: char, classes: &[BTreeSet<usize>]| -> i32 {
        match transitions.get(&(state, symbol)) {
            None => -1, // 「遷移先なし」も1つのクラスとして扱う
            Some(&dst) => classes.iter().position(|c| c.contains(&dst)).map(|i| i as i32).unwrap_or(-2),
        }
    };

    loop {
        let mut changed = false;
        let mut new_partition = Vec::new();
        for group in &partition {
            // 2. グループ内の状態を「各記号でどのクラスへ遷移するか」の signature ごとに細分化する
            let mut buckets: BTreeMap<Vec<i32>, BTreeSet<usize>> = BTreeMap::new();
            for &state in group {
                let signature: Vec<i32> = alphabet.iter().map(|&sym| target_class(state, sym, &partition)).collect();
                buckets.entry(signature).or_default().insert(state);
            }
            if buckets.len() > 1 {
                changed = true;
            }
            new_partition.extend(buckets.into_values());
        }
        partition = new_partition;
        if !changed {
            break;
        }
    }

    // 3. 不動点に達したら、各分割クラスを1つの新しい状態としてまとめる
    let mut state_to_class = HashMap::new();
    for (i, group) in partition.iter().enumerate() {
        for &state in group {
            state_to_class.insert(state, i);
        }
    }

    let new_transitions = transitions
        .iter()
        .map(|(&(state, symbol), &dst)| ((state_to_class[&state], symbol), state_to_class[&dst]))
        .collect();
    let new_accepting = accepting.iter().map(|s| state_to_class[s]).collect();

    MinResult { transitions: new_transitions, accepting: new_accepting, num_states: partition.len(), start: state_to_class[&start] }
}
```

```csharp
class MinResult
{
    public Dictionary<(int, char), int> Transitions = new();
    public HashSet<int> Accepting = new();
    public int NumStates;
    public int Start;
}

static class DfaMinimizer
{
    // 分割精緻化法によるDFA最小化。「受理/非受理」の2分割から出発し、区別できなくなるまで細分化する
    public static MinResult Minimize(int numStates, Dictionary<(int, char), int> transitions, HashSet<int> accepting, HashSet<char> alphabet, int start)
    {
        var nonAccepting = new HashSet<int>(Enumerable.Range(0, numStates).Where(i => !accepting.Contains(i)));
        // 1. 受理状態 / 非受理状態の2グループに分割する
        var partition = new List<HashSet<int>> { accepting, nonAccepting }.Where(g => g.Count > 0).ToList();

        int TargetClass(int state, char symbol, List<HashSet<int>> classes)
        {
            if (!transitions.TryGetValue((state, symbol), out var dst)) return -1; // 「遷移先なし」も1つのクラスとして扱う
            for (int i = 0; i < classes.Count; i++) if (classes[i].Contains(dst)) return i;
            return -2;
        }

        var alphabetSorted = alphabet.OrderBy(c => c).ToList();

        bool changed = true;
        while (changed)
        {
            changed = false;
            var newPartition = new List<HashSet<int>>();
            foreach (var group in partition)
            {
                // 2. グループ内の状態を「各記号でどのクラスへ遷移するか」の signature ごとに細分化する
                var buckets = new Dictionary<string, HashSet<int>>();
                foreach (var state in group)
                {
                    var signature = string.Join(",", alphabetSorted.Select(sym => TargetClass(state, sym, partition)));
                    if (!buckets.TryGetValue(signature, out var bucket))
                    {
                        bucket = new HashSet<int>();
                        buckets[signature] = bucket;
                    }
                    bucket.Add(state);
                }
                if (buckets.Count > 1) changed = true;
                newPartition.AddRange(buckets.Values);
            }
            partition = newPartition;
        }

        // 3. 不動点に達したら、各分割クラスを1つの新しい状態としてまとめる
        var stateToClass = new Dictionary<int, int>();
        for (int i = 0; i < partition.Count; i++)
            foreach (var state in partition[i]) stateToClass[state] = i;

        var result = new MinResult { NumStates = partition.Count, Start = stateToClass[start] };
        foreach (var kv in transitions)
        {
            var (state, symbol) = kv.Key;
            result.Transitions[(stateToClass[state], symbol)] = stateToClass[kv.Value];
        }
        foreach (var s in accepting) result.Accepting.Add(stateToClass[s]);
        return result;
    }
}
```
