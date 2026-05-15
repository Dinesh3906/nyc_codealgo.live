"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";
import { HardHat, Building2, Loader2, Send } from "lucide-react";

export default function ServicesPage() {
  const { user } = useAuthStore();
  const [leadLoading, setLeadLoading] = useState(false);
  const [contractorLoading, setContractorLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({ phone: "", description: "", projectType: "residential" });
  const [contractorForm, setContractorForm] = useState({ name: "", companyName: "", services: "", email: "", phone: "" });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    try {
      await api.post("/leads/submit-lead", { ...leadForm, userId: user?.id });
      toast.success("Project lead submitted!");
      setLeadForm({ phone: "", description: "", projectType: "residential" });
    } catch { toast.error("Failed to submit lead."); }
    finally { setLeadLoading(false); }
  };

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractorLoading(true);
    try {
      await api.post("/leads/contractor-signup", contractorForm);
      toast.success("Contractor application received!");
      setContractorForm({ name: "", companyName: "", services: "", email: "", phone: "" });
    } catch { toast.error("Failed to sign up."); }
    finally { setContractorLoading(false); }
  };

  const inputCls = "flex h-11 w-full rounded-md border border-white/[0.08] bg-[#171f33] px-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all";
  const labelCls = "text-xs font-bold tracking-widest uppercase text-[#bbcabf]";

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight">Contractor Services</h1>
        <p className="text-sm text-[#bbcabf] mt-1">Connect with contractors or join our network</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Find a Contractor */}
        <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-md bg-[#4edea3]/10 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-[#4edea3]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#dae2fd]">Find a Contractor</h2>
              <p className="text-xs text-[#bbcabf]/60">Tell us about your project</p>
            </div>
          </div>
          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className={labelCls}>Phone Number</label>
              <input required type="tel" placeholder="(555) 000-0000" value={leadForm.phone} onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Project Type</label>
              <div className="flex gap-2">
                {['residential', 'commercial'].map(t => (
                  <button key={t} type="button" onClick={() => setLeadForm({...leadForm, projectType: t})}
                    className={`flex-1 text-xs font-bold tracking-wider uppercase py-2.5 rounded-md transition-all ${leadForm.projectType === t ? 'bg-[#4edea3] text-[#003824]' : 'bg-white/[0.04] text-[#dae2fd] border border-white/[0.08] hover:bg-white/[0.07]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Description</label>
              <textarea required rows={4} placeholder="What do you need help with..." value={leadForm.description} onChange={(e) => setLeadForm({...leadForm, description: e.target.value})}
                className={`${inputCls} min-h-[100px] resize-none`} />
            </div>
            <button type="submit" disabled={leadLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold tracking-wider uppercase py-2.5 rounded-md transition-all active:scale-[0.98] disabled:opacity-50 mt-2">
              {leadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Lead
            </button>
          </form>
        </div>

        {/* Join the Network */}
        <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-md bg-[#b7c8e1]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#b7c8e1]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#dae2fd]">Join the Network</h2>
              <p className="text-xs text-[#bbcabf]/60">Grow your business with NYC Codes</p>
            </div>
          </div>
          <form onSubmit={handleContractorSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className={labelCls}>Full Name</label>
              <input required placeholder="John Doe" value={contractorForm.name} onChange={(e) => setContractorForm({...contractorForm, name: e.target.value})} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Company Name</label>
              <input required placeholder="NYC Building Co." value={contractorForm.companyName} onChange={(e) => setContractorForm({...contractorForm, companyName: e.target.value})} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Services Offered</label>
              <textarea required rows={2} placeholder="Expediting, Construction..." value={contractorForm.services} onChange={(e) => setContractorForm({...contractorForm, services: e.target.value})}
                className={`${inputCls} min-h-[60px] resize-none`} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <label className={labelCls}>Email</label>
                <input type="email" placeholder="you@email.com" value={contractorForm.email} onChange={(e) => setContractorForm({...contractorForm, email: e.target.value})} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Phone</label>
                <input type="tel" placeholder="(555) 000-0000" value={contractorForm.phone} onChange={(e) => setContractorForm({...contractorForm, phone: e.target.value})} className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={contractorLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold tracking-wider uppercase py-2.5 rounded-md transition-all active:scale-[0.98] disabled:opacity-50">
              {contractorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Register as Contractor
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
