---
name: ランレングス符号化(RLE)
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n)
summary: 同じ値の連続をその値と回数の組に置き換える、最も単純な可逆圧縮。
---

## 概要

「同じ値が連続している区間(ラン)」を、「その値」と「連続した回数」の組に置き換えるだけの、最も単純で直感的な可逆圧縮アルゴリズム。例えば "AAAABBBCCDAA" は "4A3B2C1D2A" のように表現できる。圧縮率の高さでは現代の圧縮アルゴリズムに遠く及ばないが、実装の単純さと、特定のデータ(同じ値の連続が多いデータ)に対する圧倒的な効果から、今も現役で使われ続けている。

## 仕組み

1. データの先頭から走査を始める
2. 同じ値が続く限りカウントを増やしていく
3. 異なる値が現れたら、それまでの「値と連続回数」の組を出力し、カウントを1にリセットして新しい値の走査を始める
4. データの末尾まで4を繰り返す

**復元**もこの逆をたどるだけで、圧縮時と全く同じ手順を逆再生する形になる(値と回数の組を読み、その値をその回数だけ繰り返して出力する)。エンコード・デコードともにO(n)の線形時間で完了する、非常に軽量なアルゴリズム。

## 特性・トレードオフ

- **計算量**: エンコード・デコードともにO(n)
- **データの性質に効果が大きく左右される**: 同じ値の連続が多いデータ(単色が広がる画像、白黒の2値画像、繰り返しの多いログデータなど)では劇的に圧縮できる一方、**ランダムに近いデータではむしろサイズが増えてしまう**(1文字を「1回」の組に変換すると元より大きくなる)という弱点を持つ
- **Burrows-Wheeler変換との相性**: BWTで同じ文字を連続させるように並べ替えた後にRLEを適用すると、単体では効果の薄いデータに対してもRLEが効果的に働くようになる。bzip2のような圧縮ツールはこの組み合わせを実際に採用している
- **使いどころ**: FAX通信の画像圧縮(白黒2値画像との相性の良さ)、初期のビットマップ画像フォーマット(BMP, PCXなど)、ゲームのスプライトデータの圧縮、ログファイルの繰り返し行の圧縮など。「同じ値が連続しやすい」とわかっているデータに限定して使うのが実用上のコツ

## 実装例

```python
def rle_encode(s: str) -> str:
    if not s:
        return ""
    result = []
    count = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            count += 1
        else:
            result.append(f"{count}{s[i - 1]}")
            count = 1
    result.append(f"{count}{s[-1]}")
    return "".join(result)


def rle_decode(s: str) -> str:
    result = []
    i = 0
    n = len(s)
    while i < n:
        j = i
        while j < n and s[j].isdigit():
            j += 1
        count = int(s[i:j])
        ch = s[j]
        result.append(ch * count)
        i = j + 1
    return "".join(result)
```

```typescript
function rleEncode(s: string): string {
  if (s.length === 0) return "";
  const result: string[] = [];
  let count = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      count++;
    } else {
      result.push(`${count}${s[i - 1]}`);
      count = 1;
    }
  }
  result.push(`${count}${s[s.length - 1]}`);
  return result.join("");
}

function rleDecode(s: string): string {
  const result: string[] = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && /\d/.test(s[j])) j++;
    const count = parseInt(s.slice(i, j), 10);
    const ch = s[j];
    result.push(ch.repeat(count));
    i = j + 1;
  }
  return result.join("");
}
```

```cpp
#include <cctype>
#include <string>

std::string rleEncode(const std::string& s) {
    if (s.empty()) return "";
    std::string result;
    int count = 1;
    for (size_t i = 1; i < s.size(); i++) {
        if (s[i] == s[i - 1]) {
            count++;
        } else {
            result += std::to_string(count) + s[i - 1];
            count = 1;
        }
    }
    result += std::to_string(count) + s.back();
    return result;
}

std::string rleDecode(const std::string& s) {
    std::string result;
    size_t i = 0;
    while (i < s.size()) {
        size_t j = i;
        while (j < s.size() && std::isdigit(static_cast<unsigned char>(s[j]))) j++;
        int count = std::stoi(s.substr(i, j - i));
        char ch = s[j];
        result.append(count, ch);
        i = j + 1;
    }
    return result;
}
```

```rust
fn rle_encode(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.is_empty() {
        return String::new();
    }
    let mut result = String::new();
    let mut count = 1;
    for i in 1..chars.len() {
        if chars[i] == chars[i - 1] {
            count += 1;
        } else {
            result.push_str(&count.to_string());
            result.push(chars[i - 1]);
            count = 1;
        }
    }
    result.push_str(&count.to_string());
    result.push(chars[chars.len() - 1]);
    result
}

fn rle_decode(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut result = String::new();
    let mut i = 0;
    while i < chars.len() {
        let mut j = i;
        while j < chars.len() && chars[j].is_ascii_digit() {
            j += 1;
        }
        let count: usize = chars[i..j].iter().collect::<String>().parse().unwrap();
        let ch = chars[j];
        for _ in 0..count {
            result.push(ch);
        }
        i = j + 1;
    }
    result
}
```

```csharp
static string RleEncode(string s)
{
    if (s.Length == 0) return "";
    var result = new System.Text.StringBuilder();
    int count = 1;
    for (int i = 1; i < s.Length; i++)
    {
        if (s[i] == s[i - 1])
        {
            count++;
        }
        else
        {
            result.Append(count).Append(s[i - 1]);
            count = 1;
        }
    }
    result.Append(count).Append(s[^1]);
    return result.ToString();
}

static string RleDecode(string s)
{
    var result = new System.Text.StringBuilder();
    int i = 0;
    while (i < s.Length)
    {
        int j = i;
        while (j < s.Length && char.IsDigit(s[j])) j++;
        int count = int.Parse(s.Substring(i, j - i));
        char ch = s[j];
        result.Append(ch, count);
        i = j + 1;
    }
    return result.ToString();
}
```
