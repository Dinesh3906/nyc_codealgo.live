import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from 'react-hot-toast';
import { jsonLdScriptProps } from "@/lib/jsonLd";
import { headers } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL('https://permitiq.codealgo.live'),
  title: "NYC Building Code AI Compliance Checker | PermitIQ by Aureon",
  description: "Check architectural plans against 260+ NYC building code PDFs instantly. Detect DOB violations and generate PDF compliance reports. Check your plans for free!",
  keywords: [
    "NYC building code",
    "DOB code requirements",
    "NYC DOB compliance",
    "architect software",
    "NYC fire code",
    "building code checker",
    "NYC house codes list"
  ],
  authors: [{ name: "PermitIQ by Aureon Editorial Team" }],
  alternates: {
    canonical: "https://permitiq.codealgo.live",
  },
  openGraph: {
    title: "NYC Building Code AI Compliance Checker | PermitIQ by Aureon",
    description: "Check architectural plans against 260+ NYC building code PDFs instantly. Detect DOB violations and generate PDF compliance reports.",
    type: "website",
    url: "https://permitiq.codealgo.live",
    siteName: "PermitIQ by Aureon",
    images: [
      {
        url: "https://permitiq.codealgo.live/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PermitIQ by Aureon — NYC Building Code Compliance Checker",
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
      'msvalidate.01': '820FA10433E723DDFD5E6037ACDAB686',
    },
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ],
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PermitIQ by Aureon",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://permitiq.codealgo.live",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "AI-powered NYC building code compliance checker for architects, engineers, and developers across all 5 NYC boroughs",
  "areaServed": { "@type": "City", "name": "New York City" },
  "featureList": [
    "260+ building code PDF checks",
    "Instant violation detection",
    "PDF compliance report generation",
    "Pre-permit readiness scoring"
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PermitIQ by Aureon",
  "url": "https://permitiq.codealgo.live",
  "description": "AI-powered NYC building code compliance checker for architects, engineers, and developers",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://permitiq.codealgo.live/blog?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are NYC house codes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "NYC house codes are strict building, safety, electrical, and plumbing regulations governing construction and safety for residential and commercial properties in New York City."
      }
    },
    {
      "@type": "Question",
      "name": "How do I verify New York building compliance?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can use PermitIQ by Aureon's AI compliance platform to instantly verify your house plans, construction estimates, and architectural quotes against the latest NYC DOB codes."
      }
    },
    {
      "@type": "Question",
      "name": "What codes apply to residential homes in NYC?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Residential homes in NYC must adhere to the 2022 NYC Construction Codes, the NYC Fire Code, Zoning Resolution, and specific Multiple Dwelling Laws depending on the borough."
      }
    }
  ]
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={jsonLdScriptProps(softwareAppSchema)}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={jsonLdScriptProps(websiteSchema)}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={jsonLdScriptProps(faqJsonLd)}
        />
      </head>
      <body className="font-sans antialiased selection:bg-blue-950/60 selection:text-primary">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
