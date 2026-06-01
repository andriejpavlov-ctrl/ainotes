"use client";

import { useStore } from "@/lib/store";
import { Check, Loader2, CloudOff, AlertTriangle } from "lucide-react";

// Индикатор синхронизации заметок с БД (слева внизу, рядом с «Выйти»).
export default function SyncStatus() {
  const syncStatus = useStore((s) => s.syncStatus);
  const online = useStore((s) => s.online);

  let icon: React.ReactNode;
  let text: string;
  let color: string;

  if (!online) {
    icon = <CloudOff size={14} />;
    text = "Нет сети — сохраним позже";
    color = "text-[var(--muted)]";
  } else if (syncStatus === "saving") {
    icon = <Loader2 size={14} className="animate-spin" />;
    text = "Синхронизация…";
    color = "text-[var(--muted)]";
  } else if (syncStatus === "error") {
    icon = <AlertTriangle size={14} />;
    text = "Ошибка синхронизации";
    color = "text-red-600";
  } else {
    icon = <Check size={14} />;
    text = "Все изменения сохранены";
    color = "text-green-600";
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 text-xs ${color}`} title="Состояние синхронизации с облаком">
      <span className="flex h-2 w-2 items-center justify-center">
        <span
          className={`h-2 w-2 rounded-full ${
            !online
              ? "bg-[var(--muted)]"
              : syncStatus === "error"
                ? "bg-red-500"
                : syncStatus === "saving"
                  ? "bg-amber-400"
                  : "bg-green-500"
          }`}
        />
      </span>
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );
}
