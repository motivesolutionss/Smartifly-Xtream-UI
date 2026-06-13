import { useAppStore } from '../../store/appStore';

function StartupLoaderScreen() {
  const bootstrapStatus = useAppStore((state) => state.bootstrapStatus);
  const bootstrapError = useAppStore((state) => state.bootstrapError);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const bootstrapHomeData = useAppStore((state) => state.bootstrapHomeData);
  const resetBootstrap = useAppStore((state) => state.resetBootstrap);
  const changePortal = useAppStore((state) => state.changePortal);

  const isError = bootstrapStatus === 'error';
  const heading = isError ? 'Home failed to load' : `Loading ${selectedProfile?.name || 'profile'}...`;
  const message = isError
    ? bootstrapError || 'The portal request failed. Check the server URL, network, and credentials, then try again.'
    : 'Preparing hero, live channels, series, and movie rails before opening home.';

  return (
    <main
      className="startup-loader-screen"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.14), transparent 26%), linear-gradient(145deg, #040507 0%, #0b0f15 52%, #020304 100%)'
      }}
    >
      <div
        className="startup-loader-screen__glow"
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
        className="startup-loader-card"
        aria-label="Startup loader"
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
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        <div
          className="startup-loader-spinner"
          aria-hidden="true"
          style={{
            width: '88px',
            height: '88px',
            margin: '0 auto 20px',
            borderRadius: '999px',
            border: '5px solid rgba(255, 255, 255, 0.08)',
            borderTopColor: '#e50914',
            boxShadow: '0 0 36px rgba(229, 9, 20, 0.16)',
            WebkitAnimation: 'spin 1.05s linear infinite',
            animation: 'spin 1.05s linear infinite',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform'
          }}
        />
        <p
          className="eyebrow"
          style={{
            margin: 0,
            color: 'rgba(255, 255, 255, 0.58)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}
        >
          Startup
        </p>
        <h1
          style={{
            margin: '14px 0 0',
            color: '#ffffff',
            fontSize: '42px',
            lineHeight: 1.04,
            fontWeight: 900
          }}
        >
          {heading}
        </h1>
        <p
          className="hero-copy"
          style={{
            margin: '14px auto 0',
            maxWidth: '520px',
            color: 'rgba(255, 255, 255, 0.76)',
            fontSize: '18px',
            lineHeight: 1.5
          }}
        >
          {message}
        </p>
        {!isError ? (
          <div
            className="startup-loader-track"
            aria-hidden="true"
            style={{
              width: '100%',
              maxWidth: '320px',
              height: '7px',
              margin: '22px auto 0',
              padding: '1px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            <div
              className="startup-loader-fill"
              style={{
                width: '38%',
                height: '100%',
                borderRadius: 'inherit',
                background: 'linear-gradient(90deg, #ff5d67, #e50914)',
                WebkitAnimation: 'boot-progress 1.2s ease-in-out infinite alternate',
                animation: 'boot-progress 1.2s ease-in-out infinite alternate',
                willChange: 'transform',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)'
              }}
            />
          </div>
        ) : null}
        {isError ? (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="startup-loader-retry"
              style={{
                marginTop: '26px',
                minWidth: '168px',
                height: '54px',
                border: 0,
                borderRadius: '999px',
                background: 'linear-gradient(180deg, #ff3446 0%, #d50d1a 100%)',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 800,
                boxShadow: '0 12px 28px rgba(229, 9, 20, 0.22)'
              }}
              onClick={() => {
                resetBootstrap();
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="startup-loader-retry"
              style={{
                marginTop: '26px',
                minWidth: '168px',
                height: '54px',
                border: 0,
                borderRadius: '999px',
                background: 'linear-gradient(180deg, #2b3342 0%, #1a202b 100%)',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 800,
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.24)'
              }}
              onClick={() => {
                changePortal();
              }}
            >
              Change Portal
            </button>
          </div>
        ) : null}
        {bootstrapHomeData?.notice ? (
          <p
            className="startup-loader-note"
            style={{
              margin: '18px 0 0',
              color: 'rgba(255, 255, 255, 0.56)',
              fontSize: '14px'
            }}
          >
            {bootstrapHomeData.notice.body}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default StartupLoaderScreen;
