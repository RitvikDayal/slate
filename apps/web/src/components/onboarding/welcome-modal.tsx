"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { SlateLogo } from "@/components/brand/slate-logo";
import { useItemStore } from "@/stores/item-store";
import { scaleIn } from "@/lib/animations";

const ONBOARDED_KEY = "slate-onboarded";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const items = useItemStore((s) => s.items);
  const isLoading = useItemStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    const alreadyOnboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!alreadyOnboarded && items.length === 0) {
      setIsOpen(true);
    }
  }, [items.length, isLoading]);

  const dismiss = () => {
    setIsOpen(false);
    localStorage.setItem(ONBOARDED_KEY, "1");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            {step === 0 && (
              <div className="flex flex-col items-center text-center">
                <SlateLogo size="lg" />
                <h2 className="mt-5 text-xl font-bold text-foreground">
                  Welcome to Slate
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your AI-powered planner that schedules your day, captures tasks
                  from anywhere, and keeps you focused on what matters.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col items-center text-center">
                <h2 className="text-xl font-bold text-foreground">Try it out</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use the quick-add bar below your task list to create your first
                  task, or press <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">N</kbd> anywhere.
                </p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Let&apos;s go
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
