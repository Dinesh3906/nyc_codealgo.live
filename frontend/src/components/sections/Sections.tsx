"use client";

import { AlertCircle, Clock, DollarSign, FileCheck, Search, Check, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteGrid } from "@/components/ui/the-infinite-grid";

export function ProblemSection() {
  const problems = [
    { icon: <Clock className="w-5 h-5" />, title: "Manual code checks take hours", desc: "Sifting through thousands of pages of NYC DOB codes is slow and prone to human error." },
    { icon: <AlertCircle className="w-5 h-5" />, title: "Errors are easy to miss", desc: "A single missing detail can trigger a rejection, forcing you to restart the entire submission process." },
    { icon: <DollarSign className="w-5 h-5" />, title: "Back-and-forth delays projects", desc: "Every rejection costs thousands in extra fees and weeks of project delays." }
  ];

  return (
    <section id="problem" className="py-24 bg-background">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">DOB Rejections Cost <span className="text-destructive">Time & Money</span></h2>
          <p className="text-lg text-muted-foreground">Submitting plans to the NYC DOB can be slow, complex, and frustrating. Small compliance issues lead to rejections, delays, and costly revisions.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                  {p.icon}
                </div>
                <CardTitle className="text-lg">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{p.desc}</CardDescription>
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
    <section id="solution" className="py-24 bg-muted/50">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Meet Brickly — Your <span className="text-primary">AI Compliance Assistant</span></h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">Brickly analyzes your architectural plans in seconds and flags potential DOB compliance issues before submission.</p>
            
            <ul className="space-y-3 mb-8">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Button asChild variant="default" size="lg">
              <a href="#how-it-works">
                Learn More About Our AI
                <ChevronRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>

          <div className="flex-1 w-full flex items-center justify-center">
            <Card className="w-full max-w-lg shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-medium">Compliance Scan in Progress...</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[70%] animate-pulse"></div>
                </div>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                      <FileCheck className="w-4 h-4" />
                      Rule AC-201: Compliant
                    </div>
                    <p className="text-xs text-green-600">Standard wall thickness exceeds minimum NYC requirement.</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 opacity-60">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
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
    { num: "1", title: "Upload Plans", desc: "Simply drag and drop your PDFs or high-res images of your architectural plans." },
    { num: "2", title: "AI Analysis", desc: "Our AI engine scans against NYC's massive database of Department of Buildings codes." },
    { num: "3", title: "Get Report", desc: "Receive an instant, itemized compliance report with flagged issues and clear suggestions." }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background border-b border-border">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">From plan to submission-ready in minutes.</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-[2px] bg-border" style={{ left: '16.66%', right: '16.66%' }}></div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="relative z-10 w-20 h-20 bg-primary rounded-full text-primary-foreground font-bold text-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  {s.num}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing({ onOpenModal }: { onOpenModal: () => void }) {
  const plans = [
    {
      name: "Month 1",
      description: "First Upload Special",
      price: "$1",
      period: "first month",
      features: [
        "1 Full AI Plan Scan",
        "OCR Extraction",
        "Detailed Report PDF",
        "Immediate Analysis"
      ],
      highlighted: false,
      badge: null
    },
    {
      name: "Month 2",
      description: "83% Intro Discount",
      price: "$49.99",
      period: "month",
      features: [
        "10 AI Scans / Month",
        "Priority Processing",
        "Expert Code Mapping",
        "Full Compliance Check"
      ],
      highlighted: true,
      badge: "Popular"
    },
    {
      name: "Month 3+",
      description: "Professional Access",
      price: "$299",
      period: "month",
      features: [
        "10 AI Scans / Month",
        "Bulk Uploads",
        "Team Dashboard",
        "Custom PDF Headers"
      ],
      highlighted: false,
      badge: null
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-muted/50">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Pricing Plans</h2>
          <p className="text-muted-foreground text-lg">Start for $1, scale as you grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={plan.highlighted ? 'border-2 border-primary shadow-lg' : 'hover:shadow-lg transition-shadow'}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.badge && <Badge>{plan.badge}</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/ {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={onOpenModal}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className="w-full"
                >
                  {index === 0 ? 'Start Now' : 'Get Started'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-muted/50">
      <InfiniteGrid className="py-16 border-t border-border">
        {/* Large "Brickly" text in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-[8rem] md:text-[12rem] lg:text-[16rem] font-black text-primary/10 select-none">
            Brickly
          </h2>
        </div>

        {/* Footer content */}
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <h3 className="text-xl font-semibold text-foreground mb-4">Brickly</h3>
              <p className="text-muted-foreground max-w-xs">Confidence in Every Submission. AI-Powered NYC DOB Compliance.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-border text-center md:text-left">
            <p className="text-sm text-muted-foreground">© 2024 Brickly - Construction AI Technologies Inc.</p>
          </div>
        </div>
      </InfiniteGrid>
    </footer>
  );
}
