import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '#1 New York City House Codes | NYC Residential Building Rules - PermitIQ ( by Aureon )',
  description: 'Understand the New York City house codes, zoning laws, and building regulations required for residential code checking and compliance.',
};

export default function NewYorkCityHouseCodesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16 max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
            #1 New York City House Codes
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The ultimate guide to New York City house codes, residential regulations, and compliance requirements for homeowners and architects.
          </p>
        </header>

        <section className="space-y-12">
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Understanding New York City House Codes</h2>
            <p>
              Navigating the <strong>New York City house codes</strong> can be a complex endeavor. These codes dictate everything from structural integrity to fire safety and electrical standards. Maintaining strict compliance with these codes ensures that residential properties remain safe and avoid costly DOB penalties.
            </p>
            
            <h2 className="text-3xl font-bold mb-4 mt-8">House Code Verification NYC</h2>
            <p>
              Before submitting any plans to the DOB, performing a thorough <Link href="/nyc-codes-checking" className="text-primary hover:underline">NYC codes checking</Link> process is critical. Our AI-driven system leverages the comprehensive <Link href="/nyc-house-codes-list" className="text-primary hover:underline">NYC house codes list</Link> to cross-reference every aspect of your architectural plan.
            </p>

            <div className="bg-muted p-8 my-8 rounded-xl border">
              <h3 className="text-2xl font-bold mb-4">Key Sections of the Code</h3>
              <ul className="space-y-4">
                <li>
                  <strong>NYC Construction Codes:</strong> Encompasses the Building, Plumbing, Mechanical, and Fuel Gas Codes.
                </li>
                <li>
                  <strong>Zoning Resolution:</strong> Dictates the use, bulk, and parking requirements for properties across different boroughs.
                </li>
                <li>
                  <strong>Fire Code:</strong> Mandates fire protection systems, emergency egress, and life-safety installations.
                </li>
              </ul>
            </div>

            <h2 className="text-3xl font-bold mb-4 mt-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">What are NYC house codes?</h3>
                <p className="text-muted-foreground mt-2">NYC house codes are the comprehensive set of building, electrical, plumbing, and safety regulations that govern all residential and commercial properties in New York City.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">What codes apply to residential homes in NYC?</h3>
                <p className="text-muted-foreground mt-2">Residential homes must primarily adhere to the NYC Building Code, Fire Code, and the specific Zoning Resolutions applicable to their borough.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-16 text-center bg-primary/5 rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold mb-4">NYC Code Compliance Checker</h2>
          <p className="text-lg text-muted-foreground mb-8">Upload your House Plan and get Instant Code Validation.</p>
          <Link href="/dashboard" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors">
            Start Compliance Check
          </Link>
        </section>
      </main>
    </div>
  );
}
