import type { Variants, Transition } from "framer-motion";

/** Standard spring for layout animations */
export const layoutSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 35,
};

/** Container that staggers children on enter */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

/** Individual task item enter/exit */
export const taskItemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 40 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

/** Scale-in for modals and overlays */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 35 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.12 },
  },
};

/** Floating icon pulse */
export const floatingIcon: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 25 },
  },
};

/** Page header fade in from top */
export const pageHeaderVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};
