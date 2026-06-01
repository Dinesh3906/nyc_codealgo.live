import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact Us - NYC Code Compliance Support | CodeAlgo",
  description: "Get in touch with the CodeAlgo team for enterprise pricing, API access, or support regarding our NYC building code AI scanner.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/contact",
  },
  openGraph: {
    title: "Contact Us - CodeAlgo Support",
    description: "Get in touch with the CodeAlgo team for enterprise pricing and support.",
    url: "https://nyccodes.codealgo.live/contact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us - CodeAlgo Support",
  },
  keywords: ["contact CodeAlgo", "CodeAlgo support", "NYC building code API"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CodeAlgo",
  "image": "https://nyccodes.codealgo.live/logo.png",
  "telephone": "+1-800-555-0199",
  "email": "support@codealgo.live",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Tech Lane",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "postalCode": "10001",
    "addressCountry": "US"
  }
};

export default function ContactPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">Contact CodeAlgo</h1>
        <p className="text-xl text-muted-foreground">We're here to help you navigate NYC compliance.</p>
      </div>
    </main>
  );
}
