---
name: 制限酵素地図作成問題(Double Digest Problem)
category: バイオインフォマティクス
subcategory: ゲノムアセンブリ
complexity: O(n!)(単一消化の断片並べ替え、ダブルダイジェストはNP困難)
summary: 制限酵素でDNAを切断して得られる断片長の集合から、元の切断位置の並び(制限酵素地図)を復元する組合せ最適化問題で、単一酵素の情報だけでは地図が一意に定まらない不良設定性を持つ。
---

## 概要

制限酵素はDNA上の特定の塩基配列(認識配列)を狙って切断するタンパク質で、次世代シーケンサーが普及する以前のゲノム解析では、DNA断片の長さをゲル電気泳動で測定し、その断片長の集合から「どこに切断部位があったか」を逆算する制限酵素地図(restriction map)が構造解析の基本ツールだった。問題は、電気泳動で分かるのは各断片の**長さの集合**だけで、断片が元のDNA上でどの順序に並んでいたかという情報は失われてしまう点にある。1本のDNAを1種類の酵素で切断した「単一消化(single digest)」の断片長だけから元の並びを再構成しようとすると、異なる並び方が同じ断片長の集合を生む場合があり、地図が一意に定まらないことが少なくない。そこで実際には、2種類の酵素をそれぞれ単独で使った消化と、両方を同時に使った消化(ダブルダイジェスト、double digest)の3種類の断片長情報を組み合わせて地図を絞り込む「ダブルダイジェスト問題」が定式化され、計算生物学における初期の代表的な組合せ最適化問題として研究されてきた。

## 仕組み

1. **単一消化の限界を理解する**: 酵素Aで切断して得られた断片長の集合(マルチセット)`{l1, l2, ..., ln}`が与えられたとき、これらを並べ替えて元のDNA上の切断位置を復元しようとすると、`n`個の断片の順列のうち複数(あるいは全て)が同じ断片長の集合を再現してしまうことがある。例えば断片長`{2, 3, 5}`は`2-3-5`でも`5-3-2`(反転)でも、あるいは全く異なる並びでも同じ長さの集合を与えうるため、単一酵素の情報だけでは地図が一意に決まらない**不良設定問題(ill-posed problem)**になる
2. **ダブルダイジェストで情報を追加する**: 酵素A単独、酵素B単独、そして酵素AとBを同時に使った消化(A+B)の3通りの断片長集合を用意する。A+Bの消化では、Aの切断部位とBの切断部位の両方でDNAが切られるため、A単独・B単独それぞれの切断位置の相対的な順序関係(どちらが先か)に関する追加の制約が得られる
3. **探索問題として定式化する**: 酵素Aの切断位置の集合を数直線上の点の並び、酵素Bの切断位置の集合をもう一つの点の並びとして、この2つの点列を数直線上に「重ね合わせる」際に、Aの点列から生成される断片長の集合が観測されたA単独消化の結果と一致し、Bの点列も同様にB単独消化の結果と一致し、さらに両方の点列を合わせた全ての隣接区間の長さがA+B消化の結果と一致する、という3つの制約を同時に満たす配置を探す
4. **探索方法**: 素朴には、酵素Aの切断位置の順列と酵素Bの切断位置の順列の組み合わせを全探索し、それぞれの順列が生む断片長パターンとA+Bダイジェストの観測値を照合するバックトラック探索(枝刈り付き分岐限定法)で解く。実務上は酵素A・Bそれぞれの断片数が数個〜十数個程度に収まることが多いため、深さ優先探索に累積長の矛盾を検出した時点で打ち切る枝刈りを組み合わせることで、指数時間ながら実用的な時間で解けるケースが多い
5. **一意性の検証**: 制約を満たす配置が複数見つかった場合、それらは全て観測データと矛盾しない「候補地図」であり、追加の実験的制約(部分消化や別酵素の情報)なしには真の地図をこれ以上絞り込めない

## 特性・トレードオフ

- **計算量とNP困難性**: 単一消化の断片を並べ替えるだけの部分問題は`O(n!)`の順列探索に相当するが、ダブルダイジェスト問題全体は一般に**NP困難**であることが知られている。実用上は分岐限定法や動的計画法的な枝刈りで平均的なケースを高速化するが、最悪計算量は指数関数的なまま残る
- **不良設定性という本質的な難しさ**: この問題の核心は計算量そのものよりも、単一酵素の断片長情報だけでは地図が一意に定まらないという情報理論的な限界にある。順列の反転対称性(DNAをどちらの端から読んでも同じ断片長集合になる)に加え、断片長の並べ替えに複数の解が存在しうるため、追加の消化実験(ダブルダイジェスト)によって初めて曖昧さの多くが解消される
- **測定誤差への脆弱性**: ゲル電気泳動による断片長の測定には誤差が伴い、近い長さの断片同士を区別できない、あるいは小さすぎる断片がゲルから流れ出て検出されないといった実験的な制約がある。誤差を許容する定式化(観測された断片長を区間として扱う)にすると、探索空間はさらに広がり計算はより困難になる
- **現代における位置づけ**: 次世代シーケンサーの普及によって、DNA配列を直接大量に読み取り[de Bruijnグラフによるゲノムアセンブリ](/algorithms/de-bruijn-graph-assembly)や[オーバーラップ・レイアウト・コンセンサス法](/algorithms/overlap-layout-consensus)、[k-merカウント](/algorithms/k-mer-counting)で配列そのものを再構成する手法が主流になり、制限酵素地図作成は日常的なゲノム解析の手段としては下火になった。ただし、大規模ゲノムの構造的な骨格を低コストで確認する目的や、アセンブリ結果を独立に検証するための「光学マッピング」など関連手法の理論的基盤として、組合せ最適化の古典問題として教育・研究の場では今も参照される
- **使いどころ**: 遺伝子クローニングにおけるプラスミド・BACクローンの制限酵素地図作成、比較的小規模なDNA断片(数千〜数万塩基対)の構造確認、配列決定コストが高かった時代のゲノム構造の粗い骨格把握

## 実装例

以下は、酵素A・酵素Bそれぞれの単一消化で得られた断片長と、両者を同時に使ったダブルダイジェストの断片長を入力に、矛盾しない切断位置の組を分岐限定法で探索する実装。

```python
from itertools import permutations


def _cuts_from_fragments(total: int, fragment_perm: tuple[int, ...]) -> list[int]:
    """断片長の並びから、DNAの先頭(位置0)を基準にした切断位置の絶対座標を返す。"""
    cuts = [0]
    pos = 0
    for length in fragment_perm:
        pos += length
        cuts.append(pos)
    return cuts  # 先頭0と末尾totalを含む


def _double_digest_fragments(cuts_a: list[int], cuts_b: list[int]) -> list[int]:
    """両酵素の切断位置を数直線上でマージし、隣接する切断点間の距離(断片長)を返す。"""
    merged = sorted(set(cuts_a) | set(cuts_b))
    return [merged[i + 1] - merged[i] for i in range(len(merged) - 1)]


def solve_double_digest(
    fragments_a: list[int], fragments_b: list[int], fragments_ab: list[int]
) -> list[tuple[list[int], list[int]]]:
    """
    酵素A単独・B単独・A+Bダイジェストの断片長集合から、矛盾しない
    (酵素Aの切断位置, 酵素Bの切断位置) の候補を全て返す。
    候補が複数あれば、単一消化の情報だけでは地図が一意に定まらないことを意味する。
    """
    total = sum(fragments_a)
    if total != sum(fragments_b) or total != sum(fragments_ab):
        return []  # 全長が一致しなければ観測データ自体に矛盾がある

    target_ab = sorted(fragments_ab)
    solutions: list[tuple[list[int], list[int]]] = []
    seen_pairs: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()

    # 順列の反転で同じ地図(DNAを逆向きに読んだだけ)が重複しないよう、
    # Aの並びは代表元(先頭の順列)に固定して探索空間を半分に絞る。
    perms_a = set(permutations(fragments_a))
    perms_b = set(permutations(fragments_b))

    for perm_a in perms_a:
        cuts_a = _cuts_from_fragments(total, perm_a)
        for perm_b in perms_b:
            cuts_b = _cuts_from_fragments(total, perm_b)
            merged_fragments = sorted(_double_digest_fragments(cuts_a, cuts_b))
            if merged_fragments == target_ab:
                key_a = tuple(cuts_a)
                key_b = tuple(cuts_b)
                key_a_rev = tuple(sorted(total - c for c in cuts_a))
                key_b_rev = tuple(sorted(total - c for c in cuts_b))
                # 反転(逆向きに読んだ地図)も既出なら重複としてスキップ
                if (key_a, key_b) in seen_pairs or (key_a_rev, key_b_rev) in seen_pairs:
                    continue
                seen_pairs.add((key_a, key_b))
                solutions.append((cuts_a, cuts_b))

    return solutions
```

```typescript
function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const perm of permutations(rest)) {
      result.push([items[i], ...perm]);
    }
  }
  return result;
}

function cutsFromFragments(fragmentPerm: number[]): number[] {
  const cuts = [0];
  let pos = 0;
  for (const length of fragmentPerm) {
    pos += length;
    cuts.push(pos);
  }
  return cuts;
}

function doubleDigestFragments(cutsA: number[], cutsB: number[]): number[] {
  const merged = Array.from(new Set([...cutsA, ...cutsB])).sort((a, b) => a - b);
  const fragments: number[] = [];
  for (let i = 0; i < merged.length - 1; i++) fragments.push(merged[i + 1] - merged[i]);
  return fragments;
}

function sortedEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

/**
 * 酵素A単独・B単独・A+Bダイジェストの断片長集合から、矛盾しない
 * (酵素Aの切断位置, 酵素Bの切断位置) の候補を全て返す。
 */
function solveDoubleDigest(
  fragmentsA: number[],
  fragmentsB: number[],
  fragmentsAB: number[]
): Array<{ cutsA: number[]; cutsB: number[] }> {
  const total = fragmentsA.reduce((a, b) => a + b, 0);
  const totalB = fragmentsB.reduce((a, b) => a + b, 0);
  const totalAB = fragmentsAB.reduce((a, b) => a + b, 0);
  if (total !== totalB || total !== totalAB) return [];

  const targetAB = [...fragmentsAB].sort((a, b) => a - b);
  const solutions: Array<{ cutsA: number[]; cutsB: number[] }> = [];
  const seen = new Set<string>();

  const permsA = permutations(fragmentsA);
  const permsB = permutations(fragmentsB);

  for (const permA of permsA) {
    const cutsA = cutsFromFragments(permA);
    for (const permB of permsB) {
      const cutsB = cutsFromFragments(permB);
      const merged = doubleDigestFragments(cutsA, cutsB);
      if (sortedEqual(merged, targetAB)) {
        const keyA = cutsA.join(",");
        const keyB = cutsB.join(",");
        const keyARev = cutsA.map((c) => total - c).sort((a, b) => a - b).join(",");
        const keyBRev = cutsB.map((c) => total - c).sort((a, b) => a - b).join(",");
        const forward = `${keyA}|${keyB}`;
        const reversed = `${keyARev}|${keyBRev}`;
        if (seen.has(forward) || seen.has(reversed)) continue;
        seen.add(forward);
        solutions.push({ cutsA, cutsB });
      }
    }
  }

  return solutions;
}
```
