---
name: MinHash / LSH(局所性鋭敏型ハッシュ)
category: 情報検索・ランキング
subcategory: 近似検索
complexity: O(1)(近似)
summary: 集合の類似度(Jaccard係数)をハッシュの一致率で近似し、大規模データの重複検出を高速化する。
---

## 概要

「この文書と、他の数百万件の文書の中で、どれが似ているか」を厳密に調べるには、全ペアを総当たりで比較する必要がありO(n²)かかってしまう。MinHashとLSH(局所性鋭敏型ハッシュ)を組み合わせると、**集合同士の類似度(Jaccard係数)を、少数のハッシュ値の一致率だけで近似**でき、大規模データの重複検出・類似検索を現実的な時間で行えるようになる。GoogleのWebページ重複検出など、大規模検索基盤の裏側を支える技術。

## 仕組み

**MinHash(類似度の近似)**:
1. 比較したい集合(文書に含まれる単語の集合など)に対し、複数の異なるハッシュ関数を用意する
2. 各ハッシュ関数について、その集合の全要素をハッシュ化し、**最小のハッシュ値**だけを記録する(これが1つの「シグネチャ値」になる)
3. これを複数のハッシュ関数分繰り返し、短い「シグネチャ(署名)」を作る
4. 2つの集合のシグネチャを比較し、**一致する割合**が、元の集合同士のJaccard係数(共通要素の割合)の良い近似値になることが数学的に証明されている

**LSH(高速な類似ペアの発見)**:
1. MinHashで作った長いシグネチャを、いくつかの「バンド」に分割する
2. 各バンドの内容をキーにしてハッシュテーブルに登録する
3. **同じバンドの内容が一致した(=同じバケットに入った)集合同士だけ**を、類似候補として抽出する
4. 全ペアを比較する必要がなく、同じバケットに入ったペアだけを詳しく調べればよいため、大規模データでも現実的な時間で類似ペアを発見できる

## 特性・トレードオフ

- **計算量**: シグネチャの生成・比較はO(1)に近い定数時間(シグネチャの長さに依存)。LSHによる候補の絞り込みにより、全ペア比較のO(n²)を回避できる
- **近似であることの意味**: 正確なJaccard係数を保証するわけではなく、確率的な近似値を返す。ハッシュ関数の数(シグネチャの長さ)を増やせば精度は上がるが、計算コストとのトレードオフになる
- **「局所性鋭敏」という名前の意味**: 通常のハッシュ関数は似た入力でも全く異なる出力になるよう設計されるが、LSHは逆に**「似た入力ほど同じハッシュ値になりやすい」**よう意図的に設計されている点が、暗号学的ハッシュ関数とは対照的
- **使いどころ**: 大規模文書集合における重複・剽窃検出、レコメンデーションシステムにおける類似ユーザー・類似商品の発見、画像の類似検索、ゲノム配列の類似領域の高速検出など

## 実装例

```python
import random


def generate_hash_functions(
    num_hashes: int, prime: int = 4_294_967_311, seed: int = 42
) -> list[tuple[int, int, int]]:
    rng = random.Random(seed)
    return [(rng.randint(1, prime - 1), rng.randint(0, prime - 1), prime) for _ in range(num_hashes)]


def minhash_signature(s: set[int], hash_fns: list[tuple[int, int, int]]) -> list[int]:
    return [min((a * x + b) % p for x in s) for a, b, p in hash_fns]


def estimate_jaccard(sig_a: list[int], sig_b: list[int]) -> float:
    matches = sum(1 for x, y in zip(sig_a, sig_b) if x == y)
    return matches / len(sig_a)


def lsh_bands(signature: list[int], num_bands: int) -> list[tuple[int, ...]]:
    rows_per_band = len(signature) // num_bands
    return [tuple(signature[i * rows_per_band:(i + 1) * rows_per_band]) for i in range(num_bands)]


def is_candidate_pair(sig_a: list[int], sig_b: list[int], num_bands: int) -> bool:
    bands_a = lsh_bands(sig_a, num_bands)
    bands_b = lsh_bands(sig_b, num_bands)
    return any(ba == bb for ba, bb in zip(bands_a, bands_b))
```

```typescript
function generateHashFunctions(numHashes: number, prime: number = 4294967311): [number, number, number][] {
  const fns: [number, number, number][] = [];
  for (let i = 0; i < numHashes; i++) {
    const a = Math.floor(Math.random() * (prime - 1)) + 1;
    const b = Math.floor(Math.random() * prime);
    fns.push([a, b, prime]);
  }
  return fns;
}

function minhashSignature(s: Set<number>, hashFns: [number, number, number][]): number[] {
  return hashFns.map(([a, b, p]) => {
    let min = Infinity;
    for (const x of s) {
      const h = (a * x + b) % p;
      if (h < min) min = h;
    }
    return min;
  });
}

function estimateJaccard(sigA: number[], sigB: number[]): number {
  let matches = 0;
  for (let i = 0; i < sigA.length; i++) if (sigA[i] === sigB[i]) matches++;
  return matches / sigA.length;
}

function lshBands(signature: number[], numBands: number): string[] {
  const rowsPerBand = Math.floor(signature.length / numBands);
  const bands: string[] = [];
  for (let i = 0; i < numBands; i++) {
    bands.push(signature.slice(i * rowsPerBand, (i + 1) * rowsPerBand).join(","));
  }
  return bands;
}

function isCandidatePair(sigA: number[], sigB: number[], numBands: number): boolean {
  const bandsA = lshBands(sigA, numBands);
  const bandsB = lshBands(sigB, numBands);
  return bandsA.some((band, i) => band === bandsB[i]);
}
```

```cpp
#include <climits>
#include <random>
#include <set>
#include <sstream>
#include <string>
#include <tuple>
#include <vector>

std::vector<std::tuple<long long, long long, long long>> generateHashFunctions(
    int numHashes, long long prime = 4294967311LL, unsigned seed = 42) {
    std::mt19937_64 rng(seed);
    std::uniform_int_distribution<long long> distA(1, prime - 1);
    std::uniform_int_distribution<long long> distB(0, prime - 1);
    std::vector<std::tuple<long long, long long, long long>> fns;
    for (int i = 0; i < numHashes; i++) {
        fns.emplace_back(distA(rng), distB(rng), prime);
    }
    return fns;
}

std::vector<long long> minhashSignature(
    const std::set<int>& s, const std::vector<std::tuple<long long, long long, long long>>& hashFns) {
    std::vector<long long> sig;
    for (const auto& [a, b, p] : hashFns) {
        long long minVal = LLONG_MAX;
        for (int x : s) {
            long long h = (a * x + b) % p;
            if (h < minVal) minVal = h;
        }
        sig.push_back(minVal);
    }
    return sig;
}

double estimateJaccard(const std::vector<long long>& sigA, const std::vector<long long>& sigB) {
    int matches = 0;
    for (size_t i = 0; i < sigA.size(); i++) if (sigA[i] == sigB[i]) matches++;
    return static_cast<double>(matches) / sigA.size();
}

std::vector<std::string> lshBands(const std::vector<long long>& signature, int numBands) {
    int rowsPerBand = static_cast<int>(signature.size()) / numBands;
    std::vector<std::string> bands;
    for (int i = 0; i < numBands; i++) {
        std::ostringstream oss;
        for (int j = 0; j < rowsPerBand; j++) oss << signature[i * rowsPerBand + j] << ",";
        bands.push_back(oss.str());
    }
    return bands;
}

bool isCandidatePair(const std::vector<long long>& sigA, const std::vector<long long>& sigB, int numBands) {
    auto bandsA = lshBands(sigA, numBands);
    auto bandsB = lshBands(sigB, numBands);
    for (size_t i = 0; i < bandsA.size(); i++) if (bandsA[i] == bandsB[i]) return true;
    return false;
}
```

```rust
use rand::Rng;
use std::collections::HashSet;

fn generate_hash_functions(num_hashes: usize, prime: i64, rng: &mut impl Rng) -> Vec<(i64, i64, i64)> {
    (0..num_hashes)
        .map(|_| (rng.gen_range(1..prime), rng.gen_range(0..prime), prime))
        .collect()
}

fn minhash_signature(s: &HashSet<i64>, hash_fns: &[(i64, i64, i64)]) -> Vec<i64> {
    hash_fns
        .iter()
        .map(|&(a, b, p)| s.iter().map(|&x| (a * x + b).rem_euclid(p)).min().unwrap())
        .collect()
}

fn estimate_jaccard(sig_a: &[i64], sig_b: &[i64]) -> f64 {
    let matches = sig_a.iter().zip(sig_b).filter(|(a, b)| a == b).count();
    matches as f64 / sig_a.len() as f64
}

fn lsh_bands(signature: &[i64], num_bands: usize) -> Vec<&[i64]> {
    let rows_per_band = signature.len() / num_bands;
    (0..num_bands).map(|i| &signature[i * rows_per_band..(i + 1) * rows_per_band]).collect()
}

fn is_candidate_pair(sig_a: &[i64], sig_b: &[i64], num_bands: usize) -> bool {
    let bands_a = lsh_bands(sig_a, num_bands);
    let bands_b = lsh_bands(sig_b, num_bands);
    bands_a.iter().zip(bands_b.iter()).any(|(a, b)| a == b)
}
```

```csharp
using System;
using System.Collections.Generic;

static List<(long a, long b, long p)> GenerateHashFunctions(int numHashes, long prime = 4294967311, int seed = 42)
{
    var rnd = new Random(seed);
    var fns = new List<(long, long, long)>();
    for (int i = 0; i < numHashes; i++)
    {
        long a = rnd.NextInt64(1, prime - 1);
        long b = rnd.NextInt64(0, prime);
        fns.Add((a, b, prime));
    }
    return fns;
}

static List<long> MinHashSignature(HashSet<int> s, List<(long a, long b, long p)> hashFns)
{
    var sig = new List<long>();
    foreach (var (a, b, p) in hashFns)
    {
        long min = long.MaxValue;
        foreach (var x in s)
        {
            long h = (a * x + b) % p;
            if (h < min) min = h;
        }
        sig.Add(min);
    }
    return sig;
}

static double EstimateJaccard(List<long> sigA, List<long> sigB)
{
    int matches = 0;
    for (int i = 0; i < sigA.Count; i++) if (sigA[i] == sigB[i]) matches++;
    return (double)matches / sigA.Count;
}

static List<string> LshBands(List<long> signature, int numBands)
{
    int rowsPerBand = signature.Count / numBands;
    var bands = new List<string>();
    for (int i = 0; i < numBands; i++)
    {
        bands.Add(string.Join(",", signature.GetRange(i * rowsPerBand, rowsPerBand)));
    }
    return bands;
}

static bool IsCandidatePair(List<long> sigA, List<long> sigB, int numBands)
{
    var bandsA = LshBands(sigA, numBands);
    var bandsB = LshBands(sigB, numBands);
    for (int i = 0; i < bandsA.Count; i++) if (bandsA[i] == bandsB[i]) return true;
    return false;
}
```
