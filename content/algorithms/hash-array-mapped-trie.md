---
name: ハッシュ配列マップ木(Hash Array Mapped Trie, HAMT)
category: 探索
subcategory: 配列探索
complexity: O(log₃₂ n) ≈ O(1)(実用上定数とみなせる)
summary: キーのハッシュ値を数ビットずつに区切ってトライ木を辿ることで、変更しても元の木を丸ごとコピーせずに済む「永続的」なハッシュマップを実現する探索構造。
---

## 概要

Clojure、Scala、Elixirといった関数型プログラミング言語では、「一度作ったデータ構造は変更しない(イミュータブル)」という原則の下で、それでも効率よく更新済みの新しいバージョンを作りたいという要求がある。ハッシュ配列マップ木(HAMT)は、Phil Baglerが2000年頃に発表したアイデアを基に、**キーのハッシュ値を5ビットずつ(32分岐)に区切ってトライ木のように辿る**ことで、通常のハッシュテーブルに匹敵する高速な探索を実現しつつ、更新時には変更が及んだパス上のノードだけを複製すればよい「構造共有」を可能にした探索構造である。

## 仕組み

1. キーをハッシュ関数にかけ、32ビット(または64ビット)のハッシュ値を得る
2. ハッシュ値を先頭から5ビットずつのチャンクに分割する(1チャンクは0〜31の値を取り、32分岐の枝番号に対応する)
3. ルートノードから、最初の5ビットを使って32個の子ノードスロットのうち該当する枝を選ぶ
4. その枝を辿った先のノードで、次の5ビットを使ってさらに枝を選ぶ——これを、目的のキーに到達する(または空きスロットに当たる)まで繰り返す
5. 各ノードは実際に使われているスロットだけを保持するために**ビットマップ**(32ビットの整数で「どのスロットが埋まっているか」を記録)を持ち、疎な配列を効率よく表現する
6. **更新(挿入・削除)時**: ルートから対象のキーまでのパス上にあるノードだけを新しく複製し、それ以外の変更されていない部分木は元の木とそのまま共有する。これにより1回の更新がO(log₃₂ n)の複製コストで完了し、古いバージョンの木も(参照が残っていれば)そのまま有効であり続ける

## 特性・トレードオフ

- **計算量**: ハッシュ値が32ビットなら木の深さは高々7段(32^7 > 2^32)程度に収まるため、探索・挿入・削除はO(log₃₂ n)——実用上はほぼO(1)とみなせる速さになる
- **永続性(Persistent)が最大の特徴**: 更新のたびにパス上のノードだけをコピーする「構造共有」により、変更前のバージョンを保持したまま新バージョンを作れる。Undo履歴の保持や、並行処理におけるロックフリーな読み取りに向く
- **通常のハッシュテーブルとのトレードオフ**: 単純な配列ベースのハッシュテーブルはメモリ局所性で有利だが可変(mutable)。HAMTはポインタを辿るためキャッシュ効率はやや劣るが、イミュータブルなAPIと構造共有によるメモリ効率(全体をコピーしなくて済む)を得られる
- **ビットマップによる疎な表現**: 各ノードが「32分岐すべて」を確保するのではなく、実際に使われている枝の数だけ配列を持つことで、メモリの無駄を抑えている(popcountでスロット位置を計算する)
- **使いどころ**: Clojureのpersistent map/vector、ScalaのHashMap/HashSet、Elixir/ErlangのMapの内部実装、関数型言語やイミュータブルデータを重視するアプリケーションでの高速な連想配列

## 実装例

```python
from __future__ import annotations

BITS = 5
WIDTH = 1 << BITS  # 32
MASK = WIDTH - 1


class HAMTNode:
    def __init__(self) -> None:
        self.bitmap = 0
        self.children: list[HAMTNode | tuple[int, object]] = []

    def clone(self) -> "HAMTNode":
        new = HAMTNode()
        new.bitmap = self.bitmap
        new.children = list(self.children)
        return new


def _index_in_children(bitmap: int, bit: int) -> int:
    # 自分より下位のビットの立っている数(popcount)がスロット内の位置になる
    return bin(bitmap & (bit - 1)).count("1")


def hamt_get(root: HAMTNode | None, key: int, hash_val: int | None = None, shift: int = 0) -> object | None:
    if hash_val is None:
        hash_val = hash(key)
    node = root
    while node is not None:
        frag = (hash_val >> shift) & MASK
        bit = 1 << frag
        if not (node.bitmap & bit):
            return None
        idx = _index_in_children(node.bitmap, bit)
        entry = node.children[idx]
        if isinstance(entry, tuple):
            k, v = entry
            return v if k == key else None
        node = entry
        shift += BITS
    return None


def hamt_insert(root: HAMTNode | None, key: int, value: object) -> HAMTNode:
    """変更が及ぶパスのみを複製し、それ以外は元の木と共有する"""
    hash_val = hash(key)

    def go(node: HAMTNode | None, shift: int) -> HAMTNode:
        new_node = node.clone() if node is not None else HAMTNode()
        frag = (hash_val >> shift) & MASK
        bit = 1 << frag
        idx = _index_in_children(new_node.bitmap, bit)

        if not (new_node.bitmap & bit):
            new_node.bitmap |= bit
            new_node.children.insert(idx, (key, value))
            return new_node

        entry = new_node.children[idx]
        if isinstance(entry, tuple):
            k, _ = entry
            if k == key:
                new_node.children[idx] = (key, value)
                return new_node
            # 衝突: サブノードへ昇格させて両方のキーを再配置する(簡略化した実装)
            sub = HAMTNode()
            sub = go(sub, shift + BITS)
            new_node.children[idx] = sub
            return new_node

        new_node.children[idx] = go(entry, shift + BITS)
        return new_node

    return go(root, 0)
```

```typescript
const BITS = 5;
const WIDTH = 1 << BITS; // 32
const MASK = WIDTH - 1;

type Entry = { key: number; value: unknown };

class HAMTNode {
  bitmap = 0;
  children: (HAMTNode | Entry)[] = [];

  clone(): HAMTNode {
    const n = new HAMTNode();
    n.bitmap = this.bitmap;
    n.children = [...this.children];
    return n;
  }
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function indexInChildren(bitmap: number, bit: number): number {
  return popcount(bitmap & (bit - 1));
}

function hamtGet(root: HAMTNode | null, key: number, hashVal: number): unknown | undefined {
  let node = root;
  let shift = 0;
  while (node !== null) {
    const frag = (hashVal >>> shift) & MASK;
    const bit = 1 << frag;
    if (!(node.bitmap & bit)) return undefined;
    const idx = indexInChildren(node.bitmap, bit);
    const entry = node.children[idx];
    if ("key" in entry) {
      return entry.key === key ? entry.value : undefined;
    }
    node = entry;
    shift += BITS;
  }
  return undefined;
}

function hamtInsert(root: HAMTNode | null, key: number, value: unknown, hashVal: number): HAMTNode {
  function go(node: HAMTNode | null, shift: number): HAMTNode {
    const newNode = node ? node.clone() : new HAMTNode();
    const frag = (hashVal >>> shift) & MASK;
    const bit = 1 << frag;
    const idx = indexInChildren(newNode.bitmap, bit);

    if (!(newNode.bitmap & bit)) {
      newNode.bitmap |= bit;
      newNode.children.splice(idx, 0, { key, value });
      return newNode;
    }

    const entry = newNode.children[idx];
    if ("key" in entry) {
      if (entry.key === key) {
        newNode.children[idx] = { key, value };
        return newNode;
      }
      // 衝突: サブノードへ昇格(簡略化した実装)
      const sub = go(new HAMTNode(), shift + BITS);
      newNode.children[idx] = sub;
      return newNode;
    }

    newNode.children[idx] = go(entry, shift + BITS);
    return newNode;
  }

  return go(root, 0);
}
```
