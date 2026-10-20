import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Eagle Companion — رفيق النسر",
    template: "%s | Eagle Companion",
  },
  description:
    "لوحة شفافة لإدارة أجهزتك الشخصية والعائلية: حالة الجهاز، اقتران بموافقة، ومشاركة شاشة صريحة لا تُسجَّل.",
  applicationName: "Eagle Companion",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ["/icon.svg", "/icon-192.png"],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eagle Companion",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen text-ink antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
