import React, { useEffect, useMemo, useRef, useState } from "react";
import { BackendClient } from "../../services/backend/backendClient";
import { services } from "../../services";
import { createPlaylistId } from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import { createPerfTrace } from "../../utils/perfTrace";
import { markStartupMarker } from "../../utils/startupMarkers";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { HandshakeView } from "./HandshakeView";
import { ensureLiveContentAvailable } from "./liveContentProbe";
import styles from "./Login.module.css";

interface LoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

type LoginSubStep = "SERVER_CODE" | "USERNAME" | "PASSWORD";
type LoginStep = "CREDENTIALS" | "CONNECTING";

const MIN_CONNECTING_MS = 3500;

export const Login: React.FC<LoginProps> = ({ onSuccess, onBack }) => {
  const screenTraceRef = useRef(
    createPerfTrace("login_screen", {
      screen: "login",
    })
  );
  const [step, setStep] = useState<LoginStep>("CREDENTIALS");
  const [subStep, setSubStep] = useState<LoginSubStep>("SERVER_CODE");
  const [serverCode, setServerCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setActivePlaylist = useAuthStore((store) => store.setActivePlaylist);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      screenTraceRef.current.end({
        status: "visible",
        metricName: "login_screen_total_ms",
        slowAboveMs: 250,
        data: {
          step: "credentials",
        },
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (!screenTraceRef.current.isClosed()) {
        screenTraceRef.current.end({
          status: "unmounted",
          metricName: "login_screen_total_ms",
        });
      }
    };
  }, []);

  const stepInfo = useMemo(() => {
    switch (subStep) {
      case "SERVER_CODE":
        return {
          indicator: "STEP 01 - IDENTITY",
          title: "Enter your server code",
          desc: "Use the exact server code provided by your IPTV provider.",
          label: "SERVER CODE",
          placeholder: "e.g. SMARTIFLY-01",
          actionLabel: "Next",
          mode: "default" as const,
        };
      case "USERNAME":
        return {
          indicator: "STEP 02 - SECURITY",
          title: "Account Access",
          desc: "Enter your account username.",
          label: "USERNAME",
          placeholder: "Enter username",
          actionLabel: "Next",
          mode: "default" as const,
        };
      case "PASSWORD":
        return {
          indicator: "STEP 03 - SECURITY",
          title: "Secure Verification",
          desc: "Enter your account password.",
          label: "PASSWORD",
          placeholder: "Enter password",
          actionLabel: "Login",
          mode: "password" as const,
        };
      default:
        return null;
    }
  }, [subStep]);

  const handleValueChange = (val: string) => {
    if (subStep === "SERVER_CODE") setServerCode(val.toUpperCase());
    else if (subStep === "USERNAME") setUsername(val);
    else setPassword(val);

    if (error) setError(null);
  };

  const handleNext = () => {
    setError(null);

    if (subStep === "SERVER_CODE") {
      if (!serverCode.trim()) {
        setError("Server code is required");
        return;
      }
      setSubStep("USERNAME");
      return;
    }

    if (subStep === "USERNAME") {
      if (!username.trim()) {
        setError("Username is required");
        return;
      }
      setSubStep("PASSWORD");
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    void handleConnect();
  };

  const handleBack = () => {
    setError(null);

    if (subStep === "USERNAME") {
      setSubStep("SERVER_CODE");
      return;
    }

    if (subStep === "PASSWORD") {
      setSubStep("USERNAME");
      return;
    }

    onBack();
  };

  const handleConnect = async () => {
    setStep("CONNECTING");
    setError(null);

    const startTime = Date.now();
    const connectTrace = createPerfTrace("login_connect", {
      serverCode: serverCode.trim().toUpperCase(),
    });

    try {
      const resolvedPortal = await new BackendClient().resolvePortal(serverCode);
      connectTrace.mark("portal_resolved", {
        metricName: "login_portal_resolved_ms",
        slowAboveMs: 250,
        data: {
          portalCode: resolvedPortal.portalCode,
        },
      });
      const normalizedUrl = normalizeServerUrl(resolvedPortal.baseUrl);
      const minimumConnectingDelay = new Promise((resolve) =>
        setTimeout(resolve, MIN_CONNECTING_MS)
      );
      const validateCredentialsPromise = services.account
        .validateCredentials(normalizedUrl, username.trim(), password)
        .then(() => {
          connectTrace.mark("credentials_validated", {
            metricName: "login_credentials_validated_ms",
            slowAboveMs: 450,
          });
        });

      await Promise.all([validateCredentialsPromise, minimumConnectingDelay]);
      connectTrace.mark("loading_gate_passed", {
        metricName: "login_loading_gate_passed_ms",
        slowAboveMs: MIN_CONNECTING_MS,
      });

      const liveProbe = await ensureLiveContentAvailable(services.content);
      connectTrace.mark("live_content_validated", {
        metricName: "login_live_content_validated_ms",
        slowAboveMs: 650,
        data: {
          liveCategoryCount: liveProbe.liveCategoryCount,
          validatedLiveStreamCount: liveProbe.validatedLiveStreamCount,
          usedCatalogFallback: liveProbe.usedCatalogFallback,
        },
      });

      const trimmedUsername = username.trim();
      const playlistId = createPlaylistId(normalizedUrl, trimmedUsername);
      const playlist = {
        id: playlistId,
        name: resolvedPortal.name || serverCode.trim(),
        serverUrl: normalizedUrl,
        username: trimmedUsername,
        password,
        addedAt: new Date().toISOString(),
        serverCode: resolvedPortal.portalCode,
        portalName: resolvedPortal.name,
      };

      await services.userData.savePlaylist(playlist);
      await services.userData.setActivePlaylistId(playlistId);
      setActivePlaylist(playlist);
      markStartupMarker("auth_complete", {
        flow: "login",
        playlistId,
      });
      connectTrace.end({
        status: "completed",
        metricName: "login_connect_total_ms",
        slowAboveMs: 4200,
        data: {
          playlistId,
        },
      });
      onSuccess();
    } catch (err: unknown) {
      connectTrace.fail(err, {
        metricName: "login_connect_total_ms",
        slowAboveMs: 4200,
        data: {
          subStep,
        },
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_CONNECTING_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_CONNECTING_MS - elapsed)
        );
      }

      setError(getUserFriendlyErrorMessage(err));
      setStep("CREDENTIALS");
    }
  };

  if (!stepInfo) return null;

  const currentInputValue =
    subStep === "SERVER_CODE"
      ? serverCode
      : subStep === "USERNAME"
        ? username
        : password;
  const isPlaceholder = !currentInputValue;

  return (
    <div className={styles.onboardingPage}>
      {step === "CONNECTING" && <HandshakeView />}

      <div className={styles.background} />

      <div className={styles.layout}>
        <div className={styles.brandingSection}>
          <div className={styles.brandingContent}>
            <img
              src="/smartifly_icon.webp"
              alt="Smartifly"
              className={styles.brandingLogo}
            />
            <h1 className={styles.brandingTitle}>UNIFIED STREAM HUB</h1>
            <p className={styles.brandingTagline}>
              Enter your server code, then sign in with your Xtream username
              and password.
            </p>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <div className={styles.stepContent}>
              <div className={styles.stageIndicatorRow}>
                <span className={styles.stageLabel}>{stepInfo.indicator}</span>
                <div className={styles.stageLine} />
              </div>

              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{stepInfo.title}</h2>
                <p className={styles.panelDesc}>{stepInfo.desc}</p>
              </div>

              <div className={styles.inputArea}>
                <div className={styles.inputLabel}>{stepInfo.label}</div>
                <div
                  className={`${styles.inputField} ${
                    error ? styles.inputFieldError : ""
                  }`}
                >
                  <div
                    className={`${styles.inputValue} ${
                      isPlaceholder ? styles.placeholderValue : ""
                    }`}
                  >
                    {subStep === "PASSWORD" && password
                      ? "*".repeat(password.length)
                      : currentInputValue || stepInfo.placeholder}
                  </div>
                </div>
                {error && <div className={styles.errorText}>{error}</div>}
              </div>

              <div className={styles.keyboardContainer}>
                <TvKeyboard
                  title={stepInfo.label}
                  value={currentInputValue}
                  mode={stepInfo.mode}
                  variant="inline"
                  showHeader={false}
                  showPreview={false}
                  actionLabel={stepInfo.actionLabel}
                  onChange={handleValueChange}
                  onSubmit={handleNext}
                  onBackClick={handleBack}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
