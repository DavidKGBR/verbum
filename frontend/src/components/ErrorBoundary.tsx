import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Last-resort UI fallback when something throws below it.
 *
 * In production we want a calm reload prompt instead of a blank white page.
 * Sentry (when configured) auto-captures via its own boundary; this one is
 * a safety net for environments without Sentry and as belt-and-suspenders.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[Verbum] uncaught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "Georgia, 'Times New Roman', serif",
          background: "#fafaf7",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>
          Something went wrong.
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "1.5rem", textAlign: "center", maxWidth: 480 }}>
          A página encontrou um erro inesperado. Recarregue para tentar novamente.
          <br />
          <em>An unexpected error occurred. Please reload to try again.</em>
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.6rem 1.4rem",
            fontSize: "1rem",
            background: "#c8a951",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {this.state.error && import.meta.env.DEV && (
          <pre
            style={{
              marginTop: "2rem",
              maxWidth: "80vw",
              overflow: "auto",
              fontSize: "0.75rem",
              opacity: 0.6,
              padding: "1rem",
              background: "#f0ece2",
              borderRadius: 4,
            }}
          >
            {this.state.error.stack ?? this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
