import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact Us - NYC Code Compliance Support | PermitIQ by Aureon",
  description: "Get in touch with the PermitIQ by Aureon team for enterprise pricing, API access, or support regarding our NYC building code AI scanner.",
  alternates: {
    canonical: "https://nyccodes.permitiq.live/contact",
  },
  openGraph: {
    title: "Contact Us - PermitIQ by Aureon Support",
    description: "Get in touch with the PermitIQ by Aureon team for enterprise pricing and support.",
    url: "https://nyccodes.permitiq.live/contact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us - PermitIQ by Aureon Support",
  },
  keywords: ["contact PermitIQ by Aureon", "PermitIQ by Aureon support", "NYC building code API"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "PermitIQ by Aureon",
  "image": "https://nyccodes.permitiq.live/logo.png",
  "telephone": "+1-800-555-0199",
  "email": "support@permitiq.live",
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
        <h1 className="text-4xl font-bold mb-6 text-foreground">Contact PermitIQ by Aureon</h1>
        <p className="text-xl text-muted-foreground">We're here to help you navigate NYC compliance.</p>
      </div>
    </main>
  );
}
