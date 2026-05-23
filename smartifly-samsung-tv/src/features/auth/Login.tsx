import React, { useMemo, useState } from "react";
import { services } from "../../services";
import { createPlaylistId } from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { AppError } from "../../types/errors";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import { TvKeyboard } from "../../components/ui/TvKeyboard";
import { HandshakeView } from "./HandshakeView";
import styles from "./Login.module.css";

interface LoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

type LoginSubStep = "PORTAL" | "USERNAME" | "PASSWORD";
type LoginStep = "CREDENTIALS" | "CONNECTING";

const MIN_CONNECTING_MS = 3500; // Ritual duration

export const Login: React.FC<LoginProps> = ({ onSuccess, onBack }) => {
  const [step, setStep] = useState<LoginStep>("CREDENTIALS");
  const [subStep, setSubStep] = useState<LoginSubStep>("PORTAL");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setActivePlaylist = useAuthStore((store) => store.setActivePlaylist);

  const stepInfo = useMemo(() => {
    switch (subStep) {
      case "PORTAL":
        return {
          indicator: "STEP 01 — IDENTITY",
          title: "Connect to your server",
          desc: "Enter your server address to connect.",
          label: "SERVER URL",
          placeholder: "e.g. http://server-address.com:8080",
          actionLabel: "Next",
          mode: "url" as const
        };
      case "USERNAME":
        return {
          indicator: "STEP 02 — SECURITY",
          title: "Account Access",
          desc: "Enter your account username.",
          label: "USERNAME",
          placeholder: "Enter username",
          actionLabel: "Next",
          mode: "default" as const
        };
      case "PASSWORD":
        return {
          indicator: "STEP 02 — SECURITY",
          title: "Secure Verification",
          desc: "Enter your account password.",
          label: "PASSWORD",
          placeholder: "Enter password",
          actionLabel: "Login",
          mode: "password" as const
        };
      default:
        return null;
    }
  }, [subStep]);

  const handleValueChange = (val: string) => {
    if (subStep === "PORTAL") setServerUrl(val);
    else if (subStep === "USERNAME") setUsername(val);
    else setPassword(val);
    if (error) setError(null);
  };

  const handleNext = () => {
    setError(null);
    if (subStep === "PORTAL") {
      if (!serverUrl.trim()) {
        setError("Server URL is required");
        return;
      }
      setSubStep("USERNAME");
    } else if (subStep === "USERNAME") {
      if (!username.trim()) {
        setError("Username is required");
        return;
      }
      setSubStep("PASSWORD");
    } else {
      if (!password.trim()) {
        setError("Password is required");
        return;
      }
      void handleConnect();
    }
  };

  const handleBack = () => {
    setError(null);
    if (subStep === "USERNAME") {
      setSubStep("PORTAL");
    } else if (subStep === "PASSWORD") {
      setSubStep("USERNAME");
    } else if (subStep === "PORTAL") {
      onBack();
    }
  };

  const handleConnect = async () => {
    setStep("CONNECTING");
    setError(null);

    const startTime = Date.now();

    try {
      const normalizedUrl = normalizeServerUrl(serverUrl);
      
      // Perform validation and initial data fetch
      await Promise.all([
        services.account.validateCredentials(normalizedUrl, username.trim(), password),
        // Force minimum duration for cinematic handshake
        new Promise(resolve => setTimeout(resolve, MIN_CONNECTING_MS))
      ]);

      const [liveCategories, liveStreams] = await Promise.all([
        services.content.getLiveCategories(),
        services.content.getLiveStreams(),
      ]);

      if (liveCategories.length === 0 || liveStreams.length === 0) {
        throw new AppError("EMPTY_CONTENT", "No content found on this server");
      }

      const playlistId = createPlaylistId(normalizedUrl, username.trim());
      const playlist = {
        id: playlistId,
        name: `Server ${normalizedUrl.split("//")[1]?.split(":")[0] || "IPTV"}`,
        serverUrl: normalizedUrl,
        username: username.trim(),
        password,
        addedAt: new Date().toISOString(),
      };

      await services.userData.savePlaylist(playlist);
      await services.userData.setActivePlaylistId(playlistId);
      setActivePlaylist(playlist);
      onSuccess();
    } catch (err: unknown) {
      // If error occurs before MIN_CONNECTING_MS, wait out the remaining time
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_CONNECTING_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_CONNECTING_MS - elapsed));
      }
      
      setError(getUserFriendlyErrorMessage(err));
      setStep("CREDENTIALS");
    }
  };

  if (!stepInfo) return null;

  const currentInputValue = subStep === "PORTAL" ? serverUrl : subStep === "USERNAME" ? username : password;
  const isPlaceholder = !currentInputValue;

  return (
    <div className={styles.onboardingPage}>
      {/* Handshake Overlay: Direct child for absolute positioning */}
      {step === "CONNECTING" && <HandshakeView />}

      <div className={styles.background} />

      <div className={styles.layout}>
        {/* Left Side: Branding & Context (Cinematic) */}
        <div className={styles.brandingSection}>
          <div className={styles.brandingContent}>
            <img src="/smartifly_logo.png" alt="Smartifly" className={styles.brandingLogo} />
            <h1 className={styles.brandingTitle}>UNIFIED STREAM HUB</h1>
            <p className={styles.brandingTagline}>
              Experience 4K IPTV, live cable, and premium streaming in one unified, high-performance interface.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Panel */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <div className={styles.stepContent}>
              {/* Stage Indicator */}
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
                <div className={`${styles.inputField} ${error ? styles.inputFieldError : ""}`}>
                  <div className={`${styles.inputValue} ${isPlaceholder ? styles.placeholderValue : ""}`}>
                    {subStep === "PASSWORD" && password 
                      ? "•".repeat(password.length) 
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
