---
name: GOAP(目標指向型行動計画)
category: キャラクターAI・空間AI
subcategory: ビヘイビア制御
complexity: O(b^d)(bは1状態あたりの行動候補数、dは計画の深さ、A*探索の場合は実用上大幅に改善)
summary: 「実行したい目標」と「各行動の事前条件・事後効果」だけを定義しておき、目標達成までの行動列をA*探索のように自動で組み立てることで、状況ごとの行動パターンを手作業で書く必要をなくす。
---

## 概要

[ビヘイビアツリー](/algorithms/behavior-tree)や[階層型有限状態機械(HFSM)](/algorithms/hierarchical-fsm)は、開発者が「どんな状況でどう行動するか」をあらかじめ木や状態遷移として明示的に設計する。しかし状況の組み合わせが増えるほど、あり得る全パターンを手作業で書き尽くすのは困難になる。GOAP(Goal-Oriented Action Planning、目標指向型行動計画)は発想を転換し、開発者は**「達成したい目標」と「個々の行動が持つ事前条件・事後効果」だけ**を定義しておき、目標を満たすための具体的な行動の並び(プラン)は実行時にAIが**自動で探索して組み立てる**。2005年の『F.E.A.R.』での採用によって広く知られるようになり、状況が複雑なほど手動でのシナリオ設計より少ない記述量でAIを構築できる利点がある。

## 仕組み

1. **世界状態(World State)**: 「敵が見えるか」「弾薬があるか」「体力が十分か」のような、真偽値の集合として現在の状況を表す
2. **行動(Action)**: 各行動は「この世界状態が満たされていれば実行できる(事前条件)」「実行するとこの世界状態がこう変化する(事後効果)」というペアで定義される(例:「攻撃する」行動の事前条件は「敵が見える∧弾薬がある」、事後効果は「敵の体力が減る」)。各行動にはコスト(実行にかかる手間や時間)も設定する
3. **目標(Goal)**: 「敵が死んでいる」のように、達成したい世界状態を指定する
4. **プランニング**: 現在の世界状態を開始ノード、目標を満たす世界状態を終了ノードとして、[A*探索](/algorithms/a-star)と同様の手法でグラフ探索を行う。ここでのグラフの「辺」は行動であり、ある世界状態から、事前条件を満たす行動を1つ適用すると事後効果が反映された次の世界状態に遷移する、という形でグラフが動的に展開される
5. 探索によって「目標を満たすまでの、コストが最小の行動列」が見つかれば、それが実行すべきプランとなる。プランが見つからない場合や、実行中に前提が崩れた場合は再プランニングを行う
6. 見つかったプランに従って行動を1つずつ実行し、各行動が完了するたびに世界状態を更新して次の行動に進む

## 特性・トレードオフ

- **シナリオを手書きせずに多様な行動パターンが生まれる**: 「弾薬がなければ、まず弾薬を拾う行動を挟んでから攻撃する」といった行動の組み合わせを、開発者が明示的にシナリオとして書かなくても、行動の事前条件・事後効果の定義だけから自動的に導出される。行動の種類が増えるほど、組み合わせによって開発者が想定していなかった賢い振る舞いが創発することもある
- **プランニングの計算コスト**: 行動の種類・世界状態の項目数が増えるほど探索空間が広がり、リアルタイム性が求められるゲームでは計算コストが問題になりうる。実務ではA*のヒューリスティック関数の工夫、プランのキャッシュ、行動の粒度を適切に保つといった最適化が重要になる
- **[ビヘイビアツリー](/algorithms/behavior-tree)との比較**: ビヘイビアツリーは開発者が行動の優先順位を明示的に木として設計するのに対し、GOAPは行動の組み合わせ方をAI自身に探索させる。前者は挙動の予測・デバッグがしやすく、後者は状況の多様性への対応力が高いというトレードオフがあり、実務では両者を組み合わせる設計(高レベルの目標選択はビヘイビアツリー、目標達成の手段はGOAPに任せる)も見られる
- **使いどころ**: FPS/ステルスゲームの高度な敵AI(『F.E.A.R.』『Fallout』シリーズなど)、複数の目標が競合しうるシミュレーションゲームのNPC行動計画、ロボティクスのタスクプランニング(STRIPSと呼ばれる古典的なAI計画手法がGOAPの理論的なルーツ)

## 実装例

```python
from dataclasses import dataclass, field
import heapq

WorldState = frozenset[tuple[str, bool]]

@dataclass
class Action:
    name: str
    preconditions: dict[str, bool]
    effects: dict[str, bool]
    cost: float = 1.0

    def is_valid(self, state: dict[str, bool]) -> bool:
        return all(state.get(k) == v for k, v in self.preconditions.items())

    def apply(self, state: dict[str, bool]) -> dict[str, bool]:
        new_state = dict(state)
        new_state.update(self.effects)
        return new_state

def state_key(state: dict[str, bool]) -> WorldState:
    return frozenset(state.items())

def goap_plan(
    start_state: dict[str, bool], goal: dict[str, bool], actions: list[Action],
) -> list[str] | None:
    def satisfies_goal(state: dict[str, bool]) -> bool:
        return all(state.get(k) == v for k, v in goal.items())

    counter = 0
    frontier = [(0.0, counter, start_state, [])]
    visited: set[WorldState] = set()

    while frontier:
        cost, _, state, path = heapq.heappop(frontier)
        key = state_key(state)
        if key in visited:
            continue
        visited.add(key)

        if satisfies_goal(state):
            return path

        for action in actions:
            if action.is_valid(state):
                next_state = action.apply(state)
                if state_key(next_state) not in visited:
                    counter += 1
                    heapq.heappush(frontier, (cost + action.cost, counter, next_state, path + [action.name]))
    return None
```

```typescript
type WorldState = Record<string, boolean>;

type Action = {
  name: string;
  preconditions: Partial<WorldState>;
  effects: Partial<WorldState>;
  cost: number;
};

function isValid(action: Action, state: WorldState): boolean {
  return Object.entries(action.preconditions).every(([k, v]) => state[k] === v);
}

function apply(action: Action, state: WorldState): WorldState {
  return { ...state, ...action.effects };
}

function stateKey(state: WorldState): string {
  return JSON.stringify(Object.entries(state).sort());
}

function goapPlan(
  startState: WorldState,
  goal: Partial<WorldState>,
  actions: Action[],
): string[] | null {
  const satisfiesGoal = (state: WorldState) =>
    Object.entries(goal).every(([k, v]) => state[k] === v);

  type Node = { cost: number; state: WorldState; path: string[] };
  const frontier: Node[] = [{ cost: 0, state: startState, path: [] }];
  const visited = new Set<string>();

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const { cost, state, path } = frontier.shift()!;
    const key = stateKey(state);
    if (visited.has(key)) continue;
    visited.add(key);

    if (satisfiesGoal(state)) return path;

    for (const action of actions) {
      if (isValid(action, state)) {
        const nextState = apply(action, state);
        if (!visited.has(stateKey(nextState))) {
          frontier.push({
            cost: cost + action.cost,
            state: nextState,
            path: [...path, action.name],
          });
        }
      }
    }
  }
  return null;
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <set>
#include <optional>
#include <queue>
#include <algorithm>

using WorldState = std::map<std::string, bool>;

struct Action {
    std::string name;
    WorldState preconditions;
    WorldState effects;
    double cost;

    bool isValid(const WorldState& state) const {
        for (auto& [k, v] : preconditions) {
            auto it = state.find(k);
            if (it == state.end() || it->second != v) return false;
        }
        return true;
    }

    WorldState apply(const WorldState& state) const {
        WorldState next = state;
        for (auto& [k, v] : effects) next[k] = v;
        return next;
    }
};

std::optional<std::vector<std::string>> goapPlan(
    const WorldState& startState, const WorldState& goal, const std::vector<Action>& actions) {
    auto satisfiesGoal = [&](const WorldState& state) {
        for (auto& [k, v] : goal) {
            auto it = state.find(k);
            if (it == state.end() || it->second != v) return false;
        }
        return true;
    };

    struct Node { double cost; WorldState state; std::vector<std::string> path;
        bool operator>(const Node& o) const { return cost > o.cost; } };
    std::priority_queue<Node, std::vector<Node>, std::greater<>> frontier;
    frontier.push({0.0, startState, {}});
    std::set<WorldState> visited;

    while (!frontier.empty()) {
        Node node = frontier.top(); frontier.pop();
        if (visited.count(node.state)) continue;
        visited.insert(node.state);

        if (satisfiesGoal(node.state)) return node.path;

        for (auto& action : actions) {
            if (action.isValid(node.state)) {
                WorldState next = action.apply(node.state);
                if (!visited.count(next)) {
                    auto newPath = node.path;
                    newPath.push_back(action.name);
                    frontier.push({node.cost + action.cost, next, newPath});
                }
            }
        }
    }
    return std::nullopt;
}
```

```rust
use std::collections::{BTreeMap, BinaryHeap, HashSet};
use std::cmp::Ordering;

type WorldState = BTreeMap<String, bool>;

struct Action {
    name: String,
    preconditions: WorldState,
    effects: WorldState,
    cost: i64,
}

impl Action {
    fn is_valid(&self, state: &WorldState) -> bool {
        self.preconditions.iter().all(|(k, v)| state.get(k) == Some(v))
    }
    fn apply(&self, state: &WorldState) -> WorldState {
        let mut next = state.clone();
        for (k, v) in &self.effects {
            next.insert(k.clone(), *v);
        }
        next
    }
}

#[derive(Eq, PartialEq)]
struct Node { cost: i64, state: WorldState, path: Vec<String> }
impl Ord for Node {
    fn cmp(&self, other: &Self) -> Ordering { other.cost.cmp(&self.cost) }
}
impl PartialOrd for Node {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }
}

fn goap_plan(start_state: WorldState, goal: &WorldState, actions: &[Action]) -> Option<Vec<String>> {
    let satisfies_goal = |state: &WorldState| goal.iter().all(|(k, v)| state.get(k) == Some(v));

    let mut frontier = BinaryHeap::new();
    frontier.push(Node { cost: 0, state: start_state, path: vec![] });
    let mut visited: HashSet<WorldState> = HashSet::new();

    while let Some(node) = frontier.pop() {
        if visited.contains(&node.state) {
            continue;
        }
        visited.insert(node.state.clone());

        if satisfies_goal(&node.state) {
            return Some(node.path);
        }

        for action in actions {
            if action.is_valid(&node.state) {
                let next_state = action.apply(&node.state);
                if !visited.contains(&next_state) {
                    let mut new_path = node.path.clone();
                    new_path.push(action.name.clone());
                    frontier.push(Node { cost: node.cost + action.cost, state: next_state, path: new_path });
                }
            }
        }
    }
    None
}
```

```csharp
using WorldState = System.Collections.Generic.SortedDictionary<string, bool>;

class GoapAction
{
    public string Name = "";
    public Dictionary<string, bool> Preconditions = new();
    public Dictionary<string, bool> Effects = new();
    public double Cost = 1.0;

    public bool IsValid(WorldState state) => Preconditions.All(kv => state.TryGetValue(kv.Key, out var v) && v == kv.Value);

    public WorldState Apply(WorldState state)
    {
        var next = new WorldState(state);
        foreach (var kv in Effects) next[kv.Key] = kv.Value;
        return next;
    }
}

static class Goap
{
    public static List<string>? Plan(WorldState startState, Dictionary<string, bool> goal, List<GoapAction> actions)
    {
        bool SatisfiesGoal(WorldState state) => goal.All(kv => state.TryGetValue(kv.Key, out var v) && v == kv.Value);

        var frontier = new List<(double cost, WorldState state, List<string> path)> { (0, startState, new List<string>()) };
        var visited = new HashSet<string>();

        while (frontier.Count > 0)
        {
            frontier.Sort((a, b) => a.cost.CompareTo(b.cost));
            var (cost, state, path) = frontier[0];
            frontier.RemoveAt(0);
            string key = string.Join(",", state.Select(kv => $"{kv.Key}={kv.Value}"));
            if (!visited.Add(key)) continue;

            if (SatisfiesGoal(state)) return path;

            foreach (var action in actions)
            {
                if (action.IsValid(state))
                {
                    var next = action.Apply(state);
                    var newPath = new List<string>(path) { action.Name };
                    frontier.Add((cost + action.Cost, next, newPath));
                }
            }
        }
        return null;
    }
}
```
