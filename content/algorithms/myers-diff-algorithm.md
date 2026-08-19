---
name: Myersのdiffアルゴリズム
category: 動的計画法
subcategory: 数列・部分列
complexity: O(ND)
summary: 2つの系列間の最短編集スクリプトを、編集グラフ上の最短経路探索として捉えることで、差分の小ささDに応じた計算量で求める。
---

## 概要

2つのテキスト(行の並びとして扱うことが多い)を比較し、「どの行を削除し、どの行を追加すれば一方からもう一方を作れるか」という**具体的な差分(編集スクリプト)**を求めるのが、Myersのdiffアルゴリズムである。1986年にユージン・マイヤーズが発表し、Unixの`diff`コマンドやGitの`git diff`など、今日使われているほぼ全てのバージョン管理ツール・差分表示ツールの内部で採用されている極めて実用的なアルゴリズム。[編集距離(レーベンシュタイン距離)](/algorithms/edit-distance)が「変形にかかるコストの値」だけを求めるのに対し、Myersのアルゴリズムは**実際にどの行を挿入・削除すればよいかという編集操作の並びそのものを復元する**点が大きく異なる。

## 仕組み

Myersのアルゴリズムの核心は、2つの系列AとBの比較を**「編集グラフ」上の最短経路問題**として捉え直すことにある。

1. 系列A(長さN)を横軸、系列B(長さM)を縦軸に取った(N+1)×(M+1)のグリッドを考える。グリッド上の点(x, y)は「Aのx文字目まで・Bのy文字目まで処理し終えた状態」を表す
2. グリッド上の移動には3種類ある: 右へ1マス移動(Aの1文字を削除)、下へ1マス移動(Bの1文字を挿入)、そして`A[x] == B[y]`のときに限り斜め右下へ1マス移動(**対角移動、コスト0で1文字を「一致」として消費できる**)
3. この編集グラフの上で、**左上の点(0, 0)から右下の点(N, M)への最短経路**を見つけることが、最小の編集操作数(挿入+削除の回数、これを`D`と呼ぶ)を求めることに相当する。対角移動は無料なので、経路上でできるだけ多く対角移動を使うほど良い
4. Myersのアルゴリズムは、`D`を0, 1, 2, ...と**増やしながら**探索する(反復深化に近い発想)。各`D`について、「ちょうどD回の非対角移動(削除または挿入)を使って到達できる各対角線(x - y = 一定の値)上で、最も遠くまで進める点」を管理しながら探索を広げていく
5. `x - y`の値ごとに「その対角線上で到達できる最遠点のx座標」だけを記録すればよいという観察により、状態数を大幅に絞り込める。各Dのステップで、隣接する対角線の情報から新しい対角線の到達点を計算し(可能な限り貪欲に対角移動で伸ばす)、(N, M)に到達した時点でそのDが最小の編集操作数として確定する
6. 経路が確定したら、探索過程で記録した各ステップの到達点を逆にたどることで、**実際の編集スクリプト(どの行を削除し、どの行を挿入したか)**を復元できる

「一致する部分はできるだけ多く再利用し、一致しない部分だけを最小限の操作で埋める」という発想は編集距離と同じだが、Myersのアルゴリズムは**差分Dが小さいほど速く終わる**ように設計されている点が実用上重要である。ほとんどの実務上の差分比較(バージョン管理におけるコミット間の差分など)は、全体の行数に比べて変更行数がごく一部であることが多く、この性質が活きる。

## 特性・トレードオフ

- **計算量**: O(ND)(Nは系列の長さ、Dは最小編集距離)。編集距離DPのO(N×M)と異なり、**差分が小さいほど高速**という性質を持つため、「ほとんど同じだが一部だけ違う」典型的な`diff`の使用場面に理にかなっている
- **編集距離との違い**: 編集距離が「変形にかかるコストの値」だけを求める最適化問題であるのに対し、Myersのアルゴリズムは「具体的にどの行を削除・追加すればよいか」という**編集操作の並びそのもの(編集スクリプト)を復元する**ことに主眼を置く。`git diff`が表示する`+`/`-`の行はこの編集スクリプトそのものである
- **対角移動という発想の効きどころ**: 「一致する行はコスト0で読み飛ばせる」という対角移動の存在により、共通部分が多い2つのテキストほど探索が浅い段階(小さいD)で終わる。全く共通点のない2つの系列を比較する最悪ケースではD=N+Mに近づき、O(N²)相当まで悪化しうる
- **実用上の位置づけ**: `diff`・`git diff`・多くのIDEの差分表示機能・パッチ生成ツールなど、テキストの変更履歴を扱うソフトウェアのほぼ全てがこのアルゴリズム(またはその改良版)を採用しており、動的計画法の理論的な美しさと実用性を両立させた代表例といえる
- **使いどころ**: バージョン管理システムのコミット間差分表示、コードレビューツールの差分ハイライト、テキストエディタの変更履歴追跡、2つのファイルのマージ処理の前段階など

## 実装例

以下は、O(ND)アルゴリズムで最小編集距離Dを求め、さらに経路をたどって具体的な編集スクリプト(挿入・削除・一致のリスト)を復元する実装。

```python
def myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)
    max_d = n + m
    offset = max_d
    v = {1: 0}
    trace: list[dict[int, int]] = []

    for d in range(max_d + 1):
        trace.append(dict(v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v.get(k - 1, -1) < v.get(k + 1, -1)):
                x = v.get(k + 1, 0)
            else:
                x = v.get(k - 1, 0) + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k] = x
            if x >= n and y >= m:
                return _backtrack(a, b, trace, d)
    return []


def _backtrack(a: list[str], b: list[str], trace: list[dict[int, int]], d: int) -> list[tuple[str, str]]:
    x, y = len(a), len(b)
    script: list[tuple[str, str]] = []

    for depth in range(d, -1, -1):
        v = trace[depth]
        k = x - y
        if k == -depth or (k != depth and v.get(k - 1, -1) < v.get(k + 1, -1)):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v.get(prev_k, 0)
        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            script.append(("equal", a[x - 1]))
            x -= 1
            y -= 1

        if depth > 0:
            if x == prev_x:
                script.append(("insert", b[y - 1]))
            else:
                script.append(("delete", a[x - 1]))
        x, y = prev_x, prev_y

    script.reverse()
    return script
```

```typescript
type DiffOp = ["equal" | "insert" | "delete", string];

function myersDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const maxD = n + m;
  const v = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];

  for (let d = 0; d <= maxD; d++) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (
        k === -d ||
        (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))
      ) {
        x = v.get(k + 1) ?? 0;
      } else {
        x = (v.get(k - 1) ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v.set(k, x);
      if (x >= n && y >= m) {
        return backtrack(a, b, trace, d);
      }
    }
  }
  return [];
}

function backtrack(
  a: string[],
  b: string[],
  trace: Map<number, number>[],
  d: number,
): DiffOp[] {
  let x = a.length;
  let y = b.length;
  const script: DiffOp[] = [];

  for (let depth = d; depth >= 0; depth--) {
    const v = trace[depth];
    const k = x - y;
    let prevK: number;
    if (
      k === -depth ||
      (k !== depth && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))
    ) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      script.push(["equal", a[x - 1]]);
      x--;
      y--;
    }

    if (depth > 0) {
      if (x === prevX) {
        script.push(["insert", b[y - 1]]);
      } else {
        script.push(["delete", a[x - 1]]);
      }
    }
    x = prevX;
    y = prevY;
  }

  script.reverse();
  return script;
}
```
