"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { Footer } from "@/components/sections/Sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  UserPlus, 
  FileUp, 
  Settings2, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  ChevronRight, 
  Layers 
} from "lucide-react";

export default function FreeScanOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = "Get Started: Scan your First Plan for Free | PermitIQ ( by Aureon )";
  }, []);

  const handleAction = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#F8F6F2] dark:bg-[#080A0C] text-foreground pt-16 font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Navbar onOpenModal={handleAction} />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden border-b border-border/40">
        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-10 blueprint-grid" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.01] dark:opacity-5 blueprint-grid-fine" />
        
        <div className="container mx-auto px-6 max-w-5xl text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 dark:bg-blue-950/45 border border-primary/30 rounded-sm text-[10px] font-mono tracking-widest uppercase text-primary mx-auto">
            <SparklesIcon className="w-3.5 h-3.5" />
            Limited Trial Promotion
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tight text-foreground leading-[1.1]">
            Scan Your First Plan <span className="text-primary">100% Free</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            See how the PermitIQ ( by Aureon ) AI Compliance Engine works on your own blueprints. Get an instant forensic audit mapping egress travel distances, ADA clearances, and zoning setbacks before municipal submission.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Button 
                asChild 
                size="lg" 
                className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-6 border border-primary/20 rounded-sm transition-all shadow-lg shadow-primary/10"
              >
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            ) : (
              <>
                <Button 
                  asChild 
                  size="lg" 
                  className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 py-6 border border-primary/20 rounded-sm transition-all shadow-lg shadow-primary/10"
                >
                  <Link href="/register">
                    Create Account (1 Free Scan) <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="font-mono text-xs uppercase tracking-wider border-border/80 hover:bg-muted text-foreground font-bold px-8 py-6 rounded-sm transition-all"
                >
                  <Link href="/login">
                    Log In
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Step-by-Step Instructions */}
      <section className="py-20 bg-[#F1EFEA] dark:bg-[#0A0D10] transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-sans font-bold text-center text-foreground mb-12">
            How to Claim & Use Your Free Scan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-sm bg-primary/10 dark:bg-blue-950/45 border border-primary/20 flex items-center justify-center font-mono text-primary font-bold mx-auto md:mx-0">
                01
              </div>
              <h3 className="text-base font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Register Account
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sign up for the first time. Your account is automatically credited with <strong>strictly 1 free scan</strong>—no credit card required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-sm bg-primary/10 dark:bg-blue-950/45 border border-primary/20 flex items-center justify-center font-mono text-primary font-bold mx-auto md:mx-0">
                02
              </div>
              <h3 className="text-base font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                <FileUp className="w-4 h-4 text-primary" />
                Upload Blueprint
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open the sandbox from your dashboard and upload your multi-layer vector PDF or AutoCAD drawing (DWG/DXF).
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-sm bg-primary/10 dark:bg-blue-950/45 border border-primary/20 flex items-center justify-center font-mono text-primary font-bold mx-auto md:mx-0">
                03
              </div>
              <h3 className="text-base font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Select Disciplines
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose which 2026 NYC building code categories to analyze (e.g., Egress, Zoning setbacks, Energy ECC, Plumbing, Fire).
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-sm bg-primary/10 dark:bg-blue-950/45 border border-primary/20 flex items-center justify-center font-mono text-primary font-bold mx-auto md:mx-0">
                04
              </div>
              <h3 className="text-base font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Export Audit Report
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                View the dynamic CAD map highlighting code violations, and download a signature-ready PDF forensic compliance report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rules & Fair Use Policy */}
      <section className="py-20 bg-background transition-colors duration-300">
        <div className="container mx-auto px-6 max-w-3xl">
          <Card className="border border-border bg-white dark:bg-[#0C0F12] rounded-sm overflow-hidden relative shadow-xl">
            <CardContent className="p-8 md:p-12 space-y-6">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold font-sans uppercase tracking-wide">
                  Fair Use & Pricing Policy
                </h3>
              </div>
              
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground font-sans">
                <p>
                  To keep this resource accessible for the New York engineering and architectural community, we enforce the following rules:
                </p>
                <ul className="space-y-3 pl-4 list-disc">
                  <li>
                    <strong>Strictly One Scan:</strong> Each unique new user is granted exactly 1 free scan credit upon initial verification. 
                  </li>
                  <li>
                    <strong>Verification Required:</strong> Free scans are tied to verified email addresses to prevent abuse of the AI resources.
                  </li>
                  <li>
                    <strong>Buying Plan Packages:</strong> Once you consume your free trial scan, your balance will return to 0. To scan additional drawings, you can instantly purchase package plans (e.g., 1 Upload, 12 Uploads, or 65 Uploads) directly from the <strong>Billing</strong> tab in your dashboard.
                  </li>
                </ul>
              </div>

              {!isAuthenticated && (
                <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Ready to get your free report?</span>
                  <Button 
                    asChild 
                    className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-4 rounded-sm transition-all"
                  >
                    <Link href="/register">
                      Sign Up & Scan Now
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// Sparkles fallback icon to keep everything clean and consistent
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}
