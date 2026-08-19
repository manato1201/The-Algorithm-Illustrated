---
name: ノイズゲート(Noise Gate)
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nはサンプル数)
summary: 信号レベルがしきい値を下回ると出力を遮断・減衰し、上回ると通過させることでノイズフロアを除去するダイナミクス処理で、アタック・ホールド・リリース時間の設計が音の自然さを決める。
---

## 概要

マイクの環境ノイズ、ギターアンプのハムノイズ、配信環境のエアコン音——これらは信号が「鳴っていない」はずの静かな部分でも常に乗り続けているノイズフロアである。ノイズゲートは、信号レベルが設定した**しきい値(スレッショルド)を下回ったら出力を遮断(または大きく減衰)し、上回ったら通過させる**ことで、演奏や発話の合間に紛れ込むノイズを除去するダイナミクス処理である。[ダイナミックレンジコンプレッサー](/algorithms/dynamic-range-compression)がしきい値を**超えた**大きな音を圧縮するのに対し、ノイズゲートはしきい値を**下回った**小さな音(=ノイズ)を抑えるという、いわば逆方向の処理を行う。ゲートという名前の通り「音量が扉を開けるだけの大きさかどうか」で通過・遮断を切り替える単純な仕組みでありながら、アタック・ホールド・リリースという時間パラメータの設計次第で自然にも不自然にも聞こえるため、実務上はコンプレッサー以上に丁寧なチューニングが必要とされる。

## 仕組み

1. 入力信号のレベル(振幅の大きさ)を継続的に計測する。[ダイナミックレンジコンプレッサー](/algorithms/dynamic-range-compression)と同様、瞬時値の代わりに**エンベロープ検出**(レベル変化を滑らかに追従させる処理)を使うことが多い
2. 検出したレベルがしきい値`threshold`を上回っているかを判定し、ゲートの状態を管理する。単純な2値(開/閉)ではなく、実用的な実装では次の4状態を持つステートマシンとして扱う
   - **クローズド(Closed)**: レベルがしきい値未満。出力は遮断(ゲイン0、または大きく減衰したフロアレベル)
   - **アタック(Attack)**: レベルがしきい値を超えた直後。`attack`時間をかけてゲインを0から1へ素早く立ち上げる。ここが遅すぎると音の立ち上がり(トランジェント)が削れてしまう
   - **ホールド(Hold)**: しきい値を超えた状態が続く間、またはレベルが一時的にしきい値を割ってもすぐには閉じずに`hold`時間だけ開いたままにする。これがないと、音量が小刻みに揺れる信号でゲートが高速に開閉を繰り返す「チャタリング」が起きる
   - **リリース(Release)**: レベルがしきい値を下回り、ホールド時間も経過した後、`release`時間をかけてゲインを1から0へ徐々に絞る。ここを速くしすぎると音の余韻(サステイン・リバーブテール)が不自然に断ち切られる
3. 各時点でのゲート状態からゲイン値(0〜1)を計算し、入力信号に掛け合わせて出力する
4. 完全に無音にするのではなく、閉じた状態でもわずかにレベルを残す(例えば-60dB程度)**フロアレベル**を設定すると、ゲートの開閉が耳につきにくくなり、より自然な仕上がりになる

チャタリング防止のためのホールド時間の考え方は、しきい値付近で信号が細かく上下する状況(例えば減衰していくギターの余韻や、口を閉じる前の吐息混じりの声)でゲートが開閉を繰り返して音がブツブツ切れるのを防ぐための実務上重要な設計要素である。

## 特性・トレードオフ

- **コンプレッサーとの対称性と非対称性**: ノイズゲートは「しきい値未満を抑える」という点でコンプレッサー(しきい値超過を抑える)と対称的な設計思想を持つが、コンプレッサーが超過分を**比率的に**圧縮するのに対し、ノイズゲートは典型的には**通過/遮断**という2値に近い切り替えを行う点で異なる(比率で緩やかに減衰させる「エクスパンダー」はノイズゲートと圧縮の中間的な処理として位置づけられる)
- **アタック/ホールド/リリースの設計が音の自然さを左右する**: アタックが遅いと音の出だしが削れ、リリースが速いと余韻が唐突に切れ、ホールドが短いとチャタリングが起きる。特に打楽器のように立ち上がりが速い音源や、リバーブの長い余韻を持つ音源では、これらのパラメータの調整がゲートの効果を大きく左右する
- **しきい値の設定がノイズと信号の分離の鍵**: しきい値をノイズフロアより低く設定すると効果が出ず、演奏音そのものより高く設定すると本来聞こえるべき音まで削られてしまう。ノイズと信号の音量差(SN比)が小さい環境ほど、ノイズゲートだけでは綺麗に分離できない
- **サイドチェイン入力との組み合わせ**: レベル検出を出力対象の信号自体ではなく別の信号(サイドチェイン)で行うことで、例えばドラムのキック音をトリガーにベースを開閉させるといった、より高度なリズミックな効果(ゲーテッドエフェクト)にも応用される
- **使いどころ**: ライブ配信・ポッドキャストのマイク背景ノイズ除去、ドラムの他マイクからの音漏れ(かぶり)の抑制、ギターアンプのハムノイズ除去、80年代ロックで多用されたゲーテッドリバーブのような演出的な使い方

## 実装例

```python
import math
from enum import Enum, auto

class GateState(Enum):
    CLOSED = auto()
    ATTACK = auto()
    HOLD = auto()
    RELEASE = auto()

def noise_gate(
    x: list[float], sample_rate: int, threshold_db: float = -40.0,
    attack_ms: float = 2.0, hold_ms: float = 50.0, release_ms: float = 150.0,
    floor_db: float = -60.0,
) -> list[float]:
    attack_samples = max(1, int(attack_ms / 1000 * sample_rate))
    hold_samples = max(1, int(hold_ms / 1000 * sample_rate))
    release_samples = max(1, int(release_ms / 1000 * sample_rate))
    floor_gain = 10 ** (floor_db / 20)

    state = GateState.CLOSED
    gain = floor_gain
    counter = 0
    envelope = 0.0
    env_coef = math.exp(-1 / (0.001 * sample_rate))  # 数msの平滑化

    output = []
    for xn in x:
        envelope = env_coef * envelope + (1 - env_coef) * abs(xn)
        level_db = 20 * math.log10(max(envelope, 1e-9))
        above = level_db > threshold_db

        if state == GateState.CLOSED:
            if above:
                state, counter = GateState.ATTACK, 0
        elif state == GateState.ATTACK:
            counter += 1
            gain = floor_gain + (1 - floor_gain) * min(1.0, counter / attack_samples)
            if counter >= attack_samples:
                state, counter = GateState.HOLD, 0
        elif state == GateState.HOLD:
            gain = 1.0
            if above:
                counter = 0  # レベルが再度しきい値を超えたらホールドを継続
            else:
                counter += 1
                if counter >= hold_samples:
                    state, counter = GateState.RELEASE, 0
        elif state == GateState.RELEASE:
            counter += 1
            gain = 1.0 - (1.0 - floor_gain) * min(1.0, counter / release_samples)
            if above:
                state, counter = GateState.ATTACK, 0
            elif counter >= release_samples:
                state, gain = GateState.CLOSED, floor_gain

        output.append(xn * gain)
    return output
```

```typescript
type GateState = "closed" | "attack" | "hold" | "release";

function noiseGate(
  x: number[],
  sampleRate: number,
  thresholdDb = -40.0,
  attackMs = 2.0,
  holdMs = 50.0,
  releaseMs = 150.0,
  floorDb = -60.0,
): number[] {
  const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sampleRate));
  const holdSamples = Math.max(1, Math.floor((holdMs / 1000) * sampleRate));
  const releaseSamples = Math.max(
    1,
    Math.floor((releaseMs / 1000) * sampleRate),
  );
  const floorGain = 10 ** (floorDb / 20);

  let state: GateState = "closed";
  let gain = floorGain;
  let counter = 0;
  let envelope = 0;
  const envCoef = Math.exp(-1 / (0.001 * sampleRate)); // 数msの平滑化

  const output: number[] = [];
  for (const xn of x) {
    envelope = envCoef * envelope + (1 - envCoef) * Math.abs(xn);
    const levelDb = 20 * Math.log10(Math.max(envelope, 1e-9));
    const above = levelDb > thresholdDb;

    if (state === "closed") {
      if (above) {
        state = "attack";
        counter = 0;
      }
    } else if (state === "attack") {
      counter += 1;
      gain = floorGain + (1 - floorGain) * Math.min(1, counter / attackSamples);
      if (counter >= attackSamples) {
        state = "hold";
        counter = 0;
      }
    } else if (state === "hold") {
      gain = 1.0;
      if (above) {
        counter = 0; // レベルが再度しきい値を超えたらホールドを継続
      } else {
        counter += 1;
        if (counter >= holdSamples) {
          state = "release";
          counter = 0;
        }
      }
    } else if (state === "release") {
      counter += 1;
      gain = 1.0 - (1.0 - floorGain) * Math.min(1, counter / releaseSamples);
      if (above) {
        state = "attack";
        counter = 0;
      } else if (counter >= releaseSamples) {
        state = "closed";
        gain = floorGain;
      }
    }

    output.push(xn * gain);
  }
  return output;
}
```
