/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint-предупреждения не должны блокировать прод-сборку (типы проверяются отдельно).
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Изображения заметок хранятся в Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
