"use client";

import { ArrowRight, CheckCircle2, Layout, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfiniteGrid } from "@/components/ui/the-infinite-grid";

export default function Hero({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <InfiniteGrid className="pt-32 pb-20 md:pt-40 md:pb-24 bg-background">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Built for architects, engineers, and developers in NYC
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            AI-Powered DOB Compliance — <span className="text-primary">Before You Submit</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Upload your plans and get instant compliance checks against NYC Department of Buildings codes. 
            Reduce rejections. Save weeks.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onOpenModal} className="text-base">
              Check Your Plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>

        <div className="mt-20 relative px-4">
          <div className="max-w-5xl mx-auto rounded-lg border border-border shadow-2xl overflow-hidden bg-card p-2 sm:p-4">
            <div className="rounded-md border border-border bg-muted overflow-hidden aspect-[16/9] flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <Layout className="w-16 h-16 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground/60 font-mono text-sm uppercase tracking-wide">Architectural Plan - Ground Level</p>
              </div>

              <div className="absolute inset-x-0 h-0.5 bg-primary z-20 animate-scan"></div>

              <Badge className="absolute top-1/4 left-1/4 z-30 bg-green-600 hover:bg-green-600 animate-fade-low">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Compliant (Code 202)
              </Badge>
              <Badge className="absolute bottom-1/3 right-1/4 z-30 bg-destructive hover:bg-destructive animate-fade-low-delay">
                <CheckCircle2 className="w-3 h-3 mr-1 rotate-180" />
                Warning (Zoning)
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          100% { top: 90%; }
        }
        .animate-scan {
          animation: scan 3s linear infinite alternate;
        }
        @keyframes fade-low {
          0% { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-low {
          animation: fade-low 2s ease-in-out infinite alternate;
        }
        .animate-fade-low-delay {
          animation: fade-low 2s ease-in-out 1s infinite alternate;
        }
      `}</style>
    </InfiniteGrid>
  );
}
