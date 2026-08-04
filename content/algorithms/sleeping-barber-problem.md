---
name: 眠い床屋問題(Sleeping Barber Problem)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の待合室への出入り・散髪の同期処理)
summary: 床屋(サーバー)が客がいないときは眠り、客(クライアント)が来たら起こして散髪する、待合室の椅子数という有限のバッファ容量を持つ生産者・消費者問題の変種で、[生産者・消費者問題](/algorithms/producer-consumer-semaphore)の考え方をリソースプール(サーバー1人+待合席複数)のモデルに応用したもの。
---

## 概要

[生産者・消費者問題](/algorithms/producer-consumer-semaphore)は「作る側」と「使う側」が有限のバッファを介してやり取りする同期問題だが、1965年にエドガー・ダイクストラ(Dijkstra)が提示した眠い床屋問題は、これをより具体的で直感的な状況——1人の床屋(サーバー)と有限の椅子数を持つ待合室——に落とし込んだバリエーションである。床屋は客がいなければ眠り、客が来たら起きて散髪する。待合室の椅子が満席のときに来た客はそのまま帰ってしまう。この設定は「1人のサーバーが複数のクライアントからのリクエストを、有限のキュー容量のもとでどう安全に処理するか」という、Webサーバーやタスクキューの設計にそのまま通じる普遍的な構造を持つ。

## 仕組み

1. 3つの同期変数を用意する: `customers`(待っている客の数を表すセマフォ、床屋を起こすシグナルとして使う)、`barbers`(床屋が空いているかを表すセマフォ)、待合室の椅子数を数える相互排他用のロック(または整数変数)
2. **床屋のループ**: 床屋は`customers`セマフォを待つ(客がいなければここで眠って待機する)。客が来てシグナルが送られたら起床し、`barbers`セマフォを1つ増やして「散髪可能」を通知し、その客の散髪を行う
3. **客のループ**: 客が到着すると、まず待合室の椅子に空きがあるかを相互排他的に確認する。空きがなければ、その客はそのまま帰る(サービスを受けられずに立ち去る)。空きがあれば椅子に座り(待合室の人数を1増やす)、`customers`セマフォを1つ増やして床屋を起こす
4. 客は`barbers`セマフォを待ち、床屋が空いた合図を受け取ったら椅子から立って散髪を受ける
5. 散髪が終わったら、床屋は再び手順2に戻って次の客(または眠り)を待つ

## 特性・トレードオフ

- **計算量**: 1人の客の来店・散髪・退店にかかる同期処理は定数時間`O(1)`——問題の焦点は計算量ではなく、複数のプロセス(床屋・複数の客)が競合状態やデッドロックを起こさずに安全に同期できるかという設計の正しさにある
- **有限バッファという制約が導く「あふれ」の扱い**: [生産者・消費者問題](/algorithms/producer-consumer-semaphore)の基本形は「バッファが満杯なら生産者が待つ」という前提だが、眠い床屋問題では「満席なら客がそのまま諦めて帰る」という、システムが過負荷時に新規リクエストを拒否する(オーバーフロー時にドロップする)という異なる振る舞いをモデル化している——実際のWebサーバーが接続過多時に新規リクエストを拒否する挙動と同じ構造である
- **[読者・書込者問題](/algorithms/readers-writers-problem)との対比**: [読者・書込者問題](/algorithms/readers-writers-problem)が「複数の読者は同時アクセス可、書込者は排他」という異なるアクセス権限を扱うのに対し、眠い床屋問題は「1人のサーバーと有限のキュー」という単純なリソース制約に焦点を当てる——並行処理の同期問題の中でも扱う制約の種類がそれぞれ異なる、教育的に補完し合う古典的な問題群になっている
- **セマフォの誤用によるデッドロック・スプリアスウェイクアップのリスク**: この問題の実装は一見単純に見えるが、セマフォの初期値やチェック順序を誤ると、床屋が客の到着を見逃す、あるいは複数の客が同時に散髪を受けようとする競合状態が発生しうる——並行プログラミングにおける同期プリミティブの正しい使い方を学ぶ教材として重視される理由になっている
- **使いどころ**: サーバー・クライアントモデルにおけるリクエストキューの設計(接続プールの有限容量とオーバーフロー時の挙動)、タスクキューシステムにおけるワーカープロセスの待機・起床ロジック、オペレーティングシステムの授業における同期プリミティブ(セマフォ)の教育的な演習問題

## 実装例

実際のスレッド・セマフォを使った実装は本質的に非決定的で言語間の結果比較が難しいため、ここでは「客の到着時刻・待合室の椅子数・散髪時間」を入力とする決定的な離散イベントシミュレーションとして、床屋と客の同期の意味論(空いていれば即座に散髪、満席ならバルクして帰る)を実装する。2人が同時刻に到着し、待合室(椅子2脚)が満席のため1人がバルクする、というシナリオで各客の散髪開始・終了時刻とバルクの有無を検証している。

```python
from __future__ import annotations


def simulate_sleeping_barber(
    arrivals: list[tuple[float, str]], capacity: int, service_time: float
) -> tuple[list[str], list[str], dict[str, tuple[float, float]]]:
    """
    到着イベント列(到着時刻, 客ID)を時刻順に処理する決定的なシミュレーション。
    床屋が空いていて待合室も空なら即座に散髪開始(=眠っていた床屋が起こされて働く)。
    床屋が別の客を散髪中なら、待合室の椅子(capacity席)に空きがあれば待ち、
    満席ならその客はそのまま帰る(バルク)。
    戻り値: (散髪された順の客ID列, バルクした客ID列, 客ID -> (開始時刻, 終了時刻))
    """
    barber_free_at = 0.0
    queue: list[str] = []
    served_order: list[str] = []
    balked: list[str] = []
    timing: dict[str, tuple[float, float]] = {}

    def drain_queue_up_to(now: float) -> None:
        nonlocal barber_free_at
        while queue and barber_free_at <= now:
            next_cid = queue.pop(0)
            start = barber_free_at
            end = start + service_time
            timing[next_cid] = (start, end)
            served_order.append(next_cid)
            barber_free_at = end

    for arrival_time, cid in arrivals:
        drain_queue_up_to(arrival_time)
        if barber_free_at <= arrival_time and not queue:
            start = arrival_time
            end = start + service_time
            timing[cid] = (start, end)
            served_order.append(cid)
            barber_free_at = end
        elif len(queue) < capacity:
            queue.append(cid)
        else:
            balked.append(cid)

    while queue:
        next_cid = queue.pop(0)
        start = barber_free_at
        end = start + service_time
        timing[next_cid] = (start, end)
        served_order.append(next_cid)
        barber_free_at = end

    return served_order, balked, timing
```

```typescript
interface SimResult {
  served: string[];
  balked: string[];
  timing: Map<string, [number, number]>;
}

function simulateSleepingBarber(arrivals: [number, string][], capacity: number, serviceTime: number): SimResult {
  let barberFreeAt = 0;
  const queue: string[] = [];
  const served: string[] = [];
  const balked: string[] = [];
  const timing = new Map<string, [number, number]>();

  function drainQueueUpTo(now: number): void {
    while (queue.length > 0 && barberFreeAt <= now) {
      const nextCid = queue.shift()!;
      const start = barberFreeAt;
      const end = start + serviceTime;
      timing.set(nextCid, [start, end]);
      served.push(nextCid);
      barberFreeAt = end;
    }
  }

  for (const [arrivalTime, cid] of arrivals) {
    drainQueueUpTo(arrivalTime);
    if (barberFreeAt <= arrivalTime && queue.length === 0) {
      const start = arrivalTime;
      const end = start + serviceTime;
      timing.set(cid, [start, end]);
      served.push(cid);
      barberFreeAt = end;
    } else if (queue.length < capacity) {
      queue.push(cid);
    } else {
      balked.push(cid);
    }
  }

  while (queue.length > 0) {
    const nextCid = queue.shift()!;
    const start = barberFreeAt;
    const end = start + serviceTime;
    timing.set(nextCid, [start, end]);
    served.push(nextCid);
    barberFreeAt = end;
  }

  return { served, balked, timing };
}
```

```cpp
#include <string>
#include <vector>
#include <deque>
#include <unordered_map>
#include <utility>

struct SimResult {
    std::vector<std::string> served;
    std::vector<std::string> balked;
    std::unordered_map<std::string, std::pair<double, double>> timing;
};

SimResult simulateSleepingBarber(const std::vector<std::pair<double, std::string>>& arrivals, int capacity, double serviceTime) {
    double barberFreeAt = 0.0;
    std::deque<std::string> queue;
    SimResult result;

    auto drainQueueUpTo = [&](double now) {
        while (!queue.empty() && barberFreeAt <= now) {
            std::string nextCid = queue.front();
            queue.pop_front();
            double start = barberFreeAt;
            double end = start + serviceTime;
            result.timing[nextCid] = {start, end};
            result.served.push_back(nextCid);
            barberFreeAt = end;
        }
    };

    for (const auto& [arrivalTime, cid] : arrivals) {
        drainQueueUpTo(arrivalTime);
        if (barberFreeAt <= arrivalTime && queue.empty()) {
            double start = arrivalTime;
            double end = start + serviceTime;
            result.timing[cid] = {start, end};
            result.served.push_back(cid);
            barberFreeAt = end;
        } else if (static_cast<int>(queue.size()) < capacity) {
            queue.push_back(cid);
        } else {
            result.balked.push_back(cid);
        }
    }

    while (!queue.empty()) {
        std::string nextCid = queue.front();
        queue.pop_front();
        double start = barberFreeAt;
        double end = start + serviceTime;
        result.timing[nextCid] = {start, end};
        result.served.push_back(nextCid);
        barberFreeAt = end;
    }

    return result;
}
```

```rust
use std::collections::{HashMap, VecDeque};

struct SimResult {
    served: Vec<String>,
    balked: Vec<String>,
    timing: HashMap<String, (f64, f64)>,
}

fn simulate_sleeping_barber(arrivals: &[(f64, &str)], capacity: usize, service_time: f64) -> SimResult {
    let mut barber_free_at = 0.0f64;
    let mut queue: VecDeque<String> = VecDeque::new();
    let mut served: Vec<String> = Vec::new();
    let mut balked: Vec<String> = Vec::new();
    let mut timing: HashMap<String, (f64, f64)> = HashMap::new();

    let drain_queue_up_to = |now: f64,
                              barber_free_at: &mut f64,
                              queue: &mut VecDeque<String>,
                              served: &mut Vec<String>,
                              timing: &mut HashMap<String, (f64, f64)>| {
        while !queue.is_empty() && *barber_free_at <= now {
            let next_cid = queue.pop_front().unwrap();
            let start = *barber_free_at;
            let end = start + service_time;
            timing.insert(next_cid.clone(), (start, end));
            served.push(next_cid);
            *barber_free_at = end;
        }
    };

    for &(arrival_time, cid) in arrivals {
        drain_queue_up_to(arrival_time, &mut barber_free_at, &mut queue, &mut served, &mut timing);
        if barber_free_at <= arrival_time && queue.is_empty() {
            let start = arrival_time;
            let end = start + service_time;
            timing.insert(cid.to_string(), (start, end));
            served.push(cid.to_string());
            barber_free_at = end;
        } else if queue.len() < capacity {
            queue.push_back(cid.to_string());
        } else {
            balked.push(cid.to_string());
        }
    }

    while let Some(next_cid) = queue.pop_front() {
        let start = barber_free_at;
        let end = start + service_time;
        timing.insert(next_cid.clone(), (start, end));
        served.push(next_cid);
        barber_free_at = end;
    }

    SimResult { served, balked, timing }
}
```

```csharp
static (List<string> served, List<string> balked, Dictionary<string, (double, double)> timing) SimulateSleepingBarber(
    List<(double time, string cid)> arrivals, int capacity, double serviceTime)
{
    double barberFreeAt = 0;
    var queue = new List<string>();
    var served = new List<string>();
    var balked = new List<string>();
    var timing = new Dictionary<string, (double, double)>();

    void DrainQueueUpTo(double now)
    {
        while (queue.Count > 0 && barberFreeAt <= now)
        {
            var nextCid = queue[0];
            queue.RemoveAt(0);
            double start = barberFreeAt;
            double end = start + serviceTime;
            timing[nextCid] = (start, end);
            served.Add(nextCid);
            barberFreeAt = end;
        }
    }

    foreach (var (arrivalTime, cid) in arrivals)
    {
        DrainQueueUpTo(arrivalTime);
        if (barberFreeAt <= arrivalTime && queue.Count == 0)
        {
            double start = arrivalTime;
            double end = start + serviceTime;
            timing[cid] = (start, end);
            served.Add(cid);
            barberFreeAt = end;
        }
        else if (queue.Count < capacity)
        {
            queue.Add(cid);
        }
        else
        {
            balked.Add(cid);
        }
    }

    while (queue.Count > 0)
    {
        var nextCid = queue[0];
        queue.RemoveAt(0);
        double start = barberFreeAt;
        double end = start + serviceTime;
        timing[nextCid] = (start, end);
        served.Add(nextCid);
        barberFreeAt = end;
    }

    return (served, balked, timing);
}
```
