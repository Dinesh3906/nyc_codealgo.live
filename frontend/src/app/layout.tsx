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
  title: "CodeAlgo | #1 New York Building Codes & House AI Analyzer",
  description: "Complete NYC house codes list, New York building regulations, and home plan code verification platform for residential and commercial properties.",
  keywords: ["NYC codes checking", "New york codes", "Nyc codes", "Nyc codes list", "Nyc codes ppt", "New york city codes", "New york city house codes", "New york city house codes list", "NYC house codes list", "New York building codes", "NYC code compliance checker"],
  authors: [{ name: "CodeAlgo Team" }],
  alternates: {
    canonical: "https://nyccodes.codealgo.live",
  },
  openGraph: {
    title: "CodeAlgo | #1 New York Building Codes & House AI Analyzer",
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

const faqJsonLd = {
 "@context":"https://schema.org",
 "@type":"FAQPage",
 "mainEntity":[
   {
     "@type":"Question",
     "name":"What are NYC house codes?",
     "acceptedAnswer":{
       "@type":"Answer",
       "text":"NYC house codes are strict building, safety, electrical, and plumbing regulations governing construction and safety for residential and commercial properties in New York City."
     }
   },
   {
     "@type":"Question",
     "name":"How do I verify New York building compliance?",
     "acceptedAnswer":{
       "@type":"Answer",
       "text":"You can use CodeAlgo's AI compliance platform to instantly verify your house plans, construction estimates, and architectural quotes against the latest NYC DOB codes."
     }
   },
   {
     "@type":"Question",
     "name":"What codes apply to residential homes in NYC?",
     "acceptedAnswer":{
       "@type":"Answer",
       "text":"Residential homes in NYC must adhere to the 2022 NYC Construction Codes, the NYC Fire Code, Zoning Resolution, and specific Multiple Dwelling Laws depending on the borough."
     }
   }
 ]
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
