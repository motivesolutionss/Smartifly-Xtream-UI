import React from "react";
import { Focusable } from "../../components/tv/Focusable";
import styles from "./Activation.module.css";

interface ActivationProps {
  onBack: () => void;
}

export const Activation: React.FC<ActivationProps> = ({ onBack }) => {
  return (
    <div className={styles.activationPage}>
      {/* Immersive Background */}
      <div className={styles.background}>
        <img src="/center_pillar.png" className={styles.bgImage} alt="" />
        <div className={styles.bgOverlay} />
      </div>

      {/* Main Glass Card */}
      <div className={styles.glassCard}>
        {/* Left Branding */}
        <div className={styles.brandingSide}>
          <img src="/smartifly_logo.png" alt="Smartifly" className={styles.logo} />
          <h2 className={styles.brandingTitle}>SMARTIFLY TV</h2>
          <div className={styles.brandingSubtitle}>Enterprise Activation</div>
        </div>

        {/* Right Content */}
        <div className={styles.contentSide}>
          <div className={styles.header}>
            <div className={styles.statusIndicator}>
              <div className={styles.statusDot} />
              <span className={styles.statusText}>AWAITING BINDING...</span>
            </div>
            <h1 className={styles.title}>Connect your account</h1>
            <p className={styles.desc}>
              Scan the QR code or visit the link below on your phone.{"\n"}
              Once logged in, your TV will automatically activate.
            </p>
          </div>

          <div className={styles.activationGrid}>
            <div className={styles.qrWrapper}>
              <svg className={styles.qrImage} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H33V33H0V0ZM7 7V26H26V7H7Z" fill="black"/>
                <path d="M11 11H22V22H11V11Z" fill="black"/>
                <path d="M67 0H100V33H67V0ZM74 7V26H93V7H74Z" fill="black"/>
                <path d="M78 11H89V22H78V11Z" fill="black"/>
                <path d="M0 67H33V100H0V67ZM7 74V93H26V74H7Z" fill="black"/>
                <path d="M11 78H22V89H11V78Z" fill="black"/>
                <path d="M40 0H50V10H40V0ZM55 0H65V10H55V0ZM40 15H50V25H40V15ZM55 15H65V25H55V15ZM40 30H50V40H40V30ZM55 30H65V40H55V30Z" fill="black"/>
                <path d="M0 40H10V50H0V40ZM15 40H25V50H15V40ZM30 40H40V50H30V40Z" fill="black"/>
                <path d="M40 45H55V60H40V45ZM60 45H75V60H60V45ZM80 45H100V60H80V45Z" fill="black"/>
                <path d="M40 65H55V80H40V65ZM60 65H75V80H60V65ZM80 65H100V80H80V65Z" fill="black"/>
                <path d="M40 85H55V100H40V85ZM60 85H75V100H60V85ZM80 85H100V100H80V85Z" fill="black"/>
              </svg>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.group}>
                <span className={styles.label}>Activation Code</span>
                <div className={styles.value}>693064</div>
              </div>
              <div className={styles.group}>
                <span className={styles.label}>Portal Link</span>
                <div className={styles.link}>smartifly.app/activate</div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Focusable id="btn-cancel-activation" onEnter={onBack} autoFocus>
              <div className={styles.btnCancel}>Cancel & Return</div>
            </Focusable>
          </div>
        </div>
      </div>
    </div>
  );
};
