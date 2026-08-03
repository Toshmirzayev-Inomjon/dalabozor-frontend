import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DalaBozor — daladan oshxonagacha",
    template: "%s · DalaBozor",
  },
  description:
    "Dehqon, restoran va yetkazib beruvchilar uchun yagona raqamli agrobozor. Kechqurun buyurtma, ertalab yetkazib berish.",
  applicationName: "DalaBozor",
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    title: "DalaBozor — daladan oshxonagacha",
    description: "Dehqon, restoran va yig‘uvchini bitta aniq savdo-yetkazish oqimida birlashtiruvchi agro platforma.",
    siteName: "DalaBozor",
  },
  twitter: {
    card: "summary",
    title: "DalaBozor — daladan oshxonagacha",
    description: "Dehqon, restoran va yig‘uvchi uchun yagona raqamli agrobozor.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f5ee",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className="antialiased">{children}</body>
    </html>
  );
}
