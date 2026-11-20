---
name: Soundex(発音による名前の符号化)
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(文字数)
summary: 英語の名前を「先頭の文字+3桁の数字」の4文字の符号に変換し、綴りが違っても発音が似ている名前(Robert と Rupert など)を同じ符号にまとめる。
---

## 概要

名簿や戸籍の検索では、綴りの揺れが大きな問題になる。`Smith` と `Smythe`、`Robert` と `Rupert`、聞き取りの誤りや移民の入国記録の綴りの違いなど、同じ名前でも書き方が異なる。完全一致の検索では見つからない。

Soundexは、20世紀初頭にRobert C. RussellとMargaret K. Odellが特許を取得した方式(1918年と1922年)を原型とし、後に米国の国勢調査や社会保障の記録索引に使われた、発音に基づく符号化アルゴリズムである。**母音の違いは無視し、似た音を出す子音を同じ数字にまとめる**ことで、発音が近い名前に同じ符号を与える。計算が単純で、コンピュータが乏しい時代にもカード索引で運用できたことから、広く普及した。データベースの `SOUNDEX()` 関数としても実装されている。

## 仕組み

アメリカ式Soundexの代表的な規則:

1. 名前の**最初の文字**を、そのまま符号の先頭に残す
2. 残りの文字を、次の表で数字に置き換える。母音(A, E, I, O, U, Y)と H, W は対応する数字がない
   - B, F, P, V → 1
   - C, G, J, K, Q, S, X, Z → 2
   - D, T → 3
   - L → 4
   - M, N → 5
   - R → 6
3. **同じ数字が連続する場合は、1つにまとめる**。先頭の文字と同じ数字が最初に続く場合も、その数字は落とす
4. **母音(A, E, I, O, U, Y)は、同じ数字を隔てる**。つまり、母音を挟んで同じ数字が並ぶ場合は、2回数える。一方、**H と W は同じ数字を隔てない**(間に H や W があっても、同じ数字は1つにまとめる)
5. 「先頭の文字+数字3桁」にそろえる。数字が3桁を超えたら切り捨て、足りなければ 0 で埋める

例: `Robert` → R163、`Rupert` → R163(同じ)、`Rubin` → R150、`Ashcraft` → A261(S と C が H を挟んで連続するので、2は1回だけ)、`Tymczak` → T522(M=5、CZ=2が1つにまとまり、母音Aを挟んでKの2が続く)。

## 特性・トレードオフ

- **単純で高速**: 前処理として符号を計算して索引に保存しておけば、検索は符号の完全一致で済む。データベースの索引と相性がよい
- **英語の名前に偏っている**: 子音の分類は英語の発音を前提にしており、他の言語(特に非ラテン文字)ではうまく働かない。語頭の違い(`Kathy` と `Cathy` は K と C で先頭文字が違う)を同一視できないという欠点もある
- **偽陽性が多い**: 符号が4文字しかなく、異なる名前も同じ符号に落ちる(`Lee` と `Leigh` は一致して良いが、全く別の名前が一致することもある)。結果は「候補の絞り込み」として使い、最終判定は別の基準(編集距離など)で行う
- **後継の手法**: MetaphoneやDouble Metaphone、New York State Identification and Intelligence System(NYSIIS)は、綴りと発音の規則をより細かく扱う。現代の名寄せでは、編集距離や機械学習による照合を併用する
- **使いどころ**: 名簿・顧客データの名寄せ(重複の候補抽出)、系譜学の記録の検索、住所録の曖昧検索の前処理、データクレンジング

## 実装例

```python
CODES = {}
for letters, digit in (("BFPV", "1"), ("CGJKQSXZ", "2"), ("DT", "3"), ("L", "4"), ("MN", "5"), ("R", "6")):
    for ch in letters:
        CODES[ch] = digit


def soundex(name: str) -> str:
    name = "".join(ch for ch in name.upper() if ch.isalpha())
    if not name:
        return ""
    result = name[0]
    prev = CODES.get(name[0], "")      # 先頭の文字の数字(同じ数字が続くなら落とす)
    for ch in name[1:]:
        code = CODES.get(ch, "")
        if code and code != prev:
            result += code
        if ch not in "HW":             # 母音は直前の数字を忘れさせる。H と W は忘れさせない
            prev = code
    return (result + "000")[:4]


for n in ["Robert", "Rupert", "Rubin", "Ashcraft", "Tymczak", "Pfister"]:
    print(n, soundex(n))  # R163 R163 R150 A261 T522 P236
```

```typescript
const CODES = new Map<string, string>();
for (const [letters, digit] of [
  ["BFPV", "1"],
  ["CGJKQSXZ", "2"],
  ["DT", "3"],
  ["L", "4"],
  ["MN", "5"],
  ["R", "6"],
]) {
  for (const ch of letters) CODES.set(ch, digit);
}

function soundex(input: string): string {
  const name = [...input.toUpperCase()]
    .filter((ch) => /[A-Z]/.test(ch))
    .join("");
  if (name === "") return "";
  let result = name[0];
  let prev = CODES.get(name[0]) ?? "";
  for (const ch of name.slice(1)) {
    const code = CODES.get(ch) ?? "";
    if (code !== "" && code !== prev) result += code;
    if (ch !== "H" && ch !== "W") prev = code;
  }
  return (result + "000").slice(0, 4);
}

console.log(
  ["Robert", "Rupert", "Rubin", "Ashcraft", "Tymczak", "Pfister"].map(
    (n) => `${n} ${soundex(n)}`,
  ),
);
// R163 R163 R150 A261 T522 P236
```
