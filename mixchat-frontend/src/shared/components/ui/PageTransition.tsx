"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
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
    <motion.div
      key={pathname}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{
        opacity: 1,
        transition: {
          duration: shouldReduceMotion ? 0 : 0.16,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
};
