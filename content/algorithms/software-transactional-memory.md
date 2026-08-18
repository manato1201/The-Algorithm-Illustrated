---
name: ソフトウェアトランザクショナルメモリ(STM)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(k)(1トランザクションのコミット試行あたり、kはアクセスした共有変数の数、競合時は再試行で増加)
summary: 複数の共有メモリ操作を「トランザクション」としてまとめ、コミット時に競合を検出したら変更を自動的にロールバックして再試行することで、明示的なロックなしに複数変数にまたがる一貫した並行更新を実現する手法。
---

## 概要

複数の共有変数にまたがる更新(例えば「口座Aから引き落として口座Bに入金する」)をロックで安全に行うには、関係する全ての変数に対して正しい順序でロックを取得・解放する必要があり、ロックの粒度設計や順序を誤るとデッドロックやライブロックを招く。データベースのトランザクション(ACID特性を持つ「全て成功するか全て失敗するか」の単位)という考え方をメモリ上の共有変数に応用したのが、ソフトウェアトランザクショナルメモリ(STM)である。プログラマは「この一連の読み書きをアトミックに行いたい」という**意図**だけをトランザクションとして宣言し、実際にロックを取得する順序やタイミングの管理はランタイムに任せる。ランタイムはトランザクションの実行中に読み書きした変数を記録しておき、コミット(確定)しようとするタイミングで他のトランザクションと競合していないかを検査する。競合がなければ変更を確定させ、競合が検出されれば行った変更は全て取り消され(ロールバック)、トランザクションは最初から自動的に再実行される。この「楽観的に実行し、衝突したらやり直す」という発想は、[Compare-and-Swapを使ったロックフリー構造](/algorithms/lock-free-stack-cas)の思想を、単一の変数だけでなく複数の変数にまたがる操作にまで一般化したものと捉えることができる。

## 仕組み

1. プログラマは、アトミックに実行したい一連の読み書き操作を`atomic { ... }`のようなブロック(トランザクション)として記述する
2. トランザクションが開始されると、ランタイムはその実行中にアクセスした全ての共有変数について、**読み取り集合(read set)**(読んだ変数とその時点の値やバージョン番号)と**書き込み集合(write set)**(書き込もうとしている変数と新しい値)を記録する。この間、実際の共有メモリはまだ変更されず、書き込みはトランザクション専用のローカルなバッファに一時的に蓄えられる
3. トランザクションの処理が終わったら、**コミット**を試みる: 読み取り集合に記録した全ての変数について、トランザクション開始時から現在までに他のトランザクションによって値やバージョンが変更されていないかを検査する
4. 検査の結果、誰にも変更されていなければ、書き込み集合の内容を実際の共有メモリに一括して反映し、トランザクションを成功として確定する
5. もし1つでも変更が検出されれば(=他のトランザクションと競合していた)、このトランザクションで行った全ての変更を破棄(ロールバック)し、最初から自動的に再実行する。この再試行は、コミットに成功するまで繰り返される

## 特性・トレードオフ

- **計算量**: コミット試行1回あたり、アクセスした変数の数`k`に比例した検証コストがかかる。競合が起きるたびに全体をやり直すため、競合が頻発する高負荷な環境では実効的なコストが大きく膨らむ可能性がある
- **ロックの合成可能性(composability)問題を解決する**: 複数のロックベースの操作を安全に組み合わせるのは一般に難しい(ロックの順序を誤るとデッドロックになる)が、STMのトランザクションはネストしても、複数のトランザクションを1つに合成しても、正しさが保証される——「この一連の操作をアトミックに」という宣言だけで済むため、ロックの取得順序を人間が管理する必要がない
- **楽観的並行制御ゆえの再試行コスト**: 「まず実行してみて、衝突していたらやり直す」という楽観的なアプローチは、競合がまれな場面では非常に効率的だが、書き込みの多い共有変数に多数のスレッドが同時にアクセスするような競合が激しい場面では、再試行が連鎖して性能が悪化する(いわゆるライブロックに近い状況)ことがある
- **I/Oや副作用の扱いの難しさ**: トランザクションはロールバック(取り消し)される可能性があるため、ファイル書き込みやネットワーク送信のような「取り消せない副作用」をトランザクション内に含めるのは危険であり、実用上の大きな制約になる
- **使いどころ**: Haskellの`STM`モナド、Clojureの`ref`と`dosync`、GCC/Clangの実験的なTransactional Memory拡張(現在は多くが廃止・縮小)など、主に関数型言語や研究的な実装で採用されてきた。実務での主流はロックや[Compare-and-Swapベースのロックフリー構造](/algorithms/lock-free-stack-cas)だが、STMは「複数の共有変数にまたがるアトミックな更新を、ロックの順序管理から解放して記述する」という理論的に重要なアイデアを提供している

## 実装例

複数の口座残高を表す共有変数に対して、バージョン番号ベースの楽観的並行制御でトランザクションを実装する。各トランザクションは読み書きした変数のバージョンを記録し、コミット時に全ての読み取り対象のバージョンが変わっていないか検証してから一括で反映する(検証に失敗したら例外を投げて呼び出し側が再試行する)。

```python
import threading
from dataclasses import dataclass


@dataclass
class Cell:
    value: int
    version: int = 0


class ConflictError(Exception):
    pass


class STM:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.cells: dict[str, Cell] = {}

    def new_cell(self, name: str, value: int) -> None:
        self.cells[name] = Cell(value)

    def run_transaction(self, body, max_retries: int = 100) -> object:
        for _ in range(max_retries):
            read_versions: dict[str, int] = {}
            write_buffer: dict[str, int] = {}

            def tx_read(name: str) -> int:
                cell = self.cells[name]
                read_versions[name] = cell.version
                return write_buffer.get(name, cell.value)

            def tx_write(name: str, value: int) -> None:
                write_buffer[name] = value

            try:
                result = body(tx_read, tx_write)
            except ConflictError:
                continue

            with self._lock:
                # コミット検証: 読み取った全変数のバージョンが変わっていないか確認
                if all(self.cells[n].version == v for n, v in read_versions.items()):
                    for name, value in write_buffer.items():
                        cell = self.cells[name]
                        cell.value = value
                        cell.version += 1
                    return result
                # 競合検出 => 何も反映せずループ先頭からやり直す
        raise ConflictError("max_retries exceeded")


def transfer(stm: STM, src: str, dst: str, amount: int) -> None:
    def body(read, write):
        src_balance = read(src)
        if src_balance < amount:
            raise ValueError("insufficient funds")
        write(src, src_balance - amount)
        write(dst, read(dst) + amount)

    stm.run_transaction(body)
```

```typescript
class Cell {
  version = 0;
  constructor(public value: number) {}
}

class ConflictError extends Error {}

type TxRead = (name: string) => number;
type TxWrite = (name: string, value: number) => void;

class STM {
  cells = new Map<string, Cell>();

  newCell(name: string, value: number): void {
    this.cells.set(name, new Cell(value));
  }

  runTransaction<T>(
    body: (read: TxRead, write: TxWrite) => T,
    maxRetries = 100,
  ): T {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const readVersions = new Map<string, number>();
      const writeBuffer = new Map<string, number>();

      const read: TxRead = (name) => {
        const cell = this.cells.get(name)!;
        readVersions.set(name, cell.version);
        return writeBuffer.has(name) ? writeBuffer.get(name)! : cell.value;
      };
      const write: TxWrite = (name, value) => {
        writeBuffer.set(name, value);
      };

      let result: T;
      try {
        result = body(read, write);
      } catch (e) {
        if (e instanceof ConflictError) continue;
        throw e;
      }

      // コミット検証: 読み取った全変数のバージョンが変わっていないか確認
      const valid = [...readVersions.entries()].every(
        ([name, v]) => this.cells.get(name)!.version === v,
      );
      if (valid) {
        for (const [name, value] of writeBuffer) {
          const cell = this.cells.get(name)!;
          cell.value = value;
          cell.version++;
        }
        return result;
      }
      // 競合検出 => 何も反映せずループ先頭からやり直す
    }
    throw new ConflictError("max retries exceeded");
  }
}

function transfer(stm: STM, src: string, dst: string, amount: number): void {
  stm.runTransaction((read, write) => {
    const srcBalance = read(src);
    if (srcBalance < amount) throw new Error("insufficient funds");
    write(src, srcBalance - amount);
    write(dst, read(dst) + amount);
  });
}
```
