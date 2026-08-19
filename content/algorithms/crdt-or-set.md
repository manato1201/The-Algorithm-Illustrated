---
name: CRDT(OR-Set, Observed-Remove Set)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(タグ数)(マージ操作)
summary: 集合への追加操作ごとに一意なタグを発行し、削除は「自ノードが観測済みのタグだけ」を対象にすることで、同時に発生した追加と削除が競合しても常に同じ結果へ収束させる集合型CRDT。
---

## 概要

[CRDT(G-Counter)](/algorithms/crdt-g-counter)は「増加のみ」の単純なカウンタでCRDTの基本原理(可換・結合・冪等なマージ)を示したが、現実のアプリケーションでは「集合に要素を追加したり削除したりする」機能が欲しい場面の方が多い。だが素朴に「追加した要素の集合」と「削除した要素の集合」を別々に持ち、両者の差分で最終的な中身を求めようとすると、同じ要素`e`に対して「あるノードでは`e`を追加した直後に、別のノードが(その追加を知らないまま)`e`を削除した」という同時実行の競合が起きたとき、削除操作が"どちらの追加を打ち消すべきか"を区別できず、意図しない挙動(削除したはずが復活する、追加したはずが消える)が生じてしまう。OR-Set(Observed-Remove Set)は、要素を追加するたびに一意なタグ(ノードIDとローカルカウンタの組や乱数UUIDなど)を発行し、削除操作は「そのノードが実際に観測済みのタグ」だけを対象にする、という設計でこの問題を解消する。同時に発生した「未観測の追加」と「削除」が衝突した場合は追加の側が生き残る(add-wins)という、直感的で予測可能な意味論を実現している。

## 仕組み

1. 集合の内部状態として、`(値, 一意なタグ)`のペアの集合(追加済み集合)を持つ。タグはシステム全体で衝突しない値(`(ノードID, ローカルカウンタ)`の組や乱数UUIDなど)を使う
2. **追加(add)**: 要素`e`を追加するとき、新しい一意なタグ`t`を生成し、`(e, t)`を追加済み集合に加える。同じ値`e`を複数回追加しても、その都度別のタグが発行されるため、複数の追加操作が互いに独立なものとして扱われる
3. **削除(remove)**: 要素`e`を削除するとき、そのノードが現在の状態から観測できる`e`に紐づく全てのタグ`{t1, t2, ...}`を集め、それらを「削除済みタグ」の集合に記録する。**このノードがまだ知らない(他ノードで並行して追加された)タグは削除の対象にならない**という点が、この仕組み全体の核心
4. **値の算出**: `(値, タグ)`が追加済み集合に存在し、かつそのタグが削除済み集合に含まれていない要素の値だけを集めたものが、現在の集合の中身になる
5. **マージ**: 2つのレプリカをマージするときは、追加済み集合同士の和集合、削除済みタグ集合同士の和集合をそれぞれ取るだけでよい。和集合は可換・結合的・冪等な操作なので、マージする順序に関わらず必ず同じ結果に収束する
6. 同時に「ノードAで`e`を削除」「ノードBで(Aの削除を知らずに)`e`を追加(新タグ`t_new`を発行)」が起きた場合、マージ後は`t_new`は削除済みタグに含まれていないため`e`は集合に残る——これが「追加が勝つ(add-wins)」性質であり、OR-Setが多くの実装で標準的に選ばれる理由になっている

## 特性・トレードオフ

- **計算量**: 追加は`O(1)`、削除はその要素に紐づく観測済みタグの本数分`O(k)`、マージは双方が保持するタグ集合の和集合を取るので`O(タグ総数)`
- **追加優先(add-wins)の直感性**: [CRDT(LWW-Register)](/algorithms/crdt-lww-register)がタイムスタンプの大小によって「後勝ち」を機械的に決めるのに対し、OR-Setは「まだ観測していない操作には触れない」という因果関係に基づくルールで競合を解決するため、同期した時計を必要とせず、「せっかく追加したデータが意図せず消える」という直感に反する事故を避けやすい
- **タグの蓄積という代償**: 削除された要素のタグも(削除済み集合として)保持し続ける必要があり、追加・削除を繰り返すワークロードでは内部状態が際限なく肥大化する(タームストーン問題)。実運用では、因果関係が確定した古いタグを刈り込む仕組み(バージョンベクタと組み合わせたガベージコレクションなど)が必要になる
- **[CRDT(G-Counter)](/algorithms/crdt-g-counter)との違い**: G-Counterは「単調増加する数値」しか扱えないが、OR-Setは「集合の要素そのものに対する追加・削除」というより汎用的な操作をサポートする——共同編集アプリのタグ付け・お気に入りリスト・ショッピングカートのような「メンバーシップ管理」に直接応用できる
- **使いどころ**: オフライン対応のToDoリストやお気に入り機能、共同編集ツールのコレクション型データ(コメントへのリアクション一覧など)、Riak・Redis Enterpriseのような分散データベースが提供する集合型データ構造、モバイルアプリの同期エンジン(Automerge, Yjsなど)の内部実装

## 実装例

```python
import itertools


class ORSet:
    def __init__(self, node_id: str):
        self.node_id = node_id
        self._counter = itertools.count()
        self.added: set[tuple[object, tuple[str, int]]] = set()
        self.removed: set[tuple[str, int]] = set()

    def _new_tag(self) -> tuple[str, int]:
        return (self.node_id, next(self._counter))

    def add(self, value) -> None:
        tag = self._new_tag()
        self.added.add((value, tag))

    def remove(self, value) -> None:
        # 現在このノードが観測できているタグだけを削除対象にする
        tags = {tag for v, tag in self.added if v == value}
        self.removed |= tags

    def contains(self, value) -> bool:
        return any(v == value and tag not in self.removed for v, tag in self.added)

    def values(self) -> set:
        return {v for v, tag in self.added if tag not in self.removed}

    def merge(self, other: "ORSet") -> None:
        # 追加済み集合・削除済みタグ集合それぞれの和集合を取るだけでよい
        self.added |= other.added
        self.removed |= other.removed
```

```typescript
type Tag = readonly [nodeId: string, seq: number];

function tagKey(tag: Tag): string {
  return `${tag[0]}:${tag[1]}`;
}

class ORSet<T> {
  private counter = 0;
  private added = new Map<string, { value: T; tag: Tag }>();
  private removed = new Set<string>();

  constructor(private nodeId: string) {}

  private newTag(): Tag {
    return [this.nodeId, this.counter++] as const;
  }

  add(value: T): void {
    const tag = this.newTag();
    this.added.set(tagKey(tag), { value, tag });
  }

  remove(value: T): void {
    // 現在このノードが観測できているタグだけを削除対象にする
    for (const { value: v, tag } of this.added.values()) {
      if (v === value) this.removed.add(tagKey(tag));
    }
  }

  contains(value: T): boolean {
    for (const { value: v, tag } of this.added.values()) {
      if (v === value && !this.removed.has(tagKey(tag))) return true;
    }
    return false;
  }

  values(): T[] {
    const result: T[] = [];
    for (const { value, tag } of this.added.values()) {
      if (!this.removed.has(tagKey(tag))) result.push(value);
    }
    return result;
  }

  merge(other: ORSet<T>): void {
    for (const [key, entry] of other.added) this.added.set(key, entry);
    for (const key of other.removed) this.removed.add(key);
  }
}
```
