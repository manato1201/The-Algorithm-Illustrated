---
name: オーバーラップ・レイアウト・コンセンサス法(OLC法)
category: バイオインフォマティクス
subcategory: ゲノムアセンブリ
complexity: O(n²×L)(nリード、平均長L、全ペア重なり検出)
summary: リード同士の重なりを直接検出してグラフを作り、そのグラフ上の経路を辿ってから多数決で最終配列を確定する、長い読み取りに適したゲノムアセンブリの伝統的な枠組み。
---

## 概要

[de Bruijnグラフによるゲノムアセンブリ](/algorithms/de-bruijn-graph-assembly)はk-merという固定長の断片を経由するが、より直接的なアプローチとして、リード同士がどこでどれだけ重なっているかを直接見つけ出す方法もある。オーバーラップ・レイアウト・コンセンサス法(OLC法)は、その名の通り3段階からなる伝統的なアセンブリの枠組みで、サンガー法のような比較的長いリードを扱う初期のゲノムアセンブリで主流だった手法であり、近年の第3世代シーケンサー(PacBio、Nanopore、より長いが誤りの多いリードを生成する)のアセンブリでも再び重要性を増している。

## 仕組み

1. **オーバーラップ(Overlap)検出**: 全リードのペアについて、一方のリードの末尾ともう一方の先頭が重なっているかを、[Smith-Waterman法](/algorithms/smith-waterman)のような局所アラインメント(あるいはその高速な近似)で調べる。全ペアの総当たり比較は計算コストが高いため、実用の実装では[k-merカウント](/algorithms/k-mer-counting)による事前フィルタリングで、明らかに重ならないペアの組み合わせをふるい落としてから、有望なペアだけを詳細に調べる
2. 検出した重なりの情報から、リードを頂点、重なりを辺とする「オーバーラップグラフ」を構築する
3. **レイアウト(Layout)**: このグラフ上で、全リードを矛盾なく一直線に並べる経路を見つける(オーバーラップグラフ上のハミルトン路に近い問題だが、実際には厳密な最適解ではなく実用的な発見的手法で経路を構築する)。反復配列によって生じる曖昧な分岐は、[de Bruijnグラフ](/algorithms/de-bruijn-graph-assembly)の場合と同様にアセンブリの難所になる
4. **コンセンサス(Consensus)**: レイアウトで確定した並び順に沿って、重なり合う複数のリードを積み重ね、各位置での多数決(または品質スコアで重み付けした投票)によって、最終的な1本のコンセンサス配列を確定する——個々のリードの読み取りエラーは、複数リードの重なりによる多数決で打ち消される

## 特性・トレードオフ

- **計算量**: オーバーラップ検出が全ペア比較になると`O(n² × L)`(`n`リード数、`L`平均長)と重くなりやすいが、実務では索引構造による事前フィルタリングで大幅に削減する
- **長いリードとの相性**: k-merに分解する[de Bruijnグラフ法](/algorithms/de-bruijn-graph-assembly)は短く正確なリードに向くが、OLC法はリード全体を直接扱うため、長いが誤りを含みやすい第3世代シーケンサーのリードのアセンブリに適している——重なりの検出時にある程度のエラーを許容するアラインメントを使えるため
- **反復配列への対応の違い**: OLC法は個々のリードが十分長ければ、反復配列全体を1本のリードでカバーできることがあり、その場合はde Bruijnグラフ法よりも反復配列由来の曖昧さを解消しやすい——「リードが反復配列より長いか」が両手法の得意・不得意を分ける重要な要因になる
- **使いどころ**: サンガー法時代の初期ゲノムプロジェクト(ヒトゲノム計画の一部でも使用)、PacBio・Oxford Nanoporeのような長リードシーケンサーによる高精度なゲノムアセンブリ、反復配列の多い複雑なゲノム領域の解決

## 実装例

短い塩基配列のリード集合から、最大重なりのペアを貪欲に選んで結合していく単純化されたOLC法。オーバーラップ検出とレイアウトを1つのループに統合し、重なり合う複数リードを結合していくことで元の配列が正しく再構築されることを検証する(コンセンサスは重複領域が完全一致する前提で結合そのものが担う)。

```python
def overlap_len(a: str, b: str, min_overlap: int = 3) -> int:
    # aの末尾とbの先頭が重なる最大の長さkを探す
    max_k = min(len(a), len(b))
    for k in range(max_k, min_overlap - 1, -1):
        if a[-k:] == b[:k]:
            return k
    return 0


def olc_assemble(reads: list[str], min_overlap: int = 3) -> str:
    current = list(reads)
    while len(current) > 1:
        # オーバーラップ検出: 全ペアの中で最大重なりを持つものを探す(レイアウト)
        best_k, best_i, best_j = -1, -1, -1
        for i in range(len(current)):
            for j in range(len(current)):
                if i == j:
                    continue
                k = overlap_len(current[i], current[j], min_overlap)
                if k > best_k:
                    best_k, best_i, best_j = k, i, j
        if best_k == 0:
            merged = current[0] + current[1]
            current = [merged] + current[2:]
            continue
        # コンセンサス: 重なり部分をそのまま繋げて1本にまとめる
        merged = current[best_i] + current[best_j][best_k:]
        rest = [r for idx, r in enumerate(current) if idx != best_i and idx != best_j]
        current = [merged] + rest
    return current[0]
```

```typescript
function overlapLen(a: string, b: string, minOverlap = 3): number {
  // aの末尾とbの先頭が重なる最大の長さkを探す
  const maxK = Math.min(a.length, b.length);
  for (let k = maxK; k >= minOverlap; k--) {
    if (a.slice(-k) === b.slice(0, k)) return k;
  }
  return 0;
}

function olcAssemble(reads: string[], minOverlap = 3): string {
  let current = [...reads];
  while (current.length > 1) {
    // オーバーラップ検出: 全ペアの中で最大重なりを持つものを探す(レイアウト)
    let bestK = -1, bestI = -1, bestJ = -1;
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current.length; j++) {
        if (i === j) continue;
        const k = overlapLen(current[i], current[j], minOverlap);
        if (k > bestK) { bestK = k; bestI = i; bestJ = j; }
      }
    }
    if (bestK === 0) {
      current = [current[0] + current[1], ...current.slice(2)];
      continue;
    }
    // コンセンサス: 重なり部分をそのまま繋げて1本にまとめる
    const merged = current[bestI] + current[bestJ].slice(bestK);
    const rest = current.filter((_, idx) => idx !== bestI && idx !== bestJ);
    current = [merged, ...rest];
  }
  return current[0];
}
```

```cpp
#include <vector>
#include <string>

int overlapLen(const std::string& a, const std::string& b, int minOverlap = 3) {
    int maxK = std::min(a.size(), b.size());
    for (int k = maxK; k >= minOverlap; k--) {
        if (a.substr(a.size() - k) == b.substr(0, k)) return k;
    }
    return 0;
}

std::string olcAssemble(std::vector<std::string> reads, int minOverlap = 3) {
    while (reads.size() > 1) {
        int bestK = -1, bestI = -1, bestJ = -1;
        for (size_t i = 0; i < reads.size(); i++) {
            for (size_t j = 0; j < reads.size(); j++) {
                if (i == j) continue;
                int k = overlapLen(reads[i], reads[j], minOverlap);
                if (k > bestK) { bestK = k; bestI = static_cast<int>(i); bestJ = static_cast<int>(j); }
            }
        }
        std::vector<std::string> next;
        if (bestK == 0) {
            next.push_back(reads[0] + reads[1]);
            for (size_t idx = 2; idx < reads.size(); idx++) next.push_back(reads[idx]);
        } else {
            next.push_back(reads[bestI] + reads[bestJ].substr(bestK));
            for (size_t idx = 0; idx < reads.size(); idx++) {
                if (static_cast<int>(idx) != bestI && static_cast<int>(idx) != bestJ) next.push_back(reads[idx]);
            }
        }
        reads = next;
    }
    return reads[0];
}
```

```rust
fn overlap_len(a: &str, b: &str, min_overlap: usize) -> usize {
    let (ab, bb) = (a.as_bytes(), b.as_bytes());
    let max_k = ab.len().min(bb.len());
    let mut k = max_k;
    while k >= min_overlap {
        if &ab[ab.len() - k..] == &bb[..k] {
            return k;
        }
        k -= 1;
    }
    0
}

fn olc_assemble(reads: Vec<String>, min_overlap: usize) -> String {
    let mut current = reads;
    while current.len() > 1 {
        let mut best_k = 0usize;
        let mut found = false;
        let (mut best_i, mut best_j) = (0usize, 0usize);
        for i in 0..current.len() {
            for j in 0..current.len() {
                if i == j {
                    continue;
                }
                let k = overlap_len(&current[i], &current[j], min_overlap);
                if !found || k > best_k {
                    best_k = k;
                    best_i = i;
                    best_j = j;
                    found = true;
                }
            }
        }
        let mut next = Vec::new();
        if best_k == 0 {
            next.push(format!("{}{}", current[0], current[1]));
            next.extend(current.into_iter().skip(2));
        } else {
            let merged = format!("{}{}", current[best_i], &current[best_j][best_k..]);
            next.push(merged);
            for (idx, r) in current.into_iter().enumerate() {
                if idx != best_i && idx != best_j {
                    next.push(r);
                }
            }
        }
        current = next;
    }
    current.into_iter().next().unwrap()
}
```

```csharp
static int OverlapLen(string a, string b, int minOverlap = 3)
{
    int maxK = Math.Min(a.Length, b.Length);
    for (int k = maxK; k >= minOverlap; k--)
        if (a.Substring(a.Length - k) == b.Substring(0, k)) return k;
    return 0;
}

static string OlcAssemble(List<string> reads, int minOverlap = 3)
{
    var current = new List<string>(reads);
    while (current.Count > 1)
    {
        int bestK = -1, bestI = -1, bestJ = -1;
        for (int i = 0; i < current.Count; i++)
        {
            for (int j = 0; j < current.Count; j++)
            {
                if (i == j) continue;
                int k = OverlapLen(current[i], current[j], minOverlap);
                if (k > bestK) { bestK = k; bestI = i; bestJ = j; }
            }
        }
        if (bestK == 0)
        {
            var merged0 = current[0] + current[1];
            current = new List<string> { merged0 }.Concat(current.Skip(2)).ToList();
            continue;
        }
        var merged = current[bestI] + current[bestJ].Substring(bestK);
        var rest = current.Where((_, idx) => idx != bestI && idx != bestJ).ToList();
        current = new List<string> { merged }.Concat(rest).ToList();
    }
    return current[0];
}
```
