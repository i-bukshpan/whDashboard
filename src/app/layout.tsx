import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "לוח בקרה - WhatsApp Dashboard",
  description: "ממשק ניהול צ׳אט WhatsApp חכם עם חיבור לבוטים ומענה אנושי",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="h-full">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
