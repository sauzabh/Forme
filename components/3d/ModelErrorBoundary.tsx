"use client";

import { Component, type ReactNode } from "react";
import { Html } from "@react-three/drei";

type Props = { children: ReactNode; height: number; resetKey: string };
type State = { failed: boolean; resetKey: string };

/**
 * If a model file fails to load (e.g. a network hiccup), show a quiet
 * message in its place instead of letting the whole studio crash.
 * Switching to another figure (a new `resetKey`) tries again.
 */
export default class ModelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Html center position={[0, this.props.height / 2, 0]}>
        <span style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--color-text-tertiary)" }}>
          Couldn’t load this figure — check your connection and reload the page.
        </span>
      </Html>
    );
  }
}
