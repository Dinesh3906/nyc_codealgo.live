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
    return result || {};
  };

  const totalAnalyzed = plans.length;
  const totalIssues = plans.reduce((acc, p) => acc + (getParsedResult(p).issues?.length || 0), 0);
  const avgScore = plans.length > 0 
    ? Math.round(plans.reduce((acc, p) => acc + (getParsedResult(p).score || getParsedResult(p).percentage || 0), 0) / plans.length) 
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your compliance analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white dark:bg-slate-800/40 backdrop-blur-md border-slate-200 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</CardTitle>
              <stat.icon className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white dark:bg-slate-800/30 backdrop-blur-lg border-slate-200 dark:border-slate-700/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Recent Analysis</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Your latest compliance checks</CardDescription>
            </div>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
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
                  const score = result.score || result.percentage || 0;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/plans/${plan.id}`} className="hover:underline">
                          {plan.fileName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'analyzed' ? 'success' : 'warning'} className="capitalize">
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-500">
                        {score}%
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
