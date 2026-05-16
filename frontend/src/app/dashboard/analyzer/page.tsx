"use client";
 
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Upload, FileText, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

function AnalyzerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const { plans, fetchPlans, loading: plansLoading } = usePlanStore();

  useEffect(() => {
    fetchPlans();
    
    // Fetch usage to check if user has a plan
    api.get("/billing/usage")
      .then(res => setUsage(res.data))
      .catch(() => setUsage({ status: 'free', limit: 0 }));
  }, [fetchPlans]);

  // Robust parsing helper for historical scores
  const getParsedResult = (plan: any) => {
    let result = plan.analysisResult;
    let depth = 0;
    while (typeof result === 'string' && depth < 5) {
      try { result = JSON.parse(result); } catch { break; }
      depth++;
    }
    return result || {};
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true' && usage?.limit > 0) {
      setShowUploadModal(true);
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('new');
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${window.location.pathname}${query}`);
    }
  }, [searchParams, router, usage]);

  const recentScans = plans.slice(0, 5);

  const handleNewCheck = () => {
    const isExpired = usage?.expiryDate && new Date(usage.expiryDate) < new Date();
    if (usage?.limit === 0 || isExpired) {
      router.push('/dashboard/billing');
      return;
    }
    setShowUploadModal(true);
  };

  const isExpired = usage?.expiryDate && new Date(usage.expiryDate) < new Date();

  return (
    <div className="space-y-8">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-48 h-48 text-primary" />
        </div>
        <CardHeader className="space-y-4 relative">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">AI-Powered Forensic Audit</Badge>
            {(usage?.limit === 0 || isExpired) && (
              <Badge variant="destructive" className="animate-pulse cursor-pointer" onClick={() => router.push('/dashboard/billing')}>
                {isExpired ? 'Plan Expired' : 'Credits Required'}
              </Badge>
            )}
          </div>
          <div className="max-w-2xl">
            <CardTitle className="text-4xl font-black text-white leading-tight">NYC DOB Compliance <span className="text-primary">Analyzer</span></CardTitle>
            <CardDescription className="text-lg text-slate-400 mt-4 leading-relaxed">
              Instantly verify your architectural plans against 113 NYC Building Code chapters using our Vectorless RAG forensic engine.
            </CardDescription>
          </div>
          <div className="flex gap-4 pt-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 px-8" onClick={handleNewCheck}>
              <Upload className="w-5 h-5 mr-2" />
              {usage?.limit === 0 ? 'Buy Credits to Start' : 'New Compliance Check'}
            </Button>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800 text-white">
                View History
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "113 NYC Codes", desc: "Complete coverage of 2022 NYC Building, Fuel Gas, Mechanical, and Plumbing Codes." },
          { icon: Zap, title: "Forensic RAG", desc: "Advanced vectorless retrieval system for hyper-accurate code section matching." },
          { icon: FileText, title: "Executive Audit", desc: "Professional reports with Senior Examiner appreciation and architectural betterments." }
        ].map((item, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-3 text-white">
                <item.icon className="w-5 h-5 text-primary" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Compliance Scans</CardTitle>
              <CardDescription className="text-slate-500">Overview of your most recent forensic audits</CardDescription>
            </div>
            <Link href="/dashboard/plans">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">View Full History</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-20 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
              <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                <FileText className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-lg font-bold text-white">No Forensic Audits Yet</p>
              <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">Upload your first architectural plan to start the automated compliance check.</p>
              <Button className="mt-8 px-8" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((plan: any) => {
                const result = getParsedResult(plan);
                const score = result.score || result.percentage || 0;
                return (
                  <Link 
                    key={plan.id}
                    href={`/dashboard/plans/${plan.id}`}
                    className="group flex items-center justify-between p-5 bg-slate-950/50 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-900 p-3 rounded-lg group-hover:bg-primary/10 transition-colors">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-primary transition-colors">{plan.fileName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Audited on {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-400">
                        {plan.status === 'analyzed' ? `${score}%` : '--'}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Compliance</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadPlanModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <Skeleton className="h-[250px] w-full bg-slate-800 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 bg-slate-800" />
        <Skeleton className="h-32 bg-slate-800" />
        <Skeleton className="h-32 bg-slate-800" />
      </div>
      <Skeleton className="h-96 w-full bg-slate-800" />
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AnalyzerContent />
    </Suspense>
  );
}
