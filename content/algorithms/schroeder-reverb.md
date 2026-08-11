---
name: シュレーダーリバーブ
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nは処理サンプル数、フィルタ段数は定数)
summary: コムフィルタとオールパスフィルタを組み合わせ、部屋の残響を少数の遅延線だけで人工的に再現する古典的なアルゴリズムリバーブ。
---

## 概要

コンサートホールのような空間で音が鳴ると、壁や天井での無数の反射が重なり合い、直接音のあとに「残響(リバーブ)」として長く尾を引く。この現象を物理シミュレーションではなく、少数のデジタルフィルタの組み合わせで**それらしく近似**する方法を1962年にマニフレッド・シュレーダーが考案した。実際の音場を波動方程式で解くのは計算コストが高すぎるため、「並列コムフィルタで密な反射音の集まりを作り、直列オールパスフィルタで音色を濁らせずに反射密度をさらに高める」という工学的な近似を使う。以後多くのデジタルリバーブの原型となった、DSPの古典中の古典である。

## 仕組み

1. **コムフィルタ(Comb Filter)** を複数(典型的には4本)並列に並べる。各コムフィルタは`y[n] = x[n] + g・y[n-D]`という形のフィードバック遅延線で、遅延`D`ごとに減衰しながら音を繰り返し、`D`の整数倍の周波数でピークを持つ櫛(コム)状の周波数特性を生む
2. 各コムフィルタの遅延長`D`を互いに素に近い値にばらけさせることで、ピーク位置をずらし、単独では不自然な「金属的な響き」を目立たなくする
3. 並列コムフィルタの出力を合計し、それを**オールパスフィルタ(All-pass Filter)** に直列に通す。オールパスフィルタは`y[n] = -g・x[n] + x[n-D] + g・y[n-D]`という構造で、**周波数特性(音色)を変えずに位相だけを散らし、反射の密度をさらに増やす**役割を持つ
4. オールパスフィルタを2〜3段直列にかけることで、コムフィルタ由来の周期的な響きを目立たなくしながら、時間とともに指数的に減衰する密な残響尾部(テール)を作り出す

## 特性・トレードオフ

- **計算コストの低さ**: 波動方程式ベースの物理シミュレーション(有限要素法など)と比べて桁違いに軽く、少数の遅延線と乗算だけでリアルタイム処理が可能。1960年代のアナログ〜初期デジタル環境でも実用になった理由
- **パラメータ選びが音質を左右する**: コムフィルタの遅延長が公約数を持つと反射のパターンが規則的になり「フラッタエコー」のような不自然な響きが出る。互いに素に近い値を選ぶノウハウが音質の鍵
- **物理的正確さより聴覚的な説得力**: 実際の部屋の反射をシミュレートしているわけではなく、「人間の耳に自然な残響として聞こえる統計的性質(反射密度が時間とともに指数減衰しつつ増加する)」を再現することに焦点を当てた近似
- **使いどころ**: ゲームエンジンの空間オーディオ、音楽制作用リバーブプラグインの基礎構造、より高精度なFDN(Feedback Delay Network)リバーブの前身。現在はコンボリューションリバーブ(実際のインパルス応答を畳み込む方式)も使われるが、計算コストの低さからアルゴリズムリバーブは今も現役

## 実装例

```python
def comb_filter(x: list[float], delay: int, gain: float) -> list[float]:
    y = [0.0] * len(x)
    for n in range(len(x)):
        feedback = y[n - delay] if n - delay >= 0 else 0.0
        y[n] = x[n] + gain * feedback
    return y

def allpass_filter(x: list[float], delay: int, gain: float) -> list[float]:
    y = [0.0] * len(x)
    for n in range(len(x)):
        x_delayed = x[n - delay] if n - delay >= 0 else 0.0
        y_delayed = y[n - delay] if n - delay >= 0 else 0.0
        y[n] = -gain * x[n] + x_delayed + gain * y_delayed
    return y

def schroeder_reverb(x: list[float]) -> list[float]:
    comb_params = [(1557, 0.805), (1617, 0.827), (1491, 0.783), (1422, 0.764)]
    mixed = [0.0] * len(x)
    for delay, gain in comb_params:
        branch = comb_filter(x, delay, gain)
        mixed = [m + b / len(comb_params) for m, b in zip(mixed, branch)]
    out = allpass_filter(mixed, 225, 0.7)
    out = allpass_filter(out, 556, 0.7)
    return out
```

```typescript
function combFilter(
  x: Float64Array,
  delay: number,
  gain: number,
): Float64Array {
  const y = new Float64Array(x.length);
  for (let n = 0; n < x.length; n++) {
    const feedback = n - delay >= 0 ? y[n - delay] : 0;
    y[n] = x[n] + gain * feedback;
  }
  return y;
}

function allpassFilter(
  x: Float64Array,
  delay: number,
  gain: number,
): Float64Array {
  const y = new Float64Array(x.length);
  for (let n = 0; n < x.length; n++) {
    const xDelayed = n - delay >= 0 ? x[n - delay] : 0;
    const yDelayed = n - delay >= 0 ? y[n - delay] : 0;
    y[n] = -gain * x[n] + xDelayed + gain * yDelayed;
  }
  return y;
}

function schroederReverb(x: Float64Array): Float64Array {
  const combParams: [number, number][] = [
    [1557, 0.805],
    [1617, 0.827],
    [1491, 0.783],
    [1422, 0.764],
  ];
  let mixed = new Float64Array(x.length);
  for (const [delay, gain] of combParams) {
    const branch = combFilter(x, delay, gain);
    for (let i = 0; i < mixed.length; i++)
      mixed[i] += branch[i] / combParams.length;
  }
  let out = allpassFilter(mixed, 225, 0.7);
  out = allpassFilter(out, 556, 0.7);
  return out;
}
```

```cpp
#include <vector>

std::vector<double> combFilter(const std::vector<double>& x, int delay, double gain) {
    std::vector<double> y(x.size(), 0.0);
    for (size_t n = 0; n < x.size(); n++) {
        double feedback = (static_cast<int>(n) - delay >= 0) ? y[n - delay] : 0.0;
        y[n] = x[n] + gain * feedback;
    }
    return y;
}

std::vector<double> allpassFilter(const std::vector<double>& x, int delay, double gain) {
    std::vector<double> y(x.size(), 0.0);
    for (size_t n = 0; n < x.size(); n++) {
        double xDelayed = (static_cast<int>(n) - delay >= 0) ? x[n - delay] : 0.0;
        double yDelayed = (static_cast<int>(n) - delay >= 0) ? y[n - delay] : 0.0;
        y[n] = -gain * x[n] + xDelayed + gain * yDelayed;
    }
    return y;
}

std::vector<double> schroederReverb(const std::vector<double>& x) {
    const std::vector<std::pair<int, double>> combParams = {
        {1557, 0.805}, {1617, 0.827}, {1491, 0.783}, {1422, 0.764}};
    std::vector<double> mixed(x.size(), 0.0);
    for (auto& [delay, gain] : combParams) {
        auto branch = combFilter(x, delay, gain);
        for (size_t i = 0; i < mixed.size(); i++) mixed[i] += branch[i] / combParams.size();
    }
    auto out = allpassFilter(mixed, 225, 0.7);
    out = allpassFilter(out, 556, 0.7);
    return out;
}
```

```rust
fn comb_filter(x: &[f64], delay: usize, gain: f64) -> Vec<f64> {
    let mut y = vec![0.0; x.len()];
    for n in 0..x.len() {
        let feedback = if n >= delay { y[n - delay] } else { 0.0 };
        y[n] = x[n] + gain * feedback;
    }
    y
}

fn allpass_filter(x: &[f64], delay: usize, gain: f64) -> Vec<f64> {
    let mut y = vec![0.0; x.len()];
    for n in 0..x.len() {
        let x_delayed = if n >= delay { x[n - delay] } else { 0.0 };
        let y_delayed = if n >= delay { y[n - delay] } else { 0.0 };
        y[n] = -gain * x[n] + x_delayed + gain * y_delayed;
    }
    y
}

fn schroeder_reverb(x: &[f64]) -> Vec<f64> {
    let comb_params = [(1557usize, 0.805), (1617, 0.827), (1491, 0.783), (1422, 0.764)];
    let mut mixed = vec![0.0; x.len()];
    for &(delay, gain) in &comb_params {
        let branch = comb_filter(x, delay, gain);
        for i in 0..mixed.len() {
            mixed[i] += branch[i] / comb_params.len() as f64;
        }
    }
    let out = allpass_filter(&mixed, 225, 0.7);
    allpass_filter(&out, 556, 0.7)
}
```

```csharp
static double[] CombFilter(double[] x, int delay, double gain)
{
    var y = new double[x.Length];
    for (int n = 0; n < x.Length; n++)
    {
        double feedback = n - delay >= 0 ? y[n - delay] : 0.0;
        y[n] = x[n] + gain * feedback;
    }
    return y;
}

static double[] AllpassFilter(double[] x, int delay, double gain)
{
    var y = new double[x.Length];
    for (int n = 0; n < x.Length; n++)
    {
        double xDelayed = n - delay >= 0 ? x[n - delay] : 0.0;
        double yDelayed = n - delay >= 0 ? y[n - delay] : 0.0;
        y[n] = -gain * x[n] + xDelayed + gain * yDelayed;
    }
    return y;
}

static double[] SchroederReverb(double[] x)
{
    var combParams = new (int delay, double gain)[] { (1557, 0.805), (1617, 0.827), (1491, 0.783), (1422, 0.764) };
    var mixed = new double[x.Length];
    foreach (var (delay, gain) in combParams)
    {
        var branch = CombFilter(x, delay, gain);
        for (int i = 0; i < mixed.Length; i++) mixed[i] += branch[i] / combParams.Length;
    }
    var out1 = AllpassFilter(mixed, 225, 0.7);
    return AllpassFilter(out1, 556, 0.7);
}
```
