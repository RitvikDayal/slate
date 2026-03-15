"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Paperclip,
  Link2,
  Trash2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAttachmentStore } from "@/stores/attachment-store";
import type { Attachment } from "@ai-todo/shared";

interface AttachmentsSectionProps {
  itemId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string | null): boolean {
  return mimeType?.startsWith("image/") ?? false;
}

const fadeIn = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15 },
};

export function AttachmentsSection({ itemId }: AttachmentsSectionProps) {
  const { attachments, isLoading, fetchAttachments, addAttachment, deleteAttachment } =
    useAttachmentStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    void fetchAttachments(itemId);
  }, [itemId, fetchAttachments]);

  useEffect(() => {
    if (showLinkInput) {
      linkInputRef.current?.focus();
    }
  }, [showLinkInput]);

  const images = attachments.filter(
    (a: Attachment) => a.type === "file" && isImage(a.mime_type)
  );
  const files = attachments.filter(
    (a: Attachment) => a.type === "file" && !isImage(a.mime_type)
  );
  const links = attachments.filter((a: Attachment) => a.type === "link");

  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      setIsUploading(true);
      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          if (!file) continue;
          // Create a placeholder URL (real upload would go to Supabase Storage)
          const placeholderUrl = `attachment://${file.name}`;
          await addAttachment(itemId, {
            type: "file",
            name: file.name,
            url: placeholderUrl,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          });
        }
      } catch {
        // Error handled by store
      } finally {
        setIsUploading(false);
      }
    },
    [itemId, addAttachment]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        void handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  const handleAddLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    try {
      const url = new URL(
        linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
      );
      void addAttachment(itemId, {
        type: "link",
        name: url.hostname,
        url: url.toString(),
      });
      setLinkUrl("");
      setShowLinkInput(false);
    } catch {
      // Invalid URL — ignore
    }
  }, [linkUrl, itemId, addAttachment]);

  const handleDelete = useCallback(
    (attachmentId: string) => {
      void deleteAttachment(itemId, attachmentId);
    },
    [itemId, deleteAttachment]
  );

  const hasAttachments = attachments.length > 0;

  return (
    <div className="border-t border-border px-6 py-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Attachments
      </p>

      {isLoading && !hasAttachments && (
        <div className="flex items-center gap-2 py-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {/* Images grid */}
        {images.length > 0 && (
          <motion.div key="images" {...fadeIn} className="mb-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((img) => (
                <ImageAttachment
                  key={img.id}
                  attachment={img}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Files list */}
        {files.length > 0 && (
          <motion.div key="files" {...fadeIn} className="mb-3 space-y-1">
            {files.map((file) => (
              <FileAttachment
                key={file.id}
                attachment={file}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}

        {/* Links list */}
        {links.length > 0 && (
          <motion.div key="links" {...fadeIn} className="mb-3 space-y-1">
            {links.map((link) => (
              <LinkAttachment
                key={link.id}
                attachment={link}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link URL inline input */}
      <AnimatePresence>
        {showLinkInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={linkInputRef}
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLink();
                  if (e.key === "Escape") {
                    setShowLinkInput(false);
                    setLinkUrl("");
                  }
                }}
                placeholder="Paste URL and press Enter..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag-drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[64px] items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragOver
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/60 text-muted-foreground hover:border-border hover:text-muted-foreground/80"
        )}
      >
        {isUploading ? (
          <div className="flex items-center gap-2 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3">
            <Upload className="h-4 w-4" />
            <span className="text-xs">
              {isDragOver ? "Drop files here" : "Drag files here"}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFileUpload(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach file
        </button>
        <button
          type="button"
          onClick={() => setShowLinkInput(true)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
          Add link
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ImageAttachment({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/30"
    >
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full items-center justify-center"
      >
        {attachment.thumbnail_url ? (
          <img
            src={attachment.thumbnail_url}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            <span className="max-w-full truncate px-2 text-[10px]">
              {attachment.name}
            </span>
          </div>
        )}
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(attachment.id);
        }}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        aria-label={`Delete ${attachment.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function FileAttachment({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/40"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm text-foreground">{attachment.name}</p>
        {attachment.size_bytes != null && (
          <p className="text-[11px] text-muted-foreground">
            {formatBytes(attachment.size_bytes)}
          </p>
        )}
      </a>
      <button
        type="button"
        onClick={() => onDelete(attachment.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        aria-label={`Delete ${attachment.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function LinkAttachment({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/40"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Link2 className="h-4 w-4" />
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm text-foreground">{attachment.name}</p>
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3 shrink-0" />
          {attachment.url}
        </p>
      </a>
      <button
        type="button"
        onClick={() => onDelete(attachment.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        aria-label={`Delete ${attachment.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
