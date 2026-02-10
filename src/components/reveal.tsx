"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}

const variants: Variants = {
  hidden: (y: number) => ({
    opacity: 0,
    y,
  }),
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  y = 20,
  className,
}: RevealProps) {
  return (
    <motion.div
      custom={y}
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
