"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { FileText, AlertTriangle, Activity, Loader2, Trash2, ArrowUpRight, Upload } from "lucide-react";

export default function DashboardOverview() {
  const { fetchPlans, deletePlan, filteredPlans, loading } = usePlanStore();
  const { user } = useAuthStore();
  const plans = filteredPlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const totalAnalyzed = plans.length;
  const totalIssues = plans.reduce((acc, p) => acc + (p.analysisResult?.issues?.length || 0), 0);
  const avgScore = plans.length > 0 
    ? Math.round(plans.reduce((acc, p) => acc + (p.analysisResult?.score || 0), 0) / plans.length) 
    : 0;

  const stats = [
    { label: "Plans Analyzed", value: totalAnalyzed, icon: FileText, color: "text-[#4edea3]", bg: "bg-[#4edea3]/10" },
    { label: "Issues Found", value: totalIssues, icon: AlertTriangle, color: "text-[#ffb3ad]", bg: "bg-[#ffb3ad]/10" },
    { label: "Avg Compliance", value: `${avgScore}%`, icon: Activity, color: "text-[#b7c8e1]", bg: "bg-[#b7c8e1]/10" },
  ];

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
          <Loader2 className="w-5 h-5 animate-spin text-[#4edea3]" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-[#bbcabf] mt-1">Here&apos;s an overview of your compliance analysis</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-5 flex items-start gap-4 hover:border-white/[0.1] transition-colors"
          >
            <div className={`w-10 h-10 rounded-md ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]/60">{stat.label}</p>
              <p className="text-2xl font-bold text-[#dae2fd] mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Analysis */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
          <div>
            <h2 className="text-base font-semibold text-[#dae2fd]">Recent Analysis</h2>
            <p className="text-xs text-[#bbcabf]/60 mt-0.5">Your latest compliance checks</p>
          </div>
          <Link 
            href="/dashboard/plans"
            className="text-xs font-medium text-[#4edea3] hover:text-[#6ffbbe] transition-colors flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-md bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-[#bbcabf]/30" />
            </div>
            <p className="text-sm font-medium text-[#dae2fd]">No plans analyzed yet</p>
            <p className="text-xs text-[#bbcabf]/60 mt-1 mb-4">Upload a plan to get started</p>
            <Link 
              href="/dashboard/analyzer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#4edea3] hover:text-[#6ffbbe] transition-colors"
            >
              Go to Analyzer <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {plans.slice(0, 5).map((plan) => {
              const score = plan.analysisResult?.score || 0;
              const scoreColor = score >= 70 ? 'text-[#4edea3]' : score >= 40 ? 'text-amber-400' : 'text-red-400';
              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-[#4edea3]/8 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#4edea3]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#dae2fd] truncate group-hover:text-[#4edea3] transition-colors">
                        {plan.fileName}
                      </p>
                      <p className="text-[11px] text-[#bbcabf]/50 mt-0.5">
                        {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${
                      plan.status === 'analyzed' 
                        ? 'bg-[#4edea3]/10 text-[#4edea3]' 
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {plan.status}
                    </span>
                    <span className={`text-sm font-bold ${scoreColor} min-w-[36px] text-right`}>
                      {score}%
                    </span>
                    <button 
                      onClick={(e) => { e.preventDefault(); deletePlan(plan.id); }}
                      className="p-1.5 rounded text-[#bbcabf]/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
