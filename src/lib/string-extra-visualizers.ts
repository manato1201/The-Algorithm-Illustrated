import type { CharState, StringMatchFrame } from "./string-visualizers";

/**
 * 文字列kindの可視化のうち、string-visualizers.ts の外に置いたもの(同ファイルが Object.assign で STRING_VISUALIZERS に登録する)。
 *  - ホースプール法: text=探索対象、pattern=パターンを重ねて右端から比べる
 *  - デュヴァル法(リンドン分解): text=入力、pattern=出力(見つかった因子を「|」で区切って蓄積)
 *  - Soundex: text=名前、pattern=符号(蓄積)
 */

type Marks = Partial<Record<number, CharState>>;

// ===========================================================================
// ボイヤー・ムーア・ホースプール法
// ===========================================================================

export const HORSPOOL_TEXT = "ABABDABACDABABCABAB";
export const HORSPOOL_PATTERN = "ABABCABAB";

/** 末尾を除くパターンの各文字について、末尾から数えた距離(右にある同じ文字が優先)。表にない文字のずらし幅は m。 */
export function horspoolShiftTable(pattern: string): Map<string, number> {
  const table = new Map<string, number>();
  for (let i = 0; i < pattern.length - 1; i++) table.set(pattern[i], pattern.length - 1 - i);
  return table;
}

export function horspoolSteps(): StringMatchFrame[] {
  const text = HORSPOOL_TEXT;
  const pattern = HORSPOOL_PATTERN;
  const n = text.length;
  const m = pattern.length;
  const table = horspoolShiftTable(pattern);
  const tableText = [...table.entries()].map(([c, d]) => `${c}=${d}`).join("・");
  const frames: StringMatchFrame[] = [
    {
      text,
      pattern,
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `ずらし表を作る(パターン末尾を除く各文字について、末尾までの距離): ${tableText}。表にない文字は ${m}。ずらし幅は「重ねた窓の末尾にあるテキストの文字」で決める`,
    },
  ];
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    const textMarks: Marks = {};
    const patternMarks: Marks = {};
    while (j >= 0 && pattern[j] === text[s + j]) {
      textMarks[s + j] = "matching";
      patternMarks[j] = "matching";
      j--;
    }
    if (j < 0) {
      const matched: Marks = {};
      const patternMatched: Marks = {};
      for (let k = 0; k < m; k++) {
        matched[s + k] = "matched";
        patternMatched[k] = "matched";
      }
      frames.push({ text, pattern, textHighlight: matched, patternOffset: s, patternHighlight: patternMatched, description: `位置${s}で完全一致を発見(右端から全て一致)` });
    } else {
      frames.push({
        text,
        pattern,
        textHighlight: { ...textMarks, [s + j]: "mismatch" },
        patternOffset: s,
        patternHighlight: { ...patternMarks, [j]: "mismatch" },
        description: `位置${s}: 右からpattern[${j}]="${pattern[j]}"とtext[${s + j}]="${text[s + j]}"が不一致`,
      });
    }
    const last = text[s + m - 1];
    const shift = table.get(last) ?? m;
    frames.push({
      text,
      pattern,
      textHighlight: { [s + m - 1]: "matching" },
      patternOffset: s,
      patternHighlight: {},
      description: `窓の末尾のテキスト文字は"${last}"。ずらし表より ${shift} 文字ずらす(一致・不一致に関係なく、この文字で決める)`,
    });
    s += shift;
  }
  frames.push({ text, pattern, textHighlight: {}, patternOffset: 0, patternHighlight: {}, description: "探索完了" });
  return frames;
}

// ===========================================================================
// デュヴァル法(リンドン分解)
// ===========================================================================

export const DUVAL_INPUT = "aabaaabaabab";

export function duvalFactors(s: string): string[] {
  const n = s.length;
  const result: string[] = [];
  let i = 0;
  while (i < n) {
    let j = i + 1;
    let k = i;
    while (j < n && s[k] <= s[j]) {
      k = s[k] < s[j] ? i : k + 1;
      j++;
    }
    while (i <= k) {
      result.push(s.slice(i, i + j - k));
      i += j - k;
    }
  }
  return result;
}

export function duvalSteps(): StringMatchFrame[] {
  const s = DUVAL_INPUT;
  const n = s.length;
  const frames: StringMatchFrame[] = [
    {
      text: s,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `デュヴァル法で "${s}" をリンドン分解する。リンドン語=自分のどの真の接尾辞よりも辞書順で小さい文字列。分解結果は、辞書順で弱い降順に並ぶリンドン語になる`,
    },
  ];
  let output = "";
  let i = 0;
  while (i < n) {
    let j = i + 1;
    let k = i;
    while (j < n && s[k] <= s[j]) {
      const marks: Marks = {};
      for (let t = i; t < j; t++) marks[t] = "matching";
      const relation = s[k] < s[j] ? "<" : "=";
      marks[j] = "matching";
      frames.push({
        text: s,
        pattern: output,
        textHighlight: marks,
        patternOffset: 0,
        patternHighlight: {},
        description: `s[${k}]="${s[k]}" ${relation} s[${j}]="${s[j]}": ${s[k] < s[j] ? `後ろの方が大きいので、s[${i}..${j}] 全体が1つのリンドン語になる。k を先頭 ${i} に戻す` : `周期が続いている。k と j をそろって進める`}`,
      });
      k = s[k] < s[j] ? i : k + 1;
      j++;
    }
    const period = j - k;
    const marks: Marks = {};
    for (let t = i; t < j; t++) marks[t] = "matching";
    if (j < n) marks[j] = "mismatch";
    frames.push({
      text: s,
      pattern: output,
      textHighlight: marks,
      patternOffset: 0,
      patternHighlight: {},
      description: j < n
        ? `s[${k}]="${s[k]}" > s[${j}]="${s[j]}": ここで打ち切り。周期${period}の因子 "${s.slice(i, i + period)}" を、完全に収まる回数だけ出力する`
        : `文字列の終わりに到達。周期${period}の因子 "${s.slice(i, i + period)}" を、完全に収まる回数だけ出力する`,
    });
    while (i <= k) {
      const factor = s.slice(i, i + period);
      const start = output.length === 0 ? 0 : output.length + 1;
      output = output === "" ? factor : `${output}|${factor}`;
      const matchedText: Marks = {};
      for (let t = i; t < i + period; t++) matchedText[t] = "matched";
      const matchedOut: Marks = {};
      for (let t = start; t < output.length; t++) matchedOut[t] = "matched";
      frames.push({
        text: s,
        pattern: output,
        textHighlight: matchedText,
        patternOffset: 0,
        patternHighlight: matchedOut,
        description: `因子 "${factor}" を出力(位置${i}〜${i + period - 1})`,
      });
      i += period;
    }
  }
  frames.push({
    text: s,
    pattern: output,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: {},
    description: `完了: ${output.split("|").map((f) => `「${f}」`).join(" ≥ ")}。因子は辞書順で弱い降順に並び、各因子はリンドン語。走査は線形時間・追加メモリ O(1)`,
  });
  return frames;
}

// ===========================================================================
// Soundex(発音による名前の符号化)
// ===========================================================================

export const SOUNDEX_NAME = "Ashcraft";
const SOUNDEX_GROUPS: [string, string][] = [
  ["BFPV", "1"],
  ["CGJKQSXZ", "2"],
  ["DT", "3"],
  ["L", "4"],
  ["MN", "5"],
  ["R", "6"],
];
const soundexDigit = (ch: string): string => SOUNDEX_GROUPS.find(([letters]) => letters.includes(ch))?.[1] ?? "";

/** 記事の実装例と同じ規則。 */
export function soundexCode(name: string): string {
  const upper = [...name.toUpperCase()].filter((ch) => ch >= "A" && ch <= "Z").join("");
  if (upper === "") return "";
  let result = upper[0];
  let prev = soundexDigit(upper[0]);
  for (const ch of upper.slice(1)) {
    const code = soundexDigit(ch);
    if (code !== "" && code !== prev) result += code;
    if (ch !== "H" && ch !== "W") prev = code;
  }
  return (result + "000").slice(0, 4);
}

export function soundexSteps(): StringMatchFrame[] {
  const text = SOUNDEX_NAME.toUpperCase();
  const frames: StringMatchFrame[] = [
    {
      text,
      pattern: "",
      textHighlight: {},
      patternOffset: 0,
      patternHighlight: {},
      description: `"${SOUNDEX_NAME}" をSoundexで符号化する。先頭の文字は残し、残りの子音を似た音ごとに数字へ(B F P V=1 / C G J K Q S X Z=2 / D T=3 / L=4 / M N=5 / R=6)。母音は無視して、最後に 先頭+数字3桁 にそろえる`,
    },
  ];
  let output = text[0];
  let prev = soundexDigit(text[0]);
  frames.push({
    text,
    pattern: output,
    textHighlight: { 0: "matched" },
    patternOffset: 0,
    patternHighlight: { 0: "matched" },
    description: `先頭の文字 ${text[0]} はそのまま残す(数字は ${prev || "なし"}。次の文字が同じ数字なら落とす)`,
  });
  for (let i = 1; i < text.length; i++) {
    const ch = text[i];
    const code = soundexDigit(ch);
    let description: string;
    let kind: "added" | "skipped";
    if (code !== "" && code !== prev && output.length >= 4) {
      kind = "skipped";
      description = `${ch} → ${code}: 数字がすでに3桁そろっているので、これ以降は切り捨てる`;
    } else if (code !== "" && code !== prev) {
      output += code;
      kind = "added";
      description = `${ch} → ${code}: 直前の数字(${prev || "なし"})と違うので、符号に加える`;
    } else if (code !== "") {
      kind = "skipped";
      description = `${ch} → ${code}: 直前の数字と同じ ${code} が続くので、1つにまとめて加えない`;
    } else if (ch === "H" || ch === "W") {
      kind = "skipped";
      description = `${ch} は符号なし。H と W は同じ数字を隔てないので、直前の数字(${prev || "なし"})を覚えたまま次へ`;
    } else {
      kind = "skipped";
      description = `${ch} は母音(符号なし)。同じ数字を隔てる扱いなので、直前の数字を忘れる`;
    }
    if (ch !== "H" && ch !== "W") prev = code;
    frames.push({
      text,
      pattern: output,
      textHighlight: { [i]: kind === "added" ? "matched" : "mismatch" },
      patternOffset: 0,
      patternHighlight: kind === "added" ? { [output.length - 1]: "matched" } : {},
      description,
    });
  }
  const padded = (output + "000").slice(0, 4);
  const all: Marks = {};
  for (let k = 0; k < padded.length; k++) all[k] = "matched";
  frames.push({
    text,
    pattern: padded,
    textHighlight: {},
    patternOffset: 0,
    patternHighlight: all,
    description: `完了: ${padded}。数字が3桁に足りなければ 0 で埋め、多ければ切り捨てる。同じ符号になる別の綴りの名前(例: Robert と Rupert はどちらも R163)が、発音の近い候補としてまとめて見つかる`,
  });
  return frames;
}

export const STRING_EXTRA_VISUALIZERS: Record<string, () => StringMatchFrame[]> = {
  "boyer-moore-horspool": horspoolSteps,
  "duval-lyndon-factorization": duvalSteps,
  "soundex-phonetic-encoding": soundexSteps,
};
