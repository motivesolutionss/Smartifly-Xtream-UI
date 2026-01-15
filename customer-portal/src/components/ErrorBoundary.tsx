"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <section className="section relative overflow-hidden min-h-screen flex items-center">
          {/* Background Effects */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10" />

          <div className="container relative z-10">
            <div className="max-w-xl mx-auto">
              <div className="glass-card glass-card-xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-destructive/10 rounded-full blur-3xl" />

                <div className="relative z-10 py-8">
                  <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
                    Something Went Wrong
                  </h2>

                  <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                    We encountered an unexpected error. Please try refreshing the page or return to the homepage.
                  </p>

                  {process.env.NODE_ENV === "development" && this.state.error && (
                    <div className="mb-6 p-4 bg-destructive/5 rounded-lg text-left">
                      <p className="text-xs font-mono text-destructive break-all">
                        {this.state.error.toString()}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={this.handleReset}
                      className="btn-primary hover-lift"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Link href="/">
                      <Button className="btn-outline hover-lift-sm">
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
              </div>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

