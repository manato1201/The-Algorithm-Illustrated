---
name: デッカーのアルゴリズム(Dekker's Algorithm)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の臨界区間への出入りあたり)
summary: 2つのプロセスが「入りたい意思表示」と「譲り合いの順番」という共有変数だけを使い、特殊な命令もOSの助けも借りずに相互排他を実現した、史上最初に発見されたソフトウェアのみの相互排他アルゴリズム。
---

## 概要

複数のプロセスが同じ共有資源に同時にアクセスしないよう保証する相互排他の問題は、1960年代の初期のマルチプログラミングOS設計の中で最初に定式化された。オランダの数学者テオドロス・デッカーが考案し、1965年にエドガー・ダイクストラの論文で紹介されたデッカーのアルゴリズムは、ロック命令やCompare-and-Swapのようなハードウェアのアトミック命令が一切存在しなかった時代に、通常の読み書き可能な共有変数だけで2プロセス間の相互排他を実現できることを世界で初めて示した、歴史的に最も古いソフトウェアのみの相互排他アルゴリズムである。[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)はこのデッカーのアルゴリズムを土台に、1981年によりシンプルな形に整理し直したものであり、両者は同じ問題を同じ発想(意思表示のフラグと譲り合いの変数の組み合わせ)で解いている兄弟のような関係にある。

デッカーのアルゴリズムがピーターソンのアルゴリズムと比べて複雑に見えるのは、`turn`変数を一方的に相手へ譲るのではなく、「自分が入りたい間は、相手に順番を譲りながら相手の意思表示が下がるのを待ち、相手の番が回ってきたときだけ自分の番を明け渡す」という、より慎重な二重のチェックを行っているためである。この回りくどさは、ピーターソンのアルゴリズムが発見されるまで「もっと単純な解法があるはずだ」という直感がなかなか証明されなかったことの裏返しでもある。

## 仕組み

1. 2つの共有変数を用意する: `flag[2]`(各プロセスが「臨界区間に入りたいかどうか」を示す配列、初期値は両方false)と`turn`(現在どちらのプロセスに優先権があるかを示す変数、初期値はどちらでもよい)
2. プロセス`i`(相手をプロセス`j`とする)が臨界区間に入りたいとき、まず`flag[i] = true`として自分の意思を表明する
3. その後、相手も入りたがっている間(`flag[j] == true`)は、以下のチェックを繰り返す: もし今の優先権が相手(`turn == j`)にあるなら、自分は一旦`flag[i] = false`にして意思表示を取り下げ、`turn`が自分に回ってくるまで待ってから再び`flag[i] = true`にする(これによりデッドロックを避けつつ相手に道を譲る)
4. `flag[j]`が`false`になったら(相手が入りたがっていない)、安全に臨界区間へ入る
5. 臨界区間の処理が終わったら、`turn`を相手`j`に明け渡し(`turn = j`)、`flag[i] = false`として意思表示を取り下げる。これにより相手がすぐに臨界区間へ入れるようになる

## 特性・トレードオフ

- **計算量**: 臨界区間への出入りはいずれも定数回の共有変数の読み書きとビジーウェイトで完結するため`O(1)`。特殊なハードウェア命令を一切使わない
- **相互排他・進行・有界待機を全て満たす初の証明済み解法**: デッカーのアルゴリズムは、2プロセスが同時に臨界区間へ入らないこと、入りたいプロセスが有限時間内に必ず入れること、特定のプロセスが無限に待たされ続けないことの3条件を、共有変数の読み書きだけで満たすことを証明した最初の例である。この発見が後の相互排他理論全体の出発点になった
- **[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)との比較**: 両者は本質的に同じ2つの共有変数(意思表示のフラグと優先権)を使うが、デッカーのアルゴリズムは「相手に譲るときは一旦意思表示を取り下げてから優先権が回ってくるのを待つ」という段階的な処理を踏むのに対し、ピーターソンのアルゴリズムは`turn = other`という1回の代入と単一のwhile条件だけで同じ効果を達成する。ピーターソンのアルゴリズムが発見された後、デッカーのアルゴリズムは主に歴史的・教育的な文脈で参照されるようになった
- **ビジーウェイトのコスト**: 待機中のプロセスはCPUを使い続けて条件を確認するため、待ち時間が長い場面ではCPU資源を浪費する。実務ではより効率的なミューテックスやセマフォが使われる
- **使いどころ**: 相互排他アルゴリズムの歴史と理論的発展を学ぶ教育的な事例、[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)や[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)へと続く「共有変数だけによる同期」という研究系譜の出発点としての理解

## 実装例

実際のスレッドを使わず、各プロセスを「入りたい→スピン待ち→臨界区間→退出」の状態遷移として表現し、スケジューラが1ステップずつ交互に進める決定論的シミュレーションで検証する。両プロセスが同時に臨界区間に入っていないこと(`maxConcurrentCs <= 1`)を確認する。

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
            self.state = SPIN
        elif self.state == SPIN:
            if not shared.flag[self.other]:
                self.state = CS
            elif shared.turn == self.other:
                # 相手に優先権がある間は一旦意思表示を取り下げて待つ
                shared.flag[self.id] = False
                if shared.turn == self.id:
                    shared.flag[self.id] = True
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
            shared.turn = self.other
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
const WANT = 0,
  SPIN = 1,
  CS = 2,
  EXIT = 3,
  DONE = 4;

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
      this.state = SPIN;
    } else if (this.state === SPIN) {
      if (!shared.flag[this.other]) {
        this.state = CS;
      } else if (shared.turn === this.other) {
        // 相手に優先権がある間は一旦意思表示を取り下げて待つ
        shared.flag[this.id] = false;
        if (shared.turn === this.id) shared.flag[this.id] = true;
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
      shared.turn = this.other;
      shared.flag[this.id] = false;
      this.roundsDone++;
      this.state = this.roundsDone < this.targetRounds ? WANT : DONE;
    }
  }
}

function runSimulation(
  schedule: number[],
  roundsPerProcess: number,
): { shared: Shared; procs: Proc[] } {
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
