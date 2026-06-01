"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Вход по magic link на e-mail.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Письмо со ссылкой для входа отправлено. Проверьте почту.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">📝</div>
          <h1 className="mt-2 text-2xl font-bold">AI Notes</h1>
          <p className="text-sm text-[var(--muted)]">Войдите, чтобы начать</p>
        </div>

        {status === "sent" ? (
          <p className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-black transition hover:brightness-105 disabled:opacity-60"
            >
              {status === "sending" ? "Отправляем…" : "Получить ссылку для входа"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{message}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
