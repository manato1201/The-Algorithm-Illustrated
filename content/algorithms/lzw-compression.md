---
name: LZW圧縮
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n)(n=入力データ長)
summary: 圧縮しながら「今まで見た部分文字列」を辞書に自動登録していき、次に同じ部分文字列が出てきたら1つの符号番号で置き換える、GIF画像やUnixのcompressコマンドで使われた辞書式圧縮アルゴリズム。
---

## 概要

[LZ77圧縮](/algorithms/lz77-compression)がスライディングウィンドウ内の過去のデータを直接参照するのに対し、1984年にテリー・ウェルチ(Welch)がLempel-Zivの手法を改良して発表したLZW(Lempel-Ziv-Welch)は、明示的な「辞書テーブル」を圧縮の進行とともに動的に構築していくという発想を取る。あらかじめ辞書を送る必要がなく、圧縮側も展開側も全く同じルールでデータを読みながら辞書を育てていくだけで、送信側は登場済みの部分文字列を短い符号番号1つに置き換えられる——このシンプルさと実装の軽さから、GIF画像フォーマットやUnixの`compress`コマンド、TIFF画像の圧縮オプションなどで広く使われてきた歴史あるアルゴリズムである。

## 仕組み

1. 辞書を、使用するアルファベットの全ての1文字(例えば全256種のバイト値)であらかじめ初期化しておく
2. 現在処理中の文字列`w`(初期状態では空)を保持しながら、入力を1文字ずつ読んでいく。読んだ文字を`c`とする
3. `w + c`(`w`に`c`を連結した文字列)が既に辞書に登録されているなら、`w`を`w + c`に更新して次の文字へ進む(まだ出力しない、より長い一致を探し続ける)
4. `w + c`が辞書にまだ登録されていないなら、`w`に対応する符号番号を出力し、新しい文字列`w + c`を次に使える番号として辞書に追加する。そして`w`を`c`だけの状態にリセットして続行する
5. 入力の最後まで読み終えたら、残っている`w`の符号番号を出力して終了する
6. **展開(解凍)側**: 同じ初期辞書から出発し、受け取った符号番号の列を読みながら、圧縮側と全く同じルールで辞書を再構築していく——辞書のテーブル自体を送る必要が一切なく、圧縮列だけから展開側が独力で同じ辞書を再現できる点がLZWの巧妙さの核心である

## 特性・トレードオフ

- **計算量**: 辞書へのルックアップにハッシュテーブルや[Trie木](/algorithms/trie)を使えば、圧縮・展開ともに入力サイズに対して線形の`O(n)`で処理できる
- **辞書を送る必要がないという設計上の利点**: [ハフマン符号化](/algorithms/huffman-coding)が事前に頻度表(符号表)を送るか動的に構築する必要があるのに対し、LZWは圧縮列そのものから展開側が辞書を再構築できるため、符号表を別途伝送するオーバーヘッドが一切ない
- **辞書サイズの上限という実務上の制約**: 辞書は際限なく増え続けるため、実装では辞書サイズに上限(例えば4096エントリ)を設け、上限に達したら辞書をリセットするか固定して以降は追加を止める、といった工夫が必要になる
- **[LZ77](/algorithms/lz77-compression)との比較**: LZ77はウィンドウ内の生データを距離・長さで参照するのに対し、LZWは辞書テーブルという中間層を経由する点が異なる。LZWは実装がやや単純になる一方、GIFの特許問題(1990年代にUnisys社が特許を主張し議論になった、現在は特許は失効済み)のような歴史的経緯でも知られる
- **使いどころ**: GIF画像フォーマットの圧縮、TIFF画像の圧縮オプション、Unixの`compress`コマンド、PDFの一部のストリーム圧縮

## 実装例

エンコードとデコードがそれぞれ独立に同じ辞書を再構築できることを、往復一致(round-trip)で確認する。

```python
def lzw_encode(s: str) -> list[int]:
    dictionary = {chr(i): i for i in range(256)}
    next_code = 256
    w = ""
    result = []
    for c in s:
        wc = w + c
        if wc in dictionary:
            w = wc
        else:
            result.append(dictionary[w])
            dictionary[wc] = next_code
            next_code += 1
            w = c
    if w:
        result.append(dictionary[w])
    return result


def lzw_decode(codes: list[int]) -> str:
    dictionary = {i: chr(i) for i in range(256)}
    next_code = 256
    result = []
    w = dictionary[codes[0]]
    result.append(w)
    for k in codes[1:]:
        if k in dictionary:
            entry = dictionary[k]
        elif k == next_code:
            # まだ辞書にないが、直後に自分自身の登録が確定するパターン(w+w[0])
            entry = w + w[0]
        else:
            raise ValueError("bad code")
        result.append(entry)
        dictionary[next_code] = w + entry[0]
        next_code += 1
        w = entry
    return "".join(result)
```

```typescript
function lzwEncode(s: string): number[] {
  const dictionary = new Map<string, number>();
  for (let i = 0; i < 256; i++) dictionary.set(String.fromCharCode(i), i);
  let nextCode = 256;
  let w = "";
  const result: number[] = [];
  for (const c of s) {
    const wc = w + c;
    if (dictionary.has(wc)) {
      w = wc;
    } else {
      result.push(dictionary.get(w)!);
      dictionary.set(wc, nextCode);
      nextCode++;
      w = c;
    }
  }
  if (w) result.push(dictionary.get(w)!);
  return result;
}

function lzwDecode(codes: number[]): string {
  const dictionary = new Map<number, string>();
  for (let i = 0; i < 256; i++) dictionary.set(i, String.fromCharCode(i));
  let nextCode = 256;
  const result: string[] = [];
  let w = dictionary.get(codes[0])!;
  result.push(w);
  for (let idx = 1; idx < codes.length; idx++) {
    const k = codes[idx];
    let entry: string;
    if (dictionary.has(k)) {
      entry = dictionary.get(k)!;
    } else if (k === nextCode) {
      entry = w + w[0];
    } else {
      throw new Error("bad code");
    }
    result.push(entry);
    dictionary.set(nextCode, w + entry[0]);
    nextCode++;
    w = entry;
  }
  return result.join("");
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>
#include <stdexcept>

std::vector<int> lzwEncode(const std::string& s) {
    std::unordered_map<std::string, int> dictionary;
    for (int i = 0; i < 256; i++) dictionary[std::string(1, static_cast<char>(i))] = i;
    int nextCode = 256;
    std::string w;
    std::vector<int> result;
    for (char c : s) {
        std::string wc = w + c;
        if (dictionary.count(wc)) {
            w = wc;
        } else {
            result.push_back(dictionary[w]);
            dictionary[wc] = nextCode++;
            w = std::string(1, c);
        }
    }
    if (!w.empty()) result.push_back(dictionary[w]);
    return result;
}

std::string lzwDecode(const std::vector<int>& codes) {
    std::unordered_map<int, std::string> dictionary;
    for (int i = 0; i < 256; i++) dictionary[i] = std::string(1, static_cast<char>(i));
    int nextCode = 256;
    std::string result;
    std::string w = dictionary[codes[0]];
    result += w;
    for (size_t idx = 1; idx < codes.size(); idx++) {
        int k = codes[idx];
        std::string entry;
        if (dictionary.count(k)) {
            entry = dictionary[k];
        } else if (k == nextCode) {
            entry = w + w[0];
        } else {
            throw std::runtime_error("bad code");
        }
        result += entry;
        dictionary[nextCode++] = w + entry[0];
        w = entry;
    }
    return result;
}
```

```rust
use std::collections::HashMap;

fn lzw_encode(s: &str) -> Vec<i32> {
    let mut dictionary: HashMap<String, i32> = HashMap::new();
    for i in 0..256 {
        dictionary.insert((i as u8 as char).to_string(), i);
    }
    let mut next_code = 256;
    let mut w = String::new();
    let mut result = Vec::new();
    for c in s.chars() {
        let wc = format!("{}{}", w, c);
        if dictionary.contains_key(&wc) {
            w = wc;
        } else {
            result.push(dictionary[&w]);
            dictionary.insert(wc, next_code);
            next_code += 1;
            w = c.to_string();
        }
    }
    if !w.is_empty() {
        result.push(dictionary[&w]);
    }
    result
}

fn lzw_decode(codes: &[i32]) -> String {
    let mut dictionary: HashMap<i32, String> = HashMap::new();
    for i in 0..256 {
        dictionary.insert(i, (i as u8 as char).to_string());
    }
    let mut next_code = 256;
    let mut result = String::new();
    let mut w = dictionary[&codes[0]].clone();
    result.push_str(&w);
    for &k in &codes[1..] {
        let entry = if let Some(e) = dictionary.get(&k) {
            e.clone()
        } else if k == next_code {
            format!("{}{}", w, w.chars().next().unwrap())
        } else {
            panic!("bad code")
        };
        result.push_str(&entry);
        let first = entry.chars().next().unwrap();
        dictionary.insert(next_code, format!("{}{}", w, first));
        next_code += 1;
        w = entry;
    }
    result
}
```

```csharp
static List<int> LzwEncode(string s)
{
    var dictionary = new Dictionary<string, int>();
    for (int i = 0; i < 256; i++) dictionary[((char)i).ToString()] = i;
    int nextCode = 256;
    string w = "";
    var result = new List<int>();
    foreach (var c in s)
    {
        string wc = w + c;
        if (dictionary.ContainsKey(wc))
        {
            w = wc;
        }
        else
        {
            result.Add(dictionary[w]);
            dictionary[wc] = nextCode++;
            w = c.ToString();
        }
    }
    if (w.Length > 0) result.Add(dictionary[w]);
    return result;
}

static string LzwDecode(List<int> codes)
{
    var dictionary = new Dictionary<int, string>();
    for (int i = 0; i < 256; i++) dictionary[i] = ((char)i).ToString();
    int nextCode = 256;
    var result = new StringBuilder();
    string w = dictionary[codes[0]];
    result.Append(w);
    for (int idx = 1; idx < codes.Count; idx++)
    {
        int k = codes[idx];
        string entry;
        if (dictionary.ContainsKey(k)) entry = dictionary[k];
        else if (k == nextCode) entry = w + w[0];
        else throw new Exception("bad code");
        result.Append(entry);
        dictionary[nextCode++] = w + entry[0];
        w = entry;
    }
    return result.ToString();
}
```
