"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Snappy page transition wrapper.
 * Keyed by pathname — on every route change the component remounts
 * with a fast 200ms fade-in + tiny slide. No exit animation wait,
 * so the new page appears instantly without any "double open" feel.
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={pathname}
        initial={
          shouldReduceMotion
            ? false
            : { opacity: 0, y: 10, scale: 0.997 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          shouldReduceMotion
            ? { opacity: 1 }
            : { opacity: 0, y: -5, scale: 0.999 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                opacity: { duration: 0.2, ease: "easeOut" },
                y: { type: "spring", stiffness: 430, damping: 38, mass: 0.7 },
                scale: { duration: 0.2, ease: "easeOut" },
              }
        }
        className="h-full w-full origin-top transform-gpu"
        style={shouldReduceMotion ? undefined : { willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
