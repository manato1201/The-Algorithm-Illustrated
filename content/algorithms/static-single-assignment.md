---
name: 静的単一代入形式(SSA)
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n log n)(SSA形式への変換、n=命令数、支配木構築を含む)
summary: 各変数がプログラム中でちょうど1回だけ代入されるように変数名を振り直す中間表現で、「この変数の値はどこで作られたか」が名前を見るだけで一意に分かるようになるため、[定数畳み込み](/algorithms/constant-folding)や[不要コード除去](/algorithms/dead-code-elimination)のような最適化の実装を大幅に単純化する。
---

## 概要

`x = 1; x = x + 1; y = x * 2`のような通常のプログラムでは、変数`x`が複数回代入されるため、「今この`x`はどの代入に由来する値か」を判断するには、コードを遡ってデータフロー解析を行う必要がある。静的単一代入形式(Static Single Assignment, SSA)は、この曖昧さを取り除くために、各変数がプログラム中でちょうど1回だけ代入されるよう変数名にバージョン番号を振り直す(`x = 1; x₁ = x + 1; y = x₁ * 2`のように)。この単純な変換により、「ある変数の値がどこで作られたか」が変数名を見るだけで一意に決まるようになり、[定数畳み込み](/algorithms/constant-folding)・[不要コード除去](/algorithms/dead-code-elimination)・レジスタ割り当てなど、多くの最適化アルゴリズムの実装が大幅に単純化される。現代の最適化コンパイラ(LLVM等)のほぼ全てが内部表現としてSSA形式を採用している。

## 仕組み

1. プログラムの制御フローグラフ(条件分岐やループによって分岐・合流する基本ブロックの有向グラフ、[3番地コード生成](/algorithms/three-address-code-generation)の出力に対応)を用意する
2. 各変数への代入が現れるたびに、その変数に新しいバージョン番号を割り当てる(`x`への1回目の代入は`x₀`、2回目は`x₁`、というように)。以降、その変数を参照する箇所は、その参照が支配される(必ず経由する)最新のバージョンを使うよう書き換える
3. **φ関数(Phi function)の挿入**: 条件分岐の後で複数のパスが合流する地点では、どちらのパスを通ったかによって参照すべき変数のバージョンが異なる場合がある。このような合流点には、`x₂ = φ(x₀, x₁)`(パスAから来たら`x₀`、パスBから来たら`x₁`の値を選ぶ)という特別なφ関数を挿入し、合流後は単一の新しいバージョンとして扱えるようにする
4. どこにφ関数を挿入すべきかは、制御フローグラフの「支配関係」(あるブロックが別のブロックへ到達する全ての経路上に必ず現れるかどうか)の解析——具体的には「支配辺境(Dominance Frontier)」という概念を使うことで効率的に特定できる
5. こうして全ての変数がSSA形式(各バージョンにつき代入は1回だけ)に変換された中間表現の上で、後続の最適化パスを実行する

## 特性・トレードオフ

- **計算量**: 支配木と支配辺境の構築に`O(n log n)`程度(効率的なアルゴリズムを使った場合)、φ関数の挿入・変数のリネームも制御フローグラフのサイズに比例した時間で行える——最適化の恩恵の大きさに対して、変換自体のコストは十分に小さい
- **「値の来歴が名前から一意に分かる」ことによる最適化の単純化**: SSA形式に変換する前は、[不要コード除去](/algorithms/dead-code-elimination)や[定数畳み込み](/algorithms/constant-folding)を行う際に「この変数への他の代入がこの値に影響していないか」をデータフロー解析で毎回確認する必要があったが、SSA形式では各バージョンが1箇所でしか定義されないため、その定義を直接見るだけで済む——多くの古典的な最適化アルゴリズムが、SSA形式の上ではるかにシンプルなグラフ走査として再定式化できる
- **φ関数は実行時に本当に存在する命令ではないという特殊性**: φ関数はSSA形式という解析上の抽象概念であり、最終的な機械語コードを生成する段階では、実際のレジスタ・メモリへの代入命令(適切なコピー命令の挿入)に変換して取り除く必要がある(SSAからの脱構築)
- **[レジスタ割り当て(グラフ彩色)](/algorithms/register-allocation-graph-coloring)との関係**: SSA形式では各変数バージョンの生存区間(定義から最後の使用までの範囲)が明確になるため、[グラフ彩色によるレジスタ割り当て](/algorithms/register-allocation-graph-coloring)の干渉グラフ構築が単純化される——多くの最適化コンパイラがSSA形式を経由してレジスタ割り当てを行う理由になっている
- **使いどころ**: LLVM・GCC等の最適化コンパイラの内部中間表現、JITコンパイラ(Java HotSpot、V8等)における実行時最適化、静的解析ツールにおけるデータフロー解析の基盤

## 実装例

制御フローグラフ(基本ブロック+分岐)から実際にSSA形式を構築する実装例(Cytronらのアルゴリズム: 支配木の構築→支配辺境の計算→φ関数の反復支配辺境への挿入→支配木の前順走査によるリネーム)。`x = 1; if (cond) { x = x + 1 } else { x = x + 2 }; y = x`というif/elseの合流と、`i = 0; while (i < n) { i = i + 1 }`というループの2つのCFGに対して、φ関数が正しい位置(合流ブロック)に挿入され、そのオペランドが各先行ブロックで実際に定義された最終バージョンと一致することを検証している。

```python
from __future__ import annotations


class Instr:
    """dest = template.format(*uses) という代入命令(destがNoneなら結果を保存しない使用のみの命令)"""

    def __init__(self, dest: str | None, uses: list[str], template: str) -> None:
        self.dest = dest
        self.uses = uses
        self.template = template
        self.rendered_dest = ""
        self.rendered_rhs = ""

    def is_phi(self) -> bool:
        return self.template.startswith("phi(")


class Block:
    def __init__(self, name: str) -> None:
        self.name = name
        self.preds: list[str] = []
        self.succs: list[str] = []
        self.instrs: list[Instr] = []


class CFG:
    def __init__(self) -> None:
        self.blocks: dict[str, Block] = {}
        self.entry = ""

    def add_block(self, name: str) -> Block:
        b = Block(name)
        self.blocks[name] = b
        return b

    def add_edge(self, src: str, dst: str) -> None:
        self.blocks[src].succs.append(dst)
        self.blocks[dst].preds.append(src)


def compute_dominators(cfg: CFG) -> dict[str, str]:
    """各ブロックの直接支配者(immediate dominator)を反復データフロー解析で求める"""
    order = [cfg.entry]
    visited = {cfg.entry}
    i = 0
    while i < len(order):
        for s in cfg.blocks[order[i]].succs:
            if s not in visited:
                visited.add(s)
                order.append(s)
        i += 1

    idom: dict[str, str | None] = {n: None for n in cfg.blocks}
    idom[cfg.entry] = cfg.entry

    def intersect(b1: str, b2: str) -> str:
        while b1 != b2:
            while order.index(b1) > order.index(b2):
                b1 = idom[b1]  # type: ignore[assignment]
            while order.index(b2) > order.index(b1):
                b2 = idom[b2]  # type: ignore[assignment]
        return b1

    changed = True
    while changed:
        changed = False
        for n in order:
            if n == cfg.entry:
                continue
            preds_done = [p for p in cfg.blocks[n].preds if idom[p] is not None]
            if not preds_done:
                continue
            new_idom = preds_done[0]
            for p in preds_done[1:]:
                new_idom = intersect(new_idom, p)
            if idom[n] != new_idom:
                idom[n] = new_idom
                changed = True

    return {n: v for n, v in idom.items() if v is not None}  # type: ignore[misc]


def compute_dominance_frontier(cfg: CFG, idom: dict[str, str]) -> dict[str, set[str]]:
    """支配辺境(dominance frontier)を求める"""
    df: dict[str, set[str]] = {n: set() for n in cfg.blocks}
    for n, block in cfg.blocks.items():
        if len(block.preds) < 2:
            continue
        for p in block.preds:
            runner = p
            while runner != idom[n]:
                df[runner].add(n)
                runner = idom[runner]
    return df


def insert_phis(cfg: CFG, df: dict[str, set[str]]) -> None:
    """各変数について、反復支配辺境(iterated dominance frontier)にφ関数を挿入する"""
    defsites: dict[str, set[str]] = {}
    for name, block in cfg.blocks.items():
        for instr in block.instrs:
            if instr.dest is not None:
                defsites.setdefault(instr.dest, set()).add(name)

    for var, sites in defsites.items():
        has_phi: set[str] = set()
        worklist = list(sites)
        while worklist:
            n = worklist.pop()
            for m in df[n]:
                if m in has_phi:
                    continue
                has_phi.add(m)
                n_preds = len(cfg.blocks[m].preds)
                template = "phi(" + ", ".join(f"{{{i}}}" for i in range(n_preds)) + ")"
                cfg.blocks[m].instrs.insert(0, Instr(var, [var] * n_preds, template))
                worklist.append(m)


def rename_variables(cfg: CFG, idom: dict[str, str]) -> list[str]:
    """支配木を前順(preorder)で辿りながら各変数にバージョン番号を振り、SSA形式のテキストを生成する"""
    children: dict[str, list[str]] = {n: [] for n in cfg.blocks}
    for n, d in idom.items():
        if d != n:
            children[d].append(n)

    counters: dict[str, int] = {}
    stacks: dict[str, list[str]] = {}
    visit_order: list[str] = []

    def new_name(var: str) -> str:
        v = counters.get(var, 0)
        counters[var] = v + 1
        name = f"{var}{v}"
        stacks.setdefault(var, []).append(name)
        return name

    def visit(name: str) -> None:
        visit_order.append(name)
        block = cfg.blocks[name]
        pushed: list[str] = []
        for instr in block.instrs:
            if instr.is_phi():
                instr.rendered_dest = new_name(instr.dest)  # type: ignore[arg-type]
                pushed.append(instr.dest)  # type: ignore[arg-type]
            else:
                rendered_uses = [stacks[u][-1] for u in instr.uses]
                instr.rendered_rhs = instr.template.format(*rendered_uses)
                if instr.dest is not None:
                    instr.rendered_dest = new_name(instr.dest)
                    pushed.append(instr.dest)

        # 後続ブロックのφ関数のオペランドを、このブロックが何番目の先行ブロックかに応じて埋める
        for succ_name in block.succs:
            succ = cfg.blocks[succ_name]
            idx = succ.preds.index(name)
            for instr in succ.instrs:
                if instr.is_phi() and instr.dest in stacks:
                    instr.uses[idx] = stacks[instr.dest][-1]

        for c in sorted(children[name]):
            visit(c)

        for var in pushed:
            stacks[var].pop()

    visit(cfg.entry)

    output: list[str] = []
    for name in visit_order:
        output.append(f"{name}:")
        for instr in cfg.blocks[name].instrs:
            if instr.is_phi():
                rhs = "phi(" + ", ".join(instr.uses) + ")"
                output.append(f"  {instr.rendered_dest} = {rhs}")
            elif instr.dest is not None:
                output.append(f"  {instr.rendered_dest} = {instr.rendered_rhs}")
            else:
                output.append(f"  {instr.rendered_rhs}")
    return output
```

```typescript
class Instr {
  dest: string | null;
  uses: string[];
  template: string;
  renderedDest = "";
  renderedRhs = "";

  constructor(dest: string | null, uses: string[], template: string) {
    this.dest = dest;
    this.uses = uses;
    this.template = template;
  }

  isPhi(): boolean {
    return this.template.startsWith("phi(");
  }
}

class Block {
  name: string;
  preds: string[] = [];
  succs: string[] = [];
  instrs: Instr[] = [];

  constructor(name: string) {
    this.name = name;
  }
}

class CFG {
  blocks: Map<string, Block> = new Map();
  entry = "";

  addBlock(name: string): Block {
    const b = new Block(name);
    this.blocks.set(name, b);
    return b;
  }

  addEdge(src: string, dst: string): void {
    this.blocks.get(src)!.succs.push(dst);
    this.blocks.get(dst)!.preds.push(src);
  }
}

function formatTemplate(template: string, values: string[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => values[Number(i)]);
}

function computeDominators(cfg: CFG): Map<string, string> {
  const order: string[] = [cfg.entry];
  const visited = new Set([cfg.entry]);
  for (let i = 0; i < order.length; i++) {
    for (const s of cfg.blocks.get(order[i])!.succs) {
      if (!visited.has(s)) {
        visited.add(s);
        order.push(s);
      }
    }
  }

  const idom = new Map<string, string | null>();
  for (const n of cfg.blocks.keys()) idom.set(n, null);
  idom.set(cfg.entry, cfg.entry);

  const intersect = (a: string, b: string): string => {
    while (a !== b) {
      while (order.indexOf(a) > order.indexOf(b)) a = idom.get(a)!;
      while (order.indexOf(b) > order.indexOf(a)) b = idom.get(b)!;
    }
    return a;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const n of order) {
      if (n === cfg.entry) continue;
      const predsDone = cfg.blocks.get(n)!.preds.filter((p) => idom.get(p) !== null);
      if (predsDone.length === 0) continue;
      let newIdom = predsDone[0];
      for (const p of predsDone.slice(1)) newIdom = intersect(newIdom, p);
      if (idom.get(n) !== newIdom) {
        idom.set(n, newIdom);
        changed = true;
      }
    }
  }

  const result = new Map<string, string>();
  for (const [n, v] of idom) if (v !== null) result.set(n, v);
  return result;
}

function computeDominanceFrontier(cfg: CFG, idom: Map<string, string>): Map<string, Set<string>> {
  const df = new Map<string, Set<string>>();
  for (const n of cfg.blocks.keys()) df.set(n, new Set());
  for (const [n, block] of cfg.blocks) {
    if (block.preds.length < 2) continue;
    for (const p of block.preds) {
      let runner = p;
      while (runner !== idom.get(n)) {
        df.get(runner)!.add(n);
        runner = idom.get(runner)!;
      }
    }
  }
  return df;
}

function insertPhis(cfg: CFG, df: Map<string, Set<string>>): void {
  const defsites = new Map<string, Set<string>>();
  for (const [name, block] of cfg.blocks) {
    for (const instr of block.instrs) {
      if (instr.dest !== null) {
        if (!defsites.has(instr.dest)) defsites.set(instr.dest, new Set());
        defsites.get(instr.dest)!.add(name);
      }
    }
  }

  for (const [varName, sites] of defsites) {
    const hasPhi = new Set<string>();
    const worklist = [...sites];
    while (worklist.length > 0) {
      const n = worklist.pop()!;
      for (const m of df.get(n)!) {
        if (hasPhi.has(m)) continue;
        hasPhi.add(m);
        const nPreds = cfg.blocks.get(m)!.preds.length;
        const template = "phi(" + Array.from({ length: nPreds }, (_, i) => `{${i}}`).join(", ") + ")";
        cfg.blocks.get(m)!.instrs.unshift(new Instr(varName, new Array(nPreds).fill(varName), template));
        worklist.push(m);
      }
    }
  }
}

function renameVariables(cfg: CFG, idom: Map<string, string>): string[] {
  const children = new Map<string, string[]>();
  for (const n of cfg.blocks.keys()) children.set(n, []);
  for (const [n, d] of idom) {
    if (d !== n) children.get(d)!.push(n);
  }

  const counters = new Map<string, number>();
  const stacks = new Map<string, string[]>();
  const visitOrder: string[] = [];

  const newName = (varName: string): string => {
    const v = counters.get(varName) ?? 0;
    counters.set(varName, v + 1);
    const name = `${varName}${v}`;
    if (!stacks.has(varName)) stacks.set(varName, []);
    stacks.get(varName)!.push(name);
    return name;
  };

  function visit(name: string): void {
    visitOrder.push(name);
    const block = cfg.blocks.get(name)!;
    const pushed: string[] = [];
    for (const instr of block.instrs) {
      if (instr.isPhi()) {
        instr.renderedDest = newName(instr.dest!);
        pushed.push(instr.dest!);
      } else {
        const renderedUses = instr.uses.map((u) => stacks.get(u)![stacks.get(u)!.length - 1]);
        instr.renderedRhs = formatTemplate(instr.template, renderedUses);
        if (instr.dest !== null) {
          instr.renderedDest = newName(instr.dest);
          pushed.push(instr.dest);
        }
      }
    }

    for (const succName of block.succs) {
      const succ = cfg.blocks.get(succName)!;
      const idx = succ.preds.indexOf(name);
      for (const instr of succ.instrs) {
        if (instr.isPhi() && instr.dest !== null && stacks.has(instr.dest)) {
          const s = stacks.get(instr.dest)!;
          instr.uses[idx] = s[s.length - 1];
        }
      }
    }

    for (const c of [...children.get(name)!].sort()) visit(c);

    for (const varName of pushed) stacks.get(varName)!.pop();
  }

  visit(cfg.entry);

  const output: string[] = [];
  for (const name of visitOrder) {
    output.push(`${name}:`);
    for (const instr of cfg.blocks.get(name)!.instrs) {
      if (instr.isPhi()) {
        const rhs = "phi(" + instr.uses.join(", ") + ")";
        output.push(`  ${instr.renderedDest} = ${rhs}`);
      } else if (instr.dest !== null) {
        output.push(`  ${instr.renderedDest} = ${instr.renderedRhs}`);
      } else {
        output.push(`  ${instr.renderedRhs}`);
      }
    }
  }
  return output;
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <optional>
#include <functional>

struct Instr {
    std::optional<std::string> dest;
    std::vector<std::string> uses;
    std::string tmpl;
    std::string renderedDest;
    std::string renderedRhs;

    Instr(std::optional<std::string> d, std::vector<std::string> u, std::string t)
        : dest(std::move(d)), uses(std::move(u)), tmpl(std::move(t)) {}

    bool isPhi() const { return tmpl.rfind("phi(", 0) == 0; }
};

struct Block {
    std::string name;
    std::vector<std::string> preds;
    std::vector<std::string> succs;
    std::vector<Instr> instrs;
    explicit Block(std::string n) : name(std::move(n)) {}
};

struct CFG {
    std::unordered_map<std::string, Block> blocks;
    std::string entry;

    Block& addBlock(const std::string& name) {
        blocks.emplace(name, Block(name));
        return blocks.at(name);
    }

    void addEdge(const std::string& src, const std::string& dst) {
        blocks.at(src).succs.push_back(dst);
        blocks.at(dst).preds.push_back(src);
    }
};

std::string formatTemplate(const std::string& tmpl, const std::vector<std::string>& values) {
    std::string result;
    for (size_t i = 0; i < tmpl.size(); i++) {
        if (tmpl[i] == '{') {
            size_t end = tmpl.find('}', i);
            int idx = std::stoi(tmpl.substr(i + 1, end - i - 1));
            result += values[idx];
            i = end;
        } else {
            result += tmpl[i];
        }
    }
    return result;
}

std::unordered_map<std::string, std::string> computeDominators(CFG& cfg) {
    std::vector<std::string> order = {cfg.entry};
    std::unordered_set<std::string> visited = {cfg.entry};
    for (size_t i = 0; i < order.size(); i++) {
        for (auto& s : cfg.blocks.at(order[i]).succs) {
            if (visited.insert(s).second) order.push_back(s);
        }
    }

    auto indexOf = [&](const std::string& x) -> int {
        return static_cast<int>(std::find(order.begin(), order.end(), x) - order.begin());
    };

    std::unordered_map<std::string, std::optional<std::string>> idom;
    for (auto& kv : cfg.blocks) idom[kv.first] = std::nullopt;
    idom[cfg.entry] = cfg.entry;

    auto intersect = [&](std::string a, std::string b) -> std::string {
        while (a != b) {
            while (indexOf(a) > indexOf(b)) a = *idom[a];
            while (indexOf(b) > indexOf(a)) b = *idom[b];
        }
        return a;
    };

    bool changed = true;
    while (changed) {
        changed = false;
        for (auto& n : order) {
            if (n == cfg.entry) continue;
            std::vector<std::string> predsDone;
            for (auto& p : cfg.blocks.at(n).preds) {
                if (idom[p].has_value()) predsDone.push_back(p);
            }
            if (predsDone.empty()) continue;
            std::string newIdom = predsDone[0];
            for (size_t i = 1; i < predsDone.size(); i++) newIdom = intersect(newIdom, predsDone[i]);
            if (!idom[n].has_value() || *idom[n] != newIdom) {
                idom[n] = newIdom;
                changed = true;
            }
        }
    }

    std::unordered_map<std::string, std::string> result;
    for (auto& kv : idom) if (kv.second.has_value()) result[kv.first] = *kv.second;
    return result;
}

std::unordered_map<std::string, std::unordered_set<std::string>> computeDominanceFrontier(
    CFG& cfg, std::unordered_map<std::string, std::string>& idom) {
    std::unordered_map<std::string, std::unordered_set<std::string>> df;
    for (auto& kv : cfg.blocks) df[kv.first] = {};
    for (auto& kv : cfg.blocks) {
        auto& n = kv.first;
        auto& block = kv.second;
        if (block.preds.size() < 2) continue;
        for (auto& p : block.preds) {
            std::string runner = p;
            while (runner != idom[n]) {
                df[runner].insert(n);
                runner = idom[runner];
            }
        }
    }
    return df;
}

void insertPhis(CFG& cfg, std::unordered_map<std::string, std::unordered_set<std::string>>& df) {
    std::unordered_map<std::string, std::unordered_set<std::string>> defsites;
    for (auto& kv : cfg.blocks) {
        for (auto& instr : kv.second.instrs) {
            if (instr.dest.has_value()) defsites[*instr.dest].insert(kv.first);
        }
    }

    for (auto& kv : defsites) {
        const auto& varName = kv.first;
        std::unordered_set<std::string> hasPhi;
        std::vector<std::string> worklist(kv.second.begin(), kv.second.end());
        while (!worklist.empty()) {
            std::string n = worklist.back();
            worklist.pop_back();
            for (auto& m : df[n]) {
                if (hasPhi.count(m)) continue;
                hasPhi.insert(m);
                int nPreds = static_cast<int>(cfg.blocks.at(m).preds.size());
                std::string tmpl = "phi(";
                for (int i = 0; i < nPreds; i++) {
                    if (i > 0) tmpl += ", ";
                    tmpl += "{" + std::to_string(i) + "}";
                }
                tmpl += ")";
                std::vector<std::string> uses(nPreds, varName);
                cfg.blocks.at(m).instrs.insert(cfg.blocks.at(m).instrs.begin(), Instr(varName, uses, tmpl));
                worklist.push_back(m);
            }
        }
    }
}

std::vector<std::string> renameVariables(CFG& cfg, std::unordered_map<std::string, std::string>& idom) {
    std::unordered_map<std::string, std::vector<std::string>> children;
    for (auto& kv : cfg.blocks) children[kv.first] = {};
    for (auto& kv : idom) {
        if (kv.second != kv.first) children[kv.second].push_back(kv.first);
    }

    std::unordered_map<std::string, int> counters;
    std::unordered_map<std::string, std::vector<std::string>> stacks;
    std::vector<std::string> visitOrder;

    auto newName = [&](const std::string& varName) -> std::string {
        int v = counters.count(varName) ? counters[varName] : 0;
        counters[varName] = v + 1;
        std::string name = varName + std::to_string(v);
        stacks[varName].push_back(name);
        return name;
    };

    std::function<void(const std::string&)> visit = [&](const std::string& name) {
        visitOrder.push_back(name);
        Block& block = cfg.blocks.at(name);
        std::vector<std::string> pushed;
        for (auto& instr : block.instrs) {
            if (instr.isPhi()) {
                instr.renderedDest = newName(*instr.dest);
                pushed.push_back(*instr.dest);
            } else {
                std::vector<std::string> renderedUses;
                for (auto& u : instr.uses) renderedUses.push_back(stacks[u].back());
                instr.renderedRhs = formatTemplate(instr.tmpl, renderedUses);
                if (instr.dest.has_value()) {
                    instr.renderedDest = newName(*instr.dest);
                    pushed.push_back(*instr.dest);
                }
            }
        }

        for (auto& succName : block.succs) {
            Block& succ = cfg.blocks.at(succName);
            int idx = static_cast<int>(std::find(succ.preds.begin(), succ.preds.end(), name) - succ.preds.begin());
            for (auto& instr : succ.instrs) {
                if (instr.isPhi() && instr.dest.has_value() && stacks.count(*instr.dest)) {
                    instr.uses[idx] = stacks[*instr.dest].back();
                }
            }
        }

        std::vector<std::string> sortedChildren = children[name];
        std::sort(sortedChildren.begin(), sortedChildren.end());
        for (auto& c : sortedChildren) visit(c);

        for (auto& varName : pushed) stacks[varName].pop_back();
    };

    visit(cfg.entry);

    std::vector<std::string> output;
    for (auto& name : visitOrder) {
        output.push_back(name + ":");
        for (auto& instr : cfg.blocks.at(name).instrs) {
            if (instr.isPhi()) {
                std::string rhs = "phi(";
                for (size_t i = 0; i < instr.uses.size(); i++) {
                    if (i > 0) rhs += ", ";
                    rhs += instr.uses[i];
                }
                rhs += ")";
                output.push_back("  " + instr.renderedDest + " = " + rhs);
            } else if (instr.dest.has_value()) {
                output.push_back("  " + instr.renderedDest + " = " + instr.renderedRhs);
            } else {
                output.push_back("  " + instr.renderedRhs);
            }
        }
    }
    return output;
}
```

```rust
use std::collections::{HashMap, HashSet};

struct Instr {
    dest: Option<String>,
    uses: Vec<String>,
    template: String,
    rendered_dest: String,
    rendered_rhs: String,
}

impl Instr {
    fn new(dest: Option<String>, uses: Vec<String>, template: String) -> Self {
        Instr { dest, uses, template, rendered_dest: String::new(), rendered_rhs: String::new() }
    }
    fn is_phi(&self) -> bool {
        self.template.starts_with("phi(")
    }
}

struct Block {
    preds: Vec<String>,
    succs: Vec<String>,
    instrs: Vec<Instr>,
}

impl Block {
    fn new() -> Self {
        Block { preds: Vec::new(), succs: Vec::new(), instrs: Vec::new() }
    }
}

struct Cfg {
    blocks: HashMap<String, Block>,
    entry: String,
}

impl Cfg {
    fn new() -> Self {
        Cfg { blocks: HashMap::new(), entry: String::new() }
    }

    fn add_block(&mut self, name: &str) -> &mut Block {
        self.blocks.insert(name.to_string(), Block::new());
        self.blocks.get_mut(name).unwrap()
    }

    fn add_edge(&mut self, src: &str, dst: &str) {
        self.blocks.get_mut(src).unwrap().succs.push(dst.to_string());
        self.blocks.get_mut(dst).unwrap().preds.push(src.to_string());
    }
}

fn format_template(template: &str, values: &[String]) -> String {
    let chars: Vec<char> = template.chars().collect();
    let mut result = String::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '{' {
            let mut j = i + 1;
            while chars[j] != '}' {
                j += 1;
            }
            let idx: usize = chars[i + 1..j].iter().collect::<String>().parse().unwrap();
            result.push_str(&values[idx]);
            i = j + 1;
        } else {
            result.push(chars[i]);
            i += 1;
        }
    }
    result
}

fn index_of(order: &[String], x: &str) -> usize {
    order.iter().position(|v| v == x).unwrap()
}

fn intersect(idom: &HashMap<String, Option<String>>, order: &[String], a0: &str, b0: &str) -> String {
    let mut a = a0.to_string();
    let mut b = b0.to_string();
    while a != b {
        while index_of(order, &a) > index_of(order, &b) {
            a = idom[&a].clone().unwrap();
        }
        while index_of(order, &b) > index_of(order, &a) {
            b = idom[&b].clone().unwrap();
        }
    }
    a
}

fn compute_dominators(cfg: &Cfg) -> HashMap<String, String> {
    let mut order = vec![cfg.entry.clone()];
    let mut visited: HashSet<String> = HashSet::new();
    visited.insert(cfg.entry.clone());
    let mut i = 0;
    while i < order.len() {
        let succs = cfg.blocks[&order[i]].succs.clone();
        for s in succs {
            if visited.insert(s.clone()) {
                order.push(s);
            }
        }
        i += 1;
    }

    let mut idom: HashMap<String, Option<String>> = cfg.blocks.keys().map(|k| (k.clone(), None)).collect();
    idom.insert(cfg.entry.clone(), Some(cfg.entry.clone()));

    let mut changed = true;
    while changed {
        changed = false;
        for n in &order {
            if *n == cfg.entry {
                continue;
            }
            let preds_done: Vec<String> = cfg.blocks[n].preds.iter().filter(|p| idom[*p].is_some()).cloned().collect();
            if preds_done.is_empty() {
                continue;
            }
            let mut new_idom = preds_done[0].clone();
            for p in &preds_done[1..] {
                new_idom = intersect(&idom, &order, &new_idom, p);
            }
            if idom[n].as_deref() != Some(new_idom.as_str()) {
                idom.insert(n.clone(), Some(new_idom));
                changed = true;
            }
        }
    }

    idom.into_iter().filter_map(|(k, v)| v.map(|v| (k, v))).collect()
}

fn compute_dominance_frontier(cfg: &Cfg, idom: &HashMap<String, String>) -> HashMap<String, HashSet<String>> {
    let mut df: HashMap<String, HashSet<String>> = cfg.blocks.keys().map(|k| (k.clone(), HashSet::new())).collect();
    for (n, block) in &cfg.blocks {
        if block.preds.len() < 2 {
            continue;
        }
        for p in &block.preds {
            let mut runner = p.clone();
            while runner != idom[n] {
                df.get_mut(&runner).unwrap().insert(n.clone());
                runner = idom[&runner].clone();
            }
        }
    }
    df
}

fn insert_phis(cfg: &mut Cfg, df: &HashMap<String, HashSet<String>>) {
    let mut defsites: HashMap<String, HashSet<String>> = HashMap::new();
    for (name, block) in &cfg.blocks {
        for instr in &block.instrs {
            if let Some(dest) = &instr.dest {
                defsites.entry(dest.clone()).or_insert_with(HashSet::new).insert(name.clone());
            }
        }
    }

    for (var_name, sites) in &defsites {
        let mut has_phi: HashSet<String> = HashSet::new();
        let mut worklist: Vec<String> = sites.iter().cloned().collect();
        while let Some(n) = worklist.pop() {
            for m in &df[&n] {
                if has_phi.contains(m) {
                    continue;
                }
                has_phi.insert(m.clone());
                let n_preds = cfg.blocks[m].preds.len();
                let template = format!(
                    "phi({})",
                    (0..n_preds).map(|i| format!("{{{}}}", i)).collect::<Vec<_>>().join(", ")
                );
                let uses = vec![var_name.clone(); n_preds];
                cfg.blocks.get_mut(m).unwrap().instrs.insert(0, Instr::new(Some(var_name.clone()), uses, template));
                worklist.push(m.clone());
            }
        }
    }
}

fn new_name(var_name: &str, counters: &mut HashMap<String, u32>, stacks: &mut HashMap<String, Vec<String>>) -> String {
    let v = *counters.get(var_name).unwrap_or(&0);
    counters.insert(var_name.to_string(), v + 1);
    let name = format!("{}{}", var_name, v);
    stacks.entry(var_name.to_string()).or_insert_with(Vec::new).push(name.clone());
    name
}

fn visit(
    name: &str,
    cfg: &mut Cfg,
    children: &HashMap<String, Vec<String>>,
    counters: &mut HashMap<String, u32>,
    stacks: &mut HashMap<String, Vec<String>>,
    visit_order: &mut Vec<String>,
) {
    visit_order.push(name.to_string());
    let mut pushed: Vec<String> = Vec::new();

    let instr_count = cfg.blocks[name].instrs.len();
    for i in 0..instr_count {
        let is_phi = cfg.blocks[name].instrs[i].is_phi();
        if is_phi {
            let dest = cfg.blocks[name].instrs[i].dest.clone().unwrap();
            let new_dest = new_name(&dest, counters, stacks);
            cfg.blocks.get_mut(name).unwrap().instrs[i].rendered_dest = new_dest;
            pushed.push(dest);
        } else {
            let uses = cfg.blocks[name].instrs[i].uses.clone();
            let template = cfg.blocks[name].instrs[i].template.clone();
            let rendered_uses: Vec<String> = uses.iter().map(|u| stacks[u].last().unwrap().clone()).collect();
            let rhs = format_template(&template, &rendered_uses);
            cfg.blocks.get_mut(name).unwrap().instrs[i].rendered_rhs = rhs;
            let dest = cfg.blocks[name].instrs[i].dest.clone();
            if let Some(dest) = dest {
                let new_dest = new_name(&dest, counters, stacks);
                cfg.blocks.get_mut(name).unwrap().instrs[i].rendered_dest = new_dest;
                pushed.push(dest);
            }
        }
    }

    // 後続ブロックのφ関数のオペランドを、このブロックが何番目の先行ブロックかに応じて埋める
    let succs = cfg.blocks[name].succs.clone();
    for succ_name in &succs {
        let idx = cfg.blocks[succ_name].preds.iter().position(|p| p == name).unwrap();
        let succ_instr_count = cfg.blocks[succ_name].instrs.len();
        for i in 0..succ_instr_count {
            let is_phi = cfg.blocks[succ_name].instrs[i].is_phi();
            if is_phi {
                let dest = cfg.blocks[succ_name].instrs[i].dest.clone();
                if let Some(dest) = dest {
                    if let Some(top) = stacks.get(&dest).and_then(|s| s.last()) {
                        cfg.blocks.get_mut(succ_name).unwrap().instrs[i].uses[idx] = top.clone();
                    }
                }
            }
        }
    }

    let mut sorted_children = children[name].clone();
    sorted_children.sort();
    for c in &sorted_children {
        visit(c, cfg, children, counters, stacks, visit_order);
    }

    for var_name in pushed {
        stacks.get_mut(&var_name).unwrap().pop();
    }
}

fn rename_variables(cfg: &mut Cfg, idom: &HashMap<String, String>) -> Vec<String> {
    let mut children: HashMap<String, Vec<String>> = cfg.blocks.keys().map(|k| (k.clone(), Vec::new())).collect();
    for (n, d) in idom {
        if d != n {
            children.get_mut(d).unwrap().push(n.clone());
        }
    }

    let mut counters: HashMap<String, u32> = HashMap::new();
    let mut stacks: HashMap<String, Vec<String>> = HashMap::new();
    let mut visit_order: Vec<String> = Vec::new();

    let entry = cfg.entry.clone();
    visit(&entry, cfg, &children, &mut counters, &mut stacks, &mut visit_order);

    let mut output: Vec<String> = Vec::new();
    for name in &visit_order {
        output.push(format!("{}:", name));
        for instr in &cfg.blocks[name].instrs {
            if instr.is_phi() {
                let rhs = format!("phi({})", instr.uses.join(", "));
                output.push(format!("  {} = {}", instr.rendered_dest, rhs));
            } else if instr.dest.is_some() {
                output.push(format!("  {} = {}", instr.rendered_dest, instr.rendered_rhs));
            } else {
                output.push(format!("  {}", instr.rendered_rhs));
            }
        }
    }
    output
}
```

```csharp
class Instr
{
    public string? Dest;
    public List<string> Uses;
    public string Template;
    public string RenderedDest = "";
    public string RenderedRhs = "";

    public Instr(string? dest, List<string> uses, string template)
    {
        Dest = dest;
        Uses = uses;
        Template = template;
    }

    public bool IsPhi() => Template.StartsWith("phi(");
}

class Block
{
    public List<string> Preds = new();
    public List<string> Succs = new();
    public List<Instr> Instrs = new();
}

class CFG
{
    public Dictionary<string, Block> Blocks = new();
    public string Entry = "";

    public Block AddBlock(string name)
    {
        var b = new Block();
        Blocks[name] = b;
        return b;
    }

    public void AddEdge(string src, string dst)
    {
        Blocks[src].Succs.Add(dst);
        Blocks[dst].Preds.Add(src);
    }
}

static class SsaBuilder
{
    static string FormatTemplate(string template, List<string> values) =>
        Regex.Replace(template, @"\{(\d+)\}", m => values[int.Parse(m.Groups[1].Value)]);

    public static Dictionary<string, string> ComputeDominators(CFG cfg)
    {
        var order = new List<string> { cfg.Entry };
        var visited = new HashSet<string> { cfg.Entry };
        for (int i = 0; i < order.Count; i++)
        {
            foreach (var s in cfg.Blocks[order[i]].Succs)
            {
                if (visited.Add(s)) order.Add(s);
            }
        }

        var idom = new Dictionary<string, string?>();
        foreach (var n in cfg.Blocks.Keys) idom[n] = null;
        idom[cfg.Entry] = cfg.Entry;

        string Intersect(string a, string b)
        {
            while (a != b)
            {
                while (order.IndexOf(a) > order.IndexOf(b)) a = idom[a]!;
                while (order.IndexOf(b) > order.IndexOf(a)) b = idom[b]!;
            }
            return a;
        }

        bool changed = true;
        while (changed)
        {
            changed = false;
            foreach (var n in order)
            {
                if (n == cfg.Entry) continue;
                var predsDone = cfg.Blocks[n].Preds.Where(p => idom[p] != null).ToList();
                if (predsDone.Count == 0) continue;
                string newIdom = predsDone[0];
                foreach (var p in predsDone.Skip(1)) newIdom = Intersect(newIdom, p);
                if (idom[n] != newIdom)
                {
                    idom[n] = newIdom;
                    changed = true;
                }
            }
        }

        return idom.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value!);
    }

    public static Dictionary<string, HashSet<string>> ComputeDominanceFrontier(CFG cfg, Dictionary<string, string> idom)
    {
        var df = cfg.Blocks.Keys.ToDictionary(n => n, n => new HashSet<string>());
        foreach (var (n, block) in cfg.Blocks)
        {
            if (block.Preds.Count < 2) continue;
            foreach (var p in block.Preds)
            {
                string runner = p;
                while (runner != idom[n])
                {
                    df[runner].Add(n);
                    runner = idom[runner];
                }
            }
        }
        return df;
    }

    public static void InsertPhis(CFG cfg, Dictionary<string, HashSet<string>> df)
    {
        var defsites = new Dictionary<string, HashSet<string>>();
        foreach (var (name, block) in cfg.Blocks)
        {
            foreach (var instr in block.Instrs)
            {
                if (instr.Dest != null)
                {
                    if (!defsites.ContainsKey(instr.Dest)) defsites[instr.Dest] = new HashSet<string>();
                    defsites[instr.Dest].Add(name);
                }
            }
        }

        foreach (var (varName, sites) in defsites)
        {
            var hasPhi = new HashSet<string>();
            var worklist = new List<string>(sites);
            while (worklist.Count > 0)
            {
                var n = worklist[^1];
                worklist.RemoveAt(worklist.Count - 1);
                foreach (var m in df[n])
                {
                    if (hasPhi.Contains(m)) continue;
                    hasPhi.Add(m);
                    int nPreds = cfg.Blocks[m].Preds.Count;
                    string template = "phi(" + string.Join(", ", Enumerable.Range(0, nPreds).Select(i => $"{{{i}}}")) + ")";
                    cfg.Blocks[m].Instrs.Insert(0, new Instr(varName, Enumerable.Repeat(varName, nPreds).ToList(), template));
                    worklist.Add(m);
                }
            }
        }
    }

    public static List<string> RenameVariables(CFG cfg, Dictionary<string, string> idom)
    {
        var children = cfg.Blocks.Keys.ToDictionary(n => n, n => new List<string>());
        foreach (var (n, d) in idom)
        {
            if (d != n) children[d].Add(n);
        }

        var counters = new Dictionary<string, int>();
        var stacks = new Dictionary<string, List<string>>();
        var visitOrder = new List<string>();

        string NewName(string varName)
        {
            int v = counters.GetValueOrDefault(varName, 0);
            counters[varName] = v + 1;
            string name = $"{varName}{v}";
            if (!stacks.ContainsKey(varName)) stacks[varName] = new List<string>();
            stacks[varName].Add(name);
            return name;
        }

        void Visit(string name)
        {
            visitOrder.Add(name);
            var block = cfg.Blocks[name];
            var pushed = new List<string>();
            foreach (var instr in block.Instrs)
            {
                if (instr.IsPhi())
                {
                    instr.RenderedDest = NewName(instr.Dest!);
                    pushed.Add(instr.Dest!);
                }
                else
                {
                    var renderedUses = instr.Uses.Select(u => stacks[u][^1]).ToList();
                    instr.RenderedRhs = FormatTemplate(instr.Template, renderedUses);
                    if (instr.Dest != null)
                    {
                        instr.RenderedDest = NewName(instr.Dest);
                        pushed.Add(instr.Dest);
                    }
                }
            }

            foreach (var succName in block.Succs)
            {
                var succ = cfg.Blocks[succName];
                int idx = succ.Preds.IndexOf(name);
                foreach (var instr in succ.Instrs)
                {
                    if (instr.IsPhi() && instr.Dest != null && stacks.ContainsKey(instr.Dest))
                    {
                        instr.Uses[idx] = stacks[instr.Dest][^1];
                    }
                }
            }

            foreach (var c in children[name].OrderBy(x => x, StringComparer.Ordinal)) Visit(c);

            foreach (var varName in pushed) stacks[varName].RemoveAt(stacks[varName].Count - 1);
        }

        Visit(cfg.Entry);

        var output = new List<string>();
        foreach (var name in visitOrder)
        {
            output.Add($"{name}:");
            foreach (var instr in cfg.Blocks[name].Instrs)
            {
                if (instr.IsPhi())
                {
                    string rhs = "phi(" + string.Join(", ", instr.Uses) + ")";
                    output.Add($"  {instr.RenderedDest} = {rhs}");
                }
                else if (instr.Dest != null)
                {
                    output.Add($"  {instr.RenderedDest} = {instr.RenderedRhs}");
                }
                else
                {
                    output.Add($"  {instr.RenderedRhs}");
                }
            }
        }
        return output;
    }
}
```
