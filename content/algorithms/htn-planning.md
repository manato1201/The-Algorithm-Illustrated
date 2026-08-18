---
name: 階層型タスクネットワーク(HTN)プランニング
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(分解パターン数^タスク数)(ドメイン依存、一般には計算困難)
summary: 高レベルの抽象タスクを、実行可能な原始タスクだけになるまで作者が定義した規則(メソッド)に従って再帰的に分解していく、ドメイン知識を直接埋め込めるプランニング手法。
---

## 概要

古典的なプランニング(STRIPSに代表される状態空間探索型プランニング)は、初期状態から目標状態に至る行動系列を、行動の前提条件・効果だけを頼りに探索によって「発見」する。これに対し階層型タスクネットワーク(HTN)プランニングは、「攻撃拠点を制圧する」「敵を倒す」のような高レベルの抽象タスク(複合タスク)を出発点とし、そのタスクを達成するための具体的な手順を記述した**メソッド**という分解規則を、実行可能な原始タスク(直接実行できるアクション)だけになるまで再帰的に適用していく。古典的プランニングが「ゴールに到達する経路を白紙から探す」のに対し、HTNは「このタスクはこう分解するものだ」という設計者のドメイン知識をメソッドとして直接コード化する点が本質的に異なり、この違いによって探索空間が大幅に絞り込まれ、より予測可能で「それらしい」振る舞いの計画を高速に得られる。ホラーゲーム『F.E.A.R.』の敵AIをはじめ、リアルタイムのゲームAIで実用化されてきた代表的なプランニング手法である。

## 仕組み

1. **原始タスク(primitive task)**: 直接実行できるアクション。実行の前提条件と、実行後に世界の状態をどう変えるか(効果)を定義する(例: `MoveTo`、`Shoot`)
2. **複合タスク(compound task)**とその**メソッド(method)**: 複合タスクごとに、1つ以上の分解方法(メソッド)を用意する。各メソッドは適用条件(現在の状態でこの分解が意味を持つか)と、分解後のサブタスク列を持つ(例: `AttackBase`は、状況に応じて`[Scout, FlankLeft, Assault]`や`[Retreat]`といった異なるメソッドに分解されうる)
3. 計画したい最上位タスクを含むタスクネットワークから開始する
4. 未分解の複合タスクを1つ選び、現在の世界状態で適用条件を満たすメソッドを選んで、そのタスクをメソッドのサブタスク列に置き換える
5. 全てのタスクが原始タスクになるまで4を再帰的に繰り返す。原始タスクは前提条件を満たすかを逐次チェックしながら世界状態をシミュレートし、途中で前提条件を満たせなくなったら他のメソッドに切り替えてバックトラックする
6. 最終的に残った原始タスクの並びが、実行可能な計画(アクション系列)になる

## 特性・トレードオフ

- **ドメイン知識の埋め込み**: メソッドの定義そのものに「妥当なやり方」に関する専門知識を直接コード化できるため、状態空間を盲目的に探索する古典的プランニングに比べ探索空間が劇的に絞り込まれ、実用的な速度で計画を生成できる
- **予測可能で「らしい」振る舞い**: 生成される計画は、設計者が用意したメソッドに沿った「意図した戦術」に従うため、ゲームAIとして「賢いが不自然」な奇抜な計画ではなく、プレイヤーから見て納得感のある行動になりやすい。これはリアルタイムストラテジーやスクワッド戦術のようなゲームAIで重視される性質である
- **表現力とオーサリングコストのトレードオフ**: 状態到達可能性だけでなく手続き的な戦術知識(「まず偵察してから側面を突く」等)を直接表現できる分、古典的な目標指向探索よりも表現力が高い一方、その分解知識を人間が事前に用意する必要があり、想定していない状況をカバーするメソッドが存在しなければ、実際には解が存在していてもプランニングが失敗しうる
- **使いどころ**: リアルタイムストラテジーやスクワッド単位の戦術AI、NPCの行動計画(『F.E.A.R.』の敵AIが著名な実例)、ロボティクスのタスク計画、業務ワークフローの自動化。同じ「意思決定」の枠組みでも、[モンテカルロ木探索](/algorithms/monte-carlo-tree-search)がドメイン知識なしにシミュレーションだけで手を評価するのとは対照的に、HTNは人間の持つ手続き的知識を計画の骨格として活かす

## 実装例

```python
from dataclasses import dataclass
from typing import Callable


@dataclass
class PrimitiveTask:
    name: str
    precondition: Callable[[dict], bool]
    effect: Callable[[dict], dict]


@dataclass
class Method:
    name: str
    precondition: Callable[[dict], bool]
    subtasks: list[str]  # 参照するタスク名の並び(複合/原始いずれも可)


class HTNPlanner:
    def __init__(self) -> None:
        self.primitives: dict[str, PrimitiveTask] = {}
        self.methods: dict[str, list[Method]] = {}  # 複合タスク名 -> 候補メソッド群

    def add_primitive(self, task: PrimitiveTask) -> None:
        self.primitives[task.name] = task

    def add_method(self, compound_name: str, method: Method) -> None:
        self.methods.setdefault(compound_name, []).append(method)

    def plan(self, tasks: list[str], state: dict) -> list[str] | None:
        """タスク列を先頭から分解し、実行可能な原始タスクの列に展開する。失敗時はNoneを返す"""
        if not tasks:
            return []

        task_name, rest = tasks[0], tasks[1:]

        if task_name in self.primitives:
            prim = self.primitives[task_name]
            if not prim.precondition(state):
                return None
            new_state = prim.effect(state)
            remaining_plan = self.plan(rest, new_state)
            if remaining_plan is None:
                return None
            return [task_name] + remaining_plan

        # 複合タスク: 適用可能なメソッドを順に試し、最初に成功した分解を採用する(バックトラック探索)
        for method in self.methods.get(task_name, []):
            if method.precondition(state):
                expanded = method.subtasks + rest
                result = self.plan(expanded, state)
                if result is not None:
                    return result
        return None


# 使用例: 「拠点を制圧する」複合タスクを、弾薬の有無に応じて強襲/撤退のいずれかに分解する
planner = HTNPlanner()
planner.add_primitive(PrimitiveTask("Scout", lambda s: True, lambda s: {**s, "scouted": True}))
planner.add_primitive(
    PrimitiveTask("Assault", lambda s: s.get("ammo", 0) > 0, lambda s: {**s, "captured": True})
)
planner.add_primitive(PrimitiveTask("Retreat", lambda s: True, lambda s: {**s, "retreated": True}))

planner.add_method("CaptureBase", Method("assault_plan", lambda s: s.get("ammo", 0) > 0, ["Scout", "Assault"]))
planner.add_method("CaptureBase", Method("retreat_plan", lambda s: s.get("ammo", 0) == 0, ["Scout", "Retreat"]))

print(planner.plan(["CaptureBase"], {"ammo": 3}))  # ['Scout', 'Assault']
print(planner.plan(["CaptureBase"], {"ammo": 0}))  # ['Scout', 'Retreat']
```

```typescript
interface PrimitiveTask {
  name: string;
  precondition: (state: Record<string, unknown>) => boolean;
  effect: (state: Record<string, unknown>) => Record<string, unknown>;
}

interface Method {
  name: string;
  precondition: (state: Record<string, unknown>) => boolean;
  subtasks: string[]; // 参照するタスク名の並び(複合/原始いずれも可)
}

class HTNPlanner {
  private primitives = new Map<string, PrimitiveTask>();
  private methods = new Map<string, Method[]>(); // 複合タスク名 -> 候補メソッド群

  addPrimitive(task: PrimitiveTask): void {
    this.primitives.set(task.name, task);
  }

  addMethod(compoundName: string, method: Method): void {
    const list = this.methods.get(compoundName) ?? [];
    list.push(method);
    this.methods.set(compoundName, list);
  }

  plan(tasks: string[], state: Record<string, unknown>): string[] | null {
    // タスク列を先頭から分解し、実行可能な原始タスクの列に展開する。失敗時はnullを返す
    if (tasks.length === 0) return [];

    const [taskName, ...rest] = tasks;
    const prim = this.primitives.get(taskName);

    if (prim) {
      if (!prim.precondition(state)) return null;
      const newState = prim.effect(state);
      const remainingPlan = this.plan(rest, newState);
      if (remainingPlan === null) return null;
      return [taskName, ...remainingPlan];
    }

    // 複合タスク: 適用可能なメソッドを順に試し、最初に成功した分解を採用する(バックトラック探索)
    for (const method of this.methods.get(taskName) ?? []) {
      if (method.precondition(state)) {
        const expanded = [...method.subtasks, ...rest];
        const result = this.plan(expanded, state);
        if (result !== null) return result;
      }
    }
    return null;
  }
}

// 使用例: 「拠点を制圧する」複合タスクを、弾薬の有無に応じて強襲/撤退のいずれかに分解する
const planner = new HTNPlanner();
planner.addPrimitive({
  name: "Scout",
  precondition: () => true,
  effect: (s) => ({ ...s, scouted: true }),
});
planner.addPrimitive({
  name: "Assault",
  precondition: (s) => (s.ammo as number) > 0,
  effect: (s) => ({ ...s, captured: true }),
});
planner.addPrimitive({
  name: "Retreat",
  precondition: () => true,
  effect: (s) => ({ ...s, retreated: true }),
});

planner.addMethod("CaptureBase", {
  name: "assault_plan",
  precondition: (s) => (s.ammo as number) > 0,
  subtasks: ["Scout", "Assault"],
});
planner.addMethod("CaptureBase", {
  name: "retreat_plan",
  precondition: (s) => (s.ammo as number) === 0,
  subtasks: ["Scout", "Retreat"],
});

console.log(planner.plan(["CaptureBase"], { ammo: 3 })); // ['Scout', 'Assault']
console.log(planner.plan(["CaptureBase"], { ammo: 0 })); // ['Scout', 'Retreat']
```
