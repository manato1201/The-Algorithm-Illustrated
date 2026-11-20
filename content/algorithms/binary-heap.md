---
name: 二分ヒープ(優先度付きキュー)
category: データ構造
subcategory: 木構造
complexity: 挿入 O(log n)、最小値の取り出し O(log n)、最小値の参照 O(1)
summary: 親が子より小さい(または大きい)という順序だけを保つ完全二分木を配列で持ち、最小・最大の要素を素早く出し入れできる優先度付きキュー。
---

## 概要

「いま一番優先度が高いものを取り出す」操作を何度も繰り返す場面は多い。ダイクストラ法の次の頂点選び、イベント駆動シミュレーションの次のイベント、OSのタスク待ち行列など。整列済みの配列に挿入すると O(n)、未整列のままだと取り出しが O(n) になる。

二分ヒープ(J. W. J. Williams、1964年。ヒープソートと同時に提案された)は、**全体を完全には整列させず、「親は子以下」という弱い順序だけを維持する**ことでこの妥協点を見つけた。順序づけを絞った分、挿入・取り出しがともに O(log n) に収まる。さらに完全二分木なので、ポインタなしで**配列**の添字計算だけで親子をたどれ、キャッシュにも優しい。

## 仕組み

要素を配列 `a` に並べ、`i` 番目(0始まり)の親を `(i−1)/2`、子を `2i+1`・`2i+2` とみなす。最小ヒープの場合:

- **挿入(push)**: 末尾に追加し、親より小さい間は親と入れ替えながら上へ上げる(上方向への調整、sift-up)
- **取り出し(pop)**: 先頭(最小値)を返す。末尾の要素を先頭に移し、2つの子のうち小さい方より大きい間は入れ替えながら下へ下げる(下方向への調整、sift-down)
- **一括構築(heapify)**: 未整列の配列を、葉でない最後の要素から先頭に向かって sift-down していく。**O(n)** で構築できる(各要素の下がる高さの合計が n で抑えられるため)

## 特性・トレードオフ

- **挿入・取り出しが O(log n)**: 最小値の参照は O(1)。任意要素の検索は O(n) で、「ある値があるか」には向かない
- **優先度の更新(decrease-key)に弱い**: 要素の位置が分からないので、添字の対応表を持たない限り更新には O(n) かかる。ダイクストラ法では「古い要素を放置して、取り出すときに無視する」遅延削除でよく回避する。更新が多いなら[フィボナッチヒープ](/algorithms/fibonacci-heap)など
- **配列実装のメリット**: ポインタが要らず、メモリが連続していて高速。多くの標準ライブラリ(`heapq`、`std::priority_queue`)がこれを採用している
- **安定ではない**: 同じ優先度の要素の取り出し順は保証されない。順序を保ちたい場合は、挿入番号を第2キーに加える
- **使いどころ**: ダイクストラ法・Prim法、上位k件の保持(サイズkのヒープ)、ストリームの中央値(最大・最小ヒープの2つ)、ヒープソート、イベントキュー

## 実装例

```python
class MinHeap:
    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)
        i = len(a) - 1
        while i > 0 and a[(i - 1) // 2] > a[i]:
            a[(i - 1) // 2], a[i] = a[i], a[(i - 1) // 2]
            i = (i - 1) // 2

    def pop(self):
        a = self.a
        top = a[0]
        last = a.pop()
        if a:
            a[0] = last
            i, n = 0, len(a)
            while True:
                small = i
                for c in (2 * i + 1, 2 * i + 2):
                    if c < n and a[c] < a[small]:
                        small = c
                if small == i:
                    break
                a[i], a[small] = a[small], a[i]
                i = small
        return top


h = MinHeap()
for x in [5, 3, 8, 1, 9, 2]:
    h.push(x)
print([h.pop() for _ in range(6)])  # [1, 2, 3, 5, 8, 9]
```

```typescript
class MinHeap {
  private a: number[] = [];

  push(x: number): void {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0 && a[(i - 1) >> 1] > a[i]) {
      const p = (i - 1) >> 1;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop(): number {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        let small = i;
        for (const c of [2 * i + 1, 2 * i + 2]) {
          if (c < a.length && a[c] < a[small]) small = c;
        }
        if (small === i) break;
        [a[i], a[small]] = [a[small], a[i]];
        i = small;
      }
    }
    return top;
  }
}

const h = new MinHeap();
for (const x of [5, 3, 8, 1, 9, 2]) h.push(x);
console.log([0, 1, 2, 3, 4, 5].map(() => h.pop())); // [1, 2, 3, 5, 8, 9]
```
