"use client";

import React, { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  mobilePresentation?: "dialog" | "sheet" | "fullscreen";
  closeDisabled?: boolean;
}

const maxWidths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

const emptySubscribe = () => () => {};
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let openModalCount = 0;
let originalBodyOverflow = "";

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  contentClassName,
  maxWidth = "md",
  mobilePresentation = "dialog",
  closeDisabled = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    if (openModalCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModalCount += 1;

    const frame = requestAnimationFrame(() => {
      const preferredFocus = dialogRef.current?.querySelector<HTMLElement>(
        "[data-modal-autofocus]",
      );
      const firstFocusable =
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (preferredFocus ?? firstFocusable ?? dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape" && !closeDisabled) {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
        );
        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] flex select-none",
            mobilePresentation === "dialog"
              ? "items-center justify-center p-3 sm:p-4"
              : "items-end justify-center p-0 sm:items-center sm:p-4",
          )}
        >
          {/* Glass Backdrop */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={closeDisabled ? undefined : onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            aria-hidden="true"
          />

          {/* Modal Dialog Card */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={
              shouldReduceMotion
                ? false
                : mobilePresentation === "dialog"
                  ? { opacity: 0, scale: 0.96, y: 12 }
                  : { opacity: 0, scale: 0.99, y: 32 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            data-mobile-presentation={mobilePresentation}
            className={cn(
              "relative z-10 flex w-full flex-col overflow-hidden border border-white/12 bg-[#0d1220]/98 shadow-[0_20px_60px_rgba(0,0,0,0.72)] backdrop-blur-2xl",
              mobilePresentation === "dialog"
                ? "my-auto max-h-[90dvh] rounded-3xl p-5 sm:p-6"
                : mobilePresentation === "fullscreen"
                  ? "h-[calc(var(--app-viewport-height)-var(--sat))] max-h-[calc(var(--app-viewport-height)-var(--sat))] rounded-none border-0 bg-[#0d1220] p-0 shadow-none backdrop-blur-none sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:border sm:border-white/12 sm:bg-[#0d1220]/98 sm:shadow-[0_20px_60px_rgba(0,0,0,0.72)] sm:backdrop-blur-2xl"
                  : "max-h-[min(88dvh,760px)] rounded-t-[1.75rem] rounded-b-none p-0 sm:max-h-[90dvh] sm:rounded-3xl sm:p-6",
              maxWidths[maxWidth],
              className,
            )}
          >
            {mobilePresentation === "sheet" && (
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/18 sm:hidden"
              />
            )}

            {title && (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between pb-3.5",
                  mobilePresentation === "dialog"
                    ? "mb-4"
                    : "mb-0 px-4 pt-3 sm:px-6 sm:pt-4",
                )}
              >
                <h3
                  id={titleId}
                  className="text-base sm:text-lg font-black text-white tracking-tight"
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  disabled={closeDisabled}
                  aria-label="Close modal"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar",
                contentClassName,
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
