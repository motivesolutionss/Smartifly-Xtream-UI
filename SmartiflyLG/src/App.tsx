import { Component, type ComponentType, type ErrorInfo, useEffect, useState } from 'react';
import {
  bootScreen,
  contentScreen,
  eyebrow,
  heroCopy,
  mergeStyle
} from './styles/lgTvStyles';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onError: (message: string) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class StartupErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error);
    const details = info.componentStack?.trim();
    this.props.onError(details ? `${message}\n${details}` : message);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [RouterComponent, setRouterComponent] = useState<ComponentType | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isBooting) {
      return;
    }

    let isMounted = true;

    void import('./navigation/Router')
      .then((module) => {
        if (!isMounted) {
          return;
        }

        setRouterComponent(() => module.default);
        setStartupError(null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown startup error';
        setStartupError(message);
      });

    return () => {
      isMounted = false;
    };
  }, [isBooting]);

  const startupShellStyle = mergeStyle(contentScreen, {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.14), transparent 26%), linear-gradient(145deg, #040507 0%, #0b0f15 52%, #020304 100%)'
  });

  if (isBooting) {
    return (
      <main style={bootScreen}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03), transparent 24%), radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.08), transparent 34%)',
            filter: 'blur(6px)'
          }}
        />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            aria-hidden="true"
            style={{
              position: 'relative',
              width: '92px',
              height: '92px',
              borderRadius: '999px',
              border: '5px solid rgba(255, 255, 255, 0.08)',
              borderTopColor: '#e50914',
              animation: 'spin 1.1s linear infinite',
              boxShadow: '0 0 36px rgba(229, 9, 20, 0.18)'
            }}
          />
          <img src="./assets/smartifly_icon.png" alt="Smartifly" style={{ width: '236px', maxWidth: '42vw', marginTop: '2px' }} />
          <p
            style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '5px',
              textTransform: 'uppercase'
            }}
          >
            PREMIUM STREAMING ENGINE
          </p>
        </div>
        <div
          aria-hidden="true"
          style={{
            width: '56vw',
            maxWidth: '320px',
            height: '7px',
            padding: '1px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(229, 9, 20, 0.12)'
          }}
        >
          <div
            style={{
              width: '38%',
              height: '100%',
              borderRadius: 'inherit',
              background: 'linear-gradient(90deg, #ff5d67, #e50914)',
              animation: 'boot-progress 1.2s ease-in-out infinite alternate'
            }}
          />
        </div>
        <p
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '38px',
            margin: 0,
            color: 'rgba(255, 255, 255, 0.22)',
            fontSize: '9px',
            letterSpacing: '3px',
            textAlign: 'center'
          }}
        >
          v2025.05 • STABLE BUILD
        </p>
      </main>
    );
  }

  if (startupError) {
    return (
      <main style={startupShellStyle}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03), transparent 24%), radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.08), transparent 34%)',
            filter: 'blur(8px)'
          }}
        />
        <section
          aria-label="Startup error"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'calc(100vw - 64px)',
            maxWidth: '640px',
            padding: '42px 44px',
            borderRadius: '28px',
            background: 'linear-gradient(180deg, rgba(10, 13, 18, 0.96), rgba(13, 17, 24, 0.92))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.42), 0 0 40px rgba(229, 9, 20, 0.08)',
            textAlign: 'center'
          }}
        >
          <p style={eyebrow}>Startup Error</p>
          <h1 style={{ margin: '14px 0 0', color: '#fff', fontSize: '42px', fontWeight: 900 }}>Smartifly could not open</h1>
          <p style={heroCopy}>
            The LG app loaded, but the main application crashed before first render.
          </p>
          <p style={{ margin: '18px 0 0', color: 'rgba(255, 255, 255, 0.56)', fontSize: '14px' }}>{startupError}</p>
        </section>
      </main>
    );
  }

  if (!RouterComponent) {
    return (
      <main style={startupShellStyle}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03), transparent 24%), radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.08), transparent 34%)',
            filter: 'blur(8px)'
          }}
        />
        <section
          aria-label="Loading application shell"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'calc(100vw - 64px)',
            maxWidth: '640px',
            padding: '42px 44px',
            borderRadius: '28px',
            background: 'linear-gradient(180deg, rgba(10, 13, 18, 0.96), rgba(13, 17, 24, 0.92))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.42), 0 0 40px rgba(229, 9, 20, 0.08)',
            textAlign: 'center'
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '88px',
              height: '88px',
              margin: '0 auto 20px',
              borderRadius: '999px',
              border: '5px solid rgba(255, 255, 255, 0.08)',
              borderTopColor: '#e50914',
              boxShadow: '0 0 36px rgba(229, 9, 20, 0.16)',
              animation: 'spin 1.05s linear infinite'
            }}
          />
          <p style={eyebrow}>Startup</p>
          <h1 style={{ margin: '14px 0 0', color: '#fff', fontSize: '42px', fontWeight: 900 }}>Loading Smartifly shell...</h1>
          <p style={heroCopy}>
            Preparing the LG application modules before opening the first screen.
          </p>
        </section>
      </main>
    );
  }

  return (
    <StartupErrorBoundary onError={setStartupError}>
      <RouterComponent />
    </StartupErrorBoundary>
  );
}

export default App;
