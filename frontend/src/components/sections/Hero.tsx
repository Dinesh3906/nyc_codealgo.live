"use client";

import { ArrowRight, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 bg-background overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] rounded-full bg-accent/5 blur-[140px]" />
      </div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Premium Pitch */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/60 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Built for NYC Architects & Developers
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              NYC Home Quote Verification
              <br />
              <span className="text-gradient">& House Plan Validation</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              The most trusted platform for New York construction quotes, building estimates, 
              and architectural house plan validation. Verify with absolute precision, powered by expert NYC building codes intelligence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" onClick={onOpenModal} className="text-base px-8 py-6 shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all duration-200 rounded-xl">
                <Sparkles className="w-4 h-4 mr-2" />
                Check Your Plans
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base px-8 py-6 rounded-xl hover:bg-muted/50 transition-colors">
                <a href="#how-it-works">
                  See How It Works
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/40 max-w-xl">
              <div>
                <p className="text-3xl font-extrabold text-foreground tracking-tight">100%</p>
                <p className="text-xs text-muted-foreground mt-1">NYC Code Audited</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-foreground tracking-tight">30x</p>
                <p className="text-xs text-muted-foreground mt-1">Faster Analysis</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-foreground tracking-tight">Zero</p>
                <p className="text-xs text-muted-foreground mt-1">DOB Rejections</p>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Interactive Blueprint Simulator */}
          <div className="lg:col-span-5 relative w-full lg:max-w-md mx-auto">
            {/* Soft background glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/10 to-accent/10 blur-xl opacity-70" />
            
            {/* Main Showcase Panel */}
            <div className="relative border border-border/60 rounded-2xl bg-card/65 backdrop-blur-xl shadow-2xl p-5 overflow-hidden">
              
              {/* Window Controls Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-border/45 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground ml-2">blueprint_analyzer_v2.dwg</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary tracking-wide">
                  ACTIVE SCAN
                </div>
              </div>

              {/* Grid Canvas */}
              <div className="relative h-44 border border-border/40 rounded-xl overflow-hidden bg-muted/20 flex items-center justify-center p-4">
                <div 
                  className="absolute inset-0 opacity-15" 
                  style={{ 
                    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', 
                    backgroundSize: '16px 16px' 
                  }} 
                />
                
                {/* Isometric Drafting Layout */}
                <div className="absolute inset-3 border border-dashed border-muted-foreground/20 flex flex-col justify-between p-3 rounded-lg">
                  <div className="w-full flex justify-between text-[7px] font-mono text-muted-foreground/60">
                    <span>N: 40.7128° W: 74.0060°</span>
                    <span>DOB REVISION B</span>
                  </div>
                  
                  {/* Mock Drafting Object */}
                  <div className="relative flex-1 flex items-center justify-center my-1.5">
                    <div className="w-36 h-14 border border-primary/30 rounded flex items-center justify-center bg-primary/5">
                      <div className="w-32 h-10 border border-dashed border-primary/20 flex flex-col justify-around px-2 py-1">
                        <div className="h-1 w-2/3 bg-primary/25 rounded" />
                        <div className="h-1 w-1/2 bg-primary/25 rounded" />
                      </div>
                    </div>
                    {/* Live indicator dot */}
                    <div className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </div>
                  </div>

                  <div className="w-full flex justify-between text-[7px] font-mono text-muted-foreground/60">
                    <span>SCALE: 1/4" = 1'-0"</span>
                    <span>ZONE: R6 BUILDING LIMITS</span>
                  </div>
                </div>
              </div>

              {/* Code Checks Analysis List */}
              <div className="mt-5 space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Automated DOB Compliance checks</p>
                
                {/* Check Item 1: Error */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-red-500/10 bg-red-500/5">
                  <div className="p-1 rounded bg-red-500/10 text-red-500 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold text-foreground">Hallway Egress Width</p>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-semibold uppercase">Error</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Hallway is 32" wide. NYC BC Section 1020.2 requires min 36" for R-2 occupancy.</p>
                  </div>
                </div>

                {/* Check Item 2: Passed */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-green-500/10 bg-green-500/5">
                  <div className="p-1 rounded bg-green-500/10 text-green-500 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold text-foreground">Roof Height Restriction</p>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-semibold uppercase">Passed</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Proposed elevation (38') does not exceed R6 max zoning limit (40').</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
