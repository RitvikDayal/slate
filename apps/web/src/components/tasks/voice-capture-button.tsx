"use client";

import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";

interface VoiceCaptureButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceCaptureButton({
  onTranscript,
  disabled,
  className,
}: VoiceCaptureButtonProps) {
  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    onResult: (text) => {
      onTranscript(text);
    },
  });

  if (!isSupported) return null; // Hide on unsupported browsers

  const handleToggle = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title={isListening ? "Stop recording" : "Voice input"}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
        isListening
          ? "bg-red-500/15 text-red-500"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
        className
      )}
      aria-label={isListening ? "Stop recording" : "Voice input"}
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.div
            key="listening"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            {/* Pulsing ring animation */}
            <motion.span
              className="absolute inset-0 rounded-xl bg-red-500/10"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <MicOff className="relative h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Mic className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
