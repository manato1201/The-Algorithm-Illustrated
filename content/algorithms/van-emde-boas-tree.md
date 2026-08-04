---
name: van Emde Boas木
category: データ構造
subcategory: 木構造
complexity: O(log log U)(探索・挿入・削除・successor、Uはキーの取りうる値の範囲)
summary: キーの値の範囲Uを再帰的に√U個ずつのクラスタへ分割していくことで、比較に基づく木のO(log n)の壁を破り、整数キーに限ればO(log log U)という驚異的な速さを実現する特殊なデータ構造。
---

## 概要

[二分探索木](/algorithms/binary-search-tree)のような比較ベースのデータ構造は、`n`個のキーを識別するのに最低でも`log n`回の比較が必要という情報理論的な下限に縛られている。しかし1975年にピーター・ヴァン・エンデ・ボアスが発表したこの構造は、キーが「`0`から`U-1`までの整数」という追加の情報を持つ場合、その数値としての構造を積極的に利用することで、この`log n`の壁を破り、`U`(キーの取りうる値の範囲)に対して`O(log log U)`という、比較ベースの構造では原理的に到達できない速さを実現する。

## 仕組み

1. 値の範囲`U`を`√U`個のクラスタに再帰的に分割する。各キー`x`は、上位ビット`high(x) = ⌊x/√U⌋`(どのクラスタに属するか)と下位ビット`low(x) = x mod √U`(クラスタ内での位置)に分解される
2. 各van Emde Boas木は、自分の最小値・最大値を直接保持する変数と、`√U`個の子van Emde Boas木(それぞれサイズ`√U`)、そして「どのクラスタが空でないか」を管理する`√U`サイズの補助van Emde Boas木(summary)を持つ、という再帰的な構造になっている
3. **探索**: `x`が最小値・最大値と一致するかをまず確認し、一致しなければ`high(x)`のクラスタへ再帰的に降りて`low(x)`を探す。1回の再帰でサイズが`√U`に縮小するため、再帰の深さは`log log U`(`U → √U → √√U → ...`と繰り返すと`log log U`回でサイズが定数になる)
4. **successor(次に大きいキーを求める)操作**: 同じクラスタ内に該当する値があればそれを、なければsummary構造を使って「次に空でないクラスタ」を`O(log log U)`で発見し、そのクラスタの最小値を返す——この操作が特に高速なのがvan Emde Boas木の強みである

## 特性・トレードオフ

- **計算量**: 探索・挿入・削除・successor/predecessorの全てが`O(log log U)`。`U = 2^32`(32ビット整数)であれば`log log U = 5`程度となり、`n`が数十億であっても[二分探索木](/algorithms/binary-search-tree)の`O(log n)`(30回程度の比較)よりさらに高速になりうる
- **メモリ使用量という大きな代償**: 素朴な実装では、格納する要素数`n`に関わらず値の範囲`U`に比例したメモリを消費してしまう(`U`が大きいと現実的でない)。実用上は、実際に使われているクラスタだけを動的に生成する「x-fast trie」「y-fast trie」のような変種で、メモリ使用量を`O(n)`に抑える工夫が必要になる
- **比較ベースの下限を破る例外的な存在**: 「ソートには`Ω(n log n)`回の比較が必要」という比較ベースアルゴリズムの下限は、あくまで「比較しかできない」という制約のもとでの話であり、van Emde Boas木のようにキーの数値としての構造(2進表現)を直接利用できる場合、この下限を回避できるという、アルゴリズム理論における重要な教訓を示す
- **使いどころ**: 整数キーに対する高速な優先度付きキュー(ネットワークルーターのIPアドレス処理)、離散事象シミュレーションにおけるタイムスタンプ管理、計算複雑性理論における比較ベースの下限とそれを超える特殊構造の対比を学ぶ理論的な題材

## 実装例

`U`(値の範囲)を平方数のべき乗(例: 256 = 16×16)に限定し、クラスタを遅延生成することで、再帰的な構造をそのまま素直に実装する。

```python
import math


class VEB:
    def __init__(self, u: int):
        self.u = u
        self.min = None
        self.max = None
        self.summary = None
        self.cluster: dict[int, "VEB"] = {}
        if u > 2:
            self.sub_u = round(math.sqrt(u))

    def high(self, x: int) -> int:
        return x // self.sub_u

    def low(self, x: int) -> int:
        return x % self.sub_u

    def index(self, h: int, l: int) -> int:
        return h * self.sub_u + l

    def member(self, x: int) -> bool:
        if self.min is None:
            return False
        if x == self.min or x == self.max:
            return True
        if self.u <= 2:
            return False
        c = self.cluster.get(self.high(x))
        return c.member(self.low(x)) if c else False

    def insert(self, x: int) -> None:
        if self.min is None:
            self.min = self.max = x
            return
        if x == self.min:
            return
        if x < self.min:
            x, self.min = self.min, x
        if self.u > 2:
            h, l = self.high(x), self.low(x)
            c = self.cluster.get(h)
            if c is None or c.min is None:
                # クラスタが空だった場合だけsummaryを更新する(これがO(log log U)の要)
                if self.summary is None:
                    self.summary = VEB(self.sub_u)
                self.summary.insert(h)
                if c is None:
                    c = VEB(self.sub_u)
                    self.cluster[h] = c
                c.min = c.max = l
            else:
                c.insert(l)
        if x > self.max:
            self.max = x

    def successor(self, x: int):
        if self.u == 2:
            return 1 if x == 0 and self.max == 1 else None
        if self.min is not None and x < self.min:
            return self.min
        h, l = self.high(x), self.low(x)
        c = self.cluster.get(h)
        if c is not None and c.max is not None and l < c.max:
            return self.index(h, c.successor(l))
        succ_cluster = self.summary.successor(h) if self.summary else None
        if succ_cluster is None:
            return None
        return self.index(succ_cluster, self.cluster[succ_cluster].min)
```

```typescript
class VEB {
  u: number;
  min: number | null = null;
  max: number | null = null;
  summary: VEB | null = null;
  cluster = new Map<number, VEB>();
  subU: number;

  constructor(u: number) {
    this.u = u;
    this.subU = u > 2 ? Math.round(Math.sqrt(u)) : 0;
  }

  high(x: number): number {
    return Math.floor(x / this.subU);
  }
  low(x: number): number {
    return x % this.subU;
  }
  index(h: number, l: number): number {
    return h * this.subU + l;
  }

  member(x: number): boolean {
    if (this.min === null) return false;
    if (x === this.min || x === this.max) return true;
    if (this.u <= 2) return false;
    const c = this.cluster.get(this.high(x));
    return c ? c.member(this.low(x)) : false;
  }

  insert(x: number): void {
    if (this.min === null) {
      this.min = this.max = x;
      return;
    }
    if (x === this.min) return;
    if (x < this.min) {
      [x, this.min] = [this.min, x];
    }
    if (this.u > 2) {
      const h = this.high(x);
      const l = this.low(x);
      let c = this.cluster.get(h) ?? null;
      if (c === null || c.min === null) {
        if (this.summary === null) this.summary = new VEB(this.subU);
        this.summary.insert(h);
        if (c === null) {
          c = new VEB(this.subU);
          this.cluster.set(h, c);
        }
        c.min = c.max = l;
      } else {
        c.insert(l);
      }
    }
    if (this.max === null || x > this.max) this.max = x;
  }

  successor(x: number): number | null {
    if (this.u === 2) {
      return x === 0 && this.max === 1 ? 1 : null;
    }
    if (this.min !== null && x < this.min) return this.min;
    const h = this.high(x);
    const l = this.low(x);
    const c = this.cluster.get(h) ?? null;
    if (c !== null && c.max !== null && l < c.max) {
      return this.index(h, c.successor(l)!);
    }
    const succCluster = this.summary !== null ? this.summary.successor(h) : null;
    if (succCluster === null) return null;
    return this.index(succCluster, this.cluster.get(succCluster)!.min!);
  }
}
```

```cpp
#include <cmath>
#include <optional>
#include <unordered_map>

struct VEB {
    int u;
    int subU;
    std::optional<int> vmin, vmax;
    VEB* summary = nullptr;
    std::unordered_map<int, VEB*> cluster;

    explicit VEB(int u_) : u(u_) {
        subU = u > 2 ? static_cast<int>(std::round(std::sqrt(static_cast<double>(u)))) : 0;
    }

    int high(int x) const { return x / subU; }
    int low(int x) const { return x % subU; }
    int index(int h, int l) const { return h * subU + l; }

    bool member(int x) const {
        if (!vmin) return false;
        if (x == *vmin || x == *vmax) return true;
        if (u <= 2) return false;
        auto it = cluster.find(high(x));
        if (it == cluster.end()) return false;
        return it->second->member(low(x));
    }

    void insert(int x) {
        if (!vmin) { vmin = vmax = x; return; }
        if (x == *vmin) return;
        if (x < *vmin) std::swap(x, *vmin);
        if (u > 2) {
            int h = high(x), l = low(x);
            auto it = cluster.find(h);
            VEB* c = (it != cluster.end()) ? it->second : nullptr;
            if (c == nullptr || !c->vmin) {
                if (summary == nullptr) summary = new VEB(subU);
                summary->insert(h);
                if (c == nullptr) {
                    c = new VEB(subU);
                    cluster[h] = c;
                }
                c->vmin = c->vmax = l;
            } else {
                c->insert(l);
            }
        }
        if (x > *vmax) vmax = x;
    }

    std::optional<int> successor(int x) const {
        if (u == 2) {
            if (x == 0 && vmax == 1) return 1;
            return std::nullopt;
        }
        if (vmin && x < *vmin) return vmin;
        int h = high(x), l = low(x);
        auto it = cluster.find(h);
        if (it != cluster.end() && it->second->vmax && l < *it->second->vmax) {
            return index(h, *it->second->successor(l));
        }
        if (summary != nullptr) {
            auto succCluster = summary->successor(h);
            if (succCluster) {
                return index(*succCluster, *cluster.at(*succCluster)->vmin);
            }
        }
        return std::nullopt;
    }
};
```

```rust
use std::collections::HashMap;

struct VebNode {
    u: usize,
    sub_u: usize,
    min: Option<usize>,
    max: Option<usize>,
    summary: Option<usize>,
    cluster: HashMap<usize, usize>, // high(x) -> アリーナへのインデックス
}

struct VebArena {
    nodes: Vec<VebNode>,
}

impl VebArena {
    fn new_node(&mut self, u: usize) -> usize {
        let sub_u = if u > 2 { (u as f64).sqrt().round() as usize } else { 0 };
        self.nodes.push(VebNode { u, sub_u, min: None, max: None, summary: None, cluster: HashMap::new() });
        self.nodes.len() - 1
    }

    fn member(&self, idx: usize, x: usize) -> bool {
        let node = &self.nodes[idx];
        if node.min.is_none() {
            return false;
        }
        if Some(x) == node.min || Some(x) == node.max {
            return true;
        }
        if node.u <= 2 {
            return false;
        }
        match node.cluster.get(&(x / node.sub_u)) {
            Some(&c) => self.member(c, x % node.sub_u),
            None => false,
        }
    }

    fn insert(&mut self, idx: usize, mut x: usize) {
        if self.nodes[idx].min.is_none() {
            self.nodes[idx].min = Some(x);
            self.nodes[idx].max = Some(x);
            return;
        }
        if self.nodes[idx].min == Some(x) {
            return;
        }
        if x < self.nodes[idx].min.unwrap() {
            let old_min = self.nodes[idx].min.unwrap();
            self.nodes[idx].min = Some(x);
            x = old_min;
        }
        let u = self.nodes[idx].u;
        if u > 2 {
            let sub_u = self.nodes[idx].sub_u;
            let h = x / sub_u;
            let l = x % sub_u;
            let c_idx = self.nodes[idx].cluster.get(&h).copied();
            let c_empty = match c_idx {
                Some(ci) => self.nodes[ci].min.is_none(),
                None => true,
            };
            if c_empty {
                if self.nodes[idx].summary.is_none() {
                    let s = self.new_node(sub_u);
                    self.nodes[idx].summary = Some(s);
                }
                let s_idx = self.nodes[idx].summary.unwrap();
                self.insert(s_idx, h);
                let ci = match c_idx {
                    Some(ci) => ci,
                    None => {
                        let new_c = self.new_node(sub_u);
                        self.nodes[idx].cluster.insert(h, new_c);
                        new_c
                    }
                };
                self.nodes[ci].min = Some(l);
                self.nodes[ci].max = Some(l);
            } else {
                self.insert(c_idx.unwrap(), l);
            }
        }
        if x > self.nodes[idx].max.unwrap() {
            self.nodes[idx].max = Some(x);
        }
    }

    fn successor(&self, idx: usize, x: usize) -> Option<usize> {
        let node = &self.nodes[idx];
        if node.u == 2 {
            return if x == 0 && node.max == Some(1) { Some(1) } else { None };
        }
        if let Some(mn) = node.min {
            if x < mn {
                return Some(mn);
            }
        }
        let h = x / node.sub_u;
        let l = x % node.sub_u;
        if let Some(&c_idx) = node.cluster.get(&h) {
            if let Some(cmax) = self.nodes[c_idx].max {
                if l < cmax {
                    let offset = self.successor(c_idx, l).unwrap();
                    return Some(h * node.sub_u + offset);
                }
            }
        }
        if let Some(s_idx) = node.summary {
            if let Some(succ_cluster) = self.successor(s_idx, h) {
                let offset = self.nodes[node.cluster[&succ_cluster]].min.unwrap();
                return Some(succ_cluster * node.sub_u + offset);
            }
        }
        None
    }
}
```

```csharp
class VEB
{
    public int U;
    public int? Min;
    public int? Max;
    public VEB? Summary;
    public Dictionary<int, VEB> Cluster = new();
    public int SubU;

    public VEB(int u)
    {
        U = u;
        SubU = u > 2 ? (int)Math.Round(Math.Sqrt(u)) : 0;
    }

    public int High(int x) => x / SubU;
    public int Low(int x) => x % SubU;
    public int Index(int h, int l) => h * SubU + l;

    public bool Member(int x)
    {
        if (Min == null) return false;
        if (x == Min || x == Max) return true;
        if (U <= 2) return false;
        return Cluster.TryGetValue(High(x), out var c) && c.Member(Low(x));
    }

    public void Insert(int x)
    {
        if (Min == null) { Min = Max = x; return; }
        if (x == Min) return;
        if (x < Min) { (x, Min) = (Min.Value, x); }
        if (U > 2)
        {
            int h = High(x), l = Low(x);
            Cluster.TryGetValue(h, out var c);
            if (c == null || c.Min == null)
            {
                Summary ??= new VEB(SubU);
                Summary.Insert(h);
                if (c == null) { c = new VEB(SubU); Cluster[h] = c; }
                c.Min = c.Max = l;
            }
            else
            {
                c.Insert(l);
            }
        }
        if (Max == null || x > Max) Max = x;
    }

    public int? Successor(int x)
    {
        if (U == 2) return (x == 0 && Max == 1) ? 1 : null;
        if (Min != null && x < Min) return Min;
        int h = High(x), l = Low(x);
        Cluster.TryGetValue(h, out var c);
        if (c != null && c.Max != null && l < c.Max)
        {
            return Index(h, c.Successor(l)!.Value);
        }
        int? succCluster = Summary?.Successor(h);
        if (succCluster == null) return null;
        return Index(succCluster.Value, Cluster[succCluster.Value].Min!.Value);
    }
}
```
