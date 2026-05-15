"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import api from "@/lib/api";
import { CheckCircle2, Loader2, TrendingUp } from "lucide-react";

export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(1);

  useEffect(() => {
    api.get("/billing/usage")
      .then(res => setUsage(res.data))
      .catch(() => setUsage({ status: 'Free', used: 0, limit: 1 }))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: string) => {
    try {
      setLoading(true);
      const res = await api.post("/billing/create-checkout", { plan });
      const { orderId, amount, currency } = res.data;
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, amount, currency,
        name: "NYC House Code", description: "Purchase Scan Pack", order_id: orderId,
        handler: async function (response: any) {
          try {
            setLoading(true);
            await api.post('/billing/confirm-session', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            const u = await api.get("/billing/usage");
            setUsage(u.data);
            alert("Payment successful!");
          } catch { alert("Payment verification failed."); }
          finally { setLoading(false); }
        },
        theme: { color: "#4edea3" }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => alert("Payment failed: " + r.error.description));
      rzp.open();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      alert(err.response?.data?.message || "Failed to create order.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
        <Loader2 className="w-5 h-5 animate-spin text-[#4edea3]" />Loading...
      </div>
    </div>
  );

  const pct = Math.min((usage.used / (usage.limit || 1)) * 100, 100);
  const rem = Math.max(0, usage.limit - usage.used);
  const packs = [
    { id:'pack-1', name:"Single Scan", desc:"Quick check", price:"$2", per:"one-time", feats:["1 AI Scan","OCR Extraction","PDF Report","Instant Analysis"], badge:null },
    { id:'pack-12', name:"Pro Pack", desc:"Smaller projects", price:"$20", per:"one-time", feats:["12 Scans (Buy 10+2 Free)","Priority Processing","Expert Mapping","Full Compliance"], badge:"Best Value" },
    { id:'pack-65', name:"Enterprise", desc:"Bulk checking", price:"$100", per:"one-time", feats:["65 Scans (Buy 50+15 Free)","Lifetime Credits","Priority Support","Bulk Processing"], badge:null },
  ];

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight">Billing & Credits</h1>
          <p className="text-sm text-[#bbcabf] mt-1">Manage your scan credits and usage</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#4edea3]" />
              <h2 className="text-sm font-semibold text-[#dae2fd]">Scan Credits</h2>
            </div>
            <p className="text-xs text-[#bbcabf]/60 mb-4">{usage.used} of {usage.limit} used</p>
            <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-700 ${pct > 80 ? 'bg-red-400' : 'bg-[#4edea3]'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#bbcabf]/60">Remaining</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${rem > 0 ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-red-500/10 text-red-400'}`}>{rem} Scans</span>
            </div>
          </div>
          <div className="bg-[#131b2e] border border-dashed border-white/[0.08] rounded-lg p-6">
            <h2 className="text-sm font-semibold text-[#dae2fd] mb-3">How it works</h2>
            <div className="space-y-2 text-xs text-[#bbcabf]/70">
              <p>• Credits never expire</p>
              <p>• Each analysis costs 1 credit</p>
              <p>• Buy more packs anytime</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#dae2fd] mb-5 font-headline">Purchase Scan Packs</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children">
            {packs.map((p, i) => {
              const sel = selectedPlan === i;
              return (
                <div key={i} onClick={() => setSelectedPlan(i)}
                  className={`bg-[#131b2e] border rounded-lg p-6 cursor-pointer transition-all relative ${sel && i===1 ? 'border-[#4edea3]/40 ring-1 ring-[#4edea3]/20' : sel ? 'border-white/[0.1]' : 'border-white/[0.06]'} hover:border-white/[0.12]`}>
                  {p.badge && <span className="absolute top-4 right-4 text-[9px] font-bold tracking-widest uppercase bg-[#4edea3] text-[#003824] px-2 py-0.5 rounded">{p.badge}</span>}
                  <h3 className={`text-lg font-bold ${sel && i===1 ? 'text-[#4edea3]' : 'text-[#dae2fd]'}`}>{p.name}</h3>
                  <p className="text-xs text-[#bbcabf]/60 mt-0.5">{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mt-4 mb-5 pb-5 border-b border-white/[0.04]">
                    <span className="text-3xl font-bold text-[#dae2fd]">{p.price}</span>
                    <span className="text-xs text-[#bbcabf]/50">/ {p.per}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {p.feats.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3] mt-0.5 shrink-0" />
                        <span className="text-[#bbcabf]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={(e) => { e.stopPropagation(); handleUpgrade(p.id); }}
                    className={`w-full text-xs font-bold tracking-wider uppercase py-2.5 rounded-md transition-all active:scale-[0.98] ${sel ? 'bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824]' : 'bg-white/[0.04] hover:bg-white/[0.07] text-[#dae2fd] border border-white/[0.08]'}`}>
                    Buy {p.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
