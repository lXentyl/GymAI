"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface ErrorBoundaryProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorBoundary({ message, onRetry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 space-y-4 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {t("error.connectionFailed")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {message || t("error.tryAgain")}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry || (() => window.location.reload())}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        {t("error.retry")}
      </Button>
    </motion.div>
  );
}
