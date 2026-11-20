---
name: Hindley-Milner型推論
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: 実用上ほぼ線形(最悪は指数時間になる病的な入力が知られている)
summary: 型注釈のない関数型プログラムから、すべての式に最も一般的な(多相の)型を自動で割り出す。型変数の単一化(unification)と、let多相の一般化・具体化で成り立つ。
---

## 概要

静的型付けの利点(型の誤りを実行前に見つける)を得るには、すべての変数や関数に型を書く必要があるのか。ML、Haskell、OCaml、Rust などは、**書かなくてもコンパイラが推論する**。この仕組みの原型が、Hindley-Milner(HM)型推論である。

Roger Hindley が1969年に、組み合わせ論理の主要な型付けとして示したアルゴリズムを、Robin Milner が1978年に ML言語の型システムとして独立に再発見し、アルゴリズム W として実装した。さらに Damas と Milner(1982年)が、その完全性(推論される型が、可能な型のうち最も一般的であること)を証明した。この型システムの鍵は、`let` で束縛した関数だけを**多相**にする(`let` 多相)という制限にある。これにより、型推論が決定可能で、しかも主要な型が1つに定まる、という理想の性質が実現できた。

## 仕組み

式は、変数・整数リテラル・関数 `λx. e`・関数適用 `e₁ e₂`・`let x = e₁ in e₂` からなる。型は、型変数、基本型(`Int`)、関数型 `τ₁ → τ₂`。

1. **型変数の割り当て**: 関数 `λx. e` の引数 `x` には、新しい型変数 `α` を割り当てて、環境に入れる
2. **制約の生成と単一化**: 関数適用 `e₁ e₂` では、`e₁` の型 `τ₁` と `e₂` の型 `τ₂` を推論し、新しい型変数 `β` を用意して、`τ₁` と `τ₂ → β` を**単一化(unify)**する。単一化は、2つの型を等しくする型変数の置き換えを求める操作:
   - 型変数と型 → その型変数を型に置き換える。ただし、型変数がその型の中に現れる場合は、無限の型になるのでエラー(**occurs check**)
   - 関数型どうし → 引数と戻り値をそれぞれ単一化する
   - 基本型どうし → 同じなら成功、違えばエラー
3. **一般化(generalization)**: `let x = e₁ in e₂` では、まず `e₁` の型 `τ` を推論する。`τ` に含まれる型変数のうち、環境の中でまだ決まっていないものを `∀` で束縛して型スキーム `∀α. τ` にする(`x` を多相にする)
4. **具体化(instantiation)**: 変数 `x` を使うたびに、型スキームの `∀` で束縛された型変数を、新しい型変数に置き換えて使う。これにより、`let id = λx. x` の `id` を、`Int` にも関数にも使える
5. 式全体の型が得られる。置き換えをすべて適用した結果が、最も一般的な型(主要型)

## 特性・トレードオフ

- **注釈なしで最も一般的な型が得られる**: 型を書く負担が小さいのに、型安全性は保たれる。型エラーは、単一化の失敗として検出される
- **`let` 多相のみ**: `λ` で束縛した引数は多相にならない(`λf. (f 1, f true)` は型付けできない)。多相を引数にも許すと(System F)、型推論が決定不能になる。この制限が、推論可能性の代償である
- **エラーメッセージが難しい**: 単一化は、矛盾を見つけた場所ではなく、ずれて現れる場所で失敗しうるので、人間に分かりやすい位置の報告が難しい
- **拡張**: 型クラス(Haskell)、レコード・多相バリアント、ランク2以上の多相、GADT、所有権(Rust)などが、HMの上に拡張される。拡張するほど、推論が部分的になり、注釈が必要な場面が増える
- **計算量**: 実用的なプログラムではほぼ線形で動く。ただし、ネストした `let` が型の大きさを指数的に増やす病的な入力が知られている
- **使いどころ**: ML系言語・Haskell・Elm の型検査、DSLの型付け、プログラム解析の基礎、型システムの教科書の定番の題材

## 実装例

```python
import itertools

counter = itertools.count()


def fresh():
    return ("var", next(counter))


def fn(a, b):
    return ("fun", a, b)


INT = ("con", "Int")
subst = {}


def resolve(t):
    while t[0] == "var" and t[1] in subst:
        t = subst[t[1]]
    return t


def occurs(n, t):
    t = resolve(t)
    if t[0] == "var":
        return t[1] == n
    return t[0] == "fun" and (occurs(n, t[1]) or occurs(n, t[2]))


def unify(a, b):
    a, b = resolve(a), resolve(b)
    if a == b:
        return
    if a[0] == "var":
        if occurs(a[1], b):
            raise TypeError("無限の型になる(occurs check)")
        subst[a[1]] = b
    elif b[0] == "var":
        unify(b, a)
    elif a[0] == "fun" and b[0] == "fun":
        unify(a[1], b[1])
        unify(a[2], b[2])
    else:
        raise TypeError(f"型が合わない: {show(a)} と {show(b)}")


def free_vars(t):
    t = resolve(t)
    if t[0] == "var":
        return {t[1]}
    return free_vars(t[1]) | free_vars(t[2]) if t[0] == "fun" else set()


def instantiate(scheme):
    names, t = scheme
    mapping = {n: fresh() for n in names}

    def go(t):
        t = resolve(t)
        if t[0] == "var":
            return mapping.get(t[1], t)
        return fn(go(t[1]), go(t[2])) if t[0] == "fun" else t
    return go(t)


def generalize(env, t):
    in_env = set()
    for names, ty in env.values():
        in_env |= free_vars(ty) - set(names)   # 環境でまだ決まっていない型変数は一般化できない
    return (sorted(free_vars(t) - in_env), t)


def infer(env, e):
    kind = e[0]
    if kind == "lit":
        return INT
    if kind == "var":
        return instantiate(env[e[1]])
    if kind == "lam":
        tv = fresh()
        return fn(tv, infer({**env, e[1]: ([], tv)}, e[2]))
    if kind == "app":
        tf, ta, tr = infer(env, e[1]), infer(env, e[2]), fresh()
        unify(tf, fn(ta, tr))
        return tr
    if kind == "let":
        scheme = generalize(env, infer(env, e[2]))
        return infer({**env, e[1]: scheme}, e[3])


def show(t, names=None):
    names = {} if names is None else names
    t = resolve(t)
    if t[0] == "var":
        return names.setdefault(t[1], chr(ord("a") + len(names)))
    if t[0] == "con":
        return t[1]
    left = show(t[1], names)
    return (f"({left})" if resolve(t[1])[0] == "fun" else left) + " -> " + show(t[2], names)


def lam(x, body):
    return ("lam", x, body)


def app(f, x):
    return ("app", f, x)


def var(x):
    return ("var", x)


examples = {
    "λx. x": lam("x", var("x")),
    "λf. λx. f (f x)": lam("f", lam("x", app(var("f"), app(var("f"), var("x"))))),
    "let id = λx. x in id id": ("let", "id", lam("x", var("x")), app(var("id"), var("id"))),
    "let id = λx. x in (λy. id 1) (id (λz. z))": ("let", "id", lam("x", var("x")),
                                                 app(lam("y", app(var("id"), ("lit", 1))), app(var("id"), lam("z", var("z"))))),
    "λx. x x": lam("x", app(var("x"), var("x"))),
}
for name, expr in examples.items():
    try:
        print(f"{name}  :  {show(infer({}, expr))}")
    except TypeError as err:
        print(f"{name}  :  エラー({err})")
```

```typescript
type Type =
  | { k: "var"; id: number }
  | { k: "con"; name: string }
  | { k: "fun"; a: Type; b: Type };
type Scheme = { vars: number[]; type: Type };
type Expr =
  | { k: "lit" }
  | { k: "var"; name: string }
  | { k: "lam"; param: string; body: Expr }
  | { k: "app"; f: Expr; x: Expr }
  | { k: "let"; name: string; value: Expr; body: Expr };

let counter = 0;
const subst = new Map<number, Type>();
const fresh = (): Type => ({ k: "var", id: counter++ });
const fn = (a: Type, b: Type): Type => ({ k: "fun", a, b });
const INT: Type = { k: "con", name: "Int" };

function resolve(t: Type): Type {
  while (t.k === "var" && subst.has(t.id)) t = subst.get(t.id)!;
  return t;
}

function occurs(id: number, t: Type): boolean {
  t = resolve(t);
  if (t.k === "var") return t.id === id;
  return t.k === "fun" && (occurs(id, t.a) || occurs(id, t.b));
}

function show(t: Type, names = new Map<number, string>()): string {
  t = resolve(t);
  if (t.k === "var") {
    if (!names.has(t.id)) names.set(t.id, String.fromCharCode(97 + names.size));
    return names.get(t.id)!;
  }
  if (t.k === "con") return t.name;
  const left = show(t.a, names);
  return (
    (resolve(t.a).k === "fun" ? `(${left})` : left) + " -> " + show(t.b, names)
  );
}

function unify(a: Type, b: Type): void {
  a = resolve(a);
  b = resolve(b);
  if (a.k === "var" && b.k === "var" && a.id === b.id) return;
  if (a.k === "var") {
    if (occurs(a.id, b)) throw new TypeError("無限の型になる(occurs check)");
    subst.set(a.id, b);
  } else if (b.k === "var") unify(b, a);
  else if (a.k === "fun" && b.k === "fun") {
    unify(a.a, b.a);
    unify(a.b, b.b);
  } else if (a.k === "con" && b.k === "con" && a.name === b.name) return;
  else throw new TypeError(`型が合わない: ${show(a)} と ${show(b)}`);
}

function freeVars(t: Type, out = new Set<number>()): Set<number> {
  t = resolve(t);
  if (t.k === "var") out.add(t.id);
  else if (t.k === "fun") {
    freeVars(t.a, out);
    freeVars(t.b, out);
  }
  return out;
}

function instantiate(s: Scheme): Type {
  const mapping = new Map(s.vars.map((v) => [v, fresh()]));
  const go = (t: Type): Type => {
    t = resolve(t);
    if (t.k === "var") return mapping.get(t.id) ?? t;
    return t.k === "fun" ? fn(go(t.a), go(t.b)) : t;
  };
  return go(s.type);
}

function generalize(env: Map<string, Scheme>, t: Type): Scheme {
  const inEnv = new Set<number>();
  for (const s of env.values())
    for (const v of freeVars(s.type)) if (!s.vars.includes(v)) inEnv.add(v);
  return { vars: [...freeVars(t)].filter((v) => !inEnv.has(v)), type: t };
}

function infer(env: Map<string, Scheme>, e: Expr): Type {
  switch (e.k) {
    case "lit":
      return INT;
    case "var":
      return instantiate(env.get(e.name)!);
    case "lam": {
      const tv = fresh();
      return fn(
        tv,
        infer(new Map(env).set(e.param, { vars: [], type: tv }), e.body),
      );
    }
    case "app": {
      const tf = infer(env, e.f);
      const ta = infer(env, e.x);
      const tr = fresh();
      unify(tf, fn(ta, tr));
      return tr;
    }
    case "let": {
      const scheme = generalize(env, infer(env, e.value));
      return infer(new Map(env).set(e.name, scheme), e.body);
    }
  }
}

const lam = (param: string, body: Expr): Expr => ({ k: "lam", param, body });
const app = (f: Expr, x: Expr): Expr => ({ k: "app", f, x });
const v = (name: string): Expr => ({ k: "var", name });

const examples: [string, Expr][] = [
  ["λx. x", lam("x", v("x"))],
  ["λf. λx. f (f x)", lam("f", lam("x", app(v("f"), app(v("f"), v("x")))))],
  [
    "let id = λx. x in id id",
    {
      k: "let",
      name: "id",
      value: lam("x", v("x")),
      body: app(v("id"), v("id")),
    },
  ],
  ["λx. x x", lam("x", app(v("x"), v("x")))],
];
for (const [name, expr] of examples) {
  try {
    console.log(`${name}  :  ${show(infer(new Map(), expr))}`);
  } catch (err) {
    console.log(`${name}  :  エラー(${(err as Error).message})`);
  }
}
```
