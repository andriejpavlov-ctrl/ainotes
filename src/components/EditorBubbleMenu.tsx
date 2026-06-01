"use client";

import { useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { Sparkles, Wand2, Scissors, SpellCheck2, Megaphone, MessageSquare, Bell, Loader2 } from "lucide-react";

type Action = "reformulate" | "shorten" | "expand" | "tone" | "fix" | "custom";

export default function EditorBubbleMenu({
  editor,
  onRemind,
}: {
  editor: Editor;
  onRemind: (selectedText: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  function getSelection() {
    const { from, to } = editor.state.selection;
    return { from, to, text: editor.state.doc.textBetween(from, to, " ") };
  }

  async function rewrite(action: Action) {
    const { from, to, text } = getSelection();
    if (!text.trim()) return;
    let instruction: string | undefined;
    if (action === "custom") {
      const ans = window.prompt("Что сделать с выделенным текстом?", "Сделай дружелюбнее");
      if (!ans) return;
      instruction = ans;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, instruction }),
      });
      const data = await res.json();
      if (data.result) {
        editor.chain().focus().insertContentAt({ from, to }, data.result).run();
      } else {
        alert(data.error || "Не удалось обработать текст.");
      }
    } catch {
      alert("Ошибка обращения к ИИ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, maxWidth: "none" }}
      shouldShow={({ editor: ed, from, to }) => from !== to && !ed.isActive("codeBlock")}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 shadow-lg">
        {busy ? (
          <span className="flex items-center gap-1 px-2 py-1 text-sm text-[var(--accent)]">
            <Loader2 size={14} className="animate-spin" /> ИИ работает…
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1 px-1 text-xs font-medium text-[var(--accent)]">
              <Sparkles size={13} /> ИИ
            </span>
            <Item icon={<Wand2 size={14} />} label="Переформулировать" onClick={() => rewrite("reformulate")} />
            <Item icon={<Scissors size={14} />} label="Сократить" onClick={() => rewrite("shorten")} />
            <Item icon={<SpellCheck2 size={14} />} label="Исправить ошибки" onClick={() => rewrite("fix")} />
            <Item icon={<Megaphone size={14} />} label="Сменить тон" onClick={() => rewrite("tone")} />
            <Item icon={<MessageSquare size={14} />} label="Своя команда" onClick={() => rewrite("custom")} />
            <span className="mx-0.5 h-5 w-px bg-[var(--border)]" />
            <Item icon={<Bell size={14} />} label="Напоминание" onClick={() => onRemind(getSelection().text)} />
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function Item({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 items-center gap-1 rounded-md px-2 text-sm hover:bg-black/10"
    >
      {icon}
    </button>
  );
}
