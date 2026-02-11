"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

interface RestTimerProps {
  seconds: number;
  active: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ seconds, active, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (active) {
      setRemaining(seconds);
      setPaused(false);
    }
  }, [active, seconds]);

  useEffect(() => {
    if (!active || paused || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, paused, remaining, onComplete]);

  const circumference = 2 * Math.PI * 54;
  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * circumference : 0;

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8"
        >
          Descanso
        </motion.p>

        {/* Circle Timer */}
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transition={{ duration: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black tabular-nums">{formatTime(remaining)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => {
              setRemaining(seconds);
              setPaused(false);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hover:bg-foreground/10 transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPaused(!paused)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {paused ? <Play className="h-6 w-6 ml-0.5" /> : <Pause className="h-6 w-6" />}
          </button>

          <button
            onClick={onSkip}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hover:bg-foreground/10 transition-colors"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground mt-6"
        >
          Toca omitir para continuar
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
