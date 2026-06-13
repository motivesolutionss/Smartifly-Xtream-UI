import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/appStore';

type LoginStepId = 'portal' | 'username' | 'password';

type LoginScreenProps = {
  onBack?: () => void;
};

type KeyboardKey =
  | { action: 'char'; label: string; value?: string; span?: number }
  | { action: 'shift'; label: string }
  | { action: 'symbols'; label: string; span?: number }
  | { action: 'backspace'; label: string; span?: number }
  | { action: 'space'; label: string; accent?: boolean; span?: number }
  | { action: 'next'; label: string; accent?: boolean; span?: number }
  | { action: 'step-back'; label: string; span?: number };

type StepConfig = {
  id: LoginStepId;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  quickRows: KeyboardKey[][];
  sanitize: (value: string) => string;
};

const stepConfigs: StepConfig[] = [
  {
    id: 'portal',
    eyebrow: 'Step 01 - Identity',
    title: 'Connect to your server',
    description: 'Enter your unique Server Identity code to establish a secure handshake.',
    label: 'Server Identity',
    placeholder: 'e.g. SMARTIFLY-01',
    quickRows: [
      [
        { action: 'char', label: '@gmail.com', span: 3 },
        { action: 'char', label: '@yahoo.com', span: 3 },
        { action: 'char', label: '@outlook.com', span: 4 }
      ],
      [
        { action: 'symbols', label: '!#$', span: 2 },
        { action: 'char', label: '@', span: 2 },
        { action: 'char', label: '.', span: 2 },
        { action: 'char', label: '.com', span: 4 }
      ]
    ],
    sanitize: (value) => value.toUpperCase()
  },
  {
    id: 'username',
    eyebrow: 'Step 02 - Account',
    title: 'Enter your username',
    description: 'Use the Xtream username assigned to this subscription.',
    label: 'Username',
    placeholder: 'e.g. smartifly_user',
    quickRows: [
      [
        { action: 'char', label: '@gmail.com', span: 3 },
        { action: 'char', label: '@yahoo.com', span: 3 },
        { action: 'char', label: '@outlook.com', span: 4 }
      ],
      [
        { action: 'symbols', label: '!#$', span: 2 },
        { action: 'char', label: '@', span: 2 },
        { action: 'char', label: '.', span: 2 },
        { action: 'char', label: '.com', span: 4 }
      ]
    ],
    sanitize: (value) => value
  },
  {
    id: 'password',
    eyebrow: 'Step 03 - Secret',
    title: 'Confirm your password',
    description: 'Enter the account password, then continue to authenticate.',
    label: 'Password',
    placeholder: 'Enter password',
    quickRows: [
      [
        { action: 'char', label: '@gmail.com', span: 3 },
        { action: 'char', label: '@yahoo.com', span: 3 },
        { action: 'char', label: '@outlook.com', span: 4 }
      ],
      [
        { action: 'symbols', label: '!#$', span: 2 },
        { action: 'char', label: '@', span: 2 },
        { action: 'char', label: '.', span: 2 },
        { action: 'char', label: '.com', span: 4 }
      ]
    ],
    sanitize: (value) => value
  }
];

const keyboardLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'backspace']
] as const;

const symbolsLayout = [
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['?', '/', '\\', ':', ';', '"', "'", '+', '=', '.'],
  [',', '[', ']', '{', '}', '|', '<', '>', '~', '-'],
  ['symbols', '1', '2', '3', '4', '5', '6', '7', '_', 'backspace']
] as const;

function maskValue(stepId: LoginStepId, value: string) {
  if (stepId !== 'password') {
    return value;
  }

  return value.length > 0 ? '•'.repeat(value.length) : '';
}

function getStepIndex(stepId: LoginStepId) {
  return stepConfigs.findIndex((step) => step.id === stepId);
}

function getActiveStep(stepId: LoginStepId) {
  return stepConfigs[getStepIndex(stepId)] ?? stepConfigs[0];
}

function buildKeyboardRows(
  step: StepConfig,
  isLastStep: boolean,
  shifted: boolean,
  keyboardMode: 'letters' | 'symbols'
) {
  const baseLayout = keyboardMode === 'symbols' ? symbolsLayout : keyboardLayout;

  const alphaRows = baseLayout.map((row) =>
    row.map<KeyboardKey>((entry) => {
      if (entry === 'symbols') {
        return { action: 'symbols', label: 'ABC' };
      }

      if (entry === 'shift') {
        return { action: 'shift', label: shifted ? 'Shift Off' : 'Shift' };
      }

      if (entry === 'backspace') {
        return { action: 'backspace', label: 'Delete' };
      }

      const label = shifted ? entry.toUpperCase() : entry;
      return { action: 'char', label, value: label };
    })
  );

  return [
    alphaRows[0],
    alphaRows[1],
    alphaRows[2],
    alphaRows[3],
    ...step.quickRows,
    [
      { action: 'step-back', label: 'Back', span: 3 },
      { action: 'space', label: 'Space', span: 4 },
      { action: 'next', label: isLastStep ? 'Connect' : 'Next', accent: true, span: 3 }
    ]
  ];
}

function buildRowPositions(row: KeyboardKey[]) {
  let cursor = 0;

  return row.map((key) => {
    const span = key.span ?? 1;
    const start = cursor;
    const end = cursor + span;
    cursor = end;

    return {
      start,
      end,
      center: start + span / 2
    };
  });
}

function LoginScreen({ onBack }: LoginScreenProps) {
  const lastPortal = useAppStore((state) => state.lastPortal);
  const signIn = useAppStore((state) => state.signIn);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const isAuthenticating = useAppStore((state) => state.isAuthenticating);

  const [portal, setPortal] = useState(lastPortal === 'Default Server' ? '' : lastPortal);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stepId, setStepId] = useState<LoginStepId>('portal');
  const [isShifted, setIsShifted] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<'letters' | 'symbols'>('letters');
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const keyRefs = useRef<Array<Array<HTMLButtonElement | null>>>([]);

  const activeStep = getActiveStep(stepId);
  const stepIndex = getStepIndex(stepId);
  const isLastStep = stepIndex === stepConfigs.length - 1;
  const keyboardRows = useMemo(
    () => buildKeyboardRows(activeStep, isLastStep, isShifted, keyboardMode),
    [activeStep, isLastStep, isShifted, keyboardMode]
  );
  const keyboardRowPositions = useMemo(
    () => keyboardRows.map((row) => buildRowPositions(row)),
    [keyboardRows]
  );

  const values = { portal, username, password };
  const activeValue = values[stepId];

  useEffect(() => {
    setFocusedRow(0);
    setFocusedCol(0);
  }, [stepId]);

  useEffect(() => {
    setIsShifted(false);
  }, [keyboardMode]);

  useEffect(() => {
    keyRefs.current = keyboardRows.map((row, rowIndex) =>
      row.map((_, colIndex) => keyRefs.current[rowIndex]?.[colIndex] ?? null)
    );
  }, [keyboardRows]);

  useEffect(() => {
    setFocusedCol((current) => {
      const rowLength = keyboardRows[focusedRow]?.length ?? 1;
      return Math.min(current, rowLength - 1);
    });
  }, [focusedRow, keyboardRows]);

  useEffect(() => {
    const activeKey = keyRefs.current[focusedRow]?.[focusedCol];
    if (activeKey && document.activeElement !== activeKey) {
      activeKey.focus();
    }
  }, [focusedCol, focusedRow]);

  const syncFocus = (rowIndex: number, colIndex: number) => {
    setFocusedRow(rowIndex);
    setFocusedCol(colIndex);
  };

  const moveFocusVertically = (direction: 'up' | 'down') => {
    const targetRowIndex =
      direction === 'down'
        ? (focusedRow + 1) % keyboardRows.length
        : (focusedRow - 1 + keyboardRows.length) % keyboardRows.length;

    const currentPosition = keyboardRowPositions[focusedRow]?.[focusedCol];
    const targetPositions = keyboardRowPositions[targetRowIndex] ?? [];

    if (!currentPosition || targetPositions.length === 0) {
      setFocusedRow(targetRowIndex);
      setFocusedCol(0);
      return;
    }

    let bestCol = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    targetPositions.forEach((position, index) => {
      const overlaps =
        currentPosition.center >= position.start && currentPosition.center < position.end;
      const distance = Math.abs(position.center - currentPosition.center);
      const score = overlaps ? distance : distance + 100;

      if (score < bestScore) {
        bestScore = score;
        bestCol = index;
      }
    });

    setFocusedRow(targetRowIndex);
    setFocusedCol(bestCol);
  };

  const updateStepValue = (value: string) => {
    const nextValue = activeStep.sanitize(value);

    if (stepId === 'portal') {
      setPortal(nextValue);
      return;
    }

    if (stepId === 'username') {
      setUsername(nextValue);
      return;
    }

    setPassword(nextValue);
  };

  const moveStep = (direction: 'back' | 'next') => {
    const nextIndex = direction === 'next' ? stepIndex + 1 : stepIndex - 1;

    if (nextIndex < 0) {
      onBack?.();
      return;
    }

    if (nextIndex >= stepConfigs.length) {
      void signIn({ portalCode: portal, username, password });
      return;
    }

    setStepId(stepConfigs[nextIndex].id);
  };

  const activateKey = (key: KeyboardKey) => {
    if (isAuthenticating) {
      return;
    }

    if (key.action === 'char') {
      updateStepValue(activeValue + (key.value ?? key.label));
      return;
    }

    if (key.action === 'space') {
      updateStepValue(activeValue + ' ');
      return;
    }

    if (key.action === 'backspace') {
      updateStepValue(activeValue.slice(0, -1));
      return;
    }

    if (key.action === 'shift') {
      setIsShifted((value) => !value);
      return;
    }

    if (key.action === 'symbols') {
      setKeyboardMode((current) => (current === 'letters' ? 'symbols' : 'letters'));
      return;
    }

    if (key.action === 'step-back') {
      moveStep('back');
      return;
    }

    if (stepId === 'portal' && portal.trim().length === 0) {
      setStatusMessage('Enter a Server Identity');
      return;
    }

    if (stepId === 'username' && username.trim().length === 0) {
      setStatusMessage('Enter username');
      return;
    }

    if (stepId === 'password' && password.trim().length === 0) {
      setStatusMessage('Enter password');
      return;
    }

    moveStep('next');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isAuthenticating) {
        return;
      }

      const currentRow = keyboardRows[focusedRow] ?? [];

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusedCol((current) => (current + 1) % currentRow.length);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusedCol((current) => (current - 1 + currentRow.length) % currentRow.length);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveFocusVertically('down');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveFocusVertically('up');
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const key = keyboardRows[focusedRow]?.[focusedCol];
        if (key) {
          activateKey(key);
        }
        return;
      }

      if (event.key === 'Escape' || event.key === 'GoBack' || event.keyCode === 461) {
        event.preventDefault();
        moveStep('back');
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (activeValue.length > 0) {
          updateStepValue(activeValue.slice(0, -1));
          return;
        }

        moveStep('back');
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        updateStepValue(activeValue + event.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeValue, focusedCol, focusedRow, isAuthenticating, keyboardRowPositions, keyboardRows, portal, stepId, username, password]);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        background: 'linear-gradient(90deg, rgba(4, 7, 13, 0.98) 0%, rgba(8, 11, 18, 0.98) 100%)',
        color: '#ffffff',
        fontFamily: '"Segoe UI", Arial, sans-serif'
      }}
    >
      <section
        aria-hidden="true"
        style={{
          width: '45%',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(6, 9, 16, 0.98) 0%, rgba(12, 14, 22, 0.98) 100%)'
        }}
      >
        <img
          src="./assets/loginscreen_image.png"
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: 0.3
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(90deg, rgba(5, 8, 14, 0.94) 0%, rgba(5, 8, 14, 0.76) 55%, rgba(5, 8, 14, 0.16) 100%)'
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <img src="./assets/smartifly_icon.png" alt="Smartifly" style={{ width: '340px', maxWidth: '100%', display: 'block' }} />
          <h2
            style={{
              margin: '32px 0 16px',
              fontSize: '30px',
              lineHeight: 1.05,
              letterSpacing: '3px',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}
          >
            Unified Stream Hub
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: '480px',
              color: 'rgba(231,236,244,0.76)',
              fontSize: '20px',
              lineHeight: 1.6
            }}
          >
            Experience 4K IPTV, live cable, and premium streaming in one unified,
            high-performance interface.
          </p>
        </div>
      </section>

      <section
        style={{
          flex: 1,
          padding: '56px 48px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div style={{ maxWidth: '920px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <span
              style={{
                color: '#f5d06a',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginRight: '14px'
              }}
            >
              {activeStep.eyebrow}
            </span>
            <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
          </div>

          <h1 style={{ margin: 0, fontSize: '48px', lineHeight: 1.02, fontWeight: 800 }}>{activeStep.title}</h1>
          <p style={{ margin: '16px 0 0', maxWidth: '640px', color: 'rgba(231,236,244,0.76)', fontSize: '18px', lineHeight: 1.5 }}>
            {activeStep.description}
          </p>

          <div
            style={{
              marginTop: '28px',
              width: '100%',
              maxWidth: '920px',
              padding: '24px',
              borderRadius: '24px',
              background: 'linear-gradient(180deg, rgba(16, 19, 25, 0.96) 0%, rgba(10, 13, 18, 0.96) 100%)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.34)'
            }}
          >
            <label style={{ display: 'block', marginBottom: '22px' }}>
              <span style={{ display: 'block', marginBottom: '10px', fontSize: '14px', color: 'rgba(231,236,244,0.76)' }}>
                {activeStep.label}
              </span>
              <div
                style={{
                  minHeight: '64px',
                  borderRadius: '18px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: activeValue ? '#ffffff' : 'rgba(231,236,244,0.4)',
                  fontSize: '24px',
                  fontWeight: 700
                }}
              >
                {activeValue ? maskValue(stepId, activeValue) : activeStep.placeholder}
              </div>
            </label>

            <div role="group" aria-label="On-screen keyboard">
              {keyboardRows.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    marginTop: rowIndex === 0 ? 0 : '8px'
                  }}
                >
                  {row.map((key, colIndex) => {
                    const isFocused = rowIndex === focusedRow && colIndex === focusedCol;
                    const spanVal = key.span || 1;
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}-${key.label}`}
                        type="button"
                        ref={(node) => {
                          if (!keyRefs.current[rowIndex]) {
                            keyRefs.current[rowIndex] = [];
                          }
                          keyRefs.current[rowIndex][colIndex] = node;
                        }}
                        onClick={() => activateKey(key)}
                        onFocus={() => syncFocus(rowIndex, colIndex)}
                        onMouseEnter={() => syncFocus(rowIndex, colIndex)}
                        tabIndex={isFocused ? 0 : -1}
                        style={{
                          width: `calc(((100% - 72px) / 10) * ${spanVal} + ${spanVal - 1} * 8px)`,
                          marginRight: colIndex < row.length - 1 ? '8px' : 0,
                          minHeight: '46px',
                          border: 0,
                          borderRadius: '12px',
                          background: key.accent
                            ? 'linear-gradient(180deg, rgba(126, 31, 52, 0.96), rgba(97, 20, 37, 0.98))'
                            : isFocused
                              ? '#242c3d'
                              : '#1d2331',
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: 700,
                          boxShadow: isFocused
                            ? '0 0 0 2px rgba(255,255,255,0.16), 0 8px 16px rgba(0,0,0,0.22)'
                            : 'inset 0 -1px 0 rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {key.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <p style={{ margin: '18px 0 0', minHeight: '22px', color: 'rgba(231,236,244,0.82)', fontSize: '14px' }}>
              {isAuthenticating ? 'Connecting to portal...' : statusMessage}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
