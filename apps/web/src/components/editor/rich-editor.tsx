"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichEditorProps {
  content: Record<string, unknown> | null;
  onUpdate: (json: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichEditor({
  content,
  onUpdate,
  placeholder = "Add notes, checklists, or details...",
  editable = true,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
    ],
    content: content as Record<string, unknown> | undefined,
    editable,
    editorProps: {
      attributes: {
        class: "rich-editor prose prose-sm max-w-none focus:outline-none min-h-[120px]",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content as Record<string, unknown>);
      }
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50">
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {[
            { icon: Bold, command: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
            { icon: Italic, command: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
            { icon: Strikethrough, command: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
            { icon: Code, command: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
            { icon: Heading1, command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
            { icon: Heading2, command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
            { icon: List, command: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
            { icon: ListOrdered, command: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
          ].map(({ icon: Icon, command, active }, i) => (
            <button
              key={i}
              type="button"
              onClick={command}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
