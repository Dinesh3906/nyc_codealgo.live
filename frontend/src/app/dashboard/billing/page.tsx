"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import api from "@/lib/api";
import { CreditCard, CheckCircle2, Loader2, TrendingUp, Sparkles, Coins, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'plans' | 'checkout'>('plans');
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [customPagesInput, setCustomPagesInput] = useState<number>(500);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await api.get("/billing/usage");
        setUsage(res.data);
      } catch (err) {
        setUsage({ status: 'Free', used: 0, limit: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  const handleUpgrade = async (planId: string) => {
    try {
      setLoading(true);
      const payload: any = { 
        plan: planId,
        couponCode: discount > 0 ? couponCode : null 
      };

      if (planId === 'custom-topup') {
        payload.pages = checkoutPlan.customPages;
      }

      const res = await api.post("/billing/create-checkout", payload);
      const { orderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
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
            alert("Payment successful! Pages added to your balance.");
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
          color: "#3b82f6" // Vibrant Blue primary
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
      <div className="space-y-8 p-6">
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
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((usage.used / (usage.limit === 0 ? 1 : usage.limit)) * 100, 100);
  const pagesRemaining = Math.max(0, usage.limit - usage.used);
  
  // Custom Topup Cost logic ($0.05 per page)
  const topupCost = customPagesInput * 0.05;

  const monthlyPlanInfo = {
    id: 'monthly-15k',
    name: "Monthly Subscription",
    description: "Best for ongoing compliance audits",
    price: "$500",
    period: "month",
    features: [
      "15,000 AI Page Scans included",
      "Full OCR Data Extraction",
      "Interactive Code Compliance Checklist",
      "Downloadable Forensic Report PDFs",
      "Resets and reloads every billing cycle"
    ]
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {step === 'plans' ? (
        <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Billing & Page Credits
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
              Manage your subscription, purchase page credits, and monitor compliance scanning usage.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Usage Progress Card */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative group transition-all duration-300 hover:shadow-2xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent pointer-events-none rounded-bl-full" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Monthly Page Usage
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  {usage.used.toLocaleString()} of {usage.limit.toLocaleString()} pages scanned
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 rounded-full ${
                      progressPercent > 90 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pages Remaining</span>
                  <Badge 
                    variant={pagesRemaining > 0 ? "default" : "destructive"} 
                    className={pagesRemaining > 0 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}
                  >
                    {pagesRemaining.toLocaleString()} Pages
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* How it works Card */}
            <Card className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 border-dashed relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Credit Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <p>Page credits are deducted in real-time based on the size of your uploaded PDF file.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <p>Standard architectural images (PNG, JPG) and CAD blueprints (DWG, DXF) count as exactly 1 page.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <p>Monthly balances reset at the start of your billing cycle. Top-up credits are for use during the current billing cycle.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Select a Page Plan
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Monthly Plan Card */}
              <Card className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-2xl flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/50">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] px-3 py-1 rounded-full shadow font-bold uppercase tracking-wider">
                  Recommended
                </div>
                
                <CardHeader className="pt-8">
                  <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {monthlyPlanInfo.name}
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    {monthlyPlanInfo.description}
                  </CardDescription>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">
                      {monthlyPlanInfo.price}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">/ {monthlyPlanInfo.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8 flex-grow flex flex-col justify-between pt-2">
                  <ul className="space-y-4">
                    {monthlyPlanInfo.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full py-6 font-bold uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg border-none mt-8"
                    onClick={() => startCheckout(monthlyPlanInfo)}
                  >
                    Subscribe Now
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Top-Up Card */}
              <Card className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-2xl flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-blue-500/50">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                
                <CardHeader className="pt-8">
                  <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Coins className="w-6 h-6 text-emerald-500" />
                    Custom Page Top-up
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Add only the page credits you need for this month
                  </CardDescription>
                  
                  {/* Dynamic Pricing display */}
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">
                      ${topupCost.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">one-time payment</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-grow flex flex-col justify-between pt-2">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Enter Pages Needed (Min. 100)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min="100"
                          step="50"
                          value={customPagesInput}
                          onChange={(e) => setCustomPagesInput(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Priced at exactly $0.05 per page credit.
                      </p>
                    </div>

                    <ul className="space-y-4">
                      <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>Instantly credited to your balance</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>Calculated dynamically for your exact blueprints</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full py-6 font-bold uppercase tracking-widest border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 mt-8"
                    disabled={customPagesInput < 100}
                    onClick={() => startCheckout({
                      id: 'custom-topup',
                      name: `Custom Top-up (${customPagesInput} Pages)`,
                      price: `$${topupCost.toFixed(2)}`,
                      customPages: customPagesInput,
                      period: "one-off"
                    })}
                  >
                    {customPagesInput < 100 ? 'Minimum 100 Pages Required' : 'Purchase Top-up'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        // --- CHECKOUT VIEW ---
        <div className="w-full max-w-4xl mx-auto space-y-8 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Order Summary</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Review your selected page plan and complete purchase</p>
            </div>
            <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={() => setStep('plans')}>
              Back to Plans
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Billing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Account Email</label>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-sm">
                      {usage?.email || "user@example.com"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Apply Coupon Code</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter code" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button 
                        disabled={couponLoading || !couponCode} 
                        onClick={applyCoupon}
                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border border-blue-500/20">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your purchase is secured by <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight italic">Razorpay</span>. Taxes and processing fees are included in the final price.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl sticky top-24">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-sm">
                      <span>Item</span>
                      <span className="text-slate-950 dark:text-white font-medium">{checkoutPlan?.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-sm">
                      <span>Subtotal</span>
                      <span className="text-slate-950 dark:text-white font-mono">{checkoutPlan?.price}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium text-sm">
                        <span>Discount</span>
                        <span>-${discount}.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-sm">
                      <span>Tax (included)</span>
                      <span>$0.00</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">Total Bill</span>
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                        ${Math.max(0, parseFloat(checkoutPlan?.price.replace('$', '')) - discount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 text-lg font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 border-none"
                    disabled={loading}
                    onClick={() => handleUpgrade(checkoutPlan.id)}
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay Now`}
                  </Button>
                  
                  <div className="flex flex-col items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                    <p>By clicking "Pay Now", you agree to our <a href="/terms-of-service" className="underline hover:text-blue-500">Terms of Service</a> and <a href="/privacy-policy" className="underline hover:text-blue-500">Privacy Policy</a>.</p>
                    <p className="font-bold text-blue-600 dark:text-blue-500">✔ All Taxes Included</p>
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
