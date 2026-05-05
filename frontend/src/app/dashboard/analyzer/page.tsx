"use client";
 
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Upload, FileText, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-8">
      <Card className="border-2">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <Badge variant="secondary">AI-Powered Analysis</Badge>
            {(usage?.limit === 0 || isExpired) && (
              <Badge variant="destructive" className="animate-pulse cursor-pointer" onClick={() => router.push('/dashboard/billing')}>
                {isExpired ? 'Plan Expired' : 'Credits Required'}
              </Badge>
            )}
          </div>
          <div>
            <CardTitle className="text-3xl">NYC DOB Compliance Analyzer</CardTitle>
            <CardDescription className="text-base mt-2">
              Instantly verify your architectural plans against 113 NYC Building Code documents
            </CardDescription>
          </div>
          <div className="flex gap-3 pt-2">
            <Button size="lg" onClick={handleNewCheck}>
              <Upload className="w-4 h-4 mr-2" />
              {usage?.limit === 0 ? 'Buy Credits to Start' : 'New Compliance Check'}
            </Button>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="lg">
                View History
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              113 NYC Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete coverage of 2022 NYC Building, Fuel Gas, Mechanical, and Plumbing Codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              RAG Technology
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced retrieval system for accurate code section matching and analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Detailed Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive compliance reports with specific code references and recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>Your latest compliance checks</CardDescription>
            </div>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No scans yet</p>
              <p className="text-sm mt-1">Upload your first plan to start analyzing</p>
              <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((plan: any) => (
                <Link 
                  key={plan.id}
                  href={`/dashboard/plans/${plan.id}`}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{plan.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {plan.status === 'analyzed' 
                        ? `${typeof plan.analysisResult === 'string' 
                            ? JSON.parse(plan.analysisResult).score 
                            : plan.analysisResult?.score || 0}%` 
                        : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">Compliance</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadPlanModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <AnalyzerContent />
    </Suspense>
  );
}
