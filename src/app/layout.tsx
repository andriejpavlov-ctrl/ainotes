import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Notes — Эйяй Ноутс",
  description:
    "Минималистичные заметки с AI: списки, форматирование, теги, напоминания и синхронизация на всех устройствах.",
};

// Корректное масштабирование и работа на мобильных (особенно Safari в iOS).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
