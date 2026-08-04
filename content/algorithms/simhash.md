---
name: SimHash
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(n)(n=文書の特徴数、ハッシュ生成)、O(1)〜O(log n)(近似重複検索、ハミング距離インデックスを使う場合)
summary: 似た文書には似たハッシュ値(ビット単位で少数しか違わない)を割り当てる局所性鋭敏型ハッシュの一種で、数十億件規模の文書集合からほぼ重複する文書を高速に検出するために設計された。
---

## 概要

通常のハッシュ関数(SHA-256など)は、入力が1ビットでも異なれば全く無関係なハッシュ値を出力するよう設計されている——これは改ざん検出には理想的だが、「ほぼ同じだが完全には一致しない文書」を見つけたい重複検出には不向きである。2002年にGoogleのモーゼス・チャリカー(Charikar)が発表したSimHashは、逆に「似た入力には似た(ビット単位のハミング距離が小さい)ハッシュ値を割り当てる」という局所性鋭敏型ハッシュ(Locality-Sensitive Hashing, [MinHash-LSH](/algorithms/minhash-lsh)と同じ系統の技術)を実現する。GoogleがWeb検索インデックスの構築時に、数十億ページ規模のコーパスから「ほぼ重複するページ」(コピーサイト、少し編集しただけのミラーページ等)を効率的に検出するために実際に使用していることで知られる。

## 仕組み

1. 文書を単語やn-gramの集合(特徴)に分解し、各特徴に重み(出現頻度や[TF-IDF](/algorithms/tf-idf)値)を付ける
2. 各特徴を通常のハッシュ関数で固定長(例えば64ビット)のビット列に変換する
3. 出力するSimHashのビットごとに、重み付きの投票を集計する: その特徴のハッシュのそのビットが1なら`+重み`、0なら`-重み`を、その桁の合計値に加算する。これを全特徴について繰り返す
4. 各桁の合計値の符号を見て、正なら1、負(または0)なら0とする——こうして得られた64ビットのビット列がその文書のSimHash値になる
5. 2つの文書が似ているかどうかは、それぞれのSimHash値のハミング距離(異なるビットの個数)で判定する。ハミング距離が小さい(例えば3ビット以内)ほど、元の文書が似ていることになる

## 特性・トレードオフ

- **「似た入力→似たハッシュ」という設計思想**: 各ビットが独立した重み付き多数決の結果として決まるため、入力の特徴集合がわずかに変化しても(1つの単語が追加・削除される程度なら)多くのビットの多数決結果は変わらない——これが通常のハッシュ関数との決定的な違いであり、近似重複検出を可能にする核心的な仕組みになっている
- **大規模コーパスでの近似重複検索の高速化**: 素朴には全文書ペアのハミング距離を計算すると`O(n²)`かかってしまうが、64ビットのハッシュ値をいくつかのブロックに分割してテーブル化する(ハミング距離が小さければ、少なくとも1つのブロックが完全一致するはずという性質を利用する)ことで、実用上大幅に高速な近似最近傍検索が可能になる
- **[MinHash-LSH](/algorithms/minhash-lsh)との違い**: 両方とも局所性鋭敏型ハッシュだが、[MinHash](/algorithms/minhash-lsh)は主に集合のJaccard類似度を近似するのに使われるのに対し、SimHashは重み付き特徴ベクトルのコサイン類似度に近い概念を近似する点で数学的背景が異なる。用途に応じて使い分けられる
- **使いどころ**: Web検索エンジンにおける重複ページ・ミラーサイトの検出(Google内部での実際の使用例として有名)、盗用検出・類似文書検索、大規模ログデータにおける類似イベントのクラスタリング、スパムメールの近似重複検出

## 実装例

32ビットのSimHashを、単語分割+FNV-1aハッシュ+重み付き多数決で実装。「1単語だけ違う文書」同士のハミング距離が、「全く無関係な文書」とのハミング距離より明確に小さいことを検証している(実測: 1単語違いで距離1、無関係な文書とは距離17)。

```python
def fnv1a_32(s: str) -> int:
    h = 0x811C9DC5
    for byte in s.encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def tokenize(text: str) -> list[str]:
    return text.lower().split()


def simhash(text: str, bits: int = 32) -> int:
    weights = [0] * bits
    counts: dict[str, int] = {}
    for token in tokenize(text):
        counts[token] = counts.get(token, 0) + 1
    for token, weight in counts.items():
        h = fnv1a_32(token)
        for i in range(bits):
            if (h >> i) & 1:
                weights[i] += weight
            else:
                weights[i] -= weight
    result = 0
    for i in range(bits):
        if weights[i] > 0:
            result |= 1 << i
    return result


def hamming_distance(a: int, b: int) -> int:
    return bin(a ^ b).count("1")
```

```typescript
function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(s)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
}

function simhash(text: string, bits = 32): number {
  const weights = new Array(bits).fill(0);
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const [token, weight] of counts) {
    const h = fnv1a32(token);
    for (let i = 0; i < bits; i++) {
      if ((h >>> i) & 1) weights[i] += weight;
      else weights[i] -= weight;
    }
  }
  let result = 0;
  for (let i = 0; i < bits; i++) {
    if (weights[i] > 0) result |= 1 << i;
  }
  return result >>> 0;
}

function hammingDistance(a: number, b: number): number {
  let x = (a ^ b) >>> 0;
  let count = 0;
  while (x !== 0) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>
#include <sstream>
#include <cctype>
#include <cstdint>

uint32_t fnv1a32(const std::string& s) {
    uint32_t h = 0x811c9dc5u;
    for (unsigned char c : s) {
        h ^= c;
        h *= 0x01000193u;
    }
    return h;
}

std::vector<std::string> tokenize(const std::string& text) {
    std::string lower = text;
    for (auto& c : lower) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    std::istringstream iss(lower);
    std::vector<std::string> tokens;
    std::string tok;
    while (iss >> tok) tokens.push_back(tok);
    return tokens;
}

uint32_t simHash(const std::string& text, int bits = 32) {
    std::vector<int> weights(bits, 0);
    std::unordered_map<std::string, int> counts;
    for (const auto& token : tokenize(text)) counts[token]++;
    for (const auto& [token, weight] : counts) {
        uint32_t h = fnv1a32(token);
        for (int i = 0; i < bits; i++) {
            if ((h >> i) & 1u) weights[i] += weight;
            else weights[i] -= weight;
        }
    }
    uint32_t result = 0;
    for (int i = 0; i < bits; i++) {
        if (weights[i] > 0) result |= (1u << i);
    }
    return result;
}

int hammingDistance(uint32_t a, uint32_t b) {
    uint32_t x = a ^ b;
    int count = 0;
    while (x != 0) {
        count += static_cast<int>(x & 1u);
        x >>= 1;
    }
    return count;
}
```

```rust
use std::collections::HashMap;

fn fnv1a32(s: &str) -> u32 {
    let mut h: u32 = 0x811c9dc5;
    for b in s.bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x01000193);
    }
    h
}

fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase().split_whitespace().map(|s| s.to_string()).collect()
}

fn simhash(text: &str, bits: u32) -> u32 {
    let mut weights = vec![0i32; bits as usize];
    let mut counts: HashMap<String, i32> = HashMap::new();
    for token in tokenize(text) {
        *counts.entry(token).or_insert(0) += 1;
    }
    for (token, weight) in &counts {
        let h = fnv1a32(token);
        for i in 0..bits {
            if (h >> i) & 1 != 0 {
                weights[i as usize] += weight;
            } else {
                weights[i as usize] -= weight;
            }
        }
    }
    let mut result: u32 = 0;
    for i in 0..bits {
        if weights[i as usize] > 0 {
            result |= 1 << i;
        }
    }
    result
}

fn hamming_distance(a: u32, b: u32) -> u32 {
    (a ^ b).count_ones()
}
```

```csharp
static uint Fnv1a32(string s)
{
    uint h = 0x811C9DC5;
    foreach (byte b in Encoding.UTF8.GetBytes(s))
    {
        h ^= b;
        h *= 0x01000193;
    }
    return h;
}

static List<string> Tokenize(string text) =>
    text.ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).ToList();

static uint SimHash(string text, int bits = 32)
{
    var weights = new int[bits];
    var counts = new Dictionary<string, int>();
    foreach (var token in Tokenize(text))
    {
        counts[token] = counts.GetValueOrDefault(token, 0) + 1;
    }
    foreach (var (token, weight) in counts)
    {
        uint h = Fnv1a32(token);
        for (int i = 0; i < bits; i++)
        {
            if (((h >> i) & 1) != 0) weights[i] += weight;
            else weights[i] -= weight;
        }
    }
    uint result = 0;
    for (int i = 0; i < bits; i++)
    {
        if (weights[i] > 0) result |= (1u << i);
    }
    return result;
}

static int HammingDistance(uint a, uint b)
{
    uint x = a ^ b;
    int count = 0;
    while (x != 0)
    {
        count += (int)(x & 1);
        x >>= 1;
    }
    return count;
}
```
