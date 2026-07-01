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
    const remaining = (usage?.limit || 0) - (usage?.used || 0);
    if (searchParams.get('new') === 'true' && usage?.limit > 0 && remaining > 0) {
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
    const remaining = (usage?.limit || 0) - (usage?.used || 0);
    if (usage?.limit === 0 || remaining <= 0 || isExpired) {
      router.push('/dashboard/billing');
      return;
    }
    setShowUploadModal(true);
  };

  const isExpired = usage?.expiryDate && new Date(usage.expiryDate) < new Date();
  const remaining = (usage?.limit || 0) - (usage?.used || 0);
  const hasNoCredits = !usage || usage.limit === 0 || remaining <= 0;

  return (
    <div className="space-y-8">
      <Card className="border-2 border-blue-500/20 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 overflow-hidden relative shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-48 h-48 text-blue-500" />
        </div>
        <CardHeader className="space-y-4 relative">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">AI-Powered Forensic Audit</Badge>
            {(hasNoCredits || isExpired) && (
              <Badge variant="destructive" className="animate-pulse cursor-pointer" onClick={() => router.push('/dashboard/billing')}>
                {isExpired ? 'Plan Expired' : 'Credits Required'}
              </Badge>
            )}
          </div>
          <div className="max-w-2xl">
            <CardTitle className="text-4xl font-black text-slate-900 dark:text-white leading-tight">NYC DOB Compliance <span className="text-blue-500">Analyzer</span></CardTitle>
            <CardDescription className="text-lg text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              Instantly verify your architectural plans against 260+ NYC building code PDFs using our Vectorless RAG forensic engine.
            </CardDescription>
          </div>
          <div className="flex gap-4 pt-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 px-8" onClick={handleNewCheck}>
              <Upload className="w-5 h-5 mr-2" />
              {hasNoCredits ? 'Buy Credits to Start' : 'New Compliance Check'}
            </Button>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="lg" className="border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200">
                View History
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "260+ NYC PDFs", desc: "Complete coverage of 2022 NYC Building, Fuel Gas, Mechanical, and Plumbing Codes." },
          { icon: Zap, title: "Forensic RAG", desc: "Advanced vectorless retrieval system for hyper-accurate code section matching." },
          { icon: FileText, title: "Executive Audit", desc: "Professional reports with Senior Examiner appreciation and architectural betterments." }
        ].map((item, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <item.icon className="w-5 h-5 text-blue-500" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 dark:text-white">Recent Compliance Scans</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-500">Overview of your most recent forensic audits</CardDescription>
            </div>
            <Link href="/dashboard/plans">
              <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">View Full History</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-slate-800">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">No Forensic Audits Yet</p>
              <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">Upload your first architectural plan to start the automated compliance check.</p>
              <Button className="mt-8 px-8" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {recentScans.map((plan: any) => {
                const result = getParsedResult(plan);
                const score = result.score || result.percentage || 0;
                const isManualReview = result.status === 'manual_review' || result.score === null;
                return (
                  <Link 
                    key={plan.id}
                    href={`/dashboard/plans/${plan.id}`}
                    className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg group-hover:bg-blue-500/10 transition-colors shadow-sm">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">{plan.fileName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Audited on {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-500">
                        {plan.status === 'analyzed' && !isManualReview ? `${score}%` : '--'}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">Compliance</p>
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

export default function AnalyzerPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <Skeleton className="h-[250px] w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    }>
      <AnalyzerContent />
    </Suspense>
  );
}
