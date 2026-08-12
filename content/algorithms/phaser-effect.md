---
name: フェイザーエフェクト(Phaser)
category: 音響・信号処理
subcategory: 音響効果・DSP
complexity: O(n)(nは処理サンプル数、オールパス段数は定数)
summary: オールパスフィルタを複数縦列に並べて周波数ごとに異なる位相ずれを作り出し、ドライ信号と混ぜて生じるノッチ(打ち消し)を低周波オシレータで掃引する空間的なゆらぎエフェクト。
---

## 概要

フェイザーは、シュワッシュワッと音が揺れ動く独特の質感を持つエフェクトで、1970年代のギターエフェクターやシンセサイザーの定番として広く使われてきた。原理は「同じ信号のコピーを1つだけ位相をずらして元の信号に混ぜると、特定の周波数で山と谷が打ち消し合うノッチ(谷)が生まれる」という単純な物理現象に基づく。フェイザーはこの位相ずれを**オールパスフィルタ**の縦列接続で作り出し、フィルタの特性を低周波オシレータ(LFO)でゆっくり変化させることで、ノッチの位置が周波数軸上をスイープする効果を得る。名前が似ている[コーラス/フランジャーエフェクト](/algorithms/chorus-flanger-effect)とは音の作り方の原理が根本的に異なる点が重要である。

## 仕組み

1. 信号の位相だけをずらし振幅(周波数特性の大きさ)は変えない**1次オールパスフィルタ**を用意する。伝達関数は
   `H(z) = (-a + z^-1) / (1 - a・z^-1)`
   という形を取り、係数`a`(-1〜1の範囲)によって位相がどの周波数でどれだけずれるかが決まる。この`a`はオールパスの中心周波数(位相が90度ずれる周波数)に対応し、`a`を変化させることで位相特性を周波数軸上で移動できる
2. このオールパスフィルタを複数段(典型的には4〜12段)**縦列(直列)に接続**する。各段を通過するたびに、ある周波数帯域を中心として信号の位相が徐々にずれていく
3. 縦列オールパスを通した後の信号(ウェット)を、元の信号(ドライ)と合成する: `y[n] = x[n] + wet_gain・allpass_chain(x)[n]`。オールパス縦列を通った成分とドライ信号との間で、位相が180度反転している周波数では2つの信号が打ち消し合い、**ノッチ(振幅が大きく落ち込む周波数)**が生まれる。オールパスの段数だけノッチが生じる
4. 各オールパス段の係数`a`を、**低周波オシレータ(LFO、典型的には0.1〜2Hz程度の三角波やサイン波)** でゆっくり周期的に変化させる。これによりノッチの周波数位置が時間とともに周波数軸上を掃引し、「シュワシュワ」としたうねりが生まれる
5. ウェット信号の一部をフィルタ入力側へフィードバックする(レゾナンス)構成も一般的で、ノッチをより深く鋭くし、効果を強調できる

## 特性・トレードオフ

- **[コーラス/フランジャーエフェクト](/algorithms/chorus-flanger-effect)との違い**: フランジャー・コーラスは可変長の**遅延線**を使い、遅延時間の周期変化によってコムフィルタ状の等間隔なノッチ・ピークを生む(ノッチの周波数は基本的に整数倍の関係で等間隔に並ぶ)。一方フェイザーはオールパスフィルタの縦列によって位相をずらすため、ノッチの間隔は等間隔ではなく、オールパスの段数と係数の設定によって不均一に分布する。この違いにより、フランジャーは金属的で規則的な響き、フェイザーはより滑らかで有機的な「揺れ」の質感になりやすい
- **段数がノッチの数と音色を決める**: オールパスの段数が多いほどノッチの数が増え、より複雑で密な周波数特性の変化になる。4段フェイザーは比較的シンプルな効果、12段以上の多段フェイザーはより濃密でうねりの強い効果になる
- **振幅特性を変えない性質**: オールパスフィルタは単体では振幅特性を変えず位相だけを操作するため、ドライ信号と混ぜて初めて振幅の変化(ノッチ)として聞こえる。ドライとウェットの混合比(ミックス量)がエフェクトの深さを直接左右する
- **使いどころ**: エレキギター・シンセサイザーのフェイザーペダル/エフェクト、ミックスに動きを加えるための空間的モジュレーション、レスリースピーカーのシミュレーションの構成要素の1つ

## 実装例

```python
import math

class AllpassStage:
    def __init__(self) -> None:
        self.x_prev = 0.0
        self.y_prev = 0.0

    def process(self, x: float, a: float) -> float:
        y = -a * x + self.x_prev + a * self.y_prev
        self.x_prev = x
        self.y_prev = y
        return y

class Phaser:
    def __init__(self, sample_rate: int, n_stages: int = 6, rate_hz: float = 0.5,
                 depth: float = 0.8, wet_mix: float = 0.5) -> None:
        self.sample_rate = sample_rate
        self.stages = [AllpassStage() for _ in range(n_stages)]
        self.rate_hz = rate_hz
        self.depth = depth
        self.wet_mix = wet_mix
        self.phase = 0.0

    def process(self, x: list[float]) -> list[float]:
        out = []
        phase_inc = 2 * math.pi * self.rate_hz / self.sample_rate
        for xn in x:
            lfo = (math.sin(self.phase) + 1.0) / 2.0
            a = self.depth * (0.1 + 0.8 * lfo)

            signal = xn
            for stage in self.stages:
                signal = stage.process(signal, a)

            out.append(xn + self.wet_mix * signal)
            self.phase += phase_inc
            if self.phase > 2 * math.pi:
                self.phase -= 2 * math.pi
        return out
```

```typescript
class AllpassStage {
  private xPrev = 0;
  private yPrev = 0;

  process(x: number, a: number): number {
    const y = -a * x + this.xPrev + a * this.yPrev;
    this.xPrev = x;
    this.yPrev = y;
    return y;
  }
}

class Phaser {
  private stages: AllpassStage[];
  private phase = 0;

  constructor(
    private sampleRate: number,
    nStages = 6,
    private rateHz = 0.5,
    private depth = 0.8,
    private wetMix = 0.5,
  ) {
    this.stages = Array.from({ length: nStages }, () => new AllpassStage());
  }

  process(x: Float64Array): Float64Array {
    const out = new Float64Array(x.length);
    const phaseInc = (2 * Math.PI * this.rateHz) / this.sampleRate;

    for (let n = 0; n < x.length; n++) {
      const lfo = (Math.sin(this.phase) + 1) / 2;
      const a = this.depth * (0.1 + 0.8 * lfo);

      let signal = x[n];
      for (const stage of this.stages) signal = stage.process(signal, a);

      out[n] = x[n] + this.wetMix * signal;
      this.phase += phaseInc;
      if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
    }
    return out;
  }
}
```
