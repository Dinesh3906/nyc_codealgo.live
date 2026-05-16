"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import api from "@/lib/api";
import { CreditCard, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(1);

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

  const handleUpgrade = async (plan: string) => {
    try {
      setLoading(true);
      const res = await api.post("/billing/create-checkout", { plan });
      const { orderId, amount, currency } = res.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: "NYC House Code",
        description: "Purchase Scan Pack",
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
          } catch (err) {
            console.error(err);
            alert("Payment verification failed.");
          } finally {
            setLoading(false);
          }
        },
        theme: {
          color: "#0f172a"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading billing details...</p>
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
      <div className="space-y-8">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
        <p className="text-muted-foreground mt-1">Manage your scan credits and usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Scan Credits
            </CardTitle>
            <CardDescription>
              {usage.used} of {usage.limit} lifetime scans used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full bg-muted border border-border rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${progressPercent > 80 ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits Remaining</span>
              <Badge variant={usage.limit - usage.used > 0 ? "default" : "destructive"}>
                {Math.max(0, usage.limit - usage.used)} Scans
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Credits never expire and stay on your account until used.</p>
            <p>• Each plan upload and analysis consumes 1 credit.</p>
            <p>• You can purchase more packs at any time to add credits instantly.</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Purchase Scan Packs</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan === index;
            return (
            <Card
              key={index}
              onClick={() => setSelectedPlan(index)}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isSelected ? 'border-2 border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/5 to-transparent' : 'border-border/60'}`}
            >
              {plan.badge === "Anniversary Offer" && (
                <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none z-10">
                  <div className="absolute top-6 -right-16 w-56 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black text-center uppercase tracking-widest rotate-45 shadow-md border-y border-white/20">
                    Anniversary Offer
                  </div>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  {plan.badge && plan.badge !== "Anniversary Offer" && (
                    <Badge className="bg-accent text-accent-foreground">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-2">
                  {(plan as any).originalPrice && (
                    <span className="text-lg text-muted-foreground line-through decoration-red-500/50">
                      {(plan as any).originalPrice}
                    </span>
                  )}
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/ {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full ${isSelected ? 'shadow-lg shadow-primary/20' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleUpgrade(plan.id); }}
                >
                  Buy {plan.name}
                </Button>
              </CardContent>
            </Card>
          );})}

        </div>
      </div>
    </div>
    </>
  );
}
