---
name: Two-Way文字列照合アルゴリズム(Crochemore-Perrin法)
category: 文字列
subcategory: パターンマッチング
complexity: O(n + m)
summary: パターンを臨界分解で左右2つに分割し、右半分・左半分の順に照合することで、定数個の追加変数だけで最悪計算量O(n+m)を達成する空間効率に優れた文字列照合アルゴリズム。
---

## 概要

[KMP法](/algorithms/kmp)は失敗関数というO(m)サイズの配列を、[Boyer-Moore法](/algorithms/boyer-moore)は複数のスキップテーブルを事前に構築することで高速な文字列照合を実現する。これに対しTwo-Way文字列照合アルゴリズム(Crochemore-Perrin法、1991年にMaxime CrochemoreとDominique Perrinによって考案)は、パターンを「臨界分解(critical factorization)」という特殊な分割点で2つの半分に切り分け、それぞれの半分を賢い順序で照合していくことで、**最悪計算量O(n + m)を保ちながら、追加で必要なメモリを定数個(O(1))の変数だけに抑える**という、空間効率の面で際立った特長を持つアルゴリズムである。この省メモリ性から、glibcの`memmem`やRustの標準ライブラリの文字列検索など、実用の低レイヤーライブラリで採用されている。

## 仕組み

**臨界分解(critical factorization)**: パターン`P`を`P = u・v`という2つの部分`u`(左)と`v`(右)に分割する方法は複数あるが、その中でも「周期性に関する特別な性質(臨界分解定理により存在が保証される、パターン全体の最小周期と両立する分割点)」を満たす分割点を選ぶと、以降の照合を極めて効率よく進められる。この分割点は、パターンの`最大接尾辞`(パターンをある順序で比較したときに辞書式順序で最大になる接尾辞)を求める過程で、追加の探索なしに副産物として得られる。

1. **前処理(臨界分解点の計算)**: パターン`P`について、2種類の順序(通常の順序と逆順序)それぞれで「最大接尾辞」を求める2つの走査を行う。この走査自体がO(m)時間・O(1)追加空間で行え、その結果から臨界分解点`ℓ`(`u = P[0..ℓ)`, `v = P[ℓ..m)`)と、パターン`v`部分の周期`p`が求まる
2. **照合本体**: テキスト上のある位置にパターンを重ねたとき、まず**右半分`v`から左から右へ**照合していく。不一致が起きたら、その不一致位置の情報を使ってパターン全体をどれだけ右にずらせるかを判断し(ずらし幅は`v`の周期`p`から導かれる)、テキスト側は後戻りしない
3. `v`が最後まで一致したら、次に**左半分`u`を右から左へ**照合する。ここでも不一致が起きればパターンをずらす。`u`側の照合で使うメモ化変数(直前にどこまで`u`が一致していたか)を**1つだけ**保持することで、この段階でもO(1)の追加メモリで済ませられる
4. `u`・`v`両方が一致すれば、その位置でパターンの出現を報告し、次の照合位置へ進む

「周期性を利用したずらし幅の計算」というアイデアはBoyer-Moore法のグッドサフィックス則にも通じるが、Two-Wayアルゴリズムは臨界分解という数学的な保証によって、テーブルではなく定数個の変数だけでそれを実現している点が独自性である。

## 特性・トレードオフ

- **計算量**: 最悪計算量O(n + m)を保証しながら、追加で必要な作業領域はO(1)(定数個の変数のみ)。これは[KMP法](/algorithms/kmp)がO(m)サイズの失敗関数テーブルを、[Boyer-Moore法](/algorithms/boyer-moore)がO(m + Σ)のスキップテーブル群を必要とするのと対照的な、空間計算量における明確な優位性である
- **実装の複雑さとのトレードオフ**: 臨界分解の理論(周期性の補題、最大接尾辞の計算)を正しく理解し実装するコストは他の主要な文字列照合アルゴリズムより高く、教育目的で最初に学ぶアルゴリズムとしては[KMP法](/algorithms/kmp)や[Boyer-Moore法](/algorithms/boyer-moore)の方が親しみやすい
- **省メモリ性が活きる場面**: パターンの長さが非常に大きい(あるいは動的に生成される)場合や、組み込み環境・システムライブラリのようにメモリ確保のコストや制約が厳しい場面では、O(m)のテーブルすら惜しいことがあり、Two-Wayアルゴリズムの定数空間という性質が実用上の決め手になる
- **使いどころ**: glibcの`memmem`/`strstr`関数の内部実装、Rust標準ライブラリの文字列検索、その他システムプログラミング言語の低レイヤーな文字列検索関数など、汎用性と省メモリ性を両立させたい標準ライブラリでの採用例が多い

## 実装例

```python
def _max_suffix(pattern: str, reverse_order: bool) -> tuple[int, int]:
    """最大接尾辞の開始位置と、その接尾辞の周期を求める(Two-Wayアルゴリズムの前処理)"""
    def cmp(a: str, b: str) -> int:
        if reverse_order:
            a, b = b, a
        return -1 if a < b else (1 if a > b else 0)

    m = len(pattern)
    i, j, k, p = -1, 0, 1, 1
    while j + k < m:
        c = cmp(pattern[j + k], pattern[i + k])
        if c < 0:
            j += k
            k = 1
            p = j - i
        elif c == 0:
            if k != p:
                k += 1
            else:
                j += p
                k = 1
        else:  # c > 0
            i = j
            j += 1
            k = 1
            p = 1
    return i + 1, p


def critical_factorization(pattern: str) -> tuple[int, int]:
    ell1, p1 = _max_suffix(pattern, reverse_order=False)
    ell2, p2 = _max_suffix(pattern, reverse_order=True)
    if ell1 > ell2:
        return ell1, p1
    return ell2, p2


def two_way_search(text: str, pattern: str) -> list[int]:
    m = len(pattern)
    if m == 0:
        return list(range(len(text) + 1))

    ell, p = critical_factorization(pattern)
    # u = pattern[:ell], v = pattern[ell:]
    is_periodic = ell >= m - ell and pattern[:ell] == pattern[p:ell] if p <= ell else False
    result = []
    n = len(text)
    pos = 0
    memory = 0  # uの直近の一致長を覚える定数個の変数

    if is_periodic:
        while pos <= n - m:
            i = max(ell, memory)
            while i < m and pattern[i] == text[pos + i]:
                i += 1
            if i < m:
                pos += (i - ell + 1)
                memory = 0
                continue
            i = ell - 1
            while i >= memory and pattern[i] == text[pos + i]:
                i -= 1
            if i < memory:
                result.append(pos)
                pos += p
                memory = m - p
            else:
                pos += (i - memory + 1)
                memory = 0
    else:
        p = max(ell, m - ell) + 1
        while pos <= n - m:
            i = ell
            while i < m and pattern[i] == text[pos + i]:
                i += 1
            if i < m:
                pos += (i - ell + 1)
                continue
            i = ell - 1
            while i >= 0 and pattern[i] == text[pos + i]:
                i -= 1
            if i < 0:
                result.append(pos)
                pos += p
            else:
                pos += (i + 1)
    return result
```

```typescript
function maxSuffix(pattern: string, reverseOrder: boolean): [number, number] {
  const cmp = (a: string, b: string): number => {
    if (reverseOrder) [a, b] = [b, a];
    return a < b ? -1 : a > b ? 1 : 0;
  };

  const m = pattern.length;
  let i = -1;
  let j = 0;
  let k = 1;
  let p = 1;
  while (j + k < m) {
    const c = cmp(pattern[j + k], pattern[i + k]);
    if (c < 0) {
      j += k;
      k = 1;
      p = j - i;
    } else if (c === 0) {
      if (k !== p) {
        k += 1;
      } else {
        j += p;
        k = 1;
      }
    } else {
      i = j;
      j += 1;
      k = 1;
      p = 1;
    }
  }
  return [i + 1, p];
}

function criticalFactorization(pattern: string): [number, number] {
  const [ell1, p1] = maxSuffix(pattern, false);
  const [ell2, p2] = maxSuffix(pattern, true);
  return ell1 > ell2 ? [ell1, p1] : [ell2, p2];
}

function twoWaySearch(text: string, pattern: string): number[] {
  const m = pattern.length;
  if (m === 0) return Array.from({ length: text.length + 1 }, (_, i) => i);

  let [ell, p] = criticalFactorization(pattern);
  const isPeriodic =
    p <= ell && pattern.slice(0, ell) === pattern.slice(p, ell);
  const result: number[] = [];
  const n = text.length;
  let pos = 0;
  let memory = 0; // uの直近の一致長を覚える定数個の変数

  if (isPeriodic) {
    while (pos <= n - m) {
      let i = Math.max(ell, memory);
      while (i < m && pattern[i] === text[pos + i]) i++;
      if (i < m) {
        pos += i - ell + 1;
        memory = 0;
        continue;
      }
      i = ell - 1;
      while (i >= memory && pattern[i] === text[pos + i]) i--;
      if (i < memory) {
        result.push(pos);
        pos += p;
        memory = m - p;
      } else {
        pos += i - memory + 1;
        memory = 0;
      }
    }
  } else {
    p = Math.max(ell, m - ell) + 1;
    while (pos <= n - m) {
      let i = ell;
      while (i < m && pattern[i] === text[pos + i]) i++;
      if (i < m) {
        pos += i - ell + 1;
        continue;
      }
      i = ell - 1;
      while (i >= 0 && pattern[i] === text[pos + i]) i--;
      if (i < 0) {
        result.push(pos);
        pos += p;
      } else {
        pos += i + 1;
      }
    }
  }
  return result;
}
```
