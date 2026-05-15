"use client";
 
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Upload, FileText, ShieldCheck, Zap, ArrowUpRight, Database } from "lucide-react";
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

  const features = [
    { icon: Database, title: "113 NYC Codes", desc: "Complete coverage of 2022 NYC Building, Fuel Gas, Mechanical, and Plumbing Codes", color: "text-[#4edea3]", bg: "bg-[#4edea3]/10" },
    { icon: Zap, title: "RAG Technology", desc: "Advanced retrieval system for accurate code section matching and analysis", color: "text-[#b7c8e1]", bg: "bg-[#b7c8e1]/10" },
    { icon: FileText, title: "Detailed Reports", desc: "Comprehensive compliance reports with specific code references and recommendations", color: "text-[#ffb3ad]", bg: "bg-[#ffb3ad]/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Card */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6 sm:p-8 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-[#4edea3]/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-[#4edea3]/10 border border-[#4edea3]/20 px-3 py-1 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4edea3]" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#4edea3]">AI-Powered Analysis</span>
            </div>
            {(usage?.limit === 0 || isExpired) && (
              <button 
                onClick={() => router.push('/dashboard/billing')}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase text-red-400 hover:bg-red-500/15 transition-colors animate-pulse"
              >
                {isExpired ? 'Plan Expired' : 'Credits Required'}
              </button>
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dae2fd] font-headline tracking-tight mb-2">
            NYC DOB Compliance Analyzer
          </h1>
          <p className="text-sm text-[#bbcabf] max-w-lg mb-6">
            Instantly verify your architectural plans against 113 NYC Building Code documents using our AI engine
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleNewCheck}
              className="inline-flex items-center gap-2 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold tracking-wider uppercase px-5 py-3 rounded-md transition-all active:scale-[0.98] shadow-sm shadow-[#4edea3]/10"
            >
              <Upload className="w-4 h-4" />
              {usage?.limit === 0 ? 'Buy Credits to Start' : 'New Compliance Check'}
            </button>
            <Link 
              href="/dashboard/plans"
              className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-[#dae2fd] text-xs font-bold tracking-wider uppercase px-5 py-3 rounded-md transition-all"
            >
              View History
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children">
        {features.map((f, i) => (
          <div key={i} className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-5 hover:border-white/[0.1] transition-colors">
            <div className={`w-9 h-9 rounded-md ${f.bg} flex items-center justify-center mb-3`}>
              <f.icon className={`w-4 h-4 ${f.color}`} />
            </div>
            <h3 className="text-sm font-semibold text-[#dae2fd] mb-1.5">{f.title}</h3>
            <p className="text-xs text-[#bbcabf]/70 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent Scans */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
          <div>
            <h2 className="text-base font-semibold text-[#dae2fd]">Recent Scans</h2>
            <p className="text-xs text-[#bbcabf]/60 mt-0.5">Your latest compliance checks</p>
          </div>
          <Link 
            href="/dashboard/plans"
            className="text-xs font-medium text-[#4edea3] hover:text-[#6ffbbe] transition-colors flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        
        {recentScans.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-md bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-[#bbcabf]/30" />
            </div>
            <p className="text-sm font-medium text-[#dae2fd]">No scans yet</p>
            <p className="text-xs text-[#bbcabf]/60 mt-1 mb-4">Upload your first plan to start analyzing</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#4edea3] hover:text-[#6ffbbe] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Plan
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentScans.map((plan: any) => {
              const score = typeof plan.analysisResult === 'string' 
                ? JSON.parse(plan.analysisResult).score 
                : plan.analysisResult?.score || 0;
              const scoreColor = score >= 70 ? 'text-[#4edea3]' : score >= 40 ? 'text-amber-400' : 'text-red-400';
              return (
                <Link 
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-[#4edea3]/60 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#dae2fd] truncate group-hover:text-[#4edea3] transition-colors">
                        {plan.fileName}
                      </p>
                      <p className="text-[11px] text-[#bbcabf]/50 mt-0.5">
                        {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-base font-bold ${scoreColor}`}>
                      {plan.status === 'analyzed' ? `${score}%` : '--'}
                    </p>
                    <p className="text-[10px] text-[#bbcabf]/40 uppercase tracking-wider">Compliance</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <UploadPlanModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
          <div className="w-5 h-5 border-2 border-[#4edea3]/20 border-t-[#4edea3] rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <AnalyzerContent />
    </Suspense>
  );
}
