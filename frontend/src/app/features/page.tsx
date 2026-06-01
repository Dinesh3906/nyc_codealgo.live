import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "NYC CodeAlgo Features - AI Plan Checking | CodeAlgo",
  description: "Explore the features of CodeAlgo: automated NYC building code checks, PDF violation reports, and pre-permit architectural readiness scoring.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/features",
  },
  openGraph: {
    title: "CodeAlgo Features - AI Plan Checking",
    description: "Automated NYC building code checks and PDF violation reports.",
    url: "https://nyccodes.codealgo.live/features",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeAlgo Features - AI Plan Checking",
  },
  keywords: ["NYC code checks", "AI violation detection", "building code software", "architectural AI scanner"],
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">CodeAlgo Features</h1>
        <p className="text-xl text-muted-foreground">Automated plan checking against 112+ NYC building codes.</p>
      </div>
    </main>
  );
}
