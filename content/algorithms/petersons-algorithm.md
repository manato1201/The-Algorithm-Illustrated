---
name: ピーターソンのアルゴリズム
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の臨界区間への出入りあたり)
summary: 2つのプロセスが「フラグ」と「順番」という2つの共有変数だけを使い、特別なハードウェア命令なしにソフトウェアだけで相互排他を実現する古典的なアルゴリズム。
---

## 概要

2つのプロセス(またはスレッド)が同じ共有資源(臨界区間、クリティカルセクション)に同時にアクセスしないよう保証する「相互排他」は、並行プログラミングの最も基本的な要件のひとつである。1981年にゲイリー・ピーターソンが発表したこのアルゴリズムは、専用のロック命令やCompare-and-Swapのような特殊なハードウェアサポートを一切使わず、通常の読み書き可能な共有変数だけで、2プロセス間の相互排他を保証できることを示した、驚くほどシンプルで美しいソフトウェアだけの解法である。

## 仕組み

1. 2つの共有変数を用意する: `flag[2]`(各プロセスが「臨界区間に入りたいかどうか」を示す配列、初期値は両方false)と`turn`(「今どちらのプロセスの順番か」を示す変数)
2. プロセス`i`(相手をプロセス`j`とする)が臨界区間に入ろうとするとき、まず`flag[i] = true`(自分が入りたいことを表明する)とし、次に`turn = j`(相手に順番を譲る、という意思表示)を設定する
3. その後、`while (flag[j] && turn == j)`という条件でビジーウェイト(繰り返し条件を確認して待つ)する——「相手も入りたがっていて、かつ今が相手の番である」間だけ待機する
4. この条件が偽になったら(相手が入りたがっていないか、自分の番が回ってきたら)、安全に臨界区間へ入る
5. 臨界区間の処理が終わったら、`flag[i] = false`として「もう入りたくない」ことを表明し、相手が待っていればすぐに臨界区間へ入れるようにする

## 特性・トレードオフ

- **計算量**: 臨界区間への出入りそれぞれが定数回の共有変数の読み書きで済むため`O(1)`。特殊な命令を使わないシンプルさが際立つ
- **相互排他・進行・有界待機の3条件を満たす**: このアルゴリズムは、「2プロセスが同時に臨界区間に入らない(相互排他)」「入りたいプロセスがいれば有限時間内に誰かが入れる(進行)」「1つのプロセスが無限に待たされ続けることはない(有界待機)」という、相互排他アルゴリズムに求められる3つの性質を全て満たすことが証明されている——`turn`変数が「お互いに譲り合う」役割を果たし、両者が同時に`flag`を立てても片方の`turn`設定が上書きされることで、決着がつく仕組みになっている
- **ビジーウェイトのコスト**: 待機中のプロセスはCPUを使い続けて条件を確認し続ける(スピンロック)ため、待ち時間が長い場合はCPU資源を浪費する。実務のOSやライブラリでは、長い待機が予想される場面ではプロセスを一旦スリープさせるセマフォやミューテックスのような、より効率的な同期機構が使われる
- **使いどころ**: 教育目的での相互排他の理論的理解、[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)のような、より多くのプロセスに一般化された相互排他アルゴリズムの前段としての理解、ハードウェアのアトミック命令が使えない極めて限定された環境でのソフトウェアのみによる同期の実現可能性の理論的基盤

## 実装例

実際のスレッドを使わず、各プロセスを「入りたい→スピン待ち→臨界区間→退出」の4状態を遷移する小さな状態機械として表現し、スケジューラが1ステップずつ交互に進める決定論的シミュレーションで検証する。両プロセスが同時に臨界区間に入っていないこと(`maxConcurrentCs <= 1`)を確認する。

```python
WANT, SPIN, CS, EXIT, DONE = range(5)


class Shared:
    def __init__(self) -> None:
        self.flag = [False, False]
        self.turn = 0
        self.in_cs = [False, False]
        self.max_concurrent_cs = 0
        self.entries = [0, 0]


class Process:
    def __init__(self, pid: int, target_rounds: int) -> None:
        self.id = pid
        self.other = 1 - pid
        self.state = WANT
        self.rounds_done = 0
        self.target_rounds = target_rounds

    def step(self, shared: Shared) -> None:
        if self.state == WANT:
            shared.flag[self.id] = True
            shared.turn = self.other
            self.state = SPIN
        elif self.state == SPIN:
            if shared.flag[self.other] and shared.turn == self.other:
                pass  # busy-wait: no state change this tick
            else:
                self.state = CS
        elif self.state == CS:
            shared.in_cs[self.id] = True
            concurrent = sum(shared.in_cs)
            shared.max_concurrent_cs = max(shared.max_concurrent_cs, concurrent)
            shared.entries[self.id] += 1
            self.state = EXIT
        elif self.state == EXIT:
            shared.in_cs[self.id] = False
            shared.flag[self.id] = False
            self.rounds_done += 1
            self.state = WANT if self.rounds_done < self.target_rounds else DONE


def run_simulation(schedule: list[int], rounds_per_process: int) -> tuple[Shared, list[Process]]:
    shared = Shared()
    procs = [Process(0, rounds_per_process), Process(1, rounds_per_process)]
    idx = 0
    while any(p.state != DONE for p in procs):
        pid = schedule[idx % len(schedule)]
        idx += 1
        if procs[pid].state != DONE:
            procs[pid].step(shared)
    return shared, procs
```

```typescript
const WANT = 0, SPIN = 1, CS = 2, EXIT = 3, DONE = 4;

class Shared {
  flag = [false, false];
  turn = 0;
  inCs = [false, false];
  maxConcurrentCs = 0;
  entries = [0, 0];
}

class Proc {
  id: number;
  other: number;
  state = WANT;
  roundsDone = 0;
  targetRounds: number;

  constructor(pid: number, targetRounds: number) {
    this.id = pid;
    this.other = 1 - pid;
    this.targetRounds = targetRounds;
  }

  step(shared: Shared): void {
    if (this.state === WANT) {
      shared.flag[this.id] = true;
      shared.turn = this.other;
      this.state = SPIN;
    } else if (this.state === SPIN) {
      if (shared.flag[this.other] && shared.turn === this.other) {
        // busy-wait: no state change this tick
      } else {
        this.state = CS;
      }
    } else if (this.state === CS) {
      shared.inCs[this.id] = true;
      const concurrent = (shared.inCs[0] ? 1 : 0) + (shared.inCs[1] ? 1 : 0);
      shared.maxConcurrentCs = Math.max(shared.maxConcurrentCs, concurrent);
      shared.entries[this.id]++;
      this.state = EXIT;
    } else if (this.state === EXIT) {
      shared.inCs[this.id] = false;
      shared.flag[this.id] = false;
      this.roundsDone++;
      this.state = this.roundsDone < this.targetRounds ? WANT : DONE;
    }
  }
}

function runSimulation(schedule: number[], roundsPerProcess: number): { shared: Shared; procs: Proc[] } {
  const shared = new Shared();
  const procs = [new Proc(0, roundsPerProcess), new Proc(1, roundsPerProcess)];
  let idx = 0;
  while (procs.some((p) => p.state !== DONE)) {
    const pid = schedule[idx % schedule.length];
    idx++;
    if (procs[pid].state !== DONE) procs[pid].step(shared);
  }
  return { shared, procs };
}
```

```cpp
#include <vector>
#include <algorithm>

enum State { WANT, SPIN, CS, EXIT, DONE };

struct Shared {
    bool flag[2] = {false, false};
    int turn = 0;
    bool inCs[2] = {false, false};
    int maxConcurrentCs = 0;
    int entries[2] = {0, 0};
};

struct Proc {
    int id, other;
    State state = WANT;
    int roundsDone = 0;
    int targetRounds;

    Proc(int pid, int target) : id(pid), other(1 - pid), targetRounds(target) {}

    void step(Shared& shared) {
        if (state == WANT) {
            shared.flag[id] = true;
            shared.turn = other;
            state = SPIN;
        } else if (state == SPIN) {
            if (shared.flag[other] && shared.turn == other) {
                // busy-wait: no state change this tick
            } else {
                state = CS;
            }
        } else if (state == CS) {
            shared.inCs[id] = true;
            int concurrent = (shared.inCs[0] ? 1 : 0) + (shared.inCs[1] ? 1 : 0);
            shared.maxConcurrentCs = std::max(shared.maxConcurrentCs, concurrent);
            shared.entries[id]++;
            state = EXIT;
        } else if (state == EXIT) {
            shared.inCs[id] = false;
            shared.flag[id] = false;
            roundsDone++;
            state = roundsDone < targetRounds ? WANT : DONE;
        }
    }
};

Shared runSimulation(const std::vector<int>& schedule, int roundsPerProcess) {
    Shared shared;
    std::vector<Proc> procs = {Proc(0, roundsPerProcess), Proc(1, roundsPerProcess)};
    size_t idx = 0;
    while (procs[0].state != DONE || procs[1].state != DONE) {
        int pid = schedule[idx % schedule.size()];
        idx++;
        if (procs[pid].state != DONE) procs[pid].step(shared);
    }
    return shared;
}
```

```rust
#[derive(PartialEq, Clone, Copy)]
enum State { Want, Spin, Cs, Exit, Done }

struct Shared {
    flag: [bool; 2],
    turn: usize,
    in_cs: [bool; 2],
    max_concurrent_cs: usize,
    entries: [usize; 2],
}

struct Proc {
    id: usize,
    other: usize,
    state: State,
    rounds_done: usize,
    target_rounds: usize,
}

impl Proc {
    fn new(pid: usize, target_rounds: usize) -> Self {
        Proc { id: pid, other: 1 - pid, state: State::Want, rounds_done: 0, target_rounds }
    }

    fn step(&mut self, shared: &mut Shared) {
        match self.state {
            State::Want => {
                shared.flag[self.id] = true;
                shared.turn = self.other;
                self.state = State::Spin;
            }
            State::Spin => {
                if shared.flag[self.other] && shared.turn == self.other {
                    // busy-wait: no state change this tick
                } else {
                    self.state = State::Cs;
                }
            }
            State::Cs => {
                shared.in_cs[self.id] = true;
                let concurrent = shared.in_cs.iter().filter(|&&b| b).count();
                shared.max_concurrent_cs = shared.max_concurrent_cs.max(concurrent);
                shared.entries[self.id] += 1;
                self.state = State::Exit;
            }
            State::Exit => {
                shared.in_cs[self.id] = false;
                shared.flag[self.id] = false;
                self.rounds_done += 1;
                self.state = if self.rounds_done < self.target_rounds { State::Want } else { State::Done };
            }
            State::Done => {}
        }
    }
}

fn run_simulation(schedule: &[usize], rounds_per_process: usize) -> Shared {
    let mut shared = Shared { flag: [false, false], turn: 0, in_cs: [false, false], max_concurrent_cs: 0, entries: [0, 0] };
    let mut procs = [Proc::new(0, rounds_per_process), Proc::new(1, rounds_per_process)];
    let mut idx = 0;
    while procs.iter().any(|p| p.state != State::Done) {
        let pid = schedule[idx % schedule.len()];
        idx += 1;
        if procs[pid].state != State::Done {
            let mut p = std::mem::replace(&mut procs[pid], Proc::new(pid, rounds_per_process));
            p.step(&mut shared);
            procs[pid] = p;
        }
    }
    shared
}
```

```csharp
class Shared
{
    public bool[] Flag = { false, false };
    public int Turn = 0;
    public bool[] InCs = { false, false };
    public int MaxConcurrentCs = 0;
    public int[] Entries = { 0, 0 };
}

class Proc
{
    public int Id, Other, State = 0 /* WANT */, RoundsDone = 0, TargetRounds;
    const int WANT = 0, SPIN = 1, CS = 2, EXIT = 3, DONE = 4;

    public Proc(int pid, int targetRounds) { Id = pid; Other = 1 - pid; TargetRounds = targetRounds; }

    public void Step(Shared shared)
    {
        if (State == WANT)
        {
            shared.Flag[Id] = true;
            shared.Turn = Other;
            State = SPIN;
        }
        else if (State == SPIN)
        {
            if (shared.Flag[Other] && shared.Turn == Other) { /* busy-wait */ }
            else State = CS;
        }
        else if (State == CS)
        {
            shared.InCs[Id] = true;
            int concurrent = (shared.InCs[0] ? 1 : 0) + (shared.InCs[1] ? 1 : 0);
            shared.MaxConcurrentCs = Math.Max(shared.MaxConcurrentCs, concurrent);
            shared.Entries[Id]++;
            State = EXIT;
        }
        else if (State == EXIT)
        {
            shared.InCs[Id] = false;
            shared.Flag[Id] = false;
            RoundsDone++;
            State = RoundsDone < TargetRounds ? WANT : DONE;
        }
    }

    public static Shared RunSimulation(int[] schedule, int roundsPerProcess)
    {
        var shared = new Shared();
        var procs = new[] { new Proc(0, roundsPerProcess), new Proc(1, roundsPerProcess) };
        int idx = 0;
        const int DONE = 4;
        while (procs[0].State != DONE || procs[1].State != DONE)
        {
            int pid = schedule[idx % schedule.Length];
            idx++;
            if (procs[pid].State != DONE) procs[pid].Step(shared);
        }
        return shared;
    }
}
```
