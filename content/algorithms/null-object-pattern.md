---
name: Null Objectパターン
category: デザインパターン
subcategory: 振る舞い
complexity: 呼び出しごとに O(1)(分岐を持つ代わりに、何もしないオブジェクトへ委譲する)
summary: 「何もしない」ことを本物と同じインターフェースを持つオブジェクトとして用意し、呼び出し側のnullチェックをなくす。
---

## 概要

オブジェクトが「存在しない」ことを表すのに `null`(あるいは `None`、`undefined`)を使うと、使う側のあらゆる場所に「nullでなければ呼ぶ」という分岐が散らばる。ひとつでも書き忘れると、実行時のヌルポインタ例外になる。トニー・ホーアが後年「10億ドルの誤り」と呼んだのが、この null 参照である。

Null Objectパターンは、**「何もしないこと」自体を、本物のオブジェクトと同じインターフェースを持つ別のクラスにする**ことで、この分岐をなくす。ロガーが設定されていないなら、何も出力しないロガーを渡す。ユーザーが未ログインなら、権限が一切ない「ゲスト」ユーザーを渡す。呼び出し側は、相手が本物かどうかを意識せず、同じように呼べばよい。パターンとしては1990年代にまとめられたもので(Bobby Woolfらによる整理)、GoFの23パターンの外にあるが、多態性の素直な応用として広く使われている。

## 仕組み

1. 抽象インターフェース(または基底クラス)を定義する。例: `Logger` に `log(message)`
2. 本物の実装を作る。例: `ConsoleLogger` は実際に出力する
3. **Null Object** を作る。例: `NullLogger` は、`log` を呼ばれても何もしない。戻り値が必要なメソッドには、「安全な既定値」(空のリスト、0、空文字、何もしないオブジェクト)を返す
4. 「相手がいない」場面では、`null` の代わりに Null Object を渡す。コンストラクタの既定値や、検索関数の「見つからなかった」場合の戻り値として使うと効果的
5. 呼び出し側は、型のチェックも null のチェックもせずに、そのままメソッドを呼ぶ

## 特性・トレードオフ

- **条件分岐が消える**: 呼び出し側のコードが単純になり、null の書き忘れによるクラッシュがなくなる。オブジェクト指向の「条件分岐を多態性に置き換える」の典型
- **失敗が見えにくくなる**: 本来は「存在しない」ことを呼び出し側が知るべき場面でも、静かに何もしないので、バグや設定ミスに気づきにくい。エラーにすべきか、無視してよいかを、場面ごとに見極める
- **既定値の選び方が仕様**: Null Object が返す既定値は、プログラムの振る舞いを決める。「権限がない」「料金は0」のような値が、安全な既定であることを確認する
- **クラスが増える**: インターフェースが大きいと、Null Object が実装すべきメソッドも多い。小さなインターフェースに保つ
- **言語機能で代用できることもある**: オプション型(`Option`、`Optional`)、ヌル安全な言語(Kotlin、Swift)、Pythonの `contextlib.nullcontext` のように、標準で用意されている場合は、そちらを使う
- **使いどころ**: ロギング、キャッシュ(常にミス扱い)、未ログインのゲストユーザー、何もしない戦略(Strategy)やコマンド、ゲームの「空の」装備スロット

## 実装例

```python
from abc import ABC, abstractmethod


class Logger(ABC):
    @abstractmethod
    def log(self, message: str) -> None: ...


class ConsoleLogger(Logger):
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")


class NullLogger(Logger):
    def log(self, message: str) -> None:
        pass                      # 何もしない


class OrderService:
    def __init__(self, logger: Logger | None = None):
        self.logger = logger or NullLogger()   # None の代わりに Null Object

    def place(self, item: str) -> None:
        self.logger.log(f"注文を受け付け: {item}")  # null チェックが要らない


OrderService(ConsoleLogger()).place("book")  # [LOG] 注文を受け付け: book
OrderService().place("book")                 # 何も出力されない(エラーにもならない)
```

```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class NullLogger implements Logger {
  log(): void {
    // 何もしない
  }
}

class OrderService {
  private logger: Logger;
  constructor(logger?: Logger) {
    this.logger = logger ?? new NullLogger(); // undefined の代わりに Null Object
  }
  place(item: string): void {
    this.logger.log(`注文を受け付け: ${item}`);
  }
}

new OrderService(new ConsoleLogger()).place("book"); // [LOG] 注文を受け付け: book
new OrderService().place("book"); // 何も出力されない
```
