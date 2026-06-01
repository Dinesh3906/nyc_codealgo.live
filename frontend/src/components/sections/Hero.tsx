"use client";

import { ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2, Compass, FileText, Activity, Layers, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export default function Hero({ onOpenModal }: { onOpenModal: () => void }) {
  const [coords, setCoords] = useState({ x: 40.7128, y: -74.0060 });
  const [activeLayers, setActiveLayers] = useState({ walls: true, zoning: true, egress: true });
  const viewboxRef = useRef<HTMLDivElement>(null);

  // Dynamic CAD coordinates calculation on mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!viewboxRef.current) return;
    const rect = viewboxRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Scale into realistic Manhattan geographic coordinates around the NYC base point
    const nycLatBase = 40.7128;
    const nycLngBase = -74.0060;
    const computedLat = (nycLatBase + (0.5 - relativeY) * 0.002).toFixed(5);
    const computedLng = (nycLngBase + (relativeX - 0.5) * 0.002).toFixed(5);
    
    setCoords({ x: parseFloat(computedLat), y: parseFloat(computedLng) });
  };

  const handleMouseLeave = () => {
    // Reset to Manhattan centroid
    setCoords({ x: 40.7128, y: -74.0060 });
  };

  return (
    <section id="platform" className="relative pt-20 pb-24 md:pt-28 md:pb-36 bg-[#F8F6F2] dark:bg-[#080A0C] overflow-hidden border-b border-border/40 transition-colors duration-300">
      {/* High-fidelity background blueprint skyline backdrop */}
      <div className="absolute inset-0 bg-[url('/bg-engine.png')] bg-cover bg-center opacity-[0.05] dark:opacity-[0.45] pointer-events-none mix-blend-multiply dark:mix-blend-lighten transition-opacity duration-300" />

      {/* Background blueprint paper grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-10 blueprint-grid" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-5 blueprint-grid-fine" />
      
      {/* Blueprint navy gradient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[70%] h-[70%] rounded-full bg-primary/5 dark:bg-blue-900/10 blur-[150px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-slate-900/15 blur-[150px]" />
      </div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Serious Technical Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[11px] font-mono tracking-wider uppercase text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              NYC DOB Compliance Intelligence Platform
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-foreground leading-[1.1]">
              Review Building Plans <br />
              <span className="text-primary">Before</span> DOB Submission
            </h1>

            <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed font-sans">
              AI-assisted analysis for architects and developers to detect zoning, code, and documentation issues earlier. 
              Verify plans, drawings, and compliance structures against the 2026 NYC Building Codes.
            </p>

            {/* Action buttons with engineering styling */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                onClick={onOpenModal} 
                size="lg" 
                className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-6 border border-primary/20 rounded-sm transition-all shadow-lg shadow-primary/10"
              >
                Analyze a Drawing
              </Button>
              <Button 
                variant="outline" 
                asChild 
                size="lg" 
                className="font-mono text-xs uppercase tracking-wider border-border/80 hover:bg-muted text-foreground font-bold px-8 py-6 rounded-sm transition-all"
              >
                <a href="#workflow">
                  View Compliance Workflow
                  <ArrowRight className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
                </a>
              </Button>
            </div>

            {/* Quick trust metrics - Architectural studio layout */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-border/40 max-w-lg font-mono">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Standards</p>
                <p className="text-xl font-bold text-foreground mt-1">100% NYC DOB</p>
                <span className="text-[10px] text-muted-foreground/60 block">Building & Zoning Codes</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Accuracy</p>
                <p className="text-xl font-bold text-foreground mt-1">Drawing Intel</p>
                <span className="text-[10px] text-muted-foreground/60 block">CAD-grade spatial scans</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Target Audience</p>
                <p className="text-xl font-bold text-foreground mt-1">Built for Pros</p>
                <span className="text-[10px] text-muted-foreground/60 block">Architects & Developers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium CAD Blueprint simulator */}
          <div className="lg:col-span-6 relative w-full mx-auto">
            {/* Subtle steel background glow */}
            <div className="absolute -inset-1 rounded-sm bg-gradient-to-tr from-primary/10 to-transparent blur-md opacity-40" />
            
            {/* CAD Viewer Panel */}
            <div className="relative border border-border bg-white dark:bg-[#0C0F12] rounded-sm shadow-2xl overflow-hidden font-mono flex flex-col h-[480px] transition-colors duration-300">
              
              {/* AutoCAD-style Viewport Menu Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[#F8F6F2] dark:bg-[#080A0C] transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  </div>
                  <div className="h-3 w-px bg-border/80" />
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 uppercase">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    BROOKLYN_RESIDENTIAL_A101.dwg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-sm bg-primary/10 dark:bg-blue-950/60 border border-primary/30 text-[8px] font-bold text-primary uppercase tracking-widest">
                    CAD-1:200
                  </span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 dark:bg-amber-950/60 border border-amber-500/30 text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest animate-pulse">
                    SCAN COMPLETE
                  </span>
                </div>
              </div>

              {/* Viewport Control Strip */}
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-[#F1EFEA] dark:bg-[#0B0D10] text-[9px] text-muted-foreground/80 transition-colors duration-300">
                <div className="flex gap-4">
                  <span className="cursor-pointer hover:text-foreground">2D Wireframe</span>
                  <span className="text-border">|</span>
                  <span className="cursor-pointer hover:text-foreground">Top View</span>
                  <span className="text-border">|</span>
                  <span className="cursor-pointer hover:text-foreground">Scale: 1/4" = 1'-0"</span>
                </div>
                <div className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-muted-foreground" />
                  <span>North Grid</span>
                </div>
              </div>

              {/* Working Area Grid Canvas */}
              <div className="flex-1 flex min-h-0 relative">
                
                {/* Left Side: Layer Manager */}
                <div className="w-[110px] border-r border-border bg-[#F8F6F2] dark:bg-[#090B0E] p-3 flex flex-col gap-3.5 text-[9px] transition-colors duration-300">
                  <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border/60 pb-1.5">
                    <Layers className="w-3 h-3 text-primary" />
                    Layers
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setActiveLayers(l => ({ ...l, walls: !l.walls }))} 
                      className={`flex items-center justify-between px-1.5 py-1 rounded-sm border transition-colors text-left ${activeLayers.walls ? 'bg-primary/5 border-primary/20 text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                      <span>A-WALLS</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${activeLayers.walls ? 'bg-blue-400' : 'bg-zinc-700'}`} />
                    </button>
                    <button 
                      onClick={() => setActiveLayers(l => ({ ...l, zoning: !l.zoning }))} 
                      className={`flex items-center justify-between px-1.5 py-1 rounded-sm border transition-colors text-left ${activeLayers.zoning ? 'bg-primary/5 border-primary/20 text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                      <span>Z-ZONING</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${activeLayers.zoning ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                    </button>
                    <button 
                      onClick={() => setActiveLayers(l => ({ ...l, egress: !l.egress }))} 
                      className={`flex items-center justify-between px-1.5 py-1 rounded-sm border transition-colors text-left ${activeLayers.egress ? 'bg-primary/5 border-primary/20 text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                      <span>E-EGRESS</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${activeLayers.egress ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                    </button>
                  </div>

                  <div className="mt-auto pt-2 border-t border-border/40 text-muted-foreground/60 text-[8px] leading-tight">
                    DOB ZONE R6<br />
                    FAR LIMIT: 2.43
                  </div>
                </div>

                {/* Drafting Area Canvas */}
                <div 
                  ref={viewboxRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="flex-1 bg-[#EBE9E4] dark:bg-[#0A0D10] relative overflow-hidden flex items-center justify-center cursor-crosshair p-2 transition-colors duration-300"
                >
                  {/* Subtle Grid inside canvas */}
                  <div className="absolute inset-0 opacity-[0.08] blueprint-grid" />
                  <div className="absolute inset-0 opacity-[0.04] blueprint-grid-fine" />

                  {/* CAD Crosshairs overlay mapping to coordinate display */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-0 right-0 h-px border-t border-dashed border-primary/20 top-[42%]" />
                    <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-primary/20 left-[55%]" />
                  </div>

                  {/* SVG Drafting of Building Floor Plan */}
                  <svg className="w-full h-full max-w-[280px] max-h-[280px] z-10 transition-opacity duration-300" viewBox="0 0 100 100">
                    <rect x="5" y="5" width="90" height="90" fill="none" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="0.5" />
                    
                    {activeLayers.zoning && (
                      <g className="transition-all duration-300">
                        <polygon points="12,12 88,12 88,88 12,88" fill="none" stroke="rgba(56,116,203,0.15)" strokeWidth="0.8" />
                        <polygon points="18,18 82,18 82,82 18,82" fill="none" stroke="rgba(226,135,20,0.3)" strokeWidth="1" strokeDasharray="1.5 1.5" />
                        <circle cx="82" cy="36" r="3" fill="none" stroke="#E28714" strokeWidth="0.8" />
                        <line x1="82" y1="36" x2="68" y2="28" stroke="#E28714" strokeWidth="0.5" />
                        <rect x="42" y="22" width="25" height="8" rx="0.5" fill="currentColor" className="text-white dark:text-[#0C0F12]" stroke="#E28714" strokeWidth="0.5" />
                        <text x="44" y="27" fill="#E28714" fontSize="2.5" fontFamily="monospace" fontWeight="bold">SETBACK REF</text>
                      </g>
                    )}

                    {activeLayers.walls && (
                      <g className="stroke-blue-400/80 fill-none stroke-width-[0.8] transition-opacity duration-300">
                        <rect x="22" y="22" width="56" height="56" rx="1" stroke="currentColor" className="text-primary dark:text-blue-400" strokeWidth="1.2" />
                        <rect x="23.5" y="23.5" width="53" height="53" rx="0.8" stroke="currentColor" className="text-primary/60 dark:text-blue-400/50" strokeWidth="0.6" />
                        <line x1="50" y1="22" x2="50" y2="78" stroke="currentColor" className="text-primary/80 dark:text-blue-400/70" strokeWidth="0.8" />
                        <line x1="22" y1="48" x2="50" y2="48" stroke="currentColor" className="text-primary/80 dark:text-blue-400/70" strokeWidth="0.8" />
                        <path d="M 50,66 A 6,6 0 0,0 56,72" stroke="rgba(52,211,153,0.8)" strokeWidth="0.8" strokeDasharray="1 0.5" />
                        <line x1="50" y1="66" x2="50" y2="72" stroke="rgba(52,211,153,0.8)" strokeWidth="0.8" />
                        <line x1="50" y1="72" x2="56" y2="72" stroke="rgba(52,211,153,0.8)" strokeWidth="0.8" />
                      </g>
                    )}

                    <g fill="currentColor" className="text-foreground/60 dark:text-white/40" fontSize="2" fontFamily="monospace">
                      <text x="26" y="32">BEDROOM 1</text>
                      <text x="26" y="35" fill="currentColor" className="text-foreground/45 dark:text-white/25">12'-0" x 14'-6"</text>
                      <text x="26" y="58">KITCHEN</text>
                      <text x="26" y="61" fill="currentColor" className="text-foreground/45 dark:text-white/25">12'-0" x 13'-0"</text>
                      <text x="54" y="32">LIVING AREA</text>
                      <text x="54" y="35" fill="currentColor" className="text-foreground/45 dark:text-white/25">24'-0" x 14'-6"</text>
                    </g>

                    <g stroke="rgba(255,255,255,0.2)" strokeWidth="0.3">
                      {activeLayers.egress && (
                        <g>
                          <line x1="50" y1="66" x2="42" y2="66" stroke="#EF4444" strokeWidth="0.5" />
                          <circle cx="50" cy="66" r="1.5" fill="#EF4444" />
                          <text x="32" y="68" fill="#EF4444" fontSize="2.5" fontWeight="bold">EGRESS: 32"</text>
                        </g>
                      )}
                    </g>
                  </svg>

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[8px] text-muted-foreground/60 bg-white/95 dark:bg-[#0C0F12]/80 px-2 py-1 border border-border/40 rounded-sm z-20 transition-all duration-300">
                    <span className="flex items-center gap-1">
                      <Crosshair className="w-2.5 h-2.5 text-primary" />
                      COORD X: <span className="text-foreground">{coords.x}</span>
                    </span>
                    <span>
                      COORD Y: <span className="text-foreground">{coords.y}</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider">
                      GRID COMPLIANT
                    </span>
                  </div>
                </div>

                <div className="w-[140px] border-l border-border bg-[#F8F6F2] dark:bg-[#090B0E] p-3 flex flex-col justify-between text-[10px] transition-colors duration-300">
                  <div className="space-y-2">
                    <div className="border-b border-border/60 pb-1 text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                      Report Summary
                    </div>
                    
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        Egress Width
                      </div>
                      <span className="text-[8px] text-muted-foreground block mt-0.5 leading-snug">
                        Complies with standard egress corridors.
                      </span>
                    </div>

                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        Room Dimensions
                      </div>
                      <span className="text-[8px] text-muted-foreground block mt-0.5 leading-snug">
                        All residential spaces exceed min limits.
                      </span>
                    </div>

                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        Occupancy
                      </div>
                      <span className="text-[8px] text-muted-foreground block mt-0.5 leading-snug">
                        R-2 verification check OK.
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-border/40 leading-tight">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        Zoning Setback
                      </div>
                      <span className="text-[8px] text-amber-600 dark:text-amber-500/85 block mt-0.5 leading-snug font-mono">
                        ⚠ Warning: Front setback is under minimum.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                      DOB STATUS
                    </div>
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mt-0.5">
                      3 REVIEW ITEMS
                    </div>
                  </div>
                </div>
              </div>

              {/* AutoCAD Command Line Console */}
              <div className="px-4 py-2 border-t border-border bg-[#F1EFEA] dark:bg-[#06080B] text-[9px] font-mono text-muted-foreground flex flex-col gap-0.5 select-none transition-colors duration-300">
                <div className="flex items-center justify-between text-muted-foreground/30 text-[7px] uppercase tracking-widest font-bold">
                  <span>Command Console Log</span>
                  <span>ACTIVE AUDIT</span>
                </div>
                <div className="flex flex-col text-primary dark:text-primary/80 font-mono leading-relaxed">
                  <div>Command: _VERIFY_COMPLIANCE --setback-limit --egress-check</div>
                  <div className="text-muted-foreground/75">Analyzing drawing vector lines... 142 checks completed.</div>
                  <div className="text-amber-600 dark:text-amber-500 font-semibold">⚠ Warning: Front setback lot-line clearance is 9&apos;-6&quot;. Required min 12&apos;-0&quot; for R6 district.</div>
                </div>
                <div className="flex items-center gap-1.5 text-foreground border-t border-border/10 pt-1 mt-1 font-mono">
                  <span className="text-primary font-bold">Command:</span>
                  <span className="text-muted-foreground/70">_CHECK_EGRESS_WIDTH</span>
                  <span className="animate-pulse w-1 h-3 bg-primary inline-block shrink-0" />
                </div>
              </div>

              {/* Status Bar Console (Autodesk style) */}
              <div className="px-4 py-1.5 border-t border-border bg-[#F8F6F2] dark:bg-[#080A0C] flex items-center justify-between text-[8px] text-muted-foreground transition-colors duration-300">
                <div className="flex items-center gap-1.5 uppercase font-bold text-primary">
                  <Activity className="w-2.5 h-2.5" />
                  Engine: v3.2.0-NYC (2026 Code Release)
                </div>
                <div>
                  SYSTEM INTEGRITY: 100% SECURE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
