---
name: DC3法(Skew Algorithm)による接尾辞配列の線形時間構築
category: 文字列
subcategory: 接尾辞構造
complexity: O(n)
summary: 接尾辞を開始位置のmod 3で3グループに分け、うち2グループを再帰的にソートしてから残り1グループをそれに基づき比較することで、接尾辞配列をO(n)の線形時間で構築する分割統治アルゴリズム。
---

## 概要

[接尾辞配列](/algorithms/suffix-array)は多くの文字列処理問題の土台になる強力なデータ構造だが、標準的な倍々法(doubling法)による構築はO(n log n)かかる。DC3法(Difference Cover modulo 3、Skew Algorithmとも呼ばれる)は、2003年にJuha Kärkkäinenらによって提案された、接尾辞配列を**真の線形時間O(n)**で構築するアルゴリズムである。「接尾辞を開始位置のmod 3で3つのグループに分け、そのうち2つのグループ(全体の2/3)を再帰的に処理し、残り1つのグループ(全体の1/3)をO(n)のマージ的な比較で組み込む」という分割統治の発想により、再帰の各段階でデータ量が2/3に縮小していくことで全体の計算量を線形に抑える。

## 仕組み

1. **3グループへの分割**: 長さ`n`の文字列の全ての接尾辞を、開始位置`i`が`i mod 3 = 0`(グループ0)、`i mod 3 = 1`(グループ1)、`i mod 3 = 2`(グループ2)の3種類に分ける
2. **B12グループ(mod 3 が 1 または 2)の再帰処理**: グループ1とグループ2に属する接尾辞を合わせて、それぞれ3文字ずつの「トリプレット」に区切ってエンコードし、これらのトリプレットを要素とする**新しい短い文字列**を作る。この新しい文字列に対して同じDC3法を**再帰的に**適用し、B12接尾辞同士の順序を確定させる(トリプレットが全て相異なる値なら直接ソートするだけで済み、重複がある場合のみ再帰呼び出しが発生する)
3. **B0グループ(mod 3 = 0)のソート**: B0接尾辞`i`は「先頭1文字」と「1つ後ろの接尾辞`i+1`(これはB12グループに属し、既に順位が確定している)」のペアとして比較できるため、基数ソートでO(n)にソートできる
4. **マージ**: 順位が確定したB12グループとB0グループを、通常のマージソートのように**2グループ間の大小比較**をしながら1本の接尾辞配列にマージする。B0接尾辞とB12接尾辞の比較は、文字を1〜2文字ずらして「両方ともB1接尾辞になるように」変換してから、既に確定した順位情報を使って定数時間で行える
5. **計算量の再帰式**: 再帰1回あたりの非再帰処理(トリプレットのエンコード・基数ソート・マージ)はO(n)で、再帰呼び出しの対象は元のサイズの2/3(B12グループ分)になる。したがって`T(n) = T(2n/3) + O(n)`という再帰式が成り立ち、これを解くと`T(n) = O(n)`になる(倍々法が`T(n)`回の反復それぞれにO(n log n)かけるのに対し、DC3法はデータサイズを幾何級数的に縮小させながら全体をO(n)に抑える)

## 特性・トレードオフ

- **計算量**: O(n)の真の線形時間。[接尾辞配列](/algorithms/suffix-array)を倍々法で構築するO(n log n)より漸近的に高速だが、定数係数が大きく、実装も複雑なため、実用上は`n`が非常に大きい場合(ゲノム配列全体など数十億文字規模)でない限り倍々法で十分なことが多い
- **接尾辞木との関係**: 接尾辞木を線形時間で構築するUkkonenのアルゴリズムとは異なるアプローチで同じ「線形時間での接尾辞情報の構築」というゴールに到達する。接尾辞配列はメモリ効率で有利なため、大規模データではDC3法+接尾辞配列の組み合わせが好まれることがある
- **アルファベットへの要求**: 基数ソートを使うため、文字の種類数(アルファベットサイズ)が`O(n)`程度に収まっている必要がある(整数列にエンコードされた文字列や、通常のASCII/Unicode文字列であれば問題にならない)
- **使いどころ**: ゲノム配列解析など巨大な文字列に対する接尾辞配列の構築、全文検索エンジンの索引構築、[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)の高速な構築(BWTは接尾辞配列から直接導出できる)など、線形時間の保証が実用上重要になる大規模文字列処理

## 実装例

説明のための簡略化した実装(番兵として文字コード0を末尾に3つ追加し、境界処理を単純化している)。

```python
def dc3_suffix_array(s: str) -> list[int]:
    # 文字を整数配列に変換し、番兵(0)を3つ追加して境界処理を単純化する
    alphabet = sorted(set(s))
    rank_map = {c: i + 1 for i, c in enumerate(alphabet)}
    arr = [rank_map[c] for c in s] + [0, 0, 0]
    return _dc3(arr, len(s))


def _radix_sort(indices: list[int], arr: list[int], key_len: int, max_val: int) -> list[int]:
    result = indices
    for k in range(key_len - 1, -1, -1):
        buckets: list[list[int]] = [[] for _ in range(max_val + 2)]
        for idx in result:
            key = arr[idx + k] if idx + k < len(arr) else 0
            buckets[key].append(idx)
        result = [idx for bucket in buckets for idx in bucket]
    return result


def _dc3(arr: list[int], n: int) -> list[int]:
    b12 = [i for i in range(n + 1) if i % 3 != 0]
    max_val = max(arr) if arr else 0

    sorted12 = _radix_sort(b12, arr, 3, max_val)

    # トリプレットにランクを振る(重複があれば再帰、なければそのまま使う)
    rank = {}
    cur_rank = 0
    prev_triple = None
    has_duplicate = False
    for idx in sorted12:
        triple = tuple(arr[idx:idx + 3])
        if triple != prev_triple:
            cur_rank += 1
            prev_triple = triple
        else:
            has_duplicate = True
        rank[idx] = cur_rank

    if has_duplicate:
        # トリプレットのランク列に対して再帰的にDC3を適用する
        reduced = []
        idx_map = []
        for i in b12:
            if i % 3 == 1:
                reduced.append(rank[i])
        for i in b12:
            if i % 3 == 2:
                reduced.append(rank[i])
        half = (len(reduced) + 1) // 2
        idx_map = [i for i in range(1, n + 1, 3)] + [i for i in range(2, n + 1, 3)]
        reduced_padded = reduced + [0, 0, 0]
        sa_reduced = _dc3(reduced_padded, len(reduced))
        sorted_b12_positions = [idx_map[i] for i in sa_reduced if i < len(idx_map)]
    else:
        sorted_b12_positions = sorted12

    rank_of = {pos: r for r, pos in enumerate(sorted_b12_positions)}

    b0 = [i for i in range(0, n + 1, 3)]
    b0_keyed = sorted(
        b0,
        key=lambda i: (arr[i], rank_of.get(i + 1, -1)),
    )

    # B0とB12をマージする
    merged = []
    i, j = 0, 0
    while i < len(b0_keyed) and j < len(sorted_b12_positions):
        a, b = b0_keyed[i], sorted_b12_positions[j]
        if _less(arr, rank_of, a, b, n):
            merged.append(a)
            i += 1
        else:
            merged.append(b)
            j += 1
    merged.extend(b0_keyed[i:])
    merged.extend(sorted_b12_positions[j:])

    return [pos for pos in merged if pos < n]


def _less(arr: list[int], rank_of: dict[int, int], a: int, b: int, n: int) -> bool:
    if a % 3 == 1 or b % 3 == 1:
        # 両方とも(または片方が繰り上がって)B1として比較できる
        ka = (arr[a], rank_of.get(a + 1, -1))
        kb = (arr[b], rank_of.get(b + 1, -1))
        return ka < kb
    ka = (arr[a], arr[a + 1] if a + 1 <= n else 0, rank_of.get(a + 2, -1))
    kb = (arr[b], arr[b + 1] if b + 1 <= n else 0, rank_of.get(b + 2, -1))
    return ka < kb
```

```typescript
function dc3SuffixArray(s: string): number[] {
  const alphabet = Array.from(new Set(s.split(""))).sort();
  const rankMap = new Map(alphabet.map((c, i) => [c, i + 1]));
  const arr = [...s].map((c) => rankMap.get(c) as number).concat([0, 0, 0]);
  return dc3(arr, s.length);
}

function radixSort(
  indices: number[],
  arr: number[],
  keyLen: number,
  maxVal: number,
): number[] {
  let result = indices;
  for (let k = keyLen - 1; k >= 0; k--) {
    const buckets: number[][] = Array.from({ length: maxVal + 2 }, () => []);
    for (const idx of result) {
      const key = idx + k < arr.length ? arr[idx + k] : 0;
      buckets[key].push(idx);
    }
    result = buckets.flat();
  }
  return result;
}

function dc3(arr: number[], n: number): number[] {
  const b12: number[] = [];
  for (let i = 0; i <= n; i++) if (i % 3 !== 0) b12.push(i);
  const maxVal = arr.length ? Math.max(...arr) : 0;

  const sorted12 = radixSort(b12, arr, 3, maxVal);

  const rank = new Map<number, number>();
  let curRank = 0;
  let prevTriple: string | null = null;
  let hasDuplicate = false;
  for (const idx of sorted12) {
    const triple = `${arr[idx]},${arr[idx + 1] ?? 0},${arr[idx + 2] ?? 0}`;
    if (triple !== prevTriple) {
      curRank++;
      prevTriple = triple;
    } else {
      hasDuplicate = true;
    }
    rank.set(idx, curRank);
  }

  let sortedB12Positions: number[];
  if (hasDuplicate) {
    const reduced: number[] = [];
    for (let i = 1; i <= n; i += 3) reduced.push(rank.get(i) as number);
    for (let i = 2; i <= n; i += 3) reduced.push(rank.get(i) as number);
    const idxMap: number[] = [];
    for (let i = 1; i <= n; i += 3) idxMap.push(i);
    for (let i = 2; i <= n; i += 3) idxMap.push(i);
    const reducedPadded = reduced.concat([0, 0, 0]);
    const saReduced = dc3(reducedPadded, reduced.length);
    sortedB12Positions = saReduced
      .filter((i) => i < idxMap.length)
      .map((i) => idxMap[i]);
  } else {
    sortedB12Positions = sorted12;
  }

  const rankOf = new Map<number, number>();
  sortedB12Positions.forEach((pos, r) => rankOf.set(pos, r));

  const b0: number[] = [];
  for (let i = 0; i <= n; i += 3) b0.push(i);
  const b0Keyed = [...b0].sort((x, y) => {
    const kx: [number, number] = [arr[x], rankOf.get(x + 1) ?? -1];
    const ky: [number, number] = [arr[y], rankOf.get(y + 1) ?? -1];
    return kx[0] - ky[0] || kx[1] - ky[1];
  });

  const less = (a: number, b: number): boolean => {
    if (a % 3 === 1 || b % 3 === 1) {
      const ka: [number, number] = [arr[a], rankOf.get(a + 1) ?? -1];
      const kb: [number, number] = [arr[b], rankOf.get(b + 1) ?? -1];
      return ka[0] !== kb[0] ? ka[0] < kb[0] : ka[1] < kb[1];
    }
    const ka: [number, number, number] = [
      arr[a],
      a + 1 <= n ? arr[a + 1] : 0,
      rankOf.get(a + 2) ?? -1,
    ];
    const kb: [number, number, number] = [
      arr[b],
      b + 1 <= n ? arr[b + 1] : 0,
      rankOf.get(b + 2) ?? -1,
    ];
    if (ka[0] !== kb[0]) return ka[0] < kb[0];
    if (ka[1] !== kb[1]) return ka[1] < kb[1];
    return ka[2] < kb[2];
  };

  const merged: number[] = [];
  let i = 0;
  let j = 0;
  while (i < b0Keyed.length && j < sortedB12Positions.length) {
    const a = b0Keyed[i];
    const b = sortedB12Positions[j];
    if (less(a, b)) {
      merged.push(a);
      i++;
    } else {
      merged.push(b);
      j++;
    }
  }
  merged.push(...b0Keyed.slice(i));
  merged.push(...sortedB12Positions.slice(j));

  return merged.filter((pos) => pos < n);
}
```
