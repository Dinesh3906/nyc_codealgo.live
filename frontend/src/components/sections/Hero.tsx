"use client";

import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Hero({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 bg-background overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            Built for NYC Architects & Developers
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
            NYC Home Quote Verification
            <br />
            <span className="text-gradient">& House Plan Validation</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            The most trusted platform for New York construction quotes, building estimates, 
            and architectural house plan validation. Verify with precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onOpenModal} className="text-base px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Sparkles className="w-4 h-4 mr-2" />
              Check Your Plans
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 py-6">
              <a href="#how-it-works">
                See How It Works
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
