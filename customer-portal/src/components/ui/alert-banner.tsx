"use client";

import { motion } from "framer-motion";
import { X, Info, AlertTriangle, CheckCircle, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AlertBannerProps {
  title: string;
  message?: string;
  type?: "info" | "warning" | "success" | "announcement";
  dismissible?: boolean;
  className?: string;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  announcement: Megaphone,
};

const styles = {
  info: "bg-accent/10 border-accent/30 text-accent",
  warning: "bg-warning/10 border-warning/30 text-warning",
  success: "bg-success/10 border-success/30 text-success",
  announcement: "bg-primary/10 border-primary/30 text-primary",
};

export function AlertBanner({
  title,
  message,
  type = "info",
  dismissible = true,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative px-4 py-3 rounded-xl border",
        styles[type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{title}</p>
          {message && (
            <p className="text-sm opacity-80 mt-0.5">{message}</p>
          )}
        </div>
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-foreground/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}