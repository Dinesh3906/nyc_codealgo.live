"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { CreditCard, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncCheckoutAndFetchUsage = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const sessionId = params.get('session_id');

        if (success === 'true' && sessionId) {
          let confirmed = false;

          for (let attempt = 0; attempt < 4 && !confirmed; attempt++) {
            try {
              await api.post('/billing/confirm-session', { sessionId });
              confirmed = true;
            } catch (err) {
              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              } else {
                console.error('Could not confirm checkout session:', err);
              }
            }
          }

          if (confirmed) {
            window.history.replaceState({}, '', '/dashboard/billing');
          }
        }

        const res = await api.get("/billing/usage");
        setUsage(res.data);
      } catch (err) {
        setUsage({ status: 'Free', used: 0, limit: 1 });
      } finally {
        setLoading(false);
      }
    };
    syncCheckoutAndFetchUsage();
  }, []);

  const handleUpgrade = async (plan: string) => {
    try {
      setLoading(true);
      const res = await api.post("/billing/create-checkout", { plan });
      window.location.href = res.data.url;
    } catch (err: any) {
      setLoading(false);
      alert(err.response?.data?.message || "Failed to create checkout session.");
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

  const progressPercent = Math.min((usage.used / (usage.limit === Infinity ? 1 : usage.limit)) * 100, 100);

  const plans = [
    // {
    //   id: 'trial',
    //   name: "Month 1",
    //   description: "First Upload Special",
    //   price: "$1",
    //   period: "first month",
    //   features: [
    //     "1 Full AI Plan Scan",
    //     "OCR Extraction",
    //     "Detailed Report PDF",
    //     "Immediate Analysis"
    //   ],
    //   highlighted: false,
    //   badge: null
    // },
    {
      id: 'intro',
      name: "Month 2",
      description: usage?.introCount >= 2 ? "Professional Access" : "83% Intro Discount",
      price: usage?.introCount >= 2 ? "$299  " : "$49.99",
      originalPrice: usage?.introCount >= 2 ? null : "$299",
      period: "month",
      features: [
        "12 AI Scans / Month",
        "Priority Processing",
        "Expert Code Mapping",
        "Full Compliance Check"
      ],
      highlighted: true,
      badge: "Popular"
    },
    // {
    //   id: 'pro',
    //   name: "Month 3+",
    //   description: "Professional Access",
    //   price: "$299",
    //   period: "month",
    //   features: [
    //     "10 AI Scans / Month",
    //     "Bulk Uploads",
    //     "Team Dashboard",
    //     "Custom PDF Headers"
    //   ],
    //   highlighted: false,
    //   badge: null
    // }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            {usage.expiryDate && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Plan Expiry Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(usage.expiryDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {new Date(usage.expiryDate) < new Date() ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                )}
              </div>
            )}
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              {usage.used} of {usage.limit === Infinity ? 'unlimited' : usage.limit} scans used
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
              <span className="text-muted-foreground">Current Plan</span>
              <Badge>{usage.status}</Badge>
            </div>
          </CardContent>
        </Card>

        {!usage.trialClaimed && (
          <Card className="border-2 border-primary bg-accent/50">
            <CardHeader>
              <CardTitle>Special Offer</CardTitle>
              <CardDescription>Limited time founder's pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">Start for $1</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try Professional tier for just $1 for your first scan
                </p>
              </div>
              <Button className="w-full" onClick={() => handleUpgrade('trial')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Claim Offer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Pricing Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={plan.highlighted ? 'border-2 border-primary shadow-lg' : ''}
            >
              <CardHeader>
                {/* <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.badge && <Badge>{plan.badge}</Badge>}
                </div> */}
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  {plan.originalPrice && (
                    <span className="text-xl text-muted-foreground line-through mr-2">{plan.originalPrice}</span>
                  )}
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/ {plan.period}</span>
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
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {index === 0 ? 'Start Now' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
