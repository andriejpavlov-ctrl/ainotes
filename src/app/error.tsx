"use client";

import { useEffect } from "react";

// Глобальный обработчик клиентских ошибок: показывает понятный экран
// и даёт перезагрузиться, вместо стандартного «Application error».
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Клиентская ошибка:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">😕</div>
      <h1 className="mt-3 text-xl font-semibold">Что-то пошло не так</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
        Произошла ошибка в приложении. Попробуйте обновить страницу — данные
        сохранены в облаке и не потеряются.
      </p>
      {error?.message && (
        <pre className="mt-3 max-w-md overflow-x-auto rounded-lg bg-black/5 p-3 text-left text-xs text-[var(--muted)]">
          {error.message}
        </pre>
      )}
      <div className="mt-5 flex gap-2">
        <button
          onClick={reset}
          className="rounded-full bg-[var(--accent)] px-6 py-2.5 font-medium text-black hover:brightness-105"
        >
          Попробовать снова
        </button>
        <button
          onClick={() => (window.location.href = "/notes")}
          className="rounded-full border border-[var(--border)] px-6 py-2.5 font-medium hover:bg-black/5"
        >
          На главную
        </button>
      </div>
    </main>
  );
}
