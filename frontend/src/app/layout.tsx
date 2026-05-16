import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NYC House Code | AI-Powered NYC DOB Compliance Checks",
  description: "Upload architectural plans and get instant DOB compliance checks. Reduce rejections, save time, and submit with confidence. Built for NYC architects and developers.",
  keywords: ["NYC DOB", "Building Compliance", "AI Architectural Review", "Plan Check", "NYC Building Code"],
  openGraph: {
    title: "NYC House Code — Instant NYC DOB Compliance",
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
      <body className={`${inter.variable} font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
