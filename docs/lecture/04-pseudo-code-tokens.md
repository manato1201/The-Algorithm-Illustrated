# 第 4 回 擬似コードと状態色

> 所要時間の目安: 2 時間 / 前提: 第 3 回

## この回のゴール

- フレームの**状態種別**から、擬似コードの**現在行**を引く仕組みを説明できる。
- **巻き戻しても現在行が食い違わない**理由を説明できる。
- 「発光は確定と比較中だけ」という決めごとの理由を説明できる。

## 1. 擬似コードの現在行

再生中のコマに合わせて、擬似コードの**いま実行している行**を光らせます(「内部が見える窓」)。

```typescript
// 抜粋ファイル: src/lib/pseudo-code.ts
export type PseudoLine = {
  text: string;
  indent: number;
  kinds: readonly StateColorKey[];
export function activePseudoLines(algorithmId: string, kind: StateColorKey): number[] {
```

- 各行が、**どの状態種別のコマで光るか**(`kinds`)を持つ。空なら説明用の行(光らない)。
- 現在行は、**コマから導いた状態種別**で引く。**再生の途中の状態を別に持たない**ので、**巻き戻しても食い違わない**(状態はコマの中にしかない)。
- 擬似コードは、この図鑑のために書いた**言語非依存**の記述で、実装例のコードとは独立。

```javascript
// 実行できる
(async () => {
  const { activePseudoLines: lines, PSEUDO_CODE } = await import("./src/lib/pseudo-code.ts");
  console.log("バブルソート: 比較中の行:", lines("bubble-sort", "comparing"));
  console.log("バブルソート: 入れ替え中の行:", lines("bubble-sort", "swapping"));
  console.log("バブルソート: 軸(pivot)は使わない:", lines("bubble-sort", "pivot"));
  console.log("二分探索: 中央を比べる行は 2 つの状態で光る:", lines("binary-search", "comparing"), lines("binary-search", "pivot"));
  console.log("擬似コードが無い id:", lines("unknown-id", "idle"));
  console.log("擬似コードを持つアルゴリズムの数が 1 以上:", Object.keys(PSEUDO_CODE).length >= 1);
  console.log("バブルソートの擬似コード:");
  for (const l of PSEUDO_CODE["bubble-sort"]) console.log(" ".repeat(l.indent * 2) + l.text);
})();
```

```text
# 出力
バブルソート: 比較中の行: [ 1 ]
バブルソート: 入れ替え中の行: [ 2 ]
バブルソート: 軸(pivot)は使わない: []
二分探索: 中央を比べる行は 2 つの状態で光る: [ 1 ] [ 1 ]
擬似コードが無い id: []
擬似コードを持つアルゴリズムの数が 1 以上: true
バブルソートの擬似コード:
未整列の範囲が残っている間、繰り返す
  隣り合う a[j] と a[j+1] を比べる
    a[j] > a[j+1] なら入れ替える
  範囲の末尾の1つが確定する
```

## 2. 状態色と、発光のルール

状態色は、TypeScript 側(`design-tokens.ts`)と CSS(`globals.css`)の**2 か所**に同じ値を持つ(Canvas 描画や Worker は CSS 変数を読めないため)。**値は必ず一致させる**(手動で同期)。

**発光(グロー)は、確定(`settled`)と比較中(`comparing`)だけ**に許す。発光が多いと、**どれが注目すべき状態か分からなくなる**ため。

```javascript
// 実行できる
(async () => {
  const t = await import("./src/lib/design-tokens.ts");
  for (const [name, hex] of Object.entries(t.stateColors)) {
    console.log(name.padEnd(10), hex, "発光:", t.shouldGlow(hex));
  }
})();
```

```text
# 出力
idle       #3A3F4D 発光: false
comparing  #FFD23F 発光: true
swapping   #FF5470 発光: false
pivot      #7DD3FF 発光: false
settled    #4DFFB0 発光: true
```

- 各可視化は固有の状態名を持つので、**状態名ではなく、最終的な色**で発光を判定する。
- 状態色は **色だけに頼らない**ことが望ましい(タイムラインや説明文でも、状態が分かるように)。

## 確認問題

1. 擬似コードの現在行を、巻き戻しても食い違わないのは、なぜですか。
2. 擬似コードを持たない id で `activePseudoLines` を呼ぶと、どうなりますか。
3. 発光を、確定と比較中だけにするのは、なぜですか。

## 解答

1. 現在行を、コマが持つ状態種別から引き、再生の状態を別に持たないから。
2. 空の配列が返る(光る行なし)。
3. 発光が多いと、注目すべき状態が分からなくなるから。

## まとめ

- 擬似コードの現在行は、**コマの状態種別**から引く。
- 状態色は 2 か所で同期。発光は**確定と比較中だけ**。
- 最後の回は、**入力の前提**と乱数。
