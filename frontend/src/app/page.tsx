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

      <Footer />
    </main>
  );
}
