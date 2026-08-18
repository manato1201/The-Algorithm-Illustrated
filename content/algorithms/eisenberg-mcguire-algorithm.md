---
name: アイゼンバーグ・マクガイアのアルゴリズム
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(n)(1回の臨界区間への出入りあたり、n参加プロセス数)
summary: ピーターソンのアルゴリズムの「フラグと順番」という発想を任意の数のプロセスへ一般化し、共有変数だけで公平な相互排他とデッドロックのない進行を保証する古典的なN者間相互排他アルゴリズム。
---

## 概要

[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)は2プロセス間の相互排他を「フラグ」と「順番(turn)」という2つの共有変数だけで美しく解決するが、3プロセス以上に素直に拡張しようとすると、単純な組み合わせでは正しさの証明が破綻してしまう。1972年にマレー・アイゼンバーグとマイケル・マクガイアが発表したこのアルゴリズムは、ピーターソンのアルゴリズムと同じ発想の骨格——「各プロセスが自分の状態をフラグとして公開する」「共有の`turn`変数が優先権を管理する」——を保ったまま、任意の数`n`のプロセスに対して正しく機能するよう巧妙に一般化した、N者間相互排他問題の古典的な解法である。[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)が「整理券番号」という別の発想でN者間相互排他を解くのに対し、アイゼンバーグ・マクガイアのアルゴリズムは各プロセスの状態(何もしていない・入りたい・臨界区間にいる)を巡回的にスキャンすることで同じ問題を解く点が対照的である。

## 仕組み

1. 各プロセス`i`の状態を表す共有配列`flag[n]`を用意する。各要素は「何もしていない(idle)」「入りたい(want-in)」「臨界区間にいる(in-cs)」の3値のいずれかを取り、初期値は全てidleとする。加えて、現在の優先プロセスを示す共有変数`turn`を用意する
2. プロセス`i`が臨界区間に入りたいとき、まず`flag[i] = want-in`とする。続けて、`turn`から始めて自分自身`i`に到達するまで、他プロセスを巡回的にスキャンする——スキャン中にidleでないプロセス`j`(=何かしたがっている、または既に臨界区間にいる)を見つけたら、スキャンの開始点を`turn`に戻してやり直す。全員がidleのまま`i`まで巡回できたら、次に進む
3. `flag[i] = in-cs`とし、他の全プロセスの`flag`を確認する——もし自分以外に`in-cs`のプロセスが1つでもいれば(誰かが既に臨界区間にいる)、手順2からやり直す
4. 誰も`in-cs`でないことを確認できたら、さらに`turn`が自分でなく、かつ`turn`が指すプロセスがidleでない場合は(=自分より優先すべき他の希望者がいる可能性がある)、手順2からやり直す。これらの条件をすべてクリアしたら、`turn = i`として自分に優先権を設定し、安全に臨界区間へ入る
5. 臨界区間の処理が終わったら、`turn`の次から巡回的にスキャンし、idleでない(=次に入りたがっている)最初のプロセス`j`を見つけて`turn = j`とする(誰も待っていなければ最終的に自分自身に戻ってくる)。その後`flag[i] = idle`として意思表示を取り下げる

## 特性・トレードオフ

- **計算量**: 臨界区間への出入りのたびに、他の全`n-1`プロセスの`flag`を確認する巡回スキャンが複数回発生しうるため`O(n)`。[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)の`O(1)`と比べるとコストは増えるが、任意の`n`に対応できる一般性を獲得している
- **相互排他・デッドロックフリー・有界待機を満たす**: このアルゴリズムは、2プロセスが同時に臨界区間に入らないこと(相互排他)、入りたいプロセスが存在すれば誰かが必ず入れること(デッドロックフリー)、特定のプロセスが無限に待たされ続けないこと(有界待機、最大`n-1`回他プロセスに追い越されるだけで済む)を満たすことが証明されている。`turn`変数による巡回的な優先権の管理が、[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)における「相手に順番を譲る」発想をN者間に一般化する鍵になっている
- **[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)との比較**: ベーカリーアルゴリズムは各プロセスが整理券番号を取り、番号順に並ぶという発想で公平性(FIFO性)を厳密に保証するのに対し、アイゼンバーグ・マクガイアのアルゴリズムは巡回スキャンによる優先権の受け渡しで待機回数の上限を保証する——両者とも共有変数の読み書きだけでハードウェアのアトミック命令を必要としない点は共通しているが、内部の仕組みは大きく異なる
- **ビジーウェイトのコスト**: [ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)と同様、待機中のプロセスは条件を満たすまでスピンし続けるため、CPU資源を浪費する。実務では長い待機が想定される場面ではセマフォやミューテックスのようなブロッキング型の同期機構が使われる
- **使いどころ**: N者間相互排他問題の理論的理解、[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)の発想が2プロセスを超えてどのように一般化されるかを学ぶ教育的な事例。実務では[MCSロック](/algorithms/mcs-lock)のようなキューベースのスケーラブルな同期機構やハードウェアのアトミック命令を使う手法が主流だが、共有変数のみによる古典的なN者間相互排他の解法として今も参照される

## 実装例

各プロセスを、アルゴリズムの手順に対応する状態機械(意思表示→巡回スキャン1→in-cs宣言→巡回スキャン2→最終チェック→臨界区間→後継探索)として表現し、スケジューラが1ステップずつ交互に進める決定論的シミュレーションで検証する。全プロセスが同時に臨界区間に入っていないこと(`maxConcurrentCs <= 1`)を確認する。

```python
FLAG_IDLE, FLAG_WANT, FLAG_INCS = range(3)
ST_WANT, ST_SCAN1, ST_SETINCS, ST_SCAN2, ST_EXITCHECK, ST_CS, ST_EXITSCAN, ST_DONE = range(8)


class Shared:
    def __init__(self, n: int) -> None:
        self.flag = [FLAG_IDLE] * n
        self.turn = 0
        self.in_cs = [False] * n
        self.max_concurrent_cs = 0
        self.entries = [0] * n


class Process:
    def __init__(self, pid: int, n: int, target_rounds: int) -> None:
        self.id = pid
        self.n = n
        self.state = ST_WANT
        self.j = 0
        self.rounds_done = 0
        self.target_rounds = target_rounds

    def step(self, shared: Shared) -> None:
        n, i = self.n, self.id
        if self.state == ST_WANT:
            shared.flag[i] = FLAG_WANT
            self.j = shared.turn
            self.state = ST_SCAN1
        elif self.state == ST_SCAN1:
            if self.j == i:
                self.state = ST_SETINCS
            elif shared.flag[self.j] != FLAG_IDLE:
                self.j = shared.turn  # 誰か動いている => スキャンをturnからやり直す
            else:
                self.j = (self.j + 1) % n
        elif self.state == ST_SETINCS:
            shared.flag[i] = FLAG_INCS
            self.j = 0
            self.state = ST_SCAN2
        elif self.state == ST_SCAN2:
            if self.j < n and (self.j == i or shared.flag[self.j] != FLAG_INCS):
                self.j += 1
            else:
                self.state = ST_EXITCHECK
        elif self.state == ST_EXITCHECK:
            if self.j < n or (shared.turn != i and shared.flag[shared.turn] != FLAG_IDLE):
                self.state = ST_WANT  # 競合の可能性 => 最初からやり直す
            else:
                shared.turn = i
                self.state = ST_CS
        elif self.state == ST_CS:
            shared.in_cs[i] = True
            shared.max_concurrent_cs = max(shared.max_concurrent_cs, sum(shared.in_cs))
            shared.entries[i] += 1
            self.j = (shared.turn + 1) % n
            self.state = ST_EXITSCAN
        elif self.state == ST_EXITSCAN:
            if shared.flag[self.j] == FLAG_IDLE:
                self.j = (self.j + 1) % n  # 次に入りたがっているプロセスを探す
            else:
                shared.turn = self.j
                shared.flag[i] = FLAG_IDLE
                shared.in_cs[i] = False
                self.rounds_done += 1
                self.state = ST_WANT if self.rounds_done < self.target_rounds else ST_DONE


def run_simulation(n: int, schedule: list[int], rounds_per_process: int) -> tuple[Shared, list[Process]]:
    shared = Shared(n)
    procs = [Process(pid, n, rounds_per_process) for pid in range(n)]
    idx = 0
    while any(p.state != ST_DONE for p in procs):
        pid = schedule[idx % len(schedule)]
        idx += 1
        if procs[pid].state != ST_DONE:
            procs[pid].step(shared)
    return shared, procs
```

```typescript
const FLAG_IDLE = 0,
  FLAG_WANT = 1,
  FLAG_INCS = 2;
const ST_WANT = 0,
  ST_SCAN1 = 1,
  ST_SETINCS = 2,
  ST_SCAN2 = 3,
  ST_EXITCHECK = 4,
  ST_CS = 5,
  ST_EXITSCAN = 6,
  ST_DONE = 7;

class Shared {
  flag: number[];
  turn = 0;
  inCs: boolean[];
  maxConcurrentCs = 0;
  entries: number[];

  constructor(n: number) {
    this.flag = new Array(n).fill(FLAG_IDLE);
    this.inCs = new Array(n).fill(false);
    this.entries = new Array(n).fill(0);
  }
}

class Proc {
  state = ST_WANT;
  j = 0;
  roundsDone = 0;

  constructor(
    public id: number,
    private n: number,
    private targetRounds: number,
  ) {}

  step(shared: Shared): void {
    const { n, id: i } = this;
    if (this.state === ST_WANT) {
      shared.flag[i] = FLAG_WANT;
      this.j = shared.turn;
      this.state = ST_SCAN1;
    } else if (this.state === ST_SCAN1) {
      if (this.j === i) {
        this.state = ST_SETINCS;
      } else if (shared.flag[this.j] !== FLAG_IDLE) {
        this.j = shared.turn; // 誰か動いている => スキャンをturnからやり直す
      } else {
        this.j = (this.j + 1) % n;
      }
    } else if (this.state === ST_SETINCS) {
      shared.flag[i] = FLAG_INCS;
      this.j = 0;
      this.state = ST_SCAN2;
    } else if (this.state === ST_SCAN2) {
      if (this.j < n && (this.j === i || shared.flag[this.j] !== FLAG_INCS)) {
        this.j++;
      } else {
        this.state = ST_EXITCHECK;
      }
    } else if (this.state === ST_EXITCHECK) {
      if (
        this.j < n ||
        (shared.turn !== i && shared.flag[shared.turn] !== FLAG_IDLE)
      ) {
        this.state = ST_WANT; // 競合の可能性 => 最初からやり直す
      } else {
        shared.turn = i;
        this.state = ST_CS;
      }
    } else if (this.state === ST_CS) {
      shared.inCs[i] = true;
      const concurrent = shared.inCs.filter(Boolean).length;
      shared.maxConcurrentCs = Math.max(shared.maxConcurrentCs, concurrent);
      shared.entries[i]++;
      this.j = (shared.turn + 1) % n;
      this.state = ST_EXITSCAN;
    } else if (this.state === ST_EXITSCAN) {
      if (shared.flag[this.j] === FLAG_IDLE) {
        this.j = (this.j + 1) % n; // 次に入りたがっているプロセスを探す
      } else {
        shared.turn = this.j;
        shared.flag[i] = FLAG_IDLE;
        shared.inCs[i] = false;
        this.roundsDone++;
        this.state = this.roundsDone < this.targetRounds ? ST_WANT : ST_DONE;
      }
    }
  }
}

function runSimulation(
  n: number,
  schedule: number[],
  roundsPerProcess: number,
): { shared: Shared; procs: Proc[] } {
  const shared = new Shared(n);
  const procs = Array.from(
    { length: n },
    (_, pid) => new Proc(pid, n, roundsPerProcess),
  );
  let idx = 0;
  while (procs.some((p) => p.state !== ST_DONE)) {
    const pid = schedule[idx % schedule.length];
    idx++;
    if (procs[pid].state !== ST_DONE) procs[pid].step(shared);
  }
  return { shared, procs };
}
```
