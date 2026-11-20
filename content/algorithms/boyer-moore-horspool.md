---
name: ボイヤー・ムーア・ホースプール法
category: 文字列
subcategory: パターンマッチング
complexity: O(nm)(最悪)、平均はおよそ O(n / m)に近い
summary: ボイヤー・ムーア法を「不良文字のずらし表」だけに削ぎ落とした探索法。パターンの末尾の文字を見て、一度に大きくスキップする。
---

## 概要

[ボイヤー・ムーア法](/algorithms/boyer-moore)は、パターンを右端から比べて不一致が見つかったら、不良文字則と良接尾辞則の2つの規則で大きくずらす。ずらし幅は大きいが、2つの表の管理が複雑で、実装も重くなる。

ホースプール(Nigel Horspool、1980年)は、実際の文章検索では**不良文字則だけで十分速い**ことに注目し、表を1つに絞った簡略版を提案した。ずらし幅を決める文字を「不一致を見つけた文字」ではなく、**いまのウィンドウの末尾に位置するテキストの文字**に固定することで、さらに実装が短くなった。標準ライブラリの部分文字列検索で似た発想が採用されることがある。

## 仕組み

1. **ずらし表の構築**: パターン `P`(長さ `m`)の、末尾を除く各文字 `P[i]`(`0 ≤ i < m−1`)について `shift[P[i]] = m − 1 − i` とする。同じ文字が複数あれば、右にあるものが後から上書きする。表にない文字のずらし幅は `m`
2. テキスト `T` の位置 `s` にパターンを重ねる
3. パターンを右端から左へ比べる。全部一致すれば `s` を報告する
4. 一致してもしなくても、**ウィンドウの末尾のテキスト文字 `T[s+m−1]`** をキーにして `s += shift[T[s+m−1]]` とずらす

末尾の文字がパターンの中に存在しなければ、その文字を含むウィンドウはどれも一致しないので、パターンの長さ分だけ一気に飛べる。

## 特性・トレードオフ

- **平均的に非常に速い**: 文字種が多い(自然言語・バイト列)ほど、ずらし幅が大きくなる。長いパターンほど有利
- **最悪は O(nm)**: `aaaa…a` のようなテキストとパターンの組み合わせで、毎回ほぼ全部を比べてしまう。保証が欲しいなら [KMP法](/algorithms/kmp) や完全版のボイヤー・ムーア法を選ぶ
- **表が小さい**: 文字種の数だけ。ASCII なら256要素の配列で済む
- **実装が短い**: 数行の表構築と1つのループで書ける。ボイヤー・ムーアの良接尾辞表を省けるので、バグも入りにくい
- **使いどころ**: テキストエディタの検索、`grep` 系のツールの単純な固定文字列検索、短いパターンの一括置換

## 実装例

```python
def horspool(text, pattern):
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    shift = {c: m - 1 - i for i, c in enumerate(pattern[:-1])}
    found = []
    s = 0
    while s <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[s + j]:
            j -= 1
        if j < 0:
            found.append(s)
        s += shift.get(text[s + m - 1], m)
    return found


print(horspool("ABABDABACDABABCABAB", "ABABCABAB"))  # [10]
```

```typescript
function horspool(text: string, pattern: string): number[] {
  const n = text.length;
  const m = pattern.length;
  if (m === 0 || m > n) return [];
  const shift = new Map<string, number>();
  for (let i = 0; i < m - 1; i++) shift.set(pattern[i], m - 1 - i);
  const found: number[] = [];
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && pattern[j] === text[s + j]) j--;
    if (j < 0) found.push(s);
    s += shift.get(text[s + m - 1]) ?? m;
  }
  return found;
}

console.log(horspool("ABABDABACDABABCABAB", "ABABCABAB")); // [10]
```
