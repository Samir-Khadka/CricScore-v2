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
            <AlertTriangle className="mx-auto text-red-500" size={36} />
            <p className="mt-3 text-xl font-space font-bold text-heading">
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
              className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer"
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
