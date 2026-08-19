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
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141d18" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Wesele Kinga i Kamil | Wspólny Album",
  description: "Dziel się zdjęciami i filmami z wesela Kingi i Kamila!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const r2Domain = (process.env.NEXT_PUBLIC_R2_DOMAIN || process.env.R2_PUBLIC_DOMAIN || "").trim();
  const isValidUrl = r2Domain.startsWith("http://") || r2Domain.startsWith("https://");

  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        {isValidUrl && (
          <>
            <link rel="preconnect" href={r2Domain} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={r2Domain} />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#faf8f5] dark:bg-[#0f1612] text-[#2c3e35] dark:text-[#e6ede8]`}
      >
        {children}
      </body>
    </html>
  );
}