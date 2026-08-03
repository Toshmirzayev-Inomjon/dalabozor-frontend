/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND = process.env.BACKEND_ORIGIN || "https://dalabozor-backend.up.railway.app";
const WEB_ROOT = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: WEB_ROOT,
  // API'ni bir origin orqali proxy qilamiz — shunda Mini App (telefon) uchun
  // bitta tunnel yetadi va CORS muammosi bo'lmaydi.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
    ];
  },
};

export default nextConfig;
