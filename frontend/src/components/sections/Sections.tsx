"use client";

import { useState } from "react";
import { 
  FileText, Search, Check, ChevronRight, AlertTriangle, 
  Upload, Database, Shield, ShieldCheck, CheckCircle2, 
  Layers, Compass, Clock, ArrowRight, BarChart3, Building2, 
  Users, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ====================================================================
   PROBLEM SECTION (Why submissions get delayed)
   ==================================================================== */
export function ProblemSection() {
  const problems = [
    {
      title: "Code Complexity",
      visual: (
        <svg className="w-full h-24 text-muted-foreground/45 font-mono" viewBox="0 0 100 40">
          <g transform="translate(10, 0)">
            {/* Base Grid reference lines */}
            <line x1="0" y1="36" x2="80" y2="36" stroke="rgba(56,116,203,0.1)" strokeWidth="0.5" />
            <line x1="10" y1="36" x2="10" y2="2" stroke="rgba(56,116,203,0.1)" strokeWidth="0.5" />
            
            {/* Book 3 (Bottom) */}
            <path d="M 15,32 L 65,32 L 72,25 L 22,25 Z" fill="#0C0F12" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 65,32 L 65,35 L 72,28 L 72,25 Z" fill="#080A0C" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 15,32 L 15,35 L 65,35 L 65,32 Z" fill="#0E1216" stroke="currentColor" strokeWidth="0.5" />
            
            {/* Book 2 (Middle) */}
            <path d="M 18,24 L 68,24 L 75,17 L 25,17 Z" fill="#0C0F12" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 68,24 L 68,27 L 75,20 L 75,17 Z" fill="#080A0C" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 18,24 L 18,27 L 68,27 L 68,24 Z" fill="#0E1216" stroke="currentColor" strokeWidth="0.5" />
            <text x="26" y="23" fontSize="2.5" fill="rgba(255,255,255,0.4)" transform="rotate(-6 26 23)" letterSpacing="0.2">NYC ZONING RESOLUTION</text>

            {/* Book 1 (Top) */}
            <path d="M 20,16 L 70,16 L 77,9 L 27,9 Z" fill="#12161B" stroke="currentColor" strokeWidth="0.6" />
            <path d="M 70,16 L 70,19 L 77,12 L 77,9 Z" fill="#080A0C" stroke="currentColor" strokeWidth="0.5" />
            <path d="M 20,16 L 20,19 L 70,19 L 70,16 Z" fill="#161B22" stroke="currentColor" strokeWidth="0.5" />
            <text x="28" y="15" fontSize="2.5" fill="currentColor" transform="rotate(-6 28 15)" fontWeight="bold" letterSpacing="0.2">2026 NYC BUILDING CODE</text>
            
            {/* Technical annotation lines */}
            <line x1="5" y1="12" x2="19" y2="12" stroke="#3874CB" strokeWidth="0.5" />
            <circle cx="5" cy="12" r="1" fill="#3874CB" />
            <text x="0" y="9" fontSize="2" fill="rgba(255,255,255,0.3)">ADMIN VOL. I</text>
          </g>
        </svg>
      ),
      desc: "Thousands of pages of highly complex NYC building regulations and zoning amendments require slow, manual interpretation."
    },
    {
      title: "Drawing Errors",
      visual: (
        <svg className="w-full h-24 text-muted-foreground/45 font-mono" viewBox="0 0 120 40">
          <g transform="translate(10, 0)">
            {/* Drawing boundaries */}
            <rect x="5" y="2" width="100" height="36" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <path d="M 5,20 L 105,20" stroke="rgba(56,116,203,0.15)" strokeWidth="0.5" strokeDasharray="1 1" />
            
            {/* Wall sections */}
            <rect x="15" y="8" width="8" height="24" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <line x1="19" y1="8" x2="19" y2="32" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 0.5" />

            <rect x="50" y="8" width="45" height="6" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <line x1="50" y1="11" x2="95" y2="11" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 0.5" />
            
            {/* Corridor Egress path */}
            <path d="M 35,8 L 35,32" stroke="currentColor" strokeWidth="0.6" />
            <path d="M 47,8 L 47,32" stroke="currentColor" strokeWidth="0.6" />
            
            {/* Red alert marker on corridor width */}
            <line x1="35" y1="20" x2="47" y2="20" stroke="#EF4444" strokeWidth="0.8" />
            <path d="M 35,17 L 35,23 M 47,17 L 47,23" stroke="#EF4444" strokeWidth="0.6" />
            <circle cx="41" cy="20" r="2" fill="none" stroke="#EF4444" strokeWidth="0.5" />
            
            {/* Dimension Callout text */}
            <rect x="52" y="18" width="44" height="9" rx="0.5" fill="#0C0F12" stroke="#EF4444" strokeWidth="0.5" />
            <text x="54" y="22.5" fill="#EF4444" fontSize="2.2" fontWeight="bold">EGRESS: 32" (36" REQ)</text>
            <text x="54" y="25.5" fill="rgba(255,255,255,0.3)" fontSize="1.8">VIOLATION SEC. 1020.2</text>
            
            <line x1="47" y1="20" x2="52" y2="22" stroke="#EF4444" strokeWidth="0.4" strokeDasharray="1 0.5" />
          </g>
        </svg>
      ),
      desc: "Small spatial or dimensional mistakes create costly DOB rejection cycles, forcing full plan restarts."
    },
    {
      title: "Review Delays",
      visual: (
        <svg className="w-full h-24 text-muted-foreground/45 font-mono" viewBox="0 0 100 40">
          <g transform="translate(5, 0)">
            {/* Chart Grid Lines */}
            <line x1="15" y1="8" x2="85" y2="8" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="15" y1="16" x2="85" y2="16" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="15" y1="24" x2="85" y2="24" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1="15" y1="32" x2="85" y2="32" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            
            {/* Vertical timeline markings */}
            <line x1="15" y1="5" x2="15" y2="34" stroke="currentColor" strokeWidth="0.5" />
            <line x1="40" y1="5" x2="40" y2="34" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="1 1" />
            <line x1="65" y1="5" x2="65" y2="34" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="1 1" />
            <line x1="85" y1="5" x2="85" y2="34" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="1 1" />
            
            {/* Gantt Bar 1: Design Phase */}
            <rect x="15" y="5" width="20" height="4" fill="#3874CB" />
            <text x="17" y="12" fontSize="2" fill="rgba(255,255,255,0.3)">DESIGN (WK 1-2)</text>
            
            {/* Gantt Bar 2: QA Check */}
            <rect x="35" y="13" width="8" height="4" fill="#60A5FA" />
            <text x="37" y="20" fontSize="2" fill="rgba(255,255,255,0.3)">AUDIT (WK 3)</text>
            
            {/* Gantt Bar 3: DOB Queue Wait */}
            <rect x="43" y="21" width="37" height="4" fill="rgba(255,255,255,0.15)" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 0.5" />
            <text x="45" y="28" fontSize="2" fill="rgba(255,255,255,0.35)">DOB NOW QUEUE (WK 4-7)</text>
            
            {/* Gantt Bar 4: Late Rejection Barrier */}
            <rect x="80" y="29" width="5" height="4" fill="#EF4444" />
            <circle cx="85" cy="31" r="2.5" fill="#EF4444" />
            <text x="84.2" y="32" fontSize="2.5" fill="#080A0C" fontWeight="bold">X</text>
            <text x="56" y="36" fontSize="2.5" fill="#EF4444" fontWeight="bold">⚠ REJECTION (WK 8)</text>
          </g>
        </svg>
      ),
      desc: "Finding compliance issues late in the design pipeline slows approvals and dramatically increases overall project carry costs."
    }
  ];

  return (
    <section id="workflow" className="py-24 bg-[#F8F6F2] dark:bg-[#080A0C] border-b border-border/40 relative transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] blueprint-grid" />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/45 border border-amber-500/20 rounded-sm text-[10px] font-mono tracking-widest uppercase text-amber-500 mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            DOB Friction Metrics
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">Why Submissions Get Delayed</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            The NYC Department of Buildings (DOB) enforces rigid codes. Standard review pathways lead to unnecessary cycles that freeze capital.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <Card key={i} className="border-border/60 bg-white dark:bg-[#0C0F12] rounded-sm relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="w-full bg-[#F1EFEA] dark:bg-[#0A0D10] border border-border/60 p-4 rounded-sm mb-4 transition-colors duration-300">
                  {p.visual}
                </div>
                <CardTitle className="text-base font-mono uppercase tracking-wider text-foreground">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed font-sans">{p.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================================================================
   SOLUTION SECTION (Engineering workflow pipeline)
   ==================================================================== */
export function SolutionSection() {
  const steps = [
    {
      num: "01",
      title: "Upload Drawings",
      desc: "Drag and drop standard PDFs, CAD models, or DWG drawing files securely onto our secure compliance server.",
      icon: <Upload className="w-5 h-5 text-primary" />
    },
    {
      num: "02",
      title: "Automated Analysis",
      desc: "Our regulatory compliance engine parses all vector lines, room scales, and egress boundaries against NYC codes.",
      icon: <Search className="w-5 h-5 text-primary" />
    },
    {
      num: "03",
      title: "Compliance Report",
      desc: "Download detailed compliance reports mapping passed attributes, layout warnings, and exact code references.",
      icon: <FileText className="w-5 h-5 text-primary" />
    }
  ];

  return (
    <section className="py-24 bg-[#F1EFEA] dark:bg-[#0A0D10] border-b border-border/40 relative overflow-hidden transition-colors duration-300">
      {/* Background elements */}
      {/* Blueprint Grid backdrop */}
      <div className="absolute inset-0 opacity-[0.20] blueprint-grid pointer-events-none z-0" />
      
      {/* Deep blue glowing spotlight in the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/30 rounded-full blur-[180px] pointer-events-none z-0" />
      
      {/* Technical blueprint skyline backdrop - high brightness */}
      <div className="absolute inset-0 bg-[url('/bg-matrix.png')] bg-cover bg-bottom opacity-[0.55] pointer-events-none mix-blend-lighten z-0" />

      {/* Horizontal AutoCAD Ruler SVG */}
      <div className="absolute top-0 left-0 right-0 h-5 border-b border-border/40 bg-[#EBE9E4]/90 dark:bg-[#090B0E]/80 pointer-events-none z-10 select-none overflow-hidden transition-colors duration-300">
        <svg className="w-full h-full text-muted-foreground/50 font-mono" viewBox="0 0 1200 20" preserveAspectRatio="none">
          {Array.from({ length: 121 }).map((_, idx) => {
            const isMajor = idx % 10 === 0;
            const isMedium = idx % 5 === 0 && !isMajor;
            const x = idx * 10; // 0 to 1200
            return (
              <g key={idx}>
                <line 
                  x1={x} 
                  y1={0} 
                  x2={x} 
                  y2={isMajor ? 12 : isMedium ? 8 : 5} 
                  stroke="currentColor" 
                  strokeWidth="0.8" 
                />
                {isMajor && (
                  <text 
                    x={x} 
                    y={18} 
                    textAnchor="middle" 
                    fontSize="6.5" 
                    className="fill-muted-foreground/80 font-bold font-mono"
                  >
                    {idx * 10}'
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Horizontal AutoCAD Ruler SVG */}
      <div className="absolute bottom-0 left-0 right-0 h-5 border-t border-border/40 bg-[#EBE9E4]/90 dark:bg-[#090B0E]/80 pointer-events-none z-10 select-none overflow-hidden transition-colors duration-300">
        <svg className="w-full h-full text-muted-foreground/50 font-mono" viewBox="0 0 1200 20" preserveAspectRatio="none">
          {Array.from({ length: 121 }).map((_, idx) => {
            const isMajor = idx % 10 === 0;
            const isMedium = idx % 5 === 0 && !isMajor;
            const x = idx * 10; // 0 to 1200
            return (
              <g key={idx}>
                <line 
                  x1={x} 
                  y1={20} 
                  x2={x} 
                  y2={isMajor ? 8 : isMedium ? 12 : 15} 
                  stroke="currentColor" 
                  strokeWidth="0.8" 
                />
                {isMajor && (
                  <text 
                    x={x} 
                    y={6} 
                    textAnchor="middle" 
                    fontSize="6.5" 
                    className="fill-muted-foreground/80 font-bold font-mono"
                  >
                    {idx * 10}'
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Blueprint Drawing Border Enclosure Frame */}
      <div className="absolute inset-x-6 inset-y-8 border border-border/60 border-dashed pointer-events-none z-0" />

      {/* Precise North Arrow / Compass Rose in background */}
      <div className="absolute top-12 right-12 text-muted-foreground/50 hidden md:block z-0 pointer-events-none select-none font-mono">
        <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="50" cy="50" r="40" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="30" />
          <path d="M 50,10 L 50,90 M 10,50 L 90,50" strokeDasharray="1 3" />
          {/* North arrow triangle */}
          <polygon points="50,15 45,35 50,30" fill="currentColor" opacity="0.5" />
          <polygon points="50,15 55,35 50,30" fill="none" />
          <text x="50" y="8" textAnchor="middle" fontSize="10" className="fill-muted-foreground/80 font-bold">N</text>
        </svg>
      </div>

      <div className="container mx-auto px-6 max-w-7xl relative z-10 pt-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mb-4">
            <Database className="w-3.5 h-3.5" />
            Verification Engine Pipeline
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">Streamline Your Compliance Workflow</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Move from draft layouts to verified, submission-ready blueprints in minutes. Our system works within standard architectural pipelines.
          </p>
        </div>

        {/* Horizontal Process Layout */}
        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-white dark:bg-[#0C0F12] border border-border/80 p-6 rounded-sm hover:border-primary/50 transition-all duration-300 group">
              {/* AutoCAD registration ticks on the corners of the cards */}
              <span className="absolute top-1 left-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
              <span className="absolute top-1 right-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
              <span className="absolute bottom-1 left-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
              <span className="absolute bottom-1 right-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>

              <span className="absolute top-1 left-3 font-mono text-[6px] text-muted-foreground/30 select-none">X: {i * 40}</span>
              <span className="absolute bottom-1 right-3 font-mono text-[6px] text-muted-foreground/30 select-none">REF: S-0{i+1}</span>

              {/* Connector line styled as architectural dimension line for large screens */}
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-6 -translate-y-1/2 z-20 pointer-events-none font-mono">
                  <svg className="w-full h-full text-primary/45" viewBox="0 0 48 24">
                    {/* Extension lines */}
                    <line x1="2" y1="4" x2="2" y2="20" stroke="currentColor" strokeWidth="0.5" />
                    <line x1="46" y1="4" x2="46" y2="20" stroke="currentColor" strokeWidth="0.5" />
                    
                    {/* Dimension line with architectural ticks (45 deg slash) */}
                    <line x1="2" y1="12" x2="46" y2="12" stroke="currentColor" strokeWidth="0.5" />
                    <line x1="0" y1="14" x2="4" y2="10" stroke="currentColor" strokeWidth="0.8" />
                    <line x1="44" y1="14" x2="48" y2="10" stroke="currentColor" strokeWidth="0.8" />
                    
                    {/* Measurement label */}
                    <rect x="14" y="6" width="20" height="12" fill="currentColor" className="text-white dark:text-[#0C0F12] transition-colors duration-300" rx="0" />
                    <text x="24" y="14" textAnchor="middle" fontSize="6" className="fill-primary font-bold">12'-0"</text>
                  </svg>
                </div>
              )}
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                <div className="w-10 h-10 bg-[#F8F6F2] dark:bg-[#080A0C] border border-border flex items-center justify-center rounded-sm transition-colors duration-300">
                  {s.icon}
                </div>
                <span className="font-mono text-xs font-bold text-primary/60">{s.num}</span>
              </div>
              <h3 className="text-base font-mono uppercase tracking-wider text-foreground mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* AutoCAD-style Horizontal Title Block Bar */}
        <div className="mt-12 border border-border/60 bg-white dark:bg-[#0C0F12] p-4 font-mono text-[9px] text-muted-foreground/80 grid grid-cols-2 md:grid-cols-4 gap-6 z-10 relative transition-colors duration-300">
          <div className="flex flex-col gap-1 border-r border-border/40 pr-4">
            <span className="text-[7px] text-muted-foreground/50 uppercase">Drawing Type:</span>
            <span className="text-foreground font-bold uppercase">PIPELINE DIAGRAM</span>
          </div>
          <div className="flex flex-col gap-1 md:border-r md:border-border/40 pr-4">
            <span className="text-[7px] text-muted-foreground/50 uppercase">Scale:</span>
            <span className="text-foreground font-bold uppercase">NOT TO SCALE</span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border/40 pr-4">
            <span className="text-[7px] text-muted-foreground/50 uppercase">Sheet Number:</span>
            <span className="text-primary font-bold uppercase">A-002</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[7px] text-muted-foreground/50 uppercase">Project Reference:</span>
            <span className="text-foreground font-bold uppercase">NYC-HC-2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================
   PREMIUM ELEMENT 1: INTERACTIVE BLUEPRINT SCANNER
   ==================================================================== */
export function InteractiveBlueprintScanner() {
  const [activeZone, setActiveZone] = useState<string>("egress");
  const [scanPosition, setScanPosition] = useState<number>(45);

  const zones = {
    egress: {
      name: "Hallway Egress Width",
      coord: "X: 52.34  Y: 12.80",
      status: "Fail",
      code: "NYC BC Section 1020.2",
      text: "Minimum corridor width must be 36\" for R-2 residential occupancies. Proposed drawing measures 32\", violating safety clearances.",
      alertStyle: "text-red-500 bg-red-500/10 border-red-500/30"
    },
    zoning: {
      name: "Front Yard Setback Limit",
      coord: "X: 78.10  Y: 42.15",
      status: "Warning",
      code: "NYC Zoning Res. R6 Zone",
      text: "The proposed front wall extends 2.5 feet into the mandatory R6 district setback envelope. Review lot lines or request board variance.",
      alertStyle: "text-amber-500 bg-amber-500/10 border-amber-500/30"
    },
    fire: {
      name: "Separation Partition",
      coord: "X: 24.50  Y: 65.10",
      status: "Pass",
      code: "NYC BC Section 708",
      text: "1-hour fire partition wall between tenant residential spaces matches spatial thickness and assembly listings (Compliant).",
      alertStyle: "text-blue-500 bg-blue-500/10 border-blue-500/30"
    },
    access: {
      name: "Clear Floor Turn Space",
      coord: "X: 38.20  Y: 28.60",
      status: "Pass",
      code: "NYC BC Section 1107",
      text: "Accessible bathroom spaces verify standard 60-inch internal diameter turning radius for wheelchair mobility limits.",
      alertStyle: "text-blue-500 bg-blue-500/10 border-blue-500/30"
    }
  };

  return (
    <section id="compliance" className="py-24 bg-[#F8F6F2] dark:bg-[#080A0C] border-b border-border/40 relative transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none opacity-20 blueprint-grid" />
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mb-4">
            <Compass className="w-3.5 h-3.5" />
            Live Vector Inspection Viewport
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">Interactive Drawing Inspection</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Click on active design zones on the architectural sheet to observe how our compliance engine scans vectors against the NYC Building Code database.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch font-mono">
          
          {/* Left Side: Interactive Plan drawing board */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0C0F12] border border-border rounded-sm relative p-4 flex flex-col h-[400px] transition-colors duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-border text-[10px] text-muted-foreground">
              <span className="uppercase font-bold tracking-wider text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Active Canvas: Sheet A-102
              </span>
              <span>Viewport Scale: 1:150</span>
            </div>

            {/* Scanning Blueprint Area */}
            <div className="flex-1 min-h-0 relative bg-[#F1EFEA] dark:bg-[#090B0E] border border-border/60 rounded-sm overflow-hidden flex items-center justify-center p-4 select-none transition-colors duration-300">
              {/* Very fine technical grid */}
              <div className="absolute inset-0 opacity-[0.06] blueprint-grid" />
              <div className="absolute inset-0 opacity-[0.03] blueprint-grid-fine" />

              {/* Animated Laser Scanning Line */}
              <div 
                className="absolute top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-primary to-transparent shadow-lg shadow-primary z-20 pointer-events-none"
                style={{ 
                  left: `${scanPosition}%`, 
                  transition: "left 0.15s ease-out" 
                }}
              />

              {/* SVG Floor plan drafting representing vector scan */}
              <svg className="w-full h-full max-w-[340px] max-h-[300px] z-10" viewBox="0 0 100 100">
                {/* Structural boundary */}
                <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="0.6" />
                
                {/* Internal partitions */}
                <rect x="18" y="18" width="64" height="64" fill="none" stroke="rgba(56, 116, 203, 0.4)" strokeWidth="0.8" />
                <line x1="45" y1="18" x2="45" y2="82" stroke="rgba(56, 116, 203, 0.4)" strokeWidth="0.8" />
                <line x1="18" y1="48" x2="45" y2="48" stroke="rgba(56, 116, 203, 0.4)" strokeWidth="0.8" />
                
                {/* Hotspot: Egress widths (Violating zone) */}
                <g 
                  onClick={() => { setActiveZone("egress"); setScanPosition(45); }}
                  className="cursor-pointer group"
                >
                  <rect x="36" y="32" width="18" height="10" fill={activeZone === "egress" ? "rgba(239, 68, 68, 0.15)" : "transparent"} stroke={activeZone === "egress" ? "#EF4444" : "rgba(239, 68, 68, 0.4)"} strokeWidth="0.6" strokeDasharray="1.5 1" className="transition-all" />
                  <circle cx="45" cy="37" r="2.5" fill="#EF4444" className="animate-pulse" />
                  <text x="38" y="28" fill="#EF4444" fontSize="2.2" fontWeight="bold">Egress Fail</text>
                </g>

                {/* Hotspot: Zoning restrictions setback (Warning zone) */}
                <g 
                  onClick={() => { setActiveZone("zoning"); setScanPosition(78); }}
                  className="cursor-pointer"
                >
                  <line x1="82" y1="18" x2="82" y2="82" stroke={activeZone === "zoning" ? "#E28714" : "rgba(226,135,20,0.4)"} strokeWidth="0.8" strokeDasharray="2 1" />
                  <circle cx="82" cy="48" r="2.5" fill="#E28714" />
                  <text x="68" y="44" fill="#E28714" fontSize="2.2" fontWeight="bold">Zoning Setback</text>
                </g>

                {/* Hotspot: Fire wall partitions (Compliant) */}
                <g 
                  onClick={() => { setActiveZone("fire"); setScanPosition(24); }}
                  className="cursor-pointer"
                >
                  <line x1="18" y1="18" x2="18" y2="82" stroke={activeZone === "fire" ? "#10B981" : "rgba(16,185,129,0.3)"} strokeWidth="1.5" />
                  <circle cx="18" cy="36" r="2.5" fill="#10B981" />
                  <text x="21" y="38" fill="#10B981" fontSize="2.2" fontWeight="bold">1-hr Fire Wall</text>
                </g>

                {/* Hotspot: Bathroom clearances (Accessibility - Compliant) */}
                <g 
                  onClick={() => { setActiveZone("access"); setScanPosition(32); }}
                  className="cursor-pointer"
                >
                  <circle cx="31.5" cy="31.5" r="7" fill="none" stroke={activeZone === "access" ? "#10B981" : "rgba(16,185,129,0.3)"} strokeWidth="0.6" strokeDasharray="1.5 1" />
                  <circle cx="31.5" cy="31.5" r="2" fill="#10B981" />
                  <text x="22" y="22" fill="#10B981" fontSize="2.2" fontWeight="bold">Accessibility Turn</text>
                </g>
              </svg>
            </div>

            {/* Coordinates / inspection info */}
            <div className="flex items-center justify-between text-[8px] text-muted-foreground bg-[#F8F6F2] dark:bg-[#0A0D10] px-2 py-1.5 border-t border-border mt-1 transition-colors duration-300">
              <span>SCANNER HEAD AT POS: {scanPosition}%</span>
              <span>INSPECTING VECTOR DRAFT V4.1</span>
            </div>
          </div>

          {/* Right Side: Compliance Details Inspector Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0C0F12] border border-border rounded-sm p-5 flex flex-col justify-between transition-colors duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Inspection Ledger</span>
                <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold">
                  Rule Inspector
                </span>
              </div>

              {/* Inspector Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{zones[activeZone as keyof typeof zones].name}</h3>
                  <Badge variant="outline" className={`font-mono text-[9px] uppercase border px-2 py-0.5 ${
                    zones[activeZone as keyof typeof zones].status === "Pass" ? "border-blue-500/30 text-blue-500 bg-blue-500/5" :
                    zones[activeZone as keyof typeof zones].status === "Warning" ? "border-amber-500/30 text-amber-500 bg-amber-500/5" :
                    "border-red-500/30 text-red-500 bg-red-500/5"
                  }`}>
                    {zones[activeZone as keyof typeof zones].status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground border-y border-border/40 py-2.5 font-mono">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/60">Vector Location</span>
                    <span className="text-foreground">{zones[activeZone as keyof typeof zones].coord}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/60">NYC Code Mapping</span>
                    <span className="text-foreground text-xs">{zones[activeZone as keyof typeof zones].code}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 font-bold block">Compliance Assessment</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                    {zones[activeZone as keyof typeof zones].text}
                  </p>
                </div>
              </div>
            </div>

            {/* Manual layer select selectors */}
            <div className="pt-4 border-t border-border/40 grid grid-cols-4 gap-2">
              {Object.keys(zones).map((z) => (
                <button
                  key={z}
                  onClick={() => {
                    setActiveZone(z);
                    setScanPosition(z === "egress" ? 45 : z === "zoning" ? 78 : z === "fire" ? 24 : 32);
                  }}
                  className={`text-[9px] py-2 border rounded-sm transition-colors text-center uppercase ${
                    activeZone === z ? 'bg-primary/10 border-primary text-primary font-bold' : 'border-border/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

/* ====================================================================
   PREMIUM ELEMENT 2: NYC REGULATION ENGINE SECTION
   ==================================================================== */
export function NYCRegulationEngine() {
  const [selectedEngine, setSelectedEngine] = useState<string>("building");

  const engines = {
    building: {
      title: "Building Code (BC)",
      stats: "312+ checks active",
      rules: [
        { code: "Chapter 10 (Egress)", desc: "Validates minimum egress pathways, stairway clearances, fire exits, and occupant load ratios." },
        { code: "Chapter 12 (Interior Environment)", desc: "Calculates room ceiling heights, natural light ratios, and ventilation clearances." },
        { code: "Chapter 7 (Fire Barriers)", desc: "Verifies rated masonry wall thicknesses, door assemblies, and draft stops." }
      ]
    },
    zoning: {
      title: "Zoning Resolution (ZR)",
      stats: "184+ boundaries checked",
      rules: [
        { code: "Article II Chapter 3 (Residential FAR)", desc: "Checks Floor Area Ratio boundaries, open spaces, and sky exposure limits." },
        { code: "Article III Chapter 7 (Commercial Setbacks)", desc: "Calculates maximum frontages, rear setbacks, and street line clearances." },
        { code: "Chapter 6 (Accessory Parking Lots)", desc: "Inspects parking lot ratios, landscaping zones, and access driveway dimensions." }
      ]
    },
    energy: {
      title: "Energy Conservation Code (NYCECC)",
      stats: "92+ envelope values audited",
      rules: [
        { code: "Section C402 (Building Envelope)", desc: "Validates minimum ceiling R-values, window glass U-factors, and exterior insulation thermal breaks." },
        { code: "Section C405 (Electrical & Lighting)", desc: "Audits interior lighting power densities (LPD), standard controls, and daylight sensors." },
        { code: "Section C403 (Mechanical Systems)", desc: "Verifies minimum HVAC efficiencies, draft damper seals, and hot-water pipe insulation." }
      ]
    },
    accessibility: {
      title: "Accessibility Code (ADA/ICC)",
      stats: "128+ physical clearance vectors",
      rules: [
        { code: "ICC A117.1 (Accessible Entryways)", desc: "Checks minimum door frame clearance openings, threshold heights, and ramp landing slopes." },
        { code: "Chapter 11 (WC Compartments)", desc: "Validates grab bar locations, standard toilet alignments, and sink knee clearance recesses." },
        { code: "ICC Section 308 (Reach Ranges)", desc: "Ensures switches, thermostats, and manual fire alarms do not exceed maximum height limits." }
      ]
    }
  };

  return (
    <section className="py-24 bg-[#F1EFEA] dark:bg-[#0A0D10] border-b border-border/40 relative transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-7xl">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Interactive Code Selection */}
          <div className="lg:col-span-5 space-y-6 font-mono">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] tracking-widest uppercase text-primary">
              <Database className="w-3.5 h-3.5" />
              Regulation Intelligence
            </div>

            <h2 className="text-3xl font-sans font-bold text-foreground">The NYC Regulation Database Engine</h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              Our analysis model is updated in real-time with administrative resolutions. We automatically map drawings to the four central New York regulatory pillars.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              {Object.keys(engines).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedEngine(k)}
                  className={`flex items-center justify-between p-4 border rounded-sm transition-all text-left group ${
                    selectedEngine === k 
                      ? 'bg-primary/5 border-primary text-foreground' 
                      : 'border-border/60 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold tracking-wider">{engines[k as keyof typeof engines].title}</span>
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">{engines[k as keyof typeof engines].stats}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedEngine === k ? 'text-primary translate-x-1' : 'text-muted-foreground/40'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Database details display */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0C0F12] border border-border rounded-sm p-6 flex flex-col justify-between min-h-[380px] font-mono relative overflow-hidden transition-colors duration-300">
            {/* Active wireframe structure background */}
            <div className="absolute inset-0 bg-[url('/bg-engine.png')] bg-cover bg-center opacity-[0.02] dark:opacity-[0.05] pointer-events-none mix-blend-multiply dark:mix-blend-lighten transition-opacity" />
            <div className="relative z-10 w-full flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Active Engine Ruleset</span>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold border border-primary/10">
                  {engines[selectedEngine as keyof typeof engines].title}
                </span>
              </div>

              <div className="space-y-6">
                {engines[selectedEngine as keyof typeof engines].rules.map((r, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{r.code}</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40 text-[9px] text-muted-foreground/60 flex items-center justify-between">
              <span>DB INTEGRITY VALUE: 0x8FA12B</span>
              <span>SYNC TIME: LIVE (2026 UPDATE)</span>
            </div>
          </div>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ====================================================================
   PREMIUM ELEMENT 3: REPORT PREVIEW & BEFORE/AFTER MATRIX
   ==================================================================== */
export function ReportPreview() {
  return (
    <section className="py-24 bg-[#F8F6F2] dark:bg-[#080A0C] border-b border-border/40 relative overflow-hidden transition-colors duration-300">
      {/* Blueprint skyline matrix background backdrop */}
      <div className="absolute inset-0 bg-[url('/bg-matrix.png')] bg-cover bg-bottom opacity-[0.05] dark:opacity-[0.12] pointer-events-none mix-blend-multiply dark:mix-blend-lighten transition-opacity" />
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Report Sheet mockup */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative border border-border/80 bg-white dark:bg-[#0C0F12] rounded-sm p-6 shadow-2xl font-mono text-[10px] flex flex-col gap-4 overflow-hidden transition-colors duration-300">
              
              {/* Technical watermark stamp */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-dashed border-primary/10 rounded-full w-48 h-48 flex flex-col items-center justify-center uppercase tracking-widest text-[8px] text-primary/10 font-bold rotate-12 pointer-events-none select-none">
                <span>NYC House Code</span>
                <span className="text-[6px] mt-1">AI Verified</span>
                <span className="text-[5px] mt-1 font-sans">© 2026 CODEALGO</span>
              </div>

              {/* Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">NYC House Code Analysis Report</h3>
                  <span className="text-[8px] text-muted-foreground/60 block mt-0.5">COMPLIANCE REVIEW FOR ARCHITECTS & DEVELOPERS</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground">VERIFICATION#</span>
                  <span className="text-[9px] text-muted-foreground block font-mono">NY-A101-928A</span>
                </div>
              </div>

              {/* Project Stats grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4 text-[9px] text-muted-foreground">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/50">PROJECT NAME</span>
                  <span className="text-foreground font-semibold uppercase">Queens Renovation Lot 14</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/50">DRAWING SET</span>
                  <span className="text-foreground font-semibold uppercase">A001-A704 (142 Rules Checked)</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/50">EVALUATION DATE</span>
                  <span className="text-foreground font-semibold">2026-06-01 19:58 EST</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/50">REVIEW STATUS</span>
                  <span className="text-amber-500 font-bold uppercase">3 ITEMS REQUIRE REVISIONS</span>
                </div>
              </div>

              {/* Checked Lists */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase border-b border-border/40 pb-1">
                  <span>Inspection Item</span>
                  <span>Assessment</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-foreground font-semibold">✓ Egress Exit Corridor clearances</span>
                  <span className="text-blue-500 font-bold uppercase">Passed</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-foreground font-semibold">✓ Minimum habitable space envelope</span>
                  <span className="text-blue-500 font-bold uppercase">Passed</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40 pb-1.5">
                  <span className="text-foreground font-semibold">✓ Stair tread dimension geometry</span>
                  <span className="text-blue-500 font-bold uppercase">Passed</span>
                </div>

                <div className="flex items-center justify-between py-1 pt-1.5 text-amber-500">
                  <span className="font-bold">⚠ Front setback lot line restriction</span>
                  <span className="font-extrabold uppercase">Review Needed</span>
                </div>
              </div>

              {/* Stamps / Signatures footer */}
              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-[8px] text-muted-foreground/80 font-mono">
                <div>
                  SYSTEM AUDIT INTEGRITY: <span className="text-blue-500 font-bold">100% SUCCESS</span><br />
                  COMPLIANCE SCORE: <span className="text-foreground font-bold">92.8%</span>
                </div>
                <div className="w-24 h-8 bg-[#F8F6F2] dark:bg-zinc-900 border border-border flex items-center justify-center text-[7px] text-muted-foreground/50 dark:text-muted-foreground/40 font-bold rounded-sm uppercase tracking-wide transition-colors duration-300">
                  Staging Stamp Ref
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Copy & Before/After matrix */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary">
              <BarChart3 className="w-3.5 h-3.5" />
              Efficiency Ledger
            </div>

            <h2 className="text-3xl font-sans font-bold text-foreground">Get Actionable, DOB-Grade Auditing Reports</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our automated generator builds detailed digital ledgers highlighting physical code violations. Show reviews instantly to drafting engineering partners or client developers.
            </p>

            {/* Before / After Matrix Table */}
            <div className="border border-border/80 bg-white dark:bg-[#0C0F12] rounded-sm overflow-hidden font-mono text-[10px] transition-colors duration-300">
              <div className="grid grid-cols-2 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold bg-[#F1EFEA] dark:bg-[#0A0D10] py-2 px-4 transition-colors duration-300">
                <span>Traditional DOB Preparation</span>
                <span>NYC House Code System</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border/40 py-2.5 px-4 gap-4">
                <div>
                  <span className="block font-bold text-foreground">2 to 4 Weeks</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Manual page flipping, waiting on drafting tables, and slow print markups.
                  </p>
                </div>
                <div>
                  <span className="block font-bold text-primary">Minutes</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Immediate vector scanning, real-time code matching, and immediate PDF ledger.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-border/40 py-2.5 px-4 gap-4">
                <div>
                  <span className="block font-bold text-foreground">Manual Checkups</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Subject to architect exhaustion and missed fine setback limits.
                  </p>
                </div>
                <div>
                  <span className="block font-bold text-primary">Automated Sweeps</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Checks entire layouts across 112+ distinct NYC DOB rulesets instantly.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 py-2.5 px-4 gap-4 bg-[#F1EFEA]/40 dark:bg-[#0A0D10]/40 transition-colors duration-300">
                <div>
                  <span className="block font-bold text-foreground">Hidden Mistakes</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Discovered only after DOB Now submission wait times, creating month-long delays.
                  </p>
                </div>
                <div>
                  <span className="block font-bold text-primary">Pre-submission Detection</span>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                    Catch errors before DOB inspectors review, keeping drawings completely clean.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

/* ====================================================================
   TRUST SECTION (Built for construction professionals)
   ==================================================================== */
export function TrustSection() {
  const professionals = [
    {
      role: "Architects",
      icon: <Compass className="w-4 h-4 text-primary" />,
      desc: "Speed up plan auditing during layout drafts. Eliminate hours spent cross-referencing code books manually."
    },
    {
      role: "Developers",
      icon: <Building2 className="w-4 h-4 text-primary" />,
      desc: "Protect investments. Ensure building sets conform completely to zoning resolution densities before drawing purchases."
    },
    {
      role: "Permit Consultants",
      icon: <FileText className="w-4 h-4 text-primary" />,
      desc: "Increase approval throughput. Scan sets to identify filing mistakes beforehand, reducing DOB Now rejection volumes."
    },
    {
      role: "Contractors",
      icon: <Users className="w-4 h-4 text-primary" />,
      desc: "Verify project estimates and dimensions. Keep on-site building adjustments clean and fully compliant."
    }
  ];

  return (
    <section className="py-24 bg-[#F1EFEA] dark:bg-[#0A0D10] border-b border-border/40 relative transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-7xl">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mb-4">
            <Users className="w-3.5 h-3.5" />
            Industry Trust Indicators
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">Designed for Construction Professionals</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            NYC House Code integrates directly into current drafting workflows, trusted by key project stakeholders.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-[10px]">
          {professionals.map((p, i) => (
            <div key={i} className="border border-border/60 bg-white dark:bg-[#0C0F12] p-5 rounded-sm flex flex-col gap-3 group hover:border-primary/40 transition-colors duration-300">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs uppercase font-bold text-foreground group-hover:text-primary transition-colors">{p.role}</span>
                {p.icon}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{p.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ====================================================================
   PRICING SECTION (Sleek Ledger-style Table)
   ==================================================================== */
export function Pricing({ onOpenModal }: { onOpenModal: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState(1);

  const plans = [
    {
      name: "Single Scan",
      desc: "Perfect for single project checkups (1 scan included)",
      oldPrice: "$3",
      price: "$2",
      features: [
        "1 Comprehensive AI Vector Scan",
        "Full spatial dimension checks",
        "Direct PDF report download",
        "Chapter-mapped NYC code citations"
      ]
    },
    {
      name: "Pro Pack",
      desc: "10 Scans + 2 Free Bonus Scans ($24 value)",
      oldPrice: "$30",
      price: "$20",
      features: [
        "12 Complete AI plan audits total",
        "Zoning setback & envelope scans",
        "Support for both PDF & DWG formats",
        "Direct PDF compliance report download",
        "Standard support response within 12h"
      ],
      badge: "Save 33% - Anniversary Special"
    },
    {
      name: "Enterprise Pack",
      desc: "50 Scans + 15 Free Bonus Scans ($130 value)",
      oldPrice: "$150",
      price: "$100",
      features: [
        "65 Complete AI plan audits total",
        "Dedicated workspace accounts",
        "Priority processing server queue",
        "Direct CSV compliance data dumps",
        "Developer API & webhook integration"
      ],
      badge: "Save 33% - Enterprise"
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-[#F8F6F2] dark:bg-[#080A0C] border-b border-border/40 relative overflow-hidden transition-colors duration-300">
      {/* Background blueprint grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] blueprint-grid" />
      
      {/* Deep blue spotlight behind cards */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[180px] pointer-events-none z-0" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mb-4">
            <FileText className="w-3.5 h-3.5" />
            Tariff &amp; Scan Ledger
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">Clear, Action-Oriented Pricing</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Choose the ledger tier suited to your drawing volume. No hidden subscription traps, no licensing lock-ins.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto font-mono text-[10px]">
          {plans.map((p, idx) => {
            const isSelected = selectedPlan === idx;
            return (
              <div 
                key={idx}
                onClick={() => setSelectedPlan(idx)}
                className={`relative border cursor-pointer p-6 rounded-sm flex flex-col justify-between transition-all group ${
                  isSelected 
                    ? 'border-primary bg-primary/5 dark:bg-primary/5/40 shadow-lg shadow-primary/5' 
                    : 'border-border/60 bg-white dark:bg-[#0C0F12] hover:border-border/80'
                }`}
              >
                {/* AutoCAD registration ticks on the corners of the cards */}
                <span className="absolute top-1 left-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
                <span className="absolute top-1 right-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
                <span className="absolute bottom-1 left-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>
                <span className="absolute bottom-1 right-1 font-mono text-[7px] text-muted-foreground/20 font-light select-none">+</span>

                {p.badge && (
                  <span className={`absolute top-3 right-3 text-[7px] font-bold uppercase border px-2 py-0.5 rounded-sm bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse`}>
                    {p.badge}
                  </span>
                )}
                
                <div className="space-y-4">
                  <div className="border-b border-border/40 pb-3">
                    <h3 className="text-xs uppercase font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                    <p className="text-[9px] text-muted-foreground font-sans mt-1">{p.desc}</p>
                  </div>

                  {/* Pricing Display with strikethroughs for anniversary promotion */}
                  <div className="py-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground tracking-tight">{p.price}</span>
                    <span className="text-xs text-muted-foreground/50 line-through font-normal">{p.oldPrice}</span>
                    <span className="text-muted-foreground/60 text-[9px] ml-1">/ scan set</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-border/40">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed font-sans text-xs">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Button
                    onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`w-full font-mono text-xs uppercase tracking-wider font-bold py-5 border rounded-sm transition-all ${
                      isSelected ? 'bg-primary hover:bg-primary/95 text-primary-foreground border-primary/10' : ''
                    }`}
                  >
                    Select Plan
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ====================================================================
   ACCURACY DISCLAIMER
   ==================================================================== */
export function AccuracyDisclaimer() {
  return (
    <section className="py-12 bg-[#F1EFEA] dark:bg-[#0A0D10] border-b border-border/40 transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="border border-amber-500/20 bg-amber-500/[0.02] p-4 rounded-sm flex items-start gap-3.5 font-mono text-[9px] text-amber-600 dark:text-amber-500 transition-colors duration-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600/80 dark:text-amber-500/80 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed font-sans">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider block">Administrative Accuracy Disclaimer</span>
            <p>
              NYC House Code compliance engine leverages artificial intelligence and machine learning models to parse layout coordinates, text structures, and code datasets. AI-assisted reviews are built to support, not replace, experienced engineering and architectural judgement. All plans must undergo final structural engineering review and stamp approvals by licensed New York State design professionals before formal submission to the NYC Department of Buildings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================
   FOOTER (Charcoal Graphite Technical Footer)
   ==================================================================== */
export function Footer() {
  return (
    <footer className="bg-[#F8F6F2] dark:bg-[#080A0C] border-t border-border font-mono text-[10px] transition-colors duration-300">
      <div className="py-16 container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 border-b border-border/40 pb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold font-mono">
                NC
              </div>
              <span className="text-xs uppercase font-bold text-foreground tracking-wider">NYC House Code</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed font-sans">
              Automated building code and zoning analysis vectors for New York real estate portfolios.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-1 text-[9px]">Platform</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#platform" className="hover:text-primary transition-colors">Technical Engine</a></li>
              <li><a href="#workflow" className="hover:text-primary transition-colors">Vector Audits</a></li>
              <li><a href="#compliance" className="hover:text-primary transition-colors">Compliance</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing Ledger</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-1 text-[9px]">Regulatory Docs</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Ledger</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">NYS Board Disclosures</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between text-muted-foreground/60 text-[8px] leading-loose">
          <span>© 2026 NYC House Code Inc. — Construction AI Verification Technologies, NY.</span>
          <span>COMPLIANCE INDEX DATA FEED ACCURACY SECURED</span>
        </div>
      </div>
    </footer>
  );
}
