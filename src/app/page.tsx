import Link from "next/link";

// Лендинг с маркетинговым описанием.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 text-5xl">📝</div>
      <h1 className="text-4xl font-bold tracking-tight">AI Notes</h1>
      <p className="mt-1 text-lg text-[var(--muted)]">Эйяй Ноутс</p>

      <p className="mt-8 max-w-2xl text-base leading-relaxed text-[var(--text)]">
        Записывайте интересные идеи, конспектируйте лекции, храните рецепты,
        составляйте списки покупок или планы путешествий. Заметки синхронизируются
        на всех устройствах — смотрите и дополняйте записи дома, на работе или в
        поездке.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-2 text-left text-sm text-[var(--muted)] sm:grid-cols-2">
        <li>🎨 Цветные теги и фильтрация</li>
        <li>🤖 AI-поиск и AI-сводка по заметкам</li>
        <li>✍️ Рерайт и сокращение текста с AI</li>
        <li>✅ Списки, чек-листы и таблицы</li>
        <li>⏰ Напоминания к заметкам</li>
        <li>📤 Экспорт в Markdown и .txt</li>
        <li>🖼️ До 10 изображений в заметке</li>
        <li>🗂️ Архив удалённых заметок</li>
      </ul>

      <Link
        href="/notes"
        className="mt-10 rounded-full bg-[var(--accent)] px-8 py-3 font-medium text-black transition hover:brightness-105"
      >
        Открыть заметки
      </Link>
    </main>
  );
}
