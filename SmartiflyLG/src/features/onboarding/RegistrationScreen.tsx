import { useEffect, useMemo, useRef, useState } from 'react';
import {
  checkDeviceActivation,
  fetchActivationSession,
  registerDevice,
  type DeviceActivationSession
} from '../../services/api';
import { useSpatialNav } from '../../hooks/useSpatialNav';
import { useAppStore } from '../../store/appStore';

type RegistrationScreenProps = {
  onBack: () => void;
};

type RegistrationPhase = 'booting' | 'ready' | 'polling' | 'activated' | 'error';
type FocusId = 'cancel';

const DEVICE_ID_KEY = 'smartifly-lg-device-id';

function getDeviceId() {
  if (typeof window === 'undefined') {
    return 'SF-LG-UNKNOWN';
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = `SF-LG-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function RegistrationScreen({ onBack }: RegistrationScreenProps) {
  const completeDeviceActivation = useAppStore((state) => state.completeDeviceActivation);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const isAuthenticating = useAppStore((state) => state.isAuthenticating);

  const deviceId = useMemo(() => getDeviceId(), []);
  const [session, setSession] = useState<DeviceActivationSession | null>(null);
  const [phase, setPhase] = useState<RegistrationPhase>('booting');
  const [error, setError] = useState<string | null>(null);
  const [lastReason, setLastReason] = useState('Waiting for account binding...');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { focusId } = useSpatialNav<FocusId>({
    focusOrder: ['cancel'],
    initialFocusId: 'cancel',
    onBack,
    onEnter: () => {
      if (!isAuthenticating) {
        onBack();
      }
    }
  });

  useEffect(() => {
    if (focusId === 'cancel') {
      buttonRef.current?.focus();
    }
  }, [focusId]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const poll = async () => {
      if (cancelled) {
        return;
      }

      setPhase((current) => (current === 'activated' ? current : 'polling'));

      try {
        const result = await checkDeviceActivation(deviceId);
        const normalized = (result.statusCode || result.state || '').toUpperCase();
        setLastReason(result.reason || 'Waiting for account binding...');

        if ((normalized === 'ACTIVE' || normalized === 'ACTIVATED') && result.license) {
          stopPolling();
          setPhase('activated');
          setStatusMessage('Activation approved. Opening your Smartifly account...');
          const success = await completeDeviceActivation(result.license, deviceId);

          if (!success && !cancelled) {
            setPhase('error');
            setError('Activation succeeded, but LG could not complete the Xtream sign-in handoff.');
          }
          return;
        }

        if (normalized === 'BLOCKED' || normalized === 'BLACKLISTED' || normalized === 'DISABLED') {
          throw new Error(result.reason || 'This device is blocked. Contact your operator.');
        }

        if (normalized === 'EXPIRED') {
          throw new Error(result.reason || 'This activation link expired. Request a new activation session.');
        }

        if (!cancelled) {
          pollTimer = window.setTimeout(() => {
            void poll();
          }, 5000);
        }
      } catch (pollError) {
        if (cancelled) {
          return;
        }

        const message = pollError instanceof Error ? pollError.message : 'Activation polling failed';
        setPhase('error');
        setError(message);
        setStatusMessage(message);
      }
    };

    const start = async () => {
      setPhase('booting');
      setError(null);
      setStatusMessage('Registering this LG device...');

      try {
        await registerDevice(deviceId);
        const nextSession = await fetchActivationSession(deviceId);

        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setPhase('ready');
        setStatusMessage('Scan the QR code or open the activation link on your phone.');
        pollTimer = window.setTimeout(() => {
          void poll();
        }, 1000);
      } catch (activationError) {
        if (cancelled) {
          return;
        }

        const message =
          activationError instanceof Error ? activationError.message : 'Activation setup failed';
        setPhase('error');
        setError(message);
        setStatusMessage(message);
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [completeDeviceActivation, deviceId, setStatusMessage]);

  const primaryStatus =
    phase === 'booting'
      ? 'Preparing LG activation...'
      : phase === 'polling'
        ? 'Waiting for account binding...'
        : phase === 'activated'
          ? 'Activation approved. Syncing account...'
          : error || statusMessage;

  const isCancelFocused = focusId === 'cancel';

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        background: 'linear-gradient(90deg, rgba(5, 7, 12, 0.99) 0%, rgba(10, 12, 18, 1) 100%)',
        color: '#ffffff',
        fontFamily: '"Segoe UI", Arial, sans-serif'
      }}
    >
      <section
        style={{
          width: '42%',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(6, 8, 14, 0.98) 0%, rgba(10, 13, 20, 0.98) 100%)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 78% 22%, rgba(229, 9, 20, 0.24), transparent 32%), linear-gradient(180deg, rgba(6, 8, 14, 0.2), rgba(6, 8, 14, 0.82))'
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '56px 54px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxSizing: 'border-box'
          }}
        >
          <img src="./assets/smartifly_icon.png" alt="Smartifly" style={{ width: '280px', display: 'block' }} />
          <div style={{ marginTop: 'auto' }}>
            <p
              style={{
                margin: 0,
                color: '#ff6b76',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              Enterprise Activation
            </p>
            <h1 style={{ margin: '18px 0 0', fontSize: '46px', lineHeight: 1.02, fontWeight: 800 }}>
              Connect your
              <br />
              LG account
            </h1>
            <p
              style={{
                margin: '18px 0 0',
                maxWidth: '430px',
                color: 'rgba(231,236,244,0.76)',
                fontSize: '18px',
                lineHeight: 1.55
              }}
            >
              Scan the QR code or open the activation link on your phone. Once you bind the account,
              this TV will sign in automatically.
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          flex: 1,
          padding: '48px 56px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '980px',
            padding: '28px',
            borderRadius: '28px',
            background: 'linear-gradient(180deg, rgba(18, 21, 28, 0.98), rgba(11, 14, 19, 0.98))',
            boxShadow: '0 28px 80px rgba(0,0,0,0.34)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: phase === 'error' ? '#ff5f6d' : '#e50914'
              }}
            />
            <span
              style={{
                color: phase === 'error' ? '#ffb0b6' : '#ff8088',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              {phase === 'error' ? 'Activation Attention' : 'Awaiting Binding'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '38px', alignItems: 'center' }}>
            <div
              style={{
                width: '240px',
                height: '240px',
                borderRadius: '24px',
                background: '#ffffff',
                padding: '18px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {session?.qrCode ? (
                <img
                  src={session.qrCode}
                  alt="Activation QR"
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '18px',
                    background: 'repeating-linear-gradient(45deg, #ececec, #ececec 12px, #dcdcdc 12px, #dcdcdc 24px)'
                  }}
                />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: '22px' }}>
                <p style={{ margin: 0, color: 'rgba(231,236,244,0.56)', fontSize: '12px', letterSpacing: '2px' }}>
                  DEVICE ID
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: 700 }}>{deviceId}</p>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <p style={{ margin: 0, color: 'rgba(231,236,244,0.56)', fontSize: '12px', letterSpacing: '2px' }}>
                  ACTIVATION CODE
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '42px', fontWeight: 800, letterSpacing: '5px' }}>
                  {session?.settingsCode || '--------'}
                </p>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <p style={{ margin: 0, color: 'rgba(231,236,244,0.56)', fontSize: '12px', letterSpacing: '2px' }}>
                  PORTAL LINK
                </p>
                <p
                  style={{
                    margin: '8px 0 0',
                    color: 'rgba(231,236,244,0.78)',
                    fontSize: '18px',
                    lineHeight: 1.5,
                    wordBreak: 'break-all'
                  }}
                >
                  {session?.webLink || 'Generating activation link...'}
                </p>
              </div>

              <div>
                <p style={{ margin: 0, color: 'rgba(231,236,244,0.56)', fontSize: '12px', letterSpacing: '2px' }}>
                  STATUS
                </p>
                <p style={{ margin: '8px 0 0', color: '#ffffff', fontSize: '18px', lineHeight: 1.5 }}>
                  {primaryStatus}
                </p>
                <p style={{ margin: '6px 0 0', color: 'rgba(231,236,244,0.68)', fontSize: '15px', lineHeight: 1.45 }}>
                  {lastReason}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '28px' }}>
            <button
              ref={buttonRef}
              type="button"
              onClick={onBack}
              disabled={isAuthenticating}
              style={{
                minWidth: '180px',
                height: '54px',
                borderRadius: '14px',
                border: isCancelFocused
                  ? '2px solid rgba(255,255,255,0.95)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: isCancelFocused
                  ? 'linear-gradient(180deg, rgba(54, 60, 73, 0.96), rgba(35, 39, 48, 0.98))'
                  : 'rgba(255,255,255,0.06)',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isAuthenticating ? 'default' : 'pointer',
                opacity: isAuthenticating ? 0.55 : 1,
                boxShadow: isCancelFocused
                  ? '0 14px 32px rgba(0,0,0,0.34), 0 0 0 3px rgba(255,255,255,0.08)'
                  : 'none',
                outline: 'none'
              }}
            >
              Cancel & Return
            </button>
            <p style={{ margin: 0, color: 'rgba(231,236,244,0.56)', fontSize: '14px' }}>
              Polling every 5 seconds until this TV is activated.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default RegistrationScreen;
