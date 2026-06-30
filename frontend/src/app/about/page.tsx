import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About PermitIQ: AI-Powered NYC Code Compliance | PermitIQ ( by Aureon )",
  description: "PermitIQ ( by Aureon ) is the leading AI platform dedicated to simplifying New York City building code compliance for construction professionals.",
  alternates: {
    canonical: "https://nyccodes.permitiq.live/about",
  },
  openGraph: {
    title: "About PermitIQ: AI-Powered NYC Code Compliance",
    description: "The leading AI platform for NYC building code compliance.",
    url: "https://nyccodes.permitiq.live/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About PermitIQ: AI-Powered NYC Code Compliance",
  },
  keywords: ["about PermitIQ ( by Aureon )", "NYC building code company", "construction tech NYC"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "PermitIQ ( by Aureon )",
  "image": "https://nyccodes.permitiq.live/logo.png",
  "description": "AI-powered NYC building code compliance checker.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Tech Lane",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "postalCode": "10001",
    "addressCountry": "US"
  },
  "areaServed": {
    "@type": "City",
    "name": "New York City"
  }
};

export default function AboutPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">About PermitIQ: AI-Powered NYC Code Compliance</h1>
        <p className="text-xl text-muted-foreground">Our mission is to eliminate NYC DOB rejection delays using Artificial Intelligence.</p>
      </div>
    </main>
  );
}
