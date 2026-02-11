"use client";

import { motion } from "framer-motion";

interface WaterTankProps {
  current: number;
  target: number;
  className?: string;
}

export default function WaterTank({ current, target, className }: WaterTankProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className={`flex flex-col items-center gap-2 ${className || ""}`}>
      {/* Tank */}
      <div className="relative h-36 w-20 rounded-2xl border-2 border-border/60 bg-muted/30 overflow-hidden">
        {/* Fill */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 rounded-b-xl"
          style={{
            background: "linear-gradient(to top, rgba(59, 130, 246, 0.6), rgba(96, 165, 250, 0.3))",
          }}
        >
          {/* Wave effect */}
          <motion.div
            animate={{ x: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -top-2 left-0 right-0 h-4"
            style={{
              background: "radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.3) 0%, transparent 70%)",
              borderRadius: "50% 50% 0 0",
            }}
          />
        </motion.div>

        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-foreground/80 drop-shadow-sm">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    </div>
  );
}
