---
name: シャミアの秘密分散法
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: 分割・復元とも O(n·k)(分割はn個の共有、復元はk個からのラグランジュ補間 O(k²))
summary: 秘密を n 個の「共有」に分け、そのうち任意の k 個が集まれば復元でき、k−1 個以下からは何も分からないようにする(k,n)しきい値方式。多項式の補間を使う。
---

## 概要

金庫の暗証番号や暗号鍵のバックアップを、1人の担当者に持たせるのは危うい(紛失や悪用で全てが終わる)。かといって全員に同じコピーを渡せば、1人の裏切りで漏れる。「5人のうち3人が揃えば開けられるが、2人では絶対に開けられない」という仕組みが欲しい。

シャミア(Adi Shamir、1979年の論文「How to Share a Secret」)は、**多項式は `k` 個の点で一意に決まる**という中学校の数学で、これを解いた。`k−1` 次の多項式の定数項を秘密にし、その多項式上の `n` 個の点を共有として配る。`k` 個の点が集まれば多項式が復元でき、定数項(`x=0` での値)が取り出せる。`k−1` 個以下では、どんな定数項とも矛盾しない多項式が無数に存在するので、情報理論的に何も分からない。

## 仕組み

大きな素数 `p` を法とする有限体 `GF(p)` の上で計算する。秘密 `s` は `0 ≤ s < p` の整数。

1. **分割**: `k−1` 個の係数 `a₁, ..., a_{k−1}` を `GF(p)` から一様ランダムに選び、`f(x) = s + a₁x + a₂x² + ... + a_{k−1}x^{k−1}` を作る。`x = 1, 2, ..., n` に対する `(x, f(x))` を共有として各人に渡す。`x = 0` は秘密そのものなので使わない
2. **復元**: `k` 個の共有 `(xᵢ, yᵢ)` から、ラグランジュ補間で `f(0)` を求める
   `s = Σᵢ yᵢ · Π_{j≠i} ( xⱼ / (xⱼ − xᵢ) )`(すべて `mod p`)
   除算は、法 `p` の下での逆元(拡張ユークリッドの互除法やフェルマーの小定理)で行う
3. 共有が `k` 個より多くても、どの `k` 個を使っても同じ秘密が得られる

## 特性・トレードオフ

- **情報理論的な安全性**: `k−1` 個以下の共有からは、秘密について何の情報も得られない(計算量の仮定に頼らない)。この性質は、係数が本当に一様ランダムであること(暗号学的乱数)に依存する
- **共有のサイズ**: 1つの共有の大きさは秘密と同じ。秘密が大きいときは、秘密を暗号化する鍵だけを分散するのが一般的
- **共有の追加・無効化**: 新しい共有は、同じ多項式上の別の点を求めれば発行できる(秘密を再構成しなくても、k個が協力すれば可能)。ただし、1つの共有が漏れたときの無効化には、多項式ごと作り直す必要がある
- **不正への耐性は別問題**: 偽の共有を出されると誤った秘密が復元される。共有が正しいことを検証できる拡張(検証可能な秘密分散、Feldman や Pedersen の方式)がある
- **使いどころ**: 暗号鍵の分散保管(複数の管理者の承認で開錠)、ハードウェアセキュリティモジュールの鍵の管理者承認、秘密鍵の復旧、マルチパーティ計算の部品

## 実装例

```python
import secrets

P = 2**61 - 1  # メルセンヌ素数


def split(secret: int, k: int, n: int):
    coeffs = [secret] + [secrets.randbelow(P) for _ in range(k - 1)]

    def f(x):
        return sum(c * pow(x, i, P) for i, c in enumerate(coeffs)) % P

    return [(x, f(x)) for x in range(1, n + 1)]


def recover(shares):
    secret = 0
    for i, (xi, yi) in enumerate(shares):
        num, den = 1, 1
        for j, (xj, _) in enumerate(shares):
            if i != j:
                num = num * (-xj) % P
                den = den * (xi - xj) % P
        secret = (secret + yi * num * pow(den, -1, P)) % P
    return secret


shares = split(123456789, k=3, n=5)
print(recover(shares[:3]) == 123456789)          # True
print(recover([shares[0], shares[2], shares[4]]) == 123456789)  # True(どの3個でもよい)
print(recover(shares[:2]) == 123456789)          # False(2個では復元できない)
```

```typescript
const P = 2n ** 61n - 1n;

const mod = (a: bigint): bigint => ((a % P) + P) % P;

function powMod(base: bigint, exp: bigint): bigint {
  let result = 1n;
  let b = mod(base);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % P;
    b = (b * b) % P;
    e >>= 1n;
  }
  return result;
}

function randomBelowP(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let x = 0n;
  for (const byte of bytes) x = (x << 8n) | BigInt(byte);
  return x % P;
}

function split(secret: bigint, k: number, n: number): [bigint, bigint][] {
  const coeffs = [secret, ...Array.from({ length: k - 1 }, randomBelowP)];
  const f = (x: bigint) =>
    coeffs.reduce((acc, c, i) => mod(acc + c * powMod(x, BigInt(i))), 0n);
  return Array.from({ length: n }, (_, i) => [BigInt(i + 1), f(BigInt(i + 1))]);
}

function recover(shares: [bigint, bigint][]): bigint {
  let secret = 0n;
  shares.forEach(([xi, yi], i) => {
    let num = 1n;
    let den = 1n;
    shares.forEach(([xj], j) => {
      if (i !== j) {
        num = mod(num * -xj);
        den = mod(den * (xi - xj));
      }
    });
    secret = mod(secret + yi * num * powMod(den, P - 2n)); // フェルマーの小定理で逆元
  });
  return secret;
}

const shares = split(123456789n, 3, 5);
console.log(recover(shares.slice(0, 3)) === 123456789n); // true
console.log(recover(shares.slice(0, 2)) === 123456789n); // false
```
