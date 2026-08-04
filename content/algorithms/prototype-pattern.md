---
name: Prototype(プロトタイプ)
category: デザインパターン
subcategory: 生成
complexity: 生成に関するパターン
summary: 既存のインスタンスを複製(クローン)することで、コストの高い生成処理を避ける。
---
## 概要

新しいオブジェクトを`new`とコンストラクタから作り直すのではなく、**既存の(すでに初期化済みの)インスタンスを複製することで**同種のオブジェクトを生成する生成パターン。生成コストが高いオブジェクト(データベースから読み込んだ設定を反映済みのオブジェクトや、複雑な初期化処理を経たオブジェクト)を大量に、あるいは繰り返し必要とする場面で有効。ゲーム開発における敵キャラクターやパーティクルの量産、グラフィックエディタにおける図形の複製(コピー&ペースト)などが典型例。

## 仕組み

1. 複製したいクラスに、自分自身のコピーを生成して返す`clone()`メソッドを実装させる(多くの言語ではこの目的のための共通インターフェースが用意されている)
2. `clone()`の内部では、自身のフィールドを新しいインスタンスにコピーする。値型のフィールドは単純コピーでよいが、参照型のフィールド(配列やオブジェクト)は「浅いコピー」(参照だけコピーし元と共有する)か「深いコピー」(中身も再帰的に複製する)かを設計上明確に決める必要がある
3. 呼び出し側は、テンプレートとなる「原型(プロトタイプ)」インスタンスを1つ保持しておき、新しいインスタンスが必要になるたびに`new`ではなく`prototype.clone()`を呼ぶ
4. 複数種類のプロトタイプをレジストリ(辞書)に登録しておき、名前やキーで引いて複製する「プロトタイプレジストリ」という応用形もよく使われる

## 特性・トレードオフ

- **生成コストの高いオブジェクトに有効**: 複雑な初期化処理(ネットワーク越しの設定取得、重い計算処理を伴う初期状態の構築など)を一度だけ実行し、以降はメモリ上のコピーで済ませられる
- **具体クラスに依存しない生成**: `clone()`はオブジェクト自身が実装するため、呼び出し側は複製対象の具体クラスを知らなくても(インターフェース経由で)複製できる。Factory Methodのようにサブクラスの階層を用意しなくても、実行時に存在するインスタンスをそのままテンプレートにできる
- **浅いコピーと深いコピーの落とし穴**: 内部に可変な参照型フィールドを持つオブジェクトで浅いコピーを行うと、複製後のオブジェクト同士が同じ内部状態を共有してしまい、片方の変更がもう片方に影響する予期しないバグを生みやすい。設計時にコピーの深さを明示的に決めることが重要
- **使いどころ**: オブジェクトの生成コストが初期化処理に比べて複製の方が明らかに安い場合、実行時に決まる「型そのものが動的な」オブジェクト群を扱う場合(ゲームのプレハブ的なテンプレート管理など)

## 実装例

`clone()`で複製した2つのインスタンス`a`・`b`が別オブジェクトであること、`a`の可変フィールド(タグの配列)を変更しても`b`や複製元のプロトタイプに影響しないこと(深いコピー)を検証する。

```python
import copy


class EnemyPrototype:
    def __init__(self, kind: str, hp: int, tags: list[str]) -> None:
        self.kind = kind
        self.hp = hp
        self.tags = tags  # 可変な参照フィールド: clone時に深いコピーが必要

    def clone(self) -> "EnemyPrototype":
        return copy.deepcopy(self)


class PrototypeRegistry:
    def __init__(self) -> None:
        self._prototypes: dict[str, EnemyPrototype] = {}

    def register(self, name: str, prototype: EnemyPrototype) -> None:
        self._prototypes[name] = prototype

    def create(self, name: str) -> EnemyPrototype:
        return self._prototypes[name].clone()


def demo() -> None:
    goblin_proto = EnemyPrototype("goblin", hp=20, tags=["weak", "green"])
    registry = PrototypeRegistry()
    registry.register("goblin", goblin_proto)

    a = registry.create("goblin")
    b = registry.create("goblin")

    a.tags.append("cursed")  # aだけを変更する
    a.hp = 5

    assert a is not b
    assert a.tags == ["weak", "green", "cursed"]
    assert b.tags == ["weak", "green"]           # bは無関係
    assert goblin_proto.tags == ["weak", "green"]  # プロトタイプ自体も無関係
```

```typescript
class EnemyPrototype {
  kind: string;
  hp: number;
  tags: string[];
  constructor(kind: string, hp: number, tags: string[]) {
    this.kind = kind;
    this.hp = hp;
    this.tags = tags;
  }
  clone(): EnemyPrototype {
    return new EnemyPrototype(this.kind, this.hp, [...this.tags]);
  }
}

class PrototypeRegistry {
  private prototypes = new Map<string, EnemyPrototype>();
  register(name: string, prototype: EnemyPrototype): void {
    this.prototypes.set(name, prototype);
  }
  create(name: string): EnemyPrototype {
    return this.prototypes.get(name)!.clone();
  }
}

function demo(): void {
  const goblinProto = new EnemyPrototype("goblin", 20, ["weak", "green"]);
  const registry = new PrototypeRegistry();
  registry.register("goblin", goblinProto);

  const a = registry.create("goblin");
  const b = registry.create("goblin");

  a.tags.push("cursed");
  a.hp = 5;

  console.assert(a !== b);
  console.assert(JSON.stringify(a.tags) === JSON.stringify(["weak", "green", "cursed"]));
  console.assert(JSON.stringify(b.tags) === JSON.stringify(["weak", "green"]));
  console.assert(JSON.stringify(goblinProto.tags) === JSON.stringify(["weak", "green"]));
}
```

```cpp
#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

class EnemyPrototype {
public:
    std::string kind;
    int hp;
    std::vector<std::string> tags;

    EnemyPrototype(std::string kind, int hp, std::vector<std::string> tags)
        : kind(std::move(kind)), hp(hp), tags(std::move(tags)) {}

    std::unique_ptr<EnemyPrototype> clone() const {
        return std::make_unique<EnemyPrototype>(kind, hp, tags); // vector<string>のコピーは値コピー(深いコピー)
    }
};

class PrototypeRegistry {
public:
    void registerPrototype(const std::string& name, std::unique_ptr<EnemyPrototype> prototype) {
        prototypes[name] = std::move(prototype);
    }
    std::unique_ptr<EnemyPrototype> create(const std::string& name) const {
        return prototypes.at(name)->clone();
    }
private:
    std::unordered_map<std::string, std::unique_ptr<EnemyPrototype>> prototypes;
};

void demo() {
    auto goblinProto = std::make_unique<EnemyPrototype>("goblin", 20, std::vector<std::string>{"weak", "green"});
    const EnemyPrototype* protoRef = goblinProto.get();

    PrototypeRegistry registry;
    registry.registerPrototype("goblin", std::move(goblinProto));

    auto a = registry.create("goblin");
    auto b = registry.create("goblin");

    a->tags.push_back("cursed");
    a->hp = 5;

    // a != b (別インスタンス)、bとprotoRefのtagsは変更されない
}
```

```rust
use std::collections::HashMap;

#[derive(Clone)]
struct EnemyPrototype {
    kind: String,
    hp: i32,
    tags: Vec<String>, // Vec<String>のclone()は深いコピー
}

impl EnemyPrototype {
    fn new(kind: &str, hp: i32, tags: Vec<String>) -> Self {
        EnemyPrototype { kind: kind.to_string(), hp, tags }
    }
}

struct PrototypeRegistry {
    prototypes: HashMap<String, EnemyPrototype>,
}

impl PrototypeRegistry {
    fn new() -> Self {
        PrototypeRegistry { prototypes: HashMap::new() }
    }
    fn register(&mut self, name: &str, prototype: EnemyPrototype) {
        self.prototypes.insert(name.to_string(), prototype);
    }
    fn create(&self, name: &str) -> EnemyPrototype {
        self.prototypes[name].clone()
    }
}

fn demo() {
    let goblin_proto = EnemyPrototype::new("goblin", 20, vec!["weak".to_string(), "green".to_string()]);
    let mut registry = PrototypeRegistry::new();
    registry.register("goblin", goblin_proto.clone());

    let mut a = registry.create("goblin");
    let b = registry.create("goblin");

    a.tags.push("cursed".to_string());
    a.hp = 5;

    assert_eq!(a.tags, vec!["weak", "green", "cursed"]);
    assert_eq!(b.tags, vec!["weak", "green"]);
    assert_eq!(goblin_proto.tags, vec!["weak", "green"]);
}
```

```csharp
class EnemyPrototype
{
    public string Kind; public int Hp; public List<string> Tags;
    public EnemyPrototype(string kind, int hp, List<string> tags) { Kind = kind; Hp = hp; Tags = tags; }
    public EnemyPrototype Clone() => new EnemyPrototype(Kind, Hp, new List<string>(Tags));
}

class PrototypeRegistry
{
    Dictionary<string, EnemyPrototype> prototypes = new();
    public void Register(string name, EnemyPrototype prototype) => prototypes[name] = prototype;
    public EnemyPrototype Create(string name) => prototypes[name].Clone();

    public static void Demo()
    {
        var goblinProto = new EnemyPrototype("goblin", 20, new List<string> { "weak", "green" });
        var registry = new PrototypeRegistry();
        registry.Register("goblin", goblinProto);

        var a = registry.Create("goblin");
        var b = registry.Create("goblin");

        a.Tags.Add("cursed");
        a.Hp = 5;

        // a != b (参照が異なる)、b.Tags と goblinProto.Tags は変更されない
    }
}
```
