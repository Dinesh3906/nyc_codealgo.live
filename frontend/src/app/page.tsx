"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Quote } from "lucide-react";
import {
  ProblemSection,
  SolutionSection,
  HowItWorks,
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
    <main className="min-h-screen bg-background lg:ml-56 mt-14 lg:mt-0">
      <Navbar onOpenModal={handleAction} />

      <Hero onOpenModal={handleAction} />

      <ProblemSection />

      <SolutionSection />

      <HowItWorks />

      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-7xl">
          <Card className="shadow-2xl border-border/40 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <CardContent className="p-12 md:p-20 text-center relative z-10">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-foreground">Stop Guessing. Start Submitting with Confidence.</h2>
              <p className="text-xl text-muted-foreground mb-10">Try our AI scanner today and save weeks on your next DOB filing.</p>
              <Button size="lg" onClick={handleAction} className="text-lg px-10 py-6 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                <Sparkles className="w-5 h-5 mr-2" />
                Upload Your First Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Pricing onOpenModal={handleAction} />

      <section className="py-24 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-6 max-w-7xl text-center">
          <Quote className="w-10 h-10 text-primary/30 mx-auto mb-6" />
          <blockquote className="max-w-4xl mx-auto text-2xl md:text-3xl font-semibold text-foreground leading-relaxed mb-6">
            "NYC House Code helped us catch issues before DOB submission — saved us weeks."
          </blockquote>
          <p className="font-bold text-primary text-sm uppercase tracking-widest">NYC Real Estate Developer</p>
        </div>
      </section>

      {/* SEO Authority Section */}
      <section className="py-16 bg-background border-t border-border">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Complete New York Building Code Analysis</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Code Algo</strong> provides the industry's most accurate <strong>New York Building Code</strong> AI analysis. 
                Our platform is specifically engineered to handle <strong>NYC DOB compliance</strong> for architectural 
                house plans, commercial designs, and mechanical engineering layouts.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• New York City Construction Codes (NYCCC) Compliance</li>
                <li>• NYC Fire Code & Plumbing Code Automated Analysis</li>
                <li>• Zoning Resolution (ZR) Comprehensive Checks</li>
                <li>• Instant DOB Now Filing Readiness Reports</li>
              </ul>
            </div>
            <div className="bg-muted/50 p-8 rounded-2xl border border-border">
              <h3 className="text-lg font-bold mb-3 text-foreground">The NYC House Code Expert</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlike generic software, <strong>Code Algo</strong> is a specialized <strong>NYC House Code</strong> 
                expert system. We help architects and developers navigate the complex landscape of <strong>New York 
                Codes</strong> and <strong>DOB regulations</strong>. Our algorithm is updated in real-time to reflect 
                the latest 2024 New York City Building Code amendments and local law changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
