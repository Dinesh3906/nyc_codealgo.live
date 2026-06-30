import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '#1 NYC Codes Checking | New York House Code Verification - PermitIQ ( by Aureon )',
  description: 'Complete NYC codes checking platform. Verify New York building regulations and house code compliance instantly with PermitIQ.',
};

export default function NYCCodesCheckingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16 max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
            #1 NYC Codes Checking & Verification
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Verify your New York building compliance and check residential house plans instantly. PermitIQ ( by Aureon ) is the premier NYC codes checking platform.
          </p>
        </header>

        <section className="space-y-12">
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">What is NYC Codes Checking?</h2>
            <p>
              NYC codes checking is the process of verifying that architectural plans, construction quotes, and building designs comply with the <strong>New York codes</strong> and regulations. Ensuring compliance before construction saves time, prevents DOB fines, and ensures tenant safety.
            </p>
            
            <h2 className="text-3xl font-bold mb-4 mt-8">Latest New York Building Regulations</h2>
            <p>
              As of 2026, the NYC code compliance requirements have become more stringent. Whether you are dealing with residential house safety codes, electrical code requirements, or fire safety rules, our tool cross-references thousands of pages of <Link href="/new-york-city-house-codes" className="text-primary hover:underline">New York City house codes</Link> in seconds.
            </p>

            <div className="bg-card border rounded-xl p-8 my-8 shadow-sm">
              <h3 className="text-2xl font-semibold mb-4">Code Compliance Checklist</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Verify Zoning Rules and property line limits.</li>
                <li>Check Electrical Code Requirements (e.g., GFCI placement).</li>
                <li>Ensure Fire Safety Rules (Smoke/CO detectors).</li>
                <li>Validate Egress specifications for bedrooms.</li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold mb-4 mt-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">What are NYC house codes?</h3>
                <p className="text-muted-foreground mt-2">NYC house codes are strict regulations governing construction and safety. You can view the full <Link href="/nyc-house-codes-list" className="text-primary hover:underline">NYC house codes list</Link> for detailed insights.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">How do I verify New York building compliance?</h3>
                <p className="text-muted-foreground mt-2">Use the PermitIQ ( by Aureon ) interactive tool to upload your house plan for instant code validation against NYC residential building rules.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-16 text-center bg-primary/5 rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold mb-4">NYC Code Compliance Checker</h2>
          <p className="text-lg text-muted-foreground mb-8">Upload your house plan and get instant code validation against all New York codes.</p>
          <Link href="/dashboard" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors">
            Start Free Verification
          </Link>
        </section>
      </main>
    </div>
  );
}
