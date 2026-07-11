"use client";

import { useEffect, useState } from "react";
import type { WorkerRequest, WorkerResponse } from "@/workers/algorithm-worker";

type WorkerResult<T> = {
  request: WorkerRequest;
  frames: T[];
};

/**
 * ステップ列の生成をalgorithm-workerに委譲するフック。
 * `request`は呼び出し側でuseMemoして参照を安定させること(参照が変わるたびWorkerを起動し直す)。
 * effect内で直接setStateすると react-hooks/set-state-in-effect に抵触するため、
 * 「computing中かどうか」はstateを持たず、resultのrequestと現在のrequestを比較して導出する。
 */
export function useWorkerFrames<T>(request: WorkerRequest) {
  const [result, setResult] = useState<WorkerResult<T> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const worker = new Worker(
      new URL("../../workers/algorithm-worker.ts", import.meta.url),
    );

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (cancelled) return;
      setResult({ request, frames: event.data.frames as T[] });
    };
    worker.postMessage(request);

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [request]);

  const isComputing = result === null || result.request !== request;
  const frames = result && result.request === request ? result.frames : [];

  return { frames, isComputing };
}
