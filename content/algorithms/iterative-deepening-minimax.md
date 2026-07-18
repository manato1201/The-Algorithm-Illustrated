---
name: 反復深化ミニマックス法
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^d)(bは分岐数、dは最終的な探索深さ、アルファベータ枝刈り併用時はO(b^(d/2)))
summary: 探索の深さ制限を1、2、3...と段階的に増やしながらミニマックス探索を繰り返すことで、「時間切れになったら直前に完了した深さの結果をそのまま使える」という実務上決定的に重要な性質を持たせた、実際のゲームAIで標準的に使われる探索の運用方法。
---

## 概要

[ミニマックス法](/algorithms/minimax)や[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)は「深さdまで探索する」という固定の深さ制限を前提とするが、実戦のゲームAIには「1手あたり5秒まで」のような時間制限があり、局面によって適切な探索深さは大きく変動する(単純な局面なら深く読めるが、複雑な局面では浅くしか読めない)。反復深化ミニマックス法は、[反復深化深さ優先探索(IDDFS)](/algorithms/iddfs)と同じ発想をゲーム木探索に応用したもので、深さ制限を1手、2手、3手と段階的に増やしながら探索を繰り返す。一見「同じ場所を何度も探索し直す無駄」に見えるが、実際には「時間切れになった瞬間、直前に完了した深さの結果をそのまま指し手として採用できる」という、時間制限のある実戦で決定的に重要な性質を、驚くほど小さな追加コストで実現する。

## 仕組み

1. 深さ制限`d=1`から始めて、[ミニマックス法](/algorithms/minimax)(通常は[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)と組み合わせる)を実行し、その深さでの最善手を得る
2. 時間制限に達していなければ、深さ制限を`d+1`に増やして再度ミニマックス探索を最初からやり直す
3. これを時間制限に達するまで繰り返す。時間切れになった時点で、最後に完全に探索が終わった深さの最善手を最終的な指し手として採用する(現在探索中で未完了の深さの結果は、部分的で信頼できないため使わない)
4. **前回の探索結果の再利用による高速化**: 深さ`d`での探索結果(特に最善だと判明した手の順序)を、深さ`d+1`の探索における手の並べ替え(move ordering)に利用する——[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)は良い手から先に調べるほど枝刈りの効果が高まるため、前回の探索結果を活かすことで各深さの探索が大幅に高速化される

## 特性・トレードオフ

- **計算量**: 深さ`d`のゲーム木のノード数は指数的に増加する(`O(b^d)`)ため、深さ`1`から`d-1`までの再探索コストの合計は、深さ`d`単体の探索コストと比べて無視できるほど小さい(等比級数の性質により、最後の項が支配的になる)——「同じ場所を何度も探索する無駄」は直感に反して非常に小さい
- **時間制限下での実用性という決定的な利点**: 固定深さのミニマックス法では「時間切れ=結果なし」という最悪の事態が起こりうるが、反復深化を使えば「常に直前に完了した深さの、信頼できる指し手」を返せる——チェスや将棋の対局時計付きゲームで、このアルゴリズムの運用方式がほぼ標準になっている理由である
- **move orderingの改善という副次的な効果**: 前回浅い深さで見つかった最善手を次の深さの探索で最初に試すことで、[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)の枝刈り効率が大きく向上する——反復深化は単に「時間管理のための道具」であるだけでなく、探索そのものを高速化する実用上の技法にもなっている
- **使いどころ**: チェス・将棋・囲碁のようなハードな時間制限のあるゲームAI(ほぼ全ての実戦級ゲームAIエンジンが採用)、[反復深化深さ優先探索](/algorithms/iddfs)が使われるパズル探索全般との共通点、対話的な意思決定システムにおける「いつでも打ち切り可能な」探索の実装パターン

## 実装例

ゲーム木の形は問わない汎用実装(子局面の列挙・終端判定・評価関数・手番をコールバックとして渡す)。時間切れになった瞬間、直前に完了した深さの最善手をそのまま返す。

```python
import time
from typing import Callable, TypeVar

State = TypeVar("State")


def iterative_deepening_minimax(
    root: State,
    get_children: Callable[[State], list[State]],
    is_terminal: Callable[[State], bool],
    evaluate: Callable[[State, bool], float],
    is_maximizing: Callable[[State], bool],
    time_limit: float,
) -> tuple[float, State | None]:
    """time_limit秒に達するまで深さ1,2,3...と探索を繰り返し、
    直前に完了した深さでの最善手(best_score, best_child)を返す。"""
    start = time.monotonic()
    best_score = 0.0
    best_child: State | None = None
    depth = 1

    def alphabeta(state: State, depth: int, alpha: float, beta: float, maximizing: bool) -> float:
        if time.monotonic() - start > time_limit:
            raise TimeoutError
        if depth == 0 or is_terminal(state):
            return evaluate(state, maximizing)
        children = get_children(state)
        if not children:
            return evaluate(state, maximizing)
        if maximizing:
            value = float("-inf")
            for child in children:
                value = max(value, alphabeta(child, depth - 1, alpha, beta, False))
                alpha = max(alpha, value)
                if alpha >= beta:
                    break
            return value
        else:
            value = float("inf")
            for child in children:
                value = min(value, alphabeta(child, depth - 1, alpha, beta, True))
                beta = min(beta, value)
                if alpha >= beta:
                    break
            return value

    while True:
        try:
            children = get_children(root)
            if not children:
                break
            maximizing_root = is_maximizing(root)
            scored = [
                (alphabeta(child, depth - 1, float("-inf"), float("inf"), not maximizing_root), child)
                for child in children
            ]
            scored.sort(key=lambda sc: sc[0], reverse=maximizing_root)
            best_score, best_child = scored[0]
            depth += 1
        except TimeoutError:
            break  # 直前に完了した深さの結果(best_score, best_child)を採用する

    return best_score, best_child
```

```typescript
function iterativeDeepeningMinimax<S>(
  root: S,
  getChildren: (s: S) => S[],
  isTerminal: (s: S) => boolean,
  evaluate: (s: S, maximizing: boolean) => number,
  isMaximizing: (s: S) => boolean,
  timeLimitMs: number
): { bestScore: number; bestChild: S | null } {
  const start = Date.now();
  let bestScore = 0;
  let bestChild: S | null = null;
  let depth = 1;

  function alphabeta(state: S, depth: number, alpha: number, beta: number, maximizing: boolean): number {
    if (Date.now() - start > timeLimitMs) throw new Error("timeout");
    if (depth === 0 || isTerminal(state)) return evaluate(state, maximizing);
    const children = getChildren(state);
    if (children.length === 0) return evaluate(state, maximizing);
    if (maximizing) {
      let value = -Infinity;
      for (const child of children) {
        value = Math.max(value, alphabeta(child, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    } else {
      let value = Infinity;
      for (const child of children) {
        value = Math.min(value, alphabeta(child, depth - 1, alpha, beta, true));
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return value;
    }
  }

  while (true) {
    try {
      const children = getChildren(root);
      if (children.length === 0) break;
      const maximizingRoot = isMaximizing(root);
      const scored = children.map((child) => ({
        score: alphabeta(child, depth - 1, -Infinity, Infinity, !maximizingRoot),
        child,
      }));
      scored.sort((a, b) => (maximizingRoot ? b.score - a.score : a.score - b.score));
      bestScore = scored[0].score;
      bestChild = scored[0].child;
      depth++;
    } catch {
      break; // 直前に完了した深さの結果(bestScore, bestChild)を採用する
    }
  }
  return { bestScore, bestChild };
}
```

```cpp
#include <vector>
#include <functional>
#include <limits>
#include <algorithm>
#include <chrono>
#include <optional>
#include <stdexcept>

template <typename State>
std::pair<double, std::optional<State>> iterativeDeepeningMinimax(
    const State& root,
    std::function<std::vector<State>(const State&)> getChildren,
    std::function<bool(const State&)> isTerminal,
    std::function<double(const State&, bool)> evaluate,
    std::function<bool(const State&)> isMaximizing,
    double timeLimitSec) {

    auto start = std::chrono::steady_clock::now();
    auto elapsed = [&]() {
        return std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
    };

    std::function<double(const State&, int, double, double, bool)> alphabeta =
        [&](const State& state, int depth, double alpha, double beta, bool maximizing) -> double {
        if (elapsed() > timeLimitSec) throw std::runtime_error("timeout");
        if (depth == 0 || isTerminal(state)) return evaluate(state, maximizing);
        auto children = getChildren(state);
        if (children.empty()) return evaluate(state, maximizing);
        if (maximizing) {
            double value = -std::numeric_limits<double>::infinity();
            for (const auto& child : children) {
                value = std::max(value, alphabeta(child, depth - 1, alpha, beta, false));
                alpha = std::max(alpha, value);
                if (alpha >= beta) break;
            }
            return value;
        } else {
            double value = std::numeric_limits<double>::infinity();
            for (const auto& child : children) {
                value = std::min(value, alphabeta(child, depth - 1, alpha, beta, true));
                beta = std::min(beta, value);
                if (alpha >= beta) break;
            }
            return value;
        }
    };

    double bestScore = 0.0;
    std::optional<State> bestChild;
    int depth = 1;

    while (true) {
        try {
            auto children = getChildren(root);
            if (children.empty()) break;
            bool maximizingRoot = isMaximizing(root);
            double bound1 = -std::numeric_limits<double>::infinity();
            double bound2 = std::numeric_limits<double>::infinity();
            double best = maximizingRoot ? bound1 : bound2;
            std::optional<State> bestOfDepth;
            for (const auto& child : children) {
                double score = alphabeta(child, depth - 1, bound1, bound2, !maximizingRoot);
                if (!bestOfDepth.has_value() ||
                    (maximizingRoot && score > best) ||
                    (!maximizingRoot && score < best)) {
                    best = score;
                    bestOfDepth = child;
                }
            }
            bestScore = best;
            bestChild = bestOfDepth;
            depth++;
        } catch (const std::runtime_error&) {
            break; // 直前に完了した深さの結果(bestScore, bestChild)を採用する
        }
    }

    return {bestScore, bestChild};
}
```

```rust
use std::time::Instant;

struct Timeout;

fn alphabeta<S: Clone>(
    state: &S,
    depth: i32,
    mut alpha: f64,
    mut beta: f64,
    maximizing: bool,
    start: &Instant,
    time_limit_sec: f64,
    get_children: &dyn Fn(&S) -> Vec<S>,
    is_terminal: &dyn Fn(&S) -> bool,
    evaluate: &dyn Fn(&S, bool) -> f64,
) -> Result<f64, Timeout> {
    if start.elapsed().as_secs_f64() > time_limit_sec {
        return Err(Timeout);
    }
    if depth == 0 || is_terminal(state) {
        return Ok(evaluate(state, maximizing));
    }
    let children = get_children(state);
    if children.is_empty() {
        return Ok(evaluate(state, maximizing));
    }
    if maximizing {
        let mut value = f64::NEG_INFINITY;
        for child in &children {
            value = value.max(alphabeta(child, depth - 1, alpha, beta, false, start, time_limit_sec, get_children, is_terminal, evaluate)?);
            alpha = alpha.max(value);
            if alpha >= beta {
                break;
            }
        }
        Ok(value)
    } else {
        let mut value = f64::INFINITY;
        for child in &children {
            value = value.min(alphabeta(child, depth - 1, alpha, beta, true, start, time_limit_sec, get_children, is_terminal, evaluate)?);
            beta = beta.min(value);
            if alpha >= beta {
                break;
            }
        }
        Ok(value)
    }
}

fn iterative_deepening_minimax<S: Clone>(
    root: &S,
    get_children: &dyn Fn(&S) -> Vec<S>,
    is_terminal: &dyn Fn(&S) -> bool,
    evaluate: &dyn Fn(&S, bool) -> f64,
    is_maximizing: &dyn Fn(&S) -> bool,
    time_limit_sec: f64,
) -> (f64, Option<S>) {
    let start = Instant::now();
    let mut best_score = 0.0;
    let mut best_child: Option<S> = None;
    let mut depth = 1;

    loop {
        let children = get_children(root);
        if children.is_empty() {
            break;
        }
        let maximizing_root = is_maximizing(root);
        let mut depth_best: Option<(f64, S)> = None;
        let mut timed_out = false;

        for child in &children {
            match alphabeta(child, depth - 1, f64::NEG_INFINITY, f64::INFINITY, !maximizing_root, &start, time_limit_sec, get_children, is_terminal, evaluate) {
                Ok(score) => {
                    let better = match &depth_best {
                        None => true,
                        Some((best, _)) => {
                            if maximizing_root { score > *best } else { score < *best }
                        }
                    };
                    if better {
                        depth_best = Some((score, child.clone()));
                    }
                }
                Err(Timeout) => {
                    timed_out = true;
                    break;
                }
            }
        }

        if timed_out {
            break; // 直前に完了した深さの結果(best_score, best_child)を採用する
        }
        if let Some((score, child)) = depth_best {
            best_score = score;
            best_child = Some(child);
        }
        depth += 1;
    }

    (best_score, best_child)
}
```

```csharp
static (double BestScore, T? BestChild) IterativeDeepeningMinimax<T>(
    T root,
    Func<T, List<T>> getChildren,
    Func<T, bool> isTerminal,
    Func<T, bool, double> evaluate,
    Func<T, bool> isMaximizing,
    double timeLimitSec)
{
    var start = DateTime.UtcNow;
    double bestScore = 0;
    T? bestChild = default;
    int depth = 1;

    double AlphaBeta(T state, int d, double alpha, double beta, bool maximizing)
    {
        if ((DateTime.UtcNow - start).TotalSeconds > timeLimitSec) throw new TimeoutException();
        if (d == 0 || isTerminal(state)) return evaluate(state, maximizing);
        var children = getChildren(state);
        if (children.Count == 0) return evaluate(state, maximizing);
        if (maximizing)
        {
            double value = double.NegativeInfinity;
            foreach (var child in children)
            {
                value = Math.Max(value, AlphaBeta(child, d - 1, alpha, beta, false));
                alpha = Math.Max(alpha, value);
                if (alpha >= beta) break;
            }
            return value;
        }
        else
        {
            double value = double.PositiveInfinity;
            foreach (var child in children)
            {
                value = Math.Min(value, AlphaBeta(child, d - 1, alpha, beta, true));
                beta = Math.Min(beta, value);
                if (alpha >= beta) break;
            }
            return value;
        }
    }

    while (true)
    {
        try
        {
            var children = getChildren(root);
            if (children.Count == 0) break;
            bool maximizingRoot = isMaximizing(root);
            var scored = children
                .Select(child => (Score: AlphaBeta(child, depth - 1, double.NegativeInfinity, double.PositiveInfinity, !maximizingRoot), Child: child))
                .ToList();
            scored.Sort((a, b) => maximizingRoot ? b.Score.CompareTo(a.Score) : a.Score.CompareTo(b.Score));
            bestScore = scored[0].Score;
            bestChild = scored[0].Child;
            depth++;
        }
        catch (TimeoutException)
        {
            break; // 直前に完了した深さの結果(bestScore, bestChild)を採用する
        }
    }

    return (bestScore, bestChild);
}
```
