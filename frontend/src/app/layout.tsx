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
  title: "CodeAlgo | NYC Home Quote Verification & House Plan Validation",
  description: "CodeAlgo verifies New York home quotes, house plans, construction estimates, and property documentation with accuracy and compliance.",
  keywords: ["NYC house plans", "home quote verification", "New York construction quotes", "building estimate verification", "CodeAlgo", "Residential Quote Verification", "Building Plan Validation"],
  authors: [{ name: "CodeAlgo Team" }],
  alternates: {
    canonical: "https://nyccodes.codealgo.live",
  },
  openGraph: {
    title: "CodeAlgo - NYC Quote Verification",
    description: "Verify New York home plans and construction quotes with CodeAlgo.",
    type: "website",
    url: "https://nyccodes.codealgo.live",
    siteName: "CodeAlgo",
    images: [
      {
        url: "https://nyccodes.codealgo.live/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CodeAlgo NYC Plan Verification",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeAlgo",
    description: "NYC Home Quote & House Plan Verification Platform",
  },
  robots: "index, follow",
  verification: {
    google: "_5er4jeJ8TtJrhHTqD3gaVeQt__QaenGj8MEZRKO0W0",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CodeAlgo",
  "url": "https://nyccodes.codealgo.live",
  "logo": "https://nyccodes.codealgo.live/logo.png",
  "description": "NYC home quote and house plan verification platform",
  "areaServed": "New York",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "addressCountry": "US"
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
