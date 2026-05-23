import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../../utils/logger";
import { ErrorView } from "./ErrorView";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Unhandled React error", { error, errorInfo });
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorView
          message="The app hit an unexpected error. Please try again."
          onRetry={this.reset}
          showBackToLogin
        />
      );
    }

    return this.props.children;
  }
}
