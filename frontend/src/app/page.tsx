"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Activity, Award } from "lucide-react";
import {
  ProblemSection,
  SolutionSection,
  InteractiveBlueprintScanner,
  NYCRegulationEngine,
  ReportPreview,
  TrustSection,
  AccuracyDisclaimer,
  Pricing,
  Footer
} from "@/components/sections/Sections";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const handleAction = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F6F2] dark:bg-[#080A0C] text-foreground pt-16 font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Navbar onOpenModal={handleAction} />

      <Hero onOpenModal={handleAction} />

      <ProblemSection />

      <SolutionSection />

      <InteractiveBlueprintScanner />

      <NYCRegulationEngine />

      <ReportPreview />

      <TrustSection />

      {/* Premium Technical Call-To-Action */}
      <section className="py-24 bg-[#F1EFEA] dark:bg-[#0A0D10] relative transition-colors duration-300">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] blueprint-grid" />
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <Card className="border border-border bg-white dark:bg-[#0C0F12] rounded-sm overflow-hidden relative shadow-2xl">
            {/* Technical Manhattan skyline & bridge blueprint background */}
            <div className="absolute inset-0 bg-[url('/bg-hero.jpg')] bg-cover bg-center opacity-[0.18] pointer-events-none mix-blend-lighten" />
            <CardContent className="p-12 md:p-20 text-center relative z-10 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mx-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                Plan Submission Readiness
              </div>
              <h2 className="text-3xl md:text-5xl font-sans font-bold text-foreground max-w-3xl mx-auto">
                Pre-Audit Your Drawings Before DOB Submission
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-sans">
                Review spatial configurations, zoning setback compliance, and egress paths in minutes. Minimize administrative risks.
              </p>
              <div className="pt-4">
                <Button 
                  onClick={handleAction} 
                  size="lg" 
                  className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-10 py-6 border border-primary/20 rounded-sm transition-all"
                >
                  Analyze a Drawing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Pricing onOpenModal={handleAction} />

      {/* Technical Editorial Review */}
      <section className="py-20 bg-[#F1EFEA] dark:bg-[#0A0D10] border-t border-border/40 font-mono text-[10px] transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-7xl text-center space-y-4">
          <Award className="w-6 h-6 text-primary/40 mx-auto" />
          <blockquote className="max-w-4xl mx-auto text-sm md:text-base font-medium text-foreground leading-relaxed">
            "By validating dimensions and setback lines within the draft phase, we prevented two major code discrepancies that would have stalled permit reviews."
          </blockquote>
          <p className="text-primary text-[9px] uppercase tracking-widest font-bold">Principal Architect, NYC Studio</p>
        </div>
      </section>

      <AccuracyDisclaimer />

      {/* SEO Authority Section */}
      <section className="py-16 bg-[#F8F6F2] dark:bg-[#080A0C] border-t border-border/40 font-mono text-[10px] transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-wider font-bold text-foreground border-b border-border/40 pb-2">
                New York Building Code Technical Index
              </h2>
              <p className="text-muted-foreground leading-relaxed font-sans text-xs">
                <strong>NYC House Code</strong> by <strong>CodeAlgo</strong> delivers highly specialized compliance mapping tools for the New York architectural grid. 
                Our parser reviews layouts against structural constraints, accessibility clearances, and zoning resolutions.
              </p>
              <ul className="space-y-2 text-muted-foreground text-xs font-sans">
                <li>• New York City Construction Codes (NYCCC) Compliance</li>
                <li>• NYC Fire Code &amp; Plumbing Code Automated Analysis</li>
                <li>• Zoning Resolution (ZR) Comprehensive Checks</li>
                <li>• Instant DOB Now Filing Readiness Reports</li>
              </ul>
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Editorial Manuals &amp; Guides:</p>
                <ul className="space-y-1 text-xs">
                  <li><Link href="/blog/nyc-building-code-checklist-2026" className="text-primary hover:underline">NYC building code checklist 2026</Link></li>
                  <li><Link href="/blog/nyc-existing-building-code-2026-guide" className="text-primary hover:underline">NYC existing building code 2026</Link></li>
                  <li><Link href="/blog/common-nyc-code-violations-architectural-plans" className="text-primary hover:underline">Common NYC code violations</Link></li>
                </ul>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0C0F12] p-8 rounded-sm border border-border flex flex-col justify-between transition-colors duration-300">
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  CodeAlgo Algorithmic Framework
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  Unlike generic SaaS platforms or conversational AI wrappers, <strong>CodeAlgo</strong> is built explicitly as a <strong>NYC House Code</strong> compliance system. 
                  Our regulatory parsers are updated in real-time to align with current administrative amendments, ensuring vector inspections reflect correct legal parameters.
                </p>
              </div>
              <div className="text-[8px] text-muted-foreground/60 mt-4 uppercase">
                Database Reference: NYCCC-2026-v1.4
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
