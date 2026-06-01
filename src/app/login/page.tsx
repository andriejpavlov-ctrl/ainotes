"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(translate(error.message));
        setLoading(false);
        return;
      }
      // Если подтверждение почты выключено — сессия выдаётся сразу.
      if (data.session) {
        window.location.href = "/notes";
        return;
      }
      setInfo(
        "Аккаунт создан. Если включено подтверждение почты — проверьте письмо. Иначе войдите по этим же e-mail и паролю.",
      );
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(translate(error.message));
      setLoading(false);
      return;
    }
    window.location.href = "/notes";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">📝</div>
          <h1 className="mt-2 text-2xl font-bold">AI Notes</h1>
          <p className="text-sm text-[var(--muted)]">
            {mode === "signin" ? "Войдите в свой аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--accent)]"
          />
          <input
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {loading
              ? "Подождите…"
              : mode === "signin"
                ? "Войти"
                : "Зарегистрироваться"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{info}</p>}
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {mode === "signin" ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {mode === "signin" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </main>
  );
}

// Перевод частых ошибок Supabase на русский.
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный e-mail или пароль.";
  if (m.includes("user already registered")) return "Пользователь с таким e-mail уже зарегистрирован.";
  if (m.includes("email not confirmed"))
    return "E-mail не подтверждён. Отключите «Confirm email» в Supabase или подтвердите почту.";
  if (m.includes("password")) return "Пароль не подходит (минимум 6 символов).";
  return message;
}
