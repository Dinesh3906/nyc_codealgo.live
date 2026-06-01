import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nyccodes.codealgo.live'),
  title: "NYC Building Code AI Compliance Checker | CodeAlgo",
  description: "Check architectural plans against 112+ NYC building codes instantly. Detect DOB violations and generate PDF compliance reports. Check your plans for free!",
  keywords: [
    "NYC building code",
    "DOB code requirements",
    "NYC DOB compliance",
    "architect software",
    "NYC fire code",
    "building code checker",
    "NYC house codes list"
  ],
  authors: [{ name: "CodeAlgo Editorial Team" }],
  alternates: {
    canonical: "https://nyccodes.codealgo.live",
  },
  openGraph: {
    title: "NYC Building Code AI Compliance Checker | CodeAlgo",
    description: "Check architectural plans against 112+ NYC building codes instantly. Detect DOB violations and generate PDF compliance reports.",
    type: "website",
    url: "https://nyccodes.codealgo.live",
    siteName: "CodeAlgo",
    images: [
      {
        url: "https://nyccodes.codealgo.live/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CodeAlgo — NYC Building Code Compliance Checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NYC Building Code AI Compliance Checker",
    description: "Check architectural plans against NYC building codes instantly.",
  },
  robots: "index, follow",
  verification: {
    google: "_5er4jeJ8TtJrhHTqD3gaVeQt__QaenGj8MEZRKO0W0",
    other: {
      'msvalidate.01': 'PASTE_BING_CODE_HERE',
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CodeAlgo",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://nyccodes.codealgo.live",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "AI-powered NYC building code compliance checker for architects, engineers, and developers across all 5 NYC boroughs",
  "areaServed": { "@type": "City", "name": "New York City" },
  "featureList": [
    "112+ NYC code requirement checks",
    "Instant violation detection",
    "PDF compliance report generation",
    "Pre-permit readiness scoring"
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "CodeAlgo",
  "url": "https://nyccodes.codealgo.live",
  "description": "AI-powered NYC building code compliance checker for architects, engineers, and developers",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://nyccodes.codealgo.live/blog?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
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
