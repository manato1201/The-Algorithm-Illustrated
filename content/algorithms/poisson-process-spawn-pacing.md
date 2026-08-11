---
name: ポアソン過程による敵出現ペース制御
category: キャラクターAI・空間AI
subcategory: メタAI・ペーシング制御
complexity: O(1)(1回の出現間隔計算あたり)
summary: 敵の出現を「単位時間あたり平均λ回起きるランダムな事象の連鎖」としてモデル化し、指数分布に従う出現間隔を生成することで、規則的すぎず退屈にもならない自然な出現リズムを作る。
---

## 概要

敵の出現間隔を単純な固定タイマー(「5秒ごとに1体出現」)で制御すると、プレイヤーはすぐにパターンを学習してしまい、緊張感が失われる。ポアソン過程は、「単位時間あたり平均`λ`回起きる、互いに独立なランダムな事象の連鎖」を数学的に記述するモデルで、放射性崩壊や電話の着信のような自然界・工学の現象を説明するのに広く使われてきた。この考え方をゲームの敵出現に応用すると、**平均的な出現頻度は`λ`に保ちながら、個々の出現間隔は指数分布に従ってランダムに変動する**という、規則的でも完全にランダムすぎるわけでもない、自然な「揺らぎ」を持つ出現パターンが作れる。[AIディレクター](/algorithms/ai-director-pacing)のような上位のペーシング制御システムの中で、実際の出現タイミングを生成する下位の仕組みとしてよく使われる。

## 仕組み

1. 単位時間あたりの平均出現率`λ`(1分間に平均何体出現させたいか)を設定する。この値は[AIディレクター](/algorithms/ai-director-pacing)や[動的難易度調整](/algorithms/dynamic-difficulty-adjustment)から動的に渡されることが多い
2. ポアソン過程の性質として、**連続する事象の間隔(待ち時間)は指数分布に従う**ことが数学的に導ける。指数分布の累積分布関数の逆関数を使い、`[0,1)`の一様乱数`u`から、次の出現までの待ち時間を`t = -ln(1 - u) / λ`として生成する(逆関数サンプリング法)
3. 生成した待ち時間`t`が経過したら敵を1体出現させ、その時点から次の待ち時間を再び2の手順で生成する
4. `λ`を時間とともに変化させたい場合(緊張が高まる局面で出現頻度を上げるなど)は、非同次ポアソン過程(λが時間の関数`λ(t)`になる拡張)として扱い、区間ごとに異なる`λ`で待ち時間を生成する

## 特性・トレードオフ

- **統計的に自然な「揺らぎ」**: 固定間隔のスポーンは規則性が目立ちやすいが、指数分布に従う間隔は「たまに立て続けに来る」「たまに間隔が空く」という不規則さを含みながらも、長期的な平均出現率は`λ`にきちんと収束する。この統計的な性質が、プレイヤーにとって「予測しづらいが理不尽ではない」出現パターンとして感じられる
- **無記憶性という数学的な性質**: 指数分布は「今まで何秒待ったかに関わらず、次に何かが起きるまでの残り時間の分布は常に同じ」という無記憶性を持つ。この性質により、ゲームの状況に応じて`λ`を動的に変えても、それまでの待機時間との整合性を気にせず自然に切り替えられる
- **極端な偏りへの対策**: 純粋なポアソン過程は理論上「非常に短い間隔で連続して出現する」ことも起こりうる。ゲームデザイン上望ましくない極端な偏りを避けるため、実務では最小出現間隔のクランプや、直近の出現からの経過時間に応じた補正を加えることも多い
- **使いどころ**: シューティングゲーム・タワーディフェンスの敵出現タイミング制御、ローグライクのランダムイベント発生、[AIディレクター](/algorithms/ai-director-pacing)が決めた緊張度に応じた敵出現頻度の実装、災害・故障のようなランダムイベントを扱うシミュレーションゲーム

## 実装例

```python
import math
import random

def next_spawn_interval(lambda_rate: float) -> float:
    """lambda_rate: 単位時間あたりの平均出現率。戻り値は次の出現までの待ち時間。"""
    u = random.random()
    return -math.log(1.0 - u) / lambda_rate

class PoissonSpawner:
    def __init__(self, lambda_rate: float):
        self.lambda_rate = lambda_rate
        self.time_until_next = next_spawn_interval(lambda_rate)

    def update(self, dt: float) -> bool:
        """毎フレーム呼び出す。出現すべきタイミングが来ればTrueを返す。"""
        self.time_until_next -= dt
        if self.time_until_next <= 0:
            self.time_until_next = next_spawn_interval(self.lambda_rate)
            return True
        return False
```

```typescript
function nextSpawnInterval(lambdaRate: number, rand: () => number = Math.random): number {
  const u = rand();
  return -Math.log(1.0 - u) / lambdaRate;
}

class PoissonSpawner {
  private timeUntilNext: number;
  constructor(private lambdaRate: number) {
    this.timeUntilNext = nextSpawnInterval(lambdaRate);
  }

  update(dt: number): boolean {
    this.timeUntilNext -= dt;
    if (this.timeUntilNext <= 0) {
      this.timeUntilNext = nextSpawnInterval(this.lambdaRate);
      return true;
    }
    return false;
  }
}
```

```cpp
#include <cmath>
#include <random>

double nextSpawnInterval(double lambdaRate, std::mt19937& rng) {
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    double u = dist(rng);
    return -std::log(1.0 - u) / lambdaRate;
}

class PoissonSpawner {
    double lambdaRate;
    double timeUntilNext;
    std::mt19937 rng{std::random_device{}()};

public:
    explicit PoissonSpawner(double lambdaRate_) : lambdaRate(lambdaRate_) {
        timeUntilNext = nextSpawnInterval(lambdaRate, rng);
    }

    bool update(double dt) {
        timeUntilNext -= dt;
        if (timeUntilNext <= 0) {
            timeUntilNext = nextSpawnInterval(lambdaRate, rng);
            return true;
        }
        return false;
    }
};
```

```rust
use rand::Rng;

fn next_spawn_interval(lambda_rate: f64, rng: &mut impl Rng) -> f64 {
    let u: f64 = rng.gen();
    -(1.0 - u).ln() / lambda_rate
}

struct PoissonSpawner {
    lambda_rate: f64,
    time_until_next: f64,
}

impl PoissonSpawner {
    fn new(lambda_rate: f64, rng: &mut impl Rng) -> Self {
        let time_until_next = next_spawn_interval(lambda_rate, rng);
        PoissonSpawner { lambda_rate, time_until_next }
    }

    fn update(&mut self, dt: f64, rng: &mut impl Rng) -> bool {
        self.time_until_next -= dt;
        if self.time_until_next <= 0.0 {
            self.time_until_next = next_spawn_interval(self.lambda_rate, rng);
            true
        } else {
            false
        }
    }
}
```

```csharp
static double NextSpawnInterval(double lambdaRate, Random rand)
{
    double u = rand.NextDouble();
    return -Math.Log(1.0 - u) / lambdaRate;
}

class PoissonSpawner
{
    double lambdaRate;
    double timeUntilNext;
    Random rand = new();

    public PoissonSpawner(double lambdaRate)
    {
        this.lambdaRate = lambdaRate;
        timeUntilNext = NextSpawnInterval(lambdaRate, rand);
    }

    public bool Update(double dt)
    {
        timeUntilNext -= dt;
        if (timeUntilNext <= 0)
        {
            timeUntilNext = NextSpawnInterval(lambdaRate, rand);
            return true;
        }
        return false;
    }
}
```
