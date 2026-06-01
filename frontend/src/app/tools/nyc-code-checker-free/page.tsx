import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Free NYC Building Code Checker | CodeAlgo",
  description: "Check your architectural plans against NYC DOB building codes for free. Instantly detect violations and generate compliance reports.",
  alternates: {
    canonical: "https://nyccodes.codealgo.live/tools/nyc-code-checker-free",
  },
  openGraph: {
    title: "Free NYC Building Code Checker",
    description: "Check your architectural plans against NYC DOB building codes for free.",
    url: "https://nyccodes.codealgo.live/tools/nyc-code-checker-free",
    type: "website",
  },
};

export default function FreeCheckerPage() {
  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-foreground">Free NYC Building Code Checker</h1>
        <p className="text-xl text-muted-foreground">Upload your plans to instantly detect DOB violations.</p>
        {/* Placeholder for future tool */}
        <div className="mt-12 p-8 border border-border rounded-xl bg-card">
          <p>Tool loading...</p>
        </div>
      </div>
    </main>
  );
}
