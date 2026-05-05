"use client";

import { useState } from "react";

import { AlertCircle, Clock, DollarSign, FileCheck, Search, Check, ChevronRight, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProblemSection() {
  const problems = [
    { icon: <Clock className="w-5 h-5" />, title: "Manual code checks take hours", desc: "Sifting through thousands of pages of NYC DOB codes is slow and prone to human error.", color: "text-amber-500 bg-amber-500/10" },
    { icon: <AlertCircle className="w-5 h-5" />, title: "Errors are easy to miss", desc: "A single missing detail can trigger a rejection, forcing you to restart the entire submission process.", color: "text-red-500 bg-red-500/10" },
    { icon: <DollarSign className="w-5 h-5" />, title: "Back-and-forth delays projects", desc: "Every rejection costs thousands in extra fees and weeks of project delays.", color: "text-orange-500 bg-orange-500/10" }
  ];

  return (
    <section id="problem" className="py-24 bg-background">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 text-destructive border-destructive/30">The Problem</Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">DOB Rejections Cost <span className="text-destructive">Time & Money</span></h2>
          <p className="text-lg text-muted-foreground">Submitting plans to the NYC DOB can be slow, complex, and frustrating. Small compliance issues lead to rejections, delays, and costly revisions.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <Card key={i} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/60">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${p.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {p.icon}
                </div>
                <CardTitle className="text-lg">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{p.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionSection() {
  const features = [
    "Upload PDFs or images",
    "AI scans against DOB rules",
    "Get clear, actionable feedback"
  ];

  return (
    <section id="solution" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 max-w-2xl">
            <Badge className="mb-4">The Solution</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">Your <span className="text-gradient">AI Compliance Assistant</span></h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">NYC House Code analyzes your architectural plans in seconds and flags potential DOB compliance issues before submission.</p>
            
            <ul className="space-y-4 mb-8">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Button asChild variant="default" size="lg" className="shadow-lg shadow-primary/20">
              <a href="#how-it-works">
                Learn More About Our AI
                <ChevronRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>

          <div className="flex-1 w-full flex items-center justify-center">
            <Card className="w-full max-w-lg shadow-2xl border-border/40">
              <CardHeader className="border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <CardTitle className="text-sm font-medium">Compliance Scan in Progress...</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent w-[70%] animate-pulse rounded-full"></div>
                </div>
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-1">
                      <FileCheck className="w-4 h-4" />
                      Rule AC-201: Compliant
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Standard wall thickness exceeds minimum NYC requirement.</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 opacity-70">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                      <Search className="w-4 h-4" />
                      Analyzing Zoning...
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { num: "1", title: "Upload Plans", desc: "Simply drag and drop your PDFs or high-res images of your architectural plans.", icon: "📄" },
    { num: "2", title: "AI Analysis", desc: "Our AI engine scans against NYC's massive database of Department of Buildings codes.", icon: "🧠" },
    { num: "3", title: "Get Report", desc: "Receive an instant, itemized compliance report with flagged issues and clear suggestions.", icon: "✅" }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background border-b border-border">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">Three Simple Steps</h2>
          <p className="text-muted-foreground text-lg">From plan to submission-ready in minutes.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center group">
              <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl text-primary-foreground font-bold text-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing({ onOpenModal }: { onOpenModal: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState(1);

  const plans = [
    {
      name: "Single Scan",
      description: "Perfect for a quick check",
      price: "$2",
      period: "one-time",
      features: [
        "1 Full AI Plan Scan",
        "OCR Extraction",
        "Detailed Report PDF",
        "Immediate Analysis"
      ],
      badge: null,
    },
    {
      name: "Pro Pack",
      description: "Best for smaller projects",
      price: "$20",
      period: "one-time",
      features: [
        "12 AI Scans (Buy 10, Get 2 Free)",
        "Priority Processing",
        "Expert Code Mapping",
        "Full Compliance Check"
      ],
      badge: "Best Value",
    },
    {
      name: "Enterprise Pack",
      description: "Bulk compliance checking",
      price: "$100",
      period: "one-time",
      features: [
        "65 AI Scans (Buy 50, Get 15 Free)",
        "Lifetime Credits",
        "Priority Support",
        "Bulk Processing"
      ],
      badge: null,
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground text-lg">Pay only for what you need. No monthly subscriptions.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan === index;
            return (
            <Card 
              key={index}
              onClick={() => setSelectedPlan(index)}
              className={`relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ${isSelected ? 'border-2 border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/5 to-transparent' : 'border-border/60'}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  {plan.badge && <Badge className="bg-accent text-accent-foreground hover:bg-accent">{plan.badge}</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2 text-sm">/ {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full ${isSelected ? 'shadow-lg shadow-primary/20' : ''}`}
                >
                  {isSelected ? <><Zap className="w-4 h-4 mr-2" /> Get Started</> : 'Get Started'}
                </Button>
              </CardContent>
            </Card>
          );})}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-foreground text-background">
      <div className="py-16 border-t border-border/10">
        {/* Footer content */}
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <h3 className="text-xl font-bold mb-4">NYC House Code</h3>
              <p className="text-background/60 max-w-xs">Confidence in Every Submission. AI-Powered NYC DOB Compliance.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-background/80">Product</h4>
              <ul className="space-y-2 text-sm text-background/50">
                <li><a href="#pricing" className="hover:text-background transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-background transition-colors">About</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-background/80">Legal</h4>
              <ul className="space-y-2 text-sm text-background/50">
                <li><a href="#" className="hover:text-background transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-background/10 text-center md:text-left">
            <p className="text-sm text-background/40">© 2024 NYC House Code - Construction AI Technologies Inc.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
