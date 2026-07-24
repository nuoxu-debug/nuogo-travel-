import React from "react";

export class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-white px-6 text-center text-ink">
          <div className="max-w-md space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">Nuogo</p>
            <h1 className="font-display text-3xl font-black">页面暂时无法显示</h1>
            <p className="text-sm text-ink/60">
              请刷新页面，或返回规划页重新打开行程。
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/planner")}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-soft"
            >
              返回规划页
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
