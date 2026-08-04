---
name: Chandy-Lamportスナップショットアルゴリズム
category: 分散システム
subcategory: 障害検出・選出
complexity: O(E)(E=通信チャネルの数)
summary: 各ノードが独立したクロックしか持たず、メッセージ配送に遅延がある分散システムにおいて、「全ノードとチャネルを同時に停止させる」ことなく、全体として矛盾のない一貫した状態のスナップショットを記録する分散アルゴリズム。
---

## 概要

1台のコンピュータのメモリ状態をスナップショットするのは単純だが、複数のノードがネットワークでメッセージをやり取りしながら動いている分散システム全体の「その瞬間の状態」を記録するのは驚くほど難しい——[ベクタークロック](/algorithms/vector-clocks)が示す通り、分散システムには全ノードに共通する単一の「今」という時刻が存在しないため、ノードAの状態を記録した直後にノードBの状態を記録しても、その間にAからBへ送られたメッセージが「送信済みなのに未着信」という矛盾した状態として記録されてしまう可能性がある。1985年にK.マニ・チャンディ(Chandy)とレスリー・ランポート(Lamport、[Paxos](/algorithms/paxos)や[Raft](/algorithms/raft)の理論的基盤である論理時計の発明者でもある)が発表したこのアルゴリズムは、特別なマーカーメッセージを使うことで、システム全体を停止させることなく、通信チャネル上を飛んでいるメッセージまで含めて矛盾のない「一貫したグローバルスナップショット」を記録する方法を示した。

## 仕組み

1. 任意の1つのノード(発起ノード)が、自分自身のローカル状態を記録し、自分から出ている全ての通信チャネルに特別な「マーカー」メッセージを送信することでスナップショット処理を開始する
2. 各ノードは、あるチャネルから初めてマーカーを受け取った時点で: (a) 自分自身のローカル状態を記録する、(b) そのチャネルを「空」として記録する(マーカー受信前のそのチャネル上のメッセージは既に処理済みなので記録不要)、(c) 自分から出ている全ての他のチャネルにマーカーを送信する
3. あるチャネルから2回目以降にマーカーを受け取った場合、そのチャネルの状態として「前回のマーカー受信からこのマーカー受信までの間に、そのチャネル上で実際に受信した(まだ処理していなかった)メッセージの列」を記録する——これが「飛行中のメッセージ」を正しく捕捉する仕組みになっている
4. 全てのノードが全ての入力チャネルからマーカーを受け取り終えると、各ノードのローカル状態と各チャネルの記録済みメッセージ列を集めることで、システム全体の一貫したグローバルスナップショットが完成する
5. このスナップショットは実際に発生した瞬間の状態そのものではないかもしれないが、「実行の因果関係を壊さない、起こりえたはずの一貫した状態」であることが数学的に保証されている

## 特性・トレードオフ

- **計算量**: 各通信チャネルを通じてマーカーが1往復するだけなので`O(E)`(`E`=チャネル数)——実行を止めずに軽量なメッセージだけでスナップショットを完成させられる
- **「一貫したカット」という理論的な保証**: このアルゴリズムが記録するスナップショットは、[ベクタークロック](/algorithms/vector-clocks)の因果関係の理論で言う「一貫したカット」(あるメッセージの受信が記録されているなら、その送信も必ず記録されている、という条件)を満たすことが証明されている——実際の実行と完全に一致するとは限らないが、論理的に矛盾のない「あり得た状態」を捉えている
- **実行を停止させずに済むという実用上の利点**: システム全体を一時停止させてから状態を記録する素朴な方法と異なり、各ノードは通常の処理を続けながらマーカーの送受信という軽量な処理を挟むだけでよく、可用性への影響を最小限に抑えられる
- **使いどころ**: 分散システムのデバッグ・障害からのリカバリのためのチェックポイント記録、分散データベースのバックアップ、分散デッドロック検出(グローバルな状態を見て初めて検出できる循環待機の発見)、Apache Flinkのようなストリーム処理システムにおける正確に一度だけ(exactly-once)処理保証の実装基盤

## 実装例

各チャネルを、実際に配送される順序どおりの (`marker` または `msg`) イベント列として与え、マーカー受信をきっかけに各プロセスの状態記録・チャネルの記録開始/終了を行う簡略化したシミュレーションとして実装している(実際のネットワーク遅延やアプリケーションメッセージの生成は簡略化している)。

```python
from typing import Dict, List, Tuple

def chandy_lamport_snapshot(
    initial_states: Dict[str, int],
    channel_events: Dict[Tuple[str, str], List[Tuple[str, object]]],
    initiator: str,
) -> Tuple[Dict[str, int], Dict[Tuple[str, str], List[object]]]:
    """channel_events[(src,dst)] はそのチャネル上のFIFOイベント列
    (("msg", payload) または ("marker", None))。戻り値は記録された
    各プロセスの状態と、各チャネルの「飛行中」メッセージ。"""
    recorded_state: Dict[str, int] = {}
    recorded_channel: Dict[Tuple[str, str], List[object]] = {}
    recording: Dict[Tuple[str, str], bool] = {ch: False for ch in channel_events}
    marker_seen: Dict[Tuple[str, str], bool] = {ch: False for ch in channel_events}
    cursor = {ch: 0 for ch in channel_events}

    def start_snapshot(p: str) -> None:
        if p in recorded_state:
            return
        recorded_state[p] = initial_states[p]
        for (src, dst) in channel_events:
            if dst == p and not marker_seen[(src, dst)]:
                recording[(src, dst)] = True
                recorded_channel[(src, dst)] = []

    start_snapshot(initiator)

    pending = True
    while pending:
        pending = False
        for ch, events in channel_events.items():
            i = cursor[ch]
            if i >= len(events):
                continue
            pending = True
            kind, payload = events[i]
            cursor[ch] += 1
            _, dst = ch
            if kind == "marker":
                start_snapshot(dst)
                recording[ch] = False
                marker_seen[ch] = True
                recorded_channel.setdefault(ch, [])
            else:
                if recording.get(ch):
                    recorded_channel[ch].append(payload)

    return recorded_state, recorded_channel
```

```typescript
type ChannelKey = string; // `${src}->${dst}`
type ChannelEvent = ["marker", null] | ["msg", string];

function chandyLamportSnapshot(
  initialStates: Record<string, number>,
  channelEvents: Record<ChannelKey, ChannelEvent[]>,
  initiator: string
): { state: Record<string, number>; channels: Record<ChannelKey, string[]> } {
  const recordedState: Record<string, number> = {};
  const recordedChannel: Record<ChannelKey, string[]> = {};
  const recording: Record<ChannelKey, boolean> = {};
  const markerSeen: Record<ChannelKey, boolean> = {};
  const cursor: Record<ChannelKey, number> = {};
  const keys = Object.keys(channelEvents);
  for (const k of keys) {
    recording[k] = false;
    markerSeen[k] = false;
    cursor[k] = 0;
  }

  const dstOf = (key: ChannelKey) => key.split("->")[1];

  const startSnapshot = (p: string) => {
    if (p in recordedState) return;
    recordedState[p] = initialStates[p];
    for (const key of keys) {
      if (dstOf(key) === p && !markerSeen[key]) {
        recording[key] = true;
        recordedChannel[key] = [];
      }
    }
  };

  startSnapshot(initiator);

  let pending = true;
  while (pending) {
    pending = false;
    for (const key of keys) {
      const events = channelEvents[key];
      const i = cursor[key];
      if (i >= events.length) continue;
      pending = true;
      const [kind, payload] = events[i];
      cursor[key] += 1;
      const dst = dstOf(key);
      if (kind === "marker") {
        startSnapshot(dst);
        recording[key] = false;
        markerSeen[key] = true;
        if (!(key in recordedChannel)) recordedChannel[key] = [];
      } else {
        if (recording[key]) {
          recordedChannel[key].push(payload as string);
        }
      }
    }
  }

  return { state: recordedState, channels: recordedChannel };
}
```

```cpp
#include <string>
#include <vector>
#include <map>

struct ChannelEvent {
    std::string kind; // "marker" or "msg"
    std::string payload;
};

using ChannelKey = std::pair<std::string, std::string>;

struct SnapshotResult {
    std::map<std::string, int> state;
    std::map<ChannelKey, std::vector<std::string>> channels;
};

SnapshotResult chandyLamportSnapshot(
    const std::map<std::string, int>& initialStates,
    const std::map<ChannelKey, std::vector<ChannelEvent>>& channelEvents,
    const std::string& initiator) {

    std::map<std::string, int> recordedState;
    std::map<ChannelKey, std::vector<std::string>> recordedChannel;
    std::map<ChannelKey, bool> recording;
    std::map<ChannelKey, bool> markerSeen;
    std::map<ChannelKey, size_t> cursor;

    for (const auto& [key, events] : channelEvents) {
        recording[key] = false;
        markerSeen[key] = false;
        cursor[key] = 0;
    }

    auto startSnapshot = [&](const std::string& p) {
        if (recordedState.count(p)) return;
        recordedState[p] = initialStates.at(p);
        for (const auto& [key, events] : channelEvents) {
            if (key.second == p && !markerSeen[key]) {
                recording[key] = true;
                recordedChannel[key] = {};
            }
        }
    };

    startSnapshot(initiator);

    bool pending = true;
    while (pending) {
        pending = false;
        for (const auto& [key, events] : channelEvents) {
            size_t i = cursor[key];
            if (i >= events.size()) continue;
            pending = true;
            const ChannelEvent& ev = events[i];
            cursor[key] = i + 1;
            const std::string& dst = key.second;
            if (ev.kind == "marker") {
                startSnapshot(dst);
                recording[key] = false;
                markerSeen[key] = true;
                if (!recordedChannel.count(key)) recordedChannel[key] = {};
            } else if (recording[key]) {
                recordedChannel[key].push_back(ev.payload);
            }
        }
    }

    return {recordedState, recordedChannel};
}
```

```rust
use std::collections::HashMap;

#[derive(Clone)]
enum ChannelEvent {
    Marker,
    Msg(String),
}

type ChannelKey = (String, String);

fn start_snapshot(
    p: &str,
    initial_states: &HashMap<String, i64>,
    channel_events: &HashMap<ChannelKey, Vec<ChannelEvent>>,
    recorded_state: &mut HashMap<String, i64>,
    recorded_channel: &mut HashMap<ChannelKey, Vec<String>>,
    recording: &mut HashMap<ChannelKey, bool>,
    marker_seen: &HashMap<ChannelKey, bool>,
) {
    if recorded_state.contains_key(p) {
        return;
    }
    recorded_state.insert(p.to_string(), initial_states[p]);
    for key in channel_events.keys() {
        if key.1 == p && !marker_seen[key] {
            recording.insert(key.clone(), true);
            recorded_channel.insert(key.clone(), Vec::new());
        }
    }
}

fn chandy_lamport_snapshot(
    initial_states: &HashMap<String, i64>,
    channel_events: &HashMap<ChannelKey, Vec<ChannelEvent>>,
    initiator: &str,
) -> (HashMap<String, i64>, HashMap<ChannelKey, Vec<String>>) {
    let mut recorded_state: HashMap<String, i64> = HashMap::new();
    let mut recorded_channel: HashMap<ChannelKey, Vec<String>> = HashMap::new();
    let mut recording: HashMap<ChannelKey, bool> = HashMap::new();
    let mut marker_seen: HashMap<ChannelKey, bool> = HashMap::new();
    let mut cursor: HashMap<ChannelKey, usize> = HashMap::new();

    for key in channel_events.keys() {
        recording.insert(key.clone(), false);
        marker_seen.insert(key.clone(), false);
        cursor.insert(key.clone(), 0);
    }

    start_snapshot(initiator, initial_states, channel_events, &mut recorded_state, &mut recorded_channel, &mut recording, &marker_seen);

    let mut pending = true;
    while pending {
        pending = false;
        for (key, events) in channel_events {
            let i = cursor[key];
            if i >= events.len() {
                continue;
            }
            pending = true;
            let event = &events[i];
            cursor.insert(key.clone(), i + 1);
            let dst = &key.1;
            match event {
                ChannelEvent::Marker => {
                    start_snapshot(dst, initial_states, channel_events, &mut recorded_state, &mut recorded_channel, &mut recording, &marker_seen);
                    recording.insert(key.clone(), false);
                    marker_seen.insert(key.clone(), true);
                    recorded_channel.entry(key.clone()).or_insert_with(Vec::new);
                }
                ChannelEvent::Msg(payload) => {
                    if recording[key] {
                        recorded_channel.get_mut(key).unwrap().push(payload.clone());
                    }
                }
            }
        }
    }

    (recorded_state, recorded_channel)
}
```

```csharp
static (Dictionary<string, int> state, Dictionary<(string, string), List<string>> channels) ChandyLamportSnapshot(
    Dictionary<string, int> initialStates,
    Dictionary<(string, string), List<(string kind, string? payload)>> channelEvents,
    string initiator)
{
    var recordedState = new Dictionary<string, int>();
    var recordedChannel = new Dictionary<(string, string), List<string>>();
    var recording = new Dictionary<(string, string), bool>();
    var markerSeen = new Dictionary<(string, string), bool>();
    var cursor = new Dictionary<(string, string), int>();
    foreach (var key in channelEvents.Keys)
    {
        recording[key] = false;
        markerSeen[key] = false;
        cursor[key] = 0;
    }

    void StartSnapshot(string p)
    {
        if (recordedState.ContainsKey(p)) return;
        recordedState[p] = initialStates[p];
        foreach (var key in channelEvents.Keys)
        {
            if (key.Item2 == p && !markerSeen[key])
            {
                recording[key] = true;
                recordedChannel[key] = new List<string>();
            }
        }
    }

    StartSnapshot(initiator);

    bool pending = true;
    while (pending)
    {
        pending = false;
        foreach (var key in channelEvents.Keys)
        {
            var events = channelEvents[key];
            int i = cursor[key];
            if (i >= events.Count) continue;
            pending = true;
            var (kind, payload) = events[i];
            cursor[key] += 1;
            string dst = key.Item2;
            if (kind == "marker")
            {
                StartSnapshot(dst);
                recording[key] = false;
                markerSeen[key] = true;
                if (!recordedChannel.ContainsKey(key)) recordedChannel[key] = new List<string>();
            }
            else if (recording[key])
            {
                recordedChannel[key].Add(payload!);
            }
        }
    }

    return (recordedState, recordedChannel);
}
```
