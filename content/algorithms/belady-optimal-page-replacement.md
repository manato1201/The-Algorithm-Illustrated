---
name: 最適ページ置換アルゴリズム(Beladyのアルゴリズム/MIN)
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(n・m)(nは参照列長、mはフレーム数。将来の参照列を毎回走査する素朴な実装の場合)
summary: 将来最も長い間参照されないページを追い出すことで理論上最小のページフォールト数を実現するが、未来の参照列を知る必要があるため実装不可能な、他アルゴリズムの評価基準として使われる理想化されたページ置換アルゴリズム。
---

## 概要

[Clockアルゴリズム](/algorithms/clock-algorithm)や[LFUキャッシュ](/algorithms/lfu-cache)、[LRU-Kページ置換アルゴリズム](/algorithms/lru-k-page-replacement)は、いずれも「過去の参照パターンから将来を予測する」という現実的な制約の中で工夫を凝らしている。では、もし未来のページ参照列があらかじめ完全に分かっていたら、どのページを追い出すのが最善だろうか——1966年にラズロー・ベラディ(László Bélády)が示した答えは単純明快で、「将来最も長い間参照されないページ」を追い出せば、任意の参照列に対してページフォールト数を理論上最小にできる。これが最適ページ置換アルゴリズム(通称Beladyのアルゴリズム、またはMINアルゴリズム)である。ただし未来の参照列を知ることは通常のシステムでは不可能なので、このアルゴリズム自体を実運用のOSに組み込むことはできない。その代わり、[Clockアルゴリズム](/algorithms/clock-algorithm)や[LRUキャッシュ](/algorithms/lru-cache)のような実用アルゴリズムが「理論上の最善にどれだけ近いか」を測るための、揺るぎない下限(ベンチマーク)として理論・実務の両面で重要な役割を果たしている。

## 仕組み

1. 前提として、これから発生するページ参照の完全な列(過去分だけでなく将来分も含む)があらかじめ分かっているとする(実システムでは成立しない、オフラインアルゴリズムとしての前提)
2. ページフォールトが発生し、メモリに空きがなく、追い出すページを1つ選ぶ必要が生じたとき、現在メモリ上にある各ページについて「現在時点から数えて、次に参照されるのが何ステップ先か」を、将来の参照列を先読みして調べる
3. 次に参照されるまでの距離が最も遠い(＝将来最も長い間使われない)ページを追い出し対象として選ぶ。もし複数のページの中に「二度と参照されない」ページが含まれていれば、それらは距離が無限大とみなされ、優先的に追い出される
4. 新しいページを、追い出した分の空いた領域に読み込む
5. これをページ参照列の最後まで繰り返す。得られたページフォールトの総数が、この参照列とフレーム数の組み合わせにおいて理論上達成可能な最小値になる

## 特性・トレードオフ

- **計算量**: 素朴な実装では、1回のフォールト処理ごとにメモリ上の全ページについて将来の参照列を走査して「次に使われるまでの距離」を求める必要があり、参照列長`n`・フレーム数`m`に対して`O(n・m)`程度のコストがかかる——実用アルゴリズムの`O(1)`や`O(log n)`と比べて著しく重く、この重さもまた「オフラインで全体を見渡せる前提だからこそ許容される」性質である
- **理論上の最適性という核心的な価値**: 任意のページ参照列とフレーム数の組み合わせに対して、Beladyのアルゴリズムが達成するページフォールト数は、他のどんな置換アルゴリズムを使っても下回ることができない理論的下限になる。これにより、[Clockアルゴリズム](/algorithms/clock-algorithm)・[LFUキャッシュ](/algorithms/lfu-cache)・[LRU-Kページ置換アルゴリズム](/algorithms/lru-k-page-replacement)のような実用アルゴリズムの性能を評価する際、「Beladyの最適解に対して何%増しのフォールト数で済んでいるか」という共通の物差しとして使われる
- **実装不可能性という本質的な制約**: 未来のページ参照列を正確に知ることは、通常のオペレーティングシステムでは原理的に不可能である(そもそも未来のプログラムの挙動を予測できるなら、置換戦略以前にもっと多くの問題が解決できてしまう)。そのため、このアルゴリズムは実運用のシステムに組み込まれることはなく、常に「理想化された比較対象」としての立ち位置にとどまる
- **[FIFOページ置換アルゴリズム](/algorithms/fifo-page-replacement)のベラディの異常との関係**: [FIFOページ置換アルゴリズム](/algorithms/fifo-page-replacement)では、フレーム数を増やすとかえってページフォールトが増える「ベラディの異常」が起こりうるが、最適ページ置換アルゴリズムを含む一部のクラスのアルゴリズム(スタックアルゴリズム)では、フレーム数を増やせばページフォールト数は単調に減少するか変わらないことが保証されており、この対比がベラディの異常の異常さを際立たせている
- **使いどころ**: 実運用のページ置換ポリシーとしては使われないが、キャッシュシミュレータやOSの授業における「実用アルゴリズムがどれだけ最適に近いか」を測定するベンチマーク、ログとして完全な参照列が既に得られているオフライン最適化(例えばバッチ処理のためのプリフェッチ戦略の事後評価)、キャッシュアルゴリズム研究における理論的な性能上限の導出

## 実装例

将来の参照列全体が既知であることを前提に、メモリ上の各ページについて「次に参照されるまでの距離」を都度計算し、最も遠い(または二度と参照されない)ページを追い出す。

```python
def optimal_page_replacement(references: list[int], capacity: int) -> tuple[list[int], int]:
    """references: ページ参照列全体(未来分も含めて既知という前提)。
    戻り値: (最終的なメモリの状態には興味がないため省略した各時点のフレーム内容のログ, フォールト数)。
    """
    frames: list[int] = []
    faults = 0
    history: list[list[int]] = []

    for i, page in enumerate(references):
        if page in frames:
            history.append(list(frames))
            continue

        faults += 1
        if len(frames) < capacity:
            frames.append(page)
        else:
            victim = _farthest_next_use(frames, references, i + 1)
            frames[frames.index(victim)] = page
        history.append(list(frames))

    return history, faults


def _farthest_next_use(frames: list[int], references: list[int], from_index: int) -> int:
    """frames内の各ページについて、from_index以降で次に参照される位置を調べ、
    最も遠い(または二度と現れない)ページを返す。"""
    farthest_distance = -1
    victim = frames[0]
    for page in frames:
        try:
            distance = references.index(page, from_index)
        except ValueError:
            return page  # 二度と参照されないページは即座に確定(距離=無限大)
        if distance > farthest_distance:
            farthest_distance = distance
            victim = page
    return victim
```

```typescript
function optimalPageReplacement(
  references: number[],
  capacity: number,
): { history: number[][]; faults: number } {
  const frames: number[] = [];
  let faults = 0;
  const history: number[][] = [];

  for (let i = 0; i < references.length; i++) {
    const page = references[i];
    if (frames.includes(page)) {
      history.push([...frames]);
      continue;
    }

    faults++;
    if (frames.length < capacity) {
      frames.push(page);
    } else {
      const victim = farthestNextUse(frames, references, i + 1);
      frames[frames.indexOf(victim)] = page;
    }
    history.push([...frames]);
  }

  return { history, faults };
}

function farthestNextUse(
  frames: number[],
  references: number[],
  fromIndex: number,
): number {
  let farthestDistance = -1;
  let victim = frames[0];
  for (const page of frames) {
    const distance = references.indexOf(page, fromIndex);
    if (distance === -1) return page; // 二度と参照されないページは即座に確定
    if (distance > farthestDistance) {
      farthestDistance = distance;
      victim = page;
    }
  }
  return victim;
}
```
