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
  title: "NYC Code Compliance AI | #1 New York Building Codes & House Analyzer",
  description: "The most advanced AI analyzer for New York Codes. Get instant NYC DOB compliance checks for architectural plans, house designs, and building codes. Reduce rejections and save thousands in revision fees.",
  keywords: ["New York Codes", "NYC House Code", "NYC Building Code AI", "DOB Compliance Checker", "Architectural Plan Review NYC", "NYC Construction AI", "Building Code Search"],
  authors: [{ name: "NYC House Code Team" }],
  openGraph: {
    title: "NYC Code Compliance AI — Instant New York Codes Analysis",
    description: "Upload plans and get instant DOB compliance checks. The #1 AI tool for NYC architects.",
    type: "website",
    url: "https://nyccodes.codealgo.live",
    siteName: "NYC House Code",
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Code Compliance AI",
    description: "The fastest way to check NYC Building Codes for architectural plans.",
  },
  robots: "index, follow",
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
