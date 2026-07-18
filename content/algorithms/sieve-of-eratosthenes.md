---
name: エラトステネスの篩
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O(n log log n)
summary: 合成数を篩い落としていくことで、ある範囲の素数を一括で列挙する。
---

## 概要

「1からnまでの整数の中から、素数を全て見つけたい」という問題に対して、紀元前3世紀の古代ギリシャの学者エラトステネスが考案した、驚くほど効率的な方法。1つ1つの数について「素数かどうか」を個別に判定するのではなく、**合成数(素数でない数)を篩(ふるい)にかけるように一括で除外していく**という逆転の発想が、この方法の美しさであり速さの源泉になっている。

## 仕組み

1. 2からnまでの全ての数を「素数候補」として並べる
2. 最小の候補である2から始め、2はまだ除外されていないので素数と確定する
3. **2の倍数(4, 6, 8, ...)を全て候補から除外する**(篩い落とす)
4. 次に除外されずに残っている最小の数(3)を素数と確定し、3の倍数を全て除外する
5. これを、篩う数の平方根がnを超えるまで繰り返す(それ以上大きい数の倍数を篩っても、既に他の篩いで除外され尽くしているため)
6. 最後まで除外されずに残った数が、全て素数

「√n以下の数の倍数さえ篩っておけば、それより大きい合成数は必ず既に除外されている」という数論の性質により、篩う範囲を√nまでに絞れるのが効率化の鍵。

## 特性・トレードオフ

- **計算量**: O(n log log n)。個別に試し割りで素数判定する(各数についてO(√n))方法に比べ、**まとめて処理することで劇的に高速**になる
- **一括列挙に特化**: 「ある範囲の素数を全部知りたい」場合には最速級だが、「ある1つの巨大な数が素数かどうか」だけを知りたい場合は、この方法は不向き(範囲全体を篩う必要があるため)。そちらにはミラー・ラビン素数判定法のような専用の手法が使われる
- **メモリ使用量**: nまでの全ての数についてフラグ(篩われたかどうか)を保持する必要があるため、nが非常に大きい(数十億など)場合はメモリが問題になる。セグメント化して篩う「区間篩」など、メモリを抑える改良版も存在する
- **使いどころ**: 素数表の事前計算、素因数分解の高速化(あらかじめ最小素因数を篩っておくテクニック)、競技プログラミングにおける数論問題の前処理として、範囲が決まっている限り最初に検討される定番手法

## 実装例

```python
def sieve_of_eratosthenes(n: int) -> list[int]:
    if n < 2:
        return []
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1
    return [i for i, prime in enumerate(is_prime) if prime]
```

```typescript
function sieveOfEratosthenes(n: number): number[] {
  if (n < 2) return [];
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let multiple = p * p; multiple <= n; multiple += p) {
        isPrime[multiple] = false;
      }
    }
  }
  const result: number[] = [];
  for (let i = 2; i <= n; i++) if (isPrime[i]) result.push(i);
  return result;
}
```

```cpp
#include <vector>

std::vector<int> sieveOfEratosthenes(int n) {
    std::vector<int> primes;
    if (n < 2) return primes;
    std::vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; static_cast<long long>(p) * p <= n; p++) {
        if (isPrime[p]) {
            for (int multiple = p * p; multiple <= n; multiple += p) {
                isPrime[multiple] = false;
            }
        }
    }
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) primes.push_back(i);
    }
    return primes;
}
```

```rust
fn sieve_of_eratosthenes(n: usize) -> Vec<usize> {
    if n < 2 {
        return Vec::new();
    }
    let mut is_prime = vec![true; n + 1];
    is_prime[0] = false;
    is_prime[1] = false;
    let mut p = 2;
    while p * p <= n {
        if is_prime[p] {
            let mut multiple = p * p;
            while multiple <= n {
                is_prime[multiple] = false;
                multiple += p;
            }
        }
        p += 1;
    }
    (2..=n).filter(|&i| is_prime[i]).collect()
}
```

```csharp
static List<int> SieveOfEratosthenes(int n)
{
    var result = new List<int>();
    if (n < 2) return result;
    var isPrime = new bool[n + 1];
    for (int i = 0; i <= n; i++) isPrime[i] = true;
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; p * p <= n; p++)
    {
        if (isPrime[p])
        {
            for (int multiple = p * p; multiple <= n; multiple += p)
            {
                isPrime[multiple] = false;
            }
        }
    }
    for (int i = 2; i <= n; i++) if (isPrime[i]) result.Add(i);
    return result;
}
```
