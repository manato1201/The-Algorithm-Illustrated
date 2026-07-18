---
name: 接尾辞オートマトン
category: 文字列
subcategory: 接尾辞構造
complexity: O(n)
summary: 全ての部分文字列の出現を線形サイズのオートマトンで表現する、文字列処理の圧縮表現。
---

## 概要

ある文字列に含まれる**全ての部分文字列**(接尾辞ではなく、あらゆる連続した部分文字列)の情報を、驚くほどコンパクトな有限オートマトン(状態機械)として表現するデータ構造。長さnの文字列は最大でO(n²)個の異なる部分文字列を持ちうるが、接尾辞オートマトンの状態数は**O(n)個しかない**という、一見信じがたい圧縮を実現する。

## 仕組み

接尾辞オートマトンは、元の文字列の全ての部分文字列を受理する最小のオートマトンとして特徴づけられる。構築はオンライン的に(文字列の末尾に1文字ずつ追加しながら)行われる。

1. 最初は「空文字列だけを受理する」1状態のオートマトンから始める
2. 新しい文字を1つ追加するたびに、既存の状態群を再利用しながら新しい状態を追加し、「これまでに追加した接頭辞の全ての部分文字列」を正しく受理できるようにオートマトンを更新する
3. このとき、ある状態が複数の"意味"(異なる終端位置の集合を持つ部分文字列群)を代表するようになると、状態を分割する必要が生じることがある

各文字の追加が償却O(1)で処理できることが理論的に保証されており、全体としてO(n)で構築が完了する。状態数・遷移の総数もともにO(n)に収まる。

## 特性・トレードオフ

- **計算量**: 構築O(n)。構築後は、ある文字列が部分文字列として含まれるかの判定を、パターンの長さに比例するO(m)で行える
- **接尾辞配列・接尾辞木との比較**: 同じく「文字列の全部分文字列の情報」を扱うデータ構造だが、接尾辞オートマトンは状態数の理論的な上限がより小さく(2n-1以下)、多くの操作をO(1)の遷移で行える点が特徴的
- **実装の難易度**: 理論的な美しさと省メモリ性の代わりに、構築アルゴリズムの実装はこの記事で扱う中でも特に難しい部類に入る。競技プログラミングの上級者向けの道具として知られている
- **使いどころ**: 文字列中に現れる相異なる部分文字列の総数を数える、最長共通部分文字列を複数の文字列に対して求める、文字列の周期性・繰り返し構造の解析など、部分文字列に関する高度なクエリを高速に処理したい場面

## 実装例

```python
class SuffixAutomaton:
    def __init__(self) -> None:
        self.link = [-1]
        self.len = [0]
        self.transitions: list[dict[str, int]] = [{}]
        self.last = 0

    def extend(self, c: str) -> None:
        cur = len(self.len)
        self.len.append(self.len[self.last] + 1)
        self.link.append(-1)
        self.transitions.append({})
        p = self.last
        while p != -1 and c not in self.transitions[p]:
            self.transitions[p][c] = cur
            p = self.link[p]
        if p == -1:
            self.link[cur] = 0
        else:
            q = self.transitions[p][c]
            if self.len[p] + 1 == self.len[q]:
                self.link[cur] = q
            else:
                clone = len(self.len)
                self.len.append(self.len[p] + 1)
                self.link.append(self.link[q])
                self.transitions.append(dict(self.transitions[q]))
                while p != -1 and self.transitions[p].get(c) == q:
                    self.transitions[p][c] = clone
                    p = self.link[p]
                self.link[q] = clone
                self.link[cur] = clone
        self.last = cur

    def contains(self, s: str) -> bool:
        state = 0
        for c in s:
            if c not in self.transitions[state]:
                return False
            state = self.transitions[state][c]
        return True


def build_suffix_automaton(s: str) -> SuffixAutomaton:
    sam = SuffixAutomaton()
    for c in s:
        sam.extend(c)
    return sam
```

```typescript
class SuffixAutomaton {
  link: number[] = [-1];
  len: number[] = [0];
  transitions: Map<string, number>[] = [new Map()];
  private last = 0;

  extend(c: string): void {
    const cur = this.len.length;
    this.len.push(this.len[this.last] + 1);
    this.link.push(-1);
    this.transitions.push(new Map());

    let p = this.last;
    while (p !== -1 && !this.transitions[p].has(c)) {
      this.transitions[p].set(c, cur);
      p = this.link[p];
    }
    if (p === -1) {
      this.link[cur] = 0;
    } else {
      const q = this.transitions[p].get(c)!;
      if (this.len[p] + 1 === this.len[q]) {
        this.link[cur] = q;
      } else {
        const clone = this.len.length;
        this.len.push(this.len[p] + 1);
        this.link.push(this.link[q]);
        this.transitions.push(new Map(this.transitions[q]));
        while (p !== -1 && this.transitions[p].get(c) === q) {
          this.transitions[p].set(c, clone);
          p = this.link[p];
        }
        this.link[q] = clone;
        this.link[cur] = clone;
      }
    }
    this.last = cur;
  }

  contains(s: string): boolean {
    let state = 0;
    for (const c of s) {
      const next = this.transitions[state].get(c);
      if (next === undefined) return false;
      state = next;
    }
    return true;
  }
}

function buildSuffixAutomaton(s: string): SuffixAutomaton {
  const sam = new SuffixAutomaton();
  for (const c of s) sam.extend(c);
  return sam;
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>

class SuffixAutomaton {
public:
    std::vector<int> link{-1};
    std::vector<int> len{0};
    std::vector<std::unordered_map<char, int>> transitions{{}};

    void extend(char c) {
        int cur = static_cast<int>(len.size());
        len.push_back(len[last] + 1);
        link.push_back(-1);
        transitions.push_back({});

        int p = last;
        while (p != -1 && transitions[p].find(c) == transitions[p].end()) {
            transitions[p][c] = cur;
            p = link[p];
        }
        if (p == -1) {
            link[cur] = 0;
        } else {
            int q = transitions[p][c];
            if (len[p] + 1 == len[q]) {
                link[cur] = q;
            } else {
                int clone = static_cast<int>(len.size());
                len.push_back(len[p] + 1);
                link.push_back(link[q]);
                transitions.push_back(transitions[q]);
                while (p != -1 && transitions[p].count(c) && transitions[p][c] == q) {
                    transitions[p][c] = clone;
                    p = link[p];
                }
                link[q] = clone;
                link[cur] = clone;
            }
        }
        last = cur;
    }

    bool contains(const std::string& s) const {
        int state = 0;
        for (char c : s) {
            auto it = transitions[state].find(c);
            if (it == transitions[state].end()) return false;
            state = it->second;
        }
        return true;
    }

private:
    int last = 0;
};

SuffixAutomaton buildSuffixAutomaton(const std::string& s) {
    SuffixAutomaton sam;
    for (char c : s) sam.extend(c);
    return sam;
}
```

```rust
use std::collections::HashMap;

struct SuffixAutomaton {
    link: Vec<i32>,
    len: Vec<i32>,
    transitions: Vec<HashMap<char, usize>>,
    last: usize,
}

impl SuffixAutomaton {
    fn new() -> Self {
        SuffixAutomaton {
            link: vec![-1],
            len: vec![0],
            transitions: vec![HashMap::new()],
            last: 0,
        }
    }

    fn extend(&mut self, c: char) {
        let cur = self.len.len();
        self.len.push(self.len[self.last] + 1);
        self.link.push(-1);
        self.transitions.push(HashMap::new());

        let mut p = self.last as i32;
        while p != -1 && !self.transitions[p as usize].contains_key(&c) {
            self.transitions[p as usize].insert(c, cur);
            p = self.link[p as usize];
        }
        if p == -1 {
            self.link[cur] = 0;
        } else {
            let q = self.transitions[p as usize][&c];
            if self.len[p as usize] + 1 == self.len[q] {
                self.link[cur] = q as i32;
            } else {
                let clone = self.len.len();
                self.len.push(self.len[p as usize] + 1);
                self.link.push(self.link[q]);
                let cloned_transitions = self.transitions[q].clone();
                self.transitions.push(cloned_transitions);
                while p != -1 && self.transitions[p as usize].get(&c) == Some(&q) {
                    self.transitions[p as usize].insert(c, clone);
                    p = self.link[p as usize];
                }
                self.link[q] = clone as i32;
                self.link[cur] = clone as i32;
            }
        }
        self.last = cur;
    }

    fn contains(&self, s: &str) -> bool {
        let mut state = 0usize;
        for c in s.chars() {
            match self.transitions[state].get(&c) {
                Some(&next) => state = next,
                None => return false,
            }
        }
        true
    }
}

fn build_suffix_automaton(s: &str) -> SuffixAutomaton {
    let mut sam = SuffixAutomaton::new();
    for c in s.chars() {
        sam.extend(c);
    }
    sam
}
```

```csharp
class SuffixAutomaton
{
    public List<int> Link = new() { -1 };
    public List<int> Len = new() { 0 };
    public List<Dictionary<char, int>> Transitions = new() { new Dictionary<char, int>() };
    private int last = 0;

    public void Extend(char c)
    {
        int cur = Len.Count;
        Len.Add(Len[last] + 1);
        Link.Add(-1);
        Transitions.Add(new Dictionary<char, int>());

        int p = last;
        while (p != -1 && !Transitions[p].ContainsKey(c))
        {
            Transitions[p][c] = cur;
            p = Link[p];
        }
        if (p == -1)
        {
            Link[cur] = 0;
        }
        else
        {
            int q = Transitions[p][c];
            if (Len[p] + 1 == Len[q])
            {
                Link[cur] = q;
            }
            else
            {
                int clone = Len.Count;
                Len.Add(Len[p] + 1);
                Link.Add(Link[q]);
                Transitions.Add(new Dictionary<char, int>(Transitions[q]));
                while (p != -1 && Transitions[p].TryGetValue(c, out int val) && val == q)
                {
                    Transitions[p][c] = clone;
                    p = Link[p];
                }
                Link[q] = clone;
                Link[cur] = clone;
            }
        }
        last = cur;
    }

    public bool Contains(string s)
    {
        int state = 0;
        foreach (var c in s)
        {
            if (!Transitions[state].TryGetValue(c, out int next)) return false;
            state = next;
        }
        return true;
    }
}

static SuffixAutomaton BuildSuffixAutomaton(string s)
{
    var sam = new SuffixAutomaton();
    foreach (var c in s) sam.Extend(c);
    return sam;
}
```
