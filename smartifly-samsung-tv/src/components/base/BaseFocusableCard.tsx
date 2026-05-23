import type { ReactNode } from "react";
import { Focusable } from "../tv/Focusable";

type BaseFocusableCardProps = {
  id: string;
  children: ReactNode;
  className?: string;
  onClick: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
};

export const BaseFocusableCard = ({
  id,
  children,
  className,
  onClick,
  onFocus,
  autoFocus,
}: BaseFocusableCardProps) => {
  return (
    <Focusable
      id={id}
      className={className}
      onEnter={onClick}
      onFocus={onFocus}
      autoFocus={autoFocus}
    >
      {children}
    </Focusable>
  );
};
