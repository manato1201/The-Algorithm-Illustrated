---
name: ウェーブテーブル音源合成(Wavetable Synthesis)
category: 音響・信号処理
subcategory: 音声合成・分析
complexity: O(n)(nは生成サンプル数、1サンプルあたりO(1)のテーブル参照と補間)
summary: 1周期分の波形を配列(テーブル)として保持し、再生ピッチに応じた速度でテーブルを補間しながら読み出すことで音を生成し、テーブル自体を時間変化させることで音色モーフィングも実現する音源方式。
---

## 概要

サイン波・のこぎり波・矩形波のような周期波形は、1周期分だけ計算してしまえば、それを繰り返し読み出すだけで任意の長さの音を作れる。ウェーブテーブル音源合成は、この1周期分の波形サンプル列を「テーブル」としてメモリに保持しておき、再生時には目的のピッチに応じた速度でテーブル内を読み進める(必要な位置が整数インデックスでなければ補間する)ことで音を生成する方式である。毎サンプル三角関数などを計算する必要がなく単純なテーブル参照で済むため計算コストが低く、さらに**テーブル自体を時間とともに切り替える(モーフィングさせる)**ことで、単なる固定波形の再生を超えて複雑に変化する音色を作り出せる。1970年代末にPPG WaveやWaldorf(その後継)などのシンセサイザーで実用化され、現代のソフトウェアシンセサイザーでも標準的な音源方式の一つである。

## 仕組み

1. **テーブルの用意**: 1周期分の波形を`N`点のサンプル配列として用意する。サイン波なら`table[k] = sin(2π・k/N)`のように解析的に生成することも、録音した楽器音の1周期を切り出すこともできる
2. **読み出し位相の管理**: テーブル内の現在の読み出し位置を表す**位相(phase)**を実数値(浮動小数点)で保持する。1サンプルごとに、目的の周波数`f`とテーブル長`N`、サンプリングレート`sr`から決まる**位相増分**`increment = f・N / sr`だけ位相を進める
3. **補間による読み出し**: 位相は非整数値になるのが通常なので、位相の整数部をインデックス`i0`、小数部を`frac`として、隣接する2点`table[i0]`と`table[i0+1]`を線形補間する: `sample = table[i0]・(1-frac) + table[i0+1]・frac`。より高品質にしたい場合は3次補間などを使う
4. 位相がテーブル長`N`を超えたら`N`を引いて0〜N未満に戻す(モジュロ演算によるループ)。これにより周波数`f`に同期した周期波形が連続的に得られる
5. **ウェーブテーブルモーフィング(音色変化)**: 複数のテーブル(例えば「明るい音色」から「こもった音色」まで並べたテーブル群)を用意し、エンベロープやLFOなどの制御信号でテーブル間を線形補間しながら選択・切り替えることで、単一の固定波形では作れない時間変化する音色を作れる。この「テーブル間の補間」は上記3の「テーブル内の点の補間」と同じ考え方を二次元に拡張したものである

位相増分の式`increment = f・N / sr`は、テーブルを1周期分だけ用意しておけば任意の周波数を1つの実装で扱えることを意味する——周波数を上げたいときは単に位相を進める速度を上げる(テーブルを"速く"読む)だけでよく、テーブル自体を再計算する必要がない。

## 特性・トレードオフ

- **低い計算コスト**: 毎サンプルの三角関数計算や複数の共振フィルタが不要で、テーブル参照と補間のみで済むため、多声(ポリフォニック)再生でも負荷を抑えやすい。この点は音源を毎サンプル数式で直接計算する加算合成やFM合成よりも軽量になりやすい
- **補間品質とエイリアシングのトレードオフ**: 線形補間は計算が軽い代わりに高調波成分にわずかな歪みを生む。テーブル長`N`を大きく取る、あるいは高次の補間(3次補間など)を使うことで音質は向上するがメモリと計算量が増える。また高い周波数で再生するとテーブル内の急峻な変化(矩形波の立ち上がりなど)がナイキスト周波数を超えた成分を生み、エイリアシングが発生しうるため、実用的な実装では周波数帯域ごとに帯域制限済みの複数テーブル(マルチサンプルテーブル、いわゆるband-limited wavetable)を切り替えて使うことが多い
- **モーフィングによる表現力**: テーブルを1つの固定波形ではなく複数用意して時間軸やパラメータに応じて滑らかに遷移させることで、[グラニュラー合成](/algorithms/granular-synthesis)や加算合成に匹敵する複雑な音色変化を、はるかに軽い計算量で実現できる。これがPPG Wave以降のウェーブテーブルシンセサイザーが「デジタルならではの音色」として評価された理由である
- **[Karplus-Strong弦楽器合成](/algorithms/karplus-strong-string-synthesis)との違い**: どちらも遅延バッファ/テーブルをループ再生する点は似ているが、Karplus-Strongはバッファの内容自体を毎周期フィルタで減衰させ続けるのに対し、ウェーブテーブル合成は(モーフィングしない限り)テーブル内容を変えずに読み出し位置だけを進める。前者は物理的な減衰音、後者は持続的な音色制御に向く
- **使いどころ**: アナログ的なシンセサイザーの音色再現、モーフィングを活かしたエレクトロニックミュージックのリード/ベース音源、計算資源が限られる組み込みシンセ、ゲーム機の音源チップ

## 実装例

```python
import math

def make_sine_table(n: int = 2048) -> list[float]:
    return [math.sin(2 * math.pi * k / n) for k in range(n)]

def wavetable_oscillator(
    table: list[float], frequency: float, duration: float, sample_rate: int = 44100,
) -> list[float]:
    n = len(table)
    increment = frequency * n / sample_rate
    phase = 0.0
    output = []
    total_samples = int(sample_rate * duration)
    for _ in range(total_samples):
        i0 = int(phase)
        frac = phase - i0
        i1 = (i0 + 1) % n
        sample = table[i0] * (1 - frac) + table[i1] * frac  # 線形補間
        output.append(sample)
        phase += increment
        if phase >= n:
            phase -= n
    return output

def morph_wavetables(
    table_a: list[float], table_b: list[float], mix: float,
) -> list[float]:
    """mix=0でtable_a、mix=1でtable_bになるようテーブル間を線形補間する。"""
    return [a * (1 - mix) + b * mix for a, b in zip(table_a, table_b)]
```

```typescript
function makeSineTable(n = 2048): Float64Array {
  const table = new Float64Array(n);
  for (let k = 0; k < n; k++) table[k] = Math.sin((2 * Math.PI * k) / n);
  return table;
}

function wavetableOscillator(
  table: Float64Array,
  frequency: number,
  duration: number,
  sampleRate = 44100,
): Float64Array {
  const n = table.length;
  const increment = (frequency * n) / sampleRate;
  let phase = 0;
  const totalSamples = Math.floor(sampleRate * duration);
  const output = new Float64Array(totalSamples);
  for (let s = 0; s < totalSamples; s++) {
    const i0 = Math.floor(phase);
    const frac = phase - i0;
    const i1 = (i0 + 1) % n;
    output[s] = table[i0] * (1 - frac) + table[i1] * frac; // 線形補間
    phase += increment;
    if (phase >= n) phase -= n;
  }
  return output;
}

function morphWavetables(
  tableA: Float64Array,
  tableB: Float64Array,
  mix: number,
): Float64Array {
  const out = new Float64Array(tableA.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = tableA[i] * (1 - mix) + tableB[i] * mix;
  }
  return out;
}
```
