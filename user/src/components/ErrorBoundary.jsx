import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Route-level error boundary: a bad render in one page degrades to an
 * inline error card instead of white-screening the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
          <div className="surface-card ring-1 ring-red-500/30 p-8 max-w-md w-full text-center">
            <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-red-500/15 ring-1 ring-red-500/30 text-red-500">
              <AlertTriangle size={26} strokeWidth={2.25} />
            </span>
            <p className="mt-4 text-xl font-display font-bold text-heading">
              Something went wrong
            </p>
            <p className="mt-2 text-sm text-subheading">
              This section failed to load. The rest of CricScore is still
              available.
            </p>
            {import.meta.env.DEV && this.state.error?.message && (
              <p className="mt-2 text-xs text-red-400 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-primary mt-5"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
