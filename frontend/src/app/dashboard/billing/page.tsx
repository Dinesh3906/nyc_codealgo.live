"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import api from "@/lib/api";
import { CreditCard, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";


export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [step, setStep] = useState<'plans' | 'checkout'>('plans');
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await api.get("/billing/usage");
        setUsage(res.data);
      } catch (err) {
        setUsage({ status: 'Free', used: 0, limit: 1 });
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  const handleUpgrade = async (planId: string) => {
    try {
      setLoading(true);
      const res = await api.post("/billing/create-checkout", { 
        plan: planId,
        couponCode: discount > 0 ? couponCode : null 
      });
      const { orderId, amount, currency } = res.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: "NYC Code Compliance AI",
        description: `Purchase ${checkoutPlan?.name}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            setLoading(true);
            await api.post('/billing/confirm-session', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            const usageRes = await api.get("/billing/usage");
            setUsage(usageRes.data);
            alert("Payment successful! Scan pack added.");
            setStep('plans');
          } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || "Payment verification failed.";
            alert(`Verification Error: ${msg}`);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: usage?.name || "",
          email: usage?.email || ""
        },
        theme: {
          color: "#10b981" // Emerald primary
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      alert(err.response?.data?.message || "Failed to create order.");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post("/billing/validate-coupon", { code: couponCode, planId: checkoutPlan.id });
      setDiscount(res.data.discount);
      alert(`Success! $${res.data.discount} discount applied.`);
    } catch (err) {
      alert("Invalid or expired coupon code.");
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const startCheckout = (plan: any) => {
    setCheckoutPlan(plan);
    setDiscount(0);
    setCouponCode("");
    setStep('checkout');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((usage.used / (usage.limit === 0 ? 1 : usage.limit)) * 100, 100);

  const plans = [
    {
      id: 'pack-1',
      name: "Single Scan",
      description: "Perfect for a quick check",
      originalPrice: "$3",
      price: "$2",
      period: "pack",
      features: [
        "1 Full AI Plan Scan",
        "OCR Extraction",
        "Detailed Report PDF",
        "Immediate Analysis"
      ],
      badge: "Anniversary Offer"
    },
    {
      id: 'pack-12',
      name: "Pro Pack",
      description: "Best for smaller projects",
      originalPrice: "$30",
      price: "$20",
      period: "pack",
      features: [
        "12 AI Scans (Buy 10, Get 2 Free)",
        "Priority Processing",
        "Expert Code Mapping",
        "Full Compliance Check"
      ],
      badge: "Anniversary Offer"
    },
    {
      id: 'pack-65',
      name: "Enterprise Pack",
      description: "Bulk compliance checking",
      originalPrice: "$130",
      price: "$100",
      period: "pack",
      features: [
        "65 AI Scans (Buy 50, Get 15 Free)",
        "Lifetime Credits",
        "Priority Support",
        "Bulk Processing"
      ],
      badge: "Anniversary Offer"
    }
  ];

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {step === 'plans' ? (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
            <p className="text-muted-foreground mt-1">Manage your scan credits and usage</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Scan Credits
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {usage.used} of {usage.limit} lifetime scans used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-2.5 w-full bg-slate-900 border border-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${progressPercent > 80 ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-medium">Credits Remaining</span>
                  <Badge variant={usage.limit - usage.used > 0 ? "default" : "destructive"} className={usage.limit - usage.used > 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                    {Math.max(0, usage.limit - usage.used)} Scans
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/20 border-slate-700/50 border-dashed backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 uppercase tracking-wider">How it works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>Credits never expire and stay on your account until used.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>Each plan upload and forensic analysis consumes 1 credit.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>Purchase packs at any time to add credits instantly to your balance.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Purchase Scan Packs</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan, index) => {
                const isSelected = selectedPlan === index;
                return (
                  <Card
                    key={index}
                    onClick={() => setSelectedPlan(index)}
                    className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group ${isSelected ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 bg-slate-800/60' : 'bg-slate-800/40 border-slate-700/50'}`}
                  >
                    {plan.badge === "Anniversary Offer" && (
                      <div className="absolute top-4 right-4 z-20">
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] px-3 py-1 rounded-full shadow-lg border border-white/20 font-bold uppercase tracking-wider">
                          Anniversary Offer
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white">{plan.name}</CardTitle>
                      <CardDescription className="text-slate-400">{plan.description}</CardDescription>
                      <div className="mt-4 flex items-baseline gap-2">
                        {plan.originalPrice && (
                          <span className="text-lg text-slate-500 line-through decoration-red-500/50 font-medium">
                            {plan.originalPrice}
                          </span>
                        )}
                        <span className="text-4xl font-black text-white">{plan.price}</span>
                        <span className="text-slate-500 text-sm font-medium">/ {plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        className={`w-full py-6 font-bold uppercase tracking-widest ${isSelected ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 border-none' : 'border-slate-700 text-slate-300 hover:bg-slate-700/50'}`}
                        onClick={(e) => { e.stopPropagation(); startCheckout(plan); }}
                      >
                        Select Pack
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // --- CHECKOUT VIEW ---
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Order Summary</h1>
              <p className="text-slate-400 mt-1">Review your scan pack selection and complete purchase</p>
            </div>
            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setStep('plans')}>
              Back to Plans
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Billing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Account Email</label>
                      <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 font-mono text-sm">
                        {usage?.email || "user@example.com"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Selected Item</label>
                      <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white font-bold text-sm">
                        {checkoutPlan?.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Apply Coupon Code</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter code" 
                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button 
                        disabled={couponLoading || !couponCode} 
                        onClick={applyCoupon}
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-full">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-300">
                    Your purchase is secured by <span className="text-emerald-400 font-bold uppercase tracking-tight italic">Razorpay</span>. Taxes and processing fees are included in the final price.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-800/60 border-slate-700/50 shadow-2xl sticky top-24">
                <CardHeader>
                  <CardTitle className="text-white">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white font-mono">{checkoutPlan?.price}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Discount</span>
                        <span>-${discount}.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>Tax (included)</span>
                      <span>$0.00</span>
                    </div>
                    <div className="pt-4 border-t border-slate-700 flex justify-between items-baseline">
                      <span className="text-lg font-bold text-white">Total Bill</span>
                      <span className="text-3xl font-black text-emerald-400 font-mono">
                        ${Math.max(0, parseInt(checkoutPlan?.price.replace('$', '')) - discount)}.00
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-8 text-lg font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30"
                    disabled={loading}
                    onClick={() => handleUpgrade(checkoutPlan.id)}
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay Now`}
                  </Button>
                  
                  <div className="flex flex-col items-center gap-2 text-[10px] text-slate-500 text-center">
                    <p>By clicking "Pay Now", you agree to our Terms of Service.</p>
                    <p className="font-bold text-slate-400">✔ All Taxes Included</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
