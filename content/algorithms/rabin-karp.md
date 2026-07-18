---
name: Rabin-Karp法
category: 文字列
subcategory: パターンマッチング
complexity: O(n + m)
summary: ハッシュ値の比較で候補を絞り込む文字列検索。複数パターンの同時検索に強い。
---

## 概要

文字を1つずつ比較する代わりに、**文字列のハッシュ値(要約値)同士を比較する**ことで文字列検索を行う、発想の異なるアプローチ。「もしかしたら一致しているかもしれない箇所」をハッシュ値の一致で高速に絞り込み、実際に一致していそうな箇所だけを念のため文字単位で確認する、という二段構えが特徴。剽窃検出(プラジャリズムチェック)の元祖的な実装としても知られる。

## 仕組み

1. パターン文字列のハッシュ値をあらかじめ計算しておく
2. テキストの先頭から、パターンと同じ長さの「窓(ウィンドウ)」を切り出し、そのハッシュ値を計算する
3. パターンのハッシュ値と窓のハッシュ値が一致すれば、**念のため実際の文字を1つずつ比較**して本当に一致しているか確認する(ハッシュ値が一致しても、異なる文字列が偶然同じハッシュ値になる「衝突」の可能性があるため)
4. 窓を1文字ずつ右にずらしながら2〜3を繰り返す。このとき、**ローリングハッシュ**という技法を使うと、窓全体を再計算せずに「先頭の文字を引いて、末尾の文字を足す」だけで新しい窓のハッシュ値を定数時間で求められる

このローリングハッシュこそがRabin-Karp法の核心で、「窓を1つずらすごとにハッシュ値をゼロから計算し直す」という無駄を避けることで、全体としてO(n + m)の線形時間を実現している。

## 特性・トレードオフ

- **計算量**: 平均・期待値でO(n + m)。ただしハッシュの衝突が頻発する最悪ケースでは、確認のための文字比較が増えてO(nm)まで悪化しうる(良いハッシュ関数を選べば実用上ほぼ起こらない)
- **複数パターンの同時検索に強い**: 検索したいパターンが複数ある場合、それぞれのハッシュ値を集合(ハッシュテーブル)に入れておけば、テキストを1回走査するだけで全パターンの出現を同時にチェックできる。これはKMP法やBoyer-Moore法にはない大きな利点
- **2次元パターンマッチングへの拡張**: 画像内の部分画像検索のような、2次元のパターンマッチングにもハッシュの考え方を自然に拡張できる
- **使いどころ**: 剽窃検出システム(文書の一部が別の文書と一致していないか)、DNA配列の複数モチーフ検索、差分検出ツールの内部処理など、「複数のパターンを同時に探したい」場面で特に強みを発揮する

## 実装例

パターンが出現する全ての開始位置(0-indexed)を、ローリングハッシュで候補を絞り込みながら返す。

```python
def rabin_karp_search(text: str, pattern: str, base: int = 256, mod: int = 1_000_000_007) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    high = pow(base, m - 1, mod)  # 窓の最上位桁の重み(先頭文字を引くときに使う)
    pattern_hash = 0
    window_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * base + ord(pattern[i])) % mod
        window_hash = (window_hash * base + ord(text[i])) % mod

    result = []
    for i in range(n - m + 1):
        if pattern_hash == window_hash and text[i:i + m] == pattern:
            # ハッシュが一致しても衝突の可能性があるため、念のため実文字列を比較する
            result.append(i)
        if i < n - m:
            # ローリングハッシュ: 先頭の文字を引いて、末尾の文字を足すだけで次の窓のハッシュを求める
            window_hash = (window_hash - ord(text[i]) * high) % mod
            window_hash = (window_hash * base + ord(text[i + m])) % mod
            window_hash %= mod
    return result
```

```typescript
function rabinKarpSearch(text: string, pattern: string, base = 256, mod = 1_000_000_007): number[] {
  const n = text.length;
  const m = pattern.length;
  if (m === 0 || m > n) return [];

  let high = 1; // base^(m-1) mod mod (窓の最上位桁の重み)
  for (let i = 0; i < m - 1; i++) high = (high * base) % mod;

  let patternHash = 0;
  let windowHash = 0;
  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * base + pattern.charCodeAt(i)) % mod;
    windowHash = (windowHash * base + text.charCodeAt(i)) % mod;
  }

  const result: number[] = [];
  for (let i = 0; i <= n - m; i++) {
    if (patternHash === windowHash && text.slice(i, i + m) === pattern) {
      // ハッシュが一致しても衝突の可能性があるため、念のため実文字列を比較する
      result.push(i);
    }
    if (i < n - m) {
      // ローリングハッシュ: 先頭の文字を引いて、末尾の文字を足すだけで次の窓のハッシュを求める
      windowHash = (windowHash - text.charCodeAt(i) * high) % mod;
      windowHash = (windowHash * base + text.charCodeAt(i + m)) % mod;
      windowHash = ((windowHash % mod) + mod) % mod;
    }
  }
  return result;
}
```

```cpp
#include <string>
#include <vector>

std::vector<int> rabinKarpSearch(const std::string& text, const std::string& pattern,
                                  long long base = 256, long long mod = 1'000'000'007) {
    int n = static_cast<int>(text.size());
    int m = static_cast<int>(pattern.size());
    std::vector<int> result;
    if (m == 0 || m > n) return result;

    long long high = 1; // base^(m-1) mod mod(窓の最上位桁の重み)
    for (int i = 0; i < m - 1; i++) high = (high * base) % mod;

    long long patternHash = 0, windowHash = 0;
    for (int i = 0; i < m; i++) {
        patternHash = (patternHash * base + static_cast<unsigned char>(pattern[i])) % mod;
        windowHash = (windowHash * base + static_cast<unsigned char>(text[i])) % mod;
    }

    for (int i = 0; i <= n - m; i++) {
        if (patternHash == windowHash && text.compare(i, m, pattern) == 0) {
            // ハッシュが一致しても衝突の可能性があるため、念のため実文字列を比較する
            result.push_back(i);
        }
        if (i < n - m) {
            // ローリングハッシュ: 先頭の文字を引いて、末尾の文字を足すだけで次の窓のハッシュを求める
            windowHash = (windowHash - static_cast<unsigned char>(text[i]) * high % mod + mod) % mod;
            windowHash = (windowHash * base + static_cast<unsigned char>(text[i + m])) % mod;
        }
    }
    return result;
}
```

```rust
fn rabin_karp_search(text: &str, pattern: &str, base: i64, modulus: i64) -> Vec<usize> {
    let text = text.as_bytes();
    let pattern = pattern.as_bytes();
    let n = text.len();
    let m = pattern.len();
    let mut result = Vec::new();
    if m == 0 || m > n {
        return result;
    }

    let mut high = 1i64; // base^(m-1) mod modulus(窓の最上位桁の重み)
    for _ in 0..m - 1 {
        high = (high * base) % modulus;
    }

    let mut pattern_hash = 0i64;
    let mut window_hash = 0i64;
    for i in 0..m {
        pattern_hash = (pattern_hash * base + pattern[i] as i64) % modulus;
        window_hash = (window_hash * base + text[i] as i64) % modulus;
    }

    for i in 0..=(n - m) {
        if pattern_hash == window_hash && &text[i..i + m] == pattern {
            // ハッシュが一致しても衝突の可能性があるため、念のため実文字列を比較する
            result.push(i);
        }
        if i < n - m {
            // ローリングハッシュ: 先頭の文字を引いて、末尾の文字を足すだけで次の窓のハッシュを求める
            window_hash = (window_hash - text[i] as i64 * high % modulus + modulus) % modulus;
            window_hash = (window_hash * base + text[i + m] as i64) % modulus;
        }
    }
    result
}
```

```csharp
static List<int> RabinKarpSearch(string text, string pattern, long baseVal = 256, long mod = 1_000_000_007)
{
    var result = new List<int>();
    int n = text.Length, m = pattern.Length;
    if (m == 0 || m > n) return result;

    long high = 1; // base^(m-1) mod mod(窓の最上位桁の重み)
    for (int i = 0; i < m - 1; i++) high = (high * baseVal) % mod;

    long patternHash = 0, windowHash = 0;
    for (int i = 0; i < m; i++)
    {
        patternHash = (patternHash * baseVal + pattern[i]) % mod;
        windowHash = (windowHash * baseVal + text[i]) % mod;
    }

    for (int i = 0; i <= n - m; i++)
    {
        if (patternHash == windowHash && text.Substring(i, m) == pattern)
        {
            // ハッシュが一致しても衝突の可能性があるため、念のため実文字列を比較する
            result.Add(i);
        }
        if (i < n - m)
        {
            // ローリングハッシュ: 先頭の文字を引いて、末尾の文字を足すだけで次の窓のハッシュを求める
            windowHash = (windowHash - text[i] * high) % mod;
            windowHash = (windowHash * baseVal + text[i + m]) % mod;
            windowHash = ((windowHash % mod) + mod) % mod;
        }
    }
    return result;
}
```
