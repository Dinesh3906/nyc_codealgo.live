import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "CodeAlgo Pricing: Plans for Architects & Developers | CodeAlgo",
  description: "View pricing plans for CodeAlgo. Save thousands on DOB filing errors with our AI-powered NYC building code compliance checker for architects.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/pricing",
  },
  openGraph: {
    title: "CodeAlgo Pricing: Plans for Architects and Developers",
    description: "Save thousands on DOB filing errors with our AI-powered NYC building code checker.",
    url: "https://nyccodes.codealgo.live/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeAlgo Pricing: Plans for Architects and Developers",
  },
  keywords: ["CodeAlgo pricing", "NYC code checker cost", "architect software pricing"],
};

export default function PricingPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">CodeAlgo Pricing: Plans for Architects and Developers</h1>
        <p className="text-xl text-muted-foreground">Affordable plans for individual architects, engineering firms, and contractors.</p>
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "CodeAlgo",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "WebBrowser",
              "offers": {
                "@type": "Offer",
                "name": "Professional Plan",
                "description": "Full NYC building code compliance checking per project.",
                "priceSpecification": {
                  "@type": "PriceSpecification",
                  "price": "199.00",
                  "priceCurrency": "USD",
                  "billingIncrement": "per project",
                  "unitText": "Project"
                },
                "availability": "https://schema.org/InStock"
              }
            }),
          }}
        />
      </div>
    </main>
  );
}
