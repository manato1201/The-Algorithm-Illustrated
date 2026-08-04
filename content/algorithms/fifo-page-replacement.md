---
name: FIFOページ置換アルゴリズム
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(1)(1回のページフォールト処理、キューの追加・削除)
summary: メモリに置かれたページのうち、最も古くから存在する(最初に読み込まれた)ものを機械的に追い出す、実装が最も単純なページ置換ポリシーで、[LFUキャッシュ](/algorithms/lfu-cache)や[Clockアルゴリズム](/algorithms/clock-algorithm)のような使用状況を考慮する方式と対比される、素朴さゆえの弱点も併せ持つ手法。
---

## 概要

オペレーティングシステムの仮想メモリ管理では、物理メモリに乗り切らないページ(メモリの管理単位)をどう入れ替えるかという「ページ置換」の判断が性能を大きく左右する。FIFOページ置換アルゴリズムは、その中で最も単純な発想を取る——各ページがメモリに読み込まれた順序をキューで記録しておき、新しいページを読み込む必要が生じたとき(ページフォールト)、単純に「最も古くから存在するページ」(そのページが実際に使われているかどうかは一切考慮しない)を追い出す。[LFUキャッシュ](/algorithms/lfu-cache)が使用頻度を、[Clockアルゴリズム](/algorithms/clock-algorithm)が最近の参照有無を考慮するのに対し、FIFOは純粋に「古さ」だけを基準にするため実装は極めて単純だが、その単純さゆえに直感に反する弱点も抱えている。

## 仕組み

1. メモリに読み込まれているページを、読み込まれた順序を保持するキュー(先入れ先出し)で管理する
2. ページフォールトが発生した(要求されたページがメモリにない)とき、まずメモリに空きがあるかを確認する。空きがあれば、そのページを単純にメモリへ読み込み、キューの末尾に追加する
3. メモリに空きがなければ、キューの先頭(最も古くから存在するページ)を選び、そのページをメモリから追い出す(必要ならディスクへ書き戻す)
4. 追い出したページの分だけ空いた領域に、新しく要求されたページを読み込み、キューの末尾に追加する
5. このキューの管理には、単純な連結リストや配列インデックスを使うため、追加・削除ともに`O(1)`で行える

## 特性・トレードオフ

- **計算量**: キューへの追加・削除は`O(1)`——[LFUキャッシュ](/algorithms/lfu-cache)のように使用頻度を管理する優先度付きデータ構造や、[Clockアルゴリズム](/algorithms/clock-algorithm)のような参照ビットの走査も不要で、実装・実行コストの両面で最も軽量なページ置換方式である
- **ベラディの異常(Bélády's Anomaly)という直感に反する弱点**: FIFOページ置換アルゴリズムには、「メモリのページ数(フレーム数)を増やしたにもかかわらず、ページフォールトの回数がかえって増える」という一見矛盾した現象が起こりうることが知られている——これはFIFOが実際のページの使用状況(近い将来また使われるかどうか)を一切考慮しないために起こる、この手法特有の病理的な弱点である
- **使用頻度・最近の参照を無視することの実務上の弱点**: 頻繁にアクセスされる重要なページであっても、単に「読み込まれてから時間が経った」というだけの理由で追い出されてしまう——実際のワークロードでは[Clockアルゴリズム](/algorithms/clock-algorithm)や[LFUキャッシュ](/algorithms/lfu-cache)、あるいはLRU(最近最も使われていないページを追い出す)の方が実用上良い性能を示すことが多く、FIFOが単体で実用システムに採用されることは少ない
- **教育的な出発点としての価値**: 実務での採用は限定的だが、「最も単純なページ置換方式は何か」「なぜそれだけでは不十分なのか(ベラディの異常)」という問いから出発して、[Clockアルゴリズム](/algorithms/clock-algorithm)やLRUのような、より洗練された方式がなぜ・どう改良されているのかを理解するための、オペレーティングシステム教育における定番の入門的教材になっている
- **使いどころ**: オペレーティングシステムの授業におけるページ置換アルゴリズムの入門教材、ベラディの異常を実演するための最小の反例、実装の単純さが最優先される極めて制約の厳しい組み込み環境での簡易的なキャッシュ管理

## 実装例

参照列`1,2,3,4,1,2,5,1,2,3,4,5`に対し、フレーム数3では9回、フレーム数4では10回のページフォールトが発生する——これがベラディの異常の代表的な教科書例である。

```python
from collections import deque

def fifo_page_replacement(reference_string: list[int], num_frames: int) -> int:
    frames: deque[int] = deque()
    resident: set[int] = set()
    faults = 0
    for page in reference_string:
        if page in resident:
            continue
        faults += 1
        if len(frames) >= num_frames:
            oldest = frames.popleft()
            resident.remove(oldest)
        frames.append(page)
        resident.add(page)
    return faults


ref = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
print(fifo_page_replacement(ref, 3))  # 9
print(fifo_page_replacement(ref, 4))  # 10 (ベラディの異常: フレームが増えたのに悪化)
```

```typescript
function fifoPageReplacement(referenceString: number[], numFrames: number): number {
  const frames: number[] = [];
  const resident = new Set<number>();
  let faults = 0;
  for (const page of referenceString) {
    if (resident.has(page)) continue;
    faults++;
    if (frames.length >= numFrames) {
      const oldest = frames.shift()!;
      resident.delete(oldest);
    }
    frames.push(page);
    resident.add(page);
  }
  return faults;
}

const ref = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
console.log(fifoPageReplacement(ref, 3)); // 9
console.log(fifoPageReplacement(ref, 4)); // 10
```

```cpp
#include <deque>
#include <unordered_set>
#include <vector>

int fifoPageReplacement(const std::vector<int>& referenceString, int numFrames) {
    std::deque<int> frames;
    std::unordered_set<int> resident;
    int faults = 0;
    for (int page : referenceString) {
        if (resident.count(page)) continue;
        faults++;
        if (static_cast<int>(frames.size()) >= numFrames) {
            int oldest = frames.front();
            frames.pop_front();
            resident.erase(oldest);
        }
        frames.push_back(page);
        resident.insert(page);
    }
    return faults;
}
```

```rust
use std::collections::{HashSet, VecDeque};

fn fifo_page_replacement(reference_string: &[i32], num_frames: usize) -> u32 {
    let mut frames: VecDeque<i32> = VecDeque::new();
    let mut resident: HashSet<i32> = HashSet::new();
    let mut faults = 0u32;
    for &page in reference_string {
        if resident.contains(&page) {
            continue;
        }
        faults += 1;
        if frames.len() >= num_frames {
            if let Some(oldest) = frames.pop_front() {
                resident.remove(&oldest);
            }
        }
        frames.push_back(page);
        resident.insert(page);
    }
    faults
}
```

```csharp
static int FifoPageReplacement(List<int> referenceString, int numFrames)
{
    var frames = new Queue<int>();
    var resident = new HashSet<int>();
    int faults = 0;
    foreach (var page in referenceString)
    {
        if (resident.Contains(page)) continue;
        faults++;
        if (frames.Count >= numFrames)
        {
            var oldest = frames.Dequeue();
            resident.Remove(oldest);
        }
        frames.Enqueue(page);
        resident.Add(page);
    }
    return faults;
}
```
