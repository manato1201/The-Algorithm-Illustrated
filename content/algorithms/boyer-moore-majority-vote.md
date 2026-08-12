---
name: ボイヤー・ムーアの多数決アルゴリズム(Boyer-Moore Majority Vote)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n)時間、O(1)空間
summary: 配列中に過半数(n/2回超)出現する要素が存在するとき、1個の候補と相殺カウンタだけを保持しながら1回の線形走査でそれを特定できる、文字列探索の「Boyer-Moore法」とは全く無関係の多数決検出アルゴリズム。
---

## 概要

長さ`n`の配列の中に、全体の過半数(`n/2`回を超える回数)を占める要素——「多数派要素(majority element)」——が存在するかどうか、存在するならそれが何かを求めたい。素朴には各要素の出現回数をハッシュマップで数えればO(n)時間・O(n)空間で解けるし、ソートしてからn/2番目を見ればO(n log n)時間・O(1)空間(追加配列なし)で解ける。ボイヤー・ムーアの多数決アルゴリズムは、Robert S. BoyerとJ Strother Mooreが1981年に考案した手法で、配列を**1回だけ線形走査しながら「候補」と「相殺カウンタ」の2変数だけ**を保持することで、O(n)時間・**O(1)空間**というハッシュマップすら不要な最適な計算量を達成する。名前が同じで紛らわしいが、[文字列探索のBoyer-Moore法](/algorithms/boyer-moore)(不一致文字ヒューリスティックで文字列パターンをスキップしながら検索する)とは**目的も仕組みも全く異なる別のアルゴリズム**である——同じ2人の考案者に由来して同名になっているだけで、両者の間にアルゴリズム的な関連は一切ない。

## 仕組み

1. 「現在の候補」を保持する変数`candidate`と、「候補の優勢度合い」を表す整数カウンタ`count`(初期値0)を用意する
2. 配列の要素`x`を先頭から順に見ていき、各要素について:
   - `count == 0`ならば、`x`を新しい`candidate`として採用し、`count = 1`にする
   - `x == candidate`ならば`count += 1`(候補の一票として数える)
   - `x != candidate`ならば`count -= 1`(候補と相殺し合う一票として数える)
3. 走査が終わった時点の`candidate`が、**多数派要素が実際に存在するならば**それに一致する
4. **直感**: 配列中の要素を「候補と同じ」か「候補と異なる」かでペアにして相殺していくと考えると、多数派要素は他の全要素を合わせた数より多いため、どれだけ相殺されても最後まで生き残る。逆に多数派要素が存在しない場合、この手順は何らかの要素を返すが、それが本当に過半数を占めるとは限らない
5. **検証パス(存在保証がない場合)**: 多数派要素の存在が保証されていない入力に対しては、走査後に得られた`candidate`についてもう一度配列全体を走査し、実際の出現回数が`n/2`を超えているかを確認する必要がある(この検証も含めてO(n)時間・O(1)空間に収まる)

## 特性・トレードオフ

- **計算量の最適性**: O(n)時間・O(1)空間はこの問題に対する漸近的に最適な計算量であり、ハッシュマップによる頻度カウント(O(n)空間)やソート(O(n log n)時間)より優れている
- **存在保証の有無に注意**: アルゴリズム自体は多数派要素が存在してもしなくても何らかの候補を返してしまうため、「本当に過半数を占める要素があるか」を保証したい場合は必ず検証パスを追加する
- **一般化(n/k多数決)**: 「`n/3`回を超えて出現する要素(最大2個存在しうる)」のように、`n/k`を超える出現回数の要素を求める一般化版も存在し、候補を`k-1`個・カウンタも`k-1`個保持する形に拡張できる(Misra-Gries algorithmとしてストリームデータの頻出要素検出にも応用される)
- **名前の混同への注意**: [文字列探索のBoyer-Moore法](/algorithms/boyer-moore)は「不一致文字ヒューリスティック」「good suffixヒューリスティック」でパターンマッチングをスキップ的に高速化する全く別分野のアルゴリズムである。同名だが目的(文字列検索 vs 配列の多数決)も仕組みも共通点はない
- **使いどころ**: ストリームデータ中の多数派要素検出、投票システムの集計の高速化、分散システムでの合意値の推定、外れ値検出やデータ品質チェックの前処理としての「支配的な値」の特定

## 実装例

```python
def majority_element(nums: list[int]) -> int | None:
    """過半数(n/2超)を占める要素があればそれを返す。なければNone。"""
    candidate = None
    count = 0
    for x in nums:
        if count == 0:
            candidate = x
            count = 1
        elif x == candidate:
            count += 1
        else:
            count -= 1

    # 検証パス: 本当に過半数を占めているか確認する
    if candidate is not None and nums.count(candidate) > len(nums) // 2:
        return candidate
    return None
```

```typescript
function majorityElement(nums: number[]): number | null {
  let candidate: number | null = null;
  let count = 0;

  for (const x of nums) {
    if (count === 0) {
      candidate = x;
      count = 1;
    } else if (x === candidate) {
      count++;
    } else {
      count--;
    }
  }

  // 検証パス: 本当に過半数を占めているか確認する
  if (candidate !== null) {
    const actual = nums.filter((x) => x === candidate).length;
    if (actual > Math.floor(nums.length / 2)) return candidate;
  }
  return null;
}
```

```cpp
#include <vector>
#include <optional>
#include <algorithm>

std::optional<int> majorityElement(const std::vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) {
            candidate = x;
            count = 1;
        } else if (x == candidate) {
            count++;
        } else {
            count--;
        }
    }

    long long actual = std::count(nums.begin(), nums.end(), candidate);
    if (actual > static_cast<long long>(nums.size()) / 2) return candidate;
    return std::nullopt;
}
```

```rust
fn majority_element(nums: &[i32]) -> Option<i32> {
    let mut candidate = 0;
    let mut count = 0;

    for &x in nums {
        if count == 0 {
            candidate = x;
            count = 1;
        } else if x == candidate {
            count += 1;
        } else {
            count -= 1;
        }
    }

    let actual = nums.iter().filter(|&&x| x == candidate).count();
    if actual > nums.len() / 2 {
        Some(candidate)
    } else {
        None
    }
}
```

```csharp
static int? MajorityElement(int[] nums)
{
    int candidate = 0, count = 0;
    foreach (int x in nums)
    {
        if (count == 0)
        {
            candidate = x;
            count = 1;
        }
        else if (x == candidate)
        {
            count++;
        }
        else
        {
            count--;
        }
    }

    int actual = nums.Count(x => x == candidate);
    return actual > nums.Length / 2 ? candidate : (int?)null;
}
```
