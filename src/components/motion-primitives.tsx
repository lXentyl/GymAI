"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// --- Motion Button ---
interface MotionButtonProps extends HTMLMotionProps<"button"> {
    className?: string;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
    ({ className, children, ...props }, ref) => (
        <motion.button
            ref={ref}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={className}
            {...props}
        >
            {children}
        </motion.button>
    )
);
MotionButton.displayName = "MotionButton";

// --- Motion Card ---
interface MotionCardProps extends HTMLMotionProps<"div"> {
    className?: string;
    glow?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
    ({ className, glow = false, children, ...props }, ref) => (
        <motion.div
            ref={ref}
            whileHover={{
                y: -2,
                transition: { duration: 0.2 },
            }}
            className={cn(
                glow &&
                    "hover:shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    )
);
MotionCard.displayName = "MotionCard";
