---
name: Decorator(デコレーター)
category: デザインパターン
subcategory: 構造
complexity: 構造に関するパターン
summary: オブジェクトを別のオブジェクトで包むことで、継承を使わずに機能を動的に追加する。
---
## 概要

オブジェクトを同じインターフェースを持つ別のオブジェクトで**包み込む(ラップする)**ことで、継承を使わずに機能を動的に追加・組み合わせる構造パターン。コーヒーに「ミルクを追加」「シロップを追加」のようにトッピングを重ねていくイメージが典型例としてよく使われる。継承でこれをやろうとすると「ミルク入りコーヒー」「シロップ入りコーヒー」「ミルク&シロップ入りコーヒー」のように組み合わせごとにサブクラスが必要になってしまうが、Decoratorはラップを重ねることでこれを回避する。

## 仕組み

1. 装飾対象と装飾者(デコレーター)の両方が実装する共通インターフェース(例: `Beverage`に`cost()`と`description()`)を定義する
2. 基本となる具体クラス(`Espresso`)がこのインターフェースを実装する
3. 抽象デコレータークラスもこのインターフェースを実装しつつ、内部に「包んでいる対象」(`Beverage`型のフィールド)を保持する
4. 具体的なデコレーター(`MilkDecorator`、`SyrupDecorator`)は、包んでいる対象のメソッドを呼び出した結果に、自分の追加分の処理(価格の加算、説明文の追記)を上乗せして返す
5. `new SyrupDecorator(new MilkDecorator(new Espresso()))`のように何重にもラップを重ねることで、任意の組み合わせの機能追加を実行時に自由に構成できる

呼び出し側からは、素の`Espresso`も、何重にもラップされたオブジェクトも、同じインターフェースの`Beverage`として区別なく扱える。

## 特性・トレードオフ

- **継承の組み合わせ爆発を回避**: 機能の組み合わせをクラス階層ではなく、実行時のオブジェクトのラップ構成として表現するため、必要なクラス数を組み合わせの数ではなく機能の種類数に抑えられる
- **単一責任原則に沿った小さなクラス**: 各デコレーターは1つの追加機能だけに責任を持つため、個々のクラスは小さく理解しやすい
- **ラップの順序が意味を持つことがある**: デコレーターを重ねる順序によって結果が変わる場合(税金計算後に割引を適用する、など)があり、呼び出し側が正しい順序を意識する必要がある
- **デバッグ時の追跡コスト**: 何重にもラップされたオブジェクトは、実行時にどのデコレーターがどの順で処理を行っているかを追いにくくなることがある
- **使いどころ**: I/Oストリームの機能拡張(バッファリング・圧縮・暗号化を重ねて適用する、Javaの`InputStream`階層が代表例)、UIコンポーネントへの装飾(スクロール可能・枠線付きなど)、ミドルウェアチェーン(HTTPリクエストへの認証・ロギング・キャッシュの重ね掛け)など

## 実装例

コーヒー(`Espresso`)に「ミルク」「シロップ」のトッピングを重ねる、Decoratorパターンの定番例。

```python
from abc import ABC, abstractmethod


class Beverage(ABC):
    @abstractmethod
    def cost(self) -> float: ...

    @abstractmethod
    def description(self) -> str: ...


class Espresso(Beverage):
    def cost(self) -> float:
        return 2.0

    def description(self) -> str:
        return "Espresso"


class BeverageDecorator(Beverage):
    def __init__(self, wrapped: Beverage):
        self._wrapped = wrapped


class MilkDecorator(BeverageDecorator):
    def cost(self) -> float:
        return self._wrapped.cost() + 0.5

    def description(self) -> str:
        return self._wrapped.description() + " + Milk"


class SyrupDecorator(BeverageDecorator):
    def cost(self) -> float:
        return self._wrapped.cost() + 0.3

    def description(self) -> str:
        return self._wrapped.description() + " + Syrup"


def decorator_demo() -> tuple[str, float]:
    beverage: Beverage = SyrupDecorator(MilkDecorator(Espresso()))
    return beverage.description(), beverage.cost()
```

```typescript
interface Beverage {
  cost(): number;
  description(): string;
}

class Espresso implements Beverage {
  cost(): number { return 2.0; }
  description(): string { return "Espresso"; }
}

abstract class BeverageDecorator implements Beverage {
  protected wrapped: Beverage;
  constructor(wrapped: Beverage) {
    this.wrapped = wrapped;
  }
  abstract cost(): number;
  abstract description(): string;
}

class MilkDecorator extends BeverageDecorator {
  cost(): number { return this.wrapped.cost() + 0.5; }
  description(): string { return this.wrapped.description() + " + Milk"; }
}

class SyrupDecorator extends BeverageDecorator {
  cost(): number { return this.wrapped.cost() + 0.3; }
  description(): string { return this.wrapped.description() + " + Syrup"; }
}

function decoratorDemo(): [string, number] {
  const beverage: Beverage = new SyrupDecorator(new MilkDecorator(new Espresso()));
  return [beverage.description(), beverage.cost()];
}
```

```cpp
#include <memory>
#include <string>

class Beverage {
public:
    virtual ~Beverage() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};

class Espresso : public Beverage {
public:
    double cost() const override { return 2.0; }
    std::string description() const override { return "Espresso"; }
};

class BeverageDecorator : public Beverage {
public:
    explicit BeverageDecorator(std::shared_ptr<Beverage> wrapped) : wrapped_(std::move(wrapped)) {}
protected:
    std::shared_ptr<Beverage> wrapped_;
};

class MilkDecorator : public BeverageDecorator {
public:
    using BeverageDecorator::BeverageDecorator;
    double cost() const override { return wrapped_->cost() + 0.5; }
    std::string description() const override { return wrapped_->description() + " + Milk"; }
};

class SyrupDecorator : public BeverageDecorator {
public:
    using BeverageDecorator::BeverageDecorator;
    double cost() const override { return wrapped_->cost() + 0.3; }
    std::string description() const override { return wrapped_->description() + " + Syrup"; }
};

std::pair<std::string, double> decoratorDemo() {
    std::shared_ptr<Beverage> beverage =
        std::make_shared<SyrupDecorator>(std::make_shared<MilkDecorator>(std::make_shared<Espresso>()));
    return { beverage->description(), beverage->cost() };
}
```

```rust
trait Beverage {
    fn cost(&self) -> f64;
    fn description(&self) -> String;
}

struct Espresso;
impl Beverage for Espresso {
    fn cost(&self) -> f64 { 2.0 }
    fn description(&self) -> String { "Espresso".to_string() }
}

struct MilkDecorator {
    wrapped: Box<dyn Beverage>,
}
impl Beverage for MilkDecorator {
    fn cost(&self) -> f64 { self.wrapped.cost() + 0.5 }
    fn description(&self) -> String { format!("{} + Milk", self.wrapped.description()) }
}

struct SyrupDecorator {
    wrapped: Box<dyn Beverage>,
}
impl Beverage for SyrupDecorator {
    fn cost(&self) -> f64 { self.wrapped.cost() + 0.3 }
    fn description(&self) -> String { format!("{} + Syrup", self.wrapped.description()) }
}

fn decorator_demo() -> (String, f64) {
    let beverage: Box<dyn Beverage> = Box::new(SyrupDecorator {
        wrapped: Box::new(MilkDecorator { wrapped: Box::new(Espresso) }),
    });
    (beverage.description(), beverage.cost())
}
```

```csharp
interface IBeverage
{
    double Cost();
    string Description();
}

class Espresso : IBeverage
{
    public double Cost() => 2.0;
    public string Description() => "Espresso";
}

abstract class BeverageDecorator : IBeverage
{
    protected IBeverage Wrapped;
    protected BeverageDecorator(IBeverage wrapped) { Wrapped = wrapped; }
    public abstract double Cost();
    public abstract string Description();
}

class MilkDecorator : BeverageDecorator
{
    public MilkDecorator(IBeverage wrapped) : base(wrapped) { }
    public override double Cost() => Wrapped.Cost() + 0.5;
    public override string Description() => Wrapped.Description() + " + Milk";
}

class SyrupDecorator : BeverageDecorator
{
    public SyrupDecorator(IBeverage wrapped) : base(wrapped) { }
    public override double Cost() => Wrapped.Cost() + 0.3;
    public override string Description() => Wrapped.Description() + " + Syrup";
}

static class DecoratorPatternDemo
{
    public static (string, double) Demo()
    {
        IBeverage beverage = new SyrupDecorator(new MilkDecorator(new Espresso()));
        return (beverage.Description(), beverage.Cost());
    }
}
```
