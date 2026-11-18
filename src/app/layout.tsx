import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ADTU SWAYAM Assessment Portal | Engineering Psychology",
  description: "Assam Down Town University Self-Test Portal for Engineering Psychology (80 Questions).",
  icons: {
    icon: "/adtu-icon.png",
    shortcut: "/adtu-icon.png",
    apple: "/adtu-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/adtu-icon.png" type="image/png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-blue-900 selection:text-white bg-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}
