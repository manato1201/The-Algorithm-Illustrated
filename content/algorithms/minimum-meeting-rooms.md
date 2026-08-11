---
name: 最小会議室数問題(Minimum Meeting Rooms)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 全ての会議を(1つも諦めずに)開催するために必要な最小の会議室数を、開始時刻と終了時刻をそれぞれソートして突き合わせるだけで、同時に進行中の会議数の最大値として貪欲に求める。
---

## 概要

[区間スケジューリング問題](/algorithms/interval-scheduling)は「両立可能な区間を最大何個選べるか(一部の会議は諦める)」という問題だったが、最小会議室数問題は視点が異なる——**全ての会議を1つも諦めずに開催する**という制約のもと、「同時に重なる会議をそれぞれ別の部屋に割り当てるとして、最低何部屋あれば足りるか」を求める。この値は実は、「ある瞬間に同時進行している会議の数」の最大値に等しい。全ての会議の開始時刻・終了時刻をそれぞれ独立にソートし、時系列に沿って走査しながら「今何件の会議が進行中か」を貪欲に追跡するだけで、O(n log n)でこの最大値(=必要な最小会議室数)が求まる。

## 仕組み

1. 全会議の**開始時刻のリスト**と**終了時刻のリスト**を、それぞれ独立に昇順ソートする(どの会議がどの会議に対応するかという紐付けは、この時点で意図的に崩す——「今何件進行中か」を数えるだけなら、個々の会議の対応関係は不要という洞察が鍵になる)
2. 2つのポインタ`i`(開始時刻リスト用)、`j`(終了時刻リスト用)を0で初期化し、進行中の会議数`ongoing`と、その最大値`max_rooms`を0で初期化する
3. 開始時刻リストと終了時刻リストを、時刻の小さい方から順に見ていく:
   - 次に来るイベントが「開始」であれば(`starts[i] < ends[j]`)、`ongoing`を1増やし、`max_rooms`をその時点の`ongoing`で更新し、`i`を進める
   - 次に来るイベントが「終了」であれば(`starts[i] >= ends[j]`)、`ongoing`を1減らし、`j`を進める(終了と開始が同時刻の場合は、部屋を明け渡してから次の会議が入ると考え、終了を先に処理するのが一般的な取り扱い)
4. 開始時刻リストを全て処理し終えるまで3を繰り返す
5. 最終的な`max_rooms`が、全会議を同時に不足なく開催するために必要な最小会議室数となる

## 特性・トレードオフ

- **個々の会議室への割り当てではなく「同時進行数の最大値」に着目する**: 実際に「どの会議をどの部屋に入れるか」という具体的な割り当てを考えなくても、開始・終了イベントを時系列でマージするだけで必要な部屋数が求まるという点が、この問題の貪欲性の核心である。実際の割り当てが必要な場合は、優先度付きキューで「今空いている最も早く終わる部屋」を管理する別の実装で対応できる
- **開始・終了リストを独立にソートする発想**: 各会議の開始・終了のペアという構造を一旦崩し、開始時刻の集合と終了時刻の集合をそれぞれ独立に扱うことで、単純な2ポインタ走査に帰着できる。この「イベントを種類ごとに分けてソートし、時系列でマージする」という手法は、掃引線アルゴリズム全般に共通する考え方でもある
- **[区間スケジューリング問題](/algorithms/interval-scheduling)との対比**: 区間スケジューリングは「単一の資源(部屋)で、両立しない区間はどちらかを諦める」という設定だったのに対し、最小会議室数問題は「複数の資源を用意してでも、全ての区間を両立させる」という設定であり、同じ「区間」を扱う問題でも解くべき問いが対照的である
- **使いどころ**: 会議室・リソースの必要数見積もり、CPU/サーバーリソースの同時実行タスク数のピーク推定、イベントスケジューリングにおける同時開催イベント数の把握、[区間スケジューリング](/algorithms/interval-scheduling)と対をなす区間問題の基本パターンとしての教育的な題材

## 実装例

```python
def min_meeting_rooms(intervals: list[tuple[int, int]]) -> int:
    if not intervals:
        return 0

    starts = sorted(start for start, _ in intervals)
    ends = sorted(end for _, end in intervals)

    ongoing = 0
    max_rooms = 0
    i = j = 0
    while i < len(starts):
        if starts[i] < ends[j]:
            ongoing += 1
            max_rooms = max(max_rooms, ongoing)
            i += 1
        else:
            ongoing -= 1
            j += 1
    return max_rooms
```

```typescript
function minMeetingRooms(intervals: [number, number][]): number {
  if (intervals.length === 0) return 0;

  const starts = intervals.map(([s]) => s).sort((a, b) => a - b);
  const ends = intervals.map(([, e]) => e).sort((a, b) => a - b);

  let ongoing = 0;
  let maxRooms = 0;
  let i = 0,
    j = 0;
  while (i < starts.length) {
    if (starts[i] < ends[j]) {
      ongoing++;
      maxRooms = Math.max(maxRooms, ongoing);
      i++;
    } else {
      ongoing--;
      j++;
    }
  }
  return maxRooms;
}
```

```cpp
#include <vector>
#include <algorithm>

int minMeetingRooms(const std::vector<std::pair<int, int>>& intervals) {
    if (intervals.empty()) return 0;

    std::vector<int> starts, ends;
    for (auto& [s, e] : intervals) { starts.push_back(s); ends.push_back(e); }
    std::sort(starts.begin(), starts.end());
    std::sort(ends.begin(), ends.end());

    int ongoing = 0, maxRooms = 0;
    size_t i = 0, j = 0;
    while (i < starts.size()) {
        if (starts[i] < ends[j]) {
            ongoing++;
            maxRooms = std::max(maxRooms, ongoing);
            i++;
        } else {
            ongoing--;
            j++;
        }
    }
    return maxRooms;
}
```

```rust
fn min_meeting_rooms(intervals: &[(i32, i32)]) -> i32 {
    if intervals.is_empty() {
        return 0;
    }

    let mut starts: Vec<i32> = intervals.iter().map(|&(s, _)| s).collect();
    let mut ends: Vec<i32> = intervals.iter().map(|&(_, e)| e).collect();
    starts.sort();
    ends.sort();

    let mut ongoing = 0;
    let mut max_rooms = 0;
    let (mut i, mut j) = (0, 0);
    while i < starts.len() {
        if starts[i] < ends[j] {
            ongoing += 1;
            max_rooms = max_rooms.max(ongoing);
            i += 1;
        } else {
            ongoing -= 1;
            j += 1;
        }
    }
    max_rooms
}
```

```csharp
static int MinMeetingRooms(List<(int start, int end)> intervals)
{
    if (intervals.Count == 0) return 0;

    var starts = intervals.Select(x => x.start).OrderBy(x => x).ToArray();
    var ends = intervals.Select(x => x.end).OrderBy(x => x).ToArray();

    int ongoing = 0, maxRooms = 0;
    int i = 0, j = 0;
    while (i < starts.Length)
    {
        if (starts[i] < ends[j])
        {
            ongoing++;
            maxRooms = Math.Max(maxRooms, ongoing);
            i++;
        }
        else
        {
            ongoing--;
            j++;
        }
    }
    return maxRooms;
}
```
