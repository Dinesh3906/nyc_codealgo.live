import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "NYC Building Code Glossary | CodeAlgo",
  description: "A comprehensive glossary of NYC Department of Buildings (DOB) terminology, zoning acronyms, and construction code definitions.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/resources/nyc-building-code-glossary",
  },
  openGraph: {
    title: "NYC Building Code Glossary",
    description: "A comprehensive glossary of NYC Department of Buildings terminology.",
    url: "https://nyccodes.codealgo.live/resources/nyc-building-code-glossary",
    type: "website",
  },
};

export default function GlossaryPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">NYC Building Code Glossary</h1>
        <p className="text-xl text-muted-foreground">Understand every acronym and definition used by the NYC DOB.</p>
      </div>
    </main>
  );
}
