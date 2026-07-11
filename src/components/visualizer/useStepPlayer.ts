"use client";

import { useCallback, useEffect, useState } from "react";

const PLAY_INTERVAL_MS = 400;

/**
 * フレーム列の再生状態を管理する共通フック(SortVisualizer/PathfindingVisualizerで共用)。
 * effect内で直接setStateせず、setTimeoutコールバック内でのみ呼ぶことでreact-hooks/set-state-in-effectを回避している。
 */
export function useStepPlayer(frameCount: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || stepIndex >= frameCount - 1) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, frameCount - 1));
    }, PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, frameCount]);

  const isFinished = stepIndex >= frameCount - 1;
  const showPause = isPlaying && !isFinished;

  const handlePlayPause = useCallback(() => {
    if (stepIndex >= frameCount - 1) {
      setStepIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((playing) => !playing);
  }, [stepIndex, frameCount]);

  const handleStep = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setStepIndex((i) => Math.min(Math.max(i + delta, 0), frameCount - 1));
    },
    [frameCount],
  );

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  return {
    stepIndex: Math.min(stepIndex, Math.max(frameCount - 1, 0)),
    isFinished,
    showPause,
    handlePlayPause,
    handleStep,
    reset,
  };
}
