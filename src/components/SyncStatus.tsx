"use client";

import { useStore } from "@/lib/store";
import { Check, Loader2, CloudOff, AlertTriangle } from "lucide-react";

// Индикатор синхронизации заметок с БД.
export default function SyncStatus() {
  const syncStatus = useStore((s) => s.syncStatus);
  const online = useStore((s) => s.online);

  let icon: React.ReactNode;
  let text: string;
  let color: string;

  if (!online) {
    icon = <CloudOff size={14} />;
    text = "Нет сети — сохраним позже";
    color = "text-muted";
  } else if (syncStatus === "saving") {
    icon = <Loader2 size={14} className="animate-spin" />;
    text = "Синхронизация…";
    color = "text-muted";
  } else if (syncStatus === "error") {
    icon = <AlertTriangle size={14} />;
    text = "Ошибка синхронизации";
    color = "text-danger";
  } else {
    icon = <Check size={14} strokeWidth={2.5} />;
    text = "Все изменения сохранены";
    color = "text-success";
  }

  return (
    <div className={`flex h-8 items-center gap-2 px-1 text-xs ${color}`} title="Состояние синхронизации с облаком">
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );
}
