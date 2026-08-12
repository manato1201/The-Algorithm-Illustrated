---
name: Fitchアルゴリズム(最節約法による祖先状態復元)
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O(n・k)(nは系統樹のノード数、kは配列長)
summary: 与えられた系統樹の各内部ノードに、子ノードの状態集合の共通部分(あれば)または和集合(なければ+1コスト)を割り当てながら葉から根へ辿ることで、その木で必要な最小の状態変化回数(最節約スコア)を1回の走査で計算する。
---

## 概要

[近隣結合法](/algorithms/neighbor-joining)や[UPGMA](/algorithms/upgma)は配列間の距離だけから系統樹の**形**を推定するが、系統樹が与えられたときに「その木の上で、祖先から子孫へどのように形質(塩基やアミノ酸)が変化してきたか」を推定する問題は別に存在する。最節約法(Maximum Parsimony)は「進化の過程で起きた変化の回数はできるだけ少ないはずだ」という原理に基づき、系統樹上の変化回数(節約スコア)が最小になるように祖先の状態を復元しようとする。Fitchアルゴリズムは、1971年にウォルター・フィッチが示した手法で、**根なし2分木の各内部ノードに、その子ノードたちの状態集合をボトムアップに(葉から根へ)伝播させながら組み合わせる**という単純な走査だけで、与えられた木構造のもとでの最小節約スコアを、厳密かつO(n・k)で計算できる。

## 仕組み

1. 系統樹の各葉ノードに、観測された形質の状態(例えば、その位置の塩基"A"、"T"など)を単一要素の集合として割り当てる
2. 木を**葉から根に向かって(ボトムアップに)** 走査し、各内部ノード`v`について、その2つの子ノード`left`, `right`の状態集合`S(left)`, `S(right)`を使って`S(v)`を決める:
   - `S(left)`と`S(right)`の**共通部分が空でなければ**、`S(v) = S(left) ∩ S(right)`とする(このノードでは変化が起きなかったと仮定できる)
   - **共通部分が空であれば**、`S(v) = S(left) ∪ S(right)`とし、**節約スコアを1増やす**(このノードのどちらかの枝で、状態変化が最低1回起きたことが避けられない)
3. 根まで到達したら、その時点での累積コストが、この木構造のもとでの**最小節約スコア(必要な最小変化回数)**となる
4. 祖先状態を具体的に1つ選びたい場合は、根から葉に向かって(トップダウンに)再度走査し、各ノードの状態集合`S(v)`の中から、親ノードで選ばれた状態と一致するものがあればそれを優先して選ぶ、という手順で具体的な状態の割り当てを復元する

## 特性・トレードオフ

- **木の形が与えられれば厳密かつ高速**: Fitchアルゴリズムは、系統樹の「形」自体は既知であるという前提のもとでは、最小節約スコアを近似ではなく厳密に、しかも木のサイズに対して線形の計算量で求められる。動的計画法の考え方を系統樹という木構造に適用した典型例である
- **[最大節約法](/algorithms/maximum-parsimony)における評価関数としての役割**: 実際に「どの系統樹の形が最も節約的か」を探索する最大節約法では、無数にありうる木の形の候補それぞれについて節約スコアを評価する必要があり、Fitchアルゴリズムはこの評価関数の役割を担う。木の形の探索自体は、候補が膨大になるためヒューリスティックな探索(分岐限定法や局所探索)に頼ることになる
- **祖先状態の一意性が保証されない場合がある**: 共通部分を取る操作は複数の解釈を許すことがあり(状態集合が複数要素を持つ場合)、祖先状態の復元は必ずしも一意には定まらない。実務では複数の最節約解が存在しうることを踏まえた解釈が必要になる
- **使いどころ**: 分子系統学における祖先配列の推定、形質進化の変化回数の評価、[最大節約法](/algorithms/maximum-parsimony)や[ブートストラップ法](/algorithms/bootstrap-phylogeny)による系統樹探索の内部で使われる評価関数、言語学における語族の系統推定(生物学以外への応用例)

## 実装例

```python
from dataclasses import dataclass, field

@dataclass
class TreeNode:
    name: str
    left: "TreeNode | None" = None
    right: "TreeNode | None" = None
    state: str | None = None  # 葉ノードのみ設定
    state_set: set[str] = field(default_factory=set)

def fitch_algorithm(root: TreeNode) -> tuple[int, TreeNode]:
    cost = [0]

    def recurse(node: TreeNode) -> set[str]:
        if node.left is None and node.right is None:
            node.state_set = {node.state}
            return node.state_set

        left_set = recurse(node.left)
        right_set = recurse(node.right)
        intersection = left_set & right_set
        if intersection:
            node.state_set = intersection
        else:
            node.state_set = left_set | right_set
            cost[0] += 1
        return node.state_set

    recurse(root)
    return cost[0], root
```

```typescript
type TreeNode = {
  name: string;
  left: TreeNode | null;
  right: TreeNode | null;
  state: string | null;
  stateSet: Set<string>;
};

function fitchAlgorithm(root: TreeNode): number {
  let cost = 0;

  function recurse(node: TreeNode): Set<string> {
    if (node.left === null && node.right === null) {
      node.stateSet = new Set([node.state!]);
      return node.stateSet;
    }

    const leftSet = recurse(node.left!);
    const rightSet = recurse(node.right!);
    const intersection = new Set([...leftSet].filter((s) => rightSet.has(s)));

    if (intersection.size > 0) {
      node.stateSet = intersection;
    } else {
      node.stateSet = new Set([...leftSet, ...rightSet]);
      cost++;
    }
    return node.stateSet;
  }

  recurse(root);
  return cost;
}
```

```cpp
#include <set>
#include <string>
#include <memory>

struct TreeNode {
    std::string name;
    std::shared_ptr<TreeNode> left, right;
    std::string state;
    std::set<std::string> stateSet;
};

std::set<std::string> fitchRecurse(std::shared_ptr<TreeNode> node, int& cost) {
    if (!node->left && !node->right) {
        node->stateSet = {node->state};
        return node->stateSet;
    }

    auto leftSet = fitchRecurse(node->left, cost);
    auto rightSet = fitchRecurse(node->right, cost);

    std::set<std::string> intersection;
    for (auto& s : leftSet) if (rightSet.count(s)) intersection.insert(s);

    if (!intersection.empty()) {
        node->stateSet = intersection;
    } else {
        node->stateSet = leftSet;
        for (auto& s : rightSet) node->stateSet.insert(s);
        cost++;
    }
    return node->stateSet;
}

int fitchAlgorithm(std::shared_ptr<TreeNode> root) {
    int cost = 0;
    fitchRecurse(root, cost);
    return cost;
}
```

```rust
use std::collections::HashSet;

struct TreeNode {
    name: String,
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
    state: Option<String>,
    state_set: HashSet<String>,
}

fn fitch_recurse(node: &mut TreeNode, cost: &mut i32) -> HashSet<String> {
    if node.left.is_none() && node.right.is_none() {
        node.state_set = [node.state.clone().unwrap()].into_iter().collect();
        return node.state_set.clone();
    }

    let left_set = fitch_recurse(node.left.as_mut().unwrap(), cost);
    let right_set = fitch_recurse(node.right.as_mut().unwrap(), cost);

    let intersection: HashSet<String> = left_set.intersection(&right_set).cloned().collect();
    if !intersection.is_empty() {
        node.state_set = intersection;
    } else {
        node.state_set = left_set.union(&right_set).cloned().collect();
        *cost += 1;
    }
    node.state_set.clone()
}

fn fitch_algorithm(root: &mut TreeNode) -> i32 {
    let mut cost = 0;
    fitch_recurse(root, &mut cost);
    cost
}
```

```csharp
class TreeNode
{
    public string Name = "";
    public TreeNode? Left, Right;
    public string? State;
    public HashSet<string> StateSet = new();
}

static class Fitch
{
    static HashSet<string> Recurse(TreeNode node, ref int cost)
    {
        if (node.Left == null && node.Right == null)
        {
            node.StateSet = new HashSet<string> { node.State! };
            return node.StateSet;
        }

        var leftSet = Recurse(node.Left!, ref cost);
        var rightSet = Recurse(node.Right!, ref cost);
        var intersection = new HashSet<string>(leftSet);
        intersection.IntersectWith(rightSet);

        if (intersection.Count > 0)
        {
            node.StateSet = intersection;
        }
        else
        {
            node.StateSet = new HashSet<string>(leftSet);
            node.StateSet.UnionWith(rightSet);
            cost++;
        }
        return node.StateSet;
    }

    public static int FitchAlgorithm(TreeNode root)
    {
        int cost = 0;
        Recurse(root, ref cost);
        return cost;
    }
}
```
