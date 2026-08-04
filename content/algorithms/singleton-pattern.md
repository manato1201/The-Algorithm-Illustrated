---
name: Singleton(シングルトン)
category: デザインパターン
subcategory: 生成
complexity: 生成に関するパターン
summary: インスタンスを1つに制限し、グローバルなアクセス点を提供する。テスト容易性を損ないやすく乱用注意。
---
## 概要

あるクラスのインスタンスがアプリケーション全体で**必ず1つしか存在しない**ことを保証し、そのインスタンスへの大域的なアクセス点を提供する生成パターン。設定情報の管理、ログ出力先、コネクションプールなど「複数存在すると整合性が崩れる」リソースを扱う場面で古くから使われてきた。GoFの23パターンの中でも最もシンプルで知られている一方、後述の理由から**現代のソフトウェア設計では最も乱用を戒められているパターン**でもある。

## 仕組み

1. クラスのコンストラクタを外部から直接呼べないようにする(private化、あるいは言語機能によるモジュールスコープ化)
2. クラス自身が唯一のインスタンスを保持する静的なフィールド(あるいはモジュールレベル変数)を持つ
3. `getInstance()`のような静的メソッドを公開し、初回呼び出し時にインスタンスを生成、以降は同じインスタンスを返す(遅延初期化)
4. 呼び出し側はこの静的メソッド経由でしかインスタンスにアクセスできないため、「常に同じインスタンスを見ている」ことが構造的に保証される

マルチスレッド環境では、初回生成時に複数スレッドが同時に`getInstance()`を呼ぶと二重生成が起きうるため、ロックや言語のスレッドセーフな初期化機構(Javaの`enum`実装や静的初期化ブロックなど)を併用する必要がある。

## 特性・トレードオフ

- **グローバル状態が持つ問題点をそのまま継承する**: どこからでもアクセスできる利便性の裏返しとして、どのコードがいつ状態を変更したか追跡しづらくなり、モジュール間の隠れた結合を生みやすい
- **テスト容易性の大幅な低下**: シングルトンは差し替えが難しいため、ユニットテストでモックに置き換えることが困難になりやすい。テスト間で状態がリークし、テストの実行順序に結果が依存するといった問題も起きやすい
- **「本当に1つしか要らないか」を疑うべき**: 多くの場合「1つで足りている」だけであり、将来的に複数必要になる可能性を最初から潰してしまう。依存性注入(DI)コンテナでインスタンスのライフサイクルを「シングルトン相当」に設定する方が、テスト容易性を保ちながら同様の効果を得られることが多い
- **使いどころ**: アプリケーション全体で本質的に単一であるべきリソース(OSレベルのデバイスハンドル、グローバルなキャッシュなど)に限定し、それ以外では依存性注入や単純なモジュールスコープ変数で代替することが現代の実務では推奨される

## 実装例

`get_instance()`(言語ごとの命名規則に従う)を複数回呼んでも同じインスタンスが返ることを検証する最小構成。C++/Rustはスレッドセーフでない簡易版(実運用ではC++の`std::call_once`/マジックスタティックや、Rustの`std::sync::OnceLock`を使うべき)。

```python
class Singleton:
    _instance: "Singleton | None" = None

    def __init__(self) -> None:
        if Singleton._instance is not None:
            raise RuntimeError("Singletonはget_instance()経由で取得してください")
        self.value = 0

    @classmethod
    def get_instance(cls) -> "Singleton":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


def demo() -> bool:
    a = Singleton.get_instance()
    b = Singleton.get_instance()
    a.value = 42
    return a is b and b.value == 42
```

```typescript
class Singleton {
  private static instance: Singleton | null = null;
  value = 0;

  private constructor() {}

  static getInstance(): Singleton {
    if (Singleton.instance === null) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}

function demo(): boolean {
  const a = Singleton.getInstance();
  const b = Singleton.getInstance();
  a.value = 42;
  return a === b && b.value === 42;
}
```

```cpp
class Singleton {
public:
    // スレッドセーフではない簡易版(実運用ではC++11のマジックスタティックやstd::call_onceを使うべき)
    static Singleton& getInstance() {
        if (instancePtr == nullptr) {
            instancePtr = new Singleton();
        }
        return *instancePtr;
    }

    int value = 0;

    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;

private:
    Singleton() = default;
    static Singleton* instancePtr;
};

Singleton* Singleton::instancePtr = nullptr;

bool demo() {
    Singleton& a = Singleton::getInstance();
    Singleton& b = Singleton::getInstance();
    a.value = 42;
    return &a == &b && b.value == 42;
}
```

```rust
struct Singleton {
    value: i32,
}

static mut INSTANCE: Option<Singleton> = None;

// スレッドセーフではない簡易版(実運用では std::sync::OnceLock 等を使うべき)
unsafe fn get_instance() -> &'static mut Singleton {
    if INSTANCE.is_none() {
        INSTANCE = Some(Singleton { value: 0 });
    }
    INSTANCE.as_mut().unwrap()
}

fn demo() -> bool {
    unsafe {
        let a = get_instance() as *mut Singleton;
        let b = get_instance() as *mut Singleton;
        (*a).value = 42;
        std::ptr::eq(a, b) && (*b).value == 42
    }
}
```

```csharp
class Singleton
{
    private static Singleton? instance;
    public int Value { get; set; }

    private Singleton() { }

    public static Singleton GetInstance()
    {
        instance ??= new Singleton();
        return instance;
    }
}

static bool Demo()
{
    var a = Singleton.GetInstance();
    var b = Singleton.GetInstance();
    a.Value = 42;
    return ReferenceEquals(a, b) && b.Value == 42;
}
```
