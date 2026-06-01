import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us - CodeAlgo NYC Compliance Engine | CodeAlgo",
  description: "CodeAlgo is the leading AI platform dedicated to simplifying New York City building code compliance for construction professionals.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/about",
  },
  openGraph: {
    title: "About Us - CodeAlgo",
    description: "The leading AI platform for NYC building code compliance.",
    url: "https://nyccodes.codealgo.live/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us - CodeAlgo",
  },
  keywords: ["about CodeAlgo", "NYC building code company", "construction tech NYC"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CodeAlgo",
  "image": "https://nyccodes.codealgo.live/logo.png",
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
        <h1 className="text-4xl font-bold mb-6 text-foreground">About CodeAlgo</h1>
        <p className="text-xl text-muted-foreground">Our mission is to eliminate NYC DOB rejection delays using Artificial Intelligence.</p>
      </div>
    </main>
  );
}
