import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "PermitIQ by Aureon Features: 112+ NYC Code Checks | PermitIQ by Aureon",
  description: "Explore PermitIQ by Aureon features: automated NYC building code checks, PDF violation reports, and pre-permit architectural readiness scoring. Try free today.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/features",
  },
  openGraph: {
    title: "PermitIQ by Aureon Features: 112+ NYC Code Requirements Checked",
    description: "Automated NYC building code checks and PDF violation reports.",
    url: "https://nyccodes.codealgo.live/features",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermitIQ by Aureon Features: 112+ NYC Code Requirements Checked",
  },
  keywords: ["NYC code checks", "AI violation detection", "building code software", "architectural AI scanner"],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Check Architectural Plans Against NYC Building Codes",
  "step": [
    { "@type": "HowToStep", "name": "Upload your plans", "text": "Upload your architectural plans in PDF format" },
    { "@type": "HowToStep", "name": "AI checks against 112+ requirements", "text": "Our AI scans your plans against NYC DOB code requirements" },
    { "@type": "HowToStep", "name": "Receive violation report", "text": "Download a detailed PDF report highlighting violations and missing elements" }
  ]
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">PermitIQ by Aureon Features: 112+ NYC Code Requirements Checked</h1>
        <p className="text-xl text-muted-foreground">Automated plan checking against 112+ NYC building codes.</p>
      </div>
    </main>
  );
}
