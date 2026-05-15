"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { Search, Trash2, FileText, Loader2, ArrowUpRight } from "lucide-react";

export default function PlansHub() {
  const { fetchPlans, deletePlan, filteredPlans, loading, searchQuery, setSearchQuery } = usePlanStore();
  const { user } = useAuthStore();
  const plans = filteredPlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight">My Plans</h1>
        <p className="text-sm text-[#bbcabf] mt-1">Manage your compliance analysis history</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbcabf]/40" />
        <input
          placeholder="Search plans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#131b2e] pl-10 pr-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all"
        />
      </div>

      {/* Plans List */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg overflow-hidden">
        {loading && plans.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
              <Loader2 className="w-5 h-5 animate-spin text-[#4edea3]" />
              Loading plans...
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-md bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-[#bbcabf]/30" />
            </div>
            <p className="text-sm font-medium text-[#dae2fd]">
              {searchQuery ? "No matches found" : "No plans yet"}
            </p>
            <p className="text-xs text-[#bbcabf]/60 mt-1">Upload a plan to get started</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_100px_80px_60px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold tracking-widest uppercase text-[#bbcabf]/40">
              <span>Plan Name</span>
              <span>Created</span>
              <span>Status</span>
              <span className="text-right">Score</span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {plans.map((plan) => {
                const score = plan.analysisResult?.percentage || plan.analysisResult?.score || 0;
                const scoreColor = score >= 70 ? 'text-[#4edea3]' : score >= 40 ? 'text-amber-400' : 'text-red-400';
                return (
                  <div
                    key={plan.id}
                    className="flex sm:grid sm:grid-cols-[1fr_120px_100px_80px_60px] items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <Link 
                      href={`/dashboard/plans/${plan.id}`} 
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <FileText className="w-4 h-4 text-[#4edea3]/60 shrink-0" />
                      <span className="text-sm font-medium text-[#dae2fd] truncate group-hover:text-[#4edea3] transition-colors">
                        {plan.fileName}
                      </span>
                    </Link>

                    <span className="hidden sm:block text-xs text-[#bbcabf]/50">
                      {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>

                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded w-fit ${
                      plan.status === 'analyzed' 
                        ? 'bg-[#4edea3]/10 text-[#4edea3]' 
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {plan.status}
                    </span>

                    <span className={`text-sm font-bold ${scoreColor} text-right hidden sm:block`}>
                      {score}%
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/plans/${plan.id}`}>
                        <button className="p-1.5 rounded text-[#bbcabf]/40 hover:text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button 
                        onClick={() => deletePlan(plan.id)}
                        className="p-1.5 rounded text-[#bbcabf]/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
