import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from 'react-hot-toast';

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        
        {/* Global theme loader & bulletproof click delegator bypass */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // 1. Immediately evaluate saved theme to prevent hydration flash (defaults to light mode)
            try {
              const saved = localStorage.getItem('theme');
              if (saved === 'dark') {
                document.documentElement.classList.add('dark');
                document.body.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.body.classList.remove('dark');
              }
            } catch (e) {}

            // 2. Icon sync helper
            function syncAllThemeIcons(isDarkTheme) {
              const suns = document.querySelectorAll('.theme-icon-sun');
              const moons = document.querySelectorAll('.theme-icon-moon');
              if (isDarkTheme) {
                suns.forEach(s => s.classList.remove('hidden'));
                moons.forEach(m => m.classList.add('hidden'));
              } else {
                suns.forEach(s => s.classList.add('hidden'));
                moons.forEach(m => m.classList.remove('hidden'));
              }
            }

            // Bind sync hooks on DOM loads
            window.addEventListener('DOMContentLoaded', function() {
              const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
              syncAllThemeIcons(isDark);
            });
            
            // Periodically sync in case framework re-renders swap icons
            setInterval(function() {
              const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
              syncAllThemeIcons(isDark);
            }, 300);

            // 3. Global atomic click delegator (Capture Phase)
            document.addEventListener('click', function(e) {
              const btn = e.target.closest('#theme-toggle-btn-desktop') || 
                          e.target.closest('#theme-toggle-btn-mobile') || 
                          e.target.closest('#theme-toggle-btn-dashboard') || 
                          e.target.closest('.theme-toggle-trigger');
              if (!btn) return;
              
              e.preventDefault();
              e.stopPropagation();
              
              const isCurrentlyDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
              const targetTheme = isCurrentlyDark ? 'light' : 'dark';
              
              if (targetTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.body.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
                try { localStorage.setItem('theme', 'dark'); } catch(err) {}
              } else {
                document.documentElement.classList.remove('dark');
                document.body.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
                try { localStorage.setItem('theme', 'light'); } catch(err) {}
              }
              
              syncAllThemeIcons(targetTheme === 'dark');
              console.log("Global capture-phase delegator swapped theme to:", targetTheme);
            }, true); // Capture phase interceptor
          })();
        ` }} />

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
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased selection:bg-blue-950/60 selection:text-primary`}>
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
