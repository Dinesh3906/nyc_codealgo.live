"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { FileText, AlertTriangle, Activity, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DashboardOverview() {
  const { fetchPlans, deletePlan, filteredPlans, loading } = usePlanStore();
  const { user } = useAuthStore();
  const plans = filteredPlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Robust parsing helper
  const getParsedResult = (plan: any) => {
    let result = plan.analysisResult;
    let depth = 0;
    while (typeof result === 'string' && depth < 5) {
      try { result = JSON.parse(result); } catch { break; }
      depth++;
    }
    return typeof result === 'object' && result !== null ? result : {};
  };

  const totalAnalyzed = plans.length;
  const totalIssues = plans.reduce((acc, p) => acc + (getParsedResult(p).issues?.length || 0), 0);
  
  const validPlans = plans.filter(p => {
    const res = getParsedResult(p);
    return res.score !== null && res.score !== undefined && res.status !== 'manual_review';
  });
  const avgScore = validPlans.length > 0 
    ? Math.round(validPlans.reduce((acc, p) => acc + (getParsedResult(p).score || getParsedResult(p).percentage || 0), 0) / validPlans.length) 
    : 0;

  const stats = [
    { label: "Plans Analyzed", value: totalAnalyzed, icon: FileText },
    { label: "Issues Detected", value: totalIssues, icon: AlertTriangle },
    { label: "Avg Compliance", value: `${avgScore}%`, icon: Activity },
  ];

  if (loading && plans.length === 0) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Architect'}</h1>
          <p className="text-muted-foreground mt-1">Here is a summary of your NYC compliance audits</p>
        </div>
        <Link href="/dashboard/analyzer">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">Start New Scan</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
          <CardDescription>Your last 5 uploaded plans and their analysis status</CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No plans analyzed yet</p>
              <p className="text-sm mt-1">Upload a plan to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.slice(0, 5).map((plan) => {
                  const result = getParsedResult(plan);
                  const isManualReview = result.status === 'manual_review' || result.score === null;
                  const scoreText = isManualReview ? '--' : `${result.score || result.percentage || 0}%`;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/plans/${plan.id}`} className="hover:underline">
                          {plan.fileName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'analyzed' ? 'success' : (plan.status === 'manual_review' ? 'warning' : 'warning')} className="capitalize">
                          {plan.status === 'manual_review' ? 'Manual Review' : plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-500">
                        {scoreText}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/plans/${plan.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deletePlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
