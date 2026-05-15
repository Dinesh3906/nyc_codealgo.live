"use client";
 
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import api from "@/lib/api";
import { MessageSquare, Loader2, RefreshCcw, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "react-hot-toast";

interface Feedback {
  id: string; userName: string; userEmail: string; type: string; subject: string; message: string; createdAt: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === 'chalams115@gmail.com';
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !isAdmin)) { toast.error("Unauthorized"); router.push("/dashboard"); }
  }, [hasHydrated, isAuthenticated, isAdmin, router]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try { const r = await api.get("/feedback"); setFeedbacks(r.data); }
    catch (e: any) { toast.error(e.response?.data?.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthenticated && isAdmin) fetchFeedbacks(); }, [isAuthenticated, isAdmin]);

  if (!hasHydrated || loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
        <Loader2 className="w-5 h-5 animate-spin text-[#4edea3]" />Loading...
      </div>
    </div>
  );
  if (!isAdmin) return null;

  const complaints = feedbacks.filter(f => f.type === 'complaint').length;
  const features = feedbacks.filter(f => f.type === 'feature').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-[#4edea3]" /> Admin Feedback
          </h1>
          <p className="text-sm text-[#bbcabf] mt-1">Manage user feedback and complaints</p>
        </div>
        <button onClick={fetchFeedbacks} className="p-2 rounded-md text-[#bbcabf] hover:text-[#dae2fd] hover:bg-white/[0.04] transition-colors">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{l:"Total",v:feedbacks.length,c:"text-[#4edea3]",b:"bg-[#4edea3]/10"},{l:"Complaints",v:complaints,c:"text-red-400",b:"bg-red-500/10"},{l:"Feature Requests",v:features,c:"text-[#b7c8e1]",b:"bg-[#b7c8e1]/10"}].map((s,i)=>(
          <div key={i} className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]/50">{s.l}</p>
            <p className={`text-2xl font-bold mt-1 ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[180px_90px_1fr_1fr_100px_80px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold tracking-widest uppercase text-[#bbcabf]/40">
          <span>User</span><span>Type</span><span>Subject</span><span>Message</span><span>Proofs</span><span>Date</span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="text-center py-14">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-[#bbcabf]/20" />
            <p className="text-sm text-[#bbcabf]/60">No feedback received yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="grid md:grid-cols-[180px_90px_1fr_1fr_100px_80px] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group items-start">
                <div>
                  <p className="text-sm font-medium text-[#dae2fd]">{fb.userName}</p>
                  <p className="text-[11px] text-[#bbcabf]/50">{fb.userEmail}</p>
                </div>
                <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-fit ${fb.type === 'complaint' ? 'bg-red-500/10 text-red-400' : 'bg-[#b7c8e1]/10 text-[#b7c8e1]'}`}>
                  {fb.type}
                </span>
                <p className="text-sm font-medium text-[#dae2fd]">{fb.subject}</p>
                <p className="text-xs text-[#bbcabf]/60 line-clamp-2 group-hover:line-clamp-none">{fb.message}</p>
                <div className="flex -space-x-1.5">
                  {(fb as any).images?.map((img: string, idx: number) => (
                    <a key={idx} href={`${backendUrl}${img}`} target="_blank" rel="noopener noreferrer" className="relative group/img">
                      <img src={`${backendUrl}${img}`} alt="Proof" className="w-8 h-8 rounded ring-2 ring-[#131b2e] object-cover hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded transition-opacity">
                        <ExternalLink className="w-3 h-3 text-white" />
                      </div>
                    </a>
                  ))}
                  {(!(fb as any).images || (fb as any).images.length === 0) && (
                    <span className="text-[11px] text-[#bbcabf]/30 italic">None</span>
                  )}
                </div>
                <span className="text-[11px] text-[#bbcabf]/50">{new Date(fb.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
