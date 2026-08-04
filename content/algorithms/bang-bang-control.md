---
name: バンバン制御(Bang-Bang制御)
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(1)(1制御周期あたり)
summary: アクチュエータを「全開」か「全閉」かの2値だけで切り替える、最も単純でありながら時間最適制御の理論において重要な位置を占める制御方式。
---

## 概要

[PID制御](/algorithms/pid-control)は誤差の大きさに応じて連続的に制御量を調整するが、家庭用のサーモスタットのように、そもそもアクチュエータ自体が「オン」か「オフ」かの2値でしか動作しない(あるいは連続的な調整が構造的にできない、またはコスト的に見合わない)制御対象も多い。バンバン制御は、目標値との誤差の符号だけを見て、アクチュエータを最大出力(全開)か最小出力(全閉、または逆方向に全開)かの2値で切り替える、極めて単純な制御方式である。単純さの一方で、「与えられた制約のもとで目標状態に最速で到達する」という時間最適制御の理論においては、多くの問題でバンバン制御が理論的な最適解になることが知られている。

## 仕組み

1. 現在の状態と目標状態の誤差`e(t)`を計算する
2. 誤差が正(現在値が目標値より低い)なら、アクチュエータを最大出力(オン)にする
3. 誤差が負(現在値が目標値より高い)なら、アクチュエータを最小出力(オフ、または逆方向)にする
4. この単純な切り替えを繰り返すと、システムは目標値の周辺を行ったり来たり振動しながら、平均的には目標値付近に留まる(サーモスタットが設定温度の上下でオン・オフを繰り返しながら、平均的にその温度を維持するのと同じ挙動)
5. 実用上は、誤差がゼロ付近で頻繁にオン・オフを切り替えすぎる(チャタリング)のを防ぐため、切り替えに一定の幅(ヒステリシス、例えば「目標温度+1度でオフ、目標温度-1度でオン」)を持たせることが多い

## 特性・トレードオフ

- **計算量**: 誤差の符号を判定するだけなので`O(1)`。極めて低コストなハードウェア(単純なスイッチ回路)でも実装できる
- **時間最適制御としての理論的重要性**: ポントリャーギンの最大原理という最適制御理論の結果により、加速度や出力に上限のある多くのシステムにおいて、「目標状態に最速で到達する」制御は、実はバンバン制御(制約の上限・下限を切り替えるだけの制御)になることが証明されている——単純な制御方式であるにもかかわらず、理論上は最速性という強い最適性を持つという興味深い性質がある
- **振動(チャタリング)という実用上の課題**: 目標値付近での頻繁な切り替えは、アクチュエータの摩耗を早めたり、エネルギー効率を悪化させたりする。ヒステリシス幅の導入はこの問題を緩和するが、その分だけ目標値からのズレの許容範囲が広がるというトレードオフを伴う
- **[PID制御](/algorithms/pid-control)との使い分け**: 連続的な出力調整が可能で滑らかな制御が求められる場面ではPID制御、オン・オフしかできないアクチュエータや、逆に「できるだけ速く到達したい」時間最適性が求められる場面(ロケットの姿勢制御、一部のロボットの動作計画)ではバンバン制御が選ばれる
- **使いどころ**: 家庭用サーモスタット・冷蔵庫の温度制御、単純なオン・オフ弁を使う流量制御、ロケットや人工衛星の姿勢制御における時間最適な軌道計画の理論的基盤

## 実装例

```python
def simulate_bang_bang(
    target: float,
    hysteresis: float,
    dt: float,
    steps: int,
    k: float = 0.05,
    heater_power: float = 5.0,
    env_temp: float = 15.0,
    start_temp: float = 15.0,
) -> list[float]:
    temp = start_temp
    heater_on = False
    history = [temp]
    for _ in range(steps):
        error = target - temp
        if error > hysteresis:
            heater_on = True
        elif error < -hysteresis:
            heater_on = False
        # ヒステリシス帯の中では現在の状態を維持する

        power = heater_power if heater_on else 0.0
        dtemp = (-k * (temp - env_temp) + power) * dt
        temp += dtemp
        history.append(temp)
    return history
```

```typescript
function simulateBangBang(
  target: number,
  hysteresis: number,
  dt: number,
  steps: number,
  k: number,
  heaterPower: number,
  envTemp: number,
  startTemp: number
): number[] {
  let temp = startTemp;
  let heaterOn = false;
  const history = [temp];
  for (let i = 0; i < steps; i++) {
    const error = target - temp;
    if (error > hysteresis) heaterOn = true;
    else if (error < -hysteresis) heaterOn = false;
    // ヒステリシス帯の中では現在の状態を維持する

    const power = heaterOn ? heaterPower : 0.0;
    temp += (-k * (temp - envTemp) + power) * dt;
    history.push(temp);
  }
  return history;
}
```

```cpp
#include <vector>

std::vector<double> simulateBangBang(double target, double hysteresis, double dt, int steps,
                                      double k, double heaterPower, double envTemp, double startTemp) {
    double temp = startTemp;
    bool heaterOn = false;
    std::vector<double> history = {temp};
    for (int i = 0; i < steps; i++) {
        double error = target - temp;
        if (error > hysteresis) {
            heaterOn = true;
        } else if (error < -hysteresis) {
            heaterOn = false;
        }
        // ヒステリシス帯の中では現在の状態を維持する

        double power = heaterOn ? heaterPower : 0.0;
        temp += (-k * (temp - envTemp) + power) * dt;
        history.push_back(temp);
    }
    return history;
}
```

```rust
fn simulate_bang_bang(
    target: f64,
    hysteresis: f64,
    dt: f64,
    steps: u32,
    k: f64,
    heater_power: f64,
    env_temp: f64,
    start_temp: f64,
) -> Vec<f64> {
    let mut temp = start_temp;
    let mut heater_on = false;
    let mut history = vec![temp];
    for _ in 0..steps {
        let error = target - temp;
        if error > hysteresis {
            heater_on = true;
        } else if error < -hysteresis {
            heater_on = false;
        }
        // ヒステリシス帯の中では現在の状態を維持する

        let power = if heater_on { heater_power } else { 0.0 };
        temp += (-k * (temp - env_temp) + power) * dt;
        history.push(temp);
    }
    history
}
```

```csharp
static class BangBangControl
{
    public static List<double> Simulate(double target, double hysteresis, double dt, int steps,
        double k, double heaterPower, double envTemp, double startTemp)
    {
        double temp = startTemp;
        bool heaterOn = false;
        var history = new List<double> { temp };
        for (int i = 0; i < steps; i++)
        {
            double error = target - temp;
            if (error > hysteresis) heaterOn = true;
            else if (error < -hysteresis) heaterOn = false;
            // ヒステリシス帯の中では現在の状態を維持する

            double power = heaterOn ? heaterPower : 0.0;
            temp += (-k * (temp - envTemp) + power) * dt;
            history.Add(temp);
        }
        return history;
    }
}
```
