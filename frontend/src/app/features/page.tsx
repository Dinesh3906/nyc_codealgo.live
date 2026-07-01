import { Metadata } from 'next';
import { jsonLdScriptProps } from '@/lib/jsonLd';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: "PermitIQ by Aureon Features: 260+ Building Code PDF Checks | PermitIQ by Aureon",
  description: "Explore PermitIQ by Aureon features: automated NYC building code checks, PDF violation reports, and pre-permit architectural readiness scoring. Try free today.",
  alternates: {
    canonical: "https://permitiq.codealgo.live/features",
  },
  openGraph: {
    title: "PermitIQ by Aureon Features: 260+ Building Code PDFs Checked",
    description: "Automated NYC building code checks and PDF violation reports.",
    url: "https://permitiq.codealgo.live/features",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermitIQ by Aureon Features: 260+ Building Code PDFs Checked",
  },
  keywords: ["NYC code checks", "AI violation detection", "building code software", "architectural AI scanner"],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Check Architectural Plans Against NYC Building Codes",
  "step": [
    { "@type": "HowToStep", "name": "Upload your plans", "text": "Upload your architectural plans in PDF format" },
    { "@type": "HowToStep", "name": "AI checks against 260+ building code PDFs", "text": "Our AI scans your plans against 260+ building code PDFs" },
    { "@type": "HowToStep", "name": "Receive violation report", "text": "Download a detailed PDF report highlighting violations and missing elements" }
  ]
};

export default async function FeaturesPage() {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)}
      />
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">PermitIQ by Aureon Features: 260+ Building Code PDFs Checked</h1>
        <p className="text-xl text-muted-foreground">Automated plan checking against 260+ building code PDFs.</p>
      </div>
    </main>
  );
}
