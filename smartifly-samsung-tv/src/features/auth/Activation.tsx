import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focusable } from "../../components/tv/Focusable";
import { BackendClient } from "../../services/backend/backendClient";
import { getOrCreateDeviceIdentity } from "../../services/backend/deviceIdentity";
import { initializeServices, services } from "../../services";
import {
  createPlaylistId,
  type PlaylistCredentials,
} from "../../storage/playlistStorage";
import { useAuthStore } from "../../store/authStore";
import { AppError } from "../../types/errors";
import { getUserFriendlyErrorMessage } from "../../utils/errorMapper";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import type {
  DeviceActivationState,
  DeviceCheckStatus,
  DeviceIdentityPayload,
  DeviceQrSession,
} from "../../services/backend/backendTypes";
import styles from "./Activation.module.css";

interface ActivationProps {
  onBack: () => void;
  onSuccess: () => void;
}

const POLL_INTERVAL_MS = 5000;

const TERMINAL_STATE_MESSAGES: Partial<Record<DeviceActivationState, string>> = {
  EXPIRED: "This activation has expired. Please contact your provider.",
  DISABLED: "This device has been disabled. Please contact your provider.",
  BLOCKED: "This device has been blocked. Please contact your provider.",
  BLACKLISTED: "This device is blacklisted. Please contact your provider.",
  BAD_REQUEST: "The backend rejected this activation request.",
  SERVER_ERROR: "The backend could not complete activation right now.",
};

const statusLabelForState = (
  session: DeviceQrSession | null,
  error: string | null,
  terminalState: DeviceActivationState | null,
  isCompleting: boolean
) => {
  if (isCompleting) return "FINALIZING SESSION...";
  if (terminalState) return `${terminalState} STATUS`;
  if (error) return "ACTIVATION ERROR";
  if (!session) return "GENERATING QR CODE...";
  return "AWAITING BINDING...";
};

const describeState = (
  error: string | null,
  terminalState: DeviceActivationState | null,
  session: DeviceQrSession | null
) => {
  if (error) return error;

  if (terminalState) {
    return (
      TERMINAL_STATE_MESSAGES[terminalState] ||
      "This device cannot be activated right now."
    );
  }

  if (!session) {
    return "Preparing your activation code and portal link for this TV.";
  }

  return [
    "Scan the QR code or visit the link below on your phone.",
    "Once your account is linked, your TV will automatically sign in.",
  ].join("\n");
};

const formatPortalLink = (value: string | null) => {
  if (!value) return "Preparing activation link...";
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
};

const buildActivatedPlaylist = (status: DeviceCheckStatus): PlaylistCredentials => {
  const rawServerUrl = status.serverUrl?.trim();
  const rawUsername = status.xtreamUser?.trim();
  const password = status.xtreamPass ?? "";

  if (!rawServerUrl || !rawUsername || !password) {
    throw new AppError(
      "INVALID_RESPONSE",
      "Activation completed without Xtream credentials"
    );
  }

  const normalizedServerUrl = normalizeServerUrl(rawServerUrl);

  return {
    id: createPlaylistId(normalizedServerUrl, rawUsername),
    name: status.serverName || "Smartifly TV",
    serverUrl: normalizedServerUrl,
    username: rawUsername,
    password,
    addedAt: new Date().toISOString(),
    portalName: status.serverName || undefined,
  };
};

export const Activation: React.FC<ActivationProps> = ({ onBack, onSuccess }) => {
  const backendClient = useMemo(() => new BackendClient(), []);
  const setActivePlaylist = useAuthStore((store) => store.setActivePlaylist);
  const [session, setSession] = useState<DeviceQrSession | null>(null);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentityPayload | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [terminalState, setTerminalState] = useState<DeviceActivationState | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const isPollingRef = useRef(false);
  const isCompletingRef = useRef(false);

  const completeActivation = useCallback(
    async (status: DeviceCheckStatus) => {
      if (isCompletingRef.current) return;

      isCompletingRef.current = true;
      setIsCompleting(true);
      setError(null);
      setTerminalState(null);

      try {
        const playlist = buildActivatedPlaylist(status);

        initializeServices(
          playlist.serverUrl,
          playlist.username,
          playlist.password
        );

        const [liveCategories, liveStreams] = await Promise.all([
          services.content.getLiveCategories(),
          services.content.getLiveStreams(),
        ]);

        if (liveCategories.length === 0 || liveStreams.length === 0) {
          throw new AppError("EMPTY_CONTENT", "No content found on this server");
        }

        await services.userData.savePlaylist(playlist);
        await services.userData.setActivePlaylistId(playlist.id);
        setActivePlaylist(playlist);
        onSuccess();
      } catch (nextError) {
        isCompletingRef.current = false;
        setIsCompleting(false);
        setError(getUserFriendlyErrorMessage(nextError));
      }
    },
    [onSuccess, setActivePlaylist]
  );

  const pollDeviceStatus = useCallback(
    async (identity: DeviceIdentityPayload) => {
      if (isPollingRef.current || isCompletingRef.current) return;

      isPollingRef.current = true;

      try {
        const status = await backendClient.checkDevice({
          deviceId: identity.deviceId,
          mac: identity.mac,
        });

        if (status.state === "ACTIVE") {
          await completeActivation(status);
          return;
        }

        if (status.state === "PENDING" || status.state === "NO_DEVICE") {
          setTerminalState(null);
          setError(null);
          return;
        }

        setTerminalState(status.state);
        setError(
          status.reason || TERMINAL_STATE_MESSAGES[status.state] || "Activation failed"
        );
      } catch (nextError) {
        setError(getUserFriendlyErrorMessage(nextError));
      } finally {
        isPollingRef.current = false;
      }
    },
    [backendClient, completeActivation]
  );

  const refreshActivation = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    setTerminalState(null);
    setSession(null);
    setIsCompleting(false);
    isCompletingRef.current = false;

    try {
      const identity = getOrCreateDeviceIdentity();
      setDeviceIdentity(identity);

      const nextSession = await backendClient.generateDeviceQr(identity);
      setSession(nextSession);

      await pollDeviceStatus(identity);
    } catch (nextError) {
      setError(getUserFriendlyErrorMessage(nextError));
    } finally {
      setIsRefreshing(false);
    }
  }, [backendClient, pollDeviceStatus]);

  useEffect(() => {
    const bootstrapId = window.setTimeout(() => {
      void refreshActivation();
    }, 0);

    return () => {
      window.clearTimeout(bootstrapId);
    };
  }, [refreshActivation]);

  useEffect(() => {
    if (!deviceIdentity || !session || error || terminalState || isCompleting) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pollDeviceStatus(deviceIdentity);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    deviceIdentity,
    error,
    isCompleting,
    pollDeviceStatus,
    session,
    terminalState,
  ]);

  const statusText = statusLabelForState(
    session,
    error,
    terminalState,
    isCompleting
  );
  const description = describeState(error, terminalState, session);
  const rawCode = session?.settingsCode || "";
  const activationCode = rawCode
    ? rawCode.length === 6
      ? `${rawCode.slice(0, 3)} ${rawCode.slice(3)}`
      : rawCode
    : "......";
  const portalLink = formatPortalLink(session?.webLink || null);
  const expiresText = session?.expiresIn || null;
  const showRefresh = Boolean(error || terminalState || !session);
  const isErrorState = Boolean(error || terminalState);

  return (
    <div className={styles.activationPage}>
      <div className={styles.container}>
        {/* Left Column: Instructions and details */}
        <div className={styles.leftCol}>
          <div className={styles.brandingHeader}>
            <span className={styles.brandingWord}>SMARTIFLY</span>
            <span className={styles.brandingDot} />
            <span className={styles.brandingSubText}>TV ACTIVATION</span>
          </div>

          <h1 className={styles.title}>Connect your account</h1>
          
          <div className={styles.instructions}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <p className={styles.stepText}>
                Scan the QR code on the right with your phone camera, or visit{" "}
                <span className={styles.highlightText}>{portalLink}</span>
              </p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <p className={styles.stepText}>
                Enter the activation code below to link your device.
              </p>
            </div>
          </div>

          <div className={styles.codeContainer}>
            <div className={styles.codeLabel}>ACTIVATION CODE</div>
            <div className={styles.codeValue}>{activationCode}</div>
            {expiresText && (
              <div className={styles.expiryText}>Valid for {expiresText}</div>
            )}
          </div>

          <div className={styles.actions}>
            {showRefresh && (
              <Focusable
                id="btn-refresh-activation"
                onEnter={() => {
                  void refreshActivation();
                }}
                disabled={isRefreshing || isCompleting}
              >
                <div className={styles.btnPrimary}>
                  {isRefreshing ? "Refreshing..." : "Refresh Code"}
                </div>
              </Focusable>
            )}
            <Focusable id="btn-cancel-activation" onEnter={onBack} autoFocus>
              <div className={styles.btnCancel}>Cancel & Return</div>
            </Focusable>
          </div>

          {deviceIdentity?.deviceId && (
            <div className={styles.deviceId}>
              Device ID: <span>{deviceIdentity.deviceId}</span>
            </div>
          )}
        </div>

        {/* Right Column: QR Code card and status badge */}
        <div className={styles.rightCol}>
          <div className={styles.qrCard}>
            <div className={styles.qrWrapper}>
              {session?.qrCode ? (
                <img
                  src={session.qrCode}
                  alt="Activation QR code"
                  className={styles.qrImage}
                />
              ) : (
                <div className={styles.qrPlaceholder}>
                  {isRefreshing ? "Loading QR..." : "QR unavailable"}
                </div>
              )}
            </div>

            <div className={styles.statusBadge}>
              <div
                className={`${styles.statusDot} ${
                  isErrorState ? styles.statusDotError : styles.statusDotActive
                }`}
              />
              <span
                className={`${styles.statusText} ${
                  isErrorState ? styles.statusTextError : ""
                }`}
              >
                {statusText}
              </span>
            </div>
            {isErrorState ? (
              <p className={styles.errorDesc}>{description}</p>
            ) : (
              <p className={styles.statusDesc}>
                Once your account is linked, your TV will automatically sign in.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

