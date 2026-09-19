import React from "react";

// Without a boundary, one uncaught render error unmounts the entire React
// tree and leaves a blank white page (this is exactly how opening a
// coach-digest report used to fail). This contains the blast radius to the
// piece of UI that actually broke:
//   "page"  -- last-resort catch around the whole app; offers a reload.
//   "panel" -- around the current tab's content; the top bar and bottom nav
//              stay usable, and switching tabs (resetKey) clears the error.
//   "modal" -- inside the shared Modal sheet, so a crash in any modal's
//              content shows a message with a working Close button instead
//              of taking the app down.
// Render errors never touch saved data -- everything persists through the
// normal save path, not through rendering -- so the copy says so.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Keepr UI error caught by boundary:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { variant = "panel", onClose } = this.props;
    const body = (
      <div role="alert">
        <div className="text-base font-black mb-1" style={{ color: "#12213A" }}>Something went wrong showing this</div>
        <p className="text-sm text-gray-600 mb-4">
          It's a display problem, not a lost save — anything you've already logged is still there.
        </p>
        <div className="flex gap-2">
          {variant === "page" ? (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: "#0E8388" }}
            >
              Reload Keepr
            </button>
          ) : (
            <>
              {variant === "modal" && onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold border"
                  style={{ borderColor: "#DAD7CC", color: "#12213A" }}
                >
                  Close
                </button>
              )}
              <button
                onClick={this.reset}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                style={{ background: "#0E8388" }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );

    if (variant === "page") {
      return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F3F2ED", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <div className="w-full max-w-sm">{body}</div>
        </div>
      );
    }
    if (variant === "modal") return <div className="py-2">{body}</div>;
    return (
      <div className="px-4 pt-6">
        <div className="bg-white rounded-lg border p-4" style={{ borderColor: "#DAD7CC" }}>{body}</div>
      </div>
    );
  }
}
