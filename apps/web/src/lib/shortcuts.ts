type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  handler: ShortcutHandler;
  description: string;
}

const shortcuts: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut) {
  shortcuts.push(shortcut);
  return () => {
    const index = shortcuts.indexOf(shortcut);
    if (index > -1) shortcuts.splice(index, 1);
  };
}

export function initShortcuts() {
  function handleKeyDown(e: KeyboardEvent) {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Allow Cmd+K even in inputs
      if (!(e.metaKey && e.key === "k")) return;
    }

    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : true;
      if (e.key === shortcut.key && metaMatch && shiftMatch) {
        e.preventDefault();
        shortcut.handler(e);
        return;
      }
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}
