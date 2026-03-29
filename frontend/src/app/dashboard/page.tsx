"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import Link from "next/link";
import { FileText, AlertTriangle, Activity, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DashboardOverview() {
  const { fetchPlans, deletePlan, filteredPlans, loading } = usePlanStore();
  const plans = filteredPlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const totalAnalyzed = plans.length;
  const totalIssues = plans.reduce((acc, p) => acc + (p.analysisResult?.issues?.length || 0), 0);
  const avgScore = plans.length > 0 
    ? Math.round(plans.reduce((acc, p) => acc + (p.analysisResult?.score || 0), 0) / plans.length) 
    : 0;

  const stats = [
    { label: "Plans Analyzed", value: totalAnalyzed, icon: FileText },
    { label: "Issues Detected", value: totalIssues, icon: AlertTriangle },
    { label: "Avg Compliance", value: `${avgScore}%`, icon: Activity },
  ];

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
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
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Analysis</CardTitle>
              <CardDescription>Your latest compliance checks</CardDescription>
            </div>
            <Link href="/dashboard/plans">
              <Button variant="outline" size="sm">View All</Button>
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
                {plans.slice(0, 5).map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/plans/${plan.id}`} className="hover:underline">
                        {plan.fileName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.status === 'analyzed' ? 'success' : 'warning'}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {plan.analysisResult?.score || 0}%
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
