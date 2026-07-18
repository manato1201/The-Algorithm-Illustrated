---
name: フロイドの循環検出法(Tortoise and Hare)
category: グラフ
subcategory: 連結性・順序
complexity: O(n)
summary: 遅いポインタと速いポインタを使い、追加メモリなしで連結リストやシーケンスの循環を検出する。
---

## 概要

連結リストや、ある関数を繰り返し適用して作る数列(擬似乱数生成器の出力列など)が、途中から「ループ」に入っているかどうかを判定したい——という問題を、**追加メモリをほとんど使わずに**解く、とても軽量なアルゴリズム。「ウサギとカメ」の名でも知られ、1歩ずつ進む遅いポインタ(カメ)と、2歩ずつ進む速いポインタ(ウサギ)が、もし循環があれば必ずどこかで追いつく、というシンプルな観察に基づいている。

## 仕組み

1. 2つのポインタ(カメとウサギ)を、両方ともスタート地点に置く
2. 毎ステップ、カメは1つ、ウサギは2つ先に進める
3. もし循環がなければ、ウサギはいずれリストの終端(null)に到達し、循環がないと判定できる
4. もし循環があれば、ウサギはループの中をカメより速く周回するため、**いずれ必ずカメに追いつく**(2つのポインタが同じ地点を指す瞬間が来る)。これが循環の存在の証拠になる
5. 循環の**開始位置**まで知りたい場合は、追いついた地点から、片方のポインタをスタート地点に戻し、両方とも1歩ずつ進める。次に2つが一致する地点が、循環の開始位置になる(これは数学的に証明できる巧妙な性質)

なぜウサギが必ずカメに追いつくのか: 一度両方がループに入ってしまえば、2つのポインタの距離は毎ステップ1ずつ縮まっていく(ウサギの方が1歩多く進むため)。ループの長さは有限なので、距離はいずれ0になる。

## 特性・トレードオフ

- **計算量**: O(n)、追加メモリはポインタ2つ分のO(1)のみ。「訪問済み集合をハッシュテーブルで管理する」といった素朴な循環検出法に比べて、メモリ効率が圧倒的に良い
- **循環の開始位置まで求められる**: 単に「循環があるかないか」だけでなく、循環がどこから始まるかまで、同じくO(1)の追加メモリで求められる点が実用上重要
- **適用範囲**: 連結リストだけでなく、「ある関数を繰り返し適用する」ことで生成されるあらゆる数列(擬似乱数生成器の周期の検出、ポラードのロー法における素因数分解の内部処理など)に応用できる、汎用性の高いテクニック
- **使いどころ**: 連結リストの循環検出(プログラムのバグとして無限リストが生成されていないかのチェック)、ハッシュ関数の周期性の分析、暗号解読(ポラードのロー法の内部で使われる)など

## 実装例

```python
class ListNode:
    def __init__(self, val: int):
        self.val = val
        self.next: "ListNode | None" = None


def detect_cycle(head: "ListNode | None") -> "tuple[bool, ListNode | None]":
    """循環の有無と、循環がある場合はその開始ノードを返す。"""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            # 追いついた地点から、片方をスタートに戻して1歩ずつ進める
            ptr = head
            while ptr is not slow:
                ptr = ptr.next
                slow = slow.next
            return True, ptr
    return False, None
```

```typescript
class ListNode {
  val: number;
  next: ListNode | null = null;
  constructor(val: number) {
    this.val = val;
  }
}

function detectCycle(head: ListNode | null): { found: boolean; start: ListNode | null } {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {
      let ptr = head;
      while (ptr !== slow) {
        ptr = ptr!.next;
        slow = slow!.next;
      }
      return { found: true, start: ptr };
    }
  }
  return { found: false, start: null };
}
```

```cpp
#include <utility>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::pair<bool, ListNode*> detectCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* ptr = head;
            while (ptr != slow) {
                ptr = ptr->next;
                slow = slow->next;
            }
            return {true, ptr};
        }
    }
    return {false, nullptr};
}
```

```rust
// 安全なRustでは循環を含む連結リストを生ポインタなしで表現しづらいため、
// ここでは「ノードiの次はnext[i](末端は-1)」というインデックス配列でリストを表す。
fn detect_cycle(next: &[i32], start: usize) -> (bool, Option<usize>) {
    let mut slow = start as i32;
    let mut fast = start as i32;
    loop {
        if slow == -1 {
            return (false, None);
        }
        slow = next[slow as usize];
        if fast == -1 || next[fast as usize] == -1 {
            return (false, None);
        }
        fast = next[next[fast as usize] as usize];
        if slow == fast {
            break;
        }
    }
    // 追いついた地点から、片方をスタートに戻して1歩ずつ進める
    let mut ptr = start as i32;
    while ptr != slow {
        ptr = next[ptr as usize];
        slow = next[slow as usize];
    }
    (true, Some(ptr as usize))
}
```

```csharp
class ListNode
{
    public int Val;
    public ListNode? Next;
    public ListNode(int val) { Val = val; }
}

static (bool found, ListNode? start) DetectCycle(ListNode? head)
{
    var slow = head;
    var fast = head;
    while (fast != null && fast.Next != null)
    {
        slow = slow!.Next;
        fast = fast.Next.Next;
        if (slow == fast)
        {
            var ptr = head;
            while (ptr != slow)
            {
                ptr = ptr!.Next;
                slow = slow!.Next;
            }
            return (true, ptr);
        }
    }
    return (false, null);
}
```
