import React from "react";
import { AlertCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { returnToLogin } from "../../utils/sessionRecovery";
import styles from "./ErrorView.module.css";

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
  showBackToLogin?: boolean;
  onBackToLogin?: () => void;
  backToLoginLabel?: string;
  className?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = "Something went wrong. Please try again.",
  onRetry,
  showBackToLogin = false,
  onBackToLogin,
  backToLoginLabel = "Back to Login",
  className = "",
}) => {
  const handleBackToLogin = () => {
    onBackToLogin?.() ?? returnToLogin();
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.iconWrapper}>
        <AlertCircle size={64} className="text-error" />
      </div>
      <h2 className="headline-medium">Oops!</h2>
      <p className="body-large text-tertiary">{message}</p>
      {(onRetry || showBackToLogin) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button
              id="error-retry"
              onClick={onRetry}
              autoFocus
              className={styles.retryBtn}
            >
              <RefreshCw size={20} />
              Try Again
            </Button>
          )}
          {showBackToLogin && (
            <Button
              id="error-back-to-login"
              onClick={handleBackToLogin}
              variant="secondary"
              autoFocus={!onRetry}
              className={styles.secondaryBtn}
            >
              <LogOut size={20} />
              {backToLoginLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
