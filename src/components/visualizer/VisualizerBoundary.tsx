"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * 可視化 1 つの例外で、ページ全体(解説・擬似コード・関連)が落ちないようにする。
 * 可視化の部分だけを「表示できませんでした」に置き換え、「もう一度」で作り直せる。
 */
export class VisualizerBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("visualizer failed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ padding: "1.25rem", border: "1px dashed currentColor", borderRadius: 8, opacity: 0.85 }}>
        <p style={{ margin: "0 0 0.75rem" }}>この図を表示できませんでした。解説は、下にそのまま読めます。</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>
          もう一度表示する
        </button>
      </div>
    );
  }
}
