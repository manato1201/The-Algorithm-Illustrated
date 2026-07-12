"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkerRequest, WorkerResponse } from "@/workers/algorithm-worker";

type WorkerResult<T> = {
  request: WorkerRequest;
  frames: T[];
};

/**
 * postMessageは構造化クローンを介すため、返ってきたrequestは元のオブジェクトと参照が異なる。
 * そのためWorker結果の相関は参照比較(===)ではなく値比較で行う。
 */
function sameRequest(a: WorkerRequest, b: WorkerRequest): boolean {
  if (a.kind !== b.kind || a.algorithmId !== b.algorithmId) return false;
  if (a.kind === "sort" && b.kind === "sort") {
    return (
      a.input.length === b.input.length &&
      a.input.every((value, index) => value === b.input[index])
    );
  }
  return true;
}

/**
 * ステップ列の生成をalgorithm-workerに委譲するフック。
 * `request`は呼び出し側でuseMemoして参照を安定させること(参照が変わるたびpostMessageし直す)。
 * Workerインスタンス自体はコンポーネントのマウント中1つだけ生成し、requestが変わるたびに使い回す
 * (以前はrequestが変わるたびに新規Workerを生成・破棄していた)。
 * effect内で直接setStateすると react-hooks/set-state-in-effect に抵触するため、
 * 「computing中かどうか」はstateを持たず、resultのrequestと現在のrequestを比較して導出する。
 */
export function useWorkerFrames<T>(request: WorkerRequest) {
  const [result, setResult] = useState<WorkerResult<T> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../../workers/algorithm-worker.ts", import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      setResult({ request: event.data.request, frames: event.data.frames as T[] });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage(request);
  }, [request]);

  const isComputing = result === null || !sameRequest(result.request, request);
  const frames = result && sameRequest(result.request, request) ? result.frames : [];

  return { frames, isComputing };
}
