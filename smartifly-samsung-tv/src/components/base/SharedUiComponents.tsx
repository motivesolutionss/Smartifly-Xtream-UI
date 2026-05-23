import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import styles from "./SharedUiComponents.module.css";

type BadgeProps = {
  text: string;
  containerColor?: string;
  contentColor?: string;
};

export const Badge = ({
  text,
  containerColor = "var(--color-primary)",
  contentColor = "var(--color-text-primary)",
}: BadgeProps) => {
  return (
    <span
      className={styles.badge}
      style={
        {
          "--badge-bg": containerColor,
          "--badge-content": contentColor,
        } as CSSProperties
      }
    >
      {text}
    </span>
  );
};

export const DotSeparator = () => {
  return <span className={styles.dotSeparator} aria-hidden="true" />;
};

type AppIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export const AppIconButton = ({ children, ...props }: AppIconButtonProps) => {
  return (
    <button className={styles.iconButton} type="button" {...props}>
      {children}
    </button>
  );
};
