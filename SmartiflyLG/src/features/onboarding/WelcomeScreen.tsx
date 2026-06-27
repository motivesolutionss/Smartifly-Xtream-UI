import { useEffect, useState } from 'react';
import { useSpatialNav } from '../../hooks/useSpatialNav';

type FocusId = 'sign-in' | 'create-account';

const focusOrder: FocusId[] = ['sign-in', 'create-account'];

type WelcomeScreenProps = {
  onCreateAccount: () => void;
  onSignIn: () => void;
};

function renderIcon(icon: 'account' | 'tv') {
  if (icon === 'account') {
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: '22px',
          height: '22px',
          display: 'inline-block',
          flex: '0 0 auto'
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '7px',
            top: '2px',
            width: '8px',
            height: '8px',
            borderRadius: '999px',
            background: '#ffffff'
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '3px',
            top: '11px',
            width: '16px',
            height: '9px',
            borderRadius: '9px 9px 4px 4px',
            border: '2px solid #ffffff',
            borderTopWidth: '3px',
            borderBottom: '0'
          }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '22px',
        height: '22px',
        display: 'inline-block',
        flex: '0 0 auto'
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: '2px',
          top: '4px',
          width: '18px',
          height: '13px',
          border: '2px solid #ffffff',
          borderRadius: '3px'
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '7px',
          top: '18px',
          width: '8px',
          height: '2px',
          background: '#ffffff'
        }}
      />
    </span>
  );
}

type ActionButtonProps = {
  label: string;
  icon: 'account' | 'tv';
  focused: boolean;
  primary?: boolean;
  onClick: () => void;
};

function ActionButton({ label, icon, focused, primary = false, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height: '76px',
        borderRadius: '16px',
        border: focused ? '3px solid rgba(255,255,255,0.98)' : '0',
        background: primary
          ? 'linear-gradient(180deg, #ff2b2b 0%, #b20710 100%)'
          : 'linear-gradient(180deg, #2a2a32 0%, #202028 100%)',
        color: '#ffffff',
        boxShadow: focused
          ? primary
            ? '0 14px 34px rgba(229, 9, 20, 0.26)'
            : '0 14px 34px rgba(255, 255, 255, 0.08)'
          : 'none',
        fontSize: '20px',
        fontWeight: 700,
        cursor: 'pointer',
        padding: 0
      }}
    >
      <span
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        {renderIcon(icon)}
        <span>{label}</span>
      </span>
    </button>
  );
}

function WelcomeScreen({ onCreateAccount, onSignIn }: WelcomeScreenProps) {
  const [showBranding, setShowBranding] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const { focusId } = useSpatialNav<FocusId>({
    focusOrder,
    initialFocusId: 'sign-in',
    onEnter: (currentFocus) => {
      if (currentFocus === 'sign-in') {
        onSignIn();
        return;
      }

      onCreateAccount();
    }
  });

  useEffect(() => {
    const brandingTimer = window.setTimeout(() => setShowBranding(true), 300);
    const contentTimer = window.setTimeout(() => setShowContent(true), 700);
    const buttonsTimer = window.setTimeout(() => setShowButtons(true), 1100);

    return () => {
      window.clearTimeout(brandingTimer);
      window.clearTimeout(contentTimer);
      window.clearTimeout(buttonsTimer);
    };
  }, []);

  const stageStyle = (visible: boolean) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: 'opacity 420ms ease, transform 420ms ease'
  });

  return (
    <main
      aria-label="Smartifly welcome"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        background:
          'linear-gradient(90deg, rgba(10, 2, 8, 0.98) 0%, rgba(18, 2, 10, 0.98) 42%, rgba(8, 2, 8, 1) 100%)',
        color: '#ffffff',
        fontFamily: '"Segoe UI", Arial, sans-serif'
      }}
    >
      <section
        style={{
          width: '44%',
          minWidth: '540px',
          padding: '72px 0 48px 84px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div style={stageStyle(showBranding)}>
          <img
            src="./assets/smartifly_icon.png"
            alt="Smartifly"
            style={{
              width: '300px',
              maxWidth: '100%',
              marginLeft: '-12px',
              display: 'block',
              marginBottom: '26px'
            }}
          />
        </div>

        <div style={stageStyle(showContent)}>
          <h1
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '62px',
              lineHeight: '0.96',
              letterSpacing: '-1.2px',
              fontWeight: 800
            }}
          >
            The Future
            <br />
            of Television.
          </h1>
          <p
            style={{
              margin: '24px 0 40px',
              maxWidth: '430px',
              color: 'rgba(231, 236, 244, 0.7)',
              fontSize: '18px',
              lineHeight: 1.5
            }}
          >
            Experience 4K IPTV, live cable, and premium streaming in one unified,
            high-performance interface.
          </p>
        </div>

        <div style={stageStyle(showButtons)}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              width: '596px',
              maxWidth: '100%'
            }}
          >
            <ActionButton
              label="Sign In"
              icon="account"
              focused={focusId === 'sign-in'}
              primary
              onClick={onSignIn}
            />
            <ActionButton
              label="Create Account"
              icon="tv"
              focused={focusId === 'create-account'}
              onClick={onCreateAccount}
            />
          </div>

          <div
            style={{
              marginTop: '54px',
              display: 'flex',
              alignItems: 'center',
              gap: '18px'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '32px',
                padding: '0 12px',
                borderRadius: '999px',
                border: '1px solid rgba(229, 9, 20, 0.24)',
                background: 'rgba(229, 9, 20, 0.12)',
                color: '#ff7a84',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px'
              }}
            >
              STABLE
            </span>
            <span
              style={{
                color: 'rgba(231, 236, 244, 0.62)',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}
            >
              Unified Stream Hub - 4K HDR Optimized
            </span>
          </div>
        </div>
      </section>

      <section
        aria-hidden="true"
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <div className="showcase-stack">
          <div className="showcase-card card-left">
            <img src="./assets/left_pillar.png" alt="" />
          </div>

          <div className="showcase-card card-center">
            <img src="./assets/center_pillar.png" alt="" />
          </div>

          <div className="showcase-card card-right">
            <img src="./assets/right_pillar.png" alt="" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default WelcomeScreen;
