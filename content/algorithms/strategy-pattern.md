---
name: Strategy(ストラテジー)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: アルゴリズムをインターフェースの背後に隠し、実行時に差し替え可能にする。本サイトのソート切り替えもこの発想に近い。
---
## 概要

同じ目的を達成する複数のアルゴリズム(戦略)を、それぞれ独立したクラスとして共通インターフェースの背後にカプセル化し、**呼び出し側が実行時にどれを使うかを自由に差し替えられる**ようにするふるまいパターン。「割引計算」「経路探索」「圧縮方式」のように、同じ入出力の型を持ちながら中身のロジックが複数あり得る処理に対して、if/switch文で分岐する代わりに、アルゴリズムそのものをオブジェクトとして注入する。本サイトでソートアルゴリズムを切り替えて可視化しているのも、まさにこの「同じインターフェース(配列を並べ替える)の裏に複数の実装を差し替え可能に持つ」という発想そのものである。

## 仕組み

1. 複数の戦略が共通して実装するインターフェース(`SortStrategy`に`sort(array)`など)を定義する
2. 各アルゴリズムをそれぞれ独立した具体クラス(`BubbleSortStrategy`、`QuickSortStrategy`)として実装する。各クラスは自分のアルゴリズムのロジックだけに専念し、他の戦略について何も知らない
3. 処理を呼び出す側のコンテキストクラスは、現在使用する戦略オブジェクトへの参照を1つ保持し、実際の処理を常にその戦略オブジェクトに委譲する
4. どの戦略を使うかは、コンストラクタ引数やセッターメソッドで外部から注入する(依存性注入)。実行時に異なる戦略オブジェクトに差し替えることで、コンテキスト側のコードを一切変更せずに振る舞いを切り替えられる

## 特性・トレードオフ

- **アルゴリズムの切り替えを実行時に自由に行える**: 条件分岐でアルゴリズムを選ぶコードに比べ、新しい戦略を追加する際に既存のコンテキストクラスや他の戦略クラスに触れる必要がない(オープン・クローズド原則)
- **各アルゴリズムが独立してテスト・理解できる**: 巨大なif/switch文に埋め込まれたロジックと違い、各戦略クラスは単体でテスト可能な独立した単位になる
- **クラス数が増える**: 戦略の数だけクラスが必要になるため、選択肢が2〜3個程度で将来増える見込みも薄いなら、単純な条件分岐や関数の受け渡しの方がシンプルなことも多い(現代の言語では戦略をクラスではなく単なる関数・クロージャとして注入することも一般的)
- **State パターンとの違い**: 構造はStateとほぼ同じだが、Strategyでは呼び出し側が明示的に戦略を選択・注入するのに対し、Stateでは状態オブジェクト自身が内部で次の状態への遷移を管理する点が異なる
- **使いどころ**: ソート・圧縮・経路探索など複数実装があり得るアルゴリズムの切り替え、支払い方法(クレジットカード・銀行振込・電子マネー)の切り替え、バリデーションルールの差し替え、A/Bテストにおけるロジックの切り替えなど

## 実装例

バブルソートとクイックソートを`SortStrategy`として実装し、コンテキストに差し替えて渡しても同じ結果(組み込みソートの結果)になることを検証する。

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class SortStrategy(ABC):
    @abstractmethod
    def sort(self, data: list[int]) -> list[int]: ...


class BubbleSortStrategy(SortStrategy):
    def sort(self, data: list[int]) -> list[int]:
        result = data.copy()
        n = len(result)
        for i in range(n - 1):
            for j in range(n - 1 - i):
                if result[j] > result[j + 1]:
                    result[j], result[j + 1] = result[j + 1], result[j]
        return result


class QuickSortStrategy(SortStrategy):
    def sort(self, data: list[int]) -> list[int]:
        if len(data) <= 1:
            return data.copy()
        pivot = data[len(data) // 2]
        left = [x for x in data if x < pivot]
        mid = [x for x in data if x == pivot]
        right = [x for x in data if x > pivot]
        return self.sort(left) + mid + self.sort(right)


class SortContext:
    def __init__(self, strategy: SortStrategy) -> None:
        self.strategy = strategy

    def set_strategy(self, strategy: SortStrategy) -> None:
        self.strategy = strategy

    def execute_sort(self, data: list[int]) -> list[int]:
        return self.strategy.sort(data)


def demo() -> bool:
    data = [5, 3, 8, 1, 9, 2]
    context = SortContext(BubbleSortStrategy())
    result_a = context.execute_sort(data)
    context.set_strategy(QuickSortStrategy())
    result_b = context.execute_sort(data)
    return result_a == result_b == sorted(data)
```

```typescript
interface SortStrategy {
  sort(data: number[]): number[];
}

class BubbleSortStrategy implements SortStrategy {
  sort(data: number[]): number[] {
    const result = [...data];
    const n = result.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        if (result[j] > result[j + 1]) {
          [result[j], result[j + 1]] = [result[j + 1], result[j]];
        }
      }
    }
    return result;
  }
}

class QuickSortStrategy implements SortStrategy {
  sort(data: number[]): number[] {
    if (data.length <= 1) return [...data];
    const pivot = data[Math.floor(data.length / 2)];
    const left = data.filter((x) => x < pivot);
    const mid = data.filter((x) => x === pivot);
    const right = data.filter((x) => x > pivot);
    return [...this.sort(left), ...mid, ...this.sort(right)];
  }
}

class SortContext {
  private strategy: SortStrategy;

  constructor(strategy: SortStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: SortStrategy): void {
    this.strategy = strategy;
  }

  executeSort(data: number[]): number[] {
    return this.strategy.sort(data);
  }
}

function demo(): boolean {
  const data = [5, 3, 8, 1, 9, 2];
  const context = new SortContext(new BubbleSortStrategy());
  const resultA = context.executeSort(data);
  context.setStrategy(new QuickSortStrategy());
  const resultB = context.executeSort(data);
  const expected = [...data].sort((a, b) => a - b);
  return (
    JSON.stringify(resultA) === JSON.stringify(expected) &&
    JSON.stringify(resultB) === JSON.stringify(expected)
  );
}
```

```cpp
#include <vector>
#include <memory>
#include <algorithm>

class SortStrategy {
public:
    virtual ~SortStrategy() = default;
    virtual std::vector<int> sort(const std::vector<int>& data) = 0;
};

class BubbleSortStrategy : public SortStrategy {
public:
    std::vector<int> sort(const std::vector<int>& data) override {
        std::vector<int> result = data;
        int n = static_cast<int>(result.size());
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (result[j] > result[j + 1]) {
                    std::swap(result[j], result[j + 1]);
                }
            }
        }
        return result;
    }
};

class QuickSortStrategy : public SortStrategy {
public:
    std::vector<int> sort(const std::vector<int>& data) override {
        if (data.size() <= 1) return data;
        int pivot = data[data.size() / 2];
        std::vector<int> left, mid, right;
        for (int x : data) {
            if (x < pivot) left.push_back(x);
            else if (x == pivot) mid.push_back(x);
            else right.push_back(x);
        }
        auto sortedLeft = sort(left);
        auto sortedRight = sort(right);
        std::vector<int> result;
        result.insert(result.end(), sortedLeft.begin(), sortedLeft.end());
        result.insert(result.end(), mid.begin(), mid.end());
        result.insert(result.end(), sortedRight.begin(), sortedRight.end());
        return result;
    }
};

class SortContext {
public:
    explicit SortContext(std::unique_ptr<SortStrategy> strategy) : strategy(std::move(strategy)) {}
    void setStrategy(std::unique_ptr<SortStrategy> newStrategy) { strategy = std::move(newStrategy); }
    std::vector<int> executeSort(const std::vector<int>& data) { return strategy->sort(data); }

private:
    std::unique_ptr<SortStrategy> strategy;
};
```

```rust
trait SortStrategy {
    fn sort(&self, data: &[i32]) -> Vec<i32>;
}

struct BubbleSortStrategy;
struct QuickSortStrategy;

impl SortStrategy for BubbleSortStrategy {
    fn sort(&self, data: &[i32]) -> Vec<i32> {
        let mut result = data.to_vec();
        let n = result.len();
        for i in 0..n.saturating_sub(1) {
            for j in 0..n - 1 - i {
                if result[j] > result[j + 1] {
                    result.swap(j, j + 1);
                }
            }
        }
        result
    }
}

impl SortStrategy for QuickSortStrategy {
    fn sort(&self, data: &[i32]) -> Vec<i32> {
        if data.len() <= 1 {
            return data.to_vec();
        }
        let pivot = data[data.len() / 2];
        let left: Vec<i32> = data.iter().copied().filter(|&x| x < pivot).collect();
        let mid: Vec<i32> = data.iter().copied().filter(|&x| x == pivot).collect();
        let right: Vec<i32> = data.iter().copied().filter(|&x| x > pivot).collect();
        let mut result = self.sort(&left);
        result.extend(mid);
        result.extend(self.sort(&right));
        result
    }
}

struct SortContext {
    strategy: Box<dyn SortStrategy>,
}

impl SortContext {
    fn new(strategy: Box<dyn SortStrategy>) -> Self {
        SortContext { strategy }
    }

    fn set_strategy(&mut self, strategy: Box<dyn SortStrategy>) {
        self.strategy = strategy;
    }

    fn execute_sort(&self, data: &[i32]) -> Vec<i32> {
        self.strategy.sort(data)
    }
}
```

```csharp
interface ISortStrategy
{
    int[] Sort(int[] data);
}

class BubbleSortStrategy : ISortStrategy
{
    public int[] Sort(int[] data)
    {
        var result = (int[])data.Clone();
        int n = result.Length;
        for (int i = 0; i < n - 1; i++)
        {
            for (int j = 0; j < n - 1 - i; j++)
            {
                if (result[j] > result[j + 1])
                {
                    (result[j], result[j + 1]) = (result[j + 1], result[j]);
                }
            }
        }
        return result;
    }
}

class QuickSortStrategy : ISortStrategy
{
    public int[] Sort(int[] data)
    {
        if (data.Length <= 1) return (int[])data.Clone();
        int pivot = data[data.Length / 2];
        var left = data.Where(x => x < pivot).ToArray();
        var mid = data.Where(x => x == pivot).ToArray();
        var right = data.Where(x => x > pivot).ToArray();
        return Sort(left).Concat(mid).Concat(Sort(right)).ToArray();
    }
}

class SortContext
{
    private ISortStrategy strategy;
    public SortContext(ISortStrategy strategy) { this.strategy = strategy; }
    public void SetStrategy(ISortStrategy strategy) { this.strategy = strategy; }
    public int[] ExecuteSort(int[] data) => strategy.Sort(data);
}
```
