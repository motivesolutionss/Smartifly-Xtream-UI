import { useEffect, useRef } from 'react';
import { useSpatialNav } from '../../hooks/useSpatialNav';
import { useAppStore } from '../../store/appStore';

type FocusId = string;

function ProfileSelectionScreen() {
  const profiles = useAppStore((state) => state.profiles);
  const selectProfile = useAppStore((state) => state.selectProfile);
  const bootstrapHomeData = useAppStore((state) => state.bootstrapHomeData);
  const leaveProfileSelection = useAppStore((state) => state.leaveProfileSelection);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activateProfile = (profileId: string) => {
    selectProfile(profileId);
    void bootstrapHomeData();
  };

  const focusOrder = profiles.map((profile) => profile.id);
  const { focusId, setFocusId } = useSpatialNav<FocusId>({
    focusOrder,
    initialFocusId: focusOrder[0],
    axis: 'horizontal',
    onBack: leaveProfileSelection,
    onEnter: (currentFocus) => activateProfile(currentFocus)
  });

  useEffect(() => {
    const activeButton = buttonRefs.current[focusId];
    if (activeButton && document.activeElement !== activeButton) {
      activeButton.focus();
    }
  }, [focusId]);

  return (
    <main
      aria-label="Profile selection"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top center, rgba(43, 11, 28, 0.32) 0%, rgba(7, 10, 18, 0) 32%), linear-gradient(180deg, #080b14 0%, #090d17 100%)',
        color: '#ffffff',
        fontFamily: '"Segoe UI", Arial, sans-serif'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '1480px',
          padding: '72px 84px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px'
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#b6a86c',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '3px'
            }}
          >
            Profiles
          </p>
          <h1
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '58px',
              fontWeight: 700,
              letterSpacing: '-0.8px',
              lineHeight: 1
            }}
          >
            Who&apos;s watching?
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: '760px',
              color: 'rgba(231, 236, 244, 0.7)',
              fontSize: '22px',
              lineHeight: 1.5
            }}
          >
            Choose a profile before entering the Smartifly TV shell.
          </p>
        </div>

        <div
          role="list"
          aria-label="Available profiles"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: '28px',
            flexWrap: 'wrap'
          }}
        >
          {profiles.map((profile) => {
            const isFocused = focusId === profile.id;

            return (
              <button
                key={profile.id}
                type="button"
                role="listitem"
                ref={(element) => {
                  buttonRefs.current[profile.id] = element;
                }}
                onMouseEnter={() => setFocusId(profile.id)}
                onFocus={() => setFocusId(profile.id)}
                onClick={() => activateProfile(profile.id)}
                style={{
                  width: '280px',
                  minHeight: '356px',
                  borderRadius: '28px',
                  border: isFocused ? '3px solid rgba(255,255,255,0.98)' : '1px solid rgba(255,255,255,0.08)',
                  background: isFocused
                    ? 'linear-gradient(180deg, rgba(62, 72, 98, 0.95) 0%, rgba(25, 30, 43, 0.98) 100%)'
                    : 'linear-gradient(180deg, rgba(23, 28, 40, 0.96) 0%, rgba(13, 17, 26, 0.98) 100%)',
                  boxShadow: isFocused
                    ? '0 18px 42px rgba(255, 255, 255, 0.14)'
                    : '0 12px 30px rgba(0, 0, 0, 0.22)',
                  color: '#ffffff',
                  padding: '28px 24px 24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  outline: 'none',
                  transform: isFocused ? 'translateY(-4px) scale(1.03)' : 'none',
                  transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease'
                }}
              >
                <div
                  style={{
                    width: '156px',
                    height: '156px',
                    borderRadius: '999px',
                    background: profile.isKids
                      ? 'linear-gradient(180deg, #55a8ff 0%, #3568ff 100%)'
                      : 'linear-gradient(180deg, #ff5f5f 0%, #b90b20 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: profile.isKids
                      ? '0 18px 30px rgba(53, 104, 255, 0.3)'
                      : '0 18px 30px rgba(185, 11, 32, 0.28)'
                  }}
                >
                  <span
                    style={{
                      color: '#ffffff',
                      fontSize: '44px',
                      fontWeight: 800,
                      letterSpacing: '1px'
                    }}
                  >
                    {profile.avatarSeed}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '30px',
                      lineHeight: 1.1,
                      fontWeight: 700
                    }}
                  >
                    {profile.name}
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: 'rgba(231, 236, 244, 0.72)',
                      fontSize: '18px',
                      lineHeight: 1.4
                    }}
                  >
                    {profile.isKids ? 'Kids profile' : 'Primary profile'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default ProfileSelectionScreen;
