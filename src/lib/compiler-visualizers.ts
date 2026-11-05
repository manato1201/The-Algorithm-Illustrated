import type { DPFrame, DPTableMeta } from "./dp-visualizers.ts";
import { makeGrid, range } from "./table-grid.ts";

/**
 * コンパイラ・構文解析の可視化(DPテーブル型の属性表を再利用する)。
 * 列 = 処理の1手(トークン・呼び出し・文)、行 = その時点の状態(出力・スタック・式・環境)。
 * 構文解析は「スタックと入力の記録」、最適化は「プログラムを書き換える前後」がそのまま表になる。
 * 最適化系は小さな式の木(Expr)を持ち、書き換え前後を実際に実行して同じ結果になることを
 * scripts/verify-visualizations.mjs で確かめる(意味を変えない変換であることが最適化の条件)。
 */

// ---------------------------------------------------------------------------
// 小さな式の木と、表示・評価
// ---------------------------------------------------------------------------

export type Expr =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "bin"; op: string; l: Expr; r: Expr };

export const num = (v: number): Expr => ({ k: "num", v });
export const vr = (name: string): Expr => ({ k: "var", name });
export const bin = (op: string, l: Expr, r: Expr): Expr => ({ k: "bin", op, l, r });

const PRECEDENCE: Record<string, number> = { "<<": 0, "+": 1, "-": 1, "*": 2, "/": 2 };

/** 必要な括弧だけを付けた式の文字列。 */
export function show(e: Expr, parent = 0, isRight = false): string {
  if (e.k === "num") return String(e.v);
  if (e.k === "var") return e.name;
  const p = PRECEDENCE[e.op];
  const text = `${show(e.l, p, false)} ${e.op} ${show(e.r, p, true)}`;
  return p < parent || (p === parent && isRight) ? `(${text})` : text;
}

export function evalExpr(e: Expr, env: Record<string, number>): number {
  if (e.k === "num") return e.v;
  if (e.k === "var") {
    if (!(e.name in env)) throw new Error(`未定義の変数 ${e.name}`);
    return env[e.name];
  }
  const a = evalExpr(e.l, env);
  const b = evalExpr(e.r, env);
  switch (e.op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return a / b;
    case "<<": return a * 2 ** b;
    default: throw new Error(`未知の演算子 ${e.op}`);
  }
}

export type Stmt = { target: string; expr: Expr };

/** 文の列を実行して、最後の環境を返す。 */
export function runProgram(program: readonly Stmt[], env: Record<string, number>): Record<string, number> {
  const state = { ...env };
  for (const s of program) state[s.target] = evalExpr(s.expr, state);
  return state;
}

const showStmt = (s: Stmt) => `${s.target} = ${show(s.expr)}`;

// ---------------------------------------------------------------------------
// 定数畳み込み
// ---------------------------------------------------------------------------

export const CONSTANT_FOLDING_EXPR: Expr = bin(
  "-",
  bin("*", bin("+", num(2), num(3)), num(4)),
  bin("*", vr("y"), bin("-", bin("/", num(10), num(5)), num(2))),
);

type FoldStep = { expr: Expr; before: string; after: string; rule: string; short: string };

/** 最も左の内側の畳み込める部分を1つだけ畳む。畳める所がなければnull。 */
export function foldOnce(e: Expr): FoldStep | null {
  const result = (function visit(node: Expr): { node: Expr; before: string; after: string; rule: string; short: string } | null {
    if (node.k !== "bin") return null;
    const inLeft = visit(node.l);
    if (inLeft) return { ...inLeft, node: bin(node.op, inLeft.node, node.r) };
    const inRight = visit(node.r);
    if (inRight) return { ...inRight, node: bin(node.op, node.l, inRight.node) };
    const before = show(node);
    if (node.l.k === "num" && node.r.k === "num" && !(node.op === "/" && node.r.v === 0)) {
      const value = evalExpr(node, {});
      return { node: num(value), before, after: String(value), rule: "定数同士の演算をコンパイル時に計算する", short: "定数同士を計算" };
    }
    if (node.op === "*" && ((node.l.k === "num" && node.l.v === 0) || (node.r.k === "num" && node.r.v === 0))) {
      return { node: num(0), before, after: "0", rule: "代数の恒等式 x*0 = 0(xが何でも結果は0)", short: "x*0 = 0" };
    }
    if (node.op === "*" && node.r.k === "num" && node.r.v === 1) return { node: node.l, before, after: show(node.l), rule: "x*1 = x", short: "x*1 = x" };
    if (node.op === "+" && node.r.k === "num" && node.r.v === 0) return { node: node.l, before, after: show(node.l), rule: "x+0 = x", short: "x+0 = x" };
    return null;
  })(e);
  return result ? { expr: result.node, before: result.before, after: result.after, rule: result.rule, short: result.short } : null;
}

export function constantFoldingSteps(): DPFrame[] {
  const steps: FoldStep[] = [];
  let current = CONSTANT_FOLDING_EXPR;
  for (let step = foldOnce(current); step; step = foldOnce(current)) {
    steps.push(step);
    current = step.expr;
  }
  const g = makeGrid(3, steps.length + 1);
  g.put(0, 0, show(CONSTANT_FOLDING_EXPR), "settled");
  const frames = [
    g.snap("初期状態: 実行時でなくコンパイル時に計算できる部分(定数同士の演算)を、結果に置き換えていく。置き換えると新しく計算できる部分が現れるので、これ以上畳めなくなるまで繰り返す"),
  ];
  steps.forEach((step, i) => {
    const c = i + 1;
    g.put(1, c, `${step.before} → ${step.after}`, "comparing");
    g.put(2, c, step.short, "comparing");
    frames.push(g.snap(`第${c}段: 最も左の内側から ${step.before} を見つけた。${step.rule}`));
    g.put(0, c, show(step.expr), "pivot");
    g.mark(1, c, "settled");
    g.mark(2, c, "settled");
    frames.push(g.snap(`${step.before} を ${step.after} に置き換え。式は ${show(step.expr)}`));
  });
  g.mark(0, steps.length, "settled");
  frames.push(g.snap(`畳み込み完了: ${show(CONSTANT_FOLDING_EXPR)} は変数yの値によらず ${show(current)}。実行時の計算がなくなる`));
  return frames;
}

// ---------------------------------------------------------------------------
// 3番地コード生成
// ---------------------------------------------------------------------------

export const TAC_EXPR: Expr = bin("+", bin("*", vr("a"), vr("b")), bin("*", vr("c"), bin("-", vr("d"), vr("e"))));

export type TacInstr = { dest: string; op: string; left: string; right: string; source: string };

/** 後行順に走査し、演算1つにつき「dest = left op right」を1命令として出す。 */
export function generateThreeAddressCode(e: Expr): { code: TacInstr[]; result: string } {
  const code: TacInstr[] = [];
  const visit = (node: Expr): string => {
    if (node.k === "num") return String(node.v);
    if (node.k === "var") return node.name;
    const left = visit(node.l);
    const right = visit(node.r);
    const dest = `t${code.length + 1}`;
    code.push({ dest, op: node.op, left, right, source: show(node) });
    return dest;
  };
  return { code, result: visit(e) };
}

export function runTac(code: readonly TacInstr[], env: Record<string, number>): number {
  const state = { ...env };
  const value = (name: string) => (name in state ? state[name] : Number(name));
  let last = 0;
  for (const ins of code) {
    const a = value(ins.left);
    const b = value(ins.right);
    last = ins.op === "+" ? a + b : ins.op === "-" ? a - b : ins.op === "*" ? a * b : a / b;
    state[ins.dest] = last;
  }
  return last;
}

export function threeAddressCodeGenerationSteps(): DPFrame[] {
  const { code, result } = generateThreeAddressCode(TAC_EXPR);
  const g = makeGrid(3, code.length);
  const frames = [
    g.snap(`初期状態: 式 ${show(TAC_EXPR)} を、1命令に演算を1つだけ含む形(3番地コード: 結果, 左, 右の3つのアドレス)に分解する。木を子から先に(後行順に)たどり、各演算の結果を一時変数に入れる`),
  ];
  code.forEach((ins, c) => {
    g.put(0, c, `${ins.dest} = ${ins.left} ${ins.op} ${ins.right}`, "pivot");
    g.put(1, c, ins.source, "settled");
    g.put(2, c, `${ins.dest} ← ${ins.source}`, "idle");
    frames.push(g.snap(`部分式 ${ins.source} の値を ${ins.dest} に入れる。子の結果(${ins.left}${/^t\d+$/.test(ins.left) ? "=一時変数" : ""}, ${ins.right}${/^t\d+$/.test(ins.right) ? "=一時変数" : ""})が先に揃っているので、この1命令で計算できる`));
  });
  g.mark(0, code.length - 1, "settled");
  frames.push(g.snap(`${code.length}命令で全体の値が ${result} に入る。各命令が単純なので、レジスタ割り当てや最適化の入力にしやすい`));
  return frames;
}

// ---------------------------------------------------------------------------
// 定数伝播
// ---------------------------------------------------------------------------

export const CONSTANT_PROPAGATION_PROGRAM: Stmt[] = [
  { target: "a", expr: num(4) },
  { target: "b", expr: bin("+", vr("a"), num(2)) },
  { target: "c", expr: bin("*", vr("b"), num(3)) },
  { target: "d", expr: bin("-", vr("c"), vr("a")) },
  { target: "d", expr: bin("+", vr("d"), vr("x")) },
  { target: "e", expr: bin("*", vr("d"), num(2)) },
];

export function substitute(e: Expr, env: Record<string, number>): Expr {
  if (e.k === "var") return e.name in env ? num(env[e.name]) : e;
  if (e.k === "bin") return bin(e.op, substitute(e.l, env), substitute(e.r, env));
  return e;
}

export function foldAll(e: Expr): Expr {
  let current = e;
  for (let step = foldOnce(current); step; step = foldOnce(current)) current = step.expr;
  return current;
}

export function propagateConstants(program: readonly Stmt[]): { result: Stmt[]; envs: Record<string, number>[] } {
  const env: Record<string, number> = {};
  const result: Stmt[] = [];
  const envs: Record<string, number>[] = [];
  for (const s of program) {
    envs.push({ ...env });
    const expr = foldAll(substitute(s.expr, env));
    result.push({ target: s.target, expr });
    if (expr.k === "num") env[s.target] = expr.v;
    else delete env[s.target];
  }
  return { result, envs };
}

const showEnv = (env: Record<string, number>) => {
  const items = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  return items.length > 0 ? `{${items.join(", ")}}` : "{ }";
};

export function constantPropagationSteps(): DPFrame[] {
  const program = CONSTANT_PROPAGATION_PROGRAM;
  const { result, envs } = propagateConstants(program);
  const g = makeGrid(3, program.length);
  program.forEach((s, c) => g.put(0, c, showStmt(s), "settled"));
  const frames = [
    g.snap("初期状態: 上から順に実行しながら「いま値が確定している変数(定数環境)」を覚え、後の文に出てくる変数をその値に置き換え、畳み込む。式が定数になれば、その変数も定数として伝わる"),
  ];
  program.forEach((s, c) => {
    g.mark(0, c, "comparing");
    g.put(1, c, showEnv(envs[c]), "comparing");
    frames.push(g.snap(`${showStmt(s)}: 手元の定数環境は ${showEnv(envs[c])}`));
    const out = result[c];
    const isConst = out.expr.k === "num";
    g.put(2, c, showStmt(out), isConst ? "pivot" : "idle");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(
      g.snap(
        isConst
          ? `環境の値を代入して畳み込むと ${showStmt(out)}。${out.target} も定数 ${out.expr.k === "num" ? out.expr.v : ""} として次の文へ伝わる`
          : `環境の値を代入すると ${showStmt(out)}。実行時に決まる値を含むので定数にならず、${out.target} は環境から外れる(以前に定数だった場合も、もう定数として使えない)`,
      ),
    );
  });
  frames.push(g.snap(`伝播後: ${result.map(showStmt).join("; ")}。定数になった文は単なる代入に変わり、実行時に計算が残るのは x に依存する文だけ。d は再代入で定数でなくなったので、後の e には14を伝えていない`));
  return frames;
}

// ---------------------------------------------------------------------------
// 不要コード除去(生存解析)
// ---------------------------------------------------------------------------

export const DCE_PROGRAM: Stmt[] = [
  { target: "a", expr: num(5) },
  { target: "b", expr: bin("*", vr("a"), num(2)) },
  { target: "c", expr: bin("+", vr("a"), num(1)) },
  { target: "d", expr: bin("+", vr("b"), num(3)) },
  { target: "e", expr: bin("*", vr("d"), vr("d")) },
  { target: "b", expr: num(100) },
];
export const DCE_RESULT_VAR = "d";

export function usedVars(e: Expr): string[] {
  if (e.k === "var") return [e.name];
  if (e.k === "bin") return [...usedVars(e.l), ...usedVars(e.r)];
  return [];
}

/** 後ろから見て、定義した変数が以降で使われない文を捨てる。各文の「直後に生きている変数」と残す/捨てるを返す。 */
export function deadCodeAnalysis(program: readonly Stmt[], resultVar: string): { liveOut: Set<string>[]; keep: boolean[] } {
  const liveOut: Set<string>[] = new Array(program.length);
  const keep: boolean[] = new Array(program.length).fill(false);
  let live = new Set<string>([resultVar]);
  for (let i = program.length - 1; i >= 0; i--) {
    liveOut[i] = new Set(live);
    const s = program[i];
    if (live.has(s.target)) {
      keep[i] = true;
      live = new Set(live);
      live.delete(s.target);
      for (const u of usedVars(s.expr)) live.add(u);
    }
  }
  return { liveOut, keep };
}

const showSet = (set: Set<string>) => (set.size === 0 ? "{ }" : `{${[...set].sort().join(", ")}}`);

export function deadCodeEliminationSteps(): DPFrame[] {
  const program = DCE_PROGRAM;
  const { liveOut, keep } = deadCodeAnalysis(program, DCE_RESULT_VAR);
  const g = makeGrid(3, program.length);
  program.forEach((s, c) => g.put(0, c, showStmt(s), "settled"));
  const frames = [
    g.snap(`初期状態: 最後に使う値は ${DCE_RESULT_VAR} だけ。プログラムを後ろから見て、「その変数がこの先で使われるか(生きているか)」を調べる。使われない値を作る文は捨てられる`),
  ];
  for (let c = program.length - 1; c >= 0; c--) {
    const s = program[c];
    g.mark(0, c, "comparing");
    g.put(1, c, showSet(liveOut[c]), "comparing");
    frames.push(g.snap(`${showStmt(s)}: この文の直後で生きている変数は ${showSet(liveOut[c])}`));
    if (keep[c]) {
      const uses = [...new Set(usedVars(s.expr))];
      g.put(2, c, "残す", "pivot");
      frames.push(g.snap(`${s.target} は生きている → 残す。${s.target} をここで定義するので生存集合から外し、使う変数${uses.length > 0 ? ` ${uses.join(", ")} ` : "(なし)"}を加える`));
    } else {
      g.put(2, c, "削除", "idle");
      frames.push(g.snap(`${s.target} はこの先で使われない(生きていない) → この文は結果に影響しないので削除`));
    }
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
  }
  const kept = program.filter((_, i) => keep[i]).map(showStmt);
  frames.push(g.snap(`削除後: ${kept.join("; ")}。${program.length}文 → ${kept.length}文。${DCE_RESULT_VAR} の値は変わらない`));
  return frames;
}

// ---------------------------------------------------------------------------
// 共通部分式除去(局所的な値番号付け)
// ---------------------------------------------------------------------------

export const CSE_PROGRAM: Stmt[] = [
  { target: "t1", expr: bin("+", vr("a"), vr("b")) },
  { target: "t2", expr: bin("*", vr("a"), vr("b")) },
  { target: "t3", expr: bin("+", vr("a"), vr("b")) },
  { target: "t4", expr: bin("+", vr("t2"), vr("t3")) },
  { target: "t5", expr: bin("+", vr("b"), vr("a")) },
  { target: "t6", expr: bin("*", vr("t4"), vr("t5")) },
];

/** 可換な演算(+, *)は被演算子を並べ替えて、同じ計算を同じキーにする。 */
export function expressionKey(op: string, left: string, right: string): string {
  const [x, y] = op === "+" || op === "*" ? [left, right].sort() : [left, right];
  return `${x} ${op} ${y}`;
}

export function eliminateCommonSubexpressions(program: readonly Stmt[]): {
  rows: { key: string; reused: string | null; out: Stmt }[];
} {
  const table = new Map<string, string>();
  const alias = new Map<string, string>();
  const canon = (v: Expr): string => (v.k === "var" ? alias.get(v.name) ?? v.name : String((v as { v: number }).v));
  const rows = program.map((s) => {
    const e = s.expr as Extract<Expr, { k: "bin" }>;
    const key = expressionKey(e.op, canon(e.l), canon(e.r));
    const reused = table.get(key) ?? null;
    if (reused) {
      alias.set(s.target, reused);
      return { key, reused, out: { target: s.target, expr: vr(reused) } };
    }
    table.set(key, s.target);
    return { key, reused: null, out: { target: s.target, expr: bin(e.op, vr(canon(e.l)), vr(canon(e.r))) } };
  });
  return { rows };
}

export function commonSubexpressionEliminationSteps(): DPFrame[] {
  const program = CSE_PROGRAM;
  const { rows } = eliminateCommonSubexpressions(program);
  const g = makeGrid(4, program.length);
  program.forEach((s, c) => g.put(0, c, showStmt(s), "settled"));
  const frames = [
    g.snap("初期状態: 同じ計算を2度しないよう、計算済みの式を表(キー → 結果を持つ変数)に覚える。+ や * は a+b と b+a が同じなので、被演算子を並べ替えてキーにする。2度目に出たら、前の結果を使い回す"),
  ];
  rows.forEach((row, c) => {
    g.mark(0, c, "comparing");
    g.put(1, c, row.key, "comparing");
    frames.push(g.snap(`${showStmt(program[c])}: キーは「${row.key}」。表に${row.reused ? `あり(${row.reused} が持っている)` : "なし"}`));
    g.put(2, c, row.reused ? `既出 → ${row.reused}` : "新規", row.reused ? "pivot" : "idle");
    g.put(3, c, showStmt(row.out), row.reused ? "pivot" : "idle");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(g.snap(row.reused ? `前の結果 ${row.reused} を使い回し、${showStmt(row.out)} に置き換える(計算を1回省略)` : `初めて出る計算なので表に登録し、そのまま残す`));
  });
  const saved = rows.filter((r) => r.reused).length;
  frames.push(g.snap(`重複した計算を ${saved} 回省略(${program.length}回 → ${program.length - saved}回の計算)。b+a を a+b と同じと見抜いた点がポイント`));
  return frames;
}

// ---------------------------------------------------------------------------
// ピープホール最適化
// ---------------------------------------------------------------------------

export const PEEPHOLE_PROGRAM: Stmt[] = [
  { target: "x", expr: bin("*", vr("y"), num(1)) },
  { target: "z", expr: bin("+", vr("x"), num(0)) },
  { target: "w", expr: bin("*", vr("z"), num(2)) },
  { target: "u", expr: bin("-", vr("w"), vr("w")) },
  { target: "v", expr: bin("+", vr("u"), num(5)) },
];

export function peepholeRewrite(e: Expr): { expr: Expr; rule: string } | null {
  if (e.k !== "bin") return null;
  if (e.op === "*" && e.r.k === "num" && e.r.v === 1) return { expr: e.l, rule: "x*1 → x(単位元)" };
  if (e.op === "+" && e.r.k === "num" && e.r.v === 0) return { expr: e.l, rule: "x+0 → x(単位元)" };
  if (e.op === "*" && e.r.k === "num" && e.r.v === 2) return { expr: bin("<<", e.l, num(1)), rule: "x*2 → x<<1(乗算をシフトに)" };
  if (e.op === "-" && e.l.k === "var" && e.r.k === "var" && e.l.name === e.r.name) return { expr: num(0), rule: "x−x → 0" };
  return null;
}

export function peepholeOptimizationSteps(): DPFrame[] {
  const program = PEEPHOLE_PROGRAM;
  const g = makeGrid(3, program.length);
  program.forEach((s, c) => g.put(0, c, showStmt(s), "settled"));
  const frames = [
    g.snap("初期状態: 命令列に小さな窓(のぞき穴)を当て、見つけた「もっと安い同じ意味の形」に書き換える。1つの規則は単純でも、窓をずらして繰り返すと効果が積み重なる"),
  ];
  const out: Stmt[] = [];
  program.forEach((s, c) => {
    g.mark(0, c, "comparing");
    const rewrite = peepholeRewrite(s.expr);
    frames.push(g.snap(`窓に ${showStmt(s)} を入れる。${rewrite ? `規則に一致: ${rewrite.rule}` : "当てはまる規則がない"}`));
    const next = rewrite ? { target: s.target, expr: rewrite.expr } : s;
    out.push(next);
    g.put(1, c, rewrite ? rewrite.rule.split("(")[0] : "なし", rewrite ? "pivot" : "idle");
    g.put(2, c, showStmt(next), rewrite ? "pivot" : "idle");
    g.mark(0, c, "settled");
    frames.push(g.snap(rewrite ? `${showStmt(s)} → ${showStmt(next)}` : `${showStmt(s)} はそのまま`));
  });
  frames.push(g.snap(`書き換え後: ${out.map(showStmt).join("; ")}。意味(各変数の値)は同じで、乗算や不要な足し算が安い命令になった`));
  return frames;
}

// ---------------------------------------------------------------------------
// 操車場アルゴリズム(中置→逆ポーランド記法)
// ---------------------------------------------------------------------------

export const SHUNTING_YARD_TOKENS = ["3", "+", "4", "*", "2", "/", "(", "1", "-", "5", ")", "^", "2", "^", "3"];
const OPERATORS: Record<string, { prec: number; right: boolean }> = {
  "+": { prec: 1, right: false },
  "-": { prec: 1, right: false },
  "*": { prec: 2, right: false },
  "/": { prec: 2, right: false },
  "^": { prec: 3, right: true },
};

export type ShuntingStep = { token: string; output: string[]; stack: string[]; action: string; label: string };

export function shuntingYard(tokens: readonly string[]): { steps: ShuntingStep[]; rpn: string[] } {
  const output: string[] = [];
  const stack: string[] = [];
  const steps: ShuntingStep[] = [];
  const snapshot = (token: string, action: string, label: string) => steps.push({ token, output: [...output], stack: [...stack], action, label });
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      output.push(token);
      snapshot(token, "数なので出力へ", "出力へ");
    } else if (token === "(") {
      stack.push(token);
      snapshot(token, "( をスタックに積む", "積む");
    } else if (token === ")") {
      const moved: string[] = [];
      while (stack.length > 0 && stack[stack.length - 1] !== "(") {
        const op = stack.pop() as string;
        output.push(op);
        moved.push(op);
      }
      stack.pop();
      snapshot(token, `( までのスタックの演算子 ${moved.join(" ")} を出力へ移し、( を捨てる`, `${moved.join(" ")}を出力`);
    } else {
      const o1 = OPERATORS[token];
      const moved: string[] = [];
      while (stack.length > 0 && stack[stack.length - 1] !== "(") {
        const o2 = OPERATORS[stack[stack.length - 1]];
        if (o2.prec > o1.prec || (o2.prec === o1.prec && !o1.right)) {
          const op = stack.pop() as string;
          output.push(op);
          moved.push(op);
        } else break;
      }
      stack.push(token);
      snapshot(
        token,
        moved.length > 0
          ? `スタックの ${moved.join(" ")} は ${token} より先に計算すべきなので出力へ移し、${token} を積む`
          : `優先して計算すべき演算子がスタックにないので、${token} をそのまま積む${o1.right ? "(右結合なので同順位でも待つ)" : ""}`,
        moved.length > 0 ? `${moved.join(" ")}を出力→積む` : "積む",
      );
    }
  }
  const rest: string[] = [];
  while (stack.length > 0) {
    const op = stack.pop() as string;
    output.push(op);
    rest.push(op);
  }
  steps.push({ token: "終", output: [...output], stack: [], action: `残りの演算子 ${rest.join(" ")} を、上から順に出力へ`, label: "残りを出力" });
  return { steps, rpn: output };
}

export function shuntingYardSteps(): DPFrame[] {
  const { steps, rpn } = shuntingYard(SHUNTING_YARD_TOKENS);
  const g = makeGrid(4, steps.length);
  steps.forEach((s, c) => g.put(0, c, s.token, "settled"));
  const frames = [
    g.snap(`初期状態: 中置記法 ${SHUNTING_YARD_TOKENS.join(" ")} を、括弧と優先順位が不要な逆ポーランド記法に直す。数は出力へ、演算子はスタックで待たせ、優先順位の高いものから出力へ送り出す`),
  ];
  steps.forEach((s, c) => {
    g.mark(0, c, "comparing");
    g.put(3, c, s.label, "comparing");
    frames.push(g.snap(`トークン ${s.token}: ${s.action}`));
    g.put(1, c, s.output.join(" "), "pivot");
    g.put(2, c, s.stack.join(" ") || "(空)", "pivot");
    g.mark(0, c, "settled");
    g.mark(3, c, "settled");
    frames.push(g.snap(`出力: ${s.output.join(" ")} / スタック: ${s.stack.join(" ") || "(空)"}`));
  });
  g.mark(1, steps.length - 1, "settled");
  frames.push(g.snap(`逆ポーランド記法: ${rpn.join(" ")}。数を積み、演算子が来たら直前の2つを取り出して計算する、というスタックだけの評価で答えが出る`));
  return frames;
}

// ---------------------------------------------------------------------------
// 再帰下降構文解析
// ---------------------------------------------------------------------------

export const RECURSIVE_DESCENT_TOKENS = ["2", "+", "3", "*", "4"];

export type ParseEvent = { kind: "enter" | "return"; fn: "E" | "T" | "F"; depth: number; next: string; value: number | null };

/** 文法 E → T (+ T)*, T → F (* F)*, F → 数 を1関数ずつ書いたとおりに実行し、呼び出しと戻りを記録する。 */
export function recursiveDescent(tokens: readonly string[]): { events: ParseEvent[]; value: number } {
  const events: ParseEvent[] = [];
  let pos = 0;
  const peek = () => tokens[pos] ?? "$";
  const parseF = (depth: number): number => {
    events.push({ kind: "enter", fn: "F", depth, next: peek(), value: null });
    const value = Number(tokens[pos++]);
    events.push({ kind: "return", fn: "F", depth, next: peek(), value });
    return value;
  };
  const parseT = (depth: number): number => {
    events.push({ kind: "enter", fn: "T", depth, next: peek(), value: null });
    let value = parseF(depth + 1);
    while (peek() === "*") {
      pos++;
      value *= parseF(depth + 1);
    }
    events.push({ kind: "return", fn: "T", depth, next: peek(), value });
    return value;
  };
  const parseE = (depth: number): number => {
    events.push({ kind: "enter", fn: "E", depth, next: peek(), value: null });
    let value = parseT(depth + 1);
    while (peek() === "+") {
      pos++;
      value += parseT(depth + 1);
    }
    events.push({ kind: "return", fn: "E", depth, next: peek(), value });
    return value;
  };
  const value = parseE(0);
  return { events, value };
}

export function recursiveDescentParsingSteps(): DPFrame[] {
  const { events, value } = recursiveDescent(RECURSIVE_DESCENT_TOKENS);
  const g = makeGrid(3, events.length);
  const frames = [
    g.snap(`初期状態: 文法の規則1つにつき関数を1つ書く(E=足し算、T=掛け算、F=数)。E は T を呼び、T は F を呼ぶ。呼ぶ順序そのものが「掛け算は足し算より強く結びつく」という優先順位を作る`),
  ];
  events.forEach((ev, c) => {
    const indent = "　".repeat(ev.depth);
    g.put(0, c, `${indent}${ev.kind === "enter" ? "→" : "←"} ${ev.fn}`, "comparing");
    g.put(1, c, ev.next, "comparing");
    frames.push(g.snap(ev.kind === "enter" ? `関数 ${ev.fn} を呼ぶ(呼び出しの深さ${ev.depth + 1})。次のトークンは ${ev.next}` : `関数 ${ev.fn} から戻る。値 ${ev.value}、次のトークンは ${ev.next}`));
    if (ev.kind === "return") g.put(2, c, ev.value, "pivot");
    g.mark(0, c, ev.kind === "return" ? "settled" : "pivot");
    g.mark(1, c, "settled");
    if (ev.kind === "return") frames.push(g.snap(`${ev.fn} の結果 ${ev.value} を呼び出し元へ返す`));
  });
  frames.push(g.snap(`解析完了: ${RECURSIVE_DESCENT_TOKENS.join(" ")} = ${value}。3 * 4 が先に T の中で計算され、その後 E で 2 に足される`));
  return frames;
}

// ---------------------------------------------------------------------------
// Pratt構文解析(束縛力)
// ---------------------------------------------------------------------------

export const PRATT_TOKENS = ["1", "+", "2", "*", "3", "^", "2", "-", "4"];
const BINDING: Record<string, { lbp: number; rbp: number }> = {
  "+": { lbp: 10, rbp: 10 },
  "-": { lbp: 10, rbp: 10 },
  "*": { lbp: 20, rbp: 20 },
  "/": { lbp: 20, rbp: 20 },
  "^": { lbp: 30, rbp: 29 },
};

export type PrattEvent = { label: string; short: string; minBp: number; tree: string };

/** 完全に括弧付けした木の文字列を作りながら、読み進める各イベントを記録する。 */
export function prattParse(tokens: readonly string[]): { events: PrattEvent[]; tree: string } {
  const events: PrattEvent[] = [];
  let pos = 0;
  const parse = (minBp: number): string => {
    const first = tokens[pos++];
    let left = first;
    events.push({ label: `数 ${first} を読む(前置の処理)`, short: `数 ${first}`, minBp, tree: left });
    while (pos < tokens.length && BINDING[tokens[pos]].lbp > minBp) {
      const op = tokens[pos++];
      events.push({ label: `${op} を読む。右辺を最小束縛力${BINDING[op].rbp}で再帰`, short: `${op} → 再帰`, minBp, tree: `${left} ${op} …` });
      const right = parse(BINDING[op].rbp);
      left = `(${left} ${op} ${right})`;
      events.push({ label: `${op} の右辺が決まり、木を組み立てる`, short: "木を組む", minBp, tree: left });
    }
    return left;
  };
  const tree = parse(0);
  return { events, tree };
}

export function evalPrattTree(tokens: readonly string[]): number {
  // 検証用に、同じ文法を評価だけする(結果の数値)。
  let pos = 0;
  const parse = (minBp: number): number => {
    let left = Number(tokens[pos++]);
    while (pos < tokens.length && BINDING[tokens[pos]].lbp > minBp) {
      const op = tokens[pos++];
      const right = parse(BINDING[op].rbp);
      left = op === "+" ? left + right : op === "-" ? left - right : op === "*" ? left * right : op === "/" ? left / right : left ** right;
    }
    return left;
  };
  return parse(0);
}

export function prattParsingSteps(): DPFrame[] {
  const { events, tree } = prattParse(PRATT_TOKENS);
  const g = makeGrid(3, events.length);
  const frames = [
    g.snap(`初期状態: 演算子ごとに「左をどれだけ強く引き寄せるか(束縛力)」を決めておく(+,−=10、*,/=20、^=30)。再帰呼び出しは最小束縛力を持ち、それより強い演算子だけを自分の側に取り込む。^ は右結合にするため、右辺の束縛力を1下げる`),
  ];
  events.forEach((ev, c) => {
    const isBuild = ev.label.includes("組み立てる");
    g.put(0, c, ev.short, isBuild ? "pivot" : "comparing");
    g.put(1, c, ev.minBp, "idle");
    g.put(2, c, ev.tree, isBuild ? "pivot" : "idle");
    frames.push(g.snap(`${ev.label}(この呼び出しの最小束縛力 ${ev.minBp})。ここまでの式: ${ev.tree}`));
  });
  g.mark(2, events.length - 1, "settled");
  frames.push(g.snap(`解析完了: ${tree}。1 + (2 * (3 ^ 2)) − 4 の形に木が組まれ、優先順位と結合性を束縛力の数値だけで表せた`));
  return frames;
}

// ---------------------------------------------------------------------------
// LL(1)構文解析
// ---------------------------------------------------------------------------

export const LL1_INPUT = ["id", "+", "id"];

/** 文法 E→TE', E'→+TE'|ε, T→FT', T'→*FT'|ε, F→(E)|id の予測構文解析表(行=非終端記号、列=先読み)。 */
export const LL1_TABLE: Record<string, Record<string, string[]>> = {
  E: { id: ["T", "E'"], "(": ["T", "E'"] },
  "E'": { "+": ["+", "T", "E'"], ")": [], $: [] },
  T: { id: ["F", "T'"], "(": ["F", "T'"] },
  "T'": { "+": [], "*": ["*", "F", "T'"], ")": [], $: [] },
  F: { id: ["id"], "(": ["(", "E", ")"] },
};

export type Ll1Step = { stack: string[]; input: string[]; action: string; label: string; rule: { head: string; body: string[] } | null };

export function ll1Parse(input: readonly string[]): { steps: Ll1Step[]; accepted: boolean } {
  const tokens = [...input, "$"];
  const stack = ["$", "E"];
  const steps: Ll1Step[] = [];
  let pos = 0;
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const lookahead = tokens[pos];
    const snapshot = { stack: [...stack].reverse(), input: tokens.slice(pos) };
    if (top === "$" && lookahead === "$") {
      steps.push({ ...snapshot, action: "受理(スタックも入力も $ だけ)", label: "受理", rule: null });
      return { steps, accepted: true };
    }
    if (top in LL1_TABLE) {
      const body = LL1_TABLE[top][lookahead];
      if (!body) {
        steps.push({ ...snapshot, action: `エラー(表 M[${top}, ${lookahead}] が空)`, label: "エラー", rule: null });
        return { steps, accepted: false };
      }
      stack.pop();
      for (let i = body.length - 1; i >= 0; i--) stack.push(body[i]);
      steps.push({ ...snapshot, action: `規則 ${top} → ${body.length > 0 ? body.join(" ") : "ε"}(表 M[${top}, ${lookahead}])`, label: `${top}→${body.length > 0 ? body.join("") : "ε"}`, rule: { head: top, body } });
    } else if (top === lookahead) {
      stack.pop();
      pos++;
      steps.push({ ...snapshot, action: `${top} が一致 → 両方進める`, label: `${top} 一致`, rule: null });
    } else {
      steps.push({ ...snapshot, action: `エラー(${top} を期待したが ${lookahead})`, label: "エラー", rule: null });
      return { steps, accepted: false };
    }
  }
  return { steps, accepted: false };
}

export function ll1ParsingSteps(): DPFrame[] {
  const { steps, accepted } = ll1Parse(LL1_INPUT);
  const g = makeGrid(3, steps.length);
  const frames = [
    g.snap(`初期状態: スタックに開始記号 E を積み、入力 ${LL1_INPUT.join(" ")} を左から読む。スタックの先頭が非終端記号なら「先頭1トークンの先読み」で表を引いて規則を1つに決める(後戻りしない)。終端記号なら入力と照合する`),
  ];
  steps.forEach((s, c) => {
    g.put(0, c, s.stack.join(" "), "comparing");
    g.put(1, c, s.input.join(" "), "comparing");
    frames.push(g.snap(`スタック(上→) ${s.stack.join(" ")} / 入力 ${s.input.join(" ")}`));
    g.put(2, c, s.label, s.rule ? "pivot" : s.action.startsWith("受理") ? "settled" : "idle");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(g.snap(s.action));
  });
  frames.push(g.snap(accepted ? `受理: ${LL1_INPUT.join(" ")} は文法に合う。使った規則を順に並べたものが最左導出になる` : "拒否"));
  return frames;
}

// ---------------------------------------------------------------------------
// 最長一致法によるトークン化
// ---------------------------------------------------------------------------

export const MAXIMAL_MUNCH_INPUT = "count1 <= 42 != y";
export const TOKEN_RULES: { name: string; pattern: RegExp }[] = [
  { name: "識別子", pattern: /^[a-z][a-z0-9]*/ },
  { name: "整数", pattern: /^[0-9]+/ },
  { name: "<", pattern: /^</ },
  { name: "<=", pattern: /^<=/ },
  { name: "=", pattern: /^=/ },
  { name: "==", pattern: /^==/ },
  { name: "!=", pattern: /^!=/ },
];

export type LexStep = { start: number; candidates: { name: string; length: number }[]; best: { name: string; length: number }; text: string };

export function maximalMunch(input: string): LexStep[] {
  const steps: LexStep[] = [];
  let pos = 0;
  while (pos < input.length) {
    if (input[pos] === " ") {
      pos++;
      continue;
    }
    const rest = input.slice(pos);
    const candidates = TOKEN_RULES.flatMap((rule) => {
      const m = rule.pattern.exec(rest);
      return m ? [{ name: rule.name, length: m[0].length }] : [];
    });
    if (candidates.length === 0) throw new Error(`字句エラー: ${pos}文字目`);
    // 最長一致。同じ長さなら先に書かれた規則を優先する。
    const best = candidates.reduce((a, b) => (b.length > a.length ? b : a));
    steps.push({ start: pos, candidates, best, text: rest.slice(0, best.length) });
    pos += best.length;
  }
  return steps;
}

export function maximalMunchTokenizationSteps(): DPFrame[] {
  const steps = maximalMunch(MAXIMAL_MUNCH_INPUT);
  const g = makeGrid(4, steps.length);
  const frames = [
    g.snap(`初期状態: 入力 "${MAXIMAL_MUNCH_INPUT}" を、各位置で「一致する規則のうち最も長く一致するもの」を選んで切り出す。"<=" を "<" と "=" に分けてしまわないための原則`),
  ];
  steps.forEach((s, c) => {
    g.put(0, c, s.start, "comparing");
    g.put(1, c, s.candidates.map((cand) => `${cand.name}:${cand.length}`).join(" / "), "comparing");
    frames.push(g.snap(`位置${s.start}から一致する規則: ${s.candidates.map((cand) => `${cand.name}(${cand.length}文字)`).join("、")}`));
    g.put(2, c, `${s.best.name}`, "pivot");
    g.put(3, c, `"${s.text}"`, "pivot");
    g.mark(0, c, "settled");
    g.mark(1, c, "settled");
    frames.push(g.snap(s.candidates.length > 1 ? `最長の ${s.best.name}(${s.best.length}文字)を採用 → "${s.text}"` : `一致は ${s.best.name} だけ → "${s.text}"`));
  });
  frames.push(g.snap(`トークン列: ${steps.map((s) => `${s.best.name}"${s.text}"`).join(" ")}。空白は区切りとして読み飛ばした`));
  return frames;
}

// ---------------------------------------------------------------------------
// レジストリと表のメタ情報(DP_VISUALIZERS / DP_TABLE_META に統合される)
// ---------------------------------------------------------------------------

export const COMPILER_VISUALIZERS: Record<string, () => DPFrame[]> = {
  "constant-folding": constantFoldingSteps,
  "three-address-code-generation": threeAddressCodeGenerationSteps,
  "constant-propagation": constantPropagationSteps,
  "dead-code-elimination": deadCodeEliminationSteps,
  "common-subexpression-elimination": commonSubexpressionEliminationSteps,
  "peephole-optimization": peepholeOptimizationSteps,
  "shunting-yard-algorithm": shuntingYardSteps,
  "recursive-descent-parsing": recursiveDescentParsingSteps,
  "pratt-parsing": prattParsingSteps,
  "ll1-parsing": ll1ParsingSteps,
  "maximal-munch-tokenization": maximalMunchTokenizationSteps,
};

const foldColumns = (() => {
  let count = 1;
  let current = CONSTANT_FOLDING_EXPR;
  for (let step = foldOnce(current); step; step = foldOnce(current)) {
    count++;
    current = step.expr;
  }
  return range(count).map((i) => (i === 0 ? "元の式" : `第${i}段`));
})();

export const COMPILER_TABLE_META: Record<string, DPTableMeta> = {
  "constant-folding": {
    chips: [`式: ${show(CONSTANT_FOLDING_EXPR)}`, "yは実行時にしか分からない変数"],
    cornerLabel: "項目 \\ 段",
    rowHeaders: ["式", "畳んだ箇所", "使った規則"],
    colHeaders: foldColumns,
  },
  "three-address-code-generation": {
    chips: [`式: ${show(TAC_EXPR)}`, "1命令に演算は1つだけ"],
    cornerLabel: "項目 \\ 命令",
    rowHeaders: ["3番地コード", "対応する部分式", "一時変数の中身"],
    colHeaders: generateThreeAddressCode(TAC_EXPR).code.map((_, i) => `命令${i + 1}`),
  },
  "constant-propagation": {
    chips: [`プログラム: ${CONSTANT_PROPAGATION_PROGRAM.map(showStmt).join("; ")}`, "xは実行時に決まる入力"],
    cornerLabel: "項目 \\ 文",
    rowHeaders: ["元の文", "手元の定数環境", "伝播・畳み込み後"],
    colHeaders: CONSTANT_PROPAGATION_PROGRAM.map((_, i) => `文${i + 1}`),
  },
  "dead-code-elimination": {
    chips: [`プログラム: ${DCE_PROGRAM.map(showStmt).join("; ")}`, `最後に使う値: ${DCE_RESULT_VAR}`, "後ろの文から順に調べる"],
    cornerLabel: "項目 \\ 文",
    rowHeaders: ["文", "直後に生きている変数", "判定"],
    colHeaders: DCE_PROGRAM.map((_, i) => `文${i + 1}`),
  },
  "common-subexpression-elimination": {
    chips: [`プログラム: ${CSE_PROGRAM.map(showStmt).join("; ")}`, "+ と * は可換(a+b = b+a)"],
    cornerLabel: "項目 \\ 文",
    rowHeaders: ["文", "式のキー(正規化)", "判定", "置き換え後"],
    colHeaders: CSE_PROGRAM.map((_, i) => `文${i + 1}`),
  },
  "peephole-optimization": {
    chips: [`プログラム: ${PEEPHOLE_PROGRAM.map(showStmt).join("; ")}`, "窓に1文ずつ入れて規則に当てる"],
    cornerLabel: "項目 \\ 文",
    rowHeaders: ["元の命令", "適用した規則", "書き換え後"],
    colHeaders: PEEPHOLE_PROGRAM.map((_, i) => `文${i + 1}`),
  },
  "shunting-yard-algorithm": {
    chips: [`中置記法: ${SHUNTING_YARD_TOKENS.join(" ")}`, "^ は右結合、他は左結合"],
    cornerLabel: "項目 \\ トークン",
    rowHeaders: ["トークン", "出力(逆ポーランド)", "演算子スタック(底→上)", "動作"],
    colHeaders: [...SHUNTING_YARD_TOKENS.map((_, i) => `${i + 1}`), "終"],
  },
  "recursive-descent-parsing": {
    chips: [`入力: ${RECURSIVE_DESCENT_TOKENS.join(" ")}`, "E → T (+ T)*  /  T → F (* F)*  /  F → 数"],
    cornerLabel: "項目 \\ 出来事",
    rowHeaders: ["呼び出し(→入る/←戻る、深さはインデント)", "次のトークン", "戻り値"],
    colHeaders: range(recursiveDescent(RECURSIVE_DESCENT_TOKENS).events.length).map((i) => `${i + 1}`),
  },
  "pratt-parsing": {
    chips: [`入力: ${PRATT_TOKENS.join(" ")}`, "束縛力: + − = 10 / * / = 20 / ^ = 30(右結合)"],
    cornerLabel: "項目 \\ 出来事",
    rowHeaders: ["出来事", "呼び出しの最小束縛力", "ここまでの式"],
    colHeaders: range(prattParse(PRATT_TOKENS).events.length).map((i) => `${i + 1}`),
  },
  "ll1-parsing": {
    chips: [`入力: ${LL1_INPUT.join(" ")}`, "E→TE'  E'→+TE'|ε  T→FT'  T'→*FT'|ε  F→(E)|id"],
    cornerLabel: "項目 \\ 手順",
    rowHeaders: ["スタック(上→)", "残りの入力", "動作"],
    colHeaders: range(ll1Parse(LL1_INPUT).steps.length).map((i) => `${i + 1}`),
  },
  "maximal-munch-tokenization": {
    chips: [`入力: "${MAXIMAL_MUNCH_INPUT}"`, `規則: ${TOKEN_RULES.map((r) => r.name).join(" / ")}`],
    cornerLabel: "項目 \\ トークン",
    rowHeaders: ["開始位置", "一致した規則と長さ", "採用した規則", "切り出した文字列"],
    colHeaders: range(maximalMunch(MAXIMAL_MUNCH_INPUT).length).map((i) => `${i + 1}`),
  },
};
