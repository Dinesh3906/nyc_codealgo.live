"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/lib/store/planStore";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { Search, Trash2, FileText, Loader2, CreditCard, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PlansHub() {
  const { fetchPlans, deletePlan, filteredPlans, loading, searchQuery, setSearchQuery } = usePlanStore();
  const { user } = useAuthStore();
  const plans = filteredPlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground mt-1">Manage your compliance analysis history</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-800/30 backdrop-blur-lg border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading && plans.length === 0 ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>{searchQuery ? "No matches found" : "No plans yet"}</p>
              <p className="text-sm mt-1">Upload a plan to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  let result = plan.analysisResult;
                  let depth = 0;
                  while (typeof result === 'string' && depth < 5) {
                    try { result = JSON.parse(result); } catch { break; }
                    depth++;
                  }

                  const isManualReview = result?.status === 'manual_review' || result?.score === null;
                  const scoreText = isManualReview ? '--' : `${result?.percentage || result?.score || 0}%`;

                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/plans/${plan.id}`} className="hover:underline">
                          {plan.fileName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(plan.createdAt).toLocaleDateString()}
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
                            <Button variant="outline" size="sm">View Report</Button>
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
