---
name: Moのアルゴリズム(クエリ平方分割)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O((n+q)・√n)(nは配列長、qはクエリ数)
summary: 大量の区間クエリを、区間の左端をブロック単位でグループ化してから並び替えることで、区間を1つずつ「伸縮」させるだけで全クエリを効率よく処理できる、オフラインクエリの平方分割テクニック。
---

## 概要

[平方分割(Sqrt Decomposition)](/algorithms/sqrt-decomposition)は配列を√n個のブロックに分けて区間クエリをO(√n)で処理するデータ構造だが、Moのアルゴリズムは同じ「平方分割」の発想を**クエリの側**に適用する、オフラインクエリ処理のテクニックである。「区間`[l, r)`内の値の種類数を求めよ」のように、区間が1つ伸縮するたびに答えをO(1)やO(log n)で更新できる(が、区間をゼロから計算し直すとO(区間長)かかる)ようなクエリがq個与えられたとき、クエリを適切な順序に並び替えることで、**現在保持している区間を少しずつ動かしながら**全クエリに答えることができ、区間の左右の端が動く総距離をO((n+q)√n)に抑えられる。

## 仕組み

1. 配列を長さ√nのブロックに分割する(左端`l`が属するブロック番号を`l / √n`で求める)
2. 全クエリ`(l, r)`を、**「左端が属するブロック番号」を第一キー、「右端`r`」を第二キー**(ブロックが偶数番目か奇数番目かで昇順・降順を交互にする最適化もよく使われる)としてソートする
3. 現在処理中の区間`[cur_l, cur_r)`を保持する変数を用意し(初期値は空区間)、ソート順にクエリを処理していく
4. 各クエリ`(l, r)`について、`cur_l`を`l`に、`cur_r`を`r`に一致させるまで、**1要素ずつ**区間を伸縮させる(要素を追加する`add(x)`、要素を除去する`remove(x)`という2つの関数で、現在保持している答え——値の種類数など——を差分更新する)
5. 区間が一致したら、そのクエリの答えとして現在の値を記録する
6. 全クエリについて4〜5を繰り返す。**クエリをブロック単位でソートしておくことで、左端の移動は各ブロック内でO(√n)、右端の移動は全体を通してO(n√n)に抑えられる**(証明の核心は、同じブロック内のクエリでは右端がソートされているため単調に動き、ブロックが変わるたびに左端が最大でも1ブロック分(√n)だけ動く、という点にある)

## 特性・トレードオフ

- **オフラインクエリに特化した高速化**: [いもす法](/algorithms/imos-method)と同様、全クエリが事前に分かっているオフラインの設定でのみ使える。区間の追加・削除操作(`add`/`remove`)がO(1)やO(log n)で行えるクエリ(値の種類数、モードの頻度、平方和など)に対して威力を発揮する
- **セグメント木では表現しにくいクエリに強い**: 「区間内の値の種類数」のような、区間を分割して独立にマージするのが難しい(セグメント木のようなデータ構造で単純には扱えない)クエリでも、Moのアルゴリズムは「1要素ずつの追加・削除」という素朴な操作の繰り返しで対応できる汎用性の高さが利点
- **更新クエリには弱い**: 基本形のMoのアルゴリズムは配列が静的である(クエリの合間に値が変化しない)ことを前提とする。値の更新も扱いたい場合は「時間軸」を3つ目のソートキーに加えた拡張版(Mo's algorithm with updates、平方分割の次元を1つ増やす)が必要になり、計算量もO(n^(5/3))程度に増える
- **使いどころ**: 区間内の値の種類数・最頻値・平方和などを問う大量のオフラインクエリ、競技プログラミングでのセグメント木では解きにくい区間クエリ問題、文字列の区間内の異なる文字数を問うクエリ

## 実装例

区間`[l, r)`内の値の種類数を求めるクエリを、Moのアルゴリズムで一括処理する例。

```python
import math

def mo_algorithm_distinct_count(a: list[int], queries: list[tuple[int, int]]) -> list[int]:
    n = len(a)
    block_size = max(1, int(math.sqrt(n)))

    indexed_queries = sorted(
        range(len(queries)),
        key=lambda i: (
            queries[i][0] // block_size,
            queries[i][1] if (queries[i][0] // block_size) % 2 == 0 else -queries[i][1],
        ),
    )

    freq: dict[int, int] = {}
    distinct = 0
    cur_l, cur_r = 0, 0  # 現在保持している区間は[cur_l, cur_r)

    def add(x: int) -> None:
        nonlocal distinct
        freq[x] = freq.get(x, 0) + 1
        if freq[x] == 1:
            distinct += 1

    def remove(x: int) -> None:
        nonlocal distinct
        freq[x] -= 1
        if freq[x] == 0:
            distinct -= 1

    answers = [0] * len(queries)
    for qi in indexed_queries:
        l, r = queries[qi]
        while cur_r < r:
            add(a[cur_r]); cur_r += 1
        while cur_l > l:
            cur_l -= 1; add(a[cur_l])
        while cur_r > r:
            cur_r -= 1; remove(a[cur_r])
        while cur_l < l:
            remove(a[cur_l]); cur_l += 1
        answers[qi] = distinct
    return answers
```

```typescript
function moAlgorithmDistinctCount(
  a: number[],
  queries: [number, number][],
): number[] {
  const n = a.length;
  const blockSize = Math.max(1, Math.floor(Math.sqrt(n)));

  const order = queries
    .map((_, i) => i)
    .sort((i, j) => {
      const bi = Math.floor(queries[i][0] / blockSize);
      const bj = Math.floor(queries[j][0] / blockSize);
      if (bi !== bj) return bi - bj;
      return bi % 2 === 0
        ? queries[i][1] - queries[j][1]
        : queries[j][1] - queries[i][1];
    });

  const freq = new Map<number, number>();
  let distinct = 0;
  let curL = 0,
    curR = 0;

  const add = (x: number) => {
    const c = (freq.get(x) ?? 0) + 1;
    freq.set(x, c);
    if (c === 1) distinct++;
  };
  const remove = (x: number) => {
    const c = (freq.get(x) ?? 0) - 1;
    freq.set(x, c);
    if (c === 0) distinct--;
  };

  const answers = new Array(queries.length).fill(0);
  for (const qi of order) {
    const [l, r] = queries[qi];
    while (curR < r) {
      add(a[curR]);
      curR++;
    }
    while (curL > l) {
      curL--;
      add(a[curL]);
    }
    while (curR > r) {
      curR--;
      remove(a[curR]);
    }
    while (curL < l) {
      remove(a[curL]);
      curL++;
    }
    answers[qi] = distinct;
  }
  return answers;
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <cmath>

std::vector<int> moAlgorithmDistinctCount(const std::vector<int>& a, const std::vector<std::pair<int, int>>& queries) {
    int n = static_cast<int>(a.size());
    int blockSize = std::max(1, static_cast<int>(std::sqrt(n)));

    std::vector<int> order(queries.size());
    for (size_t i = 0; i < order.size(); i++) order[i] = static_cast<int>(i);
    std::sort(order.begin(), order.end(), [&](int i, int j) {
        int bi = queries[i].first / blockSize, bj = queries[j].first / blockSize;
        if (bi != bj) return bi < bj;
        return (bi % 2 == 0) ? queries[i].second < queries[j].second : queries[i].second > queries[j].second;
    });

    std::unordered_map<int, int> freq;
    int distinct = 0, curL = 0, curR = 0;
    auto add = [&](int x) { if (++freq[x] == 1) distinct++; };
    auto remove = [&](int x) { if (--freq[x] == 0) distinct--; };

    std::vector<int> answers(queries.size());
    for (int qi : order) {
        auto [l, r] = queries[qi];
        while (curR < r) add(a[curR++]);
        while (curL > l) add(a[--curL]);
        while (curR > r) remove(a[--curR]);
        while (curL < l) remove(a[curL++]);
        answers[qi] = distinct;
    }
    return answers;
}
```

```rust
use std::collections::HashMap;

fn mo_algorithm_distinct_count(a: &[i32], queries: &[(usize, usize)]) -> Vec<i32> {
    let n = a.len();
    let block_size = (n as f64).sqrt().max(1.0) as usize;

    let mut order: Vec<usize> = (0..queries.len()).collect();
    order.sort_by(|&i, &j| {
        let bi = queries[i].0 / block_size;
        let bj = queries[j].0 / block_size;
        if bi != bj {
            bi.cmp(&bj)
        } else if bi % 2 == 0 {
            queries[i].1.cmp(&queries[j].1)
        } else {
            queries[j].1.cmp(&queries[i].1)
        }
    });

    let mut freq: HashMap<i32, i32> = HashMap::new();
    let mut distinct = 0i32;
    let (mut cur_l, mut cur_r) = (0usize, 0usize);

    let mut add = |x: i32, freq: &mut HashMap<i32, i32>, distinct: &mut i32| {
        let c = freq.entry(x).or_insert(0);
        *c += 1;
        if *c == 1 {
            *distinct += 1;
        }
    };
    let mut remove = |x: i32, freq: &mut HashMap<i32, i32>, distinct: &mut i32| {
        let c = freq.entry(x).or_insert(0);
        *c -= 1;
        if *c == 0 {
            *distinct -= 1;
        }
    };

    let mut answers = vec![0i32; queries.len()];
    for &qi in &order {
        let (l, r) = queries[qi];
        while cur_r < r { add(a[cur_r], &mut freq, &mut distinct); cur_r += 1; }
        while cur_l > l { cur_l -= 1; add(a[cur_l], &mut freq, &mut distinct); }
        while cur_r > r { cur_r -= 1; remove(a[cur_r], &mut freq, &mut distinct); }
        while cur_l < l { remove(a[cur_l], &mut freq, &mut distinct); cur_l += 1; }
        answers[qi] = distinct;
    }
    answers
}
```

```csharp
static int[] MoAlgorithmDistinctCount(int[] a, List<(int l, int r)> queries)
{
    int n = a.Length;
    int blockSize = Math.Max(1, (int)Math.Sqrt(n));

    var order = Enumerable.Range(0, queries.Count).ToList();
    order.Sort((i, j) =>
    {
        int bi = queries[i].l / blockSize, bj = queries[j].l / blockSize;
        if (bi != bj) return bi.CompareTo(bj);
        return bi % 2 == 0 ? queries[i].r.CompareTo(queries[j].r) : queries[j].r.CompareTo(queries[i].r);
    });

    var freq = new Dictionary<int, int>();
    int distinct = 0, curL = 0, curR = 0;
    void Add(int x) { freq[x] = freq.GetValueOrDefault(x) + 1; if (freq[x] == 1) distinct++; }
    void Remove(int x) { freq[x]--; if (freq[x] == 0) distinct--; }

    var answers = new int[queries.Count];
    foreach (int qi in order)
    {
        var (l, r) = queries[qi];
        while (curR < r) Add(a[curR++]);
        while (curL > l) Add(a[--curL]);
        while (curR > r) Remove(a[--curR]);
        while (curL < l) Remove(a[curL++]);
        answers[qi] = distinct;
    }
    return answers;
}
```
