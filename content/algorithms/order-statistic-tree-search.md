---
name: 順序統計木による順位探索(Order Statistic Tree)
category: 探索
subcategory: 配列探索
complexity: O(log n)
summary: 平衡二分探索木の各ノードに部分木サイズを持たせ、「k番目に小さい値」や「値xの順位」をO(log n)で求められるようにした拡張データ構造。
---

## 概要

平衡二分探索木(赤黒木やAVL木)は「値の探索」「挿入」「削除」をO(log n)でこなせるが、そのままでは「全体の中で小さい方から何番目か(順位)」や「k番目に小さい値は何か」を知るには全走査が必要になる。順序統計木は、各ノードに**自分を根とする部分木に含まれる要素数(サイズ)**という1つの整数を追加で持たせるだけで、これらの「順位に関するクエリ」もO(log n)で解けるようにする拡張データ構造である。Cormen, Leiserson, Rivest, Steinの著書『アルゴリズムイントロダクション』で詳しく扱われていることでも知られる。

## 仕組み

1. 通常の平衡二分探索木(赤黒木など)を用意し、各ノードに追加フィールド `size`(自分を根とする部分木に含まれるノード数)を持たせる
2. 挿入・削除のたびに、影響を受けた祖先ノードすべての `size` を再計算して更新する(回転操作を行う際も回転後のノードのサイズを付け替える)
3. **k番目に小さい要素を探す(OS-SELECT)**:
   - 現在のノードの左部分木サイズを r とする
   - k == r+1 ならこのノードが答え
   - k <= r なら左部分木を再帰的に探索
   - k > r+1 なら k を (k - r - 1) に置き換えて右部分木を再帰的に探索
4. **値xの順位を求める(OS-RANK)**:
   - ルートから値xを探索しながら、通過した各ノードで「自分より左にある要素数」を積算していく
   - xに到達したら、積算値+1がxの順位になる

サイズという単一の集計値を各ノードに持たせるだけで、木の形を変えずに順位クエリが可能になる点が優雅さの核心である。

## 特性・トレードオフ

- **計算量**: 探索・挿入・削除・順位クエリ・k番目探索のいずれもO(log n)。平衡木の高さがO(log n)に保たれていることが前提
- **既存の平衡木への最小限の拡張**: 赤黒木やAVL木の実装に `size` フィールドと更新ロジックを1つ追加するだけで実現でき、木構造の回転ロジック自体は変更不要
- **単純な配列と比べた優位性**: ソート済み配列でもk番目探索はO(1)、順位探索はO(log n)で可能だが、**要素の挿入・削除がO(n)**になってしまう。順序統計木は挿入・削除も含めて全操作をO(log n)で統一できる点が動的な用途での強み
- **セグメント木との違い**: セグメント木は「区間に対する集約(合計・最大値など)」が得意だが、値の大小に基づく動的な順位管理には順序統計木(または累積和を使うBIT+二分探索)の方が自然に対応する
- **使いどころ**: リアルタイムの成績ランキング(k位の選手・スコアの順位を頻繁に更新しながら参照)、中央値を維持し続けるオンラインストリーム処理、データベースのインデックスにおける範囲・順位クエリ

## 実装例

```python
from __future__ import annotations


class OSNode:
    def __init__(self, key: int) -> None:
        self.key = key
        self.left: OSNode | None = None
        self.right: OSNode | None = None
        self.size = 1


def _size(node: OSNode | None) -> int:
    return node.size if node else 0


def _update(node: OSNode) -> None:
    node.size = 1 + _size(node.left) + _size(node.right)


def insert(node: OSNode | None, key: int) -> OSNode:
    """単純な二分探索木としての挿入(平衡化は省略、実運用では赤黒木等で置き換える)"""
    if node is None:
        return OSNode(key)
    if key < node.key:
        node.left = insert(node.left, key)
    else:
        node.right = insert(node.right, key)
    _update(node)
    return node


def os_select(node: OSNode | None, k: int) -> int | None:
    """k番目(1-indexed)に小さいキーを返す"""
    if node is None:
        return None
    r = _size(node.left) + 1
    if k == r:
        return node.key
    elif k < r:
        return os_select(node.left, k)
    else:
        return os_select(node.right, k - r)


def os_rank(node: OSNode | None, key: int) -> int:
    """キーの1-indexedでの順位を返す(見つからない場合は挿入位置相当の順位)"""
    rank = 0
    cur = node
    while cur is not None:
        if key < cur.key:
            cur = cur.left
        elif key > cur.key:
            rank += _size(cur.left) + 1
            cur = cur.right
        else:
            return rank + _size(cur.left) + 1
    return rank
```

```typescript
class OSNode {
  key: number;
  left: OSNode | null = null;
  right: OSNode | null = null;
  size = 1;

  constructor(key: number) {
    this.key = key;
  }
}

function sizeOf(node: OSNode | null): number {
  return node ? node.size : 0;
}

function update(node: OSNode): void {
  node.size = 1 + sizeOf(node.left) + sizeOf(node.right);
}

function insert(node: OSNode | null, key: number): OSNode {
  if (node === null) return new OSNode(key);
  if (key < node.key) node.left = insert(node.left, key);
  else node.right = insert(node.right, key);
  update(node);
  return node;
}

function osSelect(node: OSNode | null, k: number): number | null {
  if (node === null) return null;
  const r = sizeOf(node.left) + 1;
  if (k === r) return node.key;
  else if (k < r) return osSelect(node.left, k);
  else return osSelect(node.right, k - r);
}

function osRank(node: OSNode | null, key: number): number {
  let rank = 0;
  let cur = node;
  while (cur !== null) {
    if (key < cur.key) {
      cur = cur.left;
    } else if (key > cur.key) {
      rank += sizeOf(cur.left) + 1;
      cur = cur.right;
    } else {
      return rank + sizeOf(cur.left) + 1;
    }
  }
  return rank;
}
```
