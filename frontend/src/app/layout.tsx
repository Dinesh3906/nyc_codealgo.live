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
  title: "Code Algo | #1 New York Building Codes & House AI Analyzer",
  description: "Code Algo delivers the most advanced AI analyzer for New York Codes. Get instant NYC DOB compliance checks for architectural plans, house designs, and building codes.",
  keywords: ["Code Algo", "New York Codes", "NYC House Code", "NYC Building Code AI", "DOB Compliance Checker", "Architectural Plan Review NYC", "NYC Construction AI", "Building Code Search"],
  authors: [{ name: "Code Algo Team" }],
  openGraph: {
    title: "Code Algo — Instant New York Codes Analysis",
    description: "Code Algo's AI-powered DOB compliance checks for architectural plans. The #1 tool for NYC architects.",
    type: "website",
    url: "https://nyccodes.codealgo.live",
    siteName: "Code Algo NYC House Code",
  },
  twitter: {
    card: "summary_large_image",
    title: "Code Algo | NYC Code Compliance",
    description: "The fastest way to check NYC Building Codes with Code Algo AI.",
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
