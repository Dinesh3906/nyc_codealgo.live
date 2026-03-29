import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brickly | AI-Powered NYC DOB Compliance Checks",
  description: "Upload architectural plans and get instant DOB compliance checks. Reduce rejections, save time, and submit with confidence. Built for NYC architects and developers.",
  keywords: ["NYC DOB", "Building Compliance", "AI Architectural Review", "Plan Check", "NYC Building Code"],
  openGraph: {
    title: "Brickly — Instant NYC DOB Compliance",
    description: "AI-powered checks for your architectural plans. Before you submit to the DOB.",
    type: "website",
  }
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-100 selection:text-indigo-900`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
