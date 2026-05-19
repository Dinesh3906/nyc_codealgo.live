import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'New York City House Codes List (2026 Updated) | CodeAlgo',
  description: 'Complete 2026 New York City house codes list. Comprehensive guide to NYC residential building rules and regulations.',
};

export default function NYCHouseCodesListPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16 max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
            New York City House Codes List
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The definitive 2026 updated list of NYC house codes. Understand the New York building codes required for residential homes.
          </p>
        </header>

        <section className="space-y-12">
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Complete NYC House Codes List</h2>
            <p>
              Navigating the <strong>NYC house codes list</strong> is essential for any architect, contractor, or homeowner. The 2026 updates bring new requirements for energy efficiency, fire safety, and zoning. If you need to perform an automated check, try our <Link href="/nyc-codes-checking" className="text-primary hover:underline">NYC codes checking</Link> tool.
            </p>
            
            <h2 className="text-3xl font-bold mb-4 mt-8">Essential Residential Building Rules</h2>
            <div className="grid md:grid-cols-2 gap-6 my-8">
              <div className="border p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-2">Fire Safety Rules</h3>
                <p className="text-sm text-muted-foreground">Requirements for interconnected smoke and carbon monoxide detectors in every sleeping area.</p>
              </div>
              <div className="border p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-2">Egress Requirements</h3>
                <p className="text-sm text-muted-foreground">Every bedroom must have at least one operable emergency escape and rescue opening.</p>
              </div>
              <div className="border p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-2">Plumbing Codes</h3>
                <p className="text-sm text-muted-foreground">Minimum fixture counts and water conservation standards for residential bathrooms.</p>
              </div>
              <div className="border p-6 rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-2">Electrical Regulations</h3>
                <p className="text-sm text-muted-foreground">GFCI protection for all kitchen, bathroom, and outdoor receptacles.</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-4 mt-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">What codes apply to residential homes in NYC?</h3>
                <p className="text-muted-foreground mt-2">Residential properties must comply with the NYC Construction Codes, Zoning Resolution, and Fire Code. View more on <Link href="/new-york-city-house-codes" className="text-primary hover:underline">New York City house codes</Link>.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">How do I verify New York building compliance?</h3>
                <p className="text-muted-foreground mt-2">You can manually review the NYC house codes list or use our automated AI compliance platform to save time.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-16 text-center bg-primary/5 rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold mb-4">Instant Code Validation</h2>
          <p className="text-lg text-muted-foreground mb-8">Stop guessing. Upload your house plan and verify it against the entire New York codes list instantly.</p>
          <Link href="/dashboard" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors">
            Launch Compliance Checker
          </Link>
        </section>
      </main>
    </div>
  );
}
