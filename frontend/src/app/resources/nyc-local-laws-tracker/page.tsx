import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "NYC Local Laws Tracker | CodeAlgo",
  description: "Track the latest NYC Local Laws affecting building construction, energy compliance, and safety regulations.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/resources/nyc-local-laws-tracker",
  },
  openGraph: {
    title: "NYC Local Laws Tracker",
    description: "Track the latest NYC Local Laws affecting building construction.",
    url: "https://nyccodes.codealgo.live/resources/nyc-local-laws-tracker",
    type: "website",
  },
};

export default function TrackerPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">NYC Local Laws Tracker</h1>
        <p className="text-xl text-muted-foreground">Stay up to date with Local Law 97, Local Law 58, and more.</p>
      </div>
    </main>
  );
}
