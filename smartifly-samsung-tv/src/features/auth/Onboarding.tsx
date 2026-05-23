import React from "react";
import { Focusable } from "../../components/tv/Focusable";
import styles from "./Onboarding.module.css";

interface OnboardingProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSignIn, onCreateAccount }) => {
  return (
    <div className={styles.onboardingPage}>
      <div className={styles.onboardingGlow} />

      {/* Left Panel: Branding & Actions */}
      <div className={styles.leftPanel}>
        <img src="/smartifly_logo.png" alt="Smartifly" className={styles.logo} />
        
        <h1 className={styles.title}>
          The Future{"\n"}of Television.
        </h1>

        <p className={styles.description}>
          Experience 4K IPTV, live cable, and premium streaming in one unified, high-performance interface.
        </p>

        <div className={styles.buttonGroup}>
          <Focusable id="btn-signin" onEnter={onSignIn} autoFocus className={styles.btnOnboarding}>
            <div className={`${styles.btnOnboarding} ${styles.btnPrimary}`}>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Sign In
            </div>
          </Focusable>

          <Focusable id="btn-signup" onEnter={onCreateAccount} className={styles.btnOnboarding}>
            <div className={`${styles.btnOnboarding} ${styles.btnSecondary}`}>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
              </svg>
              Create Account
            </div>
          </Focusable>
        </div>

        <div className={styles.statusRow}>
          <span className={styles.stableBadge}>STABLE</span>
          <span className={styles.statusText}>Unified Stream Hub • 4K HDR Optimized</span>
        </div>
      </div>

      {/* Right Panel: Cinematic Showcase */}
      <div className={styles.rightPanel}>
        <div className={styles.cardStack}>
          <div className={`${styles.posterCard} ${styles.posterLeft}`}>
            <img src="/left_pillar.png" className={styles.posterImage} alt="" />
            <div className={styles.cardReflection} />
          </div>
          <div className={`${styles.posterCard} ${styles.posterCenter}`}>
            <img src="/center_pillar.png" className={styles.posterImage} alt="" />
            <div className={styles.cardReflection} />
          </div>
          <div className={`${styles.posterCard} ${styles.posterRight}`}>
            <img src="/right_pillar.png" className={styles.posterImage} alt="" />
            <div className={styles.cardReflection} />
          </div>
        </div>
      </div>
    </div>
  );
};
