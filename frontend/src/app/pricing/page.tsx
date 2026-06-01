import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Pricing - CodeAlgo AI Compliance Checking Plans | CodeAlgo",
  description: "View pricing plans for CodeAlgo. Save thousands on DOB filing errors with our AI-powered NYC building code compliance checker for architects.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/pricing",
  },
  openGraph: {
    title: "Pricing - CodeAlgo AI Compliance Plans",
    description: "Save thousands on DOB filing errors with our AI-powered NYC building code checker.",
    url: "https://nyccodes.codealgo.live/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - CodeAlgo AI Compliance Plans",
  },
  keywords: ["CodeAlgo pricing", "NYC code checker cost", "architect software pricing"],
};

export default function PricingPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">Pricing Plans</h1>
        <p className="text-xl text-muted-foreground">Affordable plans for individual architects, engineering firms, and contractors.</p>
      </div>
    </main>
  );
}
