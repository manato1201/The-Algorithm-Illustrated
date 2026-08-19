---
name: 小から大へのマージ(Small-to-Large Merging, DSU on Tree)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n log n)
summary: 木の各部分木が持つデータ構造をマージする際、常にサイズの小さい方を大きい方へ統合することで、一見O(n²)に見える処理全体の計算量をO(n log n)に抑える汎用テクニック。
---

## 概要

木の各頂点について「自分を根とする部分木に含まれる値の種類数」のような、部分木単位の集計クエリに答えたい場面は多い。素朴には、各頂点で子の部分木の集合(ハッシュ集合など)を新しく作ってマージすればよいが、これを全頂点で愚直に行うとマージ操作の総コストがO(n²)に膨れ上がってしまう。小から大へのマージ(Small-to-Large Merging、競技プログラミングでは「DSU on Tree」とも呼ばれる)は、**2つの集合をマージするとき、常にサイズの小さい方を大きい方の中に1要素ずつ挿入する**という単純な方針を徹底するだけで、この総コストをO(n log n)まで落とせるという事実に基づくテクニックである。「小さい方を大きい方に吸収させる」という同じ発想は[Union-Find](/algorithms/union-find)のランクによる合併(union by rank/size)にも現れ、要素が併合されるたびにその要素が属する集合のサイズが最低でも2倍になるため、1つの要素が動かされる回数はたかだかO(log n)回に抑えられる、という共通の証明原理を持つ。

## 仕組み

木の各頂点`v`を根とする部分木のデータ(値の集合など)を、子から親へボトムアップにマージしていく典型的な流れは以下の通り。

1. 木を[DFS](/algorithms/dfs)で深さ優先に走査し、葉から順に処理していく(post-order)
2. 各頂点`v`で、複数の子の部分木データ(集合など)がすでに計算済みだとする。これらを1つにマージして`v`自身の部分木データにするとき、**子のデータ集合のうちサイズが最大のものを選び、それに他の(サイズが小さい)集合の要素を1つずつ挿入していく**。最大サイズの集合自体は作り直さず、そのまま使い回す(ポインタ・参照の付け替えだけで済ませる実装が典型的)
3. `v`自身の値も、選ばれた最大の集合に追加する
4. こうしてできた`v`の部分木データを使って、必要なクエリ(値の種類数、最頻値など)に答え、さらに親頂点でのマージに使う

**計算量がO(n log n)になる理由**: ある要素`x`が、あるマージ処理で「小さい方」の集合に属していたとして、その集合が吸収先に移されるとき、移動後の集合のサイズは**移動前の少なくとも2倍**になる(小さい方のサイズを`s`、吸収先のサイズを`s'≧s`とすると、結果は`s+s'≧2s`)。つまり要素`x`が「小さい方として移動させられる」回数は、部分木のサイズが2倍ずつ増えて最大`n`に達するまでの回数、すなわちO(log n)回が上限となる。全要素についてこれを足し合わせると、挿入操作の総回数はO(n log n)に収まる。

## 特性・トレードオフ

- **計算量**: 各挿入操作がO(1)〜O(log n)のデータ構造(ハッシュ集合、平衡二分探索木など)を使う場合、全体でO(n log n)〜O(n log²n)。素朴な「毎回新しい集合を作ってマージ」のO(n²)から大きく改善する
- **DSU on Treeとしての活用**: 「各頂点を根とする部分木に含まれる値の最頻値を求めよ」のようなオフラインクエリを、実際にはハッシュ集合を明示的にマージせず、**「軽い子から先に処理して情報を消し、重い子(heavy child)だけ情報を残して親に引き継ぐ」**という配列カウンタベースの実装(狭義のDSU on Tree)にすると、[重軽分解(Heavy-Light Decomposition)](/algorithms/heavy-light-decomposition)と同様に「各頂点は重い子への辺をたどる場合を除きO(log n)回しか再カウントされない」という性質を使い、メモリを抑えたままO(n log n)を達成できる
- **[Union-Find](/algorithms/union-find)との関係**: 「小さい方を大きい方に統合する」償却解析の考え方はUnion-Findのunion by sizeと本質的に同じで、要素の移動回数がO(log n)に抑えられる証明もほぼ共通している
- **実装の取り回し**: マージ可能な集合(ハッシュ集合・多重集合・BIT配列など)であればほぼそのまま適用できる汎用性の高さが利点。ただし「集合を作り直さず使い回す」実装(ポインタのやり取り)を丁寧に書かないと、意図せず毎回コピーが発生してO(n²)に戻ってしまう点に注意が必要
- **使いどころ**: 木の部分木ごとの値の種類数・最頻値クエリ、[永続セグメント木](/algorithms/persistent-segment-tree)や[重心分解](/algorithms/centroid-decomposition)と並ぶ木上のオフラインクエリ処理の定番、部分木単位で文字列や集合をマージしていく競技プログラミングの典型問題

## 実装例

木の各頂点を根とする部分木に含まれる「値の種類数」を、小から大へのマージで全頂点分まとめて求める例。

```python
from typing import Dict, List


def subtree_distinct_counts(n: int, parent: List[int], values: List[int]) -> List[int]:
    """
    n: 頂点数, parent[i]: 頂点iの親(根は-1), values[i]: 頂点iの値
    戻り値: 各頂点を根とする部分木に含まれる値の種類数
    """
    children: List[List[int]] = [[] for _ in range(n)]
    root = 0
    for v in range(n):
        if parent[v] == -1:
            root = v
        else:
            children[parent[v]].append(v)

    result = [0] * n
    # 各頂点の「所有する集合」: {値: 出現数}
    owned_set: List[Dict[int, int] | None] = [None] * n

    # 反復的な post-order DFS(再帰の深さ制限を回避)
    order: List[int] = []
    stack = [root]
    while stack:
        node = stack.pop()
        order.append(node)
        stack.extend(children[node])

    for node in reversed(order):
        my_set: Dict[int, int] = {values[node]: 1}
        for child in children[node]:
            child_set = owned_set[child]
            assert child_set is not None
            if len(child_set) > len(my_set):
                my_set, child_set = child_set, my_set
            for val, cnt in child_set.items():
                my_set[val] = my_set.get(val, 0) + cnt
            owned_set[child] = None  # 解放
        owned_set[node] = my_set
        result[node] = len(my_set)

    return result
```

```typescript
function subtreeDistinctCounts(
  n: number,
  parent: number[],
  values: number[],
): number[] {
  const children: number[][] = Array.from({ length: n }, () => []);
  let root = 0;
  for (let v = 0; v < n; v++) {
    if (parent[v] === -1) root = v;
    else children[parent[v]].push(v);
  }

  const result = new Array<number>(n).fill(0);
  const ownedSet: (Map<number, number> | null)[] = new Array(n).fill(null);

  // 反復的な post-order DFS
  const order: number[] = [];
  const stack: number[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    order.push(node);
    for (const c of children[node]) stack.push(c);
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    let mySet = new Map<number, number>([[values[node], 1]]);
    for (const child of children[node]) {
      let childSet = ownedSet[child]!;
      if (childSet.size > mySet.size) {
        [mySet, childSet] = [childSet, mySet];
      }
      for (const [val, cnt] of childSet) {
        mySet.set(val, (mySet.get(val) ?? 0) + cnt);
      }
      ownedSet[child] = null; // 解放
    }
    ownedSet[node] = mySet;
    result[node] = mySet.size;
  }

  return result;
}
```
