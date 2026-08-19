import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#065f46",
};

export const metadata: Metadata = {
  title: "Kinga i Kamil - Photo Party",
  description: "Wesele Kinga i Kamil - Pamiątkowy album gości",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#faf8f5] dark:bg-[#0f1612] text-[#2c3e35] dark:text-[#e6ede8] transition-colors duration-200 select-none touch-manipulation`}
      >
        {children}
      </body>
    </html>
  );
}